import {
  IsString, IsOptional, IsUUID, IsDateString,
  IsEnum, MinLength, IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender, StudentStatus } from '@prisma/client';

export class CreateStudentDto {
  @ApiProperty({ example: 'David John Okafor' })
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiProperty({ enum: Gender, example: 'MALE' })
  @IsEnum(Gender, { message: 'gender must be MALE or FEMALE' })
  gender: Gender;

  @ApiProperty({ example: '2015-04-10' })
  @IsDateString()
  dateOfBirth: string;

  @ApiProperty({ description: 'UUID of the class to enroll this student in' })
  @IsUUID()
  classId: string;

  @ApiProperty({
    example: 'BFA/ADM/2025/001',
    description: 'Admission number — provided by admin. Not auto-generated. Must be unique within school.',
  })
  @IsString()
  @IsNotEmpty({ message: 'admissionNumber is required. Admin must provide it.' })
  admissionNumber: string;
}

export class UpdateStudentDto {
  @ApiPropertyOptional({ example: 'David John Okafor Updated' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ example: '2015-04-10' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ description: 'Move student to a different class' })
  @IsOptional()
  @IsUUID()
  classId?: string;
}

export class UpdateStudentStatusDto {
  @ApiProperty({
    enum: StudentStatus,
    description:
      'ACTIVE = enrolled normally | WITHDRAWN = left school | GRADUATED = completed | DEACTIVATED = hidden from portal',
  })
  @IsEnum(StudentStatus, {
    message: 'status must be ACTIVE, WITHDRAWN, GRADUATED, or DEACTIVATED',
  })
  status: StudentStatus;
}
