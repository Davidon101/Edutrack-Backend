import {
  IsUUID, IsArray, ValidateNested, IsEnum, IsOptional, IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PromotionAction } from '@prisma/client';

export class PromotionEntryDto {
  @ApiProperty({ description: 'Student UUID' })
  @IsUUID()
  studentId: string;

  @ApiProperty({ enum: PromotionAction })
  @IsEnum(PromotionAction)
  action: PromotionAction;

  @ApiPropertyOptional({
    description: 'Target class UUID. Required for PROMOTE and REPEAT. Not needed for GRADUATE or WITHDRAW.',
  })
  @IsOptional()
  @IsUUID()
  toClassId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class BulkPromoteDto {
  @ApiProperty({ description: 'UUID of the session being promoted FROM' })
  @IsUUID()
  fromSessionId: string;

  @ApiProperty({ description: 'UUID of the destination session' })
  @IsUUID()
  toSessionId: string;

  @ApiProperty({ type: [PromotionEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PromotionEntryDto)
  promotions: PromotionEntryDto[];
}

export class SinglePromoteDto {
  @ApiProperty({ enum: PromotionAction })
  @IsEnum(PromotionAction)
  action: PromotionAction;

  @ApiProperty({ description: 'UUID of the session' })
  @IsUUID()
  sessionId: string;

  @ApiPropertyOptional({ description: 'Target class UUID (required for PROMOTE and REPEAT)' })
  @IsOptional()
  @IsUUID()
  toClassId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
