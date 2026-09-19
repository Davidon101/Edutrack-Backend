import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StudentsService } from '../students.service';
import { Gender } from '@prisma/client';
import { v4 as uuid } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface StudentCsvRow {
  rowNumber: number;
  fullName: string;
  gender: string;
  dateOfBirth: string;
  className: string;
  admissionNumber: string;
  // studentId is NEVER read from CSV — always auto-generated
  status: 'VALID' | 'ERROR';
  reason?: string;
  resolvedClassId?: string;
}

const previewStore = new Map<
  string,
  { rows: StudentCsvRow[]; schoolId: string; uploadedBy: string; fileId?: string }
>();

@Injectable()
export class StudentCsvService {
  constructor(
    private prisma: PrismaService,
    private studentsService: StudentsService,
  ) {}

  // ── Download CSV template ──────────────────────────────────────────
  public getTemplatePath(): string {
    const dir = path.join(os.tmpdir(), 'templates');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, 'student-template.csv');
    if (!fs.existsSync(filePath)) {
      // Note: studentId column is intentionally absent — it is always auto-generated
      fs.writeFileSync(
        filePath,
        'fullName,gender,dateOfBirth,className,admissionNumber\n' +
          'David John Okafor,MALE,2015-04-10,Primary 4 Gold,BFA/ADM/2025/001\n',
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

    const headers = lines[0].toLowerCase().split(',').map((h) => h.trim());
    for (const req of ['fullname', 'gender', 'dateofbirth', 'classname', 'admissionnumber']) {
      if (!headers.includes(req))
        throw new BadRequestException(`CSV missing required column: ${req}`);
    }

    // Pre-load all active classes for this school for validation
    const classes = await this.prisma.class.findMany({
      where: { schoolId, isActive: true },
      select: { id: true, name: true },
    });
    const classMap = new Map(classes.map((c) => [c.name.toLowerCase(), c]));

    // Pre-load existing admission numbers for duplicate detection
    const existingAdmNums = await this.prisma.student.findMany({
      where: { schoolId },
      select: { admissionNumber: true },
    });
    const admNumSet = new Set(existingAdmNums.map((s) => s.admissionNumber.toLowerCase()));

    const rows: StudentCsvRow[] = [];
    const admNumsInBatch = new Set<string>(); // Catch duplicates within the CSV itself

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      const col: any = {};
      headers.forEach((h, idx) => { col[h] = values[idx] || ''; });

      const row: StudentCsvRow = {
        rowNumber: i,
        fullName: col['fullname'] || '',
        gender: (col['gender'] || '').toUpperCase(),
        dateOfBirth: col['dateofbirth'] || '',
        className: col['classname'] || '',
        admissionNumber: col['admissionnumber'] || '',
        status: 'VALID',
      };

      // Validate each field
      if (!row.fullName || row.fullName.length < 2) {
        row.status = 'ERROR'; row.reason = 'fullName is required (min 2 chars)';
      } else if (!['MALE', 'FEMALE'].includes(row.gender)) {
        row.status = 'ERROR'; row.reason = 'gender must be MALE or FEMALE';
      } else if (!row.dateOfBirth || isNaN(Date.parse(row.dateOfBirth))) {
        row.status = 'ERROR'; row.reason = 'dateOfBirth must be a valid date e.g. 2015-04-10';
      } else if (!row.className) {
        row.status = 'ERROR'; row.reason = 'className is required';
      } else if (!classMap.has(row.className.toLowerCase())) {
        row.status = 'ERROR'; row.reason = `Class "${row.className}" not found in this school`;
      } else if (!row.admissionNumber) {
        row.status = 'ERROR'; row.reason = 'admissionNumber is required — admin must provide it';
      } else if (admNumSet.has(row.admissionNumber.toLowerCase())) {
        row.status = 'ERROR'; row.reason = `Admission number "${row.admissionNumber}" already exists in this school`;
      } else if (admNumsInBatch.has(row.admissionNumber.toLowerCase())) {
        row.status = 'ERROR'; row.reason = `Admission number "${row.admissionNumber}" appears more than once in this CSV`;
      } else {
        row.resolvedClassId = classMap.get(row.className.toLowerCase())!.id;
        admNumsInBatch.add(row.admissionNumber.toLowerCase());
      }

      rows.push(row);
    }

    const validCount = rows.filter((r) => r.status === 'VALID').length;
    const errorCount = rows.filter((r) => r.status === 'ERROR').length;

    const fileRecord = await this.prisma.file.create({
      data: {
        schoolId, uploadedBy,
        fileName: originalName,
        fileType: 'STUDENT_IMPORT',
        mimeType: 'text/csv',
        status: 'PROCESSING',
        totalRows: rows.length,
      },
    });

    const previewToken = uuid();
    previewStore.set(previewToken, { rows, schoolId, uploadedBy, fileId: fileRecord.id });
    setTimeout(() => previewStore.delete(previewToken), 30 * 60 * 1000);

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

  // ── Confirm preview → create all valid students ────────────────────
  async confirmCsv(previewToken: string, schoolId: string, adminId: string) {
    const preview = previewStore.get(previewToken);
    if (!preview)
      throw new BadRequestException('Preview session expired. Please upload the CSV again.');
    if (preview.schoolId !== schoolId)
      throw new BadRequestException('Invalid preview token');

    const validRows = preview.rows.filter((r) => r.status === 'VALID');
    const errorRows = preview.rows.filter((r) => r.status === 'ERROR');

    let created = 0;
    const runtimeFailed: any[] = [];

    for (const row of validRows) {
      try {
        await this.studentsService.createStudent(schoolId, adminId, {
          fullName: row.fullName,
          gender: row.gender as Gender,
          dateOfBirth: row.dateOfBirth,
          classId: row.resolvedClassId!,
          admissionNumber: row.admissionNumber,
        });
        created++;
      } catch (err) {
        runtimeFailed.push({ ...row, reason: err.message });
      }
    }

    previewStore.delete(previewToken);

    const totalFailed = errorRows.length + runtimeFailed.length;
    const status =
      totalFailed === 0 ? 'COMPLETED' : created === 0 ? 'FAILED' : 'PARTIALLY_COMPLETED';

    if (preview.fileId) {
      await this.prisma.file.update({
        where: { id: preview.fileId },
        data: { status, successRows: created, failedRows: totalFailed },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        schoolId, userId: adminId,
        action: 'IMPORT', entity: 'Student',
        after: { created, failed: totalFailed, total: preview.rows.length } as any,
      },
    });

    return {
      data: { created, failed: totalFailed, total: preview.rows.length, status, importId: preview.fileId },
      message: `Import complete. ${created} students created.`,
    };
  }
}