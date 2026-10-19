/**
 * @fileoverview Academic sessions and terms module configuring controllers and service providers.
 * Manages school academic calendar, session activation, and term status toggles.
 * @module SessionsModule
 * @author Edutrack Engineering Team
 * @created 1.0.0
 */

import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { TermsController } from './terms.controller';
import { SessionsService } from './sessions.service';

/**
 * Feature module encapsulating academic session and term management.
 * Exports SessionsService for cross-module usage.
 * @module SessionsModule
 */
@Module({
  controllers: [SessionsController, TermsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
