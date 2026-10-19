/**
 * @fileoverview Audit controller exposing read-only REST endpoints for querying
 * system change tracking records, security actions, and mutation logs.
 * @module AuditController
 * @author Edutrack Engineering Team
 * @created 1.0.0
 */

import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuditService } from './audit.service';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';

/**
 * Controller providing read-only inspection access to school audit trail records.
 * @module AuditController
 */
@ApiTags('Audit')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.RECORD_ADMIN, Role.SUPER_ADMIN)
@Controller('audit')
export class AuditController {
  /**
   * Initializes AuditController with audit service.
   *
   * @param {AuditService} auditService - Service querying audit log records
   */
  constructor(private readonly auditService: AuditService) {}

  /**
   * Query paginated audit log entries for the authenticated user's school.
   *
   * Read-only endpoint supporting filters by entity type, performing user ID,
   * date ranges, and page/limit pagination.
   *
   * @async
   * @function getLogs
   *
   * @param {JwtPayload} user - Authenticated user JWT payload
   * @param {string} [entity] - Optional filter for entity name (e.g. Student, School, Class)
   * @param {string} [userId] - Optional filter for user UUID who triggered the action
   * @param {string} [from] - Optional ISO start timestamp filter
   * @param {string} [to] - Optional ISO end timestamp filter
   * @param {number} [page=1] - Page number
   * @param {number} [limit=20] - Number of items per page (max 100)
   * @returns {Promise<{ data: any[]; meta: any; message: string }>} Paginated audit log records
   *
   * @throws {UnauthorizedException} Missing or invalid bearer token credentials
   * @throws {ForbiddenException} Requires ADMIN, RECORD_ADMIN, or SUPER_ADMIN role
   *
   * @example
   * // Query Parameters:
   * // ?entity=Student&page=1&limit=10
   *
   * // Response (200 OK):
   * {
   *   "data": [
   *     {
   *       "id": "audit-uuid",
   *       "action": "CREATE",
   *       "entity": "Student",
   *       "entityId": "student-uuid",
   *       "createdAt": "2026-10-19T12:00:00.000Z",
   *       "user": { "fullName": "Admin User", "role": "ADMIN" }
   *     }
   *   ],
   *   "meta": { "total": 1, "page": 1, "limit": 10, "pages": 1 },
   *   "message": "Audit logs retrieved"
   * }
   */
  @Get()
  @ApiOperation({
    summary: 'Query audit logs (Read-only)',
    description:
      'Retrieves paginated audit log events filtered by entity name, user ID, or date ranges for compliance and forensic tracking.',
  })
  @ApiQuery({
    name: 'entity',
    required: false,
    description: 'Filter by entity name (e.g. Student, Class, School, Term)',
    example: 'Student',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Filter by user UUID who performed the action',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Filter logs on or after this ISO date (e.g. 2026-01-01)',
    example: '2026-01-01',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'Filter logs on or before this ISO date (e.g. 2026-12-31)',
    example: '2026-12-31',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page index (defaults to 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of records per page (default 20, max 100)',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Audit logs retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid bearer token credentials.',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions. Requires ADMIN, RECORD_ADMIN, or SUPER_ADMIN.',
  })
  getLogs(
    @CurrentUser() user: JwtPayload,
    @Query('entity') entity?: string,
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.getLogs(user.schoolId!, {
      entity,
      userId,
      from,
      to,
      page,
      limit,
    });
  }
}
