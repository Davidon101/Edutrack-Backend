/**
 * @fileoverview Schools module providing dependency injection configuration for school administration,
 * profile management, and global platform school listings.
 * @module schools/schools.module
 */

import { Module } from '@nestjs/common';
import { SchoolsController } from './schools.controller';
import { SchoolsService } from './schools.service';

/**
 * Module encapsulating school management controllers and providers.
 * Exports `SchoolsService` for cross-module usage.
 */
@Module({
  controllers: [SchoolsController],
  providers: [SchoolsService],
  exports: [SchoolsService],
})
export class SchoolsModule {}
