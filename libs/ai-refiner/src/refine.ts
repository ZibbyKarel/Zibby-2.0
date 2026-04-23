import { spawn } from 'node:child_process';
import { z } from 'zod';
import { RefinedPlanSchema } from '@zibby/shared-types/schemas';
import type { RefinedPlan } from '@zibby/shared-types/ipc';
import { collectRepoContext, renderContextForPrompt } from './repo-context';

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

const ClaudeResultEnvelopeSchema = z.object({
  type: z.literal('result'),
  subtype: z.string(),
  is_error: z.boolean(),
  result: z.string().optional(),
  structured_output: z.unknown().optional(),
  stop_reason: z.string().optional(),
});

function runClaudeCliStream(args: {
  bin: string;
  prompt: string;
  systemPrompt: string;
  jsonSchema: unknown;
  model: string;
  cwd: string;
  timeoutMs: number;
  onProgress?: (text: string) => void;
}): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      args.bin,
      [
        '-p',
        args.prompt,
        '--output-format',
        'stream-json',
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
        stdio: ['ignore', 'pipe', 'pipe'],
        env: process.env,
      }
    );

    let lineBuffer = '';
    let stderr = '';
    let resultEnvelope: unknown;
    let settled = false;
    const start = Date.now();
    const elapsed = () => `${Math.round((Date.now() - start) / 1000)}s`;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      proc.kill('SIGTERM');
      reject(
        new Error(
          `claude CLI timed out after ${args.timeoutMs}ms (stderr so far: ${stderr.trim().slice(-400) || '<empty>'})`
        )
      );
    }, args.timeoutMs);

    proc.stdout.on('data', (chunk: Buffer) => {
      lineBuffer += chunk.toString();
      let idx: number;
      while ((idx = lineBuffer.indexOf('\n')) !== -1) {
        const line = lineBuffer.slice(0, idx).trim();
        lineBuffer = lineBuffer.slice(idx + 1);
        if (!line) continue;
        let event: unknown;
        try {
          event = JSON.parse(line);
        } catch {
          continue;
        }
        if (typeof event !== 'object' || event === null) continue;
        const ev = event as Record<string, unknown>;
        if (ev['type'] === 'assistant' && args.onProgress) {
          const msg = ev['message'] as
            | { content?: Array<{ type: string; text?: string }> }
            | undefined;
          for (const block of msg?.content ?? []) {
            if (block.type === 'text' && typeof block.text === 'string' && block.text.trim()) {
              args.onProgress(block.text);
            }
          }
        } else if (ev['type'] === 'result') {
          resultEnvelope = event;
        }
      }
    });

    proc.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()));

    proc.on('error', (e) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(e);
    });

    proc.on('close', (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code !== 0) {
        reject(
          new Error(
            `claude CLI exited with code ${code}${signal ? ` (signal ${signal})` : ''} after ${elapsed()}: ${stderr.trim() || '<empty stderr>'}`
          )
        );
        return;
      }
      if (!resultEnvelope) {
        reject(
          new Error(
            `claude CLI stream ended without a result event after ${elapsed()}. stderr: ${stderr.trim().slice(-400) || '<empty>'}`
          )
        );
        return;
      }
      resolve(resultEnvelope);
    });
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
  onProgress?: (text: string) => void;
}): Promise<RefinedPlan> {
  const ctx = await collectRepoContext(params.folderPath);
  const contextBlock = renderContextForPrompt(ctx);
  const userPrompt = `${contextBlock}\n\n---\n\n## Developer brief\n\n${params.brief}`;

  const envelope = await runClaudeCliStream({
    bin: params.claudeBin ?? DEFAULT_CLAUDE_BIN,
    prompt: userPrompt,
    systemPrompt: SYSTEM_PROMPT,
    jsonSchema: jsonSchemaForPlan(),
    model: params.model ?? DEFAULT_MODEL,
    cwd: params.folderPath,
    timeoutMs: params.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    onProgress: params.onProgress,
  });

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
