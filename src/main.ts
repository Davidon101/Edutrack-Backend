import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const reflector = app.get(Reflector);
  const port = config.get<number>('port', 3000);

  // ── Security ───────────────────────────────────────────────────────
  app.use(helmet());
  app.use(compression());

  // ── CORS ───────────────────────────────────────────────────────────
  // During local development, Flutter connects via local network IP
  // e.g. http://192.168.1.105:3000 — add to CORS_ORIGINS in .env
  app.enableCors({
    origin: config.get<string[]>('corsOrigins', ['*']),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // ── Versioning ─────────────────────────────────────────────────────
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // ── Global Guards (applied to every route) ─────────────────────────
  app.useGlobalGuards(
    new JwtAuthGuard(reflector),
    new RolesGuard(reflector),
  );

  // ── Global Pipes ───────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,         // Strip unknown fields
      forbidNonWhitelisted: true,
      transform: true,         // Auto-transform types (string → number etc.)
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Global Filters & Interceptors ──────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  // ── Swagger docs ───────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('EduTrack AI API')
    .setDescription(
      'School Management System REST API — Dragks Technologies\n\n' +
      '**Base URL:** /api/v1\n\n' +
      '**Auth:** Include `Authorization: Bearer <accessToken>` on all protected routes.\n\n' +
      '**Login endpoints:** `/auth/login` (Admin), `/auth/teacher/login` (Teacher), `/auth/student/login` (Student)',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(port);

  console.log(`\n🚀 EduTrack API running on http://localhost:${port}/api/v1`);
  console.log(`📚 Swagger docs:         http://localhost:${port}/api/docs`);
  console.log(`📱 For Flutter on phone: use your PC's local IP, e.g. http://192.168.x.x:${port}/api/v1\n`);
}

bootstrap();