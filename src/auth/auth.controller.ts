/**
 * @fileoverview Authentication controller providing endpoints for registration, multi-role login,
 * token refreshes, session logouts, and password reset workflows.
 * @module auth/auth.controller
 */

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import {
  RegisterSchoolDto,
  LoginDto,
  TeacherLoginDto,
  StudentLoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto';
import { Public } from '../common/decorators/public.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';

/**
 * Controller exposing authentication endpoints for administrators, teachers, and students.
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  /**
   * Initializes the AuthController.
   *
   * @param authService - Service managing authentication operations.
   */
  constructor(private readonly authService: AuthService) {}

  /**
   * Registers a new school and its primary administrator account.
   *
   * @param dto - School and initial administrator details.
   * @returns Tokens and registered school/admin profile.
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  @ApiOperation({
    summary: 'Register a new school',
    description:
      'Creates school + admin account + default settings + default grading scale + session + terms in one transaction.',
  })
  @ApiResponse({
    status: 201,
    description: 'School and administrator registered successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request. Validation failed.',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict. Admin email or school email already registered.',
  })
  register(@Body() dto: RegisterSchoolDto) {
    return this.authService.registerSchool(dto);
  }

  /**
   * Authenticates an administrator or super administrator using email and password.
   *
   * @param dto - Admin credentials.
   * @returns Access and refresh tokens with user and school metadata.
   */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin login (email + password)',
    description: 'For ADMIN, SUPER_ADMIN, and RECORD_ADMIN roles only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful. Returns access/refresh tokens.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request. Validation failed.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Invalid email, password, or account inactive.',
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * Authenticates a teacher using their auto-generated Staff ID and password.
   *
   * @param dto - Teacher login credentials.
   * @returns Access and refresh tokens with teacher profile details.
   */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('teacher/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Teacher login (Staff ID + password)',
    description:
      'Teachers log in with their auto-generated Staff ID (e.g. BFA/TCH/001), not their email.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful. Returns access/refresh tokens.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request. Validation failed.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Invalid Staff ID, password, or account inactive.',
  })
  teacherLogin(@Body() dto: TeacherLoginDto) {
    return this.authService.teacherLogin(dto);
  }

  /**
   * Authenticates a student using their auto-generated Student ID and password.
   *
   * @param dto - Student login credentials.
   * @returns Access and refresh tokens with student profile and assigned class.
   */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('student/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Student login (Student ID + password)',
    description:
      'Students log in with their auto-generated Student ID (e.g. BFA/STU/001). Note: Student ID is different from Admission Number.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful. Returns access/refresh tokens.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request. Validation failed.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Invalid Student ID, password, or account inactive.',
  })
  studentLogin(@Body() dto: StudentLoginDto) {
    return this.authService.studentLogin(dto);
  }

  /**
   * Refreshes an expired access token using a valid refresh token.
   *
   * @param dto - Refresh token payload.
   * @returns New access and refresh tokens.
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Exchanges a valid refresh token for a new access token and refresh token pair.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request. Validation failed.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Invalid or expired refresh token.',
  })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  /**
   * Logs out the user by invalidating the refresh token on file.
   *
   * @param user - Authenticated user JWT payload.
   * @returns Logout confirmation message.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout',
    description: 'Invalidates the stored refresh token for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Logged out successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Missing or invalid bearer token.',
  })
  logout(@CurrentUser() user: JwtPayload) {
    return this.authService.logout(user.sub);
  }

  /**
   * Requests a password reset link/token.
   *
   * @param dto - Account email payload.
   * @returns Confirmation message (constant response to prevent account harvesting).
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Generates a temporary password reset token for the given email if registered.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset request acknowledged.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request. Validation failed.',
  })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  /**
   * Resets account password using a validated reset token.
   *
   * @param dto - Reset token and new password.
   * @returns Confirmation message.
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password',
    description: 'Resets user account password using the token sent via email.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request. Token is invalid or expired, or new password validation failed.',
  })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
