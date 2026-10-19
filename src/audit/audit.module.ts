/**
 * @fileoverview Audit module configuring dependency injection for system change tracking
 * and immutable event logging.
 * @module AuditModule
 * @author Edutrack Engineering Team
 * @created 1.0.0
 */

import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

/**
 * Feature module encapsulating school audit trail queries and security log access.
 * @module AuditModule
 */
@Module({
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
