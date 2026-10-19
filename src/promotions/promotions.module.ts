/**
 * @fileoverview Promotions module configuring dependency injection for student promotion,
 * repetition, graduation, and withdrawal workflows.
 * @module PromotionsModule
 * @author Edutrack Engineering Team
 * @created 1.0.0
 */

import { Module } from '@nestjs/common';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';

/**
 * Feature module encapsulating student cohort progression and promotion management.
 * @module PromotionsModule
 */
@Module({
  controllers: [PromotionsController],
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}
