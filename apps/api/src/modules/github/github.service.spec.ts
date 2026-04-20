import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { GitHubService } from './github.service';

const mockExecFile = jest.fn();
jest.mock('child_process', () => ({
  execFile: (...args: unknown[]) => mockExecFile(...args),
}));

describe('GitHubService', () => {
  let service: GitHubService;

  beforeEach(async () => {
    process.env['GITHUB_TOKEN'] = 'test-token';
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [GitHubService],
    }).compile();
    service = module.get(GitHubService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env['GITHUB_TOKEN'];
  });

  it('pushBranch calls git push with the correct args and cwd', async () => {
    mockExecFile.mockImplementation(
      (_cmd: string, _args: string[], _opts: unknown, cb: (err: null, result: { stdout: string; stderr: string }) => void) =>
        cb(null, { stdout: '', stderr: '' }),
    );
    await service.pushBranch('/workspace/.worktrees/t1', 'task/feature-1');
    expect(mockExecFile).toHaveBeenCalledWith(
      'git',
      ['push', '-u', 'origin', 'task/feature-1'],
      expect.objectContaining({ cwd: '/workspace/.worktrees/t1' }),
      expect.any(Function),
    );
  });

  it('createPr returns the PR URL from gh output', async () => {
    mockExecFile.mockImplementation(
      (_cmd: string, _args: string[], _opts: unknown, cb: (err: null, result: { stdout: string; stderr: string }) => void) =>
        cb(null, { stdout: 'https://github.com/owner/repo/pull/42\n', stderr: '' }),
    );
    const url = await service.createPr({
      worktreePath: '/workspace/.worktrees/t1',
      baseBranch: 'main',
      branch: 'task/feature-1',
      title: 'Add dark mode',
      body: 'Spec: ...',
    });
    expect(url).toBe('https://github.com/owner/repo/pull/42');
    expect(mockExecFile).toHaveBeenCalledWith(
      'gh',
      expect.arrayContaining(['pr', 'create', '--title', 'Add dark mode']),
      expect.objectContaining({ cwd: '/workspace/.worktrees/t1' }),
      expect.any(Function),
    );
  });
});
