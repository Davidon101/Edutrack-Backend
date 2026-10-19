/**
 * @fileoverview Users module configuring dependency injection for authenticated user profiles
 * and credential management.
 * @module UsersModule
 * @author Edutrack Engineering Team
 * @created 1.0.0
 */

import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

/**
 * Feature module encapsulating user identity retrieval, profile modifications, and password rotation.
 * @module UsersModule
 */
@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
