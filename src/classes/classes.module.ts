/**
 * @fileoverview Classes module providing dependency injection configuration for school class management.
 * @module classes/classes.module
 */

import { Module } from '@nestjs/common';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';

/**
 * Feature module encapsulating class management controllers and services.
 * Exports `ClassesService` for consumption in dependent modules.
 */
@Module({
  controllers: [ClassesController],
  providers: [ClassesService],
  exports: [ClassesService],
})
export class ClassesModule {}
