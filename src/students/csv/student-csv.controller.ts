import {
  Controller, Post, Get, Body, Res,
  UploadedFile, UseInterceptors, ParseFilePipe,
  MaxFileSizeValidator, FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { Role } from '@prisma/client';
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { StudentCsvService } from './student-csv.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

class ConfirmStudentCsvDto {
  @ApiProperty()
  @IsString()
  previewToken: string;
}

@ApiTags('Students — CSV Import')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('students/csv')
export class StudentCsvController {
  constructor(private readonly studentCsvService: StudentCsvService) {}

  @Get('template')
  @ApiOperation({
    summary: 'Download blank student CSV template',
    description: 'Template columns: fullName, gender, dateOfBirth, className, admissionNumber. studentId is never in the template — it is always auto-generated.',
  })
  downloadTemplate(@Res() res: Response) {
    const filePath = this.studentCsvService.getTemplatePath();
    res.download(filePath, 'student-template.csv');
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload student CSV — returns preview. Does NOT create records yet.',
    description: 'Admission number must be provided by admin in the CSV. Student ID is always auto-generated and never read from CSV.',
  })
  uploadCsv(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: 'text/csv' }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.studentCsvService.uploadCsv(
      file.buffer, file.originalname, user.schoolId!, user.sub,
    );
  }

  @Post('confirm')
  @ApiOperation({ summary: 'Confirm CSV preview — creates all valid student records' })
  confirmCsv(@Body() dto: ConfirmStudentCsvDto, @CurrentUser() user: JwtPayload) {
    return this.studentCsvService.confirmCsv(dto.previewToken, user.schoolId!, user.sub);
  }
}
