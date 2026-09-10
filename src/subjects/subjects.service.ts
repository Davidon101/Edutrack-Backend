import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubjectDto, UpdateSubjectDto } from './dto';

@Injectable()
export class SubjectsService {
  constructor(private prisma: PrismaService) {}

  // ── List all active school-wide subjects ───────────────────────────
  // Subjects are NOT per-class — all active subjects available to all classes
  async getSubjects(schoolId: string) {
    const subjects = await this.prisma.subject.findMany({
      where: { schoolId, isActive: true },
      orderBy: { displayOrder: 'asc' },
      select: { id: true, name: true, code: true, displayOrder: true, isActive: true, createdAt: true },
    });
    return { data: subjects, message: 'Subjects retrieved' };
  }

  // ── Create a subject — auto-assigns next displayOrder ──────────────
  async createSubject(schoolId: string, userId: string, dto: CreateSubjectDto) {
    const existing = await this.prisma.subject.findFirst({
      where: { schoolId, name: dto.name, isActive: true },
    });
    if (existing) throw new ConflictException(`Subject "${dto.name}" already exists`);

    // Auto-assign displayOrder = next available number
    const maxOrder = await this.prisma.subject.aggregate({
      where: { schoolId },
      _max: { displayOrder: true },
    });
    const nextOrder = (maxOrder._max.displayOrder ?? 0) + 1;

    const subject = await this.prisma.subject.create({
      data: { schoolId, name: dto.name, code: dto.code, displayOrder: nextOrder },
    });

    await this.prisma.auditLog.create({
      data: { schoolId, userId, action: 'CREATE', entity: 'Subject', entityId: subject.id, after: dto as any },
    });

    return { data: subject, message: 'Subject created successfully' };
  }

  // ── Update subject ─────────────────────────────────────────────────
  async updateSubject(subjectId: string, schoolId: string, userId: string, dto: UpdateSubjectDto) {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, schoolId, isActive: true },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    if (dto.name && dto.name !== subject.name) {
      const duplicate = await this.prisma.subject.findFirst({
        where: { schoolId, name: dto.name, isActive: true, NOT: { id: subjectId } },
      });
      if (duplicate) throw new ConflictException(`Subject "${dto.name}" already exists`);
    }

    const updated = await this.prisma.subject.update({ where: { id: subjectId }, data: { ...dto } });

    await this.prisma.auditLog.create({
      data: { schoolId, userId, action: 'UPDATE', entity: 'Subject', entityId: subjectId, before: subject as any, after: dto as any },
    });

    return { data: updated, message: 'Subject updated successfully' };
  }

  // ── Archive subject (soft delete) ──────────────────────────────────
  // Archived subjects still appear in historical results
  async archiveSubject(subjectId: string, schoolId: string, userId: string) {
    const subject = await this.prisma.subject.findFirst({ where: { id: subjectId, schoolId, isActive: true } });
    if (!subject) throw new NotFoundException('Subject not found');

    await this.prisma.subject.update({
      where: { id: subjectId },
      data: { isActive: false, archivedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: { schoolId, userId, action: 'ARCHIVE', entity: 'Subject', entityId: subjectId },
    });

    return { message: `Subject "${subject.name}" archived successfully` };
  }
}
