/**
 * @fileoverview Data Transfer Objects (DTOs) for teacher registration and profile updates.
 * @module teachers/dto
 */

import {
  IsString,
  IsOptional,
  IsEmail,
  IsDateString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a new teacher within a school.
 */
export class CreateTeacherDto {
  /**
   * Full legal name of the teacher.
   * @example 'Mr. John Adeyemi'
   */
  @ApiProperty({
    description: 'Full legal name of the teacher',
    example: 'Mr. John Adeyemi',
    minLength: 2,
  })
  @IsString()
  @MinLength(2)
  fullName: string;

  /**
   * Primary contact telephone number.
   * @example '08012345678'
   */
  @ApiProperty({
    description: 'Primary contact telephone number',
    example: '08012345678',
  })
  @IsString()
  phone: string;

  /**
   * Optional contact email address (not used for login; login uses Staff ID).
   * @example 'john@school.com'
   */
  @ApiPropertyOptional({
    description: 'Optional contact email address (not used for authentication)',
    example: 'john@school.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  /**
   * Academic qualification.
   * @example 'B.Ed'
   */
  @ApiPropertyOptional({
    description: 'Academic qualification held by the teacher',
    example: 'B.Ed',
  })
  @IsOptional()
  @IsString()
  qualification?: string;

  /**
   * Subject area or teaching specialization.
   * @example 'Mathematics'
   */
  @ApiPropertyOptional({
    description: 'Teaching specialization or subject domain',
    example: 'Mathematics',
  })
  @IsOptional()
  @IsString()
  specialization?: string;

  /**
   * Employment join date in ISO date format (YYYY-MM-DD).
   * @example '2024-09-01'
   */
  @ApiPropertyOptional({
    description: 'Employment join date (YYYY-MM-DD)',
    example: '2024-09-01',
  })
  @IsOptional()
  @IsDateString()
  joinDate?: string;
}

/**
 * DTO for updating an existing teacher's profile attributes.
 */
export class UpdateTeacherDto {
  /**
   * Updated full name of the teacher.
   * @example 'Mr. John Adeyemi'
   */
  @ApiPropertyOptional({
    description: 'Updated full name of the teacher',
    example: 'Mr. John Adeyemi',
    minLength: 2,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  /**
   * Updated contact telephone number.
   * @example '08012345678'
   */
  @ApiPropertyOptional({
    description: 'Updated contact telephone number',
    example: '08012345678',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  /**
   * Updated email address.
   * @example 'john.new@school.com'
   */
  @ApiPropertyOptional({
    description: 'Updated email address',
    example: 'john.new@school.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  /**
   * Updated academic qualification.
   * @example 'M.Ed'
   */
  @ApiPropertyOptional({
    description: 'Updated academic qualification',
    example: 'M.Ed',
  })
  @IsOptional()
  @IsString()
  qualification?: string;

  /**
   * Updated subject specialization.
   * @example 'Further Mathematics'
   */
  @ApiPropertyOptional({
    description: 'Updated subject specialization',
    example: 'Further Mathematics',
  })
  @IsOptional()
  @IsString()
  specialization?: string;

  /**
   * Updated employment join date in ISO date format.
   * @example '2024-09-01'
   */
  @ApiPropertyOptional({
    description: 'Updated employment join date (YYYY-MM-DD)',
    example: '2024-09-01',
  })
  @IsOptional()
  @IsDateString()
  joinDate?: string;
}
