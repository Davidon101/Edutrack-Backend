import { IsString, IsOptional, MinLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubjectDto {
  @ApiProperty({ example: 'Mathematics' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: 'MTH', description: '2-5 uppercase letters' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2,5}$/, { message: 'Code must be 2-5 uppercase letters e.g. MTH' })
  code?: string;
}

export class UpdateSubjectDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2,5}$/, { message: 'Code must be 2-5 uppercase letters' })
  code?: string;
}
