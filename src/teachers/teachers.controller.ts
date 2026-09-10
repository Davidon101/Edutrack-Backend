import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { TeachersService } from './teachers.service';
import { CreateTeacherDto, UpdateTeacherDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('Teachers')
@ApiBearerAuth()
@Controller('teachers')
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get()
  @Roles(Role.ADMIN, Role.RECORD_ADMIN)
  @ApiOperation({ summary: 'List all teachers in the school' })
  getTeachers(@CurrentUser() user: JwtPayload) {
    return this.teachersService.getTeachers(user.schoolId!);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Create a teacher. Auto-generates Staff ID + user account + temp password.',
  })
  createTeacher(@CurrentUser() user: JwtPayload, @Body() dto: CreateTeacherDto) {
    return this.teachersService.createTeacher(user.schoolId!, user.sub, dto);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.RECORD_ADMIN)
  @ApiOperation({ summary: 'Get teacher profile' })
  getTeacher(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.teachersService.getTeacherById(id, user.schoolId!);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update teacher info. Staff ID is read-only and cannot be changed.' })
  updateTeacher(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateTeacherDto,
  ) {
    return this.teachersService.updateTeacher(id, user.schoolId!, user.sub, dto);
  }

  @Patch(':id/deactivate')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Deactivate teacher — blocks login' })
  deactivate(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.teachersService.deactivateTeacher(id, user.schoolId!, user.sub);
  }

  @Patch(':id/reactivate')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Reactivate teacher — restores login' })
  reactivate(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.teachersService.reactivateTeacher(id, user.schoolId!, user.sub);
  }

  @Get(':id/history')
  @Roles(Role.ADMIN, Role.RECORD_ADMIN)
  @ApiOperation({ summary: 'Get teacher class assignment history' })
  getHistory(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.teachersService.getTeacherHistory(id, user.schoolId!);
  }
}
