import { useEffect, useRef, useState } from 'react';
import type {
  PickFolderResult,
  RefinedPlan,
  Story,
  Dependency,
  RunEvent,
  AdvisorReview,
} from '@zibby/shared-types/ipc';
import { StoryCard } from './components/StoryCard';
import type { StoryRuntime } from './components/StoryCard';

type SelectedFolder = Extract<PickFolderResult, { kind: 'selected' }>;

function emptyRuntime(): StoryRuntime {
  return { status: 'pending', logs: [] };
}

export default function App() {
  const [folder, setFolder] = useState<SelectedFolder | null>(null);
  const [plan, setPlan] = useState<RefinedPlan | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [runId, setRunId] = useState<string | null>(null);
  const [runtime, setRuntime] = useState<Record<number, StoryRuntime>>({});
  const [runDone, setRunDone] = useState<boolean | null>(null);

  const [advising, setAdvising] = useState(false);
  const [review, setReview] = useState<AdvisorReview | null>(null);
  const [loadedState, setLoadedState] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [storyRemoveErrors, setStoryRemoveErrors] = useState<Record<number, string>>({});
  const [branchDeletionNotice, setBranchDeletionNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const restored = await window.zibby.loadState();
      if (cancelled) return;
      if (restored.folder && restored.folder.kind === 'selected') setFolder(restored.folder);
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
        plan: plan ?? undefined,
      });
    }, 500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [folder, plan, loadedState]);

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

  const handleAddTask = (story: Story) => {
    setPlan((cur) =>
      cur
        ? { ...cur, stories: [...cur.stories, story] }
        : { stories: [story], dependencies: [] }
    );
  };

  useEffect(() => {
    const unsub = window.zibby.onRunEvent((event: RunEvent) => {
      if (event.kind === 'run-done') {
        if (event.runId === runId) {
          setRunDone(event.success);
          setRunId(null);
        }
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
  }, [runId]);

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

  const handleRun = async () => {
    if (!folder || !plan) return;
    setRunDone(null);
    setRuntime(Object.fromEntries(plan.stories.map((_, i) => [i, emptyRuntime()])));
    const res = await window.zibby.startRun({ folderPath: folder.path, plan });
    if (res.kind === 'started') setRunId(res.runId);
    else setError(res.message);
  };

  const handleRunStory = async (storyIndex: number) => {
    if (!folder || !plan) return;
    const storyRunId = `story-${Date.now()}-${storyIndex}`;
    setRuntime((prev) => ({ ...prev, [storyIndex]: emptyRuntime() }));
    const res = await window.zibby.runStory({
      runId: storyRunId,
      storyIndex,
      folderPath: folder.path,
      plan,
    });
    if (res.kind === 'error') setError(res.message);
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

  const handleRemoveStory = async (storyIndex: number) => {
    if (!plan) return;
    const prevPlan = plan;
    const optimisticPlan: RefinedPlan = {
      stories: plan.stories.filter((_, i) => i !== storyIndex),
      dependencies: plan.dependencies
        .filter((d) => d.from !== storyIndex && d.to !== storyIndex)
        .map((d) => ({
          ...d,
          from: d.from > storyIndex ? d.from - 1 : d.from,
          to: d.to > storyIndex ? d.to - 1 : d.to,
        })),
    };
    setPlan(optimisticPlan);
    setStoryRemoveErrors((prev) => {
      const next = { ...prev };
      delete next[storyIndex];
      return next;
    });
    try {
      const result = await window.zibby.removeStory(storyIndex);
      setPlan(result.plan);
      if (result.branchDeletionWarning) {
        setBranchDeletionNotice(result.branchDeletionWarning);
      }
    } catch (err) {
      setPlan(prevPlan);
      setStoryRemoveErrors((prev) => ({
        ...prev,
        [storyIndex]: err instanceof Error ? err.message : 'Failed to remove story',
      }));
    }
  };

  const running = runId !== null;
  const runActive =
    running || Object.values(runtime).some((r) => r.status === 'running' || r.status === 'pushing');
  const canRun =
    plan !== null &&
    folder?.isGitRepo === true &&
    folder?.hasOrigin === true &&
    !running &&
    !advising;

  const canRunIndividual =
    folder?.isGitRepo === true && folder?.hasOrigin === true && !running;

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

        {error && (
          <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-200 text-sm p-4">
            <strong className="font-semibold">Error:</strong> {error}
          </div>
        )}

        {folder && !plan && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-neutral-500 text-sm">Žádné tasky. Přidej první task a spusť ho.</p>
            <button
              onClick={() => setShowAddTask(true)}
              className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium"
            >
              + Přidat task
            </button>
          </div>
        )}

        {plan && (
          <PlanView
            plan={plan}
            runtime={runtime}
            running={running}
            runActive={runActive}
            canRun={canRun}
            canRunIndividual={canRunIndividual}
            runDone={runDone}
            onRun={handleRun}
            onCancel={handleCancel}
            onRunStory={handleRunStory}
            onUpdateStory={updateStory}
            onRemoveDependency={removeDependency}
            onRemoveStory={handleRemoveStory}
            storyRemoveErrors={storyRemoveErrors}
            branchDeletionNotice={branchDeletionNotice}
            onDismissBranchNotice={() => setBranchDeletionNotice(null)}
            review={review}
            advising={advising}
            onAdvise={handleAdvise}
            onApplySuggestedDependency={applySuggestedDependency}
            onAddDependency={addDependency}
            onAddTask={() => setShowAddTask(true)}
          />
        )}

        {folder && (
          <AddTaskDialog
            folder={folder}
            open={showAddTask}
            onClose={() => setShowAddTask(false)}
            onAdd={(story) => {
              handleAddTask(story);
              setShowAddTask(false);
            }}
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

function PlanView({
  plan,
  runtime,
  running,
  runActive,
  canRun,
  canRunIndividual,
  runDone,
  onRun,
  onCancel,
  onRunStory,
  onUpdateStory,
  onRemoveDependency,
  onRemoveStory,
  storyRemoveErrors,
  branchDeletionNotice,
  onDismissBranchNotice,
  review,
  advising,
  onAdvise,
  onApplySuggestedDependency,
  onAddDependency,
  onAddTask,
}: {
  plan: RefinedPlan;
  runtime: Record<number, StoryRuntime>;
  running: boolean;
  runActive: boolean;
  canRun: boolean;
  canRunIndividual: boolean;
  runDone: boolean | null;
  onRun: () => void;
  onCancel: () => void;
  onRunStory: (storyIndex: number) => void;
  onUpdateStory: (index: number, patch: Partial<Story>) => void;
  onRemoveDependency: (depIndex: number) => void;
  onRemoveStory: (index: number) => void;
  storyRemoveErrors: Record<number, string>;
  branchDeletionNotice: string | null;
  onDismissBranchNotice: () => void;
  review: AdvisorReview | null;
  advising: boolean;
  onAdvise: () => void;
  onApplySuggestedDependency: (dep: Dependency) => void;
  onAddDependency: (dep: Dependency) => string | null;
  onAddTask: () => void;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-200">Refined plan</h2>
        <div className="flex items-center gap-3">
          {runDone === true && <span className="text-emerald-400 text-sm">All done ✓</span>}
          {runDone === false && <span className="text-rose-400 text-sm">Run failed</span>}
          <button
            onClick={onAddTask}
            className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm font-medium border border-neutral-700"
          >
            + Přidat task
          </button>
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

      {branchDeletionNotice && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-200 text-xs p-3 flex items-center justify-between">
          <span>Branch warning: {branchDeletionNotice}</span>
          <button
            onClick={onDismissBranchNotice}
            className="ml-4 text-neutral-500 hover:text-neutral-300"
          >
            ✕
          </button>
        </div>
      )}

      <div className="space-y-3">
        {plan.stories.map((story, i) => {
          const waitsOn = plan.dependencies.filter((d) => d.to === i).map((d) => d.from);
          const unmetDependencies = waitsOn
            .filter((depIdx) => (runtime[depIdx]?.status ?? 'pending') !== 'done')
            .map((depIdx) => ({ index: depIdx, title: plan.stories[depIdx]?.title ?? `#${depIdx}` }));
          return (
            <StoryCard
              key={i}
              index={i}
              story={story}
              runtime={runtime[i] ?? emptyRuntime()}
              waitsOn={waitsOn}
              editable={!running}
              onChange={(patch) => onUpdateStory(i, patch)}
              onRunStory={() => onRunStory(i)}
              canRunIndividual={canRunIndividual}
              unmetDependencies={unmetDependencies}
              runActive={runActive}
              hasDownstreamDependents={plan.dependencies.some((d) => d.from === i)}
              onRemove={() => onRemoveStory(i)}
              removeError={storyRemoveErrors[i] ?? null}
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

function AddTaskDialog({
  folder,
  open,
  onClose,
  onAdd,
}: {
  folder: SelectedFolder;
  open: boolean;
  onClose: () => void;
  onAdd: (story: Story) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');
  const [model, setModel] = useState('');
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const refineCounterRef = useRef(0);

  useEffect(() => {
    if (open) {
      refineCounterRef.current++;  // invalidate any in-flight refine
      setTitle('');
      setDescription('');
      setAcceptanceCriteria('');
      setModel('');
      setRefining(false);
      setRefineError(null);
    }
  }, [open]);

  const handleRefine = async () => {
    const token = ++refineCounterRef.current;
    setRefining(true);
    setRefineError(null);
    try {
      const res = await window.zibby.refineStory({
        folderPath: folder.path,
        title,
        description,
      });
      if (token !== refineCounterRef.current) return;
      if (res.kind === 'ok') {
        setTitle(res.story.title);
        setDescription(res.story.description);
        setAcceptanceCriteria(res.story.acceptanceCriteria.join('\n'));
      } else {
        setRefineError(res.message);
      }
    } catch (err) {
      if (token !== refineCounterRef.current) return;
      setRefineError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      if (token === refineCounterRef.current) setRefining(false);
    }
  };

  const handleAdd = () => {
    onAdd({
      title: title.trim(),
      description: description.trim(),
      acceptanceCriteria: acceptanceCriteria.trim()
        ? acceptanceCriteria.split('\n').map((s) => s.trim()).filter(Boolean)
        : [],
      affectedFiles: [],
      model: model || undefined,
    });
  };

  if (!open) return null;

  const canRefine = !refining && description.trim().length > 0;
  const canAdd = title.trim().length >= 3 && description.trim().length > 0 && !refining;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onKeyDown={(e) => { if (e.key === 'Escape' && !refining) onClose(); }}
      tabIndex={-1}
    >
      <div
        className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 w-full max-w-lg space-y-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-task-dialog-title"
      >
        <h2 id="add-task-dialog-title" className="text-lg font-semibold text-neutral-100">Přidat task</h2>

        <div className="space-y-1">
          <label htmlFor="add-task-title" className="block text-xs font-medium text-neutral-400">Název *</label>
          <input
            id="add-task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Stručný název tasku"
            autoFocus
            className="w-full rounded-lg bg-neutral-950 border border-neutral-800 focus:border-indigo-500 focus:outline-none px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="add-task-description" className="block text-xs font-medium text-neutral-400">Popis / Brief *</label>
          <textarea
            id="add-task-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Popiš co má task udělat — Refine z toho udělá kompletní user story"
            rows={5}
            className="w-full rounded-lg bg-neutral-950 border border-neutral-800 focus:border-indigo-500 focus:outline-none px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 resize-none"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="add-task-ac" className="block text-xs font-medium text-neutral-400">Akceptační kritéria</label>
          <textarea
            id="add-task-ac"
            value={acceptanceCriteria}
            onChange={(e) => setAcceptanceCriteria(e.target.value)}
            placeholder="Každé kritérium na nový řádek (nepovinné)"
            rows={4}
            className="w-full rounded-lg bg-neutral-950 border border-neutral-800 focus:border-indigo-500 focus:outline-none px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 resize-none"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="add-task-model" className="block text-xs font-medium text-neutral-400">Model (pro implementaci)</label>
          <select
            id="add-task-model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200"
          >
            <option value="">Výchozí (sonnet)</option>
            <option value="sonnet">Sonnet</option>
            <option value="opus">Opus</option>
            <option value="haiku">Haiku</option>
          </select>
        </div>

        {refineError && <p className="text-xs text-rose-300">{refineError}</p>}

        <div className="flex justify-between items-center pt-2">
          <button
            onClick={() => { void handleRefine(); }}
            disabled={!canRefine}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-200 text-sm font-medium border border-neutral-700 flex items-center gap-2"
          >
            {refining && (
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
            {refining ? 'Refining…' : 'Refine'}
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={refining}
              className="px-3 py-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
            >
              Zrušit
            </button>
            <button
              onClick={handleAdd}
              disabled={!canAdd}
              className="px-4 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium"
            >
              Přidat task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
