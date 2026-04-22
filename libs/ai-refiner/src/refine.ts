import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { RefinedPlanSchema } from '@zibby/shared-types/schemas';
import type { RefinedPlan } from '@zibby/shared-types/ipc';
import { collectRepoContext, renderContextForPrompt } from './repo-context';

const DEFAULT_MODEL = process.env.CLAUDE_REFINE_MODEL ?? 'claude-sonnet-4-6';
const TOOL_NAME = 'submit_plan';

const SYSTEM_PROMPT = `You are a senior technical project manager. Given a rough brief from a developer
and the context of their repository, you produce a small, well-scoped set of user stories with
concrete acceptance criteria, suitable for autonomous execution by a coding agent.

Rules:
- Break the brief into the smallest number of stories that each deliver independent value.
- Each story must have 2-8 acceptance criteria, each testable and observable.
- List the specific files or directories you expect to touch (best effort — relative paths).
- Propose dependencies ONLY when story B genuinely cannot start before story A completes.
  Dependencies are a zero-indexed DAG over the stories array. Shallow graphs are better.
- Respect every rule found in the repository's AI convention files (CLAUDE.md, AGENTS.md, etc.).
- Never invent stories the user did not ask for. Prefer fewer, sharper stories.

You MUST call the ${TOOL_NAME} tool exactly once with your plan.`;

function jsonSchemaForPlan() {
  const schema = z.toJSONSchema(RefinedPlanSchema, { target: 'draft-7' }) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
}

export async function refine(params: {
  folderPath: string;
  brief: string;
  apiKey?: string;
  model?: string;
}): Promise<RefinedPlan> {
  const apiKey = params.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');

  const ctx = await collectRepoContext(params.folderPath);
  const contextBlock = renderContextForPrompt(ctx);

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: params.model ?? DEFAULT_MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    tools: [
      {
        name: TOOL_NAME,
        description: 'Submit the refined plan of user stories and their dependencies.',
        input_schema: jsonSchemaForPlan() as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: 'tool', name: TOOL_NAME },
    messages: [
      {
        role: 'user',
        content: `${contextBlock}\n\n---\n\n## Developer brief\n\n${params.brief}\n\nCall ${TOOL_NAME} with the refined plan.`,
      },
    ],
  });

  const toolUse = response.content.find((block) => block.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error(
      `Model did not call ${TOOL_NAME}. stop_reason=${response.stop_reason}, content types=${response.content
        .map((c) => c.type)
        .join(',')}`
    );
  }

  const parsed = RefinedPlanSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    throw new Error(`Plan failed schema validation: ${parsed.error.message}`);
  }
  return parsed.data;
}
