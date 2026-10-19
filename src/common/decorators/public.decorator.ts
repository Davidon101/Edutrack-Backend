/**
 * @fileoverview Custom route decorator to mark endpoints as publicly accessible without authentication.
 * @module common/decorators/public
 */

import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../guards/jwt-auth.guard';

/**
 * Decorator that exempts an endpoint or controller from global JWT authentication checks.
 *
 * Attaches metadata evaluated by `JwtAuthGuard`.
 *
 * @returns {CustomDecorator<string>} NestJS custom decorator.
 *
 * @example
 * ```ts
 * @Public()
 * @Get('health')
 * getHealth() {
 *   return { status: 'ok' };
 * }
 * ```
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
