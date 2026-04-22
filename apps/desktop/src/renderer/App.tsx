import { useEffect, useMemo, useState } from 'react';
import type {
  PickFolderResult,
  RefinedPlan,
  Story,
  Dependency,
  RunEvent,
  StoryStatus,
} from '@zibby/shared-types/ipc';

type SelectedFolder = Extract<PickFolderResult, { kind: 'selected' }>;

type StoryRuntime = {
  status: StoryStatus;
  logs: { stream: 'stdout' | 'stderr' | 'info'; line: string; ts: number }[];
  prUrl?: string;
  branch?: string;
};

function emptyRuntime(): StoryRuntime {
  return { status: 'pending', logs: [] };
}

export default function App() {
  const [folder, setFolder] = useState<SelectedFolder | null>(null);
  const [brief, setBrief] = useState('');
  const [refining, setRefining] = useState(false);
  const [plan, setPlan] = useState<RefinedPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [runId, setRunId] = useState<string | null>(null);
  const [runtime, setRuntime] = useState<Record<number, StoryRuntime>>({});
  const [runDone, setRunDone] = useState<boolean | null>(null);

  useEffect(() => {
    const unsub = window.zibby.onRunEvent((event: RunEvent) => {
      if (event.kind === 'run-done') {
        setRunDone(event.success);
        setRunId(null);
        return;
      }
      setRuntime((prev) => {
        const idx = event.storyIndex;
        const cur = prev[idx] ?? emptyRuntime();
        const next: StoryRuntime = { ...cur };
        if (event.kind === 'status') next.status = event.status;
        else if (event.kind === 'log')
          next.logs = [...cur.logs, { stream: event.stream, line: event.line, ts: Date.now() }].slice(-200);
        else if (event.kind === 'pr') {
          next.prUrl = event.url;
          next.branch = event.branch;
        }
        return { ...prev, [idx]: next };
      });
    });
    return unsub;
  }, []);

  const handlePick = async () => {
    const result = await window.zibby.pickFolder();
    if (result.kind === 'selected') {
      setFolder(result);
      setPlan(null);
      setError(null);
      setRuntime({});
      setRunDone(null);
    } else {
      setFolder(null);
    }
  };

  const handleRefine = async () => {
    if (!folder) return;
    setRefining(true);
    setError(null);
    setPlan(null);
    setRuntime({});
    setRunDone(null);
    const res = await window.zibby.refine({ folderPath: folder.path, brief });
    setRefining(false);
    if (res.kind === 'ok') setPlan(res.plan);
    else setError(res.message);
  };

  const handleRun = async () => {
    if (!folder || !plan) return;
    setRunDone(null);
    setRuntime(Object.fromEntries(plan.stories.map((_, i) => [i, emptyRuntime()])));
    const res = await window.zibby.startRun({ folderPath: folder.path, plan });
    if (res.kind === 'started') setRunId(res.runId);
    else setError(res.message);
  };

  const handleCancel = async () => {
    if (!runId) return;
    await window.zibby.cancelRun(runId);
  };

  const running = runId !== null;
  const canRun = plan !== null && folder?.isGitRepo === true && folder?.hasOrigin === true && !running;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Zibby 2.0</h1>
          <p className="text-neutral-400 text-sm">
            Pick a folder, describe what you want done, and Claude Code executes the plan in isolated worktrees.
          </p>
        </header>

        <FolderSection folder={folder} onPick={handlePick} />

        {folder && (
          <BriefSection
            brief={brief}
            onBrief={setBrief}
            disabled={refining || !brief.trim() || running}
            refining={refining}
            onRefine={handleRefine}
          />
        )}

        {refining && <RefineProgress />}

        {error && (
          <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-200 text-sm p-4">
            <strong className="font-semibold">Error:</strong> {error}
          </div>
        )}

        {plan && (
          <PlanView
            plan={plan}
            runtime={runtime}
            running={running}
            canRun={canRun}
            runDone={runDone}
            onRun={handleRun}
            onCancel={handleCancel}
          />
        )}
      </div>
    </div>
  );
}

function FolderSection({ folder, onPick }: { folder: SelectedFolder | null; onPick: () => void }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          onClick={onPick}
          className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium"
        >
          {folder ? 'Change folder' : 'Select folder'}
        </button>
        {folder && <span className="font-mono text-sm text-neutral-300 truncate">{folder.path}</span>}
      </div>
      {folder && (
        <div className="flex gap-2 text-xs">
          <Badge ok={folder.isGitRepo} label={folder.isGitRepo ? 'Git repo' : 'Not a git repo'} />
          <Badge ok={folder.hasOrigin} label={folder.hasOrigin ? 'origin remote' : 'no origin'} />
        </div>
      )}
    </section>
  );
}

function BriefSection({
  brief,
  onBrief,
  disabled,
  refining,
  onRefine,
}: {
  brief: string;
  onBrief: (v: string) => void;
  disabled: boolean;
  refining: boolean;
  onRefine: () => void;
}) {
  return (
    <section className="space-y-3">
      <label className="block text-sm font-medium text-neutral-300">Brief</label>
      <textarea
        value={brief}
        onChange={(e) => onBrief(e.target.value)}
        placeholder="Describe one or more tasks — Sonnet will expand them into user stories with acceptance criteria."
        rows={6}
        className="w-full rounded-lg bg-neutral-900 border border-neutral-800 focus:border-indigo-500 focus:outline-none p-3 text-sm font-mono text-neutral-100 placeholder:text-neutral-600"
      />
      <div className="flex justify-end">
        <button
          onClick={onRefine}
          disabled={disabled}
          className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium"
        >
          {refining ? 'Refining…' : 'Refine with Sonnet (Max)'}
        </button>
      </div>
    </section>
  );
}

