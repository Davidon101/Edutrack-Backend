import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  RegisterSchoolDto,
  LoginDto,
  TeacherLoginDto,
  StudentLoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── Register new school ────────────────────────────────────────────
  @Public()
  @Post('register')
  @ApiOperation({
    summary: 'Register a new school',
    description:
      'Creates school + admin account + default settings + default grading scale + session + terms in one transaction',
  })
  register(@Body() dto: RegisterSchoolDto) {
    return this.authService.registerSchool(dto);
  }

  // ── Admin / Super Admin / Record Admin login ───────────────────────
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin login (email + password)',
    description: 'For ADMIN, SUPER_ADMIN, and RECORD_ADMIN roles only',
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // ── Teacher login (Staff ID + password) ───────────────────────────
  @Public()
  @Post('teacher/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Teacher login (Staff ID + password)',
    description:
      'Teachers log in with their auto-generated Staff ID (e.g. BFA/TCH/001), not their email',
  })
  teacherLogin(@Body() dto: TeacherLoginDto) {
    return this.authService.teacherLogin(dto);
  }

  // ── Student login (Student ID + password) ──────────────────────────
  @Public()
  @Post('student/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Student login (Student ID + password)',
    description:
      'Students log in with their auto-generated Student ID (e.g. BFA/STU/001). Note: Student ID is different from Admission Number.',
  })
  studentLogin(@Body() dto: StudentLoginDto) {
    return this.authService.studentLogin(dto);
  }

  // ── Refresh token ─────────────────────────────────────────────────
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  // ── Logout ────────────────────────────────────────────────────────
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout — invalidates refresh token' })
  logout(@CurrentUser() user: JwtPayload) {
    return this.authService.logout(user.sub);
  }

  // ── Forgot password ───────────────────────────────────────────────
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset link' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  // ── Reset password ────────────────────────────────────────────────
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token from email' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
