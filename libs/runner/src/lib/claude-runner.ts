import { spawn } from 'child_process';
import type { RunnerConfig, RunnerEvent } from './types';
import { hasNewCommits } from './worktree';

export interface SuccessCheckInput {
  exitCode: number;
  resultSubtype: string | null;
  hasCommits: boolean;
}

export function detectSuccess(input: SuccessCheckInput): boolean {
  return input.exitCode === 0 && input.resultSubtype === 'success' && input.hasCommits;
}

export function parseStreamLine(line: string): RunnerEvent | null {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(line) as Record<string, unknown>;
  } catch {
    return null;
  }

  const type = parsed['type'] as string;

  if (type === 'assistant' || type === 'user' || type === 'system') {
    return { type: 'log', stream: 'STDOUT', line };
  }

  if (type === 'result') {
    const subtype = parsed['subtype'] as string;
    if (subtype === 'success') {
      return { type: 'result_success', summary: (parsed['result'] as string) ?? '' };
    }
    return { type: 'result_error', error: (parsed['error'] as string) ?? 'Unknown error' };
  }

  return null;
}

export interface RunSubtaskOptions {
  worktreePath: string;
  prompt: string;
  config: RunnerConfig;
}

export async function* runSubtask(
  opts: RunSubtaskOptions,
): AsyncGenerator<RunnerEvent> {
  const { worktreePath, prompt, config } = opts;

  const args = [
    '-p', prompt,
    '--output-format', 'stream-json',
    '--include-partial-messages',
    '--max-turns', String(config.maxTurns),
    '--model', config.model,
    '--permission-mode', 'bypassPermissions',
  ];

  yield { type: 'system', message: `Spawning claude --max-turns ${config.maxTurns} --model ${config.model}` };

  const proc = spawn('claude', args, {
    cwd: worktreePath,
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let resultSubtype: string | null = null;
  let resultSummary = '';
  let stdoutBuf = '';
  let stderrBuf = '';

  for await (const chunk of proc.stdout) {
    stdoutBuf += (chunk as Buffer).toString('utf8');
    const lines = stdoutBuf.split('\n');
    stdoutBuf = lines.pop() ?? '';
    for (const rawLine of lines) {
      if (!rawLine.trim()) continue;
      const event = parseStreamLine(rawLine);
      if (event) {
        if (event.type === 'result_success') {
          resultSubtype = 'success';
          resultSummary = event.summary;
        } else if (event.type === 'result_error') {
          resultSubtype = 'error';
        }
        yield event;
      } else {
        yield { type: 'log', stream: 'STDOUT', line: rawLine };
      }
    }
  }

  for await (const chunk of proc.stderr) {
    stderrBuf += (chunk as Buffer).toString('utf8');
    const lines = stderrBuf.split('\n');
    stderrBuf = lines.pop() ?? '';
    for (const rawLine of lines) {
      if (rawLine.trim()) yield { type: 'log', stream: 'STDERR', line: rawLine };
    }
  }

  if (stdoutBuf.trim()) yield { type: 'log', stream: 'STDOUT', line: stdoutBuf };
  if (stderrBuf.trim()) yield { type: 'log', stream: 'STDERR', line: stderrBuf };

  const exitCode: number = await new Promise((resolve) => {
    proc.on('close', resolve);
  });

  const commits = await hasNewCommits(worktreePath, config.baseBranch);

  if (detectSuccess({ exitCode, resultSubtype, hasCommits: commits })) {
    yield { type: 'result_success', summary: resultSummary };
  } else {
    yield {
      type: 'result_error',
      error: `exitCode=${exitCode}, resultSubtype=${resultSubtype ?? 'none'}, hasCommits=${commits}`,
    };
  }
}
