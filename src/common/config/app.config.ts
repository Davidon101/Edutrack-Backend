/**
 * @fileoverview Application configuration factory loading settings from environment variables.
 * Provides port, CORS, JWT, file upload, and super admin defaults.
 * @module common/config/app
 */

/**
 * Interface representing the application configuration settings.
 */
export interface AppConfiguration {
  port: number;
  corsOrigins: string[];
  jwt: {
    secret: string;
    refreshSecret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
  upload: {
    maxFileSizeMb: number;
    uploadPath: string;
  };
  superAdmin: {
    email?: string;
    password?: string;
    name: string;
  };
}

/**
 * Generates application configuration mapping environment variables into typed structures.
 *
 * @returns {AppConfiguration} Structured configuration object for NestJS ConfigModule.
 *
 * @example
 * ```ts
 * import { ConfigModule } from '@nestjs/config';
 * import { appConfig } from './common/config/app.config';
 *
 * ConfigModule.forRoot({
 *   load: [appConfig],
 *   isGlobal: true,
 * });
 * ```
 */
export const appConfig = (): AppConfiguration => ({
  port: parseInt(process.env.PORT || '3000', 10),
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],

  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ||
      'fallback-refresh-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  upload: {
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
    uploadPath: process.env.UPLOAD_PATH || './uploads',
  },

  superAdmin: {
    email: process.env.SUPER_ADMIN_EMAIL,
    password: process.env.SUPER_ADMIN_PASSWORD,
    name: process.env.SUPER_ADMIN_NAME || 'Dragks Technologies',
  },
});
