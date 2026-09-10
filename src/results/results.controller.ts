import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ResultsService } from './results.service';
import { SaveScoresDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('Results')
@ApiBearerAuth()
@Controller('results')
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.RECORD_ADMIN)
  @ApiOperation({ summary: 'List all result submissions for active term (Admin view)' })
  getSubmissions(@CurrentUser() user: JwtPayload) {
    return this.resultsService.getSubmissions(user.schoolId!);
  }

  @Get('pending')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List SUBMITTED results awaiting publish' })
  getPending(@CurrentUser() user: JwtPayload) {
    return this.resultsService.getPendingSubmissions(user.schoolId!);
  }

  @Post()
  @Roles(Role.TEACHER)
  @ApiOperation({
    summary: 'Save/update draft scores. Only the class teacher can call this.',
    description:
      'Creates or updates a DRAFT submission. Term must be open. ' +
      'Scores must be whole integers. Total, grade, and remark are auto-calculated.',
  })
  saveScores(@CurrentUser() user: JwtPayload, @Body() dto: SaveScoresDto) {
    return this.resultsService.saveScores(user.sub, user.schoolId!, dto);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.RECORD_ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get full submission with all scores' })
  getSubmission(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.resultsService.getSubmissionById(id, user.schoolId!);
  }

  // ── sc-result-details (admin) + sc-subject-score-view (teacher) ────
  @Get(':id/subject/:subjectId')
  @Roles(Role.ADMIN, Role.RECORD_ADMIN, Role.TEACHER)
  @ApiOperation({
    summary: 'Get scores for one subject within a submission',
    description:
      'Used by sc-result-details (admin) and sc-subject-score-view (teacher). ' +
      'Returns all student scores for the selected subject with class average.',
  })
  getBySubject(
    @Param('id') id: string,
    @Param('subjectId') subjectId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.resultsService.getSubmissionBySubject(id, subjectId, user.schoolId!);
  }

  @Patch(':id/submit')
  @Roles(Role.TEACHER)
  @ApiOperation({
    summary: 'Submit result — locks it. Admin can now see and publish it.',
    description:
      'All active students must have at least one score before submission is allowed.',
  })
  submitResult(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.resultsService.submitResult(id, user.sub, user.schoolId!);
  }

  @Patch(':id/publish')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Publish result — students can now view. Calculates class positions.',
    description:
      'No approval or rejection in this version — admin can only publish. ' +
      'Positions are calculated at this exact point.',
  })
  publishResult(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.resultsService.publishResult(id, user.sub, user.schoolId!);
  }

  @Get(':id/positions')
  @Roles(Role.ADMIN, Role.RECORD_ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get class positions. Only available after publishing.' })
  getPositions(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.resultsService.getPositions(id, user.schoolId!);
  }
}
