/**
 * @fileoverview Data Transfer Objects (DTOs) for class creation, updates, and teacher assignments.
 * Contains Swagger documentation decorators and validation rules.
 * @module classes/dto
 */

import { IsString, IsOptional, IsUUID, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a new class within a school.
 */
export class CreateClassDto {
  /**
   * Unique name of the class within the school.
   * @example 'Primary 4 Gold'
   */
  @ApiProperty({
    description: 'Unique name of the class within the school',
    example: 'Primary 4 Gold',
    minLength: 2,
  })
  @IsString()
  @MinLength(2)
  name: string;

  /**
   * Academic grade or standard level of the class.
   * @example 'PRIMARY 4'
   */
  @ApiProperty({
    description: 'Academic grade or standard level of the class',
    example: 'PRIMARY 4',
  })
  @IsString()
  level: string;

  /**
   * Optional arm or section designation (e.g., Gold, Blue, Science).
   * @example 'Gold'
   */
  @ApiPropertyOptional({
    description: 'Optional arm or section designation',
    example: 'Gold',
  })
  @IsOptional()
  @IsString()
  armSection?: string;

  /**
   * Optional UUID of the teacher assigned as the class teacher.
   * @example 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
   */
  @ApiPropertyOptional({
    description: 'UUID of the teacher assigned as the class teacher',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsOptional()
  @IsUUID()
  classTeacherId?: string;
}

/**
 * DTO for updating an existing class's details.
 */
export class UpdateClassDto {
  /**
   * Updated unique name for the class.
   * @example 'Primary 4 Diamond'
   */
  @ApiPropertyOptional({
    description: 'Updated unique name for the class',
    example: 'Primary 4 Diamond',
    minLength: 2,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  /**
   * Updated academic level of the class.
   * @example 'PRIMARY 4'
   */
  @ApiPropertyOptional({
    description: 'Updated academic level of the class',
    example: 'PRIMARY 4',
  })
  @IsOptional()
  @IsString()
  level?: string;

  /**
   * Updated arm or section identifier.
   * @example 'Diamond'
   */
  @ApiPropertyOptional({
    description: 'Updated arm or section identifier',
    example: 'Diamond',
  })
  @IsOptional()
  @IsString()
  armSection?: string;
}

/**
 * DTO for assigning or updating the assigned class teacher.
 */
export class AssignTeacherDto {
  /**
   * UUID of the teacher to assign as the designated class teacher.
   * @example 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
   */
  @ApiProperty({
    description: 'UUID of the teacher to assign as designated class teacher',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  classTeacherId: string;
}
