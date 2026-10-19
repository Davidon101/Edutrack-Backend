/**
 * @fileoverview Teachers module providing dependency injection configuration for teacher profiles,
 * account provisioning, class assignments, and CSV bulk imports.
 * @module teachers/teachers.module
 */

import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { TeachersController } from './teachers.controller';
import { TeachersService } from './teachers.service';
import { TeacherCsvController } from './csv/teacher-csv.controller';
import { TeacherCsvService } from './csv/teacher-csv.service';

/**
 * Feature module encapsulating teacher records, credential generation, and batch imports.
 * Exports `TeachersService` for cross-module consumption.
 */
@Module({
  imports: [MulterModule.register({ storage: memoryStorage() })],
  controllers: [TeachersController, TeacherCsvController],
  providers: [TeachersService, TeacherCsvService],
  exports: [TeachersService],
})
export class TeachersModule {}