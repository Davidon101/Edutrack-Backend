import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSchoolDto, UpdateSchoolSettingsDto } from './dto';
import { JwtPayload } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Injectable()
export class SchoolsService {
  constructor(private prisma: PrismaService) {}

  // ── Get own school ─────────────────────────────────────────────────
  async getMySchool(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true, name: true, type: true, address: true,
        email: true, phone: true, isActive: true, createdAt: true,
      },
    });
    if (!school) throw new NotFoundException('School not found');
    return { data: school, message: 'School retrieved' };
  }

  // ── Update school profile ──────────────────────────────────────────
  async updateMySchool(schoolId: string, userId: string, dto: UpdateSchoolDto) {
    const before = await this.prisma.school.findUnique({ where: { id: schoolId } });
    if (!before) throw new NotFoundException('School not found');

    const updated = await this.prisma.school.update({
      where: { id: schoolId },
      data: { ...dto },
      select: { id: true, name: true, address: true, email: true, phone: true },
    });

    await this.prisma.auditLog.create({
      data: {
        schoolId, userId, action: 'UPDATE', entity: 'School', entityId: schoolId,
        before: { name: before.name, address: before.address, phone: before.phone },
        after: { ...dto } as any,
      },
    });

    return { data: updated, message: 'School updated successfully' };
  }

  // ── Get school settings ────────────────────────────────────────────
  async getSettings(schoolId: string) {
    const settings = await this.prisma.schoolSettings.findUnique({
      where: { schoolId },
      select: {
        id: true, ca1Max: true, ca2Max: true, ca3Max: true, ca4Max: true,
        examMax: true, staffIdPrefix: true, studentIdPrefix: true,
      },
    });
    if (!settings) throw new NotFoundException('School settings not found');
    return { data: settings, message: 'Settings retrieved' };
  }

  // ── Update school settings ─────────────────────────────────────────
  async updateSettings(schoolId: string, userId: string, dto: UpdateSchoolSettingsDto) {
    const existing = await this.prisma.schoolSettings.findUnique({ where: { schoolId } });
    if (!existing) throw new NotFoundException('School settings not found');

    const updated = await this.prisma.schoolSettings.update({
      where: { schoolId },
      data: { ...dto },
    });

    // Write settings history
    await this.prisma.schoolSettingsHistory.create({
      data: { settingsId: existing.id, changedBy: userId, before: existing as any, after: updated as any },
    });

    await this.prisma.auditLog.create({
      data: { schoolId, userId, action: 'UPDATE', entity: 'SchoolSettings', entityId: existing.id, before: existing as any, after: dto as any },
    });

    return { data: updated, message: 'Settings updated successfully' };
  }

  // ── SUPER_ADMIN: list all schools ──────────────────────────────────
  async getAllSchools(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [schools, total] = await Promise.all([
      this.prisma.school.findMany({
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, address: true, isActive: true, createdAt: true },
      }),
      this.prisma.school.count(),
    ]);
    return { data: schools, meta: { total, page, limit, pages: Math.ceil(total / limit) }, message: 'Schools retrieved' };
  }

  // ── SUPER_ADMIN: suspend a school ──────────────────────────────────
  async suspendSchool(schoolId: string, adminUserId: string) {
    const school = await this.prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) throw new NotFoundException('School not found');

    await this.prisma.school.update({
      where: { id: schoolId },
      data: { isActive: false, archivedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: { schoolId, userId: adminUserId, action: 'DEACTIVATE', entity: 'School', entityId: schoolId },
    });

    return { message: 'School suspended successfully' };
  }

  // ── SUPER_ADMIN: activate a school ─────────────────────────────────
  async activateSchool(schoolId: string, adminUserId: string) {
    const school = await this.prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) throw new NotFoundException('School not found');

    await this.prisma.school.update({
      where: { id: schoolId },
      data: { isActive: true, archivedAt: null },
    });

    await this.prisma.auditLog.create({
      data: { schoolId, userId: adminUserId, action: 'ACTIVATE', entity: 'School', entityId: schoolId },
    });

    return { message: 'School activated successfully' };
  }

  // ── Public: list schools for login screen (sc-select-school) ──────
  async getPublicSchoolList(search?: string) {
    const schools = await this.prisma.school.findMany({
      where: {
        isActive: true,
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      },
      select: { id: true, name: true, address: true },
      orderBy: { name: 'asc' },
      take: 50,
    });
    return { data: schools, message: 'Schools retrieved' };
  }
}
