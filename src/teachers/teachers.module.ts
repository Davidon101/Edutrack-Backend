import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { TeachersController } from './teachers.controller';
import { TeachersService } from './teachers.service';
import { TeacherCsvController } from './csv/teacher-csv.controller';
import { TeacherCsvService } from './csv/teacher-csv.service';

@Module({
  imports: [MulterModule.register({ dest: './uploads' })],
  controllers: [TeachersController, TeacherCsvController],
  providers: [TeachersService, TeacherCsvService],
  exports: [TeachersService],
})
export class TeachersModule {}
