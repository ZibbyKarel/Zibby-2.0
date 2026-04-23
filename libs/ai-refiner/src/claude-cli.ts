import { spawn } from 'node:child_process';
import { z } from 'zod';

export const ClaudeResultEnvelopeSchema = z.object({
  type: z.literal('result'),
  subtype: z.string(),
  is_error: z.boolean(),
  result: z.string().optional(),
  structured_output: z.unknown().optional(),
  stop_reason: z.string().optional(),
});

export function parseClaudeOutput<T>(stdout: string, schema: z.ZodType<T>): T {
  let envelope: unknown;
  try {
    envelope = JSON.parse(stdout);
  } catch {
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

  const parsed = schema.safeParse(env.data.structured_output);
  if (!parsed.success) {
    throw new Error(`Schema validation failed: ${parsed.error.message}`);
  }
  return parsed.data;
}

export function runClaudeCli(args: {
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
          `claude CLI timed out after ${args.timeoutMs}ms (stderr so far: ${stderr.trim().slice(-400) || '<empty>'})`
        )
      );
    }, args.timeoutMs);

    proc.stdout.on('data', (chunk) => (stdout += chunk.toString()));
    proc.stderr.on('data', (chunk) => (stderr += chunk.toString()));

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
      resolve(stdout);
    });
  });
}
