/**
 * @fileoverview Data Transfer Objects (DTOs) for creating and updating subjects.
 * @module subjects/dto
 */

import { IsString, IsOptional, MinLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a new subject across the school.
 */
export class CreateSubjectDto {
  /**
   * Full descriptive name of the subject.
   * @example 'Mathematics'
   */
  @ApiProperty({
    description: 'Full descriptive name of the subject',
    example: 'Mathematics',
    minLength: 2,
  })
  @IsString()
  @MinLength(2)
  name: string;

  /**
   * 2-5 letter uppercase abbreviation code for the subject.
   * @example 'MTH'
   */
  @ApiPropertyOptional({
    description: '2 to 5 uppercase letters representing subject code (e.g. MTH, ENG, SCI)',
    example: 'MTH',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2,5}$/, {
    message: 'Code must be 2-5 uppercase letters e.g. MTH',
  })
  code?: string;
}

/**
 * DTO for updating an existing subject.
 */
export class UpdateSubjectDto {
  /**
   * Updated descriptive name of the subject.
   * @example 'Further Mathematics'
   */
  @ApiPropertyOptional({
    description: 'Updated name of the subject',
    example: 'Further Mathematics',
    minLength: 2,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  /**
   * Updated 2-5 letter uppercase abbreviation code.
   * @example 'FMTH'
   */
  @ApiPropertyOptional({
    description: 'Updated 2 to 5 uppercase letter subject code',
    example: 'FMTH',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2,5}$/, {
    message: 'Code must be 2-5 uppercase letters',
  })
  code?: string;
}
