/**
 * @fileoverview Data Transfer Objects (DTOs) for creating and updating grading scale entries.
 * @module GradingDto
 * @author Edutrack Engineering Team
 * @created 1.0.0
 */

import { IsString, IsInt, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a new grade step in a school's grading scale.
 */
export class CreateGradeDto {
  /**
   * Letter grade symbol.
   * @example "A1"
   */
  @ApiProperty({
    example: 'A1',
    description: 'Letter grade identifier (e.g. A1, B2, C4, F9)',
    required: true,
  })
  @IsString()
  grade: string;

  /**
   * Minimum qualifying score threshold (0-100).
   * @example 75
   */
  @ApiProperty({
    example: 75,
    description: 'Minimum score percentage required to achieve this grade',
    minimum: 0,
    maximum: 100,
    required: true,
  })
  @IsInt()
  @Min(0)
  @Max(100)
  minScore: number;

  /**
   * Maximum qualifying score threshold (0-100).
   * @example 100
   */
  @ApiProperty({
    example: 100,
    description: 'Maximum score percentage covered by this grade',
    minimum: 0,
    maximum: 100,
    required: true,
  })
  @IsInt()
  @Min(0)
  @Max(100)
  maxScore: number;

  /**
   * Qualitative remark describing student performance.
   * @example "Excellent"
   */
  @ApiProperty({
    example: 'Excellent',
    description: 'Verbal remark corresponding to this grade (e.g. Excellent, Credit, Fail)',
    required: true,
  })
  @IsString()
  remark: string;

  /**
   * Display and evaluation precedence sequence number.
   * @example 1
   */
  @ApiProperty({
    example: 1,
    description: 'Evaluation priority and display ordering index (1 = highest)',
    minimum: 1,
    required: true,
  })
  @IsInt()
  @Min(1)
  order: number;
}

/**
 * DTO for updating an existing grading scale entry.
 */
export class UpdateGradeDto {
  /**
   * Updated letter grade identifier.
   * @example "A+"
   */
  @ApiPropertyOptional({
    example: 'A+',
    description: 'Updated letter grade identifier',
  })
  @IsOptional()
  @IsString()
  grade?: string;

  /**
   * Updated minimum score percentage threshold.
   * @example 80
   */
  @ApiPropertyOptional({
    example: 80,
    description: 'Updated minimum qualifying score (0-100)',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  minScore?: number;

  /**
   * Updated maximum score percentage threshold.
   * @example 100
   */
  @ApiPropertyOptional({
    example: 100,
    description: 'Updated maximum qualifying score (0-100)',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  maxScore?: number;

  /**
   * Updated qualitative remark.
   * @example "Outstanding"
   */
  @ApiPropertyOptional({
    example: 'Outstanding',
    description: 'Updated qualitative performance remark',
  })
  @IsOptional()
  @IsString()
  remark?: string;

  /**
   * Updated evaluation display order.
   * @example 1
   */
  @ApiPropertyOptional({
    example: 1,
    description: 'Updated evaluation priority and display ordering index',
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;
}
