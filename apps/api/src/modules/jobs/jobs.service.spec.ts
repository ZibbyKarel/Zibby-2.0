import { Test } from '@nestjs/testing';
import { JobsService } from './jobs.service';
import { PrismaService } from '../db/db.module';

const mockPrisma = {
  job: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

describe('JobsService', () => {
  let service: JobsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(JobsService);
    jest.clearAllMocks();
  });

  it('createJob creates a job with PENDING status', async () => {
    const fakeJob = { id: 'job1', prompt: 'Add dark mode', directory: 'apps/web', status: 'PENDING', createdAt: new Date() };
    mockPrisma.job.create.mockResolvedValue(fakeJob);

    const result = await service.createJob('Add dark mode', 'apps/web');
    expect(mockPrisma.job.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ prompt: 'Add dark mode', directory: 'apps/web', status: 'PENDING' }),
    });
    expect(result.id).toBe('job1');
  });

  it('updateStatus throws if transition is invalid', async () => {
    mockPrisma.job.findUnique.mockResolvedValue({ id: 'job1', status: 'COMPLETED' });
    await expect(service.updateStatus('job1', 'RUNNING')).rejects.toThrow(/invalid.*transition/i);
  });

  it('updateStatus updates the DB on valid transition', async () => {
    mockPrisma.job.findUnique.mockResolvedValue({ id: 'job1', status: 'PENDING' });
    mockPrisma.job.update.mockResolvedValue({ id: 'job1', status: 'DECOMPOSING' });
    const result = await service.updateStatus('job1', 'DECOMPOSING');
    expect(result.status).toBe('DECOMPOSING');
  });
});
