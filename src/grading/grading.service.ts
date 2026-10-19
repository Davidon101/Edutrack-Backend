/**
 * @fileoverview Grading service managing school grading scales, grade threshold adjustments,
 * audit history snapshots, and Nigerian WAEC scale resets.
 * @module GradingService
 * @author Edutrack Engineering Team
 * @created 1.0.0
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGradeDto, UpdateGradeDto } from './dto';
import { DEFAULT_NIGERIAN_GRADING } from '../common/utils/grade.util';
import { GradingScale } from '@prisma/client';

/**
 * Service managing grading scales, boundary constraints, and grading scale history.
 * @module GradingService
 */
@Injectable()
export class GradingService {
  /**
   * Initializes GradingService with database access.
   *
   * @param {PrismaService} prisma - Prisma database service
   */
  constructor(private prisma: PrismaService) {}

  /**
   * Retrieve active grading scale entries configured for a school.
   *
   * @async
   * @function getScale
   *
   * @param {string} schoolId - UUID of the school
   * @returns {Promise<{ data: GradingScale[]; message: string }>} List of grading scales
   *
   * @example
   * const result = await gradingService.getScale('school-uuid');
   * // Returns: { data: [...scales], message: 'Grading scale retrieved' }
   */
  async getScale(schoolId: string) {
    const scales = await this.prisma.gradingScale.findMany({
      where: { schoolId, isActive: true },
      orderBy: { order: 'asc' },
    });
    return { data: scales, message: 'Grading scale retrieved' };
  }

  /**
   * Add a new grade entry to a school's grading scale.
   *
   * Validates score bounds (minScore <= maxScore), creates the scale record,
   * writes before/after states to gradingScaleHistory, and emits an audit log.
   *
   * @async
   * @function addGrade
   *
   * @param {string} schoolId - UUID of the school
   * @param {string} userId - UUID of the admin adding the grade
   * @param {CreateGradeDto} dto - New grade parameters
   * @returns {Promise<{ data: GradingScale; message: string }>} Created grade entry
   *
   * @throws {BadRequestException} When minScore exceeds maxScore
   *
   * @example
   * const grade = await gradingService.addGrade('school-uuid', 'user-uuid', {
   *   grade: 'A1', minScore: 75, maxScore: 100, remark: 'Excellent', order: 1
   * });
   * // Returns: { data: { id: '...', grade: 'A1', ... }, message: 'Grade added to scale' }
   */
  async addGrade(schoolId: string, userId: string, dto: CreateGradeDto) {
    if (dto.minScore > dto.maxScore)
      throw new BadRequestException('minScore cannot be greater than maxScore');

    const before = await this.prisma.gradingScale.findMany({
      where: { schoolId },
    });
    const grade = await this.prisma.gradingScale.create({
      data: { schoolId, ...dto },
    });

    await this.writeHistory(
      schoolId,
      userId,
      before,
      await this.prisma.gradingScale.findMany({ where: { schoolId } }),
    );
    return { data: grade, message: 'Grade added to scale' };
  }

  /**
   * Update an existing grade entry in a school's grading scale.
   *
   * Updates fields, takes before/after snapshots of the scale, and writes to history and audit logs.
   *
   * @async
   * @function updateGrade
   *
   * @param {string} gradeId - UUID of the grade to update
   * @param {string} schoolId - UUID of the school
   * @param {string} userId - UUID of the user performing the update
   * @param {UpdateGradeDto} dto - Updated grade parameters
   * @returns {Promise<{ data: GradingScale; message: string }>} Updated grade record
   *
   * @throws {NotFoundException} When target grade is not found in the school
   *
   * @example
   * const result = await gradingService.updateGrade('grade-uuid', 'school-uuid', 'user-uuid', {
   *   remark: 'Distinction'
   * });
   * // Returns: { data: { id: '...', remark: 'Distinction' }, message: 'Grade updated' }
   */
  async updateGrade(
    gradeId: string,
    schoolId: string,
    userId: string,
    dto: UpdateGradeDto,
  ) {
    const grade = await this.prisma.gradingScale.findFirst({
      where: { id: gradeId, schoolId },
    });
    if (!grade) throw new NotFoundException('Grade not found');

    const before = await this.prisma.gradingScale.findMany({
      where: { schoolId },
    });
    const updated = await this.prisma.gradingScale.update({
      where: { id: gradeId },
      data: dto,
    });

    await this.writeHistory(
      schoolId,
      userId,
      before,
      await this.prisma.gradingScale.findMany({ where: { schoolId } }),
    );
    return { data: updated, message: 'Grade updated' };
  }

