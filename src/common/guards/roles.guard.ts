/**
 * @fileoverview Role-based access control guard.
 * Validates authenticated user roles against roles required by `@Roles()` decorator.
 * @module common/guards/roles
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Guard that enforces Role-Based Access Control (RBAC).
 *
 * Compares the roles assigned to the authenticated user on `request.user`
 * with the roles attached via the `@Roles()` decorator on the handler or class.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  /**
   * Initializes the RolesGuard.
   *
   * @param reflector - NestJS reflector for reading route role metadata.
   */
  constructor(private reflector: Reflector) {}

  /**
   * Evaluates if the authenticated user has any of the required roles for this route.
   *
   * @param context - Execution context providing HTTP request details.
   * @returns True if route is unrestricted or user has an allowed role.
   * @throws {ForbiddenException} If the user does not have any of the required roles.
   *
   * @example
   * ```ts
   * @Roles(Role.ADMIN)
   * @Get('admin-only')
   * getAdminData() {}
   * ```
   */
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() decorator — any authenticated user can access
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    const hasRole = requiredRoles.includes(user?.role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
