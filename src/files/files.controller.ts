/**
 * @fileoverview Files controller exposing REST endpoints for inspecting past bulk imports
 * and downloading error logs for partial/failed CSV ingestions.
 * @module FilesController
 * @author Edutrack Engineering Team
 * @created 1.0.0
 */

import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiProduces,
} from '@nestjs/swagger';
import { Response } from 'express';
import { Role } from '@prisma/client';
import { FilesService } from './files.service';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';

/**
 * Controller managing file import auditing and error report downloads.
 * @module FilesController
 */
@ApiTags('Files')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.RECORD_ADMIN)
@Controller('files')
export class FilesController {
  /**
   * Initializes FilesController with files service.
   *
   * @param {FilesService} filesService - Service managing file queries and download paths
   */
  constructor(private readonly filesService: FilesService) {}

  /**
   * List all past CSV bulk import operations and their execution results.
   *
   * @async
   * @function getImports
   *
   * @param {JwtPayload} user - Authenticated user JWT payload
   * @param {number} [page=1] - Page number
   * @param {number} [limit=20] - Number of records per page
   * @returns {Promise<{ data: any[]; meta: any; message: string }>} Paginated import records
   *
   * @throws {UnauthorizedException} Missing or invalid bearer token credentials
   * @throws {ForbiddenException} Requires ADMIN or RECORD_ADMIN role
   *
   * @example
   * // Query Parameters:
   * // ?page=1&limit=20
   *
   * // Response (200 OK):
   * {
   *   "data": [
   *     {
   *       "id": "file-uuid",
   *       "fileName": "students.csv",
   *       "fileType": "STUDENT_IMPORT",
   *       "status": "COMPLETED",
   *       "totalRows": 50,
   *       "successRows": 50,
   *       "failedRows": 0,
   *       "uploader": { "fullName": "Admin User" }
   *     }
   *   ],
   *   "meta": { "total": 1, "page": 1, "limit": 20, "pages": 1 },
   *   "message": "Import history retrieved"
   * }
   */
  @Get('imports')
  @ApiOperation({
    summary: 'List all past CSV imports with results',
    description:
      'Retrieves a paginated list of all teacher and student bulk CSV imports, including total, success, and error row counts.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    example: 1,
    description: 'Page number (defaults to 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 20,
    description: 'Number of records per page (default 20, max 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'Import history retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid bearer token credentials.',
  })
  @ApiResponse({
    status: 403,
    description: 'Requires ADMIN or RECORD_ADMIN role.',
  })
  getImports(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.filesService.getImports(user.schoolId!, +page, +limit);
  }

  /**
   * Download the CSV error report for a specific partial or failed bulk import.
   *
   * @async
   * @function downloadErrors
   *
   * @param {string} id - UUID of the file import record
   * @param {JwtPayload} user - Authenticated user JWT payload
   * @param {Response} res - Express response object streaming the CSV attachment
   *
   * @throws {UnauthorizedException} Missing or invalid bearer token credentials
   * @throws {ForbiddenException} Requires ADMIN role
   * @throws {NotFoundException} Import record not found or no error report available
   *
   * @example
   * // Parameters:
   * // id: "file-uuid"
   *
   * // Response: Downloaded file "import-errors.csv"
   */
  @Get('imports/:id/errors')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Download error report CSV for a failed/partial import',
    description:
      'Streams a downloadable CSV file containing row-by-row error reasons generated during a previous student or teacher bulk import.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the file import record',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiProduces('text/csv')
  @ApiResponse({
    status: 200,
    description: 'Error report CSV streamed successfully.',
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
    description: 'Import record not found or no error report file exists.',
  })
  async downloadErrors(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const filePath = await this.filesService.getErrorReport(
      id,
      user.schoolId!,
    );
    res.download(filePath, 'import-errors.csv');
  }
}
