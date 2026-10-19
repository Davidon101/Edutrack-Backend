/**
 * @fileoverview Global exception filter for handling HTTP and unhandled exceptions.
 * Normalizes all error responses into a consistent JSON error schema.
 * @module common/filters/http-exception
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Filter that captures exceptions across the application lifecycle and structures
 * them into uniform JSON responses.
 *
 * Maps HTTP status codes to machine-readable string error codes and extracts validation
 * errors emitted by `ValidationPipe`.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  /**
   * Processes the caught exception and formats the HTTP response.
   *
   * @param exception - The caught exception (HttpException or unknown error).
   * @param host - Arguments host providing access to HTTP execution context.
   *
   * @example
   * ```ts
   * // Global registration in main.ts:
   * app.useGlobalFilters(new HttpExceptionFilter());
   * ```
   */
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred';
    let error = 'INTERNAL_ERROR';
    let errors: string[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as any;
        message = resp.message || message;
        errors = Array.isArray(resp.message) ? resp.message : undefined;
        if (errors) message = 'Validation failed';
      }

      // Map HTTP status to error codes
      const errorMap: Record<number, string> = {
        400: 'BAD_REQUEST',
        401: 'UNAUTHORIZED',
        403: 'FORBIDDEN',
        404: 'NOT_FOUND',
        409: 'CONFLICT',
        422: 'VALIDATION_ERROR',
        429: 'TOO_MANY_REQUESTS',
        500: 'INTERNAL_ERROR',
      };
      error = errorMap[status] || 'ERROR';
    } else {
      // Log unexpected errors
      this.logger.error(
        `Unexpected error on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: Record<string, any> = {
      success: false,
      error,
      message,
      statusCode: status,
    };

    if (errors) {
      body.errors = errors;
    }

    response.status(status).json(body);
  }
}
