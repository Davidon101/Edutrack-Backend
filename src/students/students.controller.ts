import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { StudentsService } from './students.service';
import { CreateStudentDto, UpdateStudentDto, UpdateStudentStatusDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('Students')
@ApiBearerAuth()
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  // ── Student views own profile — sc-profile screen ──────────────────
  @Get('me')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Student gets own profile using JWT (no UUID needed)' })
  getMyProfile(@CurrentUser() user: JwtPayload) {
    return this.studentsService.getMyProfile(user.sub, user.schoolId!);
  }

  @Get()
  @Roles(Role.ADMIN, Role.RECORD_ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'List all students. Optionally filter by classId.' })
  @ApiQuery({ name: 'classId', required: false })
  getStudents(@CurrentUser() user: JwtPayload, @Query('classId') classId?: string) {
    return this.studentsService.getStudents(user.schoolId!, classId);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Create a student. Auto-generates Student ID. Admin provides Admission Number.',
  })
  createStudent(@CurrentUser() user: JwtPayload, @Body() dto: CreateStudentDto) {
    return this.studentsService.createStudent(user.schoolId!, user.sub, dto);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.RECORD_ADMIN, Role.TEACHER, Role.STUDENT)
  @ApiOperation({ summary: 'Get student profile by ID' })
  getStudent(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.studentsService.getStudentById(id, user.schoolId!);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update student. Student ID and Admission Number are read-only.' })
  updateStudent(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.studentsService.updateStudent(id, user.schoolId!, user.sub, dto);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Change student status. Does NOT block student login.',
    description:
      'ACTIVE | WITHDRAWN | GRADUATED | DEACTIVATED. Student can always log in regardless of status.',
  })
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateStudentStatusDto,
  ) {
    return this.studentsService.updateStudentStatus(id, user.schoolId!, user.sub, dto);
  }

  @Get(':id/history')
  @Roles(Role.ADMIN, Role.RECORD_ADMIN)
  @ApiOperation({ summary: 'Get student class history' })
  getHistory(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.studentsService.getStudentHistory(id, user.schoolId!);
  }

  @Get(':id/results')
  @Roles(Role.ADMIN, Role.RECORD_ADMIN, Role.STUDENT)
  @ApiOperation({ summary: 'Get all published results for a student' })
  @ApiQuery({ name: 'sessionId', required: false })
  @ApiQuery({ name: 'termId', required: false })
  getResults(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Query('sessionId') sessionId?: string,
    @Query('termId') termId?: string,
  ) {
    return this.studentsService.getStudentResults(id, user.schoolId!, sessionId, termId);
  }
}
