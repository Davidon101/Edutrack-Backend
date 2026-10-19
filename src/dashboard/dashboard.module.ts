/**
 * @fileoverview Dashboard module configuring dependency injection for role-based analytical dashboards.
 * @module DashboardModule
 * @author Edutrack Engineering Team
 * @created 1.0.0
 */

import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

/**
 * Feature module providing aggregate metrics for Admins, Teachers, Students, and Super Admins.
 * @module DashboardModule
 */
@Module({
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
