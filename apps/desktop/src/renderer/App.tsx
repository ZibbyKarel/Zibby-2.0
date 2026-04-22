import { useEffect, useState } from 'react';
import type { PickFolderResult, RefinedPlan, Story, Dependency } from '@zibby/shared-types/ipc';

type SelectedFolder = Extract<PickFolderResult, { kind: 'selected' }>;

export default function App() {
  const [folder, setFolder] = useState<SelectedFolder | null>(null);
  const [brief, setBrief] = useState('');
  const [refining, setRefining] = useState(false);
  const [plan, setPlan] = useState<RefinedPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePick = async () => {
    const result = await window.zibby.pickFolder();
    if (result.kind === 'selected') {
      setFolder(result);
      setPlan(null);
      setError(null);
    } else {
      setFolder(null);
    }
  };

  const handleRefine = async () => {
    if (!folder) return;
    setRefining(true);
    setError(null);
    setPlan(null);
    const res = await window.zibby.refine({ folderPath: folder.path, brief });
    setRefining(false);
    if (res.kind === 'ok') setPlan(res.plan);
    else setError(res.message);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Zibby 2.0</h1>
          <p className="text-neutral-400 text-sm">
            Pick a folder, describe what you want done, and AI will produce a refined plan.
          </p>
        </header>

        <FolderSection folder={folder} onPick={handlePick} />

        {folder && (
          <BriefSection
            brief={brief}
            onBrief={setBrief}
            disabled={refining || !brief.trim()}
            refining={refining}
            onRefine={handleRefine}
          />
        )}

        {refining && <RefineProgress />}

        {error && (
          <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-200 text-sm p-4">
            <strong className="font-semibold">Refine failed:</strong> {error}
          </div>
        )}

        {plan && <PlanView plan={plan} />}
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
        {folder && (
          <span className="font-mono text-sm text-neutral-300 truncate">{folder.path}</span>
        )}
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

function PlanView({ plan }: { plan: RefinedPlan }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-neutral-200">Refined plan</h2>
      <div className="space-y-3">
        {plan.stories.map((story, i) => (
          <StoryCard key={i} index={i} story={story} />
        ))}
      </div>
      {plan.dependencies.length > 0 && <DependencyList deps={plan.dependencies} />}
    </section>
  );
}

function StoryCard({ index, story }: { index: number; story: Story }) {
  return (
    <article className="rounded-lg bg-neutral-900 border border-neutral-800 p-4 space-y-3">
      <header className="flex items-start gap-3">
        <span className="shrink-0 text-xs font-semibold text-neutral-500 mt-0.5">#{index}</span>
        <h3 className="text-base font-semibold text-neutral-100">{story.title}</h3>
      </header>
      <p className="text-sm text-neutral-300">{story.description}</p>
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1">
          Acceptance criteria
        </h4>
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
    </article>
  );
}

function DependencyList({ deps }: { deps: Dependency[] }) {
  return (
    <div className="rounded-lg bg-neutral-900 border border-neutral-800 p-4 space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Dependencies
      </h4>
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
