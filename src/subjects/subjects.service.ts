/**
 * @fileoverview Subjects service managing school-wide subjects, display sequencing,
 * updates, and soft-delete archiving.
 * @module subjects/subjects.service
 */

import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubjectDto, UpdateSubjectDto } from './dto';

/**
 * Service handling subject catalog management. Subjects are defined at the school level
 * and are universally available across classes.
 */
@Injectable()
export class SubjectsService {
  /**
   * Initializes the SubjectsService.
   *
   * @param prisma - Prisma database client.
   */
  constructor(private prisma: PrismaService) {}

  /**
   * Retrieves all active subjects for a school, sorted by displayOrder.
   *
   * @param schoolId - UUID of the school.
   * @returns Object containing array of active subjects.
   *
   * @example
   * ```ts
   * const subjects = await subjectsService.getSubjects('school-uuid');
   * ```
   */
  async getSubjects(schoolId: string) {
    const subjects = await this.prisma.subject.findMany({
      where: { schoolId, isActive: true },
      orderBy: { displayOrder: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        displayOrder: true,
        isActive: true,
        createdAt: true,
      },
    });
    return { data: subjects, message: 'Subjects retrieved' };
  }

  /**
   * Creates a new subject for the school, automatically calculating the next `displayOrder`.
   *
   * @param schoolId - UUID of the school.
   * @param userId - UUID of the administrator creating the subject.
   * @param dto - Subject creation payload.
   * @returns Newly created subject record.
   * @throws {ConflictException} If a subject with the same name already exists in the school.
   *
   * @example
   * ```ts
   * const subject = await subjectsService.createSubject('school-uuid', 'admin-uuid', {
   *   name: 'Mathematics',
   *   code: 'MTH',
   * });
   * ```
   */
  async createSubject(
    schoolId: string,
    userId: string,
    dto: CreateSubjectDto,
  ) {
    const existing = await this.prisma.subject.findFirst({
      where: { schoolId, name: dto.name, isActive: true },
    });
    if (existing)
      throw new ConflictException(`Subject "${dto.name}" already exists`);

    // Auto-assign displayOrder = next available number
    const maxOrder = await this.prisma.subject.aggregate({
      where: { schoolId },
      _max: { displayOrder: true },
    });
    const nextOrder = (maxOrder._max.displayOrder ?? 0) + 1;

    const subject = await this.prisma.subject.create({
      data: {
        schoolId,
        name: dto.name,
        code: dto.code,
        displayOrder: nextOrder,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        schoolId,
        userId,
        action: 'CREATE',
        entity: 'Subject',
        entityId: subject.id,
        after: dto as any,
      },
    });

    return { data: subject, message: 'Subject created successfully' };
  }

  /**
   * Updates an existing subject's name or code.
   *
   * @param subjectId - UUID of the subject.
   * @param schoolId - UUID of the school.
   * @param userId - UUID of the administrator executing the update.
   * @param dto - Updated fields.
   * @returns Updated subject entity.
   * @throws {NotFoundException} If the subject does not exist.
   * @throws {ConflictException} If the updated name conflicts with another active subject.
   *
   * @example
   * ```ts
   * const updated = await subjectsService.updateSubject('subject-uuid', 'school-uuid', 'admin-uuid', {
   *   name: 'Advanced Mathematics',
   * });
   * ```
   */
  async updateSubject(
    subjectId: string,
    schoolId: string,
    userId: string,
    dto: UpdateSubjectDto,
  ) {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, schoolId, isActive: true },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    if (dto.name && dto.name !== subject.name) {
      const duplicate = await this.prisma.subject.findFirst({
        where: {
          schoolId,
          name: dto.name,
          isActive: true,
          NOT: { id: subjectId },
        },
      });
      if (duplicate)
        throw new ConflictException(`Subject "${dto.name}" already exists`);
    }

    const updated = await this.prisma.subject.update({
      where: { id: subjectId },
      data: { ...dto },
    });

    await this.prisma.auditLog.create({
      data: {
        schoolId,
        userId,
        action: 'UPDATE',
        entity: 'Subject',
        entityId: subjectId,
        before: subject as any,
        after: dto as any,
      },
    });

    return { data: updated, message: 'Subject updated successfully' };
  }

  /**
   * Archives a subject (soft delete), preserving historical assessment score records.
   *
   * @param subjectId - UUID of the subject.
   * @param schoolId - UUID of the school.
   * @param userId - UUID of the administrator archiving the subject.
   * @returns Success confirmation message.
   * @throws {NotFoundException} If the subject does not exist.
   *
   * @example
   * ```ts
   * await subjectsService.archiveSubject('subject-uuid', 'school-uuid', 'admin-uuid');
   * ```
   */
  async archiveSubject(
    subjectId: string,
    schoolId: string,
    userId: string,
  ) {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, schoolId, isActive: true },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    await this.prisma.subject.update({
      where: { id: subjectId },
      data: { isActive: false, archivedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        schoolId,
        userId,
        action: 'ARCHIVE',
        entity: 'Subject',
        entityId: subjectId,
      },
    });

    return { message: `Subject "${subject.name}" archived successfully` };
  }
}
