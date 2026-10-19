/**
 * @fileoverview Passport JWT authentication strategy.
 * Extracts bearer token from requests, verifies signature, and looks up active user in database.
 * @module auth/strategies/jwt
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Passport strategy implementing JWT bearer token verification.
 *
 * Automatically intercepts requests, extracts the JWT token from the Authorization header,
 * verifies signature against configured secret, and validates user account status in PostgreSQL.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  /**
   * Initializes the JwtStrategy with configuration options.
   *
   * @param config - NestJS ConfigService for reading secret keys.
   * @param prisma - PrismaService database client.
   */
  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.secret'),
    });
  }

  /**
   * Validates decoded JWT claims and ensures user account remains active.
   *
   * @param payload - Decoded JWT payload containing subject ID, role, schoolId, and email.
   * @returns Authorized user context attached to `request.user`.
   * @throws {UnauthorizedException} If user does not exist or has been deactivated.
   *
   * @example
   * ```ts
   * const user = await jwtStrategy.validate({
   *   sub: 'user-uuid',
   *   role: 'ADMIN',
   *   schoolId: 'school-uuid',
   *   email: 'admin@school.com',
   * });
   * ```
   */
  async validate(payload: {
    sub: string;
    role: string;
    schoolId: string | null;
    email: string;
  }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        isActive: true,
        role: true,
        schoolId: true,
        email: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account is not active');
    }

    return {
      sub: user.id,
      role: user.role,
      schoolId: user.schoolId,
      email: user.email,
    };
  }
}
