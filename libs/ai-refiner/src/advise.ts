import { spawn } from 'node:child_process';
import { z } from 'zod';
import { AdvisorReviewSchema } from '@zibby/shared-types/schemas';
import type { AdvisorReview, RefinedPlan } from '@zibby/shared-types/ipc';
import { collectRepoContext, renderContextForPrompt } from './repo-context';
import { optimizeContext } from './context-optimizer';

const DEFAULT_MODEL = process.env.CLAUDE_ADVISE_MODEL ?? 'opus';
const DEFAULT_TIMEOUT_MS = Number(process.env.CLAUDE_ADVISE_TIMEOUT_MS ?? 420_000);
const DEFAULT_CLAUDE_BIN = process.env.CLAUDE_CLI_PATH ?? 'claude';

const SYSTEM_PROMPT = `You are a senior principal engineer acting as an architectural advisor. You will receive
a proposed plan (a list of user stories with acceptance criteria and a dependency DAG) and the
target repository's context. Your job is to review the plan critically.

Return, via structured output:
- overall: a one- or two-sentence assessment of the plan's quality
- concerns: concrete architectural, scoping, or correctness issues you see. Only include real
  concerns. Empty array is fine if the plan is solid.
- perStoryNotes: zero or more notes pointing at a specific story index. Focus on stories that
  need sharper acceptance criteria, missing files, or missing edge cases.
- suggestedDependencies: dependencies the original plan missed that genuinely should exist. Each
  must be DIFFERENT from the dependencies already present in the plan. Do not duplicate.

Be direct and concrete. Do not flatter. No prose commentary outside structured output.`;

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
    const proc = spawn(
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
        stdio: ['ignore', 'pipe', 'pipe'],
        env: process.env,
      }
    );

    let stdout = '';
    let stderr = '';
    let settled = false;
    const start = Date.now();
    const elapsed = () => `${Math.round((Date.now() - start) / 1000)}s`;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      proc.kill('SIGTERM');
      reject(
        new Error(
          `claude advisor timed out after ${args.timeoutMs}ms (stderr tail: ${stderr.trim().slice(-400) || '<empty>'})`
        )
      );
    }, args.timeoutMs);

    proc.stdout.on('data', (c) => (stdout += c.toString()));
    proc.stderr.on('data', (c) => (stderr += c.toString()));
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
            `claude advisor exited with code ${code}${signal ? ` (signal ${signal})` : ''} after ${elapsed()}: ${stderr.trim() || '<empty stderr>'}`
          )
        );
        return;
      }
      resolve(stdout);
    });
  });
}

function jsonSchemaForReview() {
  const schema = z.toJSONSchema(AdvisorReviewSchema, { target: 'draft-7' }) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
}

function renderPlanForPrompt(plan: RefinedPlan): string {
  const stories = plan.stories
    .map((s, i) => {
      const ac = s.acceptanceCriteria.map((c, j) => `  ${j + 1}. ${c}`).join('\n');
      const files = s.affectedFiles.length > 0 ? `\n  files: ${s.affectedFiles.join(', ')}` : '';
      return `### Story #${i} — ${s.title}\n\n${s.description}\n\nAcceptance criteria:\n${ac}${files}`;
    })
    .join('\n\n');
  const deps =
    plan.dependencies.length > 0
      ? plan.dependencies.map((d) => `- #${d.from} → #${d.to}: ${d.reason}`).join('\n')
      : '- (none)';
  return `## Proposed stories\n\n${stories}\n\n## Proposed dependencies\n\n${deps}`;
}

export async function advise(params: {
  folderPath: string;
  plan: RefinedPlan;
  model?: string;
  timeoutMs?: number;
  claudeBin?: string;
}): Promise<AdvisorReview> {
  const ctx = await collectRepoContext(params.folderPath);
  const contextBlock = renderContextForPrompt(optimizeContext(ctx));
  const planBlock = renderPlanForPrompt(params.plan);
  const userPrompt = `${contextBlock}\n\n---\n\n${planBlock}\n\n---\n\nReview the plan and return your structured assessment.`;

  const stdout = await runClaudeCli({
    bin: params.claudeBin ?? DEFAULT_CLAUDE_BIN,
    prompt: userPrompt,
    systemPrompt: SYSTEM_PROMPT,
    jsonSchema: jsonSchemaForReview(),
    model: params.model ?? DEFAULT_MODEL,
    cwd: params.folderPath,
    timeoutMs: params.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  });

  let envelope: unknown;
  try {
    envelope = JSON.parse(stdout);
  } catch {
    throw new Error(`claude advisor returned non-JSON: ${stdout.slice(0, 300)}`);
  }
  const env = ClaudeResultEnvelopeSchema.safeParse(envelope);
  if (!env.success) throw new Error(`unexpected advisor envelope: ${env.error.message}`);
  if (env.data.is_error) {
    throw new Error(`advisor reported error (${env.data.subtype}): ${env.data.result ?? '<no detail>'}`);
  }
  if (env.data.structured_output === undefined) {
    throw new Error(`advisor did not produce structured_output (stop_reason=${env.data.stop_reason ?? '?'})`);
  }
  const parsed = AdvisorReviewSchema.safeParse(env.data.structured_output);
  if (!parsed.success) throw new Error(`advisor output failed schema: ${parsed.error.message}`);
  return parsed.data;
}
