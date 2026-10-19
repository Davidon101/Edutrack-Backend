/**
 * @fileoverview Grading module configuring dependency injection for grading scales,
 * score calculations, and default Nigerian WAEC scale resets.
 * @module GradingModule
 * @author Edutrack Engineering Team
 * @created 1.0.0
 */

import { Module } from '@nestjs/common';
import { GradingController } from './grading.controller';
import { GradingService } from './grading.service';

/**
 * Feature module encapsulating school grading scales and score thresholds.
 * Exports GradingService for score calculation integration.
 * @module GradingModule
 */
@Module({
  controllers: [GradingController],
  providers: [GradingService],
  exports: [GradingService],
})
export class GradingModule {}
