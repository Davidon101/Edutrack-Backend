/**
 * @fileoverview Root application module composing configuration, rate limiting,
 * task scheduling, database access, and all domain feature modules.
 * @module AppModule
 * @author Edutrack Engineering Team
 * @created 1.0.0
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
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
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { PrismaThrottlerStorage } from './common/throttler/prisma-throttler.storage';

/**
 * Root NestJS application module orchestrating all imports, services, and route controllers.
 * @module AppModule
 */
@Module({
  controllers: [AppController],
  providers: [
    AppService,
    // ThrottlerGuard must be registered as a guard, otherwise the limits below do nothing.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  imports: [
    // Config — global, loads .env
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),

    // Rate limiting — 60 requests per minute per IP, counted in PostgreSQL so the
    // limit holds across serverless instances. Login/password routes are stricter
    // (see @Throttle in auth.controller.ts).
    ThrottlerModule.forRootAsync({
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => ({
        throttlers: [{ ttl: 60000, limit: 60 }],
        storage: new PrismaThrottlerStorage(prisma),
      }),
    }),

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