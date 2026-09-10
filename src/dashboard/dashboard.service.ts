import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  // ── Admin dashboard ────────────────────────────────────────────────
  async getAdminDashboard(schoolId: string) {
    const [studentCount, teacherCount, classCount, pendingResults, activeSession] =
      await Promise.all([
        this.prisma.student.count({ where: { schoolId, status: 'ACTIVE' } }),
        this.prisma.teacher.count({ where: { schoolId, isActive: true } }),
        this.prisma.class.count({ where: { schoolId, isActive: true } }),
        this.prisma.resultSubmission.count({ where: { class: { schoolId }, status: 'SUBMITTED' } }),
        this.prisma.academicSession.findFirst({
          where: { schoolId, isActive: true },
          include: { terms: { where: { isOpen: true }, take: 1 } },
        }),
      ]);

    return {
      data: {
        studentCount,
        teacherCount,
        classCount,
        pendingResults,
        activeSession: activeSession?.name || null,
        openTerm: activeSession?.terms[0]?.name || null,
      },
      message: 'Admin dashboard retrieved',
    };
  }

  // ── Teacher dashboard ──────────────────────────────────────────────
  async getTeacherDashboard(userId: string, schoolId: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { userId, schoolId },
      include: {
        user: { select: { fullName: true } },
        classesAsTeacher: {
          where: { isActive: true },
          select: { id: true, name: true, level: true },
          take: 1,
        },
      },
    });
    if (!teacher) throw new NotFoundException('Teacher not found');

    const assignedClass = teacher.classesAsTeacher[0] || null;
    let studentCount = 0;
    let resultStatus = null;

    const activeSession = await this.prisma.academicSession.findFirst({
      where: { schoolId, isActive: true },
      include: { terms: { where: { isOpen: true }, take: 1 } },
    });

    if (assignedClass) {
      studentCount = await this.prisma.student.count({
        where: { classId: assignedClass.id, status: 'ACTIVE' },
      });

      if (activeSession?.terms[0]) {
        const submission = await this.prisma.resultSubmission.findFirst({
          where: { classId: assignedClass.id, termId: activeSession.terms[0].id },
          select: { status: true },
        });
        resultStatus = submission?.status || 'NOT_STARTED';
      }
    }

    const subjectCount = await this.prisma.subject.count({ where: { schoolId, isActive: true } });

    return {
      data: {
        fullName: teacher.user.fullName,
        staffId: teacher.staffId,
        assignedClass: assignedClass
          ? { ...assignedClass, studentCount, subjectCount }
          : null,
        activeSession: activeSession?.name || null,
        openTerm: activeSession?.terms[0]?.name || null,
        resultStatus,
      },
      message: 'Teacher dashboard retrieved',
    };
  }

  // ── Student dashboard ──────────────────────────────────────────────
  async getStudentDashboard(userId: string, schoolId: string) {
    const student = await this.prisma.student.findFirst({
      where: { userId, schoolId },
      include: { class: { select: { id: true, name: true } } },
    });
    if (!student) throw new NotFoundException('Student not found');

    const activeSession = await this.prisma.academicSession.findFirst({
      where: { schoolId, isActive: true },
      include: { terms: { where: { isOpen: true }, take: 1 } },
    });

    // Get latest published results
    let latestResults = null;
    if (activeSession?.terms[0]) {
      const scores = await this.prisma.score.findMany({
        where: {
          studentId: student.id,
          submission: { termId: activeSession.terms[0].id, status: 'PUBLISHED' },
        },
        select: { total: true },
      });

      if (scores.length > 0) {
        const totalScore = scores.reduce((sum, s) => sum + (s.total ?? 0), 0);
        latestResults = {
          subjectCount: scores.length,
          average: Math.round((totalScore / scores.length) * 10) / 10,
        };
      }
    }

    return {
      data: {
        fullName: student.fullName,
        studentId: student.studentId,
        admissionNumber: student.admissionNumber,
        class: student.class,
        status: student.status,
        activeSession: activeSession?.name || null,
        openTerm: activeSession?.terms[0]?.name || null,
        latestResults,
      },
      message: 'Student dashboard retrieved',
    };
  }

  // ── Super Admin dashboard ──────────────────────────────────────────
  async getSuperAdminDashboard() {
    const [totalSchools, activeSchools, totalStudents, totalTeachers] = await Promise.all([
      this.prisma.school.count(),
      this.prisma.school.count({ where: { isActive: true } }),
      this.prisma.student.count(),
      this.prisma.teacher.count(),
    ]);

    return {
      data: { totalSchools, activeSchools, suspendedSchools: totalSchools - activeSchools, totalStudents, totalTeachers },
      message: 'Platform dashboard retrieved',
    };
  }
}
