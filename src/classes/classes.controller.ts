import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ClassesService } from './classes.service';
import { CreateClassDto, UpdateClassDto, AssignTeacherDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('Classes')
@ApiBearerAuth()
@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.RECORD_ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'List all active classes' })
  getClasses(@CurrentUser() user: JwtPayload) {
    return this.classesService.getClasses(user.schoolId!);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new class' })
  createClass(@CurrentUser() user: JwtPayload, @Body() dto: CreateClassDto) {
    return this.classesService.createClass(user.schoolId!, user.sub, dto);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.RECORD_ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get class details' })
  getClass(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.classesService.getClassById(id, user.schoolId!);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update class name, level, or arm section' })
  updateClass(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: UpdateClassDto) {
    return this.classesService.updateClass(id, user.schoolId!, user.sub, dto);
  }

  @Patch(':id/teacher')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Assign or change class teacher. Writes to class_teacher_history.' })
  assignTeacher(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: AssignTeacherDto) {
    return this.classesService.assignTeacher(id, user.schoolId!, user.sub, dto);
  }

  @Patch(':id/archive')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Archive a class (soft delete). Blocked if active students exist.' })
  archiveClass(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.classesService.archiveClass(id, user.schoolId!, user.sub);
  }

  @Get(':id/students')
  @Roles(Role.ADMIN, Role.RECORD_ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'List all ACTIVE students in a class' })
  getStudents(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.classesService.getClassStudents(id, user.schoolId!);
  }
}
