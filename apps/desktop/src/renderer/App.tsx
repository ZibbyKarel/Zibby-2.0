import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  PickFolderResult,
  RefinedPlan,
  Story,
  Dependency,
  RunEvent,
  StoryStatus,
  AdvisorReview,
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

  const [advising, setAdvising] = useState(false);
  const [review, setReview] = useState<AdvisorReview | null>(null);
  const [loadedState, setLoadedState] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const restored = await window.zibby.loadState();
      if (cancelled) return;
      if (restored.folder && restored.folder.kind === 'selected') setFolder(restored.folder);
      setBrief(restored.brief);
      setPlan(restored.plan);
      setLoadedState(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loadedState) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void window.zibby.saveState({
        folderPath: folder?.path,
        brief: brief || undefined,
        plan: plan ?? undefined,
      });
    }, 500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [folder, brief, plan, loadedState]);

  const updateStory = (index: number, patch: Partial<Story>) =>
    setPlan((cur) =>
      cur
        ? {
            ...cur,
            stories: cur.stories.map((s, i) => (i === index ? { ...s, ...patch } : s)),
          }
        : cur
    );

  const removeDependency = (depIndex: number) =>
    setPlan((cur) =>
      cur ? { ...cur, dependencies: cur.dependencies.filter((_, i) => i !== depIndex) } : cur
    );

  const applySuggestedDependency = (dep: Dependency) => {
    setPlan((cur) => {
      if (!cur) return cur;
      const exists = cur.dependencies.some((d) => d.from === dep.from && d.to === dep.to);
      if (exists) return cur;
      return { ...cur, dependencies: [...cur.dependencies, dep] };
    });
    setReview((cur) =>
      cur
        ? {
            ...cur,
            suggestedDependencies: cur.suggestedDependencies.filter(
              (d) => !(d.from === dep.from && d.to === dep.to)
            ),
          }
        : cur
    );
  };

  const addDependency = (dep: Dependency): string | null => {
    if (!plan) return 'no plan';
    if (dep.from === dep.to) return 'from and to must differ';
    if (dep.from < 0 || dep.to < 0 || dep.from >= plan.stories.length || dep.to >= plan.stories.length) {
      return 'story index out of range';
    }
    if (plan.dependencies.some((d) => d.from === dep.from && d.to === dep.to)) {
      return 'dependency already exists';
    }
    setPlan((cur) => (cur ? { ...cur, dependencies: [...cur.dependencies, dep] } : cur));
    return null;
  };

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
          next.logs = [...cur.logs, { stream: event.stream, line: event.line, ts: Date.now() }].slice(-2000);
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

  const handleAdvise = async () => {
    if (!folder || !plan) return;
    setAdvising(true);
    setError(null);
    setReview(null);
    const res = await window.zibby.advise({ folderPath: folder.path, plan });
    setAdvising(false);
    if (res.kind === 'ok') setReview(res.review);
    else setError(res.message);
  };

  const handleCancel = async () => {
    if (!runId) return;
    await window.zibby.cancelRun(runId);
  };

  const running = runId !== null;
  const canRun =
    plan !== null &&
    folder?.isGitRepo === true &&
    folder?.hasOrigin === true &&
    !running &&
    !advising;

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
            onUpdateStory={updateStory}
            onRemoveDependency={removeDependency}
            review={review}
            advising={advising}
            onAdvise={handleAdvise}
            onApplySuggestedDependency={applySuggestedDependency}
            onAddDependency={addDependency}
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
  onUpdateStory,
  onRemoveDependency,
  review,
  advising,
  onAdvise,
  onApplySuggestedDependency,
  onAddDependency,
}: {
  plan: RefinedPlan;
  runtime: Record<number, StoryRuntime>;
  running: boolean;
  canRun: boolean;
  runDone: boolean | null;
  onRun: () => void;
  onCancel: () => void;
  onUpdateStory: (index: number, patch: Partial<Story>) => void;
  onRemoveDependency: (depIndex: number) => void;
  review: AdvisorReview | null;
  advising: boolean;
  onAdvise: () => void;
  onApplySuggestedDependency: (dep: Dependency) => void;
  onAddDependency: (dep: Dependency) => string | null;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-200">Refined plan</h2>
        <div className="flex items-center gap-3">
          {runDone === true && <span className="text-emerald-400 text-sm">All done ✓</span>}
          {runDone === false && <span className="text-rose-400 text-sm">Run failed</span>}
          <button
            onClick={onAdvise}
            disabled={advising || running}
            className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-200 text-sm font-medium border border-neutral-700"
          >
            {advising ? 'Asking Opus…' : 'Ask Opus'}
          </button>
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

      {advising && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 flex items-center gap-3 text-sm text-neutral-300">
          <span className="inline-block h-2 w-2 rounded-full bg-fuchsia-400 animate-pulse" />
          Opus is reviewing the plan…
        </div>
      )}

      {review && (
        <AdvisorPanel review={review} onApplySuggestedDependency={onApplySuggestedDependency} />
      )}

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
              editable={!running}
              onChange={(patch) => onUpdateStory(i, patch)}
            />
          );
        })}
      </div>
      {plan.dependencies.length > 0 && (
        <DependencyList
          deps={plan.dependencies}
          editable={!running}
          onRemove={onRemoveDependency}
        />
      )}
      {!running && plan.stories.length > 1 && (
        <AddDependencyForm stories={plan.stories} onAdd={onAddDependency} />
      )}
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
  editable,
  onChange,
}: {
  index: number;
  story: Story;
  runtime: StoryRuntime;
  waitsOn: number[];
  editable: boolean;
  onChange: (patch: Partial<Story>) => void;
}) {
  const [editing, setEditing] = useState(false);
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
        {editable && (
          <button
            onClick={() => setEditing((v) => !v)}
            className="shrink-0 text-xs text-neutral-400 hover:text-neutral-200 px-2 py-0.5 rounded border border-neutral-700"
          >
            {editing ? 'Done' : 'Edit'}
          </button>
        )}
      </header>

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

function AdvisorPanel({
  review,
  onApplySuggestedDependency,
}: {
  review: AdvisorReview;
  onApplySuggestedDependency: (dep: Dependency) => void;
}) {
  return (
    <div className="rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/5 p-4 space-y-4">
      <header className="flex items-start gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-fuchsia-300">Opus advisor</span>
      </header>
      <p className="text-sm text-neutral-200">{review.overall}</p>

      {review.concerns.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-1">Concerns</h4>
          <ul className="list-disc list-inside text-sm text-neutral-200 space-y-0.5">
            {review.concerns.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {review.perStoryNotes.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-1">
            Per-story notes
          </h4>
          <ul className="text-sm space-y-1">
            {review.perStoryNotes.map((n, i) => (
              <li key={i} className="text-neutral-200">
                <span className="text-neutral-500 font-mono mr-2">#{n.storyIndex}</span>
                {n.note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {review.suggestedDependencies.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-1">
            Suggested dependencies
          </h4>
          <ul className="text-sm space-y-1">
            {review.suggestedDependencies.map((d, i) => (
              <li key={i} className="flex items-center gap-2 text-neutral-200">
                <span className="text-neutral-500">#{d.from}</span>
                <span className="text-neutral-600">→</span>
                <span className="text-neutral-500">#{d.to}</span>
                <span className="flex-1 text-neutral-300">{d.reason}</span>
                <button
                  onClick={() => onApplySuggestedDependency(d)}
                  className="shrink-0 px-2 py-0.5 rounded text-xs font-medium bg-fuchsia-500/20 hover:bg-fuchsia-500/30 text-fuchsia-200"
                >
                  Apply
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function DependencyList({
  deps,
  editable,
  onRemove,
}: {
  deps: Dependency[];
  editable: boolean;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="rounded-lg bg-neutral-900 border border-neutral-800 p-4 space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Dependencies</h4>
      <ul className="text-sm space-y-1">
        {deps.map((d, i) => (
          <li key={i} className="text-neutral-300 flex items-center gap-2">
            <span className="text-neutral-500">#{d.from}</span>
            <span className="text-neutral-600">→</span>
            <span className="text-neutral-500">#{d.to}</span>
            <span className="text-neutral-400 flex-1">{d.reason}</span>
            {editable && (
              <button
                onClick={() => onRemove(i)}
                className="shrink-0 text-neutral-500 hover:text-rose-300 text-xs"
                title="Remove dependency"
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AddDependencyForm({
  stories,
  onAdd,
}: {
  stories: Story[];
  onAdd: (dep: Dependency) => string | null;
}) {
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(1);
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const submit = () => {
    setErr(null);
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      setErr('Reason must be at least 3 characters');
      return;
    }
    const e = onAdd({ from, to, reason: trimmed });
    if (e) setErr(e);
    else setReason('');
  };

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-neutral-500">Add dependency:</span>
        <select
          value={from}
          onChange={(e) => setFrom(Number(e.target.value))}
          className="bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200"
        >
          {stories.map((s, i) => (
            <option key={i} value={i}>
              #{i} — {truncate(s.title, 40)}
            </option>
          ))}
        </select>
        <span className="text-neutral-600">→</span>
        <select
          value={to}
          onChange={(e) => setTo(Number(e.target.value))}
          className="bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200"
        >
          {stories.map((s, i) => (
            <option key={i} value={i}>
              #{i} — {truncate(s.title, 40)}
            </option>
          ))}
        </select>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="reason (required)"
          className="flex-1 min-w-[12rem] bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200"
        />
        <button
          onClick={submit}
          className="px-3 py-1 rounded text-xs font-medium bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200"
        >
          Add
        </button>
      </div>
      {err && <p className="text-xs text-rose-300">{err}</p>}
    </div>
  );
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + '…';
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
