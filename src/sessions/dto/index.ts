import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiProperty({ example: '2026/2027', description: 'Format: YYYY/YYYY with sequential years' })
  @IsString()
  @Matches(/^\d{4}\/\d{4}$/, { message: 'Session name must be in format YYYY/YYYY e.g. 2026/2027' })
  name: string;
}
