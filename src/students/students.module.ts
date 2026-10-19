/**
 * @fileoverview Students module providing dependency injection configuration for student records,
 * profiles, academic history, results, and batch CSV imports.
 * @module students/students.module
 */

import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { StudentCsvController } from './csv/student-csv.controller';
import { StudentCsvService } from './csv/student-csv.service';

/**
 * Feature module encapsulating student management, academic tracking, and CSV onboarding.
 * Exports `StudentsService` for cross-module usage.
 */
@Module({
  imports: [MulterModule.register({ storage: memoryStorage() })],
  controllers: [StudentsController, StudentCsvController],
  providers: [StudentsService, StudentCsvService],
  exports: [StudentsService],
})
export class StudentsModule {}