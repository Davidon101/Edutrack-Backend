/**
 * @fileoverview Students controller exposing REST endpoints for student creation,
 * profile lookups, class history, status transitions, and student results.
 * @module students/students.controller
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { StudentsService } from './students.service';
import {
  CreateStudentDto,
  UpdateStudentDto,
  UpdateStudentStatusDto,
} from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';

/**
 * Controller providing student management and record retrieval endpoints.
 */
@ApiTags('Students')
@ApiBearerAuth()
@Controller('students')
export class StudentsController {
  /**
   * Initializes the StudentsController.
   *
   * @param studentsService - Service managing student operations.
   */
  constructor(private readonly studentsService: StudentsService) {}

  /**
   * Retrieves the personal profile for the authenticated student.
   *
   * @param user - Authenticated user JWT payload.
   * @returns Detailed profile and current class.
   */
  @Get('me')
  @Roles(Role.STUDENT)
  @ApiOperation({
    summary: 'Student gets own profile',
    description:
      'Retrieves the authenticated student’s profile directly using token context without requiring a UUID parameter.',
  })
  @ApiResponse({
    status: 200,
    description: 'Student profile retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Missing or invalid bearer token.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Requires STUDENT role.',
  })
  @ApiResponse({
    status: 404,
    description: 'Student profile not found.',
  })
  getMyProfile(@CurrentUser() user: JwtPayload) {
    return this.studentsService.getMyProfile(user.sub, user.schoolId!);
  }

  /**
   * Retrieves a list of active students, optionally filtered by class.
   *
   * @param user - Authenticated user JWT payload.
   * @param classId - Optional class UUID filter.
   * @returns Array of student summary records.
   */
  @Get()
  @Roles(Role.ADMIN, Role.RECORD_ADMIN, Role.TEACHER)
  @ApiOperation({
    summary: 'List all students',
    description:
      'Returns all active students in the school. Optionally filterable by class ID. Excludes DEACTIVATED students.',
  })
  @ApiQuery({
    name: 'classId',
    required: false,
    description: 'Optional UUID of class to filter by',
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
  getStudents(
    @CurrentUser() user: JwtPayload,
    @Query('classId') classId?: string,
  ) {
    return this.studentsService.getStudents(user.schoolId!, classId);
  }

  /**
   * Creates and registers a new student.
   *
   * @param user - Authenticated user JWT payload.
   * @param dto - Student creation parameters.
   * @returns Newly enrolled student record and initial temporary password.
   */
  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Create a student',
    description:
      'Creates a student with auto-generated Student ID login credential, administrator-provided Admission Number, and one-time password.',
  })
  @ApiResponse({
    status: 201,
    description: 'Student created successfully.',
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
    description: 'Target class not found in school.',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict. Admission number already exists in this school.',
  })
  createStudent(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateStudentDto,
  ) {
    return this.studentsService.createStudent(user.schoolId!, user.sub, dto);
  }

  /**
   * Retrieves full profile information for a student by UUID.
   *
   * @param id - UUID of the student.
   * @param user - Authenticated user JWT payload.
   * @returns Detailed student record.
   */
  @Get(':id')
  @Roles(Role.ADMIN, Role.RECORD_ADMIN, Role.TEACHER, Role.STUDENT)
  @ApiOperation({
    summary: 'Get student profile by ID',
    description: 'Retrieves complete profile data for a specific student.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the student',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Student profile retrieved successfully.',
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
    description: 'Student not found.',
  })
  getStudent(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.studentsService.getStudentById(id, user.schoolId!);
  }

  /**
   * Updates an existing student's personal details or transfers them to a new class.
   *
   * @param id - UUID of the student to update.
   * @param user - Authenticated user JWT payload.
   * @param dto - Updated student fields.
   * @returns Confirmation message.
   */
  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Update student',
    description:
      'Updates basic student info or triggers a class transfer. Student ID and Admission Number cannot be changed.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the student',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Student updated successfully.',
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
    description: 'Student or target class not found.',
  })
  updateStudent(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.studentsService.updateStudent(
      id,
      user.schoolId!,
      user.sub,
      dto,
    );
  }

  /**
   * Modifies a student's enrollment status (ACTIVE, WITHDRAWN, GRADUATED, DEACTIVATED).
   *
   * @param id - UUID of the student.
   * @param user - Authenticated user JWT payload.
   * @param dto - Status payload.
   * @returns Confirmation message.
   */
  @Patch(':id/status')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Change student status',
    description:
      'Updates student status (ACTIVE, WITHDRAWN, GRADUATED, DEACTIVATED). Does NOT block portal login to view historical records.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the student',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Student status updated successfully.',
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
    description: 'Student not found.',
  })
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateStudentStatusDto,
  ) {
    return this.studentsService.updateStudentStatus(
      id,
      user.schoolId!,
      user.sub,
      dto,
    );
  }

  /**
   * Retrieves class enrollment history for a student.
   *
   * @param id - UUID of the student.
   * @param user - Authenticated user JWT payload.
   * @returns Array of class history entries.
   */
  @Get(':id/history')
  @Roles(Role.ADMIN, Role.RECORD_ADMIN)
  @ApiOperation({
    summary: 'Get student class history',
    description: 'Retrieves chronological record of class enrollments and transfers.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the student',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Student class history retrieved successfully.',
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
    description: 'Student not found.',
  })
  getHistory(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.studentsService.getStudentHistory(id, user.schoolId!);
  }

  /**
   * Retrieves all published assessment results and rankings for a student.
   *
   * @param id - UUID of the student.
   * @param user - Authenticated user JWT payload.
   * @param sessionId - Optional session UUID filter.
   * @param termId - Optional term UUID filter.
   * @returns Published score records, average, and summary.
   */
  @Get(':id/results')
  @Roles(Role.ADMIN, Role.RECORD_ADMIN, Role.STUDENT)
  @ApiOperation({
    summary: 'Get all published results for a student',
    description:
      'Fetches published examination and continuous assessment results, class position, and weighted average for a student.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the student',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiQuery({
    name: 'sessionId',
    required: false,
    description: 'Academic session UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiQuery({
    name: 'termId',
    required: false,
    description: 'Term UUID',
    example: 'b2c3d4e5-f6a7-8901-bcde-fa1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Results retrieved successfully.',
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
    description: 'Student not found.',
  })
  getResults(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Query('sessionId') sessionId?: string,
    @Query('termId') termId?: string,
  ) {
    return this.studentsService.getStudentResults(
      id,
      user.schoolId!,
      sessionId,
      termId,
    );
  }
}
