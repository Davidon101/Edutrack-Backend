/**
 * @fileoverview Data Transfer Objects (DTOs) for updating school profiles and academic settings.
 * Includes Swagger schema decorators and class-validator rules.
 * @module schools/dto
 */

import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  IsInt,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for updating a school's core profile information.
 */
export class UpdateSchoolDto {
  /**
   * Updated official name of the school.
   * @example 'Bright Future Academy'
   */
  @ApiPropertyOptional({
    description: 'Updated official name of the school',
    example: 'Bright Future Academy',
    minLength: 3,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;

  /**
   * Physical street address of the school.
   * @example '12 School Lane, Abuja'
   */
  @ApiPropertyOptional({
    description: 'Physical address of the school premises',
    example: '12 School Lane, Abuja',
    minLength: 5,
  })
  @IsOptional()
  @IsString()
  @MinLength(5)
  address?: string;

  /**
   * Primary contact telephone number.
   * @example '08012345678'
   */
  @ApiPropertyOptional({
    description: 'Primary contact phone number for the school',
    example: '08012345678',
  })
  @IsOptional()
  @IsString()
  phone?: string;
}

/**
 * DTO for updating academic assessment weights and ID generation prefixes for a school.
 */
export class UpdateSchoolSettingsDto {
  /**
   * Maximum score allowed for Continuous Assessment 1.
   * @example 10
   */
  @ApiPropertyOptional({
    description: 'Maximum obtainable score for Continuous Assessment 1',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  ca1Max?: number;

  /**
   * Maximum score allowed for Continuous Assessment 2.
   * @example 10
   */
  @ApiPropertyOptional({
    description: 'Maximum obtainable score for Continuous Assessment 2',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  ca2Max?: number;

  /**
   * Maximum score allowed for Continuous Assessment 3.
   * @example 10
   */
  @ApiPropertyOptional({
    description: 'Maximum obtainable score for Continuous Assessment 3',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  ca3Max?: number;

  /**
   * Maximum score allowed for Continuous Assessment 4.
   * @example 10
   */
  @ApiPropertyOptional({
    description: 'Maximum obtainable score for Continuous Assessment 4',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  ca4Max?: number;

  /**
   * Maximum score allowed for the final Examination.
   * @example 60
   */
  @ApiPropertyOptional({
    description: 'Maximum obtainable score for Examination',
    example: 60,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  examMax?: number;

  /**
   * 2-5 uppercase letter prefix used for Staff ID generation (e.g., 'BFA' -> 'BFA/TCH/001').
   * @example 'BFA'
   */
  @ApiPropertyOptional({
    description: 'Prefix for Staff ID generation (2 to 5 uppercase letters, e.g. BFA -> BFA/TCH/001)',
    example: 'BFA',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2,5}$/, { message: 'staffIdPrefix must be 2-5 uppercase letters' })
  staffIdPrefix?: string;

  /**
   * 2-5 uppercase letter prefix used for Student ID generation (e.g., 'BFA' -> 'BFA/STU/001').
   * @example 'BFA'
   */
  @ApiPropertyOptional({
    description: 'Prefix for Student ID generation (2 to 5 uppercase letters, e.g. BFA -> BFA/STU/001)',
    example: 'BFA',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2,5}$/, { message: 'studentIdPrefix must be 2-5 uppercase letters' })
  studentIdPrefix?: string;
}
