/**
 * @fileoverview Academic sessions controller exposing REST endpoints for session queries,
 * session provisioning, and active academic year activation.
 * @module SessionsController
 * @author Edutrack Engineering Team
 * @created 1.0.0
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
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';

/**
 * Controller managing academic sessions (academic years) for schools.
 * @module SessionsController
 */
@ApiTags('Sessions & Terms')
@ApiBearerAuth()
@Controller('sessions')
export class SessionsController {
  /**
   * Initializes SessionsController with sessions service.
   *
   * @param {SessionsService} sessionsService - Service managing session actions
   */
  constructor(private readonly sessionsService: SessionsService) {}

  /**
   * List all academic sessions for the authenticated user's school.
   *
   * Returns all sessions ordered by creation date descending, including their nested terms.
   *
   * @async
   * @function getSessions
   *
   * @param {JwtPayload} user - Authenticated user JWT payload
   * @returns {Promise<{ data: any[]; message: string }>} List of sessions
   *
   * @throws {UnauthorizedException} Missing or invalid JWT
   * @throws {ForbiddenException} Insufficient role permissions
   *
   * @example
   * // Response (200 OK):
   * {
   *   "data": [
   *     {
   *       "id": "uuid-string",
   *       "name": "2025/2026",
   *       "isActive": true,
   *       "terms": [{ "id": "term-id", "name": "FIRST", "isOpen": true }]
   *     }
   *   ],
   *   "message": "Sessions retrieved"
   * }
   */
  @Get()
  @Roles(Role.ADMIN, Role.RECORD_ADMIN, Role.TEACHER)
  @ApiOperation({
    summary: 'List all sessions for the school',
    description:
      'Retrieves all academic sessions and associated terms for the authenticated user’s school.',
  })
  @ApiResponse({
    status: 200,
    description: 'Academic sessions retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid bearer token credentials.',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions or role restriction violation.',
  })
  getSessions(@CurrentUser() user: JwtPayload) {
    return this.sessionsService.getSessions(user.schoolId!);
  }

  /**
   * Create a new academic session and auto-provision three terms.
   *
   * Creates an academic session record with three closed terms (FIRST, SECOND, THIRD).
   * Enforces sequential YYYY/YYYY format.
   *
   * @async
   * @function createSession
   *
   * @param {JwtPayload} user - Authenticated user JWT payload
   * @param {CreateSessionDto} dto - New session payload
   * @returns {Promise<{ data: any; message: string }>} Created session with terms
   *
   * @throws {BadRequestException} Non-sequential calendar years in session name
   * @throws {ConflictException} Duplicate session name for the school
   *
   * @example
   * // Request Body:
   * {
   *   "name": "2026/2027"
   * }
   *
   * // Response (201 Created):
   * {
   *   "data": {
   *     "id": "uuid-string",
   *     "name": "2026/2027",
   *     "isActive": false,
   *     "terms": [...]
   *   },
   *   "message": "Session 2026/2027 created with 3 terms"
   * }
   */
  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Create a new academic session',
    description:
      'Creates a new academic session with 3 automatically generated terms (FIRST, SECOND, THIRD). Requires sequential years.',
  })
  @ApiResponse({
    status: 201,
    description: 'Session created successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or years are not sequential.',
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
    status: 409,
    description: 'Session with this name already exists in this school.',
  })
  createSession(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSessionDto,
  ) {
    return this.sessionsService.createSession(user.schoolId!, user.sub, dto);
  }

  /**
   * Set a specified academic session as active for the school.
   *
   * Deactivates all existing active sessions for the school and sets the target session to active.
   *
   * @async
   * @function activateSession
   *
   * @param {string} id - UUID of the session to activate
   * @param {JwtPayload} user - Authenticated user JWT payload
   * @returns {Promise<{ message: string }>} Success confirmation message
   *
   * @throws {NotFoundException} Target session ID not found in the school
   *
   * @example
   * // Parameters:
   * // id: "session-uuid"
   *
   * // Response (200 OK):
   * {
   *   "message": "Session 2026/2027 is now active"
   * }
   */
  @Patch(':id/activate')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Set a session as the active session',
    description:
      'Switches the active academic session. Deactivates any other currently active session in the school.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the academic session to activate',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Session activated successfully.',
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
    description: 'Target academic session not found.',
  })
  activateSession(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.sessionsService.activateSession(id, user.schoolId!, user.sub);
  }
}
