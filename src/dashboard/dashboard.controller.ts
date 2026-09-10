import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('admin')
  @Roles(Role.ADMIN, Role.RECORD_ADMIN)
  @ApiOperation({ summary: 'Admin dashboard stats' })
  getAdminDashboard(@CurrentUser() user: JwtPayload) {
    return this.dashboardService.getAdminDashboard(user.schoolId!);
  }

  @Get('teacher')
  @Roles(Role.TEACHER)
  @ApiOperation({ summary: 'Teacher dashboard stats' })
  getTeacherDashboard(@CurrentUser() user: JwtPayload) {
    return this.dashboardService.getTeacherDashboard(user.sub, user.schoolId!);
  }

  @Get('student')
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Student dashboard stats' })
  getStudentDashboard(@CurrentUser() user: JwtPayload) {
    return this.dashboardService.getStudentDashboard(user.sub, user.schoolId!);
  }

  @Get('super-admin')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Platform-wide stats (Super Admin only)' })
  getSuperAdminDashboard() {
    return this.dashboardService.getSuperAdminDashboard();
  }
}
