/**
 * @fileoverview Schools controller exposing REST endpoints for managing school profiles,
 * academic assessment configurations, Super Admin platform directories, and public school lookup.
 * @module schools/schools.controller
 */

import { Controller, Get, Patch, Body, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { SchoolsService } from './schools.service';
import { UpdateSchoolDto, UpdateSchoolSettingsDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

/**
 * Controller providing school profile management and administration endpoints.
 */
@ApiTags('Schools')
@Controller('schools')
export class SchoolsController {
  /**
   * Initializes the SchoolsController.
   *
   * @param schoolsService - Service handling school operations.
   */
  constructor(private readonly schoolsService: SchoolsService) {}

  /**
   * Public directory of active schools used by the client application on login screen.
   *
   * @param search - Optional name search filter.
   * @returns Lightweight list of active schools.
   */
  @Public()
  @Get('public')
  @ApiOperation({
    summary: 'Public school list for login screen',
    description:
      'Provides a publicly accessible list of active schools with optional search filtering, used by mobile/web clients during school selection.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Case-insensitive filter matching school name',
    example: 'Academy',
  })
  @ApiResponse({
    status: 200,
    description: 'Schools retrieved successfully.',
  })
  getPublicList(@Query('search') search?: string) {
    return this.schoolsService.getPublicSchoolList(search);
  }

  /**
   * Retrieves profile details of the authenticated user's own school.
   *
   * @param user - Authenticated user JWT payload.
   * @returns School profile details.
   */
  @ApiBearerAuth()
  @Get('me')
  @Roles(Role.ADMIN, Role.RECORD_ADMIN)
  @ApiOperation({
    summary: 'Get own school profile',
    description:
      'Retrieves the profile information of the school associated with the authenticated admin.',
  })
  @ApiResponse({
    status: 200,
    description: 'School profile retrieved successfully.',
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
    description: 'School not found.',
  })
  getMySchool(@CurrentUser() user: JwtPayload) {
    return this.schoolsService.getMySchool(user.schoolId!);
  }

  /**
   * Updates basic information (name, address, phone) of the caller's school.
   *
   * @param user - Authenticated user JWT payload.
   * @param dto - School profile update fields.
   * @returns Updated school profile.
   */
  @ApiBearerAuth()
  @Patch('me')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Update school profile',
    description:
      'Updates basic metadata for the authenticated user’s school, including name, address, and phone number.',
  })
  @ApiResponse({
    status: 200,
    description: 'School updated successfully.',
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
    description: 'School not found.',
  })
  updateMySchool(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateSchoolDto,
  ) {
    return this.schoolsService.updateMySchool(user.schoolId!, user.sub, dto);
  }

  /**
   * Retrieves academic assessment weights and ID prefix settings for the caller's school.
   *
   * @param user - Authenticated user JWT payload.
   * @returns School settings configuration.
   */
  @ApiBearerAuth()
  @Get('me/settings')
  @Roles(Role.ADMIN, Role.RECORD_ADMIN)
  @ApiOperation({
    summary: 'Get school settings',
    description:
      'Fetches continuous assessment limits (ca1-ca4), exam max score, and staff/student ID prefixes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Settings retrieved successfully.',
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
    description: 'School settings not found.',
  })
  getSettings(@CurrentUser() user: JwtPayload) {
    return this.schoolsService.getSettings(user.schoolId!);
  }

  /**
   * Updates assessment maximum scores and ID generation prefixes for the school.
   *
   * @param user - Authenticated user JWT payload.
   * @param dto - Updated settings parameters.
   * @returns Updated school settings.
   */
  @ApiBearerAuth()
  @Patch('me/settings')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Update school settings',
    description:
      'Modifies continuous assessment scoring limits and ID prefix templates for staff and students.',
  })
  @ApiResponse({
    status: 200,
    description: 'Settings updated successfully.',
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
    description: 'School settings not found.',
  })
  updateSettings(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateSchoolSettingsDto,
  ) {
    return this.schoolsService.updateSettings(user.schoolId!, user.sub, dto);
  }

  /**
   * Lists all schools across the platform with pagination (Super Admin only).
   *
   * @param page - Page number.
   * @param limit - Page size limit.
   * @returns Paginated list of registered schools.
   */
  @ApiBearerAuth()
  @Get()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'List all schools on platform (Super Admin only)',
    description:
      'Retrieves a paginated list of all schools across the multi-tenant system.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    example: 1,
    description: 'Page number (default 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 20,
    description: 'Page size limit (default 20)',
  })
  @ApiResponse({
    status: 200,
    description: 'Schools retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Missing or invalid bearer token.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Requires SUPER_ADMIN role.',
  })
  getAllSchools(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.schoolsService.getAllSchools(+page, +limit);
  }

  /**
   * Suspends a school by marking it inactive (Super Admin only).
   *
   * @param id - UUID of the school to suspend.
   * @param user - Authenticated user JWT payload.
   * @returns Success status message.
   */
  @ApiBearerAuth()
  @Patch(':id/suspend')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Suspend a school (Super Admin only)',
    description:
      'Deactivates a school tenant account, revoking access for all its affiliated users.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the school to suspend',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'School suspended successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Missing or invalid bearer token.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Requires SUPER_ADMIN role.',
  })
  @ApiResponse({
    status: 404,
    description: 'School not found.',
  })
  suspend(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.schoolsService.suspendSchool(id, user.sub);
  }

  /**
   * Reactivates a suspended school (Super Admin only).
   *
   * @param id - UUID of the school to activate.
   * @param user - Authenticated user JWT payload.
   * @returns Success status message.
   */
  @ApiBearerAuth()
  @Patch(':id/activate')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Reactivate a school (Super Admin only)',
    description:
      'Reactivates a previously suspended school tenant account, restoring access for its users.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the school to reactivate',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'School activated successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Missing or invalid bearer token.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Requires SUPER_ADMIN role.',
  })
  @ApiResponse({
    status: 404,
    description: 'School not found.',
  })
  activate(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.schoolsService.activateSchool(id, user.sub);
  }
}
