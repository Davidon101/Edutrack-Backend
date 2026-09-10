import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('Sessions & Terms')
@ApiBearerAuth()
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.RECORD_ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'List all sessions for the school' })
  getSessions(@CurrentUser() user: JwtPayload) {
    return this.sessionsService.getSessions(user.schoolId!);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new academic session. Auto-creates 3 terms.' })
  createSession(@CurrentUser() user: JwtPayload, @Body() dto: CreateSessionDto) {
    return this.sessionsService.createSession(user.schoolId!, user.sub, dto);
  }

  @Patch(':id/activate')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Set a session as the active session' })
  activateSession(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.sessionsService.activateSession(id, user.schoolId!, user.sub);
  }
}
