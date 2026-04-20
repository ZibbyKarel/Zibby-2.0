import { Test } from '@nestjs/testing';
import { SubtasksService } from './subtasks.service';
import { PrismaService } from '../db/db.module';

const mockPrisma = {
  subtask: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  subtaskLog: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn((fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma)),
};

describe('SubtasksService', () => {
  let service: SubtasksService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SubtasksService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(SubtasksService);
    jest.clearAllMocks();
  });

  it('findOne throws NotFoundException for unknown id', async () => {
    mockPrisma.subtask.findUnique.mockResolvedValue(null);
    await expect(service.findOne('unknown')).rejects.toThrow(/subtask unknown not found/i);
  });

  it('updateStatus throws if transition is invalid', async () => {
    mockPrisma.subtask.findUnique.mockResolvedValue({ id: 'sub1', status: 'PR_CREATED' });
    await expect(service.updateStatus('sub1', 'RUNNING')).rejects.toThrow(/invalid subtask transition/i);
  });

  it('updateStatus succeeds on valid transition', async () => {
    mockPrisma.subtask.findUnique.mockResolvedValue({ id: 'sub1', status: 'QUEUED' });
    mockPrisma.subtask.update.mockResolvedValue({ id: 'sub1', status: 'RUNNING' });
    const result = await service.updateStatus('sub1', 'RUNNING');
    expect(result.status).toBe('RUNNING');
  });
});
