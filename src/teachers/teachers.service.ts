/**
 * @fileoverview Teachers service managing teacher creation, auto-generated Staff ID credentials,
 * user account provisioning, profile updates, status activation/deactivation, and assignment history.
 * @module teachers/teachers.service
 */

import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeacherDto, UpdateTeacherDto } from './dto';
import { generateStaffId } from '../common/utils/id.util';
import {
  generateTemporaryPassword,
  hashPassword,
} from '../common/utils/password.util';

/**
 * Service managing teacher entities, staff credential allocation, and assignment tracking.
 */
@Injectable()
export class TeachersService {
  /**
   * Initializes the TeachersService.
   *
   * @param prisma - Prisma database client.
   */
  constructor(private prisma: PrismaService) {}

  /**
   * Retrieves all teachers in a school with active class teacher assignments.
   *
   * @param schoolId - UUID of the school.
   * @returns Object containing list of formatted teachers and success message.
   *
   * @example
   * ```ts
   * const teachers = await teachersService.getTeachers('school-uuid');
   * ```
   */
  async getTeachers(schoolId: string) {
    const teachers = await this.prisma.teacher.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
            phone: true,
            isActive: true,
          },
        },
        classesAsTeacher: {
          where: { isActive: true },
          select: { id: true, name: true },
        },
      },
    });

    const formatted = teachers.map((t) => ({
      id: t.id,
      staffId: t.staffId,
      fullName: t.user.fullName,
      email: t.user.email,
      phone: t.user.phone,
      qualification: t.qualification,
      specialization: t.specialization,
      isActive: t.isActive,
      assignedClass: t.classesAsTeacher[0] || null,
    }));

    return { data: formatted, message: 'Teachers retrieved' };
  }

  /**
   * Retrieves full profile details for a teacher by UUID.
   *
   * @param teacherId - UUID of the teacher.
   * @param schoolId - UUID of the school.
   * @returns Object containing detailed teacher record and user account metadata.
   * @throws {NotFoundException} If the teacher is not found.
   *
   * @example
   * ```ts
   * const teacher = await teachersService.getTeacherById('teacher-uuid', 'school-uuid');
   * ```
   */
  async getTeacherById(teacherId: string, schoolId: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id: teacherId, schoolId },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
            phone: true,
            isActive: true,
            mustChangePassword: true,
            lastLoginAt: true,
          },
        },
        classesAsTeacher: {
          where: { isActive: true },
          select: { id: true, name: true, level: true },
        },
      },
    });
    if (!teacher) throw new NotFoundException('Teacher not found');

    return {
      data: {
        id: teacher.id,
        staffId: teacher.staffId,
        fullName: teacher.user.fullName,
        email: teacher.user.email,
        phone: teacher.user.phone,
        qualification: teacher.qualification,
        specialization: teacher.specialization,
        joinDate: teacher.joinDate,
        isActive: teacher.isActive,
        lastLoginAt: teacher.user.lastLoginAt,
        mustChangePassword: teacher.user.mustChangePassword,
        assignedClass: teacher.classesAsTeacher[0] || null,
      },
      message: 'Teacher retrieved',
    };
  }

  /**
   * Creates a new teacher record, provisioning a user account and auto-generating a Staff ID.
   *
   * @param schoolId - UUID of the school.
   * @param adminId - UUID of the administrator performing creation.
   * @param dto - Teacher creation payload.
   * @returns Newly created teacher profile and one-time temporary password.
   * @throws {NotFoundException} If school settings are missing.
   *
   * @example
   * ```ts
   * const result = await teachersService.createTeacher('school-uuid', 'admin-uuid', {
   *   fullName: 'Mr. John Adeyemi',
   *   phone: '08012345678',
   * });
   * ```
   */
  async createTeacher(
    schoolId: string,
    adminId: string,
    dto: CreateTeacherDto,
  ) {
    const settings = await this.prisma.schoolSettings.findUnique({
      where: { schoolId },
    });
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
    const staffIdTaken = await this.prisma.teacher.findUnique({
      where: { staffId },
    });
    if (staffIdTaken) {
      // Increment and try again
      const staffIdRetry = generateStaffId(
        settings.staffIdPrefix,
        nextSeq + 1,
      );
      return this.createTeacherWithStaffId(
        schoolId,
        adminId,
        dto,
        staffIdRetry,
      );
    }

    return this.createTeacherWithStaffId(schoolId, adminId, dto, staffId);
  }

  /**
   * Internal helper executing database transaction for teacher creation with specific Staff ID.
   *
   * @param schoolId - UUID of the school.
   * @param adminId - UUID of the administrator.
   * @param dto - Creation payload.
   * @param staffId - Target staff ID string.
   * @returns Created teacher data and temporary password.
   */
  private async createTeacherWithStaffId(
    schoolId: string,
    adminId: string,
    dto: CreateTeacherDto,
    staffId: string,
  ) {
    const tempPassword = generateTemporaryPassword();
    const hashedPassword = await hashPassword(tempPassword);

    const result = await this.prisma.$transaction(async (tx) => {
      // Create user account for teacher
      const user = await tx.user.create({
        data: {
          schoolId,
          fullName: dto.fullName,
          email:
            dto.email ||
            `${staffId.toLowerCase().replace(/\//g, '.')}@noemail.edutrack`,
          phone: dto.phone,
          password: hashedPassword,
          role: Role.TEACHER,
          mustChangePassword: true,
        },
      });

      const teacher = await tx.teacher.create({
        data: {
          userId: user.id,
          schoolId,
          staffId,
          qualification: dto.qualification,
          specialization: dto.specialization,
          joinDate: dto.joinDate ? new Date(dto.joinDate) : undefined,
        },
      });

      await tx.auditLog.create({
        data: {
          schoolId,
          userId: adminId,
          action: 'CREATE',
          entity: 'Teacher',
          entityId: teacher.id,
          after: { staffId, fullName: dto.fullName },
        },
      });

      return { teacher, user, tempPassword };
    });

    return {
      data: {
        id: result.teacher.id,
        staffId,
        fullName: dto.fullName,
        phone: dto.phone,
        email: dto.email,
        temporaryPassword: result.tempPassword, // Shown once — admin gives to teacher
        mustChangePassword: true,
      },
      message: 'Teacher created successfully',
    };
  }

  /**
   * Updates teacher personal information and professional qualifications.
   * Staff ID cannot be updated.
   *
   * @param teacherId - UUID of the teacher.
   * @param schoolId - UUID of the school.
   * @param adminId - UUID of the administrator.
   * @param dto - Updated fields.
   * @returns Success status message.
   * @throws {NotFoundException} If the teacher does not exist.
   *
   * @example
   * ```ts
   * await teachersService.updateTeacher('teacher-uuid', 'school-uuid', 'admin-uuid', {
   *   phone: '08099999999',
   * });
   * ```
   */
  async updateTeacher(
    teacherId: string,
    schoolId: string,
    adminId: string,
    dto: UpdateTeacherDto,
  ) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id: teacherId, schoolId },
    });
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
            qualification: dto.qualification,
            specialization: dto.specialization,
            joinDate: dto.joinDate ? new Date(dto.joinDate) : undefined,
          },
        });
      }
      await tx.auditLog.create({
        data: {
          schoolId,
          userId: adminId,
          action: 'UPDATE',
          entity: 'Teacher',
          entityId: teacherId,
          after: dto as any,
        },
      });
    });

    return { message: 'Teacher updated successfully' };
  }

  /**
   * Deactivates a teacher account, preventing future logins.
   *
   * @param teacherId - UUID of the teacher.
   * @param schoolId - UUID of the school.
   * @param adminId - UUID of the administrator.
   * @returns Success status message.
   * @throws {NotFoundException} If the teacher does not exist.
   *
   * @example
   * ```ts
   * await teachersService.deactivateTeacher('teacher-uuid', 'school-uuid', 'admin-uuid');
   * ```
   */
  async deactivateTeacher(
    teacherId: string,
    schoolId: string,
    adminId: string,
  ) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id: teacherId, schoolId },
    });
    if (!teacher) throw new NotFoundException('Teacher not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.teacher.update({
        where: { id: teacherId },
        data: { isActive: false, archivedAt: new Date() },
      });
      await tx.user.update({
        where: { id: teacher.userId },
        data: { isActive: false },
      });
      await tx.auditLog.create({
        data: {
          schoolId,
          userId: adminId,
          action: 'DEACTIVATE',
          entity: 'Teacher',
          entityId: teacherId,
        },
      });
    });

    return { message: 'Teacher deactivated successfully' };
  }

  /**
   * Reactivates a deactivated teacher and re-enables their user account.
   *
   * @param teacherId - UUID of the teacher.
   * @param schoolId - UUID of the school.
   * @param adminId - UUID of the administrator.
   * @returns Success status message.
   * @throws {NotFoundException} If the teacher does not exist.
   *
   * @example
   * ```ts
   * await teachersService.reactivateTeacher('teacher-uuid', 'school-uuid', 'admin-uuid');
   * ```
   */
  async reactivateTeacher(
    teacherId: string,
    schoolId: string,
    adminId: string,
  ) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id: teacherId, schoolId },
    });
    if (!teacher) throw new NotFoundException('Teacher not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.teacher.update({
        where: { id: teacherId },
        data: { isActive: true, archivedAt: null },
      });
      await tx.user.update({
        where: { id: teacher.userId },
        data: { isActive: true },
      });
      await tx.auditLog.create({
        data: {
          schoolId,
          userId: adminId,
          action: 'ACTIVATE',
          entity: 'Teacher',
          entityId: teacherId,
        },
      });
    });

    return { message: 'Teacher reactivated successfully' };
  }

  /**
   * Retrieves historical class assignments for a teacher.
   *
   * @param teacherId - UUID of the teacher.
   * @param schoolId - UUID of the school.
   * @returns Object containing list of assignment history items.
   * @throws {NotFoundException} If the teacher does not exist.
   *
   * @example
   * ```ts
   * const history = await teachersService.getTeacherHistory('teacher-uuid', 'school-uuid');
   * ```
   */
  async getTeacherHistory(teacherId: string, schoolId: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id: teacherId, schoolId },
    });
    if (!teacher) throw new NotFoundException('Teacher not found');

    const history = await this.prisma.teacherAssignmentHistory.findMany({
      where: { teacherId },
      orderBy: { startDate: 'desc' },
    });

    return { data: history, message: 'Teacher history retrieved' };
  }

  /**
   * Helper extracting numeric sequence from the latest teacher Staff ID.
   *
   * @param lastStaffId - Last staff ID string (e.g. 'BFA/TCH/005').
   * @returns Next integer sequence number.
   */
  private getNextSequence(lastStaffId?: string): number {
    if (!lastStaffId) return 1;
    const parts = lastStaffId.split('/');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    return isNaN(lastNum) ? 1 : lastNum + 1;
  }
}
