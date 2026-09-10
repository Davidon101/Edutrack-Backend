import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FilesService {
  constructor(private prisma: PrismaService) {}

  async getImports(schoolId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [files, total] = await Promise.all([
      this.prisma.file.findMany({
        where: { schoolId, fileType: { in: ['TEACHER_IMPORT', 'STUDENT_IMPORT'] } },
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { uploader: { select: { fullName: true } } },
      }),
      this.prisma.file.count({ where: { schoolId } }),
    ]);
    return { data: files, meta: { total, page, limit, pages: Math.ceil(total / limit) }, message: 'Import history retrieved' };
  }

  async getErrorReport(fileId: string, schoolId: string) {
    const file = await this.prisma.file.findFirst({ where: { id: fileId, schoolId } });
    if (!file) throw new NotFoundException('Import record not found');
    if (!file.errorPath || !fs.existsSync(file.errorPath)) {
      throw new NotFoundException('No error report available for this import');
    }
    return file.errorPath;
  }
}
