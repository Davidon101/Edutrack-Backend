/**
 * @fileoverview Terms controller exposing REST endpoints for querying active academic terms
 * and toggling term open/closed states.
 * @module TermsController
 * @author Edutrack Engineering Team
 * @created 1.0.0
 */

import { Controller, Get, Patch, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { SessionsService } from './sessions.service';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';

/**
 * Controller managing academic terms and entry windows.
 * @module TermsController
 */
@ApiTags('Sessions & Terms')
@ApiBearerAuth()
@Controller('terms')
export class TermsController {
  /**
   * Initializes TermsController with sessions service.
   *
   * @param {SessionsService} sessionsService - Service managing term operations
   */
  constructor(private readonly sessionsService: SessionsService) {}

  /**
   * List terms belonging to the school's active session.
   *
   * @async
   * @function getTerms
   *
   * @param {JwtPayload} user - Authenticated user JWT payload
   * @returns {Promise<{ data: any[]; message: string }>} Terms list
   *
   * @throws {NotFoundException} When no active session exists for the school
   *
   * @example
   * // Response (200 OK):
   * {
   *   "data": [
   *     { "id": "uuid-1", "name": "FIRST", "isOpen": true },
   *     { "id": "uuid-2", "name": "SECOND", "isOpen": false }
   *   ],
   *   "message": "Terms retrieved"
   * }
   */
  @Get()
  @Roles(Role.ADMIN, Role.RECORD_ADMIN, Role.TEACHER)
  @ApiOperation({
    summary: 'List terms for the active session',
    description:
      'Retrieves all terms associated with the currently active academic session.',
  })
  @ApiResponse({
    status: 200,
    description: 'Terms retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid bearer token credentials.',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions or role restriction violation.',
  })
  @ApiResponse({
    status: 404,
    description: 'No active session found for this school.',
  })
  getTerms(@CurrentUser() user: JwtPayload) {
    return this.sessionsService.getTerms(user.schoolId!);
  }

  /**
   * Open an academic term for result submission.
   *
   * Closes all other terms in the active session and marks this term as open.
   *
   * @async
   * @function openTerm
   *
   * @param {string} id - UUID of the term to open
   * @param {JwtPayload} user - Authenticated user JWT payload
   * @returns {Promise<{ message: string }>} Confirmation message
   *
   * @throws {NotFoundException} Target term not found
   * @throws {BadRequestException} Attempted to open term in an inactive session
   *
   * @example
   * // Parameters:
   * // id: "term-uuid"
   *
   * // Response (200 OK):
   * {
   *   "message": "FIRST term is now open for result submission"
   * }
   */
  @Patch(':id/open')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Open a term',
    description:
      'Opens a term to enable result entries. Automatically closes all other terms within the session.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the term to open',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Term opened successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request. Can only open terms belonging to the active session.',
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
    description: 'Term not found.',
  })
  openTerm(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.sessionsService.openTerm(id, user.schoolId!, user.sub);
  }

  /**
   * Close an academic term to block further result submissions.
   *
   * @async
   * @function closeTerm
   *
   * @param {string} id - UUID of the term to close
   * @param {JwtPayload} user - Authenticated user JWT payload
   * @returns {Promise<{ message: string }>} Confirmation message
   *
   * @throws {NotFoundException} Target term not found
   *
   * @example
   * // Parameters:
   * // id: "term-uuid"
   *
   * // Response (200 OK):
   * {
   *   "message": "FIRST term is now closed"
   * }
   */
  @Patch(':id/close')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Close a term',
    description:
      'Closes a term, locking score entries and modifications for that term.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the term to close',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Term closed successfully.',
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
    description: 'Term not found.',
  })
  closeTerm(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.sessionsService.closeTerm(id, user.schoolId!, user.sub);
  }
}
