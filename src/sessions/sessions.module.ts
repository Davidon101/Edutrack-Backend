import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { TermsController } from './terms.controller';
import { SessionsService } from './sessions.service';

@Module({
  controllers: [SessionsController, TermsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
