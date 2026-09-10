import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PromotionsService } from './promotions.service';
import { BulkPromoteDto, SinglePromoteDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('Promotions')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get('classes')
  @ApiOperation({ summary: 'List all active classes with student counts (for promotion wizard)' })
  getClasses(@CurrentUser() user: JwtPayload) {
    return this.promotionsService.getEligibleClasses(user.schoolId!);
  }

  @Post('bulk')
  @ApiOperation({
    summary: 'Bulk promote/repeat/graduate/withdraw students',
    description: 'Processes all promotions in one call. Writes student_class_history for every student.',
  })
  bulkPromote(@CurrentUser() user: JwtPayload, @Body() dto: BulkPromoteDto) {
    return this.promotionsService.bulkPromote(user.schoolId!, user.sub, dto);
  }

  @Post('student/:id')
  @ApiOperation({ summary: 'Promote/repeat/graduate/withdraw a single student' })
  promoteStudent(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SinglePromoteDto,
  ) {
    return this.promotionsService.promoteStudent(id, user.schoolId!, user.sub, dto);
  }

  @Get('history/:studentId')
  @Roles(Role.ADMIN, Role.RECORD_ADMIN)
  @ApiOperation({ summary: 'Get full promotion history for a student' })
  getHistory(@Param('studentId') studentId: string, @CurrentUser() user: JwtPayload) {
    return this.promotionsService.getPromotionHistory(studentId, user.schoolId!);
  }
}
