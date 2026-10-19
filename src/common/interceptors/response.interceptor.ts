/**
 * @fileoverview Global response interceptor for standardizing HTTP responses.
 * Wraps outgoing payloads in a standard envelope unless already shaped.
 * @module common/interceptors/response
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Standard shape of API responses returned by EduTrack API.
 *
 * @template T - Type of the underlying payload contained in `data`.
 */
export interface StandardResponse<T> {
  /**
   * Indicates whether the operation succeeded.
   */
  success: boolean;

  /**
   * Main response data or payload.
   */
  data: T;

  /**
   * Human-readable status or informational message.
   */
  message?: string;

  /**
   * Optional pagination or additional metadata.
   */
  meta?: Record<string, any>;
}

/**
 * NestJS interceptor that normalizes controller return values into `StandardResponse<T>`.
 *
 * If the returned payload already includes a boolean `success` field, it passes through untouched.
 * Otherwise, it wraps the data and preserves any top-level message or meta fields.
 */
@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, StandardResponse<T>>
{
  /**
   * Intercepts execution before and after the route handler.
   *
   * @param context - Execution context for the current request.
   * @param next - Call handler providing access to the response stream.
   * @returns Observable emitting the standardized API response envelope.
   *
   * @example
   * ```ts
   * // Global registration in main.ts:
   * app.useGlobalInterceptors(new ResponseInterceptor());
   * ```
   */
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<StandardResponse<T>> {
    return next.handle().pipe(
      map((response) => {
        // If the controller already returns a shaped response, pass through
        if (response && response.success !== undefined) {
          return response;
        }

        // Otherwise wrap in standard envelope
        const { data, message, meta, ...rest } = response || {};

        return {
          success: true,
          data: data !== undefined ? data : response,
          ...(message && { message }),
          ...(meta && { meta }),
        };
      }),
    );
  }
}
