import { IsString, IsEmail, IsOptional, MinLength, IsInt, Min, Max, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSchoolDto {
  @ApiPropertyOptional({ example: 'Bright Future Academy' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;

  @ApiPropertyOptional({ example: '12 School Lane, Abuja' })
  @IsOptional()
  @IsString()
  @MinLength(5)
  address?: string;

  @ApiPropertyOptional({ example: '08012345678' })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class UpdateSchoolSettingsDto {
  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  ca1Max?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  ca2Max?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  ca3Max?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  ca4Max?: number;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  examMax?: number;

  @ApiPropertyOptional({ example: 'BFA', description: 'Prefix for Staff ID generation e.g. BFA → BFA/TCH/001' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2,5}$/, { message: 'staffIdPrefix must be 2-5 uppercase letters' })
  staffIdPrefix?: string;

  @ApiPropertyOptional({ example: 'BFA', description: 'Prefix for Student ID generation e.g. BFA → BFA/STU/001' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2,5}$/, { message: 'studentIdPrefix must be 2-5 uppercase letters' })
  studentIdPrefix?: string;
}
