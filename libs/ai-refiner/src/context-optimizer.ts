import type { RepoContext, RepoFile } from './repo-context';

const README_MAX_LINES = 100;

const PACKAGE_JSON_KEEP_KEYS = new Set([
  'name',
  'version',
  'description',
  'type',
  'main',
  'module',
  'exports',
  'scripts',
  'engines',
  'packageManager',
  'workspaces',
]);

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function rawText(ctx: RepoContext): string {
  return [
    ...ctx.aiConventions.map((f) => f.content),
    ...ctx.projectInfo.map((f) => f.content),
    ctx.tree,
  ].join('\n');
}

function truncateReadme(content: string): string {
  const lines = content.split('\n');
  let breakAt = lines.length;

  for (let i = 5; i < Math.min(README_MAX_LINES, lines.length); i++) {
    const line = lines[i];
    if (/^---+\s*$/.test(line) || /^===+\s*$/.test(line)) {
      breakAt = i;
      break;
    }
    if (/^## /.test(line)) {
      breakAt = i;
      break;
    }
  }

  if (breakAt >= lines.length && lines.length > README_MAX_LINES) {
    breakAt = README_MAX_LINES;
  }

  if (breakAt >= lines.length) return content;
  return lines.slice(0, breakAt).join('\n') + '\n…[truncated for planning context]';
}

function optimizePackageJson(content: string): string {
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    const filtered: Record<string, unknown> = {};
    for (const key of Object.keys(parsed)) {
      if (PACKAGE_JSON_KEEP_KEYS.has(key)) filtered[key] = parsed[key];
    }
    return JSON.stringify(filtered, null, 2);
  } catch {
    return content;
  }
}

function optimizeFile(file: RepoFile): RepoFile {
  const name = (file.relPath.split('/').pop() ?? file.relPath).toLowerCase();
  if (name === 'readme.md') return { ...file, content: truncateReadme(file.content) };
  if (name === 'package.json') return { ...file, content: optimizePackageJson(file.content) };
  return file;
}

export function optimizeContext(ctx: RepoContext): RepoContext {
  if (process.env.ZIBBY_SKIP_CONTEXT_OPTIMIZATION === '1') return ctx;

  const optimized: RepoContext = {
    ...ctx,
    projectInfo: ctx.projectInfo.map(optimizeFile),
  };

  const baseline = estimateTokens(rawText(ctx));
  const after = estimateTokens(rawText(optimized));
  const pct = baseline > 0 ? Math.round((1 - after / baseline) * 100) : 0;
  console.log(`[zibby] context optimization: ${baseline} → ${after} est. tokens (${pct}% reduction)`);

  return optimized;
}
