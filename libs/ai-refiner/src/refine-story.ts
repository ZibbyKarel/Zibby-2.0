import { z } from 'zod';
import { StorySchema } from '@zibby/shared-types/schemas';
import type { Story } from '@zibby/shared-types/ipc';
import { collectRepoContext, renderContextForPrompt } from './repo-context';
import { runClaudeCli, parseClaudeOutput } from './claude-cli';

const DEFAULT_MODEL = process.env.CLAUDE_REFINE_MODEL ?? 'sonnet';
const DEFAULT_TIMEOUT_MS = Number(process.env.CLAUDE_REFINE_TIMEOUT_MS ?? 120_000);
const DEFAULT_CLAUDE_BIN = process.env.CLAUDE_CLI_PATH ?? 'claude';

const SYSTEM_PROMPT = `You are a senior technical project manager. Given a task title and brief description from a developer and the context of their repository, expand it into a single, well-scoped user story ready for autonomous execution by a coding agent.

Rules:
- Keep the title concise and imperative (max 120 characters).
- Write a clear description that explains what needs to be done and why.
- Add 2–8 acceptance criteria, each concrete and testable.
- List the specific files or directories you expect to touch (relative paths, best effort).
- Respect every rule found in the repository's AI convention files (CLAUDE.md, AGENTS.md, etc.).
- Return the story via structured output — no prose commentary.`;

function jsonSchemaForStory() {
  const schema = z.toJSONSchema(StorySchema, { target: 'draft-7' }) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
}

export async function refineStory(params: {
  folderPath: string;
  title: string;
  description: string;
  timeoutMs?: number;
  claudeBin?: string;
}): Promise<Story> {
  const ctx = await collectRepoContext(params.folderPath);
  const contextBlock = renderContextForPrompt(ctx);
  const userPrompt = `${contextBlock}\n\n---\n\n## Task to expand\n\n**Title:** ${params.title}\n\n**Description:** ${params.description}`;

  const stdout = await runClaudeCli({
    bin: params.claudeBin ?? DEFAULT_CLAUDE_BIN,
    prompt: userPrompt,
    systemPrompt: SYSTEM_PROMPT,
    jsonSchema: jsonSchemaForStory(),
    model: DEFAULT_MODEL,
    cwd: params.folderPath,
    timeoutMs: params.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  });

  return parseClaudeOutput(stdout, StorySchema);
}
