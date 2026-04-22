import { execFile } from 'node:child_process';
import { z } from 'zod';
import { RefinedPlanSchema } from '@zibby/shared-types/schemas';
import type { RefinedPlan } from '@zibby/shared-types/ipc';
import { collectRepoContext, renderContextForPrompt } from './repo-context';

const DEFAULT_MODEL = process.env.CLAUDE_REFINE_MODEL ?? 'sonnet';
const DEFAULT_TIMEOUT_MS = 120_000;
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

const ClaudeResultEnvelopeSchema = z.object({
  type: z.literal('result'),
  subtype: z.string(),
  is_error: z.boolean(),
  result: z.string().optional(),
  structured_output: z.unknown().optional(),
  stop_reason: z.string().optional(),
});

function runClaudeCli(args: {
  bin: string;
  prompt: string;
  systemPrompt: string;
  jsonSchema: unknown;
  model: string;
  cwd: string;
  timeoutMs: number;
}): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = execFile(
      args.bin,
      [
        '-p',
        args.prompt,
        '--output-format',
        'json',
        '--json-schema',
        JSON.stringify(args.jsonSchema),
        '--system-prompt',
        args.systemPrompt,
        '--model',
        args.model,
        '--tools',
        '',
        '--permission-mode',
        'bypassPermissions',
      ],
      {
        cwd: args.cwd,
        maxBuffer: 16 * 1024 * 1024,
        timeout: args.timeoutMs,
        env: process.env,
      },
      (err, stdout, stderr) => {
        if (err) {
          const msg = stderr?.toString().trim() || err.message;
          reject(new Error(`claude CLI failed: ${msg}`));
          return;
        }
        resolve(stdout.toString());
      }
    );
    proc.on('error', (e) => reject(e));
  });
}

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
  const contextBlock = renderContextForPrompt(ctx);
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

  let envelope: unknown;
  try {
    envelope = JSON.parse(stdout);
  } catch (e) {
    throw new Error(`claude CLI returned non-JSON output: ${stdout.slice(0, 300)}`);
  }

  const env = ClaudeResultEnvelopeSchema.safeParse(envelope);
  if (!env.success) {
    throw new Error(`Unexpected claude CLI envelope shape: ${env.error.message}`);
  }
  if (env.data.is_error) {
    throw new Error(`claude reported error (${env.data.subtype}): ${env.data.result ?? '<no detail>'}`);
  }
  if (env.data.structured_output === undefined) {
    throw new Error(
      `claude did not produce structured_output. stop_reason=${env.data.stop_reason ?? '?'}, ` +
        `result="${(env.data.result ?? '').slice(0, 200)}"`
    );
  }

  const parsed = RefinedPlanSchema.safeParse(env.data.structured_output);
  if (!parsed.success) {
    throw new Error(`Plan failed schema validation: ${parsed.error.message}`);
  }
  return parsed.data;
}
