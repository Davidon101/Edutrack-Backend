/**
 * @fileoverview Custom parameter decorators for extracting JWT user payload and school ID from requests.
 * @module common/decorators/current-user
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Shape of the payload decoded from a verified JWT token.
 */
export interface JwtPayload {
  /**
   * Unique user ID (subject).
   */
  sub: string;

  /**
   * User role in the system.
   */
  role: string;

  /**
   * ID of the associated school, or null for super administrators.
   */
  schoolId: string | null;

  /**
   * User's registered email address.
   */
  email: string;
}

/**
 * Parameter decorator to inject the authenticated user's JWT payload from `request.user`.
 *
 * @param _data - Unused data parameter.
 * @param ctx - NestJS execution context.
 * @returns {JwtPayload} The authenticated user payload.
 *
 * @example
 * ```ts
 * @Get('profile')
 * getProfile(@CurrentUser() user: JwtPayload) {
 *   return user;
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

/**
 * Parameter decorator to inject the `schoolId` directly from the authenticated user's JWT payload.
 *
 * @param _data - Unused data parameter.
 * @param ctx - NestJS execution context.
 * @returns {string | undefined} School ID associated with user, or undefined if not set.
 *
 * @example
 * ```ts
 * @Get('classes')
 * getClasses(@SchoolId() schoolId: string) {
 *   return this.classesService.getClasses(schoolId);
 * }
 * ```
 */
export const SchoolId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.schoolId;
  },
);
