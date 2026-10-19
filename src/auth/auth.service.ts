/**
 * @fileoverview Authentication service handling school onboarding, multi-role user authentication,
 * JWT token generation/refreshing, session termination, and password recovery.
 * @module auth/auth.service
 */

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import {
  RegisterSchoolDto,
  LoginDto,
  TeacherLoginDto,
  StudentLoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto';
import {
  hashPassword,
  comparePassword,
} from '../common/utils/password.util';
import { derivePrefix } from '../common/utils/id.util';
import { DEFAULT_NIGERIAN_GRADING } from '../common/utils/grade.util';

/**
 * Service managing core authentication flows including multi-tenant registration,
 * role-specific logins (Admin, Teacher, Student), JWT management, and password recovery.
 */
@Injectable()
export class AuthService {
  /**
   * Initializes the AuthService.
   *
   * @param prisma - Prisma database service.
   * @param jwt - NestJS JWT service for token signing and verification.
   * @param config - ConfigService for retrieving security parameters.
   */
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  /**
   * Registers a new school and provisions its primary administrator account.
   *
   * Executes in a single database transaction to create the school, admin user,
   * default settings, Nigerian WAEC grading scale, academic session, default terms, and audit log.
   *
   * @param dto - School registration details and administrator credentials.
   * @returns Object containing JWT tokens, sanitized admin user, and school data.
   * @throws {ConflictException} If administrator email or school email is already registered.
   *
   * @example
   * ```ts
   * const result = await authService.registerSchool({
   *   schoolName: 'Bright Future Academy',
   *   schoolEmail: 'info@bfa.ng',
   *   address: 'Abuja, Nigeria',
   *   adminName: 'Amaka Obi',
   *   adminEmail: 'amaka@bfa.ng',
   *   password: 'Password123!',
   * });
   * ```
   */
  async registerSchool(dto: RegisterSchoolDto) {
    // Check uniqueness
    const emailTaken = await this.prisma.user.findUnique({
      where: { email: dto.adminEmail },
    });
    if (emailTaken) {
      throw new ConflictException(
        'An account with this admin email already exists',
      );
    }

    const schoolEmailTaken = await this.prisma.school.findUnique({
      where: { email: dto.schoolEmail },
    });
    if (schoolEmailTaken) {
      throw new ConflictException(
        'A school with this email is already registered',
      );
    }

    const hashedPassword = await hashPassword(dto.password);

    // Derive default ID prefix from school name
    const prefix = derivePrefix(dto.schoolName) || 'SCH';

    // Transaction: create school + admin + settings + grading + session + terms
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. School
      const school = await tx.school.create({
        data: {
          name: dto.schoolName,
          type: 'PRIMARY', // Always PRIMARY — no selector
          address: dto.address,
          email: dto.schoolEmail,
          phone: dto.phone,
        },
      });

      // 2. Admin user
      const user = await tx.user.create({
        data: {
          schoolId: school.id,
          fullName: dto.adminName,
          email: dto.adminEmail,
          phone: dto.adminPhone,
          password: hashedPassword,
          role: Role.ADMIN,
          mustChangePassword: false, // Admin chose own password at registration
        },
      });

      // 3. School settings with derived prefix
      await tx.schoolSettings.create({
        data: {
          schoolId: school.id,
          staffIdPrefix: prefix,
          studentIdPrefix: prefix,
        },
      });

      // 4. Default Nigerian grading scale (A1–F9)
      await tx.gradingScale.createMany({
        data: DEFAULT_NIGERIAN_GRADING.map((g) => ({
          ...g,
          schoolId: school.id,
        })),
      });

      // 5. Default academic session
      const session = await tx.academicSession.create({
        data: {
          schoolId: school.id,
          name: '2025/2026',
          isActive: true,
        },
      });

      // 6. Three terms — FIRST open by default
      await tx.term.createMany({
        data: [
          { sessionId: session.id, name: 'FIRST', isOpen: true },
          { sessionId: session.id, name: 'SECOND', isOpen: false },
          { sessionId: session.id, name: 'THIRD', isOpen: false },
        ],
      });

      // 7. Audit log
      await tx.auditLog.create({
        data: {
          schoolId: school.id,
          userId: user.id,
          action: 'CREATE',
          entity: 'School',
          entityId: school.id,
          after: { schoolName: school.name, adminEmail: user.email },
        },
      });

      return { school, user };
    });

    const tokens = await this.generateTokens(
      result.user.id,
      result.user.role,
      result.school.id,
      result.user.email,
    );

    return {
      data: {
        ...tokens,
        user: this.sanitizeUser(result.user),
        school: result.school,
      },
      message: 'School registered successfully',
    };
  }

  /**
   * Authenticates an administrator (SUPER_ADMIN, ADMIN, or RECORD_ADMIN) using email and password.
   *
   * @param dto - Login credentials containing email and password.
   * @returns JWT access/refresh tokens, sanitized user profile, and school entity.
   * @throws {UnauthorizedException} If credentials are invalid, account is inactive, or role mismatch occurs.
   *
   * @example
   * ```ts
   * const authResponse = await authService.login({
   *   email: 'admin@school.com',
   *   password: 'Password123',
   * });
   * ```
   */
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { school: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Only SUPER_ADMIN, ADMIN, RECORD_ADMIN use this endpoint
    if (
      user.role !== Role.SUPER_ADMIN &&
      user.role !== Role.ADMIN &&
      user.role !== Role.RECORD_ADMIN
    ) {
      throw new UnauthorizedException(
        'Please use the correct login endpoint for your role',
      );
    }

    const valid = await comparePassword(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        schoolId: user.schoolId,
        userId: user.id,
        action: 'LOGIN',
        entity: 'User',
        entityId: user.id,
      },
    });

    const tokens = await this.generateTokens(
      user.id,
      user.role,
      user.schoolId,
      user.email,
    );

    return {
      data: {
        ...tokens,
        user: this.sanitizeUser(user),
        school: user.school,
      },
      message: 'Login successful',
    };
  }

  /**
   * Authenticates a teacher using their auto-generated Staff ID and password.
   *
   * @param dto - Teacher login credentials containing staffId and password.
   * @returns JWT tokens, sanitized profile with staff details and assigned class, and school object.
   * @throws {UnauthorizedException} If Staff ID is invalid, password does not match, or user account is disabled.
   *
   * @example
   * ```ts
   * const res = await authService.teacherLogin({
   *   staffId: 'BFA/TCH/001',
   *   password: 'TempPassword123',
   * });
   * ```
   */
  async teacherLogin(dto: TeacherLoginDto) {
    // Look up by staffId
    const teacher = await this.prisma.teacher.findUnique({
      where: { staffId: dto.staffId },
      include: {
        user: { include: { school: true } },
        classesAsTeacher: { select: { id: true, name: true } },
      },
    });

    if (!teacher || !teacher.isActive) {
      throw new UnauthorizedException('Invalid Staff ID or password');
    }

    const valid = await comparePassword(dto.password, teacher.user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid Staff ID or password');
    }

    if (!teacher.user.isActive) {
      throw new UnauthorizedException(
        'Your account has been deactivated. Contact your admin.',
      );
    }

    await this.prisma.user.update({
      where: { id: teacher.userId },
      data: { lastLoginAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        schoolId: teacher.schoolId,
        userId: teacher.userId,
        action: 'LOGIN',
        entity: 'Teacher',
        entityId: teacher.id,
      },
    });

    const tokens = await this.generateTokens(
      teacher.userId,
      Role.TEACHER,
      teacher.schoolId,
      teacher.user.email || '',
    );

    return {
      data: {
        ...tokens,
        user: {
          ...this.sanitizeUser(teacher.user),
          staffId: teacher.staffId,
          teacherId: teacher.id,
          assignedClass: teacher.classesAsTeacher[0] || null,
        },
        school: teacher.user.school,
      },
      message: 'Login successful',
    };
  }

  /**
   * Authenticates a student using their auto-generated Student ID and password.
   *
   * Allows even inactive or graduated students to view historical academic records.
   *
   * @param dto - Student login credentials containing studentId and password.
   * @returns JWT tokens, sanitized user profile with student identity and current class.
   * @throws {UnauthorizedException} If student ID is not found, password mismatches, or user account is disabled.
   *
   * @example
   * ```ts
   * const res = await authService.studentLogin({
   *   studentId: 'BFA/STU/042',
   *   password: 'TempPassword456',
   * });
   * ```
   */
  async studentLogin(dto: StudentLoginDto) {
    // Look up by studentId (login credential — separate from admissionNumber)
    const student = await this.prisma.student.findUnique({
      where: { studentId: dto.studentId },
      include: {
        user: { include: { school: true } },
        class: { select: { id: true, name: true } },
      },
    });

    if (!student || !student.user) {
      throw new UnauthorizedException('Invalid Student ID or password');
    }

    const valid = await comparePassword(dto.password, student.user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid Student ID or password');
    }

    // Note: Student status does NOT block login — even WITHDRAWN/GRADUATED/DEACTIVATED
    // students can log in to view their historical records

    if (!student.user.isActive) {
      throw new UnauthorizedException(
        'Your account has been deactivated. Contact your admin.',
      );
    }

    await this.prisma.user.update({
      where: { id: student.userId! },
      data: { lastLoginAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        schoolId: student.schoolId,
        userId: student.userId,
        action: 'LOGIN',
        entity: 'Student',
        entityId: student.id,
      },
    });

    const tokens = await this.generateTokens(
      student.userId!,
      Role.STUDENT,
      student.schoolId,
      student.user.email || '',
    );

    return {
      data: {
        ...tokens,
        user: {
          ...this.sanitizeUser(student.user),
          studentId: student.studentId,
          admissionNumber: student.admissionNumber,
          class: student.class,
        },
        school: student.user.school,
      },
      message: 'Login successful',
    };
  }

  /**
   * Refreshes access and refresh tokens using a valid refresh token.
   *
   * @param dto - Payload containing the current refreshToken string.
   * @returns Object with newly minted accessToken and refreshToken pair.
   * @throws {UnauthorizedException} If token signature fails, account is inactive, or token mismatch occurs.
   *
   * @example
   * ```ts
   * const tokens = await authService.refresh({ refreshToken: '...' });
   * ```
   */
  async refresh(dto: RefreshTokenDto) {
    try {
      const payload = this.jwt.verify(dto.refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          role: true,
          schoolId: true,
          email: true,
          isActive: true,
          refreshToken: true,
        },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Verify stored refresh token matches
      if (!user.refreshToken) {
        throw new UnauthorizedException('Session expired. Please log in again.');
      }

      const matches = await comparePassword(
        dto.refreshToken,
        user.refreshToken,
      );
      if (!matches) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return {
        data: await this.generateTokens(
          user.id,
          user.role,
          user.schoolId,
          user.email,
        ),
        message: 'Token refreshed',
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Terminates active session by invalidating the user's stored refresh token and writing an audit log.
   *
   * @param userId - UUID of the user logging out.
   * @returns Object containing logout status message.
   *
   * @example
   * ```ts
   * await authService.logout('user-uuid');
   * ```
   */
  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'LOGOUT',
        entity: 'User',
        entityId: userId,
      },
    });

    return { message: 'Logged out successfully' };
  }

  /**
   * Generates a password reset token for the specified user email address.
   *
   * Silently returns success regardless of whether the email exists to avoid account enumeration.
   *
   * @param dto - Payload containing user email.
   * @returns Generic confirmation message.
   *
   * @example
   * ```ts
   * await authService.forgotPassword({ email: 'user@school.com' });
   * ```
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Silently succeed — don't reveal if email exists
    if (user) {
      const token = uuid();
      const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordResetToken: token, passwordResetExpiry: expiry },
      });

      // TODO: Send email with reset link when email service is added
      // For now, token is returned in development only
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV] Password reset token for ${dto.email}: ${token}`);
      }
    }

    return {
      message: 'If that email exists, a reset link has been sent',
    };
  }

  /**
   * Resets a user account password using a validated reset token.
   *
   * @param dto - Token and new plaintext password payload.
   * @returns Object containing confirmation message.
   * @throws {BadRequestException} If the token is invalid or expired.
   *
   * @example
   * ```ts
   * await authService.resetPassword({
   *   token: 'valid-reset-token',
   *   newPassword: 'BrandNewPassword123!',
   * });
   * ```
   */
  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: dto.token,
        passwordResetExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Reset token is invalid or has expired');
    }

    const hashedPassword = await hashPassword(dto.newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null,
        mustChangePassword: false,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_CHANGE',
        entity: 'User',
        entityId: user.id,
      },
    });

    return { message: 'Password updated successfully' };
  }

  /**
   * Helper generating access and refresh JWTs and persisting hashed refresh token.
   *
   * @param userId - User ID subject.
   * @param role - System role of the user.
   * @param schoolId - School ID or null.
   * @param email - User email.
   * @returns Signed access and refresh tokens.
   */
  private async generateTokens(
    userId: string,
    role: Role,
    schoolId: string | null,
    email: string,
  ) {
    const payload = { sub: userId, role, schoolId, email };

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get<string>('jwt.secret'),
      expiresIn: this.config.get<string>('jwt.expiresIn'),
    });

    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get<string>('jwt.refreshSecret'),
      expiresIn: this.config.get<string>('jwt.refreshExpiresIn'),
    });

    // Store hashed refresh token
    const hashedRefresh = await hashPassword(refreshToken);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashedRefresh },
    });

    return { accessToken, refreshToken };
  }

  /**
   * Strips sensitive security credential attributes before sending user object to clients.
   *
   * @param user - Raw database user record.
   * @returns Sanitized user representation.
   */
  private sanitizeUser(user: any) {
    const {
      password,
      refreshToken,
      passwordResetToken,
      passwordResetExpiry,
      ...safe
    } = user;
    return safe;
  }
}
