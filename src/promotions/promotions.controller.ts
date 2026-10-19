/**
 * @fileoverview Promotions controller exposing REST endpoints for querying eligible classes,
 * executing single and batch student promotions, and retrieving promotion history.
 * @module PromotionsController
 * @author Edutrack Engineering Team
 * @created 1.0.0
 */

import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PromotionsService } from './promotions.service';
import { BulkPromoteDto, SinglePromoteDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';

/**
 * Controller managing student promotion operations and promotion audit history.
 * @module PromotionsController
 */
@ApiTags('Promotions')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('promotions')
export class PromotionsController {
  /**
   * Initializes PromotionsController with promotions service.
   *
   * @param {PromotionsService} promotionsService - Service handling promotion actions
   */
  constructor(private readonly promotionsService: PromotionsService) {}

  /**
   * List all active classes with enrolled student counts for promotion planning.
   *
   * @async
   * @function getClasses
   *
   * @param {JwtPayload} user - Authenticated user JWT payload
   * @returns {Promise<{ data: any[]; message: string }>} List of eligible classes
   *
   * @throws {UnauthorizedException} Missing or invalid bearer token
   * @throws {ForbiddenException} Requires ADMIN role
   *
   * @example
   * // Response (200 OK):
   * {
   *   "data": [
   *     {
   *       "id": "uuid-class",
   *       "name": "Primary 4 Gold",
   *       "level": "PRIMARY 4",
   *       "activeStudents": 24,
   *       "classTeacher": { "id": "uuid-teacher", "fullName": "Mr. John Adeyemi" }
   *     }
   *   ],
   *   "message": "Classes retrieved"
   * }
   */
  @Get('classes')
  @ApiOperation({
    summary: 'List all active classes with student counts',
    description:
      'Retrieves all active classes in the school with their active student count and assigned class teacher for promotion wizard workflows.',
  })
  @ApiResponse({
    status: 200,
    description: 'Eligible classes retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid bearer token credentials.',
  })
  @ApiResponse({
    status: 403,
    description: 'Requires ADMIN role.',
  })
  getClasses(@CurrentUser() user: JwtPayload) {
    return this.promotionsService.getEligibleClasses(user.schoolId!);
  }

  /**
   * Execute bulk promotion, repetition, graduation, or withdrawal across students.
   *
   * Processes an array of promotion decisions in a single transaction, archiving previous
   * class history and creating new class enrollments.
   *
   * @async
   * @function bulkPromote
   *
   * @param {JwtPayload} user - Authenticated user JWT payload
   * @param {BulkPromoteDto} dto - Bulk promotion payload
   * @returns {Promise<{ data: any; message: string }>} Summary metrics of the promotion batch
   *
   * @throws {BadRequestException} Validation failed or source and destination sessions match
   * @throws {UnauthorizedException} Missing or invalid bearer token
   * @throws {ForbiddenException} Requires ADMIN role
   * @throws {NotFoundException} Source or target session not found
   *
   * @example
   * // Request Body:
   * {
   *   "fromSessionId": "source-session-uuid",
   *   "toSessionId": "destination-session-uuid",
   *   "promotions": [
   *     {
   *       "studentId": "student-uuid",
   *       "action": "PROMOTE",
   *       "toClassId": "class-uuid"
   *     }
   *   ]
   * }
   *
   * // Response (201 Created):
   * {
   *   "data": { "processed": 1, "failed": 0, "total": 1, "errors": [] },
   *   "message": "Promotion complete. 1 students processed."
   * }
   */
  @Post('bulk')
  @ApiOperation({
    summary: 'Bulk promote/repeat/graduate/withdraw students',
    description:
      'Executes multiple student promotion actions in batch across academic sessions. Updates student class history for every record.',
  })
  @ApiResponse({
    status: 201,
    description: 'Batch promotion executed successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or source and destination sessions are identical.',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid bearer token credentials.',
  })
  @ApiResponse({
    status: 403,
    description: 'Requires ADMIN role.',
  })
  @ApiResponse({
    status: 404,
    description: 'Source or target academic session not found.',
  })
  bulkPromote(
    @CurrentUser() user: JwtPayload,
    @Body() dto: BulkPromoteDto,
  ) {
    return this.promotionsService.bulkPromote(
      user.schoolId!,
      user.sub,
      dto,
    );
  }

  /**
   * Promote, repeat, graduate, or withdraw an individual student.
   *
   * @async
   * @function promoteStudent
   *
   * @param {string} id - UUID of the student to promote
   * @param {JwtPayload} user - Authenticated user JWT payload
   * @param {SinglePromoteDto} dto - Single promotion action payload
   * @returns {Promise<{ message: string }>} Confirmation message
   *
   * @throws {BadRequestException} Missing toClassId for PROMOTE or REPEAT
   * @throws {UnauthorizedException} Missing or invalid bearer token
   * @throws {ForbiddenException} Requires ADMIN role
   * @throws {NotFoundException} Student, session, or target class not found
   *
   * @example
   * // Parameters:
   * // id: "student-uuid"
   *
   * // Request Body:
   * {
   *   "action": "PROMOTE",
   *   "sessionId": "session-uuid",
   *   "toClassId": "class-uuid"
   * }
   *
   * // Response (201 Created):
   * {
   *   "message": "Student promoted successfully"
   * }
   */
  @Post('student/:id')
  @ApiOperation({
    summary: 'Promote/repeat/graduate/withdraw a single student',
    description:
      'Performs a status transition or class promotion for a specific student.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the student to promote',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 201,
    description: 'Student action completed successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or missing toClassId for PROMOTE/REPEAT.',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid bearer token credentials.',
  })
  @ApiResponse({
    status: 403,
    description: 'Requires ADMIN role.',
  })
  @ApiResponse({
    status: 404,
    description: 'Target student, session, or destination class not found.',
  })
  promoteStudent(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SinglePromoteDto,
  ) {
    return this.promotionsService.promoteStudent(
      id,
      user.schoolId!,
      user.sub,
      dto,
    );
  }

  /**
   * Retrieve complete promotion history records for a student.
   *
   * @async
   * @function getHistory
   *
   * @param {string} studentId - UUID of the student
   * @param {JwtPayload} user - Authenticated user JWT payload
   * @returns {Promise<{ data: any[]; message: string }>} List of promotion records
   *
   * @throws {UnauthorizedException} Missing or invalid bearer token
   * @throws {ForbiddenException} Requires ADMIN or RECORD_ADMIN role
   * @throws {NotFoundException} Student not found
   *
   * @example
   * // Parameters:
   * // studentId: "student-uuid"
   *
   * // Response (200 OK):
   * {
   *   "data": [
   *     {
   *       "id": "promotion-uuid",
   *       "action": "PROMOTE",
   *       "session": { "name": "2025/2026" },
   *       "fromClass": { "name": "Primary 4 Gold" },
   *       "toClass": { "name": "Primary 5 Gold" }
   *     }
   *   ],
   *   "message": "Promotion history retrieved"
   * }
   */
  @Get('history/:studentId')
  @Roles(Role.ADMIN, Role.RECORD_ADMIN)
  @ApiOperation({
    summary: 'Get full promotion history for a student',
    description:
      'Retrieves historical records of all promotions, class transfers, repetitions, and status changes for a student.',
  })
  @ApiParam({
    name: 'studentId',
    description: 'UUID of the student',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Promotion history retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid bearer token credentials.',
  })
  @ApiResponse({
    status: 403,
    description: 'Requires ADMIN or RECORD_ADMIN role.',
  })
  @ApiResponse({
    status: 404,
    description: 'Target student not found.',
  })
  getHistory(
    @Param('studentId') studentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.promotionsService.getPromotionHistory(
      studentId,
      user.schoolId!,
    );
  }
}
