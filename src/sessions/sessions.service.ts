import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto';

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  // ── List all sessions for school ───────────────────────────────────
  async getSessions(schoolId: string) {
    const sessions = await this.prisma.academicSession.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      include: {
        terms: { orderBy: { name: 'asc' }, select: { id: true, name: true, isOpen: true } },
      },
    });
    return { data: sessions, message: 'Sessions retrieved' };
  }

  // ── Create new session + auto-create 3 terms ───────────────────────
  async createSession(schoolId: string, userId: string, dto: CreateSessionDto) {
    // Validate sequential years e.g. 2025/2026 not 2025/2030
    const [startYear, endYear] = dto.name.split('/').map(Number);
    if (endYear !== startYear + 1) {
      throw new BadRequestException('Session years must be sequential e.g. 2025/2026');
    }

    const existing = await this.prisma.academicSession.findUnique({
      where: { schoolId_name: { schoolId, name: dto.name } },
    });
    if (existing) {
      throw new ConflictException(`Session ${dto.name} already exists for this school`);
    }

    const session = await this.prisma.$transaction(async (tx) => {
      const newSession = await tx.academicSession.create({
        data: { schoolId, name: dto.name, isActive: false },
      });

      // Auto-create 3 terms — all closed by default
      await tx.term.createMany({
        data: [
          { sessionId: newSession.id, name: 'FIRST',  isOpen: false },
          { sessionId: newSession.id, name: 'SECOND', isOpen: false },
          { sessionId: newSession.id, name: 'THIRD',  isOpen: false },
        ],
      });

      await tx.auditLog.create({
        data: { schoolId, userId, action: 'CREATE', entity: 'AcademicSession', entityId: newSession.id, after: { name: dto.name } },
      });

      return newSession;
    });

    const withTerms = await this.prisma.academicSession.findUnique({
      where: { id: session.id },
      include: { terms: { orderBy: { name: 'asc' } } },
    });

    return { data: withTerms, message: `Session ${dto.name} created with 3 terms` };
  }

  // ── Activate a session ─────────────────────────────────────────────
  async activateSession(sessionId: string, schoolId: string, userId: string) {
    const session = await this.prisma.academicSession.findFirst({
      where: { id: sessionId, schoolId },
    });
    if (!session) throw new NotFoundException('Session not found');

    await this.prisma.$transaction(async (tx) => {
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
        data: { schoolId, userId, action: 'ACTIVATE', entity: 'AcademicSession', entityId: sessionId },
      });
    });

    return { message: `Session ${session.name} is now active` };
  }

  // ── List terms for active session ──────────────────────────────────
  async getTerms(schoolId: string) {
    const activeSession = await this.prisma.academicSession.findFirst({
      where: { schoolId, isActive: true },
      include: { terms: { orderBy: { name: 'asc' } } },
    });
    if (!activeSession) throw new NotFoundException('No active session found');
    return { data: activeSession.terms, message: 'Terms retrieved' };
  }

  // ── Open a term ────────────────────────────────────────────────────
  async openTerm(termId: string, schoolId: string, userId: string) {
    const term = await this.prisma.term.findFirst({
      where: { id: termId, session: { schoolId } },
      include: { session: true },
    });
    if (!term) throw new NotFoundException('Term not found');
    if (!term.session.isActive) throw new BadRequestException('Can only open terms in the active session');

    await this.prisma.$transaction(async (tx) => {
      // Close all other terms in the session
      await tx.term.updateMany({
        where: { sessionId: term.sessionId, isOpen: true },
        data: { isOpen: false },
      });

      await tx.term.update({ where: { id: termId }, data: { isOpen: true } });

      await tx.auditLog.create({
        data: { schoolId, userId, action: 'UPDATE', entity: 'Term', entityId: termId, after: { isOpen: true } },
      });
    });

    return { message: `${term.name} term is now open for result submission` };
  }

  // ── Close a term ───────────────────────────────────────────────────
  async closeTerm(termId: string, schoolId: string, userId: string) {
    const term = await this.prisma.term.findFirst({
      where: { id: termId, session: { schoolId } },
    });
    if (!term) throw new NotFoundException('Term not found');

    await this.prisma.term.update({ where: { id: termId }, data: { isOpen: false } });

    await this.prisma.auditLog.create({
      data: { schoolId, userId, action: 'UPDATE', entity: 'Term', entityId: termId, after: { isOpen: false } },
    });

    return { message: `${term.name} term is now closed` };
  }
}
