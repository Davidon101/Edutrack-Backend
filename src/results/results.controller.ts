/**
 * @fileoverview Results controller exposing REST endpoints for continuous assessment (CA) scoring,
 * examination entries, result submissions, approvals, rankings, and student result publishing.
 * @module ResultsController
 * @author Edutrack Engineering Team
 * @created 1.0.0
 */

import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ResultsService } from './results.service';
import { SaveScoresDto } from './dto';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';

/**
 * Controller managing continuous assessment, examination score entry, submission lifecycle,
 * class position inquiries, and administrative publication.
 * @module ResultsController
 */
@ApiTags('Results')
@ApiBearerAuth()
@Controller('results')
export class ResultsController {
  /**
   * Initializes ResultsController with results service.
   *
   * @param {ResultsService} resultsService - Service managing result workflows
   */
  constructor(private readonly resultsService: ResultsService) {}

  /**
   * List all result submissions across classes for the active term (Admin view).
   *
   * @async
   * @function getSubmissions
   *
   * @param {JwtPayload} user - Authenticated user JWT payload
   * @returns {Promise<{ data: any[]; message: string }>} Submissions list
   *
   * @throws {UnauthorizedException} Missing or invalid bearer token credentials
   * @throws {ForbiddenException} Requires ADMIN or RECORD_ADMIN role
   *
   * @example
   * // Response (200 OK):
   * {
   *   "data": [
   *     {
   *       "id": "submission-uuid",
   *       "status": "DRAFT",
   *       "class": { "id": "class-uuid", "name": "Primary 4 Gold" },
   *       "term": { "id": "term-uuid", "name": "FIRST" },
   *       "teacher": { "id": "teacher-uuid", "fullName": "Mr. John Adeyemi" }
   *     }
   *   ],
   *   "message": "Submissions retrieved"
   * }
   */
  @Get()
  @Roles(Role.ADMIN, Role.RECORD_ADMIN)
  @ApiOperation({
    summary: 'List all result submissions for active term (Admin view)',
    description:
      'Retrieves all class result submissions for the currently open term in the active academic session.',
  })
  @ApiResponse({
    status: 200,
    description: 'Submissions retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid bearer token credentials.',
  })
  @ApiResponse({
    status: 403,
    description: 'Requires ADMIN or RECORD_ADMIN role.',
  })
  getSubmissions(@CurrentUser() user: JwtPayload) {
    return this.resultsService.getSubmissions(user.schoolId!);
  }

