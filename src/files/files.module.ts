/**
 * @fileoverview Files module providing dependency injection configuration for CSV import tracking
 * and error report downloads.
 * @module FilesModule
 * @author Edutrack Engineering Team
 * @created 1.0.0
 */

import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

/**
 * Feature module encapsulating file records, import monitoring, and failure artifacts.
 * @module FilesModule
 */
@Module({
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
