import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../db/db.module';
import { isValidJobTransition, JobStatus, JOB_TERMINAL_STATES } from 'orchestration';
import type { Job } from '@prisma/client';

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async createJob(prompt: string): Promise<Job> {
    return this.prisma.job.create({
      data: { prompt, status: 'PENDING' },
    });
  }

  async findAll(limit = 50, offset = 0): Promise<Job[]> {
    return this.prisma.job.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: { subtasks: { orderBy: { order: 'asc' } } },
    });
  }

  async findOne(id: string): Promise<Job & { subtasks: unknown[] }> {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: { subtasks: { orderBy: { order: 'asc' } } },
    });
    if (!job) throw new NotFoundException(`Job ${id} not found`);
    return job as Job & { subtasks: unknown[] };
  }

  async updateStatus(id: string, status: JobStatus, error?: string): Promise<Job> {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job) throw new NotFoundException(`Job ${id} not found`);
    if (!isValidJobTransition(job.status, status)) {
      throw new BadRequestException(`Invalid job transition: ${job.status} → ${status}`);
    }
    return this.prisma.job.update({
      where: { id },
      data: {
        status,
        ...(error !== undefined ? { error } : {}),
        finishedAt: JOB_TERMINAL_STATES.includes(status) ? new Date() : undefined,
      },
    });
  }
}
