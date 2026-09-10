import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { Role } from '@prisma/client';
import { FilesService } from './files.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('Files')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.RECORD_ADMIN)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get('imports')
  @ApiOperation({ summary: 'List all past CSV imports with results' })
  getImports(@CurrentUser() user: JwtPayload, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.filesService.getImports(user.schoolId!, +page, +limit);
  }

  @Get('imports/:id/errors')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Download error report CSV for a failed/partial import' })
  async downloadErrors(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Res() res: Response) {
    const filePath = await this.filesService.getErrorReport(id, user.schoolId!);
    res.download(filePath, 'import-errors.csv');
  }
}
