import { Controller, Get, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { SchoolsService } from './schools.service';
import { UpdateSchoolDto, UpdateSchoolSettingsDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Schools')
@Controller('schools')
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  // ── PUBLIC — no auth — used by sc-select-school login screen ──────
  @Public()
  @Get('public')
  @ApiOperation({ summary: 'Public school list for login screen. No auth required.' })
  @ApiQuery({ name: 'search', required: false })
  getPublicList(@Query('search') search?: string) {
    return this.schoolsService.getPublicSchoolList(search);
  }

  @ApiBearerAuth()
  @Get('me')
  @Roles(Role.ADMIN, Role.RECORD_ADMIN)
  @ApiOperation({ summary: 'Get own school profile' })
  getMySchool(@CurrentUser() user: JwtPayload) {
    return this.schoolsService.getMySchool(user.schoolId!);
  }

  @ApiBearerAuth()
  @Patch('me')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update school name, address, phone' })
  updateMySchool(@CurrentUser() user: JwtPayload, @Body() dto: UpdateSchoolDto) {
    return this.schoolsService.updateMySchool(user.schoolId!, user.sub, dto);
  }

  @ApiBearerAuth()
  @Get('me/settings')
  @Roles(Role.ADMIN, Role.RECORD_ADMIN)
  @ApiOperation({ summary: 'Get school settings' })
  getSettings(@CurrentUser() user: JwtPayload) {
    return this.schoolsService.getSettings(user.schoolId!);
  }

  @ApiBearerAuth()
  @Patch('me/settings')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update school settings' })
  updateSettings(@CurrentUser() user: JwtPayload, @Body() dto: UpdateSchoolSettingsDto) {
    return this.schoolsService.updateSettings(user.schoolId!, user.sub, dto);
  }

  @ApiBearerAuth()
  @Get()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all schools on platform (Super Admin only)' })
  getAllSchools(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.schoolsService.getAllSchools(+page, +limit);
  }

  @ApiBearerAuth()
  @Patch(':id/suspend')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Suspend a school (Super Admin only)' })
  suspend(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.schoolsService.suspendSchool(id, user.sub);
  }

  @ApiBearerAuth()
  @Patch(':id/activate')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Reactivate a school (Super Admin only)' })
  activate(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.schoolsService.activateSchool(id, user.sub);
  }
}
