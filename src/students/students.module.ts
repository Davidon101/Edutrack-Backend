import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { StudentCsvController } from './csv/student-csv.controller';
import { StudentCsvService } from './csv/student-csv.service';

@Module({
  imports: [MulterModule.register({ storage: memoryStorage() })],
  controllers: [StudentsController, StudentCsvController],
  providers: [StudentsService, StudentCsvService],
  exports: [StudentsService],
})
export class StudentsModule {}