/**
 * @fileoverview Grading controller exposing REST endpoints for managing school grading scales,
 * modifying score thresholds, and resetting to Nigerian WAEC default scale.
 * @module GradingController
 * @author Edutrack Engineering Team
 * @created 1.0.0
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { GradingService } from './grading.service';
import { CreateGradeDto, UpdateGradeDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';

/**
 * Controller managing school grading scale setup and grade threshold maintenance.
 * @module GradingController
 */
@ApiTags('Grading')
@ApiBearerAuth()
@Controller('grading')
export class GradingController {
  /**
   * Initializes GradingController with grading service.
   *
   * @param {GradingService} gradingService - Service handling grading logic
   */
  constructor(private readonly gradingService: GradingService) {}

  /**
   * Retrieve the active grading scale configured for the school.
   *
   * @async
   * @function getScale
   *
   * @param {JwtPayload} user - Authenticated user JWT payload
   * @returns {Promise<{ data: any[]; message: string }>} Active grading scale list
   *
   * @throws {UnauthorizedException} Missing or invalid bearer token
   *
   * @example
   * // Response (200 OK):
   * {
   *   "data": [
   *     { "id": "uuid-1", "grade": "A1", "minScore": 75, "maxScore": 100, "remark": "Excellent", "order": 1 }
   *   ],
   *   "message": "Grading scale retrieved"
   * }
   */
  @Get()
  @ApiOperation({
    summary: 'Get school grading scale',
    description:
      'Retrieves the list of active grades, score thresholds, and remarks configured for the authenticated user’s school.',
  })
  @ApiResponse({
    status: 200,
    description: 'Grading scale retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid bearer token credentials.',
  })
  getScale(@CurrentUser() user: JwtPayload) {
    return this.gradingService.getScale(user.schoolId!);
  }

  /**
   * Add a new grade entry to the school's grading scale.
   *
   * @async
   * @function addGrade
   *
   * @param {JwtPayload} user - Authenticated user JWT payload
   * @param {CreateGradeDto} dto - New grade entry parameters
   * @returns {Promise<{ data: any; message: string }>} Created grade entry
   *
   * @throws {BadRequestException} Validation failure or minScore > maxScore
   * @throws {UnauthorizedException} Missing or invalid bearer token
   * @throws {ForbiddenException} Requires ADMIN role
   *
   * @example
   * // Request Body:
   * {
   *   "grade": "A1",
   *   "minScore": 75,
   *   "maxScore": 100,
   *   "remark": "Excellent",
   *   "order": 1
   * }
   *
   * // Response (201 Created):
   * {
   *   "data": { "id": "uuid", "grade": "A1", "minScore": 75, "maxScore": 100, "remark": "Excellent", "order": 1 },
   *   "message": "Grade added to scale"
   * }
   */
  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Add a grade entry to the scale',
    description:
      'Creates a new grade rule with min/max scores and qualitative remark for the school.',
  })
  @ApiResponse({
    status: 201,
    description: 'Grade added to scale successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or minScore is greater than maxScore.',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid bearer token credentials.',
  })
  @ApiResponse({
    status: 403,
    description: 'Requires ADMIN role.',
  })
  addGrade(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateGradeDto,
  ) {
    return this.gradingService.addGrade(user.schoolId!, user.sub, dto);
  }

  /**
   * Update an existing grade entry in the grading scale.
   *
   * @async
   * @function updateGrade
   *
   * @param {string} id - UUID of the grade to update
   * @param {JwtPayload} user - Authenticated user JWT payload
   * @param {UpdateGradeDto} dto - Updated grade parameters
   * @returns {Promise<{ data: any; message: string }>} Updated grade record
   *
   * @throws {BadRequestException} Validation failure
   * @throws {UnauthorizedException} Missing or invalid bearer token
   * @throws {ForbiddenException} Requires ADMIN role
   * @throws {NotFoundException} Target grade not found
   *
   * @example
   * // Parameters:
   * // id: "grade-uuid"
   *
   * // Request Body:
   * { "remark": "Distinction" }
   *
   * // Response (200 OK):
   * {
   *   "data": { "id": "grade-uuid", "grade": "A1", "remark": "Distinction" },
   *   "message": "Grade updated"
   * }
   */
  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Update a grade entry',
    description:
      'Modifies score boundaries, remarks, or ordering for an existing grade rule.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the grade to update',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Grade updated successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or malformed request syntax.',
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
    description: 'Target grade entry not found.',
  })
  updateGrade(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateGradeDto,
  ) {
    return this.gradingService.updateGrade(
      id,
      user.schoolId!,
      user.sub,
      dto,
    );
  }

  /**
   * Remove a grade entry from the school's scale.
   *
   * @async
   * @function deleteGrade
   *
   * @param {string} id - UUID of the grade entry to remove
   * @param {JwtPayload} user - Authenticated user JWT payload
   * @returns {Promise<{ message: string }>} Confirmation message
   *
   * @throws {UnauthorizedException} Missing or invalid bearer token
   * @throws {ForbiddenException} Requires ADMIN role
   * @throws {NotFoundException} Target grade not found
   *
   * @example
   * // Parameters:
   * // id: "grade-uuid"
   *
   * // Response (200 OK):
   * {
   *   "message": "Grade removed from scale"
   * }
   */
  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Remove a grade entry',
    description: 'Deletes a grade entry from the school’s grading scale.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the grade entry to delete',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Grade removed from scale successfully.',
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
    description: 'Target grade entry not found.',
  })
  deleteGrade(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.gradingService.deleteGrade(id, user.schoolId!, user.sub);
  }

  /**
   * Reset school's grading scale to standard Nigerian WAEC A1–F9 defaults.
   *
   * @async
   * @function resetDefault
   *
   * @param {JwtPayload} user - Authenticated user JWT payload
   * @returns {Promise<{ message: string }>} Confirmation message
   *
   * @throws {UnauthorizedException} Missing or invalid bearer token
   * @throws {ForbiddenException} Requires ADMIN role
   *
   * @example
   * // Response (201 Created):
   * {
   *   "message": "Grading scale reset to Nigerian A1–F9 default"
   * }
   */
  @Post('reset-default')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Reset to Nigerian A1–F9 default grading scale',
    description:
      'Replaces the entire grading scale for the school with standard Nigerian WAEC A1–F9 thresholds.',
  })
  @ApiResponse({
    status: 201,
    description: 'Grading scale reset successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid bearer token credentials.',
  })
  @ApiResponse({
    status: 403,
    description: 'Requires ADMIN role.',
  })
  resetDefault(@CurrentUser() user: JwtPayload) {
    return this.gradingService.resetToDefault(user.schoolId!, user.sub);
  }
}
