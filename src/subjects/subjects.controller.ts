/**
 * @fileoverview Subjects controller exposing REST endpoints for managing school subjects,
 * ordering, modifications, and soft-delete archiving.
 * @module subjects/subjects.controller
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
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto, UpdateSubjectDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';

/**
 * Controller managing school-wide subjects.
 */
@ApiTags('Subjects')
@ApiBearerAuth()
@Controller('subjects')
export class SubjectsController {
  /**
   * Initializes the SubjectsController.
   *
   * @param subjectsService - Service managing subject catalog operations.
   */
  constructor(private readonly subjectsService: SubjectsService) {}

  /**
   * Lists all active school-wide subjects ordered by display sequence.
   *
   * @param user - Authenticated user JWT payload.
   * @returns List of active subjects.
   */
  @Get()
  @ApiOperation({
    summary: 'List all active school-wide subjects',
    description:
      'Retrieves all active subjects available across classes in the school, ordered by displayOrder.',
  })
  @ApiResponse({
    status: 200,
    description: 'Subjects retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Missing or invalid bearer token.',
  })
  getSubjects(@CurrentUser() user: JwtPayload) {
    return this.subjectsService.getSubjects(user.schoolId!);
  }

  /**
   * Creates a new subject for the school.
   *
   * @param user - Authenticated user JWT payload.
   * @param dto - Subject creation payload.
   * @returns Newly created subject record.
   */
  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Create a subject',
    description:
      'Creates a subject with displayOrder assigned sequentially based on creation order.',
  })
  @ApiResponse({
    status: 201,
    description: 'Subject created successfully.',
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
    status: 409,
    description: 'Conflict. Subject name already exists in this school.',
  })
  createSubject(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSubjectDto,
  ) {
    return this.subjectsService.createSubject(user.schoolId!, user.sub, dto);
  }

  /**
   * Updates an existing subject's name or abbreviation code.
   *
   * @param id - UUID of the subject.
   * @param user - Authenticated user JWT payload.
   * @param dto - Updated subject fields.
   * @returns Updated subject record.
   */
  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Update subject name or code',
    description: 'Updates subject name or code. Checks for duplicate names within school.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the subject',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Subject updated successfully.',
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
    description: 'Subject not found.',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict. Subject name already exists in this school.',
  })
  updateSubject(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateSubjectDto,
  ) {
    return this.subjectsService.updateSubject(
      id,
      user.schoolId!,
      user.sub,
      dto,
    );
  }

  /**
   * Archives a subject by marking it inactive (soft delete).
   *
   * @param id - UUID of the subject.
   * @param user - Authenticated user JWT payload.
   * @returns Confirmation message.
   */
  @Patch(':id/archive')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Archive subject (soft delete)',
    description:
      'Soft-deletes subject. Preserves historical student assessment grades and transcripts.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the subject',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Subject archived successfully.',
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
    description: 'Subject not found.',
  })
  archiveSubject(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.subjectsService.archiveSubject(id, user.schoolId!, user.sub);
  }
}
