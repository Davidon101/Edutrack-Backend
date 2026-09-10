import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { StudentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BulkPromoteDto, SinglePromoteDto } from './dto';

@Injectable()
export class PromotionsService {
  constructor(private prisma: PrismaService) {}

  // ── List classes eligible for promotion ────────────────────────────
  async getEligibleClasses(schoolId: string) {
    const classes = await this.prisma.class.findMany({
      where: { schoolId, isActive: true },
      include: {
        _count: { select: { students: { where: { status: 'ACTIVE' } } } },
        classTeacher: { include: { user: { select: { fullName: true } } } },
      },
      orderBy: { name: 'asc' },
    });

    return {
      data: classes.map((c) => ({
        id: c.id, name: c.name, level: c.level,
        activeStudents: c._count.students,
        classTeacher: c.classTeacher
          ? { id: c.classTeacher.id, fullName: c.classTeacher.user.fullName }
          : null,
      })),
      message: 'Classes retrieved',
    };
  }

  // ── Bulk promote students in a class ──────────────────────────────
  async bulkPromote(schoolId: string, adminId: string, dto: BulkPromoteDto) {
    // Validate sessions belong to school
    const fromSession = await this.prisma.academicSession.findFirst({
      where: { id: dto.fromSessionId, schoolId },
    });
    if (!fromSession) throw new NotFoundException('Source session not found');

    const toSession = await this.prisma.academicSession.findFirst({
      where: { id: dto.toSessionId, schoolId },
    });
    if (!toSession) throw new NotFoundException('Destination session not found');

    if (dto.fromSessionId === dto.toSessionId)
      throw new BadRequestException('Source and destination sessions cannot be the same');

    let processed = 0;
    const errors: any[] = [];

    for (const entry of dto.promotions) {
      try {
        await this.processPromotion(
          entry.studentId, schoolId, adminId,
          dto.fromSessionId, entry.action,
          entry.toClassId, entry.note,
        );
        processed++;
      } catch (err) {
        errors.push({ studentId: entry.studentId, error: err.message });
      }
    }

    await this.prisma.auditLog.create({
      data: {
        schoolId, userId: adminId,
        action: 'PROMOTE', entity: 'Student',
        after: { processed, failed: errors.length, total: dto.promotions.length } as any,
      },
    });

    return {
      data: { processed, failed: errors.length, total: dto.promotions.length, errors },
      message: `Promotion complete. ${processed} students processed.`,
    };
  }

  // ── Single student promotion ───────────────────────────────────────
  async promoteStudent(
    studentId: string, schoolId: string, adminId: string, dto: SinglePromoteDto,
  ) {
    const session = await this.prisma.academicSession.findFirst({
      where: { id: dto.sessionId, schoolId },
    });
    if (!session) throw new NotFoundException('Session not found');

    await this.processPromotion(
      studentId, schoolId, adminId,
      dto.sessionId, dto.action, dto.toClassId, dto.note,
    );

    return { message: `Student ${dto.action.toLowerCase()}d successfully` };
  }

  // ── Get student promotion history ──────────────────────────────────
  async getPromotionHistory(studentId: string, schoolId: string) {
    const student = await this.prisma.student.findFirst({ where: { id: studentId, schoolId } });
    if (!student) throw new NotFoundException('Student not found');

    const history = await this.prisma.studentPromotion.findMany({
      where: { studentId },
      include: {
        session: { select: { name: true } },
        fromClass: { select: { name: true } },
        toClass: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { data: history, message: 'Promotion history retrieved' };
  }

  // ── Core promotion logic ───────────────────────────────────────────
  private async processPromotion(
    studentId: string,
    schoolId: string,
    adminId: string,
    sessionId: string,
    action: 'PROMOTE' | 'REPEAT' | 'GRADUATE' | 'WITHDRAW',
    toClassId?: string,
    note?: string,
  ) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId, status: 'ACTIVE' },
    });
    if (!student) throw new NotFoundException(`Student ${studentId} not found or not active`);

    // PROMOTE and REPEAT require a destination class
    if ((action === 'PROMOTE' || action === 'REPEAT') && !toClassId) {
      throw new BadRequestException(`${action} requires a destination class (toClassId)`);
    }

    if (toClassId) {
      const targetClass = await this.prisma.class.findFirst({
        where: { id: toClassId, schoolId, isActive: true },
      });
      if (!targetClass) throw new NotFoundException(`Target class ${toClassId} not found`);
    }

    await this.prisma.$transaction(async (tx) => {
      // Determine new status
      const newStatus: StudentStatus =
        action === 'GRADUATE' ? StudentStatus.GRADUATED :
        action === 'WITHDRAW' ? StudentStatus.WITHDRAWN :
        StudentStatus.ACTIVE;

      // Close current class history
      await tx.studentClassHistory.updateMany({
        where: { studentId, endDate: null },
        data: { endDate: new Date() },
      });

      // Update student class and status
      await tx.student.update({
        where: { id: studentId },
        data: {
          classId: toClassId || null,
          status: newStatus,
          archivedAt: newStatus !== StudentStatus.ACTIVE ? new Date() : null,
        },
      });

      // Write new class history entry if moving to a class
      if (toClassId) {
        await tx.studentClassHistory.create({
          data: {
            studentId, classId: toClassId, sessionId,
            reason: action === 'PROMOTE' ? 'Promotion' : 'Repeated',
          },
        });
      }

      // Write promotion record
      await tx.studentPromotion.create({
        data: {
          studentId, sessionId,
          fromClassId: student.classId,
          toClassId: toClassId,
          action, adminId, note,
        },
      });
    });
  }
}
