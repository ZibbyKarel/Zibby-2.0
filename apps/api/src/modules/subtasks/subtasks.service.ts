import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../db/db.module';
import { isValidSubtaskTransition, SubtaskStatus } from 'orchestration';
import type { Subtask, SubtaskLog } from '@prisma/client';

@Injectable()
export class SubtasksService {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(
    jobId: string,
    subtasks: Array<{ order: number; title: string; spec: string; acceptanceCriteria: string[] }>,
  ): Promise<Subtask[]> {
    const data = subtasks.map((s) => ({
      jobId,
      order: s.order,
      title: s.title,
      spec: s.spec,
      acceptanceCriteria: JSON.stringify(s.acceptanceCriteria),
      status: 'QUEUED' as const,
    }));
    // createMany doesn't return rows in SQLite; use individual creates in a transaction
    return this.prisma.$transaction(async (tx) => {
      const created: Subtask[] = [];
      for (const d of data) {
        created.push(await tx.subtask.create({ data: d }));
      }
      return created;
    });
  }

  async findOne(id: string): Promise<Subtask> {
    const subtask = await this.prisma.subtask.findUnique({ where: { id } });
    if (!subtask) throw new NotFoundException(`Subtask ${id} not found`);
    return subtask;
  }

  async findByJob(jobId: string): Promise<Subtask[]> {
    return this.prisma.subtask.findMany({
      where: { jobId },
      orderBy: { order: 'asc' },
    });
  }

  async updateStatus(
    id: string,
    status: SubtaskStatus,
    extra?: { branch?: string; prUrl?: string; error?: string },
  ): Promise<Subtask> {
    const subtask = await this.prisma.subtask.findUnique({ where: { id } });
    if (!subtask) throw new NotFoundException(`Subtask ${id} not found`);
    if (!isValidSubtaskTransition(subtask.status, status)) {
      throw new BadRequestException(`Invalid subtask transition: ${subtask.status} → ${status}`);
    }
    return this.prisma.subtask.update({
      where: { id },
      data: {
        status,
        ...(extra?.branch !== undefined ? { branch: extra.branch } : {}),
        ...(extra?.prUrl !== undefined ? { prUrl: extra.prUrl } : {}),
        ...(extra?.error !== undefined ? { error: extra.error } : {}),
        startedAt: status === 'RUNNING' ? new Date() : undefined,
        finishedAt: ['PR_CREATED', 'FAILED'].includes(status) ? new Date() : undefined,
      },
    });
  }

  // SSE emission on log append is handled by RunnersService to avoid circular dependencies
  async appendLog(subtaskId: string, stream: string, line: string): Promise<void> {
    await this.prisma.subtaskLog.create({
      data: { subtaskId, stream, line },
    });
  }

  async getLogs(subtaskId: string, sinceTs?: string): Promise<SubtaskLog[]> {
    if (sinceTs) {
      const d = new Date(sinceTs);
      if (isNaN(d.getTime())) throw new BadRequestException('Invalid since_ts value');
    }
    return this.prisma.subtaskLog.findMany({
      where: {
        subtaskId,
        ...(sinceTs ? { ts: { gt: new Date(sinceTs) } } : {}),
      },
      orderBy: { ts: 'asc' },
      take: 1000,
    });
  }
}
