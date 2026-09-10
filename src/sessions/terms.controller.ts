import { Controller, Get, Patch, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { SessionsService } from './sessions.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('Sessions & Terms')
@ApiBearerAuth()
@Controller('terms')
export class TermsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.RECORD_ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'List terms for the active session' })
  getTerms(@CurrentUser() user: JwtPayload) {
    return this.sessionsService.getTerms(user.schoolId!);
  }

  @Patch(':id/open')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Open a term — allows result submission. Closes all other terms.' })
  openTerm(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.sessionsService.openTerm(id, user.schoolId!, user.sub);
  }

  @Patch(':id/close')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Close a term — blocks result submission' })
  closeTerm(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.sessionsService.closeTerm(id, user.schoolId!, user.sub);
  }
}
