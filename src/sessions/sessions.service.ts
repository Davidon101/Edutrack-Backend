/**
 * @fileoverview Academic sessions and terms service managing academic years, term states,
 * session activation switches, and audit history.
 * @module SessionsService
 * @author Edutrack Engineering Team
 * @created 1.0.0
 */

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto';

/**
 * Service providing core business logic for academic sessions and terms.
 * Handles single active session constraints and term status toggling.
 * @module SessionsService
 */
@Injectable()
export class SessionsService {
  /**
   * Initializes SessionsService with database context.
   *
   * @param {PrismaService} prisma - Prisma database access service
   */
  constructor(private prisma: PrismaService) {}

  /**
   * List all academic sessions recorded for a school.
   *
   * Retrieves all academic sessions ordered by creation date descending,
   * including their nested terms and open/closed states.
   *
   * @async
   * @function getSessions
   *
   * @param {string} schoolId - UUID of the target school
   * @returns {Promise<{ data: any[]; message: string }>} List of academic sessions
   *
   * @example
   * const result = await sessionsService.getSessions('school-uuid');
   * // Returns: { data: [...sessions], message: 'Sessions retrieved' }
   */
  async getSessions(schoolId: string) {
    const sessions = await this.prisma.academicSession.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      include: {
        terms: {
          orderBy: { name: 'asc' },
          select: { id: true, name: true, isOpen: true },
        },
      },
    });
    return { data: sessions, message: 'Sessions retrieved' };
  }

  /**
   * Create a new academic session and automatically provision three default terms.
   *
   * Verifies that the session label contains strictly sequential years (e.g. 2026/2027).
   * Runs in a transaction creating the session, three closed terms (FIRST, SECOND, THIRD),
   * and writes an audit log entry.
   *
   * @async
   * @function createSession
   *
   * @param {string} schoolId - UUID of the school
   * @param {string} userId - UUID of the user creating the session
   * @param {CreateSessionDto} dto - Session creation payload
   * @returns {Promise<{ data: any; message: string }>} Created session with terms
   *
   * @throws {BadRequestException} When years in session name are not sequential
   * @throws {ConflictException} When session with the same name already exists in this school
   *
   * @example
   * const session = await sessionsService.createSession('school-uuid', 'user-uuid', {
   *   name: '2026/2027',
   * });
   * // Returns: { data: { id: '...', name: '2026/2027', terms: [...] }, message: '...' }
   */
  async createSession(
    schoolId: string,
    userId: string,
    dto: CreateSessionDto,
  ) {
    // Validate sequential years e.g. 2025/2026 not 2025/2030
    const [startYear, endYear] = dto.name.split('/').map(Number);
    if (endYear !== startYear + 1) {
      throw new BadRequestException(
        'Session years must be sequential e.g. 2025/2026',
      );
    }

    const existing = await this.prisma.academicSession.findUnique({
      where: { schoolId_name: { schoolId, name: dto.name } },
    });
    if (existing) {
      throw new ConflictException(
        `Session ${dto.name} already exists for this school`,
      );
    }

    const session = await this.prisma.$transaction(async (tx) => {
      const newSession = await tx.academicSession.create({
        data: { schoolId, name: dto.name, isActive: false },
      });

      // Auto-create 3 terms — all closed by default
      await tx.term.createMany({
        data: [
          { sessionId: newSession.id, name: 'FIRST', isOpen: false },
          { sessionId: newSession.id, name: 'SECOND', isOpen: false },
          { sessionId: newSession.id, name: 'THIRD', isOpen: false },
        ],
      });

      await tx.auditLog.create({
        data: {
          schoolId,
          userId,
          action: 'CREATE',
          entity: 'AcademicSession',
          entityId: newSession.id,
          after: { name: dto.name },
        },
      });

      return newSession;
    });

    const withTerms = await this.prisma.academicSession.findUnique({
      where: { id: session.id },
      include: { terms: { orderBy: { name: 'asc' } } },
    });

    return {
      data: withTerms,
      message: `Session ${dto.name} created with 3 terms`,
    };
  }

  /**
   * Set a specified academic session as active for the school.
   *
   * Executes a transaction that deactivates all other sessions in the school
   * and marks the target session active, recording an audit log event.
   *
   * @async
   * @function activateSession
   *
   * @param {string} sessionId - UUID of the session to activate
   * @param {string} schoolId - UUID of the school
   * @param {string} userId - UUID of the admin performing the activation
   * @returns {Promise<{ message: string }>} Success message
   *
   * @throws {NotFoundException} When session is not found in the school
   *
   * @example
   * const result = await sessionsService.activateSession('session-uuid', 'school-uuid', 'user-uuid');
   * // Returns: { message: 'Session 2026/2027 is now active' }
   */
  async activateSession(
    sessionId: string,
    schoolId: string,
    userId: string,
  ) {
    const session = await this.prisma.academicSession.findFirst({
      where: { id: sessionId, schoolId },
    });
    if (!session) throw new NotFoundException('Session not found');

    await this.prisma.$transaction(async (tx) => {
      // Switching sessions closes any term still open in the old session,
      // so a term can never stay open outside the active session.
      await tx.term.updateMany({
        where: { session: { schoolId }, isOpen: true },
        data: { isOpen: false },
      });

      // Deactivate all other sessions for this school
      await tx.academicSession.updateMany({
        where: { schoolId, isActive: true },
        data: { isActive: false },
      });

      await tx.academicSession.update({
        where: { id: sessionId },
        data: { isActive: true },
      });

      await tx.auditLog.create({
        data: {
          schoolId,
          userId,
          action: 'ACTIVATE',
          entity: 'AcademicSession',
          entityId: sessionId,
        },
      });
    });

    return { message: `Session ${session.name} is now active` };
  }

  /**
   * List terms belonging to the school's active session.
   *
   * @async
   * @function getTerms
   *
   * @param {string} schoolId - UUID of the school
   * @returns {Promise<{ data: any[]; message: string }>} Terms of the active session
   *
   * @throws {NotFoundException} When no active session exists for the school
   *
   * @example
   * const terms = await sessionsService.getTerms('school-uuid');
   * // Returns: { data: [{ id: '...', name: 'FIRST', isOpen: true }], message: 'Terms retrieved' }
   */
  async getTerms(schoolId: string) {
    const activeSession = await this.prisma.academicSession.findFirst({
      where: { schoolId, isActive: true },
      include: { terms: { orderBy: { name: 'asc' } } },
    });
    if (!activeSession)
      throw new NotFoundException('No active session found');
    return { data: activeSession.terms, message: 'Terms retrieved' };
  }

  /**
   * Open an academic term to enable score entries and submissions.
   *
   * Closes all other terms within the active session ensuring only one term
   * is open concurrently. Validates that the term belongs to the active session.
   *
   * @async
   * @function openTerm
   *
   * @param {string} termId - UUID of the term to open
   * @param {string} schoolId - UUID of the school
   * @param {string} userId - UUID of the user opening the term
   * @returns {Promise<{ message: string }>} Confirmation message
   *
   * @throws {NotFoundException} When term is not found
   * @throws {BadRequestException} When attempting to open a term outside the active session
   *
   * @example
   * const result = await sessionsService.openTerm('term-uuid', 'school-uuid', 'user-uuid');
   * // Returns: { message: 'FIRST term is now open for result submission' }
   */
  async openTerm(termId: string, schoolId: string, userId: string) {
    const term = await this.prisma.term.findFirst({
      where: { id: termId, session: { schoolId } },
      include: { session: true },
    });
    if (!term) throw new NotFoundException('Term not found');
    if (!term.session.isActive)
      throw new BadRequestException(
        'Can only open terms in the active session',
      );

    await this.prisma.$transaction(async (tx) => {
      // Close every other open term in the whole school (not just this session):
      // only one term may be open per school at any time.
      await tx.term.updateMany({
        where: { session: { schoolId }, isOpen: true },
        data: { isOpen: false },
      });

      await tx.term.update({
        where: { id: termId },
        data: { isOpen: true },
      });

      await tx.auditLog.create({
        data: {
          schoolId,
          userId,
          action: 'UPDATE',
          entity: 'Term',
          entityId: termId,
          after: { isOpen: true },
        },
      });
    });

    return { message: `${term.name} term is now open for result submission` };
  }

  /**
   * Close an academic term to prevent further score modifications.
   *
   * @async
   * @function closeTerm
   *
   * @param {string} termId - UUID of the term to close
   * @param {string} schoolId - UUID of the school
   * @param {string} userId - UUID of the user closing the term
   * @returns {Promise<{ message: string }>} Confirmation message
   *
   * @throws {NotFoundException} When term is not found
   *
   * @example
   * const result = await sessionsService.closeTerm('term-uuid', 'school-uuid', 'user-uuid');
   * // Returns: { message: 'FIRST term is now closed' }
   */
  async closeTerm(termId: string, schoolId: string, userId: string) {
    const term = await this.prisma.term.findFirst({
      where: { id: termId, session: { schoolId } },
    });
    if (!term) throw new NotFoundException('Term not found');

    await this.prisma.term.update({
      where: { id: termId },
      data: { isOpen: false },
    });

    await this.prisma.auditLog.create({
      data: {
        schoolId,
        userId,
        action: 'UPDATE',
        entity: 'Term',
        entityId: termId,
        after: { isOpen: false },
      },
    });

    return { message: `${term.name} term is now closed` };
  }
}
