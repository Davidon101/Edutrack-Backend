/**
 * @fileoverview Custom route decorator for role-based access control.
 * Specifies the allowed user roles for a handler or controller.
 * @module common/decorators/roles
 */

import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

/**
 * Metadata key used to attach required roles to handlers and controllers.
 */
export const ROLES_KEY = 'roles';

/**
 * Decorator to enforce required role(s) on a route or controller.
 *
 * Evaluated at runtime by `RolesGuard`.
 *
 * @param roles - One or more user roles authorized to invoke this route.
 * @returns {CustomDecorator<string>} NestJS custom decorator.
 *
 * @example
 * ```ts
 * @Roles(Role.ADMIN, Role.RECORD_ADMIN)
 * @Get('audit-logs')
 * getAuditLogs() {}
 * ```
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
