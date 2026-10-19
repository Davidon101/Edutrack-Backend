/**
 * @fileoverview Classes service providing business logic for school class management,
 * teacher assignments, class history tracking, archiving, and student queries.
 * @module classes/classes.service
 */

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassDto, UpdateClassDto, AssignTeacherDto } from './dto';

/**
 * Service managing class operations such as creation, updates, teacher assignment,
 * roster retrieval, and archiving within a school context.
 */
@Injectable()
export class ClassesService {
  /**
   * Initializes the ClassesService.
   *
   * @param prisma - Prisma database client service.
   */
  constructor(private prisma: PrismaService) {}

  /**
   * Retrieves all active classes belonging to a specific school.
   *
   * Includes assigned class teacher information and active student count.
   *
   * @param schoolId - UUID of the school.
   * @returns Object containing list of formatted classes and success message.
   *
   * @example
   * ```ts
   * const result = await classesService.getClasses('school-uuid');
   * ```
   */
  async getClasses(schoolId: string) {
    const classes = await this.prisma.class.findMany({
      where: { schoolId, isActive: true },
      orderBy: { name: 'asc' },
      include: {
        classTeacher: {
          include: { user: { select: { fullName: true } } },
          select: { id: true, staffId: true, user: true },
        },
        _count: { select: { students: { where: { status: 'ACTIVE' } } } },
      },
    });

    const formatted = classes.map((c) => ({
      id: c.id,
      name: c.name,
      level: c.level,
      armSection: c.armSection,
      classTeacher: c.classTeacher
        ? {
            id: c.classTeacher.id,
            staffId: c.classTeacher.staffId,
            fullName: c.classTeacher.user.fullName,
          }
        : null,
      studentCount: c._count.students,
    }));

    return { data: formatted, message: 'Classes retrieved' };
  }

  /**
   * Retrieves details of a specific active class by its ID within a school.
   *
   * @param classId - UUID of the class.
   * @param schoolId - UUID of the school the class belongs to.
   * @returns Object containing class details and success message.
   * @throws {NotFoundException} If the class is not found or is inactive.
   *
   * @example
   * ```ts
   * const result = await classesService.getClassById('class-uuid', 'school-uuid');
   * ```
   */
  async getClassById(classId: string, schoolId: string) {
    const cls = await this.prisma.class.findFirst({
      where: { id: classId, schoolId, isActive: true },
      include: {
        classTeacher: {
          include: { user: { select: { fullName: true, phone: true } } },
        },
        _count: { select: { students: { where: { status: 'ACTIVE' } } } },
      },
    });
    if (!cls) throw new NotFoundException('Class not found');

    return {
      data: {
        id: cls.id,
        name: cls.name,
        level: cls.level,
        armSection: cls.armSection,
        classTeacher: cls.classTeacher
          ? {
              id: cls.classTeacher.id,
              staffId: cls.classTeacher.staffId,
              fullName: cls.classTeacher.user.fullName,
            }
          : null,
        studentCount: cls._count.students,
      },
      message: 'Class retrieved',
    };
  }

