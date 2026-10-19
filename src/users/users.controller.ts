/**
 * @fileoverview Users controller exposing REST endpoints for retrieving personal user profile,
 * updating contact info, and rotating passwords.
 * @module UsersController
 * @author Edutrack Engineering Team
 * @created 1.0.0
 */

import { Controller, Get, Patch, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto, ChangePasswordDto } from './dto';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';

/**
 * Controller providing self-service account management endpoints for all authenticated users.
 * @module UsersController
 */
@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  /**
   * Initializes UsersController with users service.
   *
   * @param {UsersService} usersService - Service handling user profile actions
   */
  constructor(private readonly usersService: UsersService) {}

  /**
   * Retrieve personal profile information for the authenticated user.
   *
   * Works universally across all user roles (SUPER_ADMIN, ADMIN, RECORD_ADMIN, TEACHER, STUDENT).
   *
   * @async
   * @function getMe
   *
   * @param {JwtPayload} user - Authenticated user JWT payload
   * @returns {Promise<{ data: any; message: string }>} Personal profile record
   *
   * @throws {UnauthorizedException} Missing or invalid bearer token credentials
   * @throws {NotFoundException} User record not found
   *
   * @example
   * // Response (200 OK):
   * {
   *   "data": {
   *     "id": "user-uuid",
   *     "fullName": "Amaka Obi",
   *     "email": "amaka@brightfuture.edu.ng",
   *     "phone": "08012345678",
   *     "role": "ADMIN",
   *     "mustChangePassword": false
   *   },
   *   "message": "Profile retrieved"
   * }
   */
  @Get('me')
  @ApiOperation({
    summary: 'Get own profile',
    description:
      'Retrieves the authenticated user’s own profile attributes (works universally across all roles).',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid bearer token credentials.',
  })
  @ApiResponse({
    status: 404,
    description: 'User record not found.',
  })
  getMe(@CurrentUser() user: JwtPayload) {
    return this.usersService.getMe(user.sub);
  }

  /**
   * Update personal profile display name and/or phone number.
   *
   * @async
   * @function updateMe
   *
   * @param {JwtPayload} user - Authenticated user JWT payload
   * @param {UpdateProfileDto} dto - Updated profile fields
   * @returns {Promise<{ data: any; message: string }>} Updated user profile
   *
   * @throws {BadRequestException} Validation failed
   * @throws {UnauthorizedException} Missing or invalid bearer token credentials
   *
   * @example
   * // Request Body:
   * {
   *   "fullName": "Mrs. Amaka Obi Updated",
   *   "phone": "08099999999"
   * }
   *
   * // Response (200 OK):
   * {
   *   "data": {
   *     "id": "user-uuid",
   *     "fullName": "Mrs. Amaka Obi Updated",
   *     "phone": "08099999999",
   *     "email": "amaka@brightfuture.edu.ng",
   *     "role": "ADMIN"
   *   },
   *   "message": "Profile updated successfully"
   * }
   */
  @Patch('me')
  @ApiOperation({
    summary: 'Update own profile',
    description:
      'Updates fullName and/or phone number on the authenticated user’s profile.',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or malformed request syntax.',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid bearer token credentials.',
  })
  updateMe(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateMe(user.sub, dto);
  }

  /**
   * Change account password by verifying current credentials.
   *
   * Automatically clears the `mustChangePassword` flag required upon first login.
   *
   * @async
   * @function changePassword
   *
   * @param {JwtPayload} user - Authenticated user JWT payload
   * @param {ChangePasswordDto} dto - Password change payload
   * @returns {Promise<{ message: string }>} Confirmation message
   *
   * @throws {BadRequestException} Validation failed or new password matches current
   * @throws {UnauthorizedException} Current password is incorrect or token is invalid
   *
   * @example
   * // Request Body:
   * {
   *   "currentPassword": "OldPassword123!",
   *   "newPassword": "NewPassword456!"
   * }
   *
   * // Response (200 OK):
   * {
   *   "message": "Password changed successfully"
   * }
   */
  @Patch('me/password')
  @ApiOperation({
    summary: 'Change own password',
    description:
      'Changes password after verifying existing credentials. Resets mustChangePassword flag required on first login for Teachers and Students.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or new password identical to current.',
  })
  @ApiResponse({
    status: 401,
    description: 'Current password incorrect or missing/invalid token.',
  })
  changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(user.sub, dto);
  }
}
