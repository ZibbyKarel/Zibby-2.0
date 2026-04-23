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
