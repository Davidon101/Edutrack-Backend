/**
 * @fileoverview Users service managing user profile retrieval, profile attribute updates,
 * password validation, and bcrypt password changes.
 * @module UsersService
 * @author Edutrack Engineering Team
 * @created 1.0.0
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto, ChangePasswordDto } from './dto';
import { comparePassword, hashPassword } from '../common/utils/password.util';

/**
 * Service providing user account operations, credential verification, and profile management.
 * @module UsersService
 */
@Injectable()
export class UsersService {
  /**
   * Initializes UsersService with database client.
   *
   * @param {PrismaService} prisma - Prisma database access service
   */
  constructor(private prisma: PrismaService) {}

  /**
   * Retrieve personal profile details for the authenticated user.
   *
   * @async
   * @function getMe
   *
   * @param {string} userId - UUID of the user
   * @returns {Promise<{ data: any; message: string }>} User profile record
   *
   * @throws {NotFoundException} When user is not found in database
   *
   * @example
   * const profile = await usersService.getMe('user-uuid');
   * // Returns: { data: { id: '...', fullName: 'Amaka Obi', email: '...', role: 'ADMIN' }, message: 'Profile retrieved' }
   */
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        schoolId: true,
        mustChangePassword: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return { data: user, message: 'Profile retrieved' };
  }

  /**
   * Update personal profile information (fullName and/or phone) for the authenticated user.
   *
   * Emits an audit log entry for the mutation.
   *
   * @async
   * @function updateMe
   *
   * @param {string} userId - UUID of the user
   * @param {UpdateProfileDto} dto - Updated profile attributes
   * @returns {Promise<{ data: any; message: string }>} Updated profile record
   *
   * @example
   * const updated = await usersService.updateMe('user-uuid', { phone: '08099999999' });
   * // Returns: { data: { id: '...', fullName: 'Amaka Obi', phone: '08099999999' }, message: 'Profile updated successfully' }
   */
  async updateMe(userId: string, dto: UpdateProfileDto) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { fullName: dto.fullName, phone: dto.phone },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        role: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        entity: 'User',
        entityId: userId,
        after: dto as any,
      },
    });

    return { data: updated, message: 'Profile updated successfully' };
  }

  /**
   * Change account password after verifying the existing password.
   *
   * Hashes the new password with bcrypt (cost factor 12), sets `mustChangePassword` to false,
   * and records an audit log entry.
   *
   * @async
   * @function changePassword
   *
   * @param {string} userId - UUID of the user
   * @param {ChangePasswordDto} dto - Password change payload
   * @returns {Promise<{ message: string }>} Confirmation message
   *
   * @throws {NotFoundException} When user does not exist
   * @throws {UnauthorizedException} When current password does not match
   * @throws {BadRequestException} When new password is the same as current password
   *
   * @example
   * const result = await usersService.changePassword('user-uuid', {
   *   currentPassword: 'OldPassword123!',
   *   newPassword: 'NewPassword456!'
   * });
   * // Returns: { message: 'Password changed successfully' }
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const valid = await comparePassword(dto.currentPassword, user.password);
    if (!valid)
      throw new UnauthorizedException('Current password is incorrect');

    if (dto.currentPassword === dto.newPassword)
      throw new BadRequestException(
        'New password must be different from current password',
      );

    const hashed = await hashPassword(dto.newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed, mustChangePassword: false },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'PASSWORD_CHANGE',
        entity: 'User',
        entityId: userId,
      },
    });

    return { message: 'Password changed successfully' };
  }
}
