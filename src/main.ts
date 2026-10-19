/**
 * @fileoverview Main entry point of the EduTrack API server.
 * Bootstraps NestJS, configures Helmet CSP (allowing cdnjs for Swagger UI), CORS,
 * URI versioning, global pipes, global filters, global JWT/Roles guards, and custom CDN Swagger UI.
 * @module Bootstrap
 * @author Edutrack Engineering Team
 * @created 1.0.0
 */

import { NestFactory, Reflector } from '@nestjs/core';
import { RequestMethod, ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

/**
 * Bootstraps the application, registers middleware, and starts HTTP listener.
 *
 * @async
 * @function bootstrap
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const reflector = app.get(Reflector);
  const port = config.get<number>('port', 3000);

  // ── Security ───────────────────────────────────────────────────────
  // Helmet's default CSP only allows 'self', which silently blocks the
  // cdnjs-hosted Swagger UI assets loaded by the /api/docs page below
  // (script/style requests get blocked, SwaggerUIBundle never loads,
  // resulting in a blank page with no visible server-side error).
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'script-src': ["'self'", "'unsafe-inline'", 'cdnjs.cloudflare.com'],
          'style-src': ["'self'", "'unsafe-inline'", 'cdnjs.cloudflare.com'],
          'img-src': ["'self'", 'data:', 'cdnjs.cloudflare.com'],
          'connect-src': ["'self'"],
        },
      },
    }),
  );
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
  app.setGlobalPrefix('api', {
    exclude: [{ path: '/', method: RequestMethod.GET }],
  });
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

  // Vercel's build only bundles statically-imported files, so the
  // swagger-ui-dist assets (css/js/favicon) that @nestjs/swagger's built-in
  // UI serves via sendFile() at runtime get dropped from the deployed
  // function — every request for them 404s. customCssUrl/customJs don't fix
  // this: they only *add* extra tags, they don't replace the hardcoded local
  // ones. So: disable the built-in UI (this still exposes the raw JSON spec
  // at /api/docs-json) and serve a small hand-written HTML page instead that
  // loads Swagger UI entirely from CDN — nothing local for Vercel to drop.
  SwaggerModule.setup('api/docs', app, document, {
    swaggerUiEnabled: false,
    jsonDocumentUrl: 'api/docs-json',
  });

  const swaggerCdnVersion = '5.17.14';
  const swaggerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>EduTrack AI API Docs</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/${swaggerCdnVersion}/swagger-ui.min.css" />
  <style>body { margin: 0; }</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/${swaggerCdnVersion}/swagger-ui-bundle.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/${swaggerCdnVersion}/swagger-ui-standalone-preset.min.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '/api/docs-json',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: 'StandaloneLayout',
        persistAuthorization: true,
      });
    };
  </script>
</body>
</html>`;

  app.getHttpAdapter().get('/api/docs', (_req, res) => {
    res.type('html').send(swaggerHtml);
  });

  await app.listen(port);

  console.log(`\n🚀 EduTrack API running on http://localhost:${port}/api/v1`);
  console.log(`📚 Swagger docs:         http://localhost:${port}/api/docs`);
  console.log(`📱 For Flutter on phone: use your PC's local IP, e.g. http://192.168.x.x:${port}/api/v1\n`);
}

bootstrap();