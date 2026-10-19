/**
 * @fileoverview Teachers controller exposing endpoints for managing teacher accounts,
 * profiles, activations, deactivations, and class assignment history.
 * @module teachers/teachers.controller
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
import { TeachersService } from './teachers.service';
import { CreateTeacherDto, UpdateTeacherDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';

/**
 * Controller handling teacher administrative actions and queries.
 */
@ApiTags('Teachers')
@ApiBearerAuth()
@Controller('teachers')
export class TeachersController {
  /**
   * Initializes the TeachersController.
   *
   * @param teachersService - Service managing teacher operations.
   */
  constructor(private readonly teachersService: TeachersService) {}

  /**
   * Retrieves all teachers in the caller's school.
   *
   * @param user - Authenticated user JWT payload.
   * @returns Array of teacher profiles with current class assignments.
   */
  @Get()
  @Roles(Role.ADMIN, Role.RECORD_ADMIN)
  @ApiOperation({
    summary: 'List all teachers in the school',
    description:
      'Retrieves all teacher records with user profile info, contact details, and assigned active class.',
  })
  @ApiResponse({
    status: 200,
    description: 'Teachers retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Missing or invalid bearer token.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Requires ADMIN or RECORD_ADMIN role.',
  })
  getTeachers(@CurrentUser() user: JwtPayload) {
    return this.teachersService.getTeachers(user.schoolId!);
  }

  /**
   * Creates a new teacher record with auto-generated Staff ID and user account.
   *
   * @param user - Authenticated user JWT payload.
   * @param dto - Teacher creation payload.
   * @returns Newly created teacher profile and one-time password.
   */
  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Create a teacher',
    description:
      'Creates teacher record with auto-generated Staff ID (e.g. BFA/TCH/001), user account, and temporary password.',
  })
  @ApiResponse({
    status: 201,
    description: 'Teacher created successfully.',
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
  createTeacher(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTeacherDto,
  ) {
    return this.teachersService.createTeacher(user.schoolId!, user.sub, dto);
  }

  /**
   * Retrieves full details for a teacher by UUID.
   *
   * @param id - UUID of the teacher.
   * @param user - Authenticated user JWT payload.
   * @returns Teacher profile.
   */
  @Get(':id')
  @Roles(Role.ADMIN, Role.RECORD_ADMIN)
  @ApiOperation({
    summary: 'Get teacher profile',
    description: 'Retrieves complete profile details for a specific teacher.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the teacher',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Teacher profile retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Missing or invalid bearer token.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Requires ADMIN or RECORD_ADMIN role.',
  })
  @ApiResponse({
    status: 404,
    description: 'Teacher not found.',
  })
  getTeacher(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.teachersService.getTeacherById(id, user.schoolId!);
  }

  /**
   * Updates an existing teacher's profile. Staff ID cannot be updated.
   *
   * @param id - UUID of the teacher.
   * @param user - Authenticated user JWT payload.
   * @param dto - Updated fields.
   * @returns Confirmation message.
   */
  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Update teacher info',
    description:
      'Updates basic teacher info or qualifications. Staff ID is read-only and immutable.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the teacher',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Teacher updated successfully.',
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
    description: 'Teacher not found.',
  })
  updateTeacher(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateTeacherDto,
  ) {
    return this.teachersService.updateTeacher(
      id,
      user.schoolId!,
      user.sub,
      dto,
    );
  }

  /**
   * Deactivates a teacher account and disables their portal login.
   *
   * @param id - UUID of the teacher.
   * @param user - Authenticated user JWT payload.
   * @returns Confirmation message.
   */
  @Patch(':id/deactivate')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Deactivate teacher',
    description: 'Deactivates teacher and their underlying user login account.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the teacher',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Teacher deactivated successfully.',
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
    description: 'Teacher not found.',
  })
  deactivate(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.teachersService.deactivateTeacher(
      id,
      user.schoolId!,
      user.sub,
    );
  }

  /**
   * Reactivates a deactivated teacher and restores login access.
   *
   * @param id - UUID of the teacher.
   * @param user - Authenticated user JWT payload.
   * @returns Confirmation message.
   */
  @Patch(':id/reactivate')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Reactivate teacher',
    description: 'Reactivates teacher and restores user login credentials.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the teacher',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Teacher reactivated successfully.',
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
    description: 'Teacher not found.',
  })
  reactivate(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.teachersService.reactivateTeacher(
      id,
      user.schoolId!,
      user.sub,
    );
  }

  /**
   * Retrieves class assignment history for a teacher.
   *
   * @param id - UUID of the teacher.
   * @param user - Authenticated user JWT payload.
   * @returns Array of assignment history events.
   */
  @Get(':id/history')
  @Roles(Role.ADMIN, Role.RECORD_ADMIN)
  @ApiOperation({
    summary: 'Get teacher class assignment history',
    description: 'Retrieves historical records of classes assigned to this teacher.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the teacher',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Teacher assignment history retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Missing or invalid bearer token.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Requires ADMIN or RECORD_ADMIN role.',
  })
  @ApiResponse({
    status: 404,
    description: 'Teacher not found.',
  })
  getHistory(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.teachersService.getTeacherHistory(id, user.schoolId!);
  }
}
