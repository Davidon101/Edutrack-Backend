/**
 * @fileoverview Data Transfer Objects (DTOs) for academic session creation and validation.
 * @module SessionsDto
 * @author Edutrack Engineering Team
 * @created 1.0.0
 */

import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for creating a new academic session.
 * Enforces sequential YYYY/YYYY year format via regex validation.
 */
export class CreateSessionDto {
  /**
   * Academic session label with sequential 4-digit years separated by a forward slash.
   * @example "2026/2027"
   */
  @ApiProperty({
    example: '2026/2027',
    description: 'Format: YYYY/YYYY with sequential calendar years (e.g. 2026/2027)',
    required: true,
  })
  @IsString()
  @Matches(/^\d{4}\/\d{4}$/, {
    message: 'Session name must be in format YYYY/YYYY e.g. 2026/2027',
  })
  name: string;
}
