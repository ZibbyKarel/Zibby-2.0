import type { Tool } from '@anthropic-ai/sdk/resources';

export function buildDecomposerPrompt(userPrompt: string, repoContext: string | undefined): string {
  const context = repoContext
    ? `\n\n## Repository Context\n${repoContext}`
    : '';

  return `You are a senior software engineer helping decompose a feature request into independent, parallelizable subtasks.

## User Request
${userPrompt}${context}

## Instructions
- Break the request into independent subtasks that can be worked on in parallel without blocking each other.
- Each subtask must have at least 2 specific, testable acceptance criteria.
- Maximum 10 subtasks.
- Acceptance criteria should be concrete and verifiable (e.g., "The component renders without errors", not "It works").
- Each subtask's spec should be detailed enough for an engineer to implement without asking follow-up questions.`;
}

export const EMIT_SUBTASKS_TOOL = {
  name: 'emit_subtasks',
  description: 'Output the decomposed subtasks as structured data.',
  input_schema: {
    type: 'object' as const,
    properties: {
      subtasks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            order: { type: 'integer', description: 'Sequential order number starting from 1' },
            title: { type: 'string', description: 'Short title for this subtask (5-10 words)' },
            spec: { type: 'string', description: 'Detailed specification for the engineer' },
            acceptanceCriteria: {
              type: 'array',
              items: { type: 'string' },
              minItems: 2,
              description: 'Specific, testable criteria that must all be met',
            },
          },
          required: ['order', 'title', 'spec', 'acceptanceCriteria'],
        },
        minItems: 1,
        maxItems: 10,
      },
    },
    required: ['subtasks'],
  },
} satisfies Tool;
