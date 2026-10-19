/**
 * @fileoverview Prisma service managing connection lifecycles, database querying,
 * and PostgreSQL pool teardowns.
 * @module PrismaService
 * @author Edutrack Engineering Team
 * @created 1.0.0
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Service extending PrismaClient with NestJS lifecycle hooks for establishing
 * and terminating database connections.
 * @module PrismaService
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  /**
   * Connect to the PostgreSQL database on module initialization.
   *
   * @async
   * @function onModuleInit
   */
  async onModuleInit() {
    await this.$connect();
  }

  /**
   * Disconnect from PostgreSQL on application shutdown.
   *
   * @async
   * @function onModuleDestroy
   */
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
