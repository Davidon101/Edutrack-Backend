/**
 * @fileoverview Data Transfer Objects (DTOs) for user authentication and onboarding.
 * Covers admin, teacher, and student authentication, school registration, token refresh, and password recovery.
 * @module auth/dto
 */

import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for administrator and super administrator login via email and password.
 */
export class LoginDto {
  /**
   * Registered administrator email address.
   * @example 'admin@school.com'
   */
  @ApiProperty({
    description: 'Registered administrator email address',
    example: 'admin@school.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  /**
   * Account plaintext password.
   * @example 'Password123'
   */
  @ApiProperty({
    description: 'Account password',
    example: 'Password123',
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  password: string;
}

/**
 * DTO for teacher login using auto-generated Staff ID and password.
 */
export class TeacherLoginDto {
  /**
   * Auto-generated Staff ID acting as login credential.
   * @example 'BFA/TCH/001'
   */
  @ApiProperty({
    description: 'Auto-generated Staff ID — login credential (e.g. BFA/TCH/001)',
    example: 'BFA/TCH/001',
  })
  @IsString({ message: 'Staff ID is required' })
  staffId: string;

  /**
   * Teacher password (temporary or updated).
   * @example 'TempPass123'
   */
  @ApiProperty({
    description: 'Teacher account password',
    example: 'TempPass123',
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  password: string;
}

/**
 * DTO for student login using auto-generated Student ID and password.
 */
export class StudentLoginDto {
  /**
   * Auto-generated Student ID acting as login credential.
   * Distinct from the school admission number.
   * @example 'BFA/STU/042'
   */
  @ApiProperty({
    description: 'Auto-generated Student ID — login credential (e.g. BFA/STU/042)',
    example: 'BFA/STU/042',
  })
  @IsString({ message: 'Student ID is required' })
  studentId: string;

  /**
   * Student password (temporary or updated).
   * @example 'TempPass456'
   */
  @ApiProperty({
    description: 'Student account password',
    example: 'TempPass456',
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  password: string;
}

/**
 * DTO for registering a new school and provisioning its initial administrator account.
 */
export class RegisterSchoolDto {
  /**
   * Official name of the new school.
   * @example 'Bright Future Academy'
   */
  @ApiProperty({
    description: 'Official name of the school to register',
    example: 'Bright Future Academy',
    minLength: 3,
  })
  @IsString()
  @MinLength(3, { message: 'School name must be at least 3 characters' })
  schoolName: string;

  /**
   * Primary contact email address for the school.
   * @example 'info@brightfuture.edu.ng'
   */
  @ApiProperty({
    description: 'Primary contact email for the school',
    example: 'info@brightfuture.edu.ng',
  })
  @IsEmail({}, { message: 'School email must be a valid email' })
  schoolEmail: string;

  /**
   * Physical address of the school.
   * @example '12 School Lane, Abuja'
   */
  @ApiProperty({
    description: 'Physical address of the school',
    example: '12 School Lane, Abuja',
    minLength: 5,
  })
  @IsString()
  @MinLength(5, { message: 'Address must be at least 5 characters' })
  address: string;

  /**
   * Official phone number for the school.
   * @example '08012345678'
   */
  @ApiPropertyOptional({
    description: 'Official contact phone number for the school',
    example: '08012345678',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  /**
   * Full name of the primary school administrator.
   * @example 'Mrs. Amaka Obi'
   */
  @ApiProperty({
    description: 'Full name of the primary school administrator',
    example: 'Mrs. Amaka Obi',
    minLength: 2,
  })
  @IsString()
  @MinLength(2, { message: 'Admin name must be at least 2 characters' })
  adminName: string;

  /**
   * Email address for administrator login.
   * @example 'amaka@brightfuture.edu.ng'
   */
  @ApiProperty({
    description: 'Email address of the administrator',
    example: 'amaka@brightfuture.edu.ng',
  })
  @IsEmail({}, { message: 'Admin email must be a valid email' })
  adminEmail: string;

  /**
   * Contact phone number of the administrator.
   * @example '08098765432'
   */
  @ApiPropertyOptional({
    description: 'Phone number of the administrator',
    example: '08098765432',
  })
  @IsOptional()
  @IsString()
  adminPhone?: string;

  /**
   * Plaintext password for administrator account creation.
   * @example 'SecurePassword123'
   */
  @ApiProperty({
    description: 'Plaintext password for administrator login',
    example: 'SecurePassword123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;
}

/**
 * DTO for refreshing an expired access token using a valid refresh token.
 */
export class RefreshTokenDto {
  /**
   * Valid JWT refresh token string.
   * @example 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
   */
  @ApiProperty({
    description: 'JWT refresh token issued during login',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  refreshToken: string;
}

/**
 * DTO for requesting a password reset email token.
 */
export class ForgotPasswordDto {
  /**
   * Email address associated with the account.
   * @example 'admin@school.com'
   */
  @ApiProperty({
    description: 'Email address of account requiring password reset',
    example: 'admin@school.com',
  })
  @IsEmail()
  email: string;
}

/**
 * DTO for executing password reset with verification token.
 */
export class ResetPasswordDto {
  /**
   * Unique verification token received via password reset flow.
   * @example 'e6b6f728-6e54-4712-88f5-f0927cbdb609'
   */
  @ApiProperty({
    description: 'Password reset verification token',
    example: 'e6b6f728-6e54-4712-88f5-f0927cbdb609',
  })
  @IsString()
  token: string;

  /**
   * New plaintext password.
   * @example 'NewSecurePassword123'
   */
  @ApiProperty({
    description: 'New password for the user account',
    example: 'NewSecurePassword123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  newPassword: string;
}
