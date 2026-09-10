import {
  Controller, Post, Get, Body, Res, UploadedFile,
  UseInterceptors, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { Role } from '@prisma/client';
import { TeacherCsvService } from './teacher-csv.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class ConfirmCsvDto {
  @ApiProperty({ description: 'Preview token received from /upload' })
  @IsString()
  previewToken: string;
}

@ApiTags('Teachers — CSV Import')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('teachers/csv')
export class TeacherCsvController {
  constructor(private readonly teacherCsvService: TeacherCsvService) {}

  @Get('template')
  @ApiOperation({ summary: 'Download blank teacher CSV template' })
  downloadTemplate(@Res() res: Response) {
    const filePath = this.teacherCsvService.getTemplatePath();
    res.download(filePath, 'teacher-template.csv');
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload teacher CSV — returns preview. Does NOT create records yet.',
  })
  uploadCsv(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: 'text/csv' }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.teacherCsvService.uploadCsv(
      file.buffer,
      file.originalname,
      user.schoolId!,
      user.sub,
    );
  }

  @Post('confirm')
  @ApiOperation({
    summary: 'Confirm CSV preview — creates all valid teacher records',
  })
  confirmCsv(@Body() dto: ConfirmCsvDto, @CurrentUser() user: JwtPayload) {
    return this.teacherCsvService.confirmCsv(
      dto.previewToken,
      user.schoolId!,
      user.sub,
    );
  }
}
