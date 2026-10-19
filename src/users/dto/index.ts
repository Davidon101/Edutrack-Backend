/**
 * @fileoverview Data Transfer Objects (DTOs) for user profile updates and password changes.
 * @module UsersDto
 * @author Edutrack Engineering Team
 * @created 1.0.0
 */

import { IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for updating the caller's personal profile attributes.
 */
export class UpdateProfileDto {
  /**
   * Updated full name of the user.
   * @example "Mrs. Amaka Obi"
   */
  @ApiPropertyOptional({
    example: 'Mrs. Amaka Obi',
    description: 'Updated full legal or display name of the user',
    minLength: 2,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  /**
   * Updated contact phone number.
   * @example "08099999999"
   */
  @ApiPropertyOptional({
    example: '08099999999',
    description: 'Updated mobile contact phone number',
  })
  @IsOptional()
  @IsString()
  phone?: string;
}

/**
 * DTO for changing the authenticated user's password.
 */
export class ChangePasswordDto {
  /**
   * Existing account password for verification.
   * @example "OldSecurePass123!"
   */
  @ApiProperty({
    example: 'OldSecurePass123!',
    description: 'Current password for verification',
    minLength: 1,
    required: true,
  })
  @IsString()
  @MinLength(1)
  currentPassword: string;

  /**
   * New plaintext password (minimum 8 characters).
   * @example "NewSecurePass456!"
   */
  @ApiProperty({
    example: 'NewSecurePass456!',
    description: 'New password for the account (minimum 8 characters)',
    minLength: 8,
    required: true,
  })
  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  newPassword: string;
}
