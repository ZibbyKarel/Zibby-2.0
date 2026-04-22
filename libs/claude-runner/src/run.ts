import { spawn, type ChildProcess } from 'node:child_process';
import { parseLine, renderEvent, type HumanReadable } from './stream-parser';

const DEFAULT_MODEL = process.env.CLAUDE_RUN_MODEL ?? 'sonnet';
const DEFAULT_CLAUDE_BIN = process.env.CLAUDE_CLI_PATH ?? 'claude';

export type RunnerCallbacks = {
  onEvent: (event: HumanReadable) => void;
  onStderr?: (line: string) => void;
};

export type RunnerResult = {
  success: boolean;
  stopReason?: string;
  error?: string;
  exitCode: number | null;
};

export type RunnerHandle = {
  result: Promise<RunnerResult>;
  cancel: () => void;
};

export type RunnerOptions = {
  cwd: string;
  prompt: string;
  model?: string;
  claudeBin?: string;
  addDirs?: string[];
};

export function runClaudeInWorktree(
  options: RunnerOptions,
  callbacks: RunnerCallbacks
): RunnerHandle {
  const args = [
    '-p',
    options.prompt,
    '--output-format',
    'stream-json',
    '--verbose',
    '--include-partial-messages',
    '--permission-mode',
    'bypassPermissions',
    '--model',
    options.model ?? DEFAULT_MODEL,
  ];
  for (const dir of options.addDirs ?? []) {
    args.push('--add-dir', dir);
  }

  const proc: ChildProcess = spawn(options.claudeBin ?? DEFAULT_CLAUDE_BIN, args, {
    cwd: options.cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });

  let stdoutBuffer = '';
  let stderrBuffer = '';
  let cancelled = false;
  let done = false;
  let finalResult: HumanReadable['meta'] | undefined;

  proc.stdout!.on('data', (chunk: Buffer) => {
    stdoutBuffer += chunk.toString();
    let idx: number;
    while ((idx = stdoutBuffer.indexOf('\n')) !== -1) {
      const line = stdoutBuffer.slice(0, idx);
      stdoutBuffer = stdoutBuffer.slice(idx + 1);
      const event = parseLine(line);
      if (!event) continue;
      for (const rendered of renderEvent(event)) {
        if (rendered.kind === 'done') finalResult = rendered.meta;
        callbacks.onEvent(rendered);
      }
    }
  });

  proc.stderr!.on('data', (chunk: Buffer) => {
    const text = chunk.toString();
    stderrBuffer += text;
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      callbacks.onStderr?.(trimmed);
    }
  });

  const result = new Promise<RunnerResult>((resolve) => {
    proc.on('close', (code) => {
      if (done) return;
      done = true;
      if (cancelled) {
        resolve({ success: false, error: 'cancelled', exitCode: code });
        return;
      }
      if (code !== 0) {
        resolve({
          success: false,
          error: `exit ${code}: ${stderrBuffer.trim().slice(-400) || '<empty>'}`,
          exitCode: code,
        });
        return;
      }
      const isError = finalResult?.['is_error'] === true;
      const stopReason = typeof finalResult?.['stop_reason'] === 'string' ? (finalResult['stop_reason'] as string) : undefined;
      resolve({ success: !isError, stopReason, exitCode: code });
    });

    proc.on('error', (err) => {
      if (done) return;
      done = true;
      resolve({ success: false, error: err.message, exitCode: null });
    });
  });

  return {
    result,
    cancel: () => {
      cancelled = true;
      if (!proc.killed) proc.kill('SIGTERM');
    },
  };
}
