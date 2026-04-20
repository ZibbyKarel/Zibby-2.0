import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DecomposerService } from './decomposer.service';

// Mock @anthropic-ai/sdk so the test doesn't make real API calls
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [
          {
            type: 'tool_use',
            name: 'emit_subtasks',
            input: {
              subtasks: [
                {
                  order: 1,
                  title: 'Add DarkModeToggle component',
                  spec: 'Create a toggle button in the header...',
                  acceptanceCriteria: ['Toggle changes body class to "dark"', 'State persists'],
                },
              ],
            },
          },
        ],
      }),
    },
  })),
}));

describe('DecomposerService', () => {
  let service: DecomposerService;
  let originalApiKey: string | undefined;

  beforeEach(async () => {
    originalApiKey = process.env['ANTHROPIC_API_KEY'];
    process.env['ANTHROPIC_API_KEY'] = 'test-key';
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [DecomposerService],
    }).compile();
    service = module.get(DecomposerService);
  });

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env['ANTHROPIC_API_KEY'];
    } else {
      process.env['ANTHROPIC_API_KEY'] = originalApiKey;
    }
  });

  it('decomposes a prompt into subtasks', async () => {
    const result = await service.decompose('Add dark mode to the app', undefined);
    expect(result.subtasks).toHaveLength(1);
    expect(result.subtasks[0].title).toBe('Add DarkModeToggle component');
    expect(result.subtasks[0].acceptanceCriteria).toHaveLength(2);
  });
});
