import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeacherDto, UpdateTeacherDto } from './dto';
import { generateStaffId } from '../common/utils/id.util';
import { generateTemporaryPassword, hashPassword } from '../common/utils/password.util';

@Injectable()
export class TeachersService {
  constructor(private prisma: PrismaService) {}

  // ── List all teachers ──────────────────────────────────────────────
  async getTeachers(schoolId: string) {
    const teachers = await this.prisma.teacher.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { fullName: true, email: true, phone: true, isActive: true } },
        classesAsTeacher: { where: { isActive: true }, select: { id: true, name: true } },
      },
    });

    const formatted = teachers.map((t) => ({
      id: t.id, staffId: t.staffId,
      fullName: t.user.fullName, email: t.user.email, phone: t.user.phone,
      qualification: t.qualification, specialization: t.specialization,
      isActive: t.isActive,
      assignedClass: t.classesAsTeacher[0] || null,
    }));

    return { data: formatted, message: 'Teachers retrieved' };
  }

  // ── Get teacher profile ────────────────────────────────────────────
  async getTeacherById(teacherId: string, schoolId: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id: teacherId, schoolId },
      include: {
        user: { select: { fullName: true, email: true, phone: true, isActive: true, mustChangePassword: true, lastLoginAt: true } },
        classesAsTeacher: { where: { isActive: true }, select: { id: true, name: true, level: true } },
      },
    });
    if (!teacher) throw new NotFoundException('Teacher not found');

    return { data: {
      id: teacher.id, staffId: teacher.staffId,
      fullName: teacher.user.fullName, email: teacher.user.email,
      phone: teacher.user.phone, qualification: teacher.qualification,
      specialization: teacher.specialization, joinDate: teacher.joinDate,
      isActive: teacher.isActive, lastLoginAt: teacher.user.lastLoginAt,
      mustChangePassword: teacher.user.mustChangePassword,
      assignedClass: teacher.classesAsTeacher[0] || null,
    }, message: 'Teacher retrieved' };
  }

  // ── Create teacher ─────────────────────────────────────────────────
  async createTeacher(schoolId: string, adminId: string, dto: CreateTeacherDto) {
    const settings = await this.prisma.schoolSettings.findUnique({ where: { schoolId } });
    if (!settings) throw new NotFoundException('School settings not found');

    // Get next staff ID sequence number
    const lastTeacher = await this.prisma.teacher.findFirst({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      select: { staffId: true },
    });

    const nextSeq = this.getNextSequence(lastTeacher?.staffId);
    const staffId = generateStaffId(settings.staffIdPrefix, nextSeq);

    // Check staffId not already taken (edge case)
    const staffIdTaken = await this.prisma.teacher.findUnique({ where: { staffId } });
    if (staffIdTaken) {
      // Increment and try again
      const staffIdRetry = generateStaffId(settings.staffIdPrefix, nextSeq + 1);
      return this.createTeacherWithStaffId(schoolId, adminId, dto, staffIdRetry);
    }

    return this.createTeacherWithStaffId(schoolId, adminId, dto, staffId);
  }

  private async createTeacherWithStaffId(
    schoolId: string, adminId: string, dto: CreateTeacherDto, staffId: string,
  ) {
    const tempPassword = generateTemporaryPassword();
    const hashedPassword = await hashPassword(tempPassword);

    const result = await this.prisma.$transaction(async (tx) => {
      // Create user account for teacher
      const user = await tx.user.create({
        data: {
          schoolId, fullName: dto.fullName,
          email: dto.email || `${staffId.toLowerCase().replace(/\//g, '.')}@noemail.edutrack`,
          phone: dto.phone, password: hashedPassword,
          role: Role.TEACHER, mustChangePassword: true,
        },
      });

      const teacher = await tx.teacher.create({
        data: {
          userId: user.id, schoolId, staffId,
          qualification: dto.qualification, specialization: dto.specialization,
          joinDate: dto.joinDate ? new Date(dto.joinDate) : undefined,
        },
      });

      await tx.auditLog.create({
        data: { schoolId, userId: adminId, action: 'CREATE', entity: 'Teacher', entityId: teacher.id, after: { staffId, fullName: dto.fullName } },
      });

      return { teacher, user, tempPassword };
    });

    return {
      data: {
        id: result.teacher.id, staffId,
        fullName: dto.fullName, phone: dto.phone, email: dto.email,
        temporaryPassword: result.tempPassword, // Shown once — admin gives to teacher
        mustChangePassword: true,
      },
      message: 'Teacher created successfully',
    };
  }

  // ── Update teacher ─────────────────────────────────────────────────
  async updateTeacher(teacherId: string, schoolId: string, adminId: string, dto: UpdateTeacherDto) {
    const teacher = await this.prisma.teacher.findFirst({ where: { id: teacherId, schoolId } });
    if (!teacher) throw new NotFoundException('Teacher not found');

    await this.prisma.$transaction(async (tx) => {
      if (dto.fullName || dto.phone) {
        await tx.user.update({
          where: { id: teacher.userId },
          data: { fullName: dto.fullName, phone: dto.phone },
        });
      }
      if (dto.qualification || dto.specialization || dto.joinDate) {
        await tx.teacher.update({
          where: { id: teacherId },
          data: {
            qualification: dto.qualification, specialization: dto.specialization,
            joinDate: dto.joinDate ? new Date(dto.joinDate) : undefined,
          },
        });
      }
      await tx.auditLog.create({
        data: { schoolId, userId: adminId, action: 'UPDATE', entity: 'Teacher', entityId: teacherId, after: dto as any },
      });
    });

    return { message: 'Teacher updated successfully' };
  }

  // ── Deactivate teacher ─────────────────────────────────────────────
  async deactivateTeacher(teacherId: string, schoolId: string, adminId: string) {
    const teacher = await this.prisma.teacher.findFirst({ where: { id: teacherId, schoolId } });
    if (!teacher) throw new NotFoundException('Teacher not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.teacher.update({ where: { id: teacherId }, data: { isActive: false, archivedAt: new Date() } });
      await tx.user.update({ where: { id: teacher.userId }, data: { isActive: false } });
      await tx.auditLog.create({
        data: { schoolId, userId: adminId, action: 'DEACTIVATE', entity: 'Teacher', entityId: teacherId },
      });
    });

    return { message: 'Teacher deactivated successfully' };
  }

  // ── Reactivate teacher ─────────────────────────────────────────────
  async reactivateTeacher(teacherId: string, schoolId: string, adminId: string) {
    const teacher = await this.prisma.teacher.findFirst({ where: { id: teacherId, schoolId } });
    if (!teacher) throw new NotFoundException('Teacher not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.teacher.update({ where: { id: teacherId }, data: { isActive: true, archivedAt: null } });
      await tx.user.update({ where: { id: teacher.userId }, data: { isActive: true } });
      await tx.auditLog.create({
        data: { schoolId, userId: adminId, action: 'ACTIVATE', entity: 'Teacher', entityId: teacherId },
      });
    });

    return { message: 'Teacher reactivated successfully' };
  }

  // ── Get teacher assignment history ─────────────────────────────────
  async getTeacherHistory(teacherId: string, schoolId: string) {
    const teacher = await this.prisma.teacher.findFirst({ where: { id: teacherId, schoolId } });
    if (!teacher) throw new NotFoundException('Teacher not found');

    const history = await this.prisma.teacherAssignmentHistory.findMany({
      where: { teacherId },
      orderBy: { startDate: 'desc' },
    });

    return { data: history, message: 'Teacher history retrieved' };
  }

  // ── Helper: extract next sequence number from last staffId ─────────
  private getNextSequence(lastStaffId?: string): number {
    if (!lastStaffId) return 1;
    const parts = lastStaffId.split('/');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    return isNaN(lastNum) ? 1 : lastNum + 1;
  }
}
