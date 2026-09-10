import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto, UpdateSubjectDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('Subjects')
@ApiBearerAuth()
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get()
  @ApiOperation({ summary: 'List all active school-wide subjects (available to all classes)' })
  getSubjects(@CurrentUser() user: JwtPayload) {
    return this.subjectsService.getSubjects(user.schoolId!);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a subject. displayOrder auto-assigned = creation order.' })
  createSubject(@CurrentUser() user: JwtPayload, @Body() dto: CreateSubjectDto) {
    return this.subjectsService.createSubject(user.schoolId!, user.sub, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update subject name or code' })
  updateSubject(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: UpdateSubjectDto) {
    return this.subjectsService.updateSubject(id, user.schoolId!, user.sub, dto);
  }

  @Patch(':id/archive')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Archive subject (soft delete). Historical results preserved.' })
  archiveSubject(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.subjectsService.archiveSubject(id, user.schoolId!, user.sub);
  }
}
