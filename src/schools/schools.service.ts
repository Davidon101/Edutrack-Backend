/**
 * @fileoverview Schools service providing business logic for retrieving and modifying
 * school profiles, academic assessment settings, administrative status, and public listings.
 * @module schools/schools.service
 */

import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSchoolDto, UpdateSchoolSettingsDto } from './dto';

/**
 * Service handling school tenant profile operations, assessment configuration settings,
 * Super Admin platform-wide directory queries, and suspension/reactivation.
 */
@Injectable()
export class SchoolsService {
  /**
   * Initializes the SchoolsService.
   *
   * @param prisma - Prisma database client service.
   */
  constructor(private prisma: PrismaService) {}

  /**
   * Retrieves profile details of the authenticated user's school.
   *
   * @param schoolId - UUID of the school.
   * @returns Object containing school record and success message.
   * @throws {NotFoundException} If the school does not exist.
   *
   * @example
   * ```ts
   * const result = await schoolsService.getMySchool('school-uuid');
   * ```
   */
  async getMySchool(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        type: true,
        address: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
    });
    if (!school) throw new NotFoundException('School not found');
    return { data: school, message: 'School retrieved' };
  }

  /**
   * Updates profile attributes for a school and records an audit log snapshot.
   *
   * @param schoolId - UUID of the school to update.
   * @param userId - UUID of the authenticated user executing the update.
   * @param dto - New profile attributes.
   * @returns Object containing updated school data and success message.
   * @throws {NotFoundException} If the school does not exist.
   *
   * @example
   * ```ts
   * const result = await schoolsService.updateMySchool('school-uuid', 'user-uuid', {
   *   name: 'New School Name',
   *   phone: '08099999999',
   * });
   * ```
   */
  async updateMySchool(schoolId: string, userId: string, dto: UpdateSchoolDto) {
    const before = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });
    if (!before) throw new NotFoundException('School not found');

    const updated = await this.prisma.school.update({
      where: { id: schoolId },
      data: { ...dto },
      select: { id: true, name: true, address: true, email: true, phone: true },
    });

    await this.prisma.auditLog.create({
      data: {
        schoolId,
        userId,
        action: 'UPDATE',
        entity: 'School',
        entityId: schoolId,
        before: {
          name: before.name,
          address: before.address,
          phone: before.phone,
        },
        after: { ...dto } as any,
      },
    });

    return { data: updated, message: 'School updated successfully' };
  }

  /**
   * Retrieves academic assessment settings and ID prefix configuration for a school.
   *
   * @param schoolId - UUID of the school.
   * @returns Object containing school settings and success message.
   * @throws {NotFoundException} If settings are not found for the given school.
   *
   * @example
   * ```ts
   * const result = await schoolsService.getSettings('school-uuid');
   * ```
   */
  async getSettings(schoolId: string) {
    const settings = await this.prisma.schoolSettings.findUnique({
      where: { schoolId },
      select: {
        id: true,
        ca1Max: true,
        ca2Max: true,
        ca3Max: true,
        ca4Max: true,
        examMax: true,
        staffIdPrefix: true,
        studentIdPrefix: true,
      },
    });
    if (!settings) throw new NotFoundException('School settings not found');
    return { data: settings, message: 'Settings retrieved' };
  }

  /**
   * Updates academic assessment settings, recording changes in settings history and audit log.
   *
   * @param schoolId - UUID of the school.
   * @param userId - UUID of the user performing the update.
   * @param dto - New assessment weights and ID prefixes.
   * @returns Object containing updated settings and success message.
   * @throws {NotFoundException} If school settings are not found.
   *
   * @example
   * ```ts
   * const result = await schoolsService.updateSettings('school-uuid', 'user-uuid', {
   *   examMax: 70,
   *   ca1Max: 15,
   * });
   * ```
   */
  async updateSettings(
    schoolId: string,
    userId: string,
    dto: UpdateSchoolSettingsDto,
  ) {
    const existing = await this.prisma.schoolSettings.findUnique({
      where: { schoolId },
    });
    if (!existing) throw new NotFoundException('School settings not found');

    const updated = await this.prisma.schoolSettings.update({
      where: { schoolId },
      data: { ...dto },
    });

    // Write settings history
    await this.prisma.schoolSettingsHistory.create({
      data: {
        settingsId: existing.id,
        changedBy: userId,
        before: existing as any,
        after: updated as any,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        schoolId,
        userId,
        action: 'UPDATE',
        entity: 'SchoolSettings',
        entityId: existing.id,
        before: existing as any,
        after: dto as any,
      },
    });

    return { data: updated, message: 'Settings updated successfully' };
  }

  /**
   * Retrieves a paginated list of all registered schools across the platform (Super Admin only).
   *
   * @param page - Page number (defaults to 1).
   * @param limit - Number of records per page (defaults to 20).
   * @returns Paginated list of schools with meta pagination attributes.
   *
   * @example
   * ```ts
   * const result = await schoolsService.getAllSchools(1, 10);
   * ```
   */
  async getAllSchools(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [schools, total] = await Promise.all([
      this.prisma.school.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          address: true,
          isActive: true,
          createdAt: true,
        },
      }),
      this.prisma.school.count(),
    ]);
    return {
      data: schools,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
      message: 'Schools retrieved',
    };
  }

  /**
   * Suspends a school on the platform, preventing logins and marking it inactive (Super Admin only).
   *
   * @param schoolId - UUID of the school to suspend.
   * @param adminUserId - UUID of the Super Admin performing the suspension.
   * @returns Object containing success message.
   * @throws {NotFoundException} If the school is not found.
   *
   * @example
   * ```ts
   * const result = await schoolsService.suspendSchool('school-uuid', 'super-admin-uuid');
   * ```
   */
  async suspendSchool(schoolId: string, adminUserId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });
    if (!school) throw new NotFoundException('School not found');

    await this.prisma.school.update({
      where: { id: schoolId },
      data: { isActive: false, archivedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        schoolId,
        userId: adminUserId,
        action: 'DEACTIVATE',
        entity: 'School',
        entityId: schoolId,
      },
    });

    return { message: 'School suspended successfully' };
  }

  /**
   * Reactivates a previously suspended school (Super Admin only).
   *
   * @param schoolId - UUID of the school to reactivate.
   * @param adminUserId - UUID of the Super Admin performing the activation.
   * @returns Object containing success message.
   * @throws {NotFoundException} If the school is not found.
   *
   * @example
   * ```ts
   * const result = await schoolsService.activateSchool('school-uuid', 'super-admin-uuid');
   * ```
   */
  async activateSchool(schoolId: string, adminUserId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });
    if (!school) throw new NotFoundException('School not found');

    await this.prisma.school.update({
      where: { id: schoolId },
      data: { isActive: true, archivedAt: null },
    });

    await this.prisma.auditLog.create({
      data: {
        schoolId,
        userId: adminUserId,
        action: 'ACTIVATE',
        entity: 'School',
        entityId: schoolId,
      },
    });

    return { message: 'School activated successfully' };
  }

  /**
   * Retrieves a lightweight list of active schools for client login school selection.
   * Publicly accessible, limits to 50 results.
   *
   * @param search - Optional case-insensitive substring search for school name.
   * @returns Object containing list of active school summaries.
   *
   * @example
   * ```ts
   * const list = await schoolsService.getPublicSchoolList('Academy');
   * ```
   */
  async getPublicSchoolList(search?: string) {
    const schools = await this.prisma.school.findMany({
      where: {
        isActive: true,
        ...(search
          ? { name: { contains: search, mode: 'insensitive' } }
          : {}),
      },
      select: { id: true, name: true, address: true },
      orderBy: { name: 'asc' },
      take: 50,
    });
    return { data: schools, message: 'Schools retrieved' };
  }
}