  /**
   * Remove a grade entry from the school's scale.
   *
   * Deletes the grade record, records history snapshot, and logs the action.
   *
   * @async
   * @function deleteGrade
   *
   * @param {string} gradeId - UUID of the grade to delete
   * @param {string} schoolId - UUID of the school
   * @param {string} userId - UUID of the admin deleting the grade
   * @returns {Promise<{ message: string }>} Confirmation message
   *
   * @throws {NotFoundException} When target grade is not found
   *
   * @example
   * const result = await gradingService.deleteGrade('grade-uuid', 'school-uuid', 'user-uuid');
   * // Returns: { message: 'Grade removed from scale' }
   */
  async deleteGrade(gradeId: string, schoolId: string, userId: string) {
    const grade = await this.prisma.gradingScale.findFirst({
      where: { id: gradeId, schoolId },
    });
    if (!grade) throw new NotFoundException('Grade not found');

    const before = await this.prisma.gradingScale.findMany({
      where: { schoolId },
    });
    await this.prisma.gradingScale.delete({ where: { id: gradeId } });

    await this.writeHistory(
      schoolId,
      userId,
      before,
      await this.prisma.gradingScale.findMany({ where: { schoolId } }),
    );
    return { message: 'Grade removed from scale' };
  }

  /**
   * Reset school's grading scale to standard Nigerian WAEC A1–F9 defaults.
   *
   * Deletes existing grading scale records for the school in a transaction,
   * inserts the standard WAEC array, and logs the change.
   *
   * @async
   * @function resetToDefault
   *
   * @param {string} schoolId - UUID of the school
   * @param {string} userId - UUID of the admin resetting the scale
   * @returns {Promise<{ message: string }>} Confirmation message
   *
   * @example
   * const result = await gradingService.resetToDefault('school-uuid', 'user-uuid');
   * // Returns: { message: 'Grading scale reset to Nigerian A1–F9 default' }
   */
  async resetToDefault(schoolId: string, userId: string) {
    const before = await this.prisma.gradingScale.findMany({
      where: { schoolId },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.gradingScale.deleteMany({ where: { schoolId } });
      await tx.gradingScale.createMany({
        data: DEFAULT_NIGERIAN_GRADING.map((g) => ({ ...g, schoolId })),
      });
    });

    await this.writeHistory(
      schoolId,
      userId,
      before,
      await this.prisma.gradingScale.findMany({ where: { schoolId } }),
    );
    return { message: 'Grading scale reset to Nigerian A1–F9 default' };
  }

  /**
   * Retrieve active grading scales for a school for score computation.
   *
   * @async
   * @function getScaleForSchool
   *
   * @param {string} schoolId - UUID of the school
   * @returns {Promise<GradingScale[]>} Array of active grading scale records
   *
   * @example
   * const scales = await gradingService.getScaleForSchool('school-uuid');
   */
  async getScaleForSchool(schoolId: string): Promise<GradingScale[]> {
    return this.prisma.gradingScale.findMany({
      where: { schoolId, isActive: true },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Internal helper writing before/after state snapshots to grading scale history and audit logs.
   *
   * @async
   * @function writeHistory
   *
   * @param {string} schoolId - UUID of the school
   * @param {string} changedBy - UUID of user making change
   * @param {any} before - Snapshot before modification
   * @param {any} after - Snapshot after modification
   */
  private async writeHistory(
    schoolId: string,
    changedBy: string,
    before: any,
    after: any,
  ) {
    await this.prisma.gradingScaleHistory.create({
      data: { schoolId, changedBy, before, after },
    });
    await this.prisma.auditLog.create({
      data: {
        schoolId,
        userId: changedBy,
        action: 'UPDATE',
        entity: 'GradingScale',
      },
    });
  }
}
