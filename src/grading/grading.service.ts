import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGradeDto, UpdateGradeDto } from './dto';
import { DEFAULT_NIGERIAN_GRADING, calculateGrade } from '../common/utils/grade.util';
import { GradingScale } from '@prisma/client';

@Injectable()
export class GradingService {
  constructor(private prisma: PrismaService) {}

  async getScale(schoolId: string) {
    const scales = await this.prisma.gradingScale.findMany({
      where: { schoolId, isActive: true },
      orderBy: { order: 'asc' },
    });
    return { data: scales, message: 'Grading scale retrieved' };
  }

  async addGrade(schoolId: string, userId: string, dto: CreateGradeDto) {
    if (dto.minScore > dto.maxScore)
      throw new BadRequestException('minScore cannot be greater than maxScore');

    const before = await this.prisma.gradingScale.findMany({ where: { schoolId } });
    const grade = await this.prisma.gradingScale.create({ data: { schoolId, ...dto } });

    await this.writeHistory(schoolId, userId, before, await this.prisma.gradingScale.findMany({ where: { schoolId } }));
    return { data: grade, message: 'Grade added to scale' };
  }

  async updateGrade(gradeId: string, schoolId: string, userId: string, dto: UpdateGradeDto) {
    const grade = await this.prisma.gradingScale.findFirst({ where: { id: gradeId, schoolId } });
    if (!grade) throw new NotFoundException('Grade not found');

    const before = await this.prisma.gradingScale.findMany({ where: { schoolId } });
    const updated = await this.prisma.gradingScale.update({ where: { id: gradeId }, data: dto });

    await this.writeHistory(schoolId, userId, before, await this.prisma.gradingScale.findMany({ where: { schoolId } }));
    return { data: updated, message: 'Grade updated' };
  }

  async deleteGrade(gradeId: string, schoolId: string, userId: string) {
    const grade = await this.prisma.gradingScale.findFirst({ where: { id: gradeId, schoolId } });
    if (!grade) throw new NotFoundException('Grade not found');

    const before = await this.prisma.gradingScale.findMany({ where: { schoolId } });
    await this.prisma.gradingScale.delete({ where: { id: gradeId } });

    await this.writeHistory(schoolId, userId, before, await this.prisma.gradingScale.findMany({ where: { schoolId } }));
    return { message: 'Grade removed from scale' };
  }

  async resetToDefault(schoolId: string, userId: string) {
    const before = await this.prisma.gradingScale.findMany({ where: { schoolId } });

    await this.prisma.$transaction(async (tx) => {
      await tx.gradingScale.deleteMany({ where: { schoolId } });
      await tx.gradingScale.createMany({
        data: DEFAULT_NIGERIAN_GRADING.map((g) => ({ ...g, schoolId })),
      });
    });

    await this.writeHistory(schoolId, userId, before, await this.prisma.gradingScale.findMany({ where: { schoolId } }));
    return { message: 'Grading scale reset to Nigerian A1–F9 default' };
  }

  // Used by ResultsService — exported for direct use
  async getScaleForSchool(schoolId: string): Promise<GradingScale[]> {
    return this.prisma.gradingScale.findMany({
      where: { schoolId, isActive: true },
      orderBy: { order: 'asc' },
    });
  }

  private async writeHistory(schoolId: string, changedBy: string, before: any, after: any) {
    await this.prisma.gradingScaleHistory.create({ data: { schoolId, changedBy, before, after } });
    await this.prisma.auditLog.create({
      data: { schoolId, userId: changedBy, action: 'UPDATE', entity: 'GradingScale' },
    });
  }
}
