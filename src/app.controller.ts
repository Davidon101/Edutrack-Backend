import { Controller, Get, Version, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';
import { AppService } from './app.service';

@ApiExcludeController() // keep this out of the Swagger docs — it's not an API route
@Controller()
@Version(VERSION_NEUTRAL) // excluding the /api prefix alone isn't enough — URI
// versioning (enableVersioning in main.ts) independently prepends /v1 to every
// route unless explicitly opted out, which is why GET / was still 404ing.
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getWelcome() {
    return this.appService.getWelcome();
  }
}