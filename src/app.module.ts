import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { appConfig } from './common/config/app.config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SchoolsModule } from './schools/schools.module';
import { SessionsModule } from './sessions/sessions.module';
import { ClassesModule } from './classes/classes.module';
import { SubjectsModule } from './subjects/subjects.module';
import { TeachersModule } from './teachers/teachers.module';
import { StudentsModule } from './students/students.module';
import { ResultsModule } from './results/results.module';
import { GradingModule } from './grading/grading.module';
import { PromotionsModule } from './promotions/promotions.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AuditModule } from './audit/audit.module';
import { FilesModule } from './files/files.module';

@Module({
  imports: [
    // Config — global, loads .env
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),

    // Rate limiting — 60 requests per minute per IP
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),

    // Scheduled jobs — used by future features (attendance lock etc.)
    ScheduleModule.forRoot(),

    // Database
    PrismaModule,

    // Feature modules
    AuthModule,
    UsersModule,
    SchoolsModule,
    SessionsModule,
    ClassesModule,
    SubjectsModule,
    TeachersModule,
    StudentsModule,
    ResultsModule,
    GradingModule,
    PromotionsModule,
    DashboardModule,
    AuditModule,
    FilesModule,
  ],
})
export class AppModule {}
