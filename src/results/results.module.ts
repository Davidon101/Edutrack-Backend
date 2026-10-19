/**
 * @fileoverview Results module configuring dependency injection for continuous assessment,
 * examination score entries, class rank calculations, and result publications.
 * @module ResultsModule
 * @author Edutrack Engineering Team
 * @created 1.0.0
 */

import { Module } from '@nestjs/common';
import { ResultsController } from './results.controller';
import { ResultsService } from './results.service';
import { GradingModule } from '../grading/grading.module';

/**
 * Feature module encapsulating score entry, submission workflows, position rankings, and publishing.
 * Imports GradingModule for dynamic score evaluation.
 * @module ResultsModule
 */
@Module({
  imports: [GradingModule],
  controllers: [ResultsController],
  providers: [ResultsService],
  exports: [ResultsService],
})
export class ResultsModule {}
