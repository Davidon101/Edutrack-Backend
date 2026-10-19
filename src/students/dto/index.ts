/**
 * @fileoverview Data Transfer Objects (DTOs) for student management and status transitions.
 * @module students/dto
 */

import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsEnum,
  MinLength,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender, StudentStatus } from '@prisma/client';

/**
 * DTO for creating and enrolling a new student in a class.
 */
export class CreateStudentDto {
  /**
   * Full legal name of the student.
   * @example 'David John Okafor'
   */
  @ApiProperty({
    description: 'Full legal name of the student',
    example: 'David John Okafor',
    minLength: 2,
  })
  @IsString()
  @MinLength(2)
  fullName: string;

  /**
   * Gender identity of the student.
   * @example 'MALE'
   */
  @ApiProperty({
    description: 'Gender identity of the student',
    enum: Gender,
    example: Gender.MALE,
  })
  @IsEnum(Gender, { message: 'gender must be MALE or FEMALE' })
  gender: Gender;

  /**
   * Student date of birth in ISO date string format (YYYY-MM-DD).
   * @example '2015-04-10'
   */
  @ApiProperty({
    description: 'Student date of birth in ISO date string format (YYYY-MM-DD)',
    example: '2015-04-10',
  })
  @IsDateString()
  dateOfBirth: string;

  /**
   * UUID of the class to enroll this student in.
   * @example 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
   */
  @ApiProperty({
    description: 'UUID of the class to enroll this student in',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  classId: string;

  /**
   * Admission number assigned by the school administrator.
   * Distinct from the auto-generated Student ID login credential.
   * @example 'BFA/ADM/2025/001'
   */
  @ApiProperty({
    description:
      'Admission number provided by administrator. Unique within school. Not auto-generated.',
    example: 'BFA/ADM/2025/001',
  })
  @IsString()
  @IsNotEmpty({ message: 'admissionNumber is required. Admin must provide it.' })
  admissionNumber: string;
}

/**
 * DTO for updating existing student profile information.
 */
export class UpdateStudentDto {
  /**
   * Updated full name of the student.
   * @example 'David John Okafor'
   */
  @ApiPropertyOptional({
    description: 'Updated full legal name of the student',
    example: 'David John Okafor',
    minLength: 2,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  /**
   * Updated gender.
   * @example 'MALE'
   */
  @ApiPropertyOptional({
    description: 'Updated gender of the student',
    enum: Gender,
    example: Gender.MALE,
  })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  /**
   * Updated date of birth in ISO string format.
   * @example '2015-04-10'
   */
  @ApiPropertyOptional({
    description: 'Updated date of birth (YYYY-MM-DD)',
    example: '2015-04-10',
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  /**
   * UUID of the destination class if transferring classes.
   * @example 'b2c3d4e5-f6a7-8901-bcde-fa1234567890'
   */
  @ApiPropertyOptional({
    description: 'UUID of new class if transferring the student',
    example: 'b2c3d4e5-f6a7-8901-bcde-fa1234567890',
  })
  @IsOptional()
  @IsUUID()
  classId?: string;
}

/**
 * DTO for updating academic enrollment status of a student.
 */
export class UpdateStudentStatusDto {
  /**
   * Academic enrollment status.
   * @example 'ACTIVE'
   */
  @ApiProperty({
    description:
      'Academic status: ACTIVE = enrolled normally | WITHDRAWN = left school | GRADUATED = completed | DEACTIVATED = hidden from portal. Does NOT block portal login for record viewing.',
    enum: StudentStatus,
    example: StudentStatus.ACTIVE,
  })
  @IsEnum(StudentStatus, {
    message: 'status must be ACTIVE, WITHDRAWN, GRADUATED, or DEACTIVATED',
  })
  status: StudentStatus;
}
