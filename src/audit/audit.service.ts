/**
 * @fileoverview Audit service managing queries against immutable audit logs.
 * Provides multi-filter querying by entity, user ID, date intervals, and paginated results.
 * @module AuditService
 * @author Edutrack Engineering Team
 * @created 1.0.0
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Filter criteria for querying audit log records.
 */
export interface AuditLogFilters {
  entity?: string;
  userId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

/**
 * Service managing access to school audit log records and state mutation histories.
 * @module AuditService
 */
@Injectable()
export class AuditService {
  /**
   * Initializes AuditService with database client.
   *
   * @param {PrismaService} prisma - Prisma database access service
   */
  constructor(private prisma: PrismaService) {}

  /**
   * Query paginated audit log entries for a school with optional entity, user, and date filters.
   *
   * @async
   * @function getLogs
   *
   * @param {string} schoolId - UUID of the school
   * @param {AuditLogFilters} filters - Query filter criteria including entity, user, date ranges, and pagination
   * @returns {Promise<{ data: any[]; meta: any; message: string }>} Paginated audit log records
   *
   * @example
   * const logs = await auditService.getLogs('school-uuid', {
   *   entity: 'Student',
   *   page: 1,
   *   limit: 20
   * });
   * // Returns: { data: [...logs], meta: { total: 45, page: 1, limit: 20, pages: 3 }, message: 'Audit logs retrieved' }
   */
  async getLogs(schoolId: string, filters: AuditLogFilters) {
    const { entity, userId, from, to } = filters;
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { schoolId };
    if (entity) where.entity = entity;
    if (userId) where.userId = userId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { fullName: true, role: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
      message: 'Audit logs retrieved',
    };
  }
}
