import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { GradingService } from './grading.service';
import { CreateGradeDto, UpdateGradeDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('Grading')
@ApiBearerAuth()
@Controller('grading')
export class GradingController {
  constructor(private readonly gradingService: GradingService) {}

  @Get()
  @ApiOperation({ summary: 'Get school grading scale' })
  getScale(@CurrentUser() user: JwtPayload) {
    return this.gradingService.getScale(user.schoolId!);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Add a grade entry to the scale' })
  addGrade(@CurrentUser() user: JwtPayload, @Body() dto: CreateGradeDto) {
    return this.gradingService.addGrade(user.schoolId!, user.sub, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a grade entry' })
  updateGrade(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Body() dto: UpdateGradeDto) {
    return this.gradingService.updateGrade(id, user.schoolId!, user.sub, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Remove a grade entry' })
  deleteGrade(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.gradingService.deleteGrade(id, user.schoolId!, user.sub);
  }

  @Post('reset-default')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Reset to Nigerian A1–F9 default grading scale' })
  resetDefault(@CurrentUser() user: JwtPayload) {
    return this.gradingService.resetToDefault(user.schoolId!, user.sub);
  }
}