  /**
   * Creates a new class in the specified school and records audit log and teacher history.
   *
   * @param schoolId - UUID of the school.
   * @param userId - UUID of the authenticated user performing the creation.
   * @param dto - Class creation payload.
   * @returns Object containing newly created class and success message.
   * @throws {ConflictException} If a class with the same name already exists in the school.
   * @throws {NotFoundException} If the specified class teacher is not found in the school.
   *
   * @example
   * ```ts
   * const result = await classesService.createClass('school-uuid', 'user-uuid', {
   *   name: 'Primary 1 Gold',
   *   level: 'PRIMARY 1',
   * });
   * ```
   */
  async createClass(schoolId: string, userId: string, dto: CreateClassDto) {
    const existing = await this.prisma.class.findFirst({
      where: { schoolId, name: dto.name, isActive: true },
    });
    if (existing)
      throw new ConflictException(`A class named "${dto.name}" already exists`);

    if (dto.classTeacherId) {
      await this.validateTeacher(dto.classTeacherId, schoolId);
    }

    const cls = await this.prisma.$transaction(async (tx) => {
      const newClass = await tx.class.create({
        data: {
          schoolId,
          name: dto.name,
          level: dto.level,
          armSection: dto.armSection,
          classTeacherId: dto.classTeacherId,
        },
      });

      if (dto.classTeacherId) {
        await tx.classTeacherHistory.create({
          data: {
            classId: newClass.id,
            teacherId: dto.classTeacherId,
            changedBy: userId,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          schoolId,
          userId,
          action: 'CREATE',
          entity: 'Class',
          entityId: newClass.id,
          after: dto as any,
        },
      });

      return newClass;
    });

    return { data: cls, message: 'Class created successfully' };
  }

  /**
   * Updates an existing class's attributes and records the change in the audit log.
   *
   * @param classId - UUID of the class to update.
   * @param schoolId - UUID of the school owning the class.
   * @param userId - UUID of the authenticated user performing the update.
   * @param dto - Class update payload.
   * @returns Object containing the updated class entity and success message.
   * @throws {NotFoundException} If the class is not found.
   * @throws {ConflictException} If the new name conflicts with an existing active class.
   *
   * @example
   * ```ts
   * const result = await classesService.updateClass('class-uuid', 'school-uuid', 'user-uuid', {
   *   name: 'Primary 1 Diamond',
   * });
   * ```
   */
  async updateClass(
    classId: string,
    schoolId: string,
    userId: string,
    dto: UpdateClassDto,
  ) {
    const cls = await this.prisma.class.findFirst({
      where: { id: classId, schoolId, isActive: true },
    });
    if (!cls) throw new NotFoundException('Class not found');

    if (dto.name && dto.name !== cls.name) {
      const duplicate = await this.prisma.class.findFirst({
        where: {
          schoolId,
          name: dto.name,
          isActive: true,
          NOT: { id: classId },
        },
      });
      if (duplicate)
        throw new ConflictException(
          `A class named "${dto.name}" already exists`,
        );
    }

    const updated = await this.prisma.class.update({
      where: { id: classId },
      data: { ...dto },
    });

    await this.prisma.auditLog.create({
      data: {
        schoolId,
        userId,
        action: 'UPDATE',
        entity: 'Class',
        entityId: classId,
        before: cls as any,
        after: dto as any,
      },
    });

    return { data: updated, message: 'Class updated successfully' };
  }

  /**
   * Assigns or changes the class teacher, closing previous assignments and logging history.
   *
   * @param classId - UUID of the class.
   * @param schoolId - UUID of the school owning the class.
   * @param userId - UUID of the authenticated user performing the action.
   * @param dto - Payload containing the new teacher's UUID.
   * @returns Object containing success message.
   * @throws {NotFoundException} If the class or teacher is not found.
   *
   * @example
   * ```ts
   * const result = await classesService.assignTeacher('class-uuid', 'school-uuid', 'user-uuid', {
   *   classTeacherId: 'teacher-uuid',
   * });
   * ```
   */
  async assignTeacher(
    classId: string,
    schoolId: string,
    userId: string,
    dto: AssignTeacherDto,
  ) {
    const cls = await this.prisma.class.findFirst({
      where: { id: classId, schoolId, isActive: true },
    });
    if (!cls) throw new NotFoundException('Class not found');

    await this.validateTeacher(dto.classTeacherId, schoolId);

    const activeSession = await this.prisma.academicSession.findFirst({
      where: { schoolId, isActive: true },
    });

    await this.prisma.$transaction(async (tx) => {
      // Close previous class teacher history entry
      if (cls.classTeacherId) {
        await tx.classTeacherHistory.updateMany({
          where: { classId, endDate: null },
          data: { endDate: new Date() },
        });
      }

      await tx.class.update({
        where: { id: classId },
        data: { classTeacherId: dto.classTeacherId },
      });

      await tx.classTeacherHistory.create({
        data: {
          classId,
          teacherId: dto.classTeacherId,
          sessionId: activeSession?.id,
          changedBy: userId,
        },
      });

      await tx.auditLog.create({
        data: {
          schoolId,
          userId,
          action: 'UPDATE',
          entity: 'Class',
          entityId: classId,
          before: { classTeacherId: cls.classTeacherId },
          after: { classTeacherId: dto.classTeacherId },
        },
      });
    });

    return { message: 'Class teacher assigned successfully' };
  }

  /**
   * Archives a class (soft delete). Fails if there are still active students enrolled.
   *
   * @param classId - UUID of the class to archive.
   * @param schoolId - UUID of the school owning the class.
   * @param userId - UUID of the authenticated user performing the archive.
   * @returns Object containing success message.
   * @throws {NotFoundException} If class is not found.
   * @throws {BadRequestException} If active students still exist in the class.
   *
   * @example
   * ```ts
   * const result = await classesService.archiveClass('class-uuid', 'school-uuid', 'user-uuid');
   * ```
   */
  async archiveClass(classId: string, schoolId: string, userId: string) {
    const cls = await this.prisma.class.findFirst({
      where: { id: classId, schoolId, isActive: true },
    });
    if (!cls) throw new NotFoundException('Class not found');

    const activeStudents = await this.prisma.student.count({
      where: { classId, status: 'ACTIVE' },
    });
    if (activeStudents > 0) {
      throw new BadRequestException(
        `Cannot archive class with ${activeStudents} active students. Reassign or promote students first.`,
      );
    }

    await this.prisma.class.update({
      where: { id: classId },
      data: { isActive: false, archivedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        schoolId,
        userId,
        action: 'ARCHIVE',
        entity: 'Class',
        entityId: classId,
      },
    });

    return { message: 'Class archived successfully' };
  }

  /**
   * Lists all active students currently enrolled in the specified class.
   *
   * @param classId - UUID of the class.
   * @param schoolId - UUID of the school owning the class.
   * @returns Object containing list of students and success message.
   * @throws {NotFoundException} If the class is not found.
   *
   * @example
   * ```ts
   * const result = await classesService.getClassStudents('class-uuid', 'school-uuid');
   * ```
   */
  async getClassStudents(classId: string, schoolId: string) {
    const cls = await this.prisma.class.findFirst({
      where: { id: classId, schoolId },
    });
    if (!cls) throw new NotFoundException('Class not found');

    const students = await this.prisma.student.findMany({
      where: { classId, status: 'ACTIVE' },
      orderBy: { fullName: 'asc' },
      select: {
        id: true,
        studentId: true,
        admissionNumber: true,
        fullName: true,
        gender: true,
        dateOfBirth: true,
        status: true,
      },
    });

    return { data: students, message: 'Students retrieved' };
  }

  /**
   * Validates that an active teacher exists in the school.
   *
   * @param teacherId - UUID of the teacher to validate.
   * @param schoolId - UUID of the school.
   * @returns The teacher record if valid.
   * @throws {NotFoundException} If the teacher is not found or inactive.
   *
   * @example
   * ```ts
   * const teacher = await this.validateTeacher('teacher-uuid', 'school-uuid');
   * ```
   */
  private async validateTeacher(teacherId: string, schoolId: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id: teacherId, schoolId, isActive: true },
    });
    if (!teacher)
      throw new NotFoundException('Teacher not found in this school');
    return teacher;
  }
}
