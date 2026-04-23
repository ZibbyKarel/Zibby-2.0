import { z } from 'zod';
import { RefinedPlanSchema } from '@zibby/shared-types/schemas';
import type { RefinedPlan } from '@zibby/shared-types/ipc';
import { collectRepoContext, renderContextForPrompt } from './repo-context';
import { optimizeContext } from './context-optimizer';
import { runClaudeCli, parseClaudeOutput } from './claude-cli';

const DEFAULT_MODEL = process.env.CLAUDE_REFINE_MODEL ?? 'sonnet';
const DEFAULT_TIMEOUT_MS = Number(process.env.CLAUDE_REFINE_TIMEOUT_MS ?? 300_000);
const DEFAULT_CLAUDE_BIN = process.env.CLAUDE_CLI_PATH ?? 'claude';

const SYSTEM_PROMPT = `You are a senior technical project manager. Given a rough brief from a developer and
the context of their repository, produce a small, well-scoped set of user stories with concrete
acceptance criteria, suitable for autonomous execution by a coding agent.

Rules:
- Break the brief into the smallest number of stories that each deliver independent value.
- Each story must have 2-8 acceptance criteria, each testable and observable.
- List the specific files or directories you expect to touch (best effort — relative paths).
- Propose dependencies ONLY when story B genuinely cannot start before story A completes.
  Dependencies are a zero-indexed DAG over the stories array. Shallow graphs are better.
- Respect every rule found in the repository's AI convention files (CLAUDE.md, AGENTS.md, etc.).
- Never invent stories the user did not ask for. Prefer fewer, sharper stories.

Return the plan via structured output — no prose commentary.`;

function jsonSchemaForPlan() {
  const schema = z.toJSONSchema(RefinedPlanSchema, { target: 'draft-7' }) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
}

export async function refine(params: {
  folderPath: string;
  brief: string;
  model?: string;
  timeoutMs?: number;
  claudeBin?: string;
}): Promise<RefinedPlan> {
  const ctx = await collectRepoContext(params.folderPath);
  const contextBlock = renderContextForPrompt(optimizeContext(ctx));
  const userPrompt = `${contextBlock}\n\n---\n\n## Developer brief\n\n${params.brief}`;

  const stdout = await runClaudeCli({
    bin: params.claudeBin ?? DEFAULT_CLAUDE_BIN,
    prompt: userPrompt,
    systemPrompt: SYSTEM_PROMPT,
    jsonSchema: jsonSchemaForPlan(),
    model: params.model ?? DEFAULT_MODEL,
    cwd: params.folderPath,
    timeoutMs: params.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  });

  return parseClaudeOutput(stdout, RefinedPlanSchema);
}