function RefineProgress() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.round((Date.now() - start) / 1000)), 500);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 flex items-center gap-3 text-sm text-neutral-300">
      <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
      <span>Running claude CLI refine session…</span>
      <span className="ml-auto font-mono text-neutral-500">{elapsed}s</span>
    </div>
  );
}

function PlanView({
  plan,
  runtime,
  running,
  canRun,
  runDone,
  onRun,
  onCancel,
}: {
  plan: RefinedPlan;
  runtime: Record<number, StoryRuntime>;
  running: boolean;
  canRun: boolean;
  runDone: boolean | null;
  onRun: () => void;
  onCancel: () => void;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-200">Refined plan</h2>
        <div className="flex items-center gap-3">
          {runDone === true && <span className="text-emerald-400 text-sm">All done ✓</span>}
          {runDone === false && <span className="text-rose-400 text-sm">Run failed</span>}
          {running ? (
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 text-white text-sm font-medium"
            >
              Cancel run
            </button>
          ) : (
            <button
              onClick={onRun}
              disabled={!canRun}
              className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium"
            >
              Run all
            </button>
          )}
        </div>
      </div>

      {!canRun && !running && (
        <p className="text-xs text-amber-300">
          The selected folder must be a git repo with an <code className="font-mono">origin</code> remote to run.
        </p>
      )}

      <div className="space-y-3">
        {plan.stories.map((story, i) => {
          const waitsOn = plan.dependencies.filter((d) => d.to === i).map((d) => d.from);
          return (
            <StoryCard
              key={i}
              index={i}
              story={story}
              runtime={runtime[i] ?? emptyRuntime()}
              waitsOn={waitsOn}
            />
          );
        })}
      </div>
      {plan.dependencies.length > 0 && <DependencyList deps={plan.dependencies} />}
    </section>
  );
}

const STATUS_STYLE: Record<StoryStatus, string> = {
  pending: 'bg-neutral-700 text-neutral-300',
  blocked: 'bg-neutral-700 text-neutral-400',
  running: 'bg-indigo-500/20 text-indigo-300',
  pushing: 'bg-sky-500/20 text-sky-300',
  done: 'bg-emerald-500/20 text-emerald-300',
  failed: 'bg-rose-500/20 text-rose-300',
  cancelled: 'bg-amber-500/20 text-amber-300',
};

function StoryCard({
  index,
  story,
  runtime,
  waitsOn,
}: {
  index: number;
  story: Story;
  runtime: StoryRuntime;
  waitsOn: number[];
}) {
  return (
    <article className="rounded-lg bg-neutral-900 border border-neutral-800 p-4 space-y-3">
      <header className="flex items-start gap-3">
        <span className="shrink-0 text-xs font-semibold text-neutral-500 mt-0.5">#{index}</span>
        <h3 className="text-base font-semibold text-neutral-100 flex-1">{story.title}</h3>
        {waitsOn.length > 0 && (
          <span className="shrink-0 text-xs text-neutral-500">
            waits on {waitsOn.map((i) => `#${i}`).join(', ')}
          </span>
        )}
        <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLE[runtime.status]}`}>
          {runtime.status}
        </span>
      </header>
      <p className="text-sm text-neutral-300">{story.description}</p>
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1">Acceptance criteria</h4>
        <ul className="list-disc list-inside text-sm text-neutral-200 space-y-0.5">
          {story.acceptanceCriteria.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </div>
      {story.affectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {story.affectedFiles.map((f, i) => (
            <code key={i} className="px-2 py-0.5 rounded bg-neutral-800 text-xs text-neutral-300">
              {f}
            </code>
          ))}
        </div>
      )}
      {runtime.prUrl && (
        <a
          href={runtime.prUrl}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-sky-400 hover:text-sky-300 underline"
        >
          {runtime.prUrl}
        </a>
      )}
      {runtime.logs.length > 0 && <LogTail logs={runtime.logs} />}
    </article>
  );
}

function LogTail({ logs }: { logs: StoryRuntime['logs'] }) {
  const tail = useMemo(() => logs.slice(-12), [logs]);
  return (
    <pre className="text-[11px] leading-tight font-mono bg-neutral-950/60 border border-neutral-800 rounded p-2 max-h-48 overflow-y-auto whitespace-pre-wrap break-words">
      {tail.map((l, i) => (
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
  );
}

function DependencyList({ deps }: { deps: Dependency[] }) {
  return (
    <div className="rounded-lg bg-neutral-900 border border-neutral-800 p-4 space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Dependencies</h4>
      <ul className="text-sm space-y-1">
        {deps.map((d, i) => (
          <li key={i} className="text-neutral-300">
            <span className="text-neutral-500">#{d.from}</span>
            <span className="mx-2 text-neutral-600">→</span>
            <span className="text-neutral-500">#{d.to}</span>
            <span className="ml-3 text-neutral-400">{d.reason}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${
        ok ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'
      }`}
    >
      {label}
    </span>
  );
}
