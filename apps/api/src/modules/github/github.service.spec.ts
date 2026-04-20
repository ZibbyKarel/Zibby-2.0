import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { GitHubService } from './github.service';

const mockExec = jest.fn();
jest.mock('child_process', () => ({
  exec: (...args: unknown[]) => mockExec(...args),
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

  it('pushBranch calls git push with the branch name', async () => {
    mockExec.mockImplementation((_cmd: string, _opts: unknown, cb: (err: null, stdout: string) => void) => cb(null, ''));
    await service.pushBranch('/workspace/.worktrees/t1', 'task/feature-1');
    expect(mockExec).toHaveBeenCalledWith(
      expect.stringContaining('git push -u origin task/feature-1'),
      expect.anything(),
      expect.any(Function),
    );
  });

  it('createPr returns the PR URL from gh output', async () => {
    mockExec.mockImplementation((_cmd: string, _opts: unknown, cb: (err: null, stdout: string) => void) =>
      cb(null, 'https://github.com/owner/repo/pull/42\n'),
    );
    const url = await service.createPr({
      worktreePath: '/workspace/.worktrees/t1',
      baseBranch: 'main',
      branch: 'task/feature-1',
      title: 'Add dark mode',
      body: 'Spec: ...',
    });
    expect(url).toBe('https://github.com/owner/repo/pull/42');
  });
});
