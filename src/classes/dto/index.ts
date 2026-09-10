import { IsString, IsOptional, IsUUID, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClassDto {
  @ApiProperty({ example: 'Primary 4 Gold' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'PRIMARY 4' })
  @IsString()
  level: string;

  @ApiPropertyOptional({ example: 'Gold' })
  @IsOptional()
  @IsString()
  armSection?: string;

  @ApiPropertyOptional({ description: 'UUID of the class teacher' })
  @IsOptional()
  @IsUUID()
  classTeacherId?: string;
}

export class UpdateClassDto {
  @ApiPropertyOptional({ example: 'Primary 4 Gold' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: 'PRIMARY 4' })
  @IsOptional()
  @IsString()
  level?: string;

  @ApiPropertyOptional({ example: 'Silver' })
  @IsOptional()
  @IsString()
  armSection?: string;
}

export class AssignTeacherDto {
  @ApiProperty({ description: 'UUID of the teacher to assign as class teacher' })
  @IsUUID()
  classTeacherId: string;
}
