/**
 * @fileoverview Prisma module providing a global database client provider for PostgreSQL connection management.
 * @module PrismaModule
 * @author Edutrack Engineering Team
 * @created 1.0.0
 */

import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Global database module providing the single PrismaService instance to the entire application.
 * @module PrismaModule
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
