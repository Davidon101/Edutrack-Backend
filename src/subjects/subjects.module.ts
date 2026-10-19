/**
 * @fileoverview Subjects module providing dependency injection configuration for school-wide subject management.
 * @module subjects/subjects.module
 */

import { Module } from '@nestjs/common';
import { SubjectsController } from './subjects.controller';
import { SubjectsService } from './subjects.service';

/**
 * Feature module encapsulating school subject creation, sequencing, and updates.
 * Exports `SubjectsService` for grading and curriculum reporting modules.
 */
@Module({
  controllers: [SubjectsController],
  providers: [SubjectsService],
  exports: [SubjectsService],
})
export class SubjectsModule {}
