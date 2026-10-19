/**
 * @fileoverview Data Transfer Objects (DTOs) for single and bulk student promotions,
 * repetition, graduation, and withdrawal operations.
 * @module PromotionsDto
 * @author Edutrack Engineering Team
 * @created 1.0.0
 */

import {
  IsUUID,
  IsArray,
  ValidateNested,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PromotionAction } from '@prisma/client';

/**
 * DTO representing an individual student's action within a bulk promotion payload.
 */
export class PromotionEntryDto {
  /**
   * Unique identifier of the student.
   * @example "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
   */
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    description: 'UUID of the student to promote, repeat, graduate, or withdraw',
    required: true,
  })
  @IsUUID()
  studentId: string;

  /**
   * Promotion action type.
   * @example "PROMOTE"
   */
  @ApiProperty({
    enum: PromotionAction,
    example: PromotionAction.PROMOTE,
    description: 'Action: PROMOTE | REPEAT | GRADUATE | WITHDRAW',
    required: true,
  })
  @IsEnum(PromotionAction)
  action: PromotionAction;

  /**
   * Target destination class UUID. Required for PROMOTE and REPEAT.
   * @example "b2c3d4e5-f6a7-8901-bcde-fa1234567890"
   */
  @ApiPropertyOptional({
    example: 'b2c3d4e5-f6a7-8901-bcde-fa1234567890',
    description:
      'Target class UUID. Mandatory for PROMOTE and REPEAT. Omit for GRADUATE or WITHDRAW.',
  })
  @IsOptional()
  @IsUUID()
  toClassId?: string;

  /**
   * Optional administrative note or justification.
   * @example "Promoted on academic excellence"
   */
  @ApiPropertyOptional({
    example: 'Promoted on academic excellence',
    description: 'Optional administrative remark explaining the promotion action',
  })
  @IsOptional()
  @IsString()
  note?: string;
}

/**
 * DTO for executing batch student promotions across academic sessions.
 */
export class BulkPromoteDto {
  /**
   * Source academic session UUID being transitioned from.
   * @example "c3d4e5f6-a7b8-9012-cdef-ab1234567890"
   */
  @ApiProperty({
    example: 'c3d4e5f6-a7b8-9012-cdef-ab1234567890',
    description: 'UUID of the source academic session being promoted FROM',
    required: true,
  })
  @IsUUID()
  fromSessionId: string;

  /**
   * Destination academic session UUID being transitioned into.
   * @example "d4e5f6a7-b8c9-0123-defa-bc1234567890"
   */
  @ApiProperty({
    example: 'd4e5f6a7-b8c9-0123-defa-bc1234567890',
    description: 'UUID of the destination academic session',
    required: true,
  })
  @IsUUID()
  toSessionId: string;

  /**
   * Array of individual student promotion action records.
   */
  @ApiProperty({
    type: [PromotionEntryDto],
    description: 'List of student promotion action records to execute in batch',
    required: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PromotionEntryDto)
  promotions: PromotionEntryDto[];
}

/**
 * DTO for executing a promotion, repetition, graduation, or withdrawal on a single student.
 */
export class SinglePromoteDto {
  /**
   * Promotion action type.
   * @example "PROMOTE"
   */
  @ApiProperty({
    enum: PromotionAction,
    example: PromotionAction.PROMOTE,
    description: 'Action: PROMOTE | REPEAT | GRADUATE | WITHDRAW',
    required: true,
  })
  @IsEnum(PromotionAction)
  action: PromotionAction;

  /**
   * UUID of the academic session context.
   * @example "c3d4e5f6-a7b8-9012-cdef-ab1234567890"
   */
  @ApiProperty({
    example: 'c3d4e5f6-a7b8-9012-cdef-ab1234567890',
    description: 'UUID of the relevant academic session',
    required: true,
  })
  @IsUUID()
  sessionId: string;

  /**
   * Target destination class UUID. Required for PROMOTE and REPEAT.
   * @example "b2c3d4e5-f6a7-8901-bcde-fa1234567890"
   */
  @ApiPropertyOptional({
    example: 'b2c3d4e5-f6a7-8901-bcde-fa1234567890',
    description:
      'Target class UUID (mandatory for PROMOTE and REPEAT actions)',
  })
  @IsOptional()
  @IsUUID()
  toClassId?: string;

  /**
   * Optional administrative note.
   * @example "Promoted to Primary 5 Gold"
   */
  @ApiPropertyOptional({
    example: 'Promoted to Primary 5 Gold',
    description: 'Optional administrative note',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
