import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const MAX_FILE_CHARS = 20_000;

const AI_CONVENTION_FILES = [
  'CLAUDE.md',
  'claude.md',
  'AGENTS.md',
  'agents.md',
  '.claude/CLAUDE.md',
  '.agents/AGENTS.md',
  '.cursorrules',
  '.windsurfrules',
  '.copilot-instructions.md',
  '.github/copilot-instructions.md',
];

const PROJECT_INFO_FILES = ['README.md', 'readme.md', 'package.json'];

export type RepoFile = { relPath: string; content: string };

export type RepoContext = {
  folderPath: string;
  aiConventions: RepoFile[];
  projectInfo: RepoFile[];
  tree: string;
};

async function readIfExists(folder: string, relPath: string): Promise<RepoFile | null> {
  try {
    const raw = await readFile(path.join(folder, relPath), 'utf8');
    const content = raw.length > MAX_FILE_CHARS ? raw.slice(0, MAX_FILE_CHARS) + '\n…[truncated]' : raw;
    return { relPath, content };
  } catch {
    return null;
  }
}

async function readDirIfExists(folder: string, relDir: string): Promise<RepoFile[]> {
  const files: RepoFile[] = [];
  try {
    const abs = path.join(folder, relDir);
    const entries = await readdir(abs);
    for (const entry of entries) {
      if (!entry.endsWith('.md') && !entry.endsWith('.mdc')) continue;
      const f = await readIfExists(folder, path.join(relDir, entry));
      if (f) files.push(f);
    }
  } catch {
    // directory doesn't exist — fine
  }
  return files;
}

async function buildTree(folder: string, depth = 2): Promise<string> {
  const skipDirs = new Set([
    'node_modules',
    '.git',
    'dist',
    'dist-main',
    'dist-renderer',
    'dist-preload',
    'build',
    'out',
    'coverage',
    '.next',
    '.turbo',
    '.cache',
    '.nx',
    '.worktrees',
    '.auto-claude',
  ]);
  const lines: string[] = [];
  async function walk(dir: string, prefix: string, remaining: number) {
    if (remaining < 0) return;
    let entries: string[] = [];
    try {
      entries = await readdir(dir);
    } catch {
      return;
    }
    entries.sort();
    for (const entry of entries) {
      if (entry.startsWith('.') && entry !== '.claude' && entry !== '.agents' && entry !== '.github') continue;
      if (skipDirs.has(entry)) continue;
      const abs = path.join(dir, entry);
      let isDir = false;
      try {
        isDir = (await stat(abs)).isDirectory();
      } catch {
        continue;
      }
      lines.push(`${prefix}${isDir ? '📁 ' : '📄 '}${entry}`);
      if (isDir && remaining > 0) {
        await walk(abs, prefix + '  ', remaining - 1);
      }
    }
  }
  await walk(folder, '', depth);
  return lines.slice(0, 200).join('\n');
}

export async function collectRepoContext(folderPath: string): Promise<RepoContext> {
  const aiConventions: RepoFile[] = [];
  for (const rel of AI_CONVENTION_FILES) {
    const f = await readIfExists(folderPath, rel);
    if (f) aiConventions.push(f);
  }
  aiConventions.push(...(await readDirIfExists(folderPath, '.cursor/rules')));

  const projectInfo: RepoFile[] = [];
  for (const rel of PROJECT_INFO_FILES) {
    const f = await readIfExists(folderPath, rel);
    if (f) projectInfo.push(f);
  }

  const tree = await buildTree(folderPath, 2);

  return { folderPath, aiConventions, projectInfo, tree };
}

export function renderContextForPrompt(ctx: RepoContext): string {
  const parts: string[] = [];

  if (ctx.aiConventions.length > 0) {
    parts.push('## Project AI conventions');
    parts.push(
      'The target repository defines the following AI-assistant conventions. Any plan you produce MUST respect them.'
    );
    for (const f of ctx.aiConventions) {
      parts.push(`### ${f.relPath}\n\n${f.content}`);
    }
  }

  if (ctx.projectInfo.length > 0) {
    parts.push('## Project overview');
    for (const f of ctx.projectInfo) {
      parts.push(`### ${f.relPath}\n\n${f.content}`);
    }
  }

  parts.push('## Directory tree (depth 2)');
  parts.push('```\n' + (ctx.tree || '(empty)') + '\n```');

  return parts.join('\n\n');
}
