/**
 * @fileoverview Root application controller providing the top-level welcome and health check route at GET /.
 * Excluded from Swagger documentation and URI versioning to serve at the root domain.
 * @module AppController
 * @author Edutrack Engineering Team
 * @created 1.0.0
 */

import { Controller, Get, Version, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';
import { AppService } from './app.service';

/**
 * Controller serving the public un-versioned root welcome route.
 * @module AppController
 */
@ApiExcludeController() // keep this out of the Swagger docs — it's not an API route
@Controller()
export class AppController {
  /**
   * Initializes AppController with root app service.
   *
   * @param {AppService} appService - Service providing root welcome status
   */
  constructor(private readonly appService: AppService) {}

  /**
   * Return application welcome and status payload at true root GET /.
   *
   * Marked with `@Public()` to bypass global JWT authentication guards,
   * and `@Version(VERSION_NEUTRAL)` to exclude it from the URI `/v1` prefix.
   *
   * @function getWelcome
   * @returns {{ name: string; status: string; docs: string; baseUrl: string }} Welcome status object
   *
   * @example
   * // Response (200 OK):
   * {
   *   "name": "EduTrack AI API",
   *   "status": "ok",
   *   "docs": "/api/docs",
   *   "baseUrl": "/api/v1"
   * }
   */
  @Public()
  // Excluding the /api prefix alone isn't enough — URI versioning
  // (enableVersioning in main.ts) independently prepends /v1 to every route
  // unless explicitly opted out, which is why GET / was still 404ing.
  @Version(VERSION_NEUTRAL)
  @Get()
  getWelcome() {
    return this.appService.getWelcome();
  }
}