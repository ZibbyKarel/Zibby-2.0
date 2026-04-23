import { useMemo, useState } from 'react';
import type { Story, StoryStatus } from '@zibby/shared-types/ipc';

export type StoryRuntime = {
  status: StoryStatus;
  logs: { stream: 'stdout' | 'stderr' | 'info'; line: string; ts: number }[];
  prUrl?: string;
  branch?: string;
};

const STATUS_STYLE: Record<StoryStatus, string> = {
  pending: 'bg-neutral-700 text-neutral-300',
  blocked: 'bg-neutral-700 text-neutral-400',
  running: 'bg-indigo-500/20 text-indigo-300',
  pushing: 'bg-sky-500/20 text-sky-300',
  done: 'bg-emerald-500/20 text-emerald-300',
  failed: 'bg-rose-500/20 text-rose-300',
  cancelled: 'bg-amber-500/20 text-amber-300',
};

const RUN_BUTTON_STATUSES = new Set<StoryStatus>(['pending', 'failed']);

export function StoryCard({
  index,
  story,
  runtime,
  waitsOn,
  editable,
  onChange,
  onRunStory,
  canRunIndividual,
  unmetDependencies,
  runActive,
  hasDownstreamDependents,
  onRemove,
  removeError,
}: {
  index: number;
  story: Story;
  runtime: StoryRuntime;
  waitsOn: number[];
  editable: boolean;
  onChange: (patch: Partial<Story>) => void;
  onRunStory: () => void;
  canRunIndividual: boolean;
  unmetDependencies: { index: number; title: string }[];
  runActive: boolean;
  hasDownstreamDependents: boolean;
  onRemove: () => void;
  removeError?: string | null;
}) {
  const [editing, setEditing] = useState(false);

  const showRunButton = RUN_BUTTON_STATUSES.has(runtime.status);
  const runEnabled = canRunIndividual && unmetDependencies.length === 0;
  const runTooltip = unmetDependencies.length > 0
    ? `Waiting for: ${unmetDependencies.map((d) => `#${d.index} ${d.title}`).join(', ')}`
    : !canRunIndividual
      ? 'Requires a git repo with an origin remote'
      : undefined;

  return (
    <article className="rounded-lg bg-neutral-900 border border-neutral-800 p-4 space-y-3">
      <header className="flex items-start gap-3">
        <span className="shrink-0 text-xs font-semibold text-neutral-500 mt-0.5">#{index}</span>
        {editing ? (
          <input
            value={story.title}
            onChange={(e) => onChange({ title: e.target.value })}
            className="flex-1 bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-base font-semibold text-neutral-100"
          />
        ) : (
          <h3 className="text-base font-semibold text-neutral-100 flex-1">{story.title}</h3>
        )}
        {waitsOn.length > 0 && !editing && (
          <span className="shrink-0 text-xs text-neutral-500">
            waits on {waitsOn.map((i) => `#${i}`).join(', ')}
          </span>
        )}
        <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLE[runtime.status]}`}>
          {runtime.status}
        </span>
        {showRunButton && (
          <button
            onClick={onRunStory}
            disabled={!runEnabled}
            title={runTooltip}
            className="shrink-0 px-2 py-0.5 rounded text-xs font-medium bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Run
          </button>
        )}
        {editable && (
          <button
            onClick={() => setEditing((v) => !v)}
            className="shrink-0 text-xs text-neutral-400 hover:text-neutral-200 px-2 py-0.5 rounded border border-neutral-700"
          >
            {editing ? 'Done' : 'Edit'}
          </button>
        )}
        {!runActive && (
          <button
            onClick={onRemove}
            disabled={hasDownstreamDependents}
            title={hasDownstreamDependents ? 'Remove dependents first' : 'Remove story'}
            className="shrink-0 text-xs text-neutral-500 hover:text-rose-300 px-2 py-0.5 rounded border border-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ✕
          </button>
        )}
      </header>

      {removeError && (
        <p className="text-xs text-rose-300">{removeError}</p>
      )}

      {editing ? (
        <textarea
          value={story.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={3}
          className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-sm text-neutral-200"
        />
      ) : (
        <p className="text-sm text-neutral-300 whitespace-pre-wrap">{story.description}</p>
      )}

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1">
          Acceptance criteria
          {editing && <span className="ml-2 font-normal normal-case text-neutral-600">one per line</span>}
        </h4>
        {editing ? (
          <textarea
            value={story.acceptanceCriteria.join('\n')}
            onChange={(e) =>
              onChange({
                acceptanceCriteria: e.target.value
                  .split('\n')
                  .map((l) => l.trim())
                  .filter((l) => l.length > 0),
              })
            }
            rows={Math.max(3, story.acceptanceCriteria.length + 1)}
            className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-sm text-neutral-200 font-mono"
          />
        ) : (
          <ul className="list-disc list-inside text-sm text-neutral-200 space-y-0.5">
            {story.acceptanceCriteria.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        )}
      </div>

      <div>
        {editing ? (
          <div className="space-y-2">
            <label className="block">
              <span className="block text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1">
                Affected files <span className="font-normal normal-case text-neutral-600">comma-separated</span>
              </span>
              <input
                value={story.affectedFiles.join(', ')}
                onChange={(e) =>
                  onChange({
                    affectedFiles: e.target.value
                      .split(',')
                      .map((f) => f.trim())
                      .filter((f) => f.length > 0),
                  })
                }
                className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-sm font-mono text-neutral-300"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1">
                Model override
              </span>
              <select
                value={story.model ?? ''}
                onChange={(e) => onChange({ model: e.target.value || undefined })}
                className="w-48 bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-sm text-neutral-200"
              >
                <option value="">Default (sonnet)</option>
                <option value="sonnet">Sonnet</option>
                <option value="opus">Opus</option>
                <option value="haiku">Haiku</option>
              </select>
            </label>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            {story.affectedFiles.map((f, i) => (
              <code key={i} className="px-2 py-0.5 rounded bg-neutral-800 text-xs text-neutral-300">
                {f}
              </code>
            ))}
            {story.model && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-500/15 text-indigo-300">
                model: {story.model}
              </span>
            )}
          </div>
        )}
      </div>

      {runtime.prUrl && (
        <a
          href={runtime.prUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-sky-400 hover:text-sky-300 underline break-all"
        >
          {runtime.prUrl}
        </a>
      )}
      {runtime.logs.length > 0 && <LogTail logs={runtime.logs} />}
    </article>
  );
}

function LogTail({ logs }: { logs: StoryRuntime['logs'] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = useMemo(() => (expanded ? logs : logs.slice(-12)), [logs, expanded]);
  return (
    <div className="space-y-1">
      <pre
        className={`text-[11px] leading-tight font-mono bg-neutral-950/60 border border-neutral-800 rounded p-2 overflow-y-auto whitespace-pre-wrap break-words ${expanded ? 'max-h-[32rem]' : 'max-h-48'}`}
      >
        {visible.map((l, i) => (
          <div
            key={i}
            className={
              l.stream === 'stderr' ? 'text-rose-300' : l.stream === 'info' ? 'text-sky-300' : 'text-neutral-300'
            }
          >
            {l.line}
          </div>
        ))}
      </pre>
      {logs.length > 12 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-neutral-500 hover:text-neutral-300"
        >
          {expanded ? 'Collapse log' : `Show full log (${logs.length} lines)`}
        </button>
      )}
    </div>
  );
}
