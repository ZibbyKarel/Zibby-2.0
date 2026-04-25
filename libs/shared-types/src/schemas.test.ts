import { describe, expect, it } from 'vitest';
import { ProjectStateSchema, StorySchema } from './schemas';

describe('StorySchema', () => {
  it('parses a legacy story with no phaseModels / blockerTaskId', () => {
    const parsed = StorySchema.parse({
      taskId: 'legacy',
      title: 'Legacy task',
      description: 'A story from before phase models existed',
      acceptanceCriteria: ['must still parse correctly'],
      affectedFiles: [],
    });
    expect(parsed.phaseModels).toBeUndefined();
    expect(parsed.blockerTaskId).toBeUndefined();
  });

  it('accepts full phaseModels + blockerTaskId', () => {
    const parsed = StorySchema.parse({
      taskId: 'new',
      title: 'Task with phases',
      description: 'Phase model shape',
      acceptanceCriteria: ['valid criterion'],
      affectedFiles: [],
      phaseModels: {
        planning:       { model: 'opus',   thinking: 'high' },
        implementation: { model: 'sonnet', thinking: 'medium' },
        qa:             { model: 'haiku',  thinking: 'low' },
      },
      blockerTaskId: 'blocker-task',
    });
    expect(parsed.phaseModels?.planning?.thinking).toBe('high');
    expect(parsed.blockerTaskId).toBe('blocker-task');
  });

  it('rejects an invalid thinking level', () => {
    expect(() =>
      StorySchema.parse({
        taskId: 'bad',
        title: 'Bad thinking',
        description: 'invalid thinking level should fail',
        acceptanceCriteria: ['valid'],
        affectedFiles: [],
        phaseModels: { implementation: { thinking: 'ultra' as unknown as 'high' } },
      }),
    ).toThrow();
  });
});

describe('ProjectStateSchema', () => {
  it('rehydrates persisted state containing phase models & blocker', () => {
    const parsed = ProjectStateSchema.parse({
      version: 1,
      brief: 'a brief',
      plan: {
        stories: [
          {
            taskId: 'a',
            title: 'A',
            description: 'desc',
            acceptanceCriteria: ['x'],
            affectedFiles: [],
          },
          {
            taskId: 'b',
            title: 'B',
            description: 'desc',
            acceptanceCriteria: ['x'],
            affectedFiles: [],
            phaseModels: { implementation: { model: 'sonnet', thinking: 'medium' } },
            blockerTaskId: 'a',
          },
        ],
        dependencies: [{ from: 0, to: 1, reason: 'blocks B' }],
      },
      tasks: {},
      nextTaskNum: 3,
    });
    expect(parsed.plan.stories[1].blockerTaskId).toBe('a');
    expect(parsed.plan.stories[1].phaseModels?.implementation?.model).toBe('sonnet');
  });
});
