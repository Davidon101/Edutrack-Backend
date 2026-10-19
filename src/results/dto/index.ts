/**
 * @fileoverview Data Transfer Objects (DTOs) for recording continuous assessment (CA) and examination scores.
 * @module ResultsDto
 * @author Edutrack Engineering Team
 * @created 1.0.0
 */

import {
  IsUUID,
  IsArray,
  ValidateNested,
  IsInt,
  IsOptional,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO representing an individual student's subject assessment score entry.
 */
export class ScoreEntryDto {
  /**
   * Unique identifier of the student.
   * @example "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
   */
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'Student UUID',
    required: true,
  })
  @IsUUID()
  studentId: string;

  /**
   * Unique identifier of the subject.
   * @example "b2c3d4e5-f6a7-8901-bcde-fa1234567890"
   */
  @ApiProperty({
    example: 'b2c3d4e5-f6a7-8901-bcde-fa1234567890',
    description: 'Subject UUID',
    required: true,
  })
  @IsUUID()
  subjectId: string;

  /**
   * Continuous assessment 1 integer score.
   * @example 8
   */
  @ApiPropertyOptional({
    example: 8,
    description:
      'Continuous Assessment 1 score (whole number). Validated against school ca1Max.',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsInt({ message: 'ca1 must be a whole number' })
  @Min(0)
  @Max(100)
  ca1?: number;

  /**
   * Continuous assessment 2 integer score.
   * @example 7
   */
  @ApiPropertyOptional({
    example: 7,
    description:
      'Continuous Assessment 2 score (whole number). Validated against school ca2Max.',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsInt({ message: 'ca2 must be a whole number' })
  @Min(0)
  @Max(100)
  ca2?: number;

  /**
   * Continuous assessment 3 integer score.
   * @example 9
   */
  @ApiPropertyOptional({
    example: 9,
    description:
      'Continuous Assessment 3 score (whole number). Validated against school ca3Max.',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsInt({ message: 'ca3 must be a whole number' })
  @Min(0)
  @Max(100)
  ca3?: number;

  /**
   * Continuous assessment 4 integer score.
   * @example 8
   */
  @ApiPropertyOptional({
    example: 8,
    description:
      'Continuous Assessment 4 score (whole number). Validated against school ca4Max.',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsInt({ message: 'ca4 must be a whole number' })
  @Min(0)
  @Max(100)
  ca4?: number;

  /**
   * Examination integer score.
   * @example 55
   */
  @ApiPropertyOptional({
    example: 55,
    description:
      'Final Examination score (whole number). Validated against school examMax.',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsInt({ message: 'exam must be a whole number' })
  @Min(0)
  @Max(100)
  exam?: number;
}

/**
 * DTO for saving or drafting score records for a class within an active term.
 */
export class SaveScoresDto {
  /**
   * Class UUID.
   * @example "c3d4e5f6-a7b8-9012-cdef-ab1234567890"
   */
  @ApiProperty({
    example: 'c3d4e5f6-a7b8-9012-cdef-ab1234567890',
    description: 'Class UUID for score entry',
    required: true,
  })
  @IsUUID()
  classId: string;

  /**
   * Term UUID.
   * @example "d4e5f6a7-b8c9-0123-defa-bc1234567890"
   */
  @ApiProperty({
    example: 'd4e5f6a7-b8c9-0123-defa-bc1234567890',
    description: 'Term UUID (must be the currently open term in the active session)',
    required: true,
  })
  @IsUUID()
  termId: string;

  /**
   * Array of score entries.
   */
  @ApiProperty({
    type: [ScoreEntryDto],
    description: 'Array of score entries per student and subject',
    required: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScoreEntryDto)
  scores: ScoreEntryDto[];
}
