import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassDto, UpdateClassDto, AssignTeacherDto } from './dto';

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  // ── List all active classes ────────────────────────────────────────
  async getClasses(schoolId: string) {
    const classes = await this.prisma.class.findMany({
      where: { schoolId, isActive: true },
      orderBy: { name: 'asc' },
      include: {
        classTeacher: {
          include: { user: { select: { fullName: true } } },
          select: { id: true, staffId: true, user: true },
        },
        _count: { select: { students: { where: { status: 'ACTIVE' } } } },
      },
    });

    const formatted = classes.map((c) => ({
      id: c.id, name: c.name, level: c.level, armSection: c.armSection,
      classTeacher: c.classTeacher ? {
        id: c.classTeacher.id,
        staffId: c.classTeacher.staffId,
        fullName: c.classTeacher.user.fullName,
      } : null,
      studentCount: c._count.students,
    }));

    return { data: formatted, message: 'Classes retrieved' };
  }

  // ── Get class details ──────────────────────────────────────────────
  async getClassById(classId: string, schoolId: string) {
    const cls = await this.prisma.class.findFirst({
      where: { id: classId, schoolId, isActive: true },
      include: {
        classTeacher: {
          include: { user: { select: { fullName: true, phone: true } } },
        },
        _count: { select: { students: { where: { status: 'ACTIVE' } } } },
      },
    });
    if (!cls) throw new NotFoundException('Class not found');

    return { data: {
      id: cls.id, name: cls.name, level: cls.level, armSection: cls.armSection,
      classTeacher: cls.classTeacher ? {
        id: cls.classTeacher.id, staffId: cls.classTeacher.staffId,
        fullName: cls.classTeacher.user.fullName,
      } : null,
      studentCount: cls._count.students,
    }, message: 'Class retrieved' };
  }

  // ── Create class ───────────────────────────────────────────────────
  async createClass(schoolId: string, userId: string, dto: CreateClassDto) {
    const existing = await this.prisma.class.findFirst({
      where: { schoolId, name: dto.name, isActive: true },
    });
    if (existing) throw new ConflictException(`A class named "${dto.name}" already exists`);

    if (dto.classTeacherId) {
      await this.validateTeacher(dto.classTeacherId, schoolId);
    }

    const cls = await this.prisma.$transaction(async (tx) => {
      const newClass = await tx.class.create({
        data: { schoolId, name: dto.name, level: dto.level, armSection: dto.armSection, classTeacherId: dto.classTeacherId },
      });

      if (dto.classTeacherId) {
        await tx.classTeacherHistory.create({
          data: { classId: newClass.id, teacherId: dto.classTeacherId, changedBy: userId },
        });
      }

      await tx.auditLog.create({
        data: { schoolId, userId, action: 'CREATE', entity: 'Class', entityId: newClass.id, after: dto as any },
      });

      return newClass;
    });

    return { data: cls, message: 'Class created successfully' };
  }

  // ── Update class ───────────────────────────────────────────────────
  async updateClass(classId: string, schoolId: string, userId: string, dto: UpdateClassDto) {
    const cls = await this.prisma.class.findFirst({ where: { id: classId, schoolId, isActive: true } });
    if (!cls) throw new NotFoundException('Class not found');

    if (dto.name && dto.name !== cls.name) {
      const duplicate = await this.prisma.class.findFirst({ where: { schoolId, name: dto.name, isActive: true, NOT: { id: classId } } });
      if (duplicate) throw new ConflictException(`A class named "${dto.name}" already exists`);
    }

    const updated = await this.prisma.class.update({ where: { id: classId }, data: { ...dto } });

    await this.prisma.auditLog.create({
      data: { schoolId, userId, action: 'UPDATE', entity: 'Class', entityId: classId, before: cls as any, after: dto as any },
    });

    return { data: updated, message: 'Class updated successfully' };
  }

  // ── Assign class teacher ───────────────────────────────────────────
  async assignTeacher(classId: string, schoolId: string, userId: string, dto: AssignTeacherDto) {
    const cls = await this.prisma.class.findFirst({ where: { id: classId, schoolId, isActive: true } });
    if (!cls) throw new NotFoundException('Class not found');

    await this.validateTeacher(dto.classTeacherId, schoolId);

    const activeSession = await this.prisma.academicSession.findFirst({ where: { schoolId, isActive: true } });

    await this.prisma.$transaction(async (tx) => {
      // Close previous class teacher history entry
      if (cls.classTeacherId) {
        await tx.classTeacherHistory.updateMany({
          where: { classId, endDate: null },
          data: { endDate: new Date() },
        });
      }

      await tx.class.update({ where: { id: classId }, data: { classTeacherId: dto.classTeacherId } });

      await tx.classTeacherHistory.create({
        data: { classId, teacherId: dto.classTeacherId, sessionId: activeSession?.id, changedBy: userId },
      });

      await tx.auditLog.create({
        data: { schoolId, userId, action: 'UPDATE', entity: 'Class', entityId: classId, before: { classTeacherId: cls.classTeacherId }, after: { classTeacherId: dto.classTeacherId } },
      });
    });

    return { message: 'Class teacher assigned successfully' };
  }

  // ── Archive class (soft delete) ────────────────────────────────────
  async archiveClass(classId: string, schoolId: string, userId: string) {
    const cls = await this.prisma.class.findFirst({ where: { id: classId, schoolId, isActive: true } });
    if (!cls) throw new NotFoundException('Class not found');

    const activeStudents = await this.prisma.student.count({ where: { classId, status: 'ACTIVE' } });
    if (activeStudents > 0) {
      throw new BadRequestException(`Cannot archive class with ${activeStudents} active students. Reassign or promote students first.`);
    }

    await this.prisma.class.update({ where: { id: classId }, data: { isActive: false, archivedAt: new Date() } });

    await this.prisma.auditLog.create({
      data: { schoolId, userId, action: 'ARCHIVE', entity: 'Class', entityId: classId },
    });

    return { message: 'Class archived successfully' };
  }

  // ── Get students in a class ────────────────────────────────────────
  async getClassStudents(classId: string, schoolId: string) {
    const cls = await this.prisma.class.findFirst({ where: { id: classId, schoolId } });
    if (!cls) throw new NotFoundException('Class not found');

    const students = await this.prisma.student.findMany({
      where: { classId, status: 'ACTIVE' },
      orderBy: { fullName: 'asc' },
      select: { id: true, studentId: true, admissionNumber: true, fullName: true, gender: true, dateOfBirth: true, status: true },
    });

    return { data: students, message: 'Students retrieved' };
  }

  // ── Helper: validate teacher belongs to school ─────────────────────
  private async validateTeacher(teacherId: string, schoolId: string) {
    const teacher = await this.prisma.teacher.findFirst({ where: { id: teacherId, schoolId, isActive: true } });
    if (!teacher) throw new NotFoundException('Teacher not found in this school');
    return teacher;
  }
}
