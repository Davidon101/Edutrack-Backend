/**
 * @fileoverview Root application service providing welcoming status diagnostics.
 * @module AppService
 * @author Edutrack Engineering Team
 * @created 1.0.0
 */

import { Injectable } from '@nestjs/common';

/**
 * Service returning base metadata and welcome information for the root application endpoint.
 * @module AppService
 */
@Injectable()
export class AppService {
  /**
   * Return service health name, status, documentation URL, and API base route.
   *
   * @function getWelcome
   * @returns {{ name: string; status: string; docs: string; baseUrl: string }} Welcome payload
   *
   * @example
   * const info = appService.getWelcome();
   * // Returns: { name: 'EduTrack AI API', status: 'ok', docs: '/api/docs', baseUrl: '/api/v1' }
   */
  getWelcome() {
    return {
      name: 'EduTrack AI API',
      status: 'ok',
      docs: '/api/docs',
      baseUrl: '/api/v1',
    };
  }
}