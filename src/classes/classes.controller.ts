/**
 * @fileoverview Classes controller exposing REST endpoints for managing classes,
 * teacher assignments, archiving, and student roster queries.
 * @module classes/classes.controller
 */

import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ClassesService } from './classes.service';
import { CreateClassDto, UpdateClassDto, AssignTeacherDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';

/**
 * Controller handling class administration and queries for schools.
 */
@ApiTags('Classes')
@ApiBearerAuth()
@Controller('classes')
export class ClassesController {
  /**
   * Initializes the ClassesController.
   *
   * @param classesService - The classes service handling business logic.
   */
  constructor(private readonly classesService: ClassesService) {}

  /**
   * Lists all active classes for the authenticated user's school.
   *
   * @param user - Authenticated user JWT payload.
   * @returns List of active classes with assigned teacher details and student counts.
   */
  @Get()
  @Roles(Role.ADMIN, Role.RECORD_ADMIN, Role.TEACHER)
  @ApiOperation({
    summary: 'List all active classes',
    description:
      'Retrieves all active classes for the authenticated user’s school, including student counts and assigned class teacher.',
  })
  @ApiResponse({
    status: 200,
    description: 'Classes retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Missing or invalid bearer token.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. User role lacks required permission.',
  })
  getClasses(@CurrentUser() user: JwtPayload) {
    return this.classesService.getClasses(user.schoolId!);
  }

  /**
   * Creates a new class in the school.
   *
   * @param user - Authenticated user JWT payload.
   * @param dto - New class parameters.
   * @returns Newly created class record.
   */
  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Create a new class',
    description:
      'Creates a new class for the school. Optionally assigns an existing teacher and records audit/history logs.',
  })
  @ApiResponse({
    status: 201,
    description: 'Class created successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request. Validation failed.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Missing or invalid bearer token.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Requires ADMIN role.',
  })
  @ApiResponse({
    status: 404,
    description: 'Teacher not found (if classTeacherId provided).',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict. Class name already exists in this school.',
  })
  createClass(@CurrentUser() user: JwtPayload, @Body() dto: CreateClassDto) {
    return this.classesService.createClass(user.schoolId!, user.sub, dto);
  }

  /**
   * Retrieves details of a specific class.
   *
   * @param id - UUID of the class.
   * @param user - Authenticated user JWT payload.
   * @returns Detailed class object.
   */
  @Get(':id')
  @Roles(Role.ADMIN, Role.RECORD_ADMIN, Role.TEACHER)
  @ApiOperation({
    summary: 'Get class details',
    description: 'Retrieves full details of a specific class by its UUID.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the class',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Class details retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Missing or invalid bearer token.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. User role lacks required permission.',
  })
  @ApiResponse({
    status: 404,
    description: 'Class not found or inactive.',
  })
  getClass(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.classesService.getClassById(id, user.schoolId!);
  }

  /**
   * Updates an existing class's name, level, or arm section.
   *
   * @param id - UUID of the class to update.
   * @param user - Authenticated user JWT payload.
   * @param dto - Updated fields.
   * @returns Updated class entity.
   */
  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Update class name, level, or arm section',
    description:
      'Updates basic class attributes. Prevents renaming to an existing active class name in the school.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the class',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Class updated successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request. Validation failed.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Missing or invalid bearer token.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Requires ADMIN role.',
  })
  @ApiResponse({
    status: 404,
    description: 'Class not found.',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict. Name already in use by another active class.',
  })
  updateClass(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateClassDto,
  ) {
    return this.classesService.updateClass(id, user.schoolId!, user.sub, dto);
  }

  /**
   * Assigns or updates the designated teacher for a class.
   *
   * @param id - UUID of the class.
   * @param user - Authenticated user JWT payload.
   * @param dto - Teacher assignment payload.
   * @returns Success status message.
   */
  @Patch(':id/teacher')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Assign or change class teacher',
    description:
      'Assigns or updates the class teacher. Automatically archives previous teacher history and logs the change.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the class',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Class teacher assigned successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request. Validation failed.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Missing or invalid bearer token.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Requires ADMIN role.',
  })
  @ApiResponse({
    status: 404,
    description: 'Class or teacher not found.',
  })
  assignTeacher(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: AssignTeacherDto,
  ) {
    return this.classesService.assignTeacher(id, user.schoolId!, user.sub, dto);
  }

  /**
   * Archives a class (soft delete). Operation is blocked if active students remain enrolled.
   *
   * @param id - UUID of the class to archive.
   * @param user - Authenticated user JWT payload.
   * @returns Success status message.
   */
  @Patch(':id/archive')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Archive a class (soft delete)',
    description:
      'Soft-deletes a class by setting isActive=false. Blocked if active students exist in the class.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the class',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Class archived successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request. Cannot archive class with active students.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Missing or invalid bearer token.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Requires ADMIN role.',
  })
  @ApiResponse({
    status: 404,
    description: 'Class not found.',
  })
  archiveClass(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.classesService.archiveClass(id, user.schoolId!, user.sub);
  }

  /**
   * Lists all active students enrolled in a class.
   *
   * @param id - UUID of the class.
   * @param user - Authenticated user JWT payload.
   * @returns List of active students.
   */
  @Get(':id/students')
  @Roles(Role.ADMIN, Role.RECORD_ADMIN, Role.TEACHER)
  @ApiOperation({
    summary: 'List all ACTIVE students in a class',
    description:
      'Returns the list of all currently active students enrolled in the class.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the class',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Students retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Missing or invalid bearer token.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. User role lacks required permission.',
  })
  @ApiResponse({
    status: 404,
    description: 'Class not found.',
  })
  getStudents(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.classesService.getClassStudents(id, user.schoolId!);
  }
}
