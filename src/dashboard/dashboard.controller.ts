/**
 * @fileoverview Dashboard controller exposing REST endpoints for role-specific dashboard views
 * for administrators, teachers, students, and platform super administrators.
 * @module DashboardController
 * @author Edutrack Engineering Team
 * @created 1.0.0
 */

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';

/**
 * Controller delivering role-tailored dashboard metrics and status overviews.
 * @module DashboardController
 */
@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  /**
   * Initializes DashboardController with dashboard service.
   *
   * @param {DashboardService} dashboardService - Service providing dashboard analytics
   */
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * Retrieve statistical summary for the school administrator dashboard.
   *
   * @async
   * @function getAdminDashboard
   *
   * @param {JwtPayload} user - Authenticated user JWT payload
   * @returns {Promise<{ data: any; message: string }>} Admin dashboard metrics
   *
   * @throws {UnauthorizedException} Missing or invalid bearer token
   * @throws {ForbiddenException} Requires ADMIN or RECORD_ADMIN role
   *
   * @example
   * // Response (200 OK):
   * {
   *   "data": {
   *     "studentCount": 120,
   *     "teacherCount": 15,
   *     "classCount": 6,
   *     "pendingResults": 1,
   *     "activeSession": "2025/2026",
   *     "openTerm": "FIRST"
   *   },
   *   "message": "Admin dashboard retrieved"
   * }
   */
  @Get('admin')
  @Roles(Role.ADMIN, Role.RECORD_ADMIN)
  @ApiOperation({
    summary: 'Admin dashboard stats',
    description:
      'Provides high-level school analytics including student count, teacher headcount, active classes, pending result submissions, and active session/term.',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin dashboard metrics retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid bearer token credentials.',
  })
  @ApiResponse({
    status: 403,
    description: 'Requires ADMIN or RECORD_ADMIN role.',
  })
  getAdminDashboard(@CurrentUser() user: JwtPayload) {
    return this.dashboardService.getAdminDashboard(user.schoolId!);
  }

  /**
   * Retrieve summary and status overview for the authenticated teacher dashboard.
   *
   * @async
   * @function getTeacherDashboard
   *
   * @param {JwtPayload} user - Authenticated user JWT payload
   * @returns {Promise<{ data: any; message: string }>} Teacher dashboard metrics
   *
   * @throws {UnauthorizedException} Missing or invalid bearer token
   * @throws {ForbiddenException} Requires TEACHER role
   * @throws {NotFoundException} Teacher record not found
   *
   * @example
   * // Response (200 OK):
   * {
   *   "data": {
   *     "fullName": "Mr. John Adeyemi",
   *     "staffId": "BFA/TCH/001",
   *     "assignedClass": { "id": "uuid", "name": "Primary 4 Gold", "studentCount": 24, "subjectCount": 8 },
   *     "activeSession": "2025/2026",
   *     "openTerm": "FIRST",
   *     "resultStatus": "SUBMITTED"
   *   },
   *   "message": "Teacher dashboard retrieved"
   * }
   */
  @Get('teacher')
  @Roles(Role.TEACHER)
  @ApiOperation({
    summary: 'Teacher dashboard stats',
    description:
      'Provides teacher profile context, assigned class details, enrolled student count, and term result entry status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Teacher dashboard metrics retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid bearer token credentials.',
  })
  @ApiResponse({
    status: 403,
    description: 'Requires TEACHER role.',
  })
  @ApiResponse({
    status: 404,
    description: 'Teacher record not found in school.',
  })
  getTeacherDashboard(@CurrentUser() user: JwtPayload) {
    return this.dashboardService.getTeacherDashboard(user.sub, user.schoolId!);
  }

  /**
   * Retrieve personal academic dashboard summary for the authenticated student.
   *
   * @async
   * @function getStudentDashboard
   *
   * @param {JwtPayload} user - Authenticated user JWT payload
   * @returns {Promise<{ data: any; message: string }>} Student dashboard metrics
   *
   * @throws {UnauthorizedException} Missing or invalid bearer token
   * @throws {ForbiddenException} Requires STUDENT role
   * @throws {NotFoundException} Student record not found
   *
   * @example
   * // Response (200 OK):
   * {
   *   "data": {
   *     "fullName": "David Okafor",
   *     "studentId": "BFA/STU/001",
   *     "admissionNumber": "BFA/ADM/2025/001",
   *     "class": { "id": "uuid", "name": "Primary 4 Gold" },
   *     "activeSession": "2025/2026",
   *     "openTerm": "FIRST",
   *     "latestResults": { "subjectCount": 8, "average": 78.4 }
   *   },
   *   "message": "Student dashboard retrieved"
   * }
   */
  @Get('student')
  @Roles(Role.STUDENT)
  @ApiOperation({
    summary: 'Student dashboard stats',
    description:
      'Provides student profile overview, class info, academic session state, and latest published score summary.',
  })
  @ApiResponse({
    status: 200,
    description: 'Student dashboard metrics retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid bearer token credentials.',
  })
  @ApiResponse({
    status: 403,
    description: 'Requires STUDENT role.',
  })
  @ApiResponse({
    status: 404,
    description: 'Student record not found.',
  })
  getStudentDashboard(@CurrentUser() user: JwtPayload) {
    return this.dashboardService.getStudentDashboard(user.sub, user.schoolId!);
  }

  /**
   * Retrieve platform-wide macro analytics for Super Administrator dashboard.
   *
   * @async
   * @function getSuperAdminDashboard
   *
   * @returns {Promise<{ data: any; message: string }>} System-wide macro statistics
   *
   * @throws {UnauthorizedException} Missing or invalid bearer token
   * @throws {ForbiddenException} Requires SUPER_ADMIN role
   *
   * @example
   * // Response (200 OK):
   * {
   *   "data": {
   *     "totalSchools": 8,
   *     "activeSchools": 7,
   *     "suspendedSchools": 1,
   *     "totalStudents": 1420,
   *     "totalTeachers": 98
   *   },
   *   "message": "Platform dashboard retrieved"
   * }
   */
  @Get('super-admin')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Platform-wide stats (Super Admin only)',
    description:
      'Compiles system-wide statistics including total schools, active vs suspended tenants, and aggregate user counts across all schools.',
  })
  @ApiResponse({
    status: 200,
    description: 'Platform metrics retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid bearer token credentials.',
  })
  @ApiResponse({
    status: 403,
    description: 'Requires SUPER_ADMIN role.',
  })
  getSuperAdminDashboard() {
    return this.dashboardService.getSuperAdminDashboard();
  }
}
