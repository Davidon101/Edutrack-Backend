import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Role, StudentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto, UpdateStudentDto, UpdateStudentStatusDto } from './dto';
import { generateStudentId } from '../common/utils/id.util';
import { generateTemporaryPassword, hashPassword } from '../common/utils/password.util';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  // ── List students (optionally filtered by class) ───────────────────
  async getStudents(schoolId: string, classId?: string) {
    const students = await this.prisma.student.findMany({
      where: {
        schoolId,
        ...(classId ? { classId } : {}),
        status: { not: 'DEACTIVATED' }, // DEACTIVATED hidden from portal lists
      },
      orderBy: { fullName: 'asc' },
      include: {
        class: { select: { id: true, name: true } },
      },
      select: {
        id: true, studentId: true, admissionNumber: true,
        fullName: true, gender: true, dateOfBirth: true,
        status: true, createdAt: true,
        class: true,
      },
    });
    return { data: students, message: 'Students retrieved' };
  }

  // ── Get student profile ────────────────────────────────────────────
  async getStudentById(studentId: string, schoolId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      include: {
        class: { select: { id: true, name: true, level: true } },
        user: { select: { isActive: true, mustChangePassword: true, lastLoginAt: true } },
      },
    });
    if (!student) throw new NotFoundException('Student not found');

    return {
      data: {
        id: student.id,
        studentId: student.studentId,       // Login credential — auto-generated
        admissionNumber: student.admissionNumber, // School record — admin-provided
        fullName: student.fullName,
        gender: student.gender,
        dateOfBirth: student.dateOfBirth,
        status: student.status,
        class: student.class,
        isActive: student.user?.isActive,
        mustChangePassword: student.user?.mustChangePassword,
        lastLoginAt: student.user?.lastLoginAt,
      },
      message: 'Student retrieved',
    };
  }

  // ── Create student ─────────────────────────────────────────────────
  async createStudent(schoolId: string, adminId: string, dto: CreateStudentDto) {
    // Validate class belongs to school
    const cls = await this.prisma.class.findFirst({
      where: { id: dto.classId, schoolId, isActive: true },
    });
    if (!cls) throw new NotFoundException('Class not found in this school');

    // Admission number must be unique within school (admin-provided)
    const admExists = await this.prisma.student.findFirst({
      where: { schoolId, admissionNumber: dto.admissionNumber },
    });
    if (admExists)
      throw new ConflictException(
        `Admission number "${dto.admissionNumber}" is already assigned to another student in this school`,
      );

    // Get school settings for Student ID prefix
    const settings = await this.prisma.schoolSettings.findUnique({ where: { schoolId } });
    if (!settings) throw new NotFoundException('School settings not found');

    // Get next Student ID sequence
    const lastStudent = await this.prisma.student.findFirst({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      select: { studentId: true },
    });
    const nextSeq = this.getNextSequence(lastStudent?.studentId);
    const studentId = generateStudentId(settings.studentIdPrefix, nextSeq);

    // Generate temporary password
    const tempPassword = generateTemporaryPassword();
    const hashedPassword = await hashPassword(tempPassword);

    // Get active session for class history
    const activeSession = await this.prisma.academicSession.findFirst({
      where: { schoolId, isActive: true },
    });

    const result = await this.prisma.$transaction(async (tx) => {
      // Create user account for student login
      const user = await tx.user.create({
        data: {
          schoolId,
          fullName: dto.fullName,
          email: `${studentId.toLowerCase().replace(/\//g, '.')}@student.edutrack`,
          password: hashedPassword,
          role: Role.STUDENT,
          mustChangePassword: true, // First login forces password change
          isActive: true,
        },
      });

      // Create student record
      const student = await tx.student.create({
        data: {
          userId: user.id,
          schoolId,
          classId: dto.classId,
          studentId,                         // Auto-generated login credential
          admissionNumber: dto.admissionNumber, // Admin-provided school record
          fullName: dto.fullName,
          gender: dto.gender,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
          status: StudentStatus.ACTIVE,
        },
      });

      // Write class history — reason: Admission
      await tx.studentClassHistory.create({
        data: {
          studentId: student.id,
          classId: dto.classId,
          sessionId: activeSession?.id,
          reason: 'Admission',
        },
      });

      await tx.auditLog.create({
        data: {
          schoolId, userId: adminId,
          action: 'CREATE', entity: 'Student', entityId: student.id,
          after: { studentId, admissionNumber: dto.admissionNumber, fullName: dto.fullName } as any,
        },
      });

      return { student, tempPassword };
    });

    return {
      data: {
        id: result.student.id,
        studentId,                           // Auto-generated — this is the login credential
        admissionNumber: dto.admissionNumber, // Admin-provided
        fullName: dto.fullName,
        class: { id: cls.id, name: cls.name },
        temporaryPassword: result.tempPassword, // Shown once — admin gives to student
        mustChangePassword: true,
      },
      message: 'Student created successfully',
    };
  }

  // ── Update student ─────────────────────────────────────────────────
  async updateStudent(
    studentId: string,
    schoolId: string,
    adminId: string,
    dto: UpdateStudentDto,
  ) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
    });
    if (!student) throw new NotFoundException('Student not found');

    // If changing class, write class history
    if (dto.classId && dto.classId !== student.classId) {
      const newClass = await this.prisma.class.findFirst({
        where: { id: dto.classId, schoolId, isActive: true },
      });
      if (!newClass) throw new NotFoundException('Target class not found');

      const activeSession = await this.prisma.academicSession.findFirst({
        where: { schoolId, isActive: true },
      });

      await this.prisma.$transaction(async (tx) => {
        // Close previous class history entry
        await tx.studentClassHistory.updateMany({
          where: { studentId, endDate: null },
          data: { endDate: new Date() },
        });

        await tx.student.update({
          where: { id: studentId },
          data: { classId: dto.classId, fullName: dto.fullName, gender: dto.gender,
            dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined },
        });

        await tx.studentClassHistory.create({
          data: { studentId, classId: dto.classId, sessionId: activeSession?.id, reason: 'Transfer' },
        });

        await tx.auditLog.create({
          data: { schoolId, userId: adminId, action: 'UPDATE', entity: 'Student', entityId: studentId, before: student as any, after: dto as any },
        });
      });
    } else {
      await this.prisma.student.update({
        where: { id: studentId },
        data: {
          fullName: dto.fullName,
          gender: dto.gender,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        },
      });

      await this.prisma.auditLog.create({
        data: { schoolId, userId: adminId, action: 'UPDATE', entity: 'Student', entityId: studentId, after: dto as any },
      });
    }

    return { message: 'Student updated successfully' };
  }

  // ── Update student status ──────────────────────────────────────────
  // Note: changing status NEVER blocks login — student can always log in
  async updateStudentStatus(
    studentId: string,
    schoolId: string,
    adminId: string,
    dto: UpdateStudentStatusDto,
  ) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
    });
    if (!student) throw new NotFoundException('Student not found');

    await this.prisma.student.update({
      where: { id: studentId },
      data: {
        status: dto.status,
        archivedAt: dto.status !== StudentStatus.ACTIVE ? new Date() : null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        schoolId, userId: adminId,
        action: 'UPDATE', entity: 'Student', entityId: studentId,
        before: { status: student.status } as any,
        after: { status: dto.status } as any,
      },
    });

    return { message: `Student status updated to ${dto.status}` };
  }

  // ── Get student class history ──────────────────────────────────────
  async getStudentHistory(studentId: string, schoolId: string) {
    const student = await this.prisma.student.findFirst({ where: { id: studentId, schoolId } });
    if (!student) throw new NotFoundException('Student not found');

    const history = await this.prisma.studentClassHistory.findMany({
      where: { studentId },
      orderBy: { startDate: 'desc' },
    });

    return { data: history, message: 'Student history retrieved' };
  }

  // ── Get student results ────────────────────────────────────────────
  async getStudentResults(studentId: string, schoolId: string, sessionId?: string, termId?: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
      select: { id: true, fullName: true, studentId: true, admissionNumber: true },
    });
    if (!student) throw new NotFoundException('Student not found');

    // Default to active session/open term if not specified
    let resolvedTermId = termId;
    if (!resolvedTermId) {
      const activeSession = await this.prisma.academicSession.findFirst({
        where: { schoolId, ...(sessionId ? { id: sessionId } : { isActive: true }) },
        include: { terms: { where: { isOpen: true }, take: 1 } },
      });
      resolvedTermId = activeSession?.terms[0]?.id;
    }

    const scores = await this.prisma.score.findMany({
      where: {
        studentId,
        submission: {
          status: 'PUBLISHED',
          ...(resolvedTermId ? { termId: resolvedTermId } : {}),
        },
      },
      include: {
        subject: { select: { name: true, code: true, displayOrder: true } },
        submission: {
          include: {
            term: { select: { name: true } },
            positions: { where: { studentId }, select: { position: true, average: true } },
          },
        },
      },
      orderBy: { subject: { displayOrder: 'asc' } },
    });

    const totalScore = scores.reduce((sum, s) => sum + (s.total ?? 0), 0);
    const average = scores.length > 0 ? totalScore / scores.length : 0;

    return {
      data: {
        student,
        results: scores.map((s) => ({
          subject: s.subject.name,
          subjectCode: s.subject.code,
          ca1: s.ca1, ca2: s.ca2, ca3: s.ca3, ca4: s.ca4, exam: s.exam,
          total: s.total, grade: s.grade, remark: s.remark,
          position: s.submission.positions[0]?.position ?? null,
          term: s.submission.term.name,
        })),
        average: Math.round(average * 10) / 10,
        subjectCount: scores.length,
      },
      message: 'Results retrieved',
    };
  }

  // ── Helper: extract next sequence from last studentId ──────────────
  private getNextSequence(lastStudentId?: string): number {
    if (!lastStudentId) return 1;
    const parts = lastStudentId.split('/');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    return isNaN(lastNum) ? 1 : lastNum + 1;
  }

  // ── Student views own profile (sc-profile screen) ──────────────────
  async getMyProfile(userId: string, schoolId: string) {
    const student = await this.prisma.student.findFirst({
      where: { userId, schoolId },
      include: {
        class: { select: { id: true, name: true, level: true } },
      },
    });
    if (!student) throw new NotFoundException('Student profile not found');

    return {
      data: {
        id: student.id,
        studentId: student.studentId,
        admissionNumber: student.admissionNumber,
        fullName: student.fullName,
        gender: student.gender,
        dateOfBirth: student.dateOfBirth,
        status: student.status,
        class: student.class,
      },
      message: 'Profile retrieved',
    };
  }
}
