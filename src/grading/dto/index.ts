import { IsString, IsInt, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGradeDto {
  @ApiProperty({ example: 'A1' })
  @IsString()
  grade: string;

  @ApiProperty({ example: 75 })
  @IsInt() @Min(0) @Max(100)
  minScore: number;

  @ApiProperty({ example: 100 })
  @IsInt() @Min(0) @Max(100)
  maxScore: number;

  @ApiProperty({ example: 'Excellent' })
  @IsString()
  remark: string;

  @ApiProperty({ example: 1 })
  @IsInt() @Min(1)
  order: number;
}

export class UpdateGradeDto {
  @ApiPropertyOptional() @IsOptional() @IsString() grade?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(100) minScore?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(100) maxScore?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() remark?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) order?: number;
}