  /**
   * List all result submissions in 'SUBMITTED' status awaiting publication.
   *
   * @async
   * @function getPending
   *
   * @param {JwtPayload} user - Authenticated user JWT payload
   * @returns {Promise<{ data: any[]; message: string }>} Pending submissions awaiting review
   *
   * @throws {UnauthorizedException} Missing or invalid bearer token credentials
   * @throws {ForbiddenException} Requires ADMIN role
   *
   * @example
   * // Response (200 OK):
   * {
   *   "data": [
   *     {
   *       "id": "submission-uuid",
   *       "status": "SUBMITTED",
   *       "class": { "name": "Primary 4 Gold" },
   *       "term": { "name": "FIRST" }
   *     }
   *   ],
   *   "message": "Pending submissions retrieved"
   * }
   */
  @Get('pending')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'List SUBMITTED results awaiting publish',
    description:
      'Retrieves all class submissions in SUBMITTED state waiting for administrative review and publication.',
  })
  @ApiResponse({
    status: 200,
    description: 'Pending submissions retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid bearer token credentials.',
  })
  @ApiResponse({
    status: 403,
    description: 'Requires ADMIN role.',
  })
  getPending(@CurrentUser() user: JwtPayload) {
    return this.resultsService.getPendingSubmissions(user.schoolId!);
  }

  /**
   * Save or update draft scores for a class.
   *
   * Restricted strictly to the assigned class teacher. Scores are saved as DRAFT.
   * Totals, grades, and remarks are auto-calculated according to school grading scale.
   *
   * @async
   * @function saveScores
   *
   * @param {JwtPayload} user - Authenticated user JWT payload
   * @param {SaveScoresDto} dto - Class and scores payload
   * @returns {Promise<{ data: any; message: string }>} Draft submission status
   *
   * @throws {BadRequestException} Validation failed, term closed, or scores exceed max limits
   * @throws {UnauthorizedException} Missing or invalid bearer token credentials
   * @throws {ForbiddenException} Caller is not the assigned class teacher
   *
   * @example
   * // Request Body:
   * {
   *   "classId": "class-uuid",
   *   "termId": "term-uuid",
   *   "scores": [
   *     { "studentId": "student-uuid", "subjectId": "subject-uuid", "ca1": 8, "exam": 55 }
   *   ]
   * }
   *
   * // Response (201 Created):
   * {
   *   "data": { "submissionId": "sub-uuid", "status": "DRAFT", "scoresEntered": 1 },
   *   "message": "Scores saved as draft"
   * }
   */
  @Post()
  @Roles(Role.TEACHER)
  @ApiOperation({
    summary: 'Save/update draft scores',
    description:
      'Creates or updates a DRAFT submission. Accessible only to the assigned class teacher. Term must be open. Auto-calculates total, WAEC grade, and remark.',
  })
  @ApiResponse({
    status: 201,
    description: 'Scores saved as draft successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed, term closed, or score exceeds maximum limits.',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid bearer token credentials.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Only the assigned class teacher can enter scores.',
  })
  @ApiResponse({
    status: 404,
    description: 'Class, term, or teacher record not found.',
  })
  saveScores(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SaveScoresDto,
  ) {
    return this.resultsService.saveScores(user.sub, user.schoolId!, dto);
  }

  /**
   * Retrieve full submission data with all student scores across all subjects.
   *
   * @async
   * @function getSubmission
   *
   * @param {string} id - UUID of the submission
   * @param {JwtPayload} user - Authenticated user JWT payload
   * @returns {Promise<{ data: any; message: string }>} Full submission record
   *
   * @throws {UnauthorizedException} Missing or invalid bearer token credentials
   * @throws {ForbiddenException} Insufficient permissions
   * @throws {NotFoundException} Submission not found
   *
   * @example
   * // Parameters:
   * // id: "submission-uuid"
   *
   * // Response (200 OK):
   * {
   *   "data": { "id": "sub-uuid", "scores": [...] },
   *   "message": "Submission retrieved"
   * }
   */
  @Get(':id')
  @Roles(Role.ADMIN, Role.RECORD_ADMIN, Role.TEACHER)
  @ApiOperation({
    summary: 'Get full submission with all scores',
    description:
      'Retrieves the complete submission object including student scores across all subjects.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the result submission',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Submission retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid bearer token credentials.',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions or role restriction violation.',
  })
  @ApiResponse({
    status: 404,
    description: 'Submission not found.',
  })
  getSubmission(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.resultsService.getSubmissionById(id, user.schoolId!);
  }

  /**
   * Retrieve student scores for a specific subject within a submission along with class subject average.
   *
   * @async
   * @function getBySubject
   *
   * @param {string} id - UUID of the submission
   * @param {string} subjectId - UUID of the subject
   * @param {JwtPayload} user - Authenticated user JWT payload
   * @returns {Promise<{ data: any; message: string }>} Subject scores and class average
   *
   * @throws {UnauthorizedException} Missing or invalid bearer token credentials
   * @throws {ForbiddenException} Insufficient permissions
   * @throws {NotFoundException} Submission or subject not found
   *
   * @example
   * // Parameters:
   * // id: "submission-uuid", subjectId: "subject-uuid"
   *
   * // Response (200 OK):
   * {
   *   "data": {
   *     "submission": { "id": "...", "status": "DRAFT" },
   *     "subject": { "name": "Mathematics", "code": "MTH" },
   *     "scores": [...],
   *     "classAverage": 74.2,
   *     "studentCount": 24
   *   },
   *   "message": "Subject scores retrieved"
   * }
   */
  @Get(':id/subject/:subjectId')
  @Roles(Role.ADMIN, Role.RECORD_ADMIN, Role.TEACHER)
  @ApiOperation({
    summary: 'Get scores for one subject within a submission',
    description:
      'Used by sc-result-details (admin) and sc-subject-score-view (teacher) to inspect student performance and class average for a subject.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the submission',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiParam({
    name: 'subjectId',
    description: 'UUID of the subject',
    example: 'b2c3d4e5-f6a7-8901-bcde-fa1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Subject scores retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid bearer token credentials.',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions or role restriction violation.',
  })
  @ApiResponse({
    status: 404,
    description: 'Submission or subject not found.',
  })
  getBySubject(
    @Param('id') id: string,
    @Param('subjectId') subjectId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.resultsService.getSubmissionBySubject(
      id,
      subjectId,
      user.schoolId!,
    );
  }

  /**
   * Finalize and lock a draft submission, moving it to 'SUBMITTED' status.
   *
   * Verifies that every active student in the class has at least one recorded score.
   *
   * @async
   * @function submitResult
   *
   * @param {string} id - UUID of the submission
   * @param {JwtPayload} user - Authenticated user JWT payload
   * @returns {Promise<{ message: string }>} Confirmation message
   *
   * @throws {BadRequestException} Submission not in DRAFT or active students have unrecorded scores
   * @throws {UnauthorizedException} Missing or invalid bearer token credentials
   * @throws {ForbiddenException} Caller is not the teacher who created the submission
   * @throws {NotFoundException} Submission not found
   *
   * @example
   * // Parameters:
   * // id: "submission-uuid"
   *
   * // Response (200 OK):
   * {
   *   "message": "Result submitted successfully. Admin can now publish it."
   * }
   */
  @Patch(':id/submit')
  @Roles(Role.TEACHER)
  @ApiOperation({
    summary: 'Submit result — locks it',
    description:
      'Transitions submission from DRAFT to SUBMITTED. Locks further score edits. Verifies all active students have scores entered.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the submission to submit',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Result submitted successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Submission is not in DRAFT status or some students have no scores.',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid bearer token credentials.',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. You can only submit your own class results.',
  })
  @ApiResponse({
    status: 404,
    description: 'Submission or teacher record not found.',
  })
  submitResult(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.resultsService.submitResult(id, user.sub, user.schoolId!);
  }

  /**
   * Publish results for student visibility and calculate class positions.
   *
   * Calculates overall student scores, computes weighted averages, and assigns class rank positions
   * before setting status to 'PUBLISHED'.
   *
   * @async
   * @function publishResult
   *
   * @param {string} id - UUID of the submission to publish
   * @param {JwtPayload} user - Authenticated user JWT payload
   * @returns {Promise<{ message: string }>} Confirmation message
   *
   * @throws {BadRequestException} Submission status is not 'SUBMITTED'
   * @throws {UnauthorizedException} Missing or invalid bearer token credentials
   * @throws {ForbiddenException} Requires ADMIN role
   * @throws {NotFoundException} Submission not found
   *
   * @example
   * // Parameters:
   * // id: "submission-uuid"
   *
   * // Response (200 OK):
   * {
   *   "message": "Result published. Students can now view their results."
   * }
   */
  @Patch(':id/publish')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Publish result — calculates class positions',
    description:
      'Publishes a SUBMITTED result. Calculates and persists class positions and averages. Allows students to view report cards.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the submission to publish',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Result published and positions calculated successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Submission status is not SUBMITTED.',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid bearer token credentials.',
  })
  @ApiResponse({
    status: 403,
    description: 'Requires ADMIN role.',
  })
  @ApiResponse({
    status: 404,
    description: 'Submission not found.',
  })
  publishResult(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.resultsService.publishResult(id, user.sub, user.schoolId!);
  }

  /**
   * Retrieve calculated class positions and student ranks for a published submission.
   *
   * @async
   * @function getPositions
   *
   * @param {string} id - UUID of the submission
   * @param {JwtPayload} user - Authenticated user JWT payload
   * @returns {Promise<{ data: any[]; message: string }>} Ranked student position list
   *
   * @throws {BadRequestException} Submission is not yet published
   * @throws {UnauthorizedException} Missing or invalid bearer token credentials
   * @throws {ForbiddenException} Insufficient permissions
   * @throws {NotFoundException} Submission not found
   *
   * @example
   * // Parameters:
   * // id: "submission-uuid"
   *
   * // Response (200 OK):
   * {
   *   "data": [
   *     {
   *       "position": 1,
   *       "totalScore": 580,
   *       "average": 82.9,
   *       "student": { "fullName": "David Okafor", "admissionNumber": "BFA/ADM/2025/001" }
   *     }
   *   ],
   *   "message": "Positions retrieved"
   * }
   */
  @Get(':id/positions')
  @Roles(Role.ADMIN, Role.RECORD_ADMIN, Role.TEACHER)
  @ApiOperation({
    summary: 'Get class positions',
    description:
      'Retrieves ranked positions and overall averages for all students in a class. Only available after the result has been published.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the submission',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Positions retrieved successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Positions are only available after publishing.',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid bearer token credentials.',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions or role restriction violation.',
  })
  @ApiResponse({
    status: 404,
    description: 'Submission not found.',
  })
  getPositions(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.resultsService.getPositions(id, user.schoolId!);
  }
}
