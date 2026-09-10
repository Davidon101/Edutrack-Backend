import {
  IsUUID, IsArray, ValidateNested, IsInt, IsOptional, Min, Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ScoreEntryDto {
  @ApiProperty({ description: 'Student UUID' })
  @IsUUID()
  studentId: string;

  @ApiProperty({ description: 'Subject UUID' })
  @IsUUID()
  subjectId: string;

  @ApiPropertyOptional({ example: 8, description: 'Whole integer only. Validated against school ca1Max.' })
  @IsOptional()
  @IsInt({ message: 'ca1 must be a whole number' })
  @Min(0) @Max(100)
  ca1?: number;

  @ApiPropertyOptional({ example: 7 })
  @IsOptional()
  @IsInt({ message: 'ca2 must be a whole number' })
  @Min(0) @Max(100)
  ca2?: number;

  @ApiPropertyOptional({ example: 9 })
  @IsOptional()
  @IsInt({ message: 'ca3 must be a whole number' })
  @Min(0) @Max(100)
  ca3?: number;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @IsInt({ message: 'ca4 must be a whole number' })
  @Min(0) @Max(100)
  ca4?: number;

  @ApiPropertyOptional({ example: 55, description: 'Validated against school examMax.' })
  @IsOptional()
  @IsInt({ message: 'exam must be a whole number' })
  @Min(0) @Max(100)
  exam?: number;
}

export class SaveScoresDto {
  @ApiProperty({ description: 'Class UUID' })
  @IsUUID()
  classId: string;

  @ApiProperty({ description: 'Term UUID — must be the currently open term' })
  @IsUUID()
  termId: string;

  @ApiProperty({ type: [ScoreEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScoreEntryDto)
  scores: ScoreEntryDto[];
}
