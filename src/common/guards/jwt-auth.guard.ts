/**
 * @fileoverview Authentication guard that enforces JWT bearer token validation.
 * Bypasses checks if route handlers or controller classes are decorated with `@Public()`.
 * @module common/guards/jwt-auth
 */

import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

/**
 * Metadata key used to determine if a route is public.
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Global authentication guard leveraging Passport JWT strategy.
 *
 * Inspects execution context for `@Public()` metadata flag. If present, authentication
 * is bypassed; otherwise, falls back to default Passport JWT validation.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /**
   * Initializes the JwtAuthGuard.
   *
   * @param reflector - NestJS reflector for reading route metadata.
   */
  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * Determines whether the current request is authorized to proceed.
   *
   * @param context - Current execution context providing details about the handler and request.
   * @returns A boolean, Promise, or Observable resolving to true if authorized, false otherwise.
   *
   * @example
   * ```ts
   * // Applied globally in main.ts or at controller level:
   * app.useGlobalGuards(new JwtAuthGuard(reflector));
   * ```
   */
  canActivate(context: ExecutionContext) {
    // Allow routes marked with @Public() decorator
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
