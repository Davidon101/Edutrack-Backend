import {
  Injectable, NotFoundException, BadRequestException, UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto, ChangePasswordDto } from './dto';
import { comparePassword, hashPassword } from '../common/utils/password.util';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, fullName: true, email: true, phone: true,
        role: true, schoolId: true, mustChangePassword: true,
        lastLoginAt: true, createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return { data: user, message: 'Profile retrieved' };
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { fullName: dto.fullName, phone: dto.phone },
      select: { id: true, fullName: true, phone: true, email: true, role: true },
    });

    await this.prisma.auditLog.create({
      data: { userId, action: 'UPDATE', entity: 'User', entityId: userId, after: dto as any },
    });

    return { data: updated, message: 'Profile updated successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const valid = await comparePassword(dto.currentPassword, user.password);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');

    if (dto.currentPassword === dto.newPassword)
      throw new BadRequestException('New password must be different from current password');

    const hashed = await hashPassword(dto.newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed, mustChangePassword: false },
    });

    await this.prisma.auditLog.create({
      data: { userId, action: 'PASSWORD_CHANGE', entity: 'User', entityId: userId },
    });

    return { message: 'Password changed successfully' };
  }
}
