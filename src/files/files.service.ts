/**
 * @fileoverview Files service managing CSV import audit logs, bulk ingestion status,
 * and error report artifact retrieval.
 * @module FilesService
 * @author Edutrack Engineering Team
 * @created 1.0.0
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';

/**
 * Service managing metadata records for CSV uploads and import error reports.
 * @module FilesService
 */
@Injectable()
export class FilesService {
  /**
   * Initializes FilesService with database client.
   *
   * @param {PrismaService} prisma - Prisma database access service
   */
  constructor(private prisma: PrismaService) {}

  /**
   * Retrieve paginated history of past CSV bulk import operations for a school.
   *
   * @async
   * @function getImports
   *
   * @param {string} schoolId - UUID of the target school
   * @param {number} [page=1] - Page number (defaults to 1)
   * @param {number} [limit=20] - Number of records per page (defaults to 20)
   * @returns {Promise<{ data: any[]; meta: any; message: string }>} Paginated file import history
   *
   * @example
   * const imports = await filesService.getImports('school-uuid', 1, 20);
   * // Returns: { data: [...files], meta: { total: 5, page: 1, limit: 20, pages: 1 }, message: 'Import history retrieved' }
   */
  async getImports(schoolId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [files, total] = await Promise.all([
      this.prisma.file.findMany({
        where: {
          schoolId,
          fileType: { in: ['TEACHER_IMPORT', 'STUDENT_IMPORT'] },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { uploader: { select: { fullName: true } } },
      }),
      this.prisma.file.count({ where: { schoolId } }),
    ]);
    return {
      data: files,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
      message: 'Import history retrieved',
    };
  }

  /**
   * Locate and return the filepath of the generated CSV error report for a partial/failed import.
   *
   * @async
   * @function getErrorReport
   *
   * @param {string} fileId - UUID of the import file record
   * @param {string} schoolId - UUID of the school
   * @returns {Promise<string>} Filesystem path of the error report CSV
   *
   * @throws {NotFoundException} When import record does not exist or error file is absent
   *
   * @example
   * const filePath = await filesService.getErrorReport('file-uuid', 'school-uuid');
   * // Returns: "/tmp/imports/errors-uuid.csv"
   */
  async getErrorReport(fileId: string, schoolId: string) {
    const file = await this.prisma.file.findFirst({
      where: { id: fileId, schoolId },
    });
    if (!file) throw new NotFoundException('Import record not found');
    if (!file.errorPath || !fs.existsSync(file.errorPath)) {
      throw new NotFoundException('No error report available for this import');
    }
    return file.errorPath;
  }
}
