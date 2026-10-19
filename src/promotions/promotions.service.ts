/**
 * @fileoverview Promotions service managing student promotions, repetitions, graduations,
 * and withdrawals across classes and academic sessions.
 * @module PromotionsService
 * @author Edutrack Engineering Team
 * @created 1.0.0
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { StudentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BulkPromoteDto, SinglePromoteDto } from './dto';

/**
 * Service managing student cohort transitions, updating active enrollment rosters,
 * archiving previous student class history, and recording promotion audits.
 * @module PromotionsService
 */
@Injectable()
export class PromotionsService {
  /**
   * Initializes PromotionsService with database service.
   *
   * @param {PrismaService} prisma - Prisma database access service
   */
  constructor(private prisma: PrismaService) {}

  /**
   * Retrieve list of active classes eligible for promotion processing.
   *
   * Fetches active classes with student headcount and assigned class teacher name.
   *
   * @async
   * @function getEligibleClasses
   *
   * @param {string} schoolId - UUID of the target school
   * @returns {Promise<{ data: any[]; message: string }>} Eligible classes list
   *
   * @example
   * const classes = await promotionsService.getEligibleClasses('school-uuid');
   * // Returns: { data: [{ id: '...', name: 'Primary 4 Gold', activeStudents: 28, ... }], message: 'Classes retrieved' }
   */
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
        id: c.id,
        name: c.name,
        level: c.level,
        activeStudents: c._count.students,
        classTeacher: c.classTeacher
          ? { id: c.classTeacher.id, fullName: c.classTeacher.user.fullName }
          : null,
      })),
      message: 'Classes retrieved',
    };
  }

  /**
   * Execute bulk promotion, repetition, graduation, or withdrawal for students.
   *
   * Validates source and destination sessions, iterates through student records,
   * updates status, writes class history, and records batch audit log.
   *
   * @async
   * @function bulkPromote
   *
   * @param {string} schoolId - UUID of the school
   * @param {string} adminId - UUID of the admin performing the promotions
   * @param {BulkPromoteDto} dto - Promotion batch payload
   * @returns {Promise<{ data: any; message: string }>} Summary of processed and failed records
   *
   * @throws {NotFoundException} When source or destination session is not found
   * @throws {BadRequestException} When source and destination sessions are identical
   *
   * @example
   * const result = await promotionsService.bulkPromote('school-uuid', 'admin-uuid', {
   *   fromSessionId: 'session-1',
   *   toSessionId: 'session-2',
   *   promotions: [{ studentId: 'student-1', action: 'PROMOTE', toClassId: 'class-2' }]
   * });
   * // Returns: { data: { processed: 1, failed: 0, total: 1, errors: [] }, message: '...' }
   */
  async bulkPromote(schoolId: string, adminId: string, dto: BulkPromoteDto) {
    // Validate sessions belong to school
    const fromSession = await this.prisma.academicSession.findFirst({
      where: { id: dto.fromSessionId, schoolId },
    });
    if (!fromSession) throw new NotFoundException('Source session not found');

    const toSession = await this.prisma.academicSession.findFirst({
      where: { id: dto.toSessionId, schoolId },
    });
    if (!toSession)
      throw new NotFoundException('Destination session not found');

    if (dto.fromSessionId === dto.toSessionId)
      throw new BadRequestException(
        'Source and destination sessions cannot be the same',
      );

    let processed = 0;
    const errors: any[] = [];

    for (const entry of dto.promotions) {
      try {
        await this.processPromotion(
          entry.studentId,
          schoolId,
          adminId,
          dto.toSessionId,
          entry.action,
          entry.toClassId,
          entry.note,
        );
        processed++;
      } catch (err) {
        errors.push({ studentId: entry.studentId, error: err.message });
      }
    }

    await this.prisma.auditLog.create({
      data: {
        schoolId,
        userId: adminId,
        action: 'PROMOTE',
        entity: 'Student',
        after: {
          processed,
          failed: errors.length,
          total: dto.promotions.length,
        } as any,
      },
    });

    return {
      data: {
        processed,
        failed: errors.length,
        total: dto.promotions.length,
        errors,
      },
      message: `Promotion complete. ${processed} students processed.`,
    };
  }

  /**
   * Promote, repeat, graduate, or withdraw a single student.
   *
   * Updates student enrollment, writes class history, and records promotion log.
   *
   * @async
   * @function promoteStudent
   *
   * @param {string} studentId - UUID of the target student
   * @param {string} schoolId - UUID of the school
   * @param {string} adminId - UUID of the admin performing promotion
   * @param {SinglePromoteDto} dto - Single promotion payload
   * @returns {Promise<{ message: string }>} Success message
   *
   * @throws {NotFoundException} When session or student is not found
   * @throws {BadRequestException} When PROMOTE/REPEAT lacks target class
   *
   * @example
   * const result = await promotionsService.promoteStudent('student-uuid', 'school-uuid', 'admin-uuid', {
   *   action: 'PROMOTE', sessionId: 'session-uuid', toClassId: 'class-uuid'
   * });
   * // Returns: { message: 'Student promoted successfully' }
   */
  async promoteStudent(
    studentId: string,
    schoolId: string,
    adminId: string,
    dto: SinglePromoteDto,
  ) {
    const session = await this.prisma.academicSession.findFirst({
      where: { id: dto.sessionId, schoolId },
    });
    if (!session) throw new NotFoundException('Session not found');

    await this.processPromotion(
      studentId,
      schoolId,
      adminId,
      dto.sessionId,
      dto.action,
      dto.toClassId,
      dto.note,
    );

    return { message: `Student ${dto.action.toLowerCase()}d successfully` };
  }

  /**
   * Retrieve full promotion history records for a student.
   *
   * @async
   * @function getPromotionHistory
   *
   * @param {string} studentId - UUID of the student
   * @param {string} schoolId - UUID of the school
   * @returns {Promise<{ data: any[]; message: string }>} Historical promotions list
   *
   * @throws {NotFoundException} When student is not found
   *
   * @example
   * const history = await promotionsService.getPromotionHistory('student-uuid', 'school-uuid');
   * // Returns: { data: [...records], message: 'Promotion history retrieved' }
   */
  async getPromotionHistory(studentId: string, schoolId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, schoolId },
    });
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

  /**
   * Core logic for transitioning a student record, updating class history and promotion records.
   *
   * @async
   * @function processPromotion
   *
   * @param {string} studentId - Student UUID
   * @param {string} schoolId - School UUID
   * @param {string} adminId - Admin user UUID
   * @param {string} sessionId - Session UUID
   * @param {'PROMOTE' | 'REPEAT' | 'GRADUATE' | 'WITHDRAW'} action - Promotion action
   * @param {string} [toClassId] - Target class UUID
   * @param {string} [note] - Optional remark
   *
   * @throws {NotFoundException} Student or target class not found
   * @throws {BadRequestException} Target class missing for PROMOTE or REPEAT
   */
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
    if (!student)
      throw new NotFoundException(
        `Student ${studentId} not found or not active`,
      );

    // PROMOTE and REPEAT require a destination class
    if ((action === 'PROMOTE' || action === 'REPEAT') && !toClassId) {
      throw new BadRequestException(
        `${action} requires a destination class (toClassId)`,
      );
    }

    if (toClassId) {
      const targetClass = await this.prisma.class.findFirst({
        where: { id: toClassId, schoolId, isActive: true },
      });
      if (!targetClass)
        throw new NotFoundException(`Target class ${toClassId} not found`);
    }

    await this.prisma.$transaction(async (tx) => {
      // Determine new status
      const newStatus: StudentStatus =
        action === 'GRADUATE'
          ? StudentStatus.GRADUATED
          : action === 'WITHDRAW'
            ? StudentStatus.WITHDRAWN
            : StudentStatus.ACTIVE;

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
            studentId,
            classId: toClassId,
            sessionId,
            reason: action === 'PROMOTE' ? 'Promotion' : 'Repeated',
          },
        });
      }

      // Write promotion record
      await tx.studentPromotion.create({
        data: {
          studentId,
          sessionId,
          fromClassId: student.classId,
          toClassId: toClassId,
          action,
          adminId,
          note,
        },
      });
    });
  }
}
