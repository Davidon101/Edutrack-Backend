import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TeachersService } from '../teachers.service';
import { v4 as uuid } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface TeacherCsvRow {
  rowNumber: number;
  fullName: string;
  phone: string;
  email?: string;
  qualification?: string;
  specialization?: string;
  joinDate?: string;
  status: 'VALID' | 'ERROR';
  reason?: string;
}

/** How long an uploaded preview stays valid before /confirm refuses it. */
const PREVIEW_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class TeacherCsvService {
  constructor(
    private prisma: PrismaService,
    private teachersService: TeachersService,
  ) {}

  // ── Download CSV template ──────────────────────────────────────────
  public getTemplatePath(): string {
    const dir = path.join(os.tmpdir(), 'templates');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, 'teacher-template.csv');
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(
        filePath,
        'fullName,phone,email,qualification,specialization,joinDate\n' +
          'Mr. John Adeyemi,08012345678,john@school.com,B.Ed,Mathematics,2024-09-01\n',
      );
    }
    return filePath;
  }

  // ── Upload CSV → parse → return preview ───────────────────────────
  async uploadCsv(
    fileBuffer: Buffer,
    originalName: string,
    schoolId: string,
    uploadedBy: string,
  ) {
    const content = fileBuffer.toString('utf-8');
    const lines = content
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2)
      throw new BadRequestException('CSV file is empty or has no data rows');

    const headers = lines[0]
      .toLowerCase()
      .split(',')
      .map((h) => h.trim());

    for (const req of ['fullname', 'phone']) {
      if (!headers.includes(req))
        throw new BadRequestException(`CSV missing required column: ${req}`);
    }

    const rows: TeacherCsvRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      const col: any = {};
      headers.forEach((h, idx) => { col[h] = values[idx] || ''; });

      const row: TeacherCsvRow = {
        rowNumber: i,
        fullName: col['fullname'] || '',
        phone: col['phone'] || '',
        email: col['email'] || undefined,
        qualification: col['qualification'] || undefined,
        specialization: col['specialization'] || undefined,
        joinDate: col['joindate'] || undefined,
        status: 'VALID',
      };

      if (!row.fullName || row.fullName.length < 2) {
        row.status = 'ERROR';
        row.reason = 'fullName is required (min 2 characters)';
      } else if (!row.phone) {
        row.status = 'ERROR';
        row.reason = 'phone is required';
      } else if (row.joinDate && isNaN(Date.parse(row.joinDate))) {
        row.status = 'ERROR';
        row.reason = 'joinDate must be a valid date e.g. 2024-09-01';
      }

      rows.push(row);
    }

    const validCount = rows.filter((r) => r.status === 'VALID').length;
    const errorCount = rows.filter((r) => r.status === 'ERROR').length;

    // Log the import attempt
    const fileRecord = await this.prisma.file.create({
      data: {
        schoolId, uploadedBy,
        fileName: originalName,
        fileType: 'TEACHER_IMPORT',
        mimeType: 'text/csv',
        status: 'PROCESSING',
        totalRows: rows.length,
      },
    });

    const previewToken = uuid();
    // Stored in the database (not memory) so confirm works on any server instance.
    await this.prisma.csvPreview.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    await this.prisma.csvPreview.create({
      data: {
        token: previewToken,
        schoolId,
        kind: 'TEACHER',
        uploadedBy,
        fileId: fileRecord.id,
        rows: rows as any,
        expiresAt: new Date(Date.now() + PREVIEW_TTL_MS),
      },
    });

    return {
      data: {
        previewToken,
        fileName: originalName,
        totalRows: rows.length,
        validRows: validCount,
        errorRows: errorCount,
        rows,
      },
      message: 'CSV parsed. Review rows and call /confirm to import.',
    };
  }

  // ── Confirm preview → create all valid teachers ────────────────────
  async confirmCsv(previewToken: string, schoolId: string, adminId: string) {
    const stored = await this.prisma.csvPreview.findUnique({
      where: { token: previewToken },
    });
    if (!stored || stored.kind !== 'TEACHER' || stored.expiresAt < new Date())
      throw new BadRequestException(
        'Preview session expired or invalid. Please upload the CSV again.',
      );
    if (stored.schoolId !== schoolId)
      throw new BadRequestException('Invalid preview token');

    // Claim the preview atomically so a double-click / retry cannot import twice.
    const claimed = await this.prisma.csvPreview.deleteMany({
      where: { token: previewToken, schoolId },
    });
    if (claimed.count !== 1)
      throw new BadRequestException(
        'This preview was already confirmed. Upload the CSV again if needed.',
      );

    const preview = {
      rows: stored.rows as unknown as TeacherCsvRow[],
      schoolId: stored.schoolId,
      uploadedBy: stored.uploadedBy,
      fileId: stored.fileId ?? undefined,
    };

    const validRows = preview.rows.filter((r) => r.status === 'VALID');
    const errorRows = preview.rows.filter((r) => r.status === 'ERROR');

    let created = 0;
    const runtimeFailed: any[] = [];

    for (const row of validRows) {
      try {
        await this.teachersService.createTeacher(schoolId, adminId, {
          fullName: row.fullName,
          phone: row.phone,
          email: row.email,
          qualification: row.qualification,
          specialization: row.specialization,
          joinDate: row.joinDate,
        });
        created++;
      } catch (err) {
        runtimeFailed.push({ ...row, status: 'ERROR', reason: err.message });
      }
    }

    const totalFailed = errorRows.length + runtimeFailed.length;
    const status =
      totalFailed === 0
        ? 'COMPLETED'
        : created === 0
          ? 'FAILED'
          : 'PARTIALLY_COMPLETED';

    if (preview.fileId) {
      await this.prisma.file.update({
        where: { id: preview.fileId },
        data: { status, successRows: created, failedRows: totalFailed },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        schoolId, userId: adminId,
        action: 'IMPORT', entity: 'Teacher',
        after: { created, failed: totalFailed, total: preview.rows.length } as any,
      },
    });

    return {
      data: {
        created,
        failed: totalFailed,
        total: preview.rows.length,
        status,
        importId: preview.fileId,
      },
      message: `Import complete. ${created} teachers created.`,
    };
  }
}