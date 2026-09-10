import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GradingService } from '../grading/grading.service';
import { SaveScoresDto } from './dto';
import { calculateGrade, calculateTotal } from '../common/utils/grade.util';

@Injectable()
export class ResultsService {
  constructor(
    private prisma: PrismaService,
    private gradingService: GradingService,
  ) {}

  // ── List all submissions for active term (admin view) ──────────────
  async getSubmissions(schoolId: string) {
    const activeSession = await this.prisma.academicSession.findFirst({
      where: { schoolId, isActive: true },
      include: { terms: { where: { isOpen: true }, take: 1 } },
    });

    const submissions = await this.prisma.resultSubmission.findMany({
      where: {
        class: { schoolId },
        ...(activeSession?.terms[0] ? { termId: activeSession.terms[0].id } : {}),
      },
      include: {
        class: { select: { id: true, name: true } },
        term: { select: { id: true, name: true } },
        teacher: { include: { user: { select: { fullName: true } } } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return {
      data: submissions.map((s) => ({
        id: s.id, status: s.status,
        class: s.class, term: s.term,
        teacher: { id: s.teacherId, fullName: s.teacher.user.fullName },
        submittedAt: s.submittedAt, publishedAt: s.publishedAt,
      })),
      message: 'Submissions retrieved',
    };
  }

  // ── Get pending submissions (SUBMITTED, not yet published) ─────────
  async getPendingSubmissions(schoolId: string) {
    const submissions = await this.prisma.resultSubmission.findMany({
      where: { class: { schoolId }, status: 'SUBMITTED' },
      include: {
        class: { select: { id: true, name: true } },
        term: { select: { id: true, name: true } },
        teacher: { include: { user: { select: { fullName: true } } } },
      },
      orderBy: { submittedAt: 'desc' },
    });

    return { data: submissions, message: 'Pending submissions retrieved' };
  }

  // ── Get full submission with all scores ────────────────────────────
  async getSubmissionById(submissionId: string, schoolId: string) {
    const submission = await this.prisma.resultSubmission.findFirst({
      where: { id: submissionId, class: { schoolId } },
      include: {
        class: { select: { id: true, name: true } },
        term: { select: { id: true, name: true } },
        teacher: { include: { user: { select: { fullName: true } } } },
        scores: {
          include: {
            student: { select: { id: true, fullName: true, admissionNumber: true, studentId: true } },
            subject: { select: { id: true, name: true, code: true, displayOrder: true } },
          },
          orderBy: { subject: { displayOrder: 'asc' } },
        },
      },
    });

    if (!submission) throw new NotFoundException('Submission not found');
    return { data: submission, message: 'Submission retrieved' };
  }

  // ── Save/update draft scores ───────────────────────────────────────
  // Only the class teacher of the class can call this
  async saveScores(teacherUserId: string, schoolId: string, dto: SaveScoresDto) {
    // Get teacher record
    const teacher = await this.prisma.teacher.findFirst({
      where: { userId: teacherUserId, schoolId },
    });
    if (!teacher) throw new NotFoundException('Teacher not found');

    // Verify teacher is the class teacher of the submitted class
    const cls = await this.prisma.class.findFirst({
      where: { id: dto.classId, schoolId, isActive: true },
    });
    if (!cls) throw new NotFoundException('Class not found');
    if (cls.classTeacherId !== teacher.id) {
      throw new ForbiddenException(
        'Only the assigned class teacher can enter results for this class',
      );
    }

    // Verify term is open
    const term = await this.prisma.term.findFirst({
      where: { id: dto.termId, session: { schoolId, isActive: true } },
    });
    if (!term) throw new NotFoundException('Term not found');
    if (!term.isOpen) {
      throw new BadRequestException(
        'This term is closed. Contact your admin to open the term before entering results.',
      );
    }

    // Get school settings for score validation
    const settings = await this.prisma.schoolSettings.findUnique({ where: { schoolId } });
    if (!settings) throw new NotFoundException('School settings not found');

    // Get grading scale for auto-grade calculation
    const gradingScales = await this.gradingService.getScaleForSchool(schoolId);

    // Get or create the submission
    let submission = await this.prisma.resultSubmission.findFirst({
      where: { classId: dto.classId, termId: dto.termId },
    });

    if (submission && submission.status !== 'DRAFT') {
      throw new BadRequestException(
        'This result has already been submitted and cannot be edited',
      );
    }

    if (!submission) {
      submission = await this.prisma.resultSubmission.create({
        data: { teacherId: teacher.id, classId: dto.classId, termId: dto.termId, status: 'DRAFT' },
      });
    }

    // Validate and upsert scores
    for (const entry of dto.scores) {
      // Validate scores against school maximums
      if (entry.ca1 !== undefined && entry.ca1 > settings.ca1Max)
        throw new BadRequestException(`CA1 score ${entry.ca1} exceeds maximum of ${settings.ca1Max}`);
      if (entry.ca2 !== undefined && entry.ca2 > settings.ca2Max)
        throw new BadRequestException(`CA2 score ${entry.ca2} exceeds maximum of ${settings.ca2Max}`);
      if (entry.ca3 !== undefined && entry.ca3 > settings.ca3Max)
        throw new BadRequestException(`CA3 score ${entry.ca3} exceeds maximum of ${settings.ca3Max}`);
      if (entry.ca4 !== undefined && entry.ca4 > settings.ca4Max)
        throw new BadRequestException(`CA4 score ${entry.ca4} exceeds maximum of ${settings.ca4Max}`);
      if (entry.exam !== undefined && entry.exam > settings.examMax)
        throw new BadRequestException(`Exam score ${entry.exam} exceeds maximum of ${settings.examMax}`);

      // Auto-calculate total, grade, remark
      const total = calculateTotal(
        entry.ca1 ?? null, entry.ca2 ?? null,
        entry.ca3 ?? null, entry.ca4 ?? null,
        entry.exam ?? null,
      );
      const gradeResult = calculateGrade(total, gradingScales);

      await this.prisma.score.upsert({
        where: {
          submissionId_studentId_subjectId: {
            submissionId: submission.id,
            studentId: entry.studentId,
            subjectId: entry.subjectId,
          },
        },
        update: {
          ca1: entry.ca1, ca2: entry.ca2, ca3: entry.ca3, ca4: entry.ca4,
          exam: entry.exam, total,
          grade: gradeResult?.grade, remark: gradeResult?.remark,
        },
        create: {
          submissionId: submission.id,
          studentId: entry.studentId, subjectId: entry.subjectId,
          ca1: entry.ca1, ca2: entry.ca2, ca3: entry.ca3, ca4: entry.ca4,
          exam: entry.exam, total,
          grade: gradeResult?.grade, remark: gradeResult?.remark,
        },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        schoolId, userId: teacherUserId,
        action: 'UPDATE', entity: 'ResultSubmission', entityId: submission.id,
        after: { scoresEntered: dto.scores.length } as any,
      },
    });

    return { data: { submissionId: submission.id, status: 'DRAFT', scoresEntered: dto.scores.length }, message: 'Scores saved as draft' };
  }

  // ── Submit result (locks it) ───────────────────────────────────────
  async submitResult(submissionId: string, teacherUserId: string, schoolId: string) {
    const teacher = await this.prisma.teacher.findFirst({ where: { userId: teacherUserId, schoolId } });
    if (!teacher) throw new NotFoundException('Teacher not found');

    const submission = await this.prisma.resultSubmission.findFirst({
      where: { id: submissionId, class: { schoolId } },
    });
    if (!submission) throw new NotFoundException('Submission not found');
    if (submission.teacherId !== teacher.id)
      throw new ForbiddenException('You can only submit your own class results');
    if (submission.status !== 'DRAFT')
      throw new BadRequestException('Only DRAFT submissions can be submitted');

    // Check all students in class have at least one score
    const studentCount = await this.prisma.student.count({
      where: { classId: submission.classId, status: 'ACTIVE' },
    });
    const scoredStudents = await this.prisma.score.groupBy({
      by: ['studentId'],
      where: { submissionId },
    });
    if (scoredStudents.length < studentCount) {
      throw new BadRequestException(
        `${studentCount - scoredStudents.length} students have no scores entered. Enter all scores before submitting.`,
      );
    }

    await this.prisma.resultSubmission.update({
      where: { id: submissionId },
      data: { status: 'SUBMITTED', submittedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: { schoolId, userId: teacherUserId, action: 'SUBMIT', entity: 'ResultSubmission', entityId: submissionId },
    });

    return { message: 'Result submitted successfully. Admin can now publish it.' };
  }

  // ── Publish result (admin only) ────────────────────────────────────
  async publishResult(submissionId: string, adminUserId: string, schoolId: string) {
    const submission = await this.prisma.resultSubmission.findFirst({
      where: { id: submissionId, class: { schoolId } },
    });
    if (!submission) throw new NotFoundException('Submission not found');
    if (submission.status !== 'SUBMITTED')
      throw new BadRequestException('Only SUBMITTED results can be published');

    await this.prisma.$transaction(async (tx) => {
      // Update status to PUBLISHED
      await tx.resultSubmission.update({
        where: { id: submissionId },
        data: { status: 'PUBLISHED', publishedAt: new Date(), publishedBy: adminUserId },
      });

      // Calculate positions — done at publish time, never before
      await this.calculatePositions(tx, submissionId);

      // Write approval log
      await tx.approvalLog.create({
        data: { submissionId, adminId: adminUserId, action: 'PUBLISHED' },
      });

      await tx.auditLog.create({
        data: { schoolId, userId: adminUserId, action: 'PUBLISH', entity: 'ResultSubmission', entityId: submissionId },
      });
    });

    return { message: 'Result published. Students can now view their results.' };
  }

  // ── Get class positions (after publish) ────────────────────────────
  async getPositions(submissionId: string, schoolId: string) {
    const submission = await this.prisma.resultSubmission.findFirst({
      where: { id: submissionId, class: { schoolId } },
    });
    if (!submission) throw new NotFoundException('Submission not found');
    if (submission.status !== 'PUBLISHED')
      throw new BadRequestException('Positions are only available after publishing');

    const positions = await this.prisma.resultPosition.findMany({
      where: { submissionId },
      include: {
        submission: { include: { class: { select: { name: true } } } },
      },
      orderBy: { position: 'asc' },
    });

    // Enrich with student names
    const enriched = await Promise.all(
      positions.map(async (pos) => {
        const student = await this.prisma.student.findUnique({
          where: { id: pos.studentId },
          select: { fullName: true, admissionNumber: true, studentId: true },
        });
        return { ...pos, student };
      }),
    );

    return { data: enriched, message: 'Positions retrieved' };
  }

  // ── Private: calculate positions at publish time ───────────────────
  private async calculatePositions(tx: any, submissionId: string) {
    // Get total score per student across all subjects
    const scores = await tx.score.groupBy({
      by: ['studentId'],
      where: { submissionId },
      _sum: { total: true },
      _count: { total: true },
    });

    // Sort by total descending → assign positions
    const ranked = scores
      .map((s: any) => ({
        studentId: s.studentId,
        totalScore: s._sum.total ?? 0,
        subjectCount: s._count.total,
        average: s._count.total > 0 ? (s._sum.total ?? 0) / s._count.total : 0,
      }))
      .sort((a: any, b: any) => b.totalScore - a.totalScore);

    // Handle ties — students with same total get the same position
    let currentPosition = 1;
    for (let i = 0; i < ranked.length; i++) {
      if (i > 0 && ranked[i].totalScore < ranked[i - 1].totalScore) {
        currentPosition = i + 1;
      }
      await tx.resultPosition.upsert({
        where: { submissionId_studentId: { submissionId, studentId: ranked[i].studentId } },
        update: {
          position: currentPosition,
          totalScore: ranked[i].totalScore,
          average: Math.round(ranked[i].average * 10) / 10,
          calculatedAt: new Date(),
        },
        create: {
          submissionId,
          studentId: ranked[i].studentId,
          position: currentPosition,
          totalScore: ranked[i].totalScore,
          average: Math.round(ranked[i].average * 10) / 10,
        },
      });
    }
  }

  // ── Get scores for one subject within a submission ─────────────────
  // Used by sc-result-details (admin) and sc-subject-score-view (teacher)
  async getSubmissionBySubject(
    submissionId: string,
    subjectId: string,
    schoolId: string,
  ) {
    const submission = await this.prisma.resultSubmission.findFirst({
      where: { id: submissionId, class: { schoolId } },
      include: {
        class: { select: { id: true, name: true } },
        term: { select: { id: true, name: true } },
      },
    });
    if (!submission) throw new NotFoundException('Submission not found');

    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, schoolId },
      select: { id: true, name: true, code: true },
    });
    if (!subject) throw new NotFoundException('Subject not found');

    const scores = await this.prisma.score.findMany({
      where: { submissionId, subjectId },
      include: {
        student: {
          select: {
            id: true, fullName: true,
            admissionNumber: true, studentId: true,
          },
        },
      },
      orderBy: { student: { fullName: 'asc' } },
    });

    const totals = scores.map((s) => s.total ?? 0);
    const average =
      totals.length > 0
        ? Math.round((totals.reduce((a, b) => a + b, 0) / totals.length) * 10) / 10
        : 0;

    return {
      data: {
        submission: {
          id: submission.id,
          status: submission.status,
          class: submission.class,
          term: submission.term,
        },
        subject,
        scores: scores.map((s) => ({
          student: s.student,
          ca1: s.ca1, ca2: s.ca2, ca3: s.ca3, ca4: s.ca4,
          exam: s.exam, total: s.total,
          grade: s.grade, remark: s.remark,
        })),
        classAverage: average,
        studentCount: scores.length,
      },
      message: 'Subject scores retrieved',
    };
  }
}
