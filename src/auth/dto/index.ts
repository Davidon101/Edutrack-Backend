import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsPhoneNumber,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ── Admin / Super Admin Login ─────────────────────────────────────
export class LoginDto {
  @ApiProperty({ example: 'admin@school.com' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({ example: 'Password123' })
  @IsString()
  @MinLength(1)
  password: string;
}

// ── Teacher Login — uses Staff ID ─────────────────────────────────
export class TeacherLoginDto {
  @ApiProperty({ example: 'BFA/TCH/001', description: 'Auto-generated Staff ID — login credential' })
  @IsString({ message: 'Staff ID is required' })
  staffId: string;

  @ApiProperty({ example: 'TempPass123' })
  @IsString()
  @MinLength(1)
  password: string;
}

// ── Student Login — uses Student ID ──────────────────────────────
export class StudentLoginDto {
  @ApiProperty({ example: 'BFA/STU/042', description: 'Auto-generated Student ID — login credential' })
  @IsString({ message: 'Student ID is required' })
  studentId: string;

  @ApiProperty({ example: 'TempPass456' })
  @IsString()
  @MinLength(1)
  password: string;
}

// ── Register New School ───────────────────────────────────────────
export class RegisterSchoolDto {
  @ApiProperty({ example: 'Bright Future Academy' })
  @IsString()
  @MinLength(3, { message: 'School name must be at least 3 characters' })
  schoolName: string;

  @ApiProperty({ example: 'info@brightfuture.edu.ng' })
  @IsEmail({}, { message: 'School email must be a valid email' })
  schoolEmail: string;

  @ApiProperty({ example: '12 School Lane, Abuja' })
  @IsString()
  @MinLength(5, { message: 'Address must be at least 5 characters' })
  address: string;

  @ApiPropertyOptional({ example: '08012345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'Mrs. Amaka Obi' })
  @IsString()
  @MinLength(2, { message: 'Admin name must be at least 2 characters' })
  adminName: string;

  @ApiProperty({ example: 'amaka@brightfuture.edu.ng' })
  @IsEmail({}, { message: 'Admin email must be a valid email' })
  adminEmail: string;

  @ApiPropertyOptional({ example: '08098765432' })
  @IsOptional()
  @IsString()
  adminPhone?: string;

  @ApiProperty({ example: 'SecurePassword123', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;
}

// ── Refresh Token ─────────────────────────────────────────────────
export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

// ── Forgot Password ───────────────────────────────────────────────
export class ForgotPasswordDto {
  @ApiProperty({ example: 'admin@school.com' })
  @IsEmail()
  email: string;
}

// ── Reset Password ────────────────────────────────────────────────
export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  newPassword: string;
}
