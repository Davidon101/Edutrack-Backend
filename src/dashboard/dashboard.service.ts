/**
 * @fileoverview Dashboard service compiling statistical analytics and role-tailored summaries
 * for administrators, teachers, students, and platform super administrators.
 * @module DashboardService
 * @author Edutrack Engineering Team
 * @created 1.0.0
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Service calculating aggregate metrics and context data for dashboards across all system roles.
 * @module DashboardService
 */
@Injectable()
export class DashboardService {
  /**
   * Initializes DashboardService with database client.
   *
   * @param {PrismaService} prisma - Prisma database access service
   */
  constructor(private prisma: PrismaService) {}

  /**
   * Retrieve aggregate metrics for the school administrator dashboard.
   *
   * Compiles headcounts of active students, teachers, and classes, pending result submissions,
   * and the active academic session / open term status.
   *
   * @async
   * @function getAdminDashboard
   *
   * @param {string} schoolId - UUID of the target school
   * @returns {Promise<{ data: any; message: string }>} Admin dashboard statistical payload
   *
   * @example
   * const stats = await dashboardService.getAdminDashboard('school-uuid');
   * // Returns: {
   * //   data: { studentCount: 150, teacherCount: 12, classCount: 6, pendingResults: 2, ... },
   * //   message: 'Admin dashboard retrieved'
   * // }
   */
  async getAdminDashboard(schoolId: string) {
    const [
      studentCount,
      teacherCount,
      classCount,
      pendingResults,
      activeSession,
    ] = await Promise.all([
      this.prisma.student.count({ where: { schoolId, status: 'ACTIVE' } }),
      this.prisma.teacher.count({ where: { schoolId, isActive: true } }),
      this.prisma.class.count({ where: { schoolId, isActive: true } }),
      this.prisma.resultSubmission.count({
        where: { class: { schoolId }, status: 'SUBMITTED' },
      }),
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

  /**
   * Retrieve teacher dashboard summary including assigned class, student count, and term submission status.
   *
   * @async
   * @function getTeacherDashboard
   *
   * @param {string} userId - UUID of the authenticated teacher user
   * @param {string} schoolId - UUID of the school
   * @returns {Promise<{ data: any; message: string }>} Teacher dashboard payload
   *
   * @throws {NotFoundException} When teacher profile is not found
   *
   * @example
   * const stats = await dashboardService.getTeacherDashboard('user-uuid', 'school-uuid');
   * // Returns: { data: { fullName: 'Mr. John Adeyemi', assignedClass: {...}, ... }, message: '...' }
   */
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
          where: {
            classId: assignedClass.id,
            termId: activeSession.terms[0].id,
          },
          select: { status: true },
        });
        resultStatus = submission?.status || 'NOT_STARTED';
      }
    }

    const subjectCount = await this.prisma.subject.count({
      where: { schoolId, isActive: true },
    });

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

  /**
   * Retrieve student dashboard summary including current class and latest published result average.
   *
   * @async
   * @function getStudentDashboard
   *
   * @param {string} userId - UUID of the authenticated student user
   * @param {string} schoolId - UUID of the school
   * @returns {Promise<{ data: any; message: string }>} Student dashboard payload
   *
   * @throws {NotFoundException} When student profile is not found
   *
   * @example
   * const stats = await dashboardService.getStudentDashboard('user-uuid', 'school-uuid');
   * // Returns: { data: { fullName: 'David Okafor', class: {...}, latestResults: {...} }, message: '...' }
   */
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
          submission: {
            termId: activeSession.terms[0].id,
            status: 'PUBLISHED',
          },
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

  /**
   * Retrieve platform-wide macro metrics for Super Administrator dashboard.
   *
   * Computes system-wide totals across schools, active vs suspended tenants, and total enrollments.
   *
   * @async
   * @function getSuperAdminDashboard
   *
   * @returns {Promise<{ data: any; message: string }>} Super Admin dashboard metrics
   *
   * @example
   * const platformStats = await dashboardService.getSuperAdminDashboard();
   * // Returns: { data: { totalSchools: 10, activeSchools: 9, totalStudents: 2500, ... }, message: '...' }
   */
  async getSuperAdminDashboard() {
    const [totalSchools, activeSchools, totalStudents, totalTeachers] =
      await Promise.all([
        this.prisma.school.count(),
        this.prisma.school.count({ where: { isActive: true } }),
        this.prisma.student.count(),
        this.prisma.teacher.count(),
      ]);

    return {
      data: {
        totalSchools,
        activeSchools,
        suspendedSchools: totalSchools - activeSchools,
        totalStudents,
        totalTeachers,
      },
      message: 'Platform dashboard retrieved',
    };
  }
}
