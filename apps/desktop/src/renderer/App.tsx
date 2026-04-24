import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PickFolderResult, RefinedPlan, PersistedStoryRuntime } from '@nightcoder/shared-types/ipc';
import { taskIdForNewStory, collectTaskIds } from '@nightcoder/shared-types/task-id';
import { addStoryToPlan } from '@nightcoder/shared-types/plan';

import { Icon, BrandMark } from './components/icons';
import { Btn, Chip } from './components/primitives';
import { TaskCard } from './components/TaskCard';
import { Column } from './components/Column';
import { TaskDrawer } from './components/TaskDrawer';
import type { DrawerTab } from './components/TaskDrawer';
import { AddTaskDialog, type AddTaskPayload, type BlockerCandidate } from './components/AddTaskDialog';
import { CommandPalette } from './components/CommandPalette';
import type { Command } from './components/CommandPalette';
import { Toasts } from './components/Toasts';
import type { Toast } from './components/Toasts';
import { UsagePanel } from './components/UsagePanel';
import {
  toTasks, statusToCol, emptyRuntime, isTerminal,
} from './viewModel';
import type { StoryRuntime, LogLine, TaskVM } from './viewModel';

type SelectedFolder = Extract<PickFolderResult, { kind: 'selected' }>;

const COLS = [
  { id: 'queue'   as const, title: 'Queued',  accent: 'var(--amber)' },
  { id: 'running' as const, title: 'Running', accent: 'var(--emerald)' },
  { id: 'review'  as const, title: 'Review',  accent: 'var(--violet)' },
  { id: 'done'    as const, title: 'Done',    accent: 'var(--sky)' },
];

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  );
  const [folder, setFolder] = useState<SelectedFolder | null>(null);
  const [plan, setPlan] = useState<RefinedPlan | null>(null);

  const [runId, setRunId] = useState<string | null>(null);
  const [runtime, setRuntime] = useState<Record<number, StoryRuntime>>({});
  const [interrupted, setInterrupted] = useState<Set<number>>(() => new Set());

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('logs');
  const [addOpen, setAddOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState<Set<'interrupted' | 'cancelled_error' | 'pending'>>(() => new Set());
  const [tick, setTick] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydrated = useRef(false);
  const runAllInFlight = useRef<Promise<void> | null>(null);

  // ── Bootstrap ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    window.nightcoder.loadState().then((state) => {
      if (cancelled) return;
      if (state.folder?.kind === 'selected') setFolder(state.folder);
      setPlan(state.plan ?? { stories: [], dependencies: [] });
      if (state.runtime) {
        setRuntime((prev) => {
          const next = { ...prev };
          for (const [k, v] of Object.entries(state.runtime!)) {
            const idx = Number(k);
            next[idx] = {
              ...v,
              limitResetsAt: v.limitResetsAt ?? null,
              logs: prev[idx]?.logs ?? [],
            };
          }
          return next;
        });
        const interruptedIndices = Object.entries(state.runtime)
          .filter(([, v]) => v.status === 'running' || v.status === 'pushing' || v.status === 'interrupted')
          .map(([k]) => Number(k));
        if (interruptedIndices.length > 0) setInterrupted(new Set(interruptedIndices));
      }
      hydrated.current = true;
    }).catch(() => { hydrated.current = true; });
    return () => { cancelled = true; };
  }, []);

  // ── Persist plan + runtime ─────────────────────────────────
  useEffect(() => {
    if (!hydrated.current) return;
    const persistedRuntime: Record<number, PersistedStoryRuntime> = {};
    for (const [k, v] of Object.entries(runtime)) {
      const idx = Number(k);
      persistedRuntime[idx] = {
        status: v.status,
        branch: v.branch,
        prUrl: v.prUrl,
        startedAt: v.startedAt,
        endedAt: v.endedAt,
        limitResetsAt: v.limitResetsAt ?? null,
      };
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      window.nightcoder.saveState({ folderPath: folder?.path, plan: plan ?? undefined, runtime: persistedRuntime }).catch(() => {});
    }, 500);
  }, [folder, plan, runtime]);

  // ── Tick ───────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1000), 1000);
    return () => clearInterval(id);
  }, []);

  // ── ⌘K / ⌘N ───────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setAddOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ── RunEvent subscription ──────────────────────────────────
  useEffect(() => {
    const unsub = window.nightcoder.onRunEvent((ev) => {
      if (ev.kind === 'run-done') {
        setRunId((current) => (current === ev.runId ? null : current));
        pushToast({ kind: ev.success ? 'done' : 'failed', title: ev.success ? 'Run finished' : 'Run failed' });
        return;
      }
      const idx = ev.storyIndex;
      if (ev.kind === 'status') {
        setInterrupted((prev) => {
          if (ev.status === 'interrupted') {
            if (prev.has(idx)) return prev;
            const next = new Set(prev);
            next.add(idx);
            return next;
          }
          if (!prev.has(idx)) return prev;
          const next = new Set(prev);
          next.delete(idx);
          return next;
        });
      }
      setRuntime((prev) => {
        const cur = prev[idx] ?? emptyRuntime();
        switch (ev.kind) {
          case 'status': {
            const next: StoryRuntime = {
              ...cur,
              status: ev.status,
              startedAt: ev.status === 'running' && !cur.startedAt ? Date.now() : cur.startedAt,
              endedAt: isTerminal(ev.status) ? (cur.endedAt ?? Date.now()) : cur.endedAt,
              // Clear the stored reset time once a new status takes over.
              limitResetsAt: ev.status === 'interrupted' ? cur.limitResetsAt : null,
            };
            if (ev.status === 'done') {
              pushToast({ kind: 'done', title: 'Task done', desc: plan?.stories[idx]?.title });
            } else if (ev.status === 'failed') {
              pushToast({ kind: 'failed', title: 'Task failed', desc: plan?.stories[idx]?.title });
            } else if (ev.status === 'interrupted') {
              pushToast({
                kind: 'info',
                title: 'Task paused — usage limit reached',
                desc: plan?.stories[idx]?.title,
              });
            }
            return { ...prev, [idx]: next };
          }
          case 'log': {
            const stream = ev.stream === 'stderr' ? 'err' : ev.stream === 'info' ? 'info' : 'out';
            const line: LogLine = { s: stream, l: ev.line };
            const logs = cur.logs.length >= 2000 ? [...cur.logs.slice(1), line] : [...cur.logs, line];
            return { ...prev, [idx]: { ...cur, logs } };
          }
          case 'branch': {
            return { ...prev, [idx]: { ...cur, branch: ev.branch } };
          }
          case 'pr': {
            pushToast({ kind: 'done', title: 'PR opened', desc: ev.url });
            return { ...prev, [idx]: { ...cur, branch: ev.branch, prUrl: ev.url } };
          }
          case 'limit-hit': {
            return { ...prev, [idx]: { ...cur, limitResetsAt: ev.resetsAt } };
          }
        }
      });
    });
    return unsub;
  }, [plan]);

  // ── Helpers ────────────────────────────────────────────────
  const pushToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((arr) => [...arr, { id, ...t }]);
    setTimeout(() => setToasts((arr) => arr.filter((x) => x.id !== id)), 5000);
  }, []);

  const tasks = useMemo(() => toTasks(plan ?? { stories: [], dependencies: [] }, runtime, interrupted), [plan, runtime, interrupted]);
  const hasRunnableTasks = tasks.some(t => t.status !== 'done' && t.status !== 'review');

  const toggleFilter = useCallback((key: 'interrupted' | 'cancelled_error' | 'pending') => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const visible = useMemo(() => {
    const q = search.toLowerCase();
    return tasks.filter((t) => {
      if (q && !t.title.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) return false;
      if (activeFilters.size === 0) return true;
      if (activeFilters.has('interrupted') && t.interrupted) return true;
      if (activeFilters.has('cancelled_error') && (t.status === 'cancelled' || t.status === 'failed')) return true;
      if (activeFilters.has('pending') && (t.status === 'pending' || t.status === 'blocked')) return true;
      return false;
    });
  }, [tasks, search, activeFilters]);

  const grouped = useMemo(() => {
    const out = { queue: [] as TaskVM[], running: [] as TaskVM[], review: [] as TaskVM[], done: [] as TaskVM[] };
    visible.forEach((t) => out[statusToCol(t.status)].push(t));
    return out;
  }, [visible]);

  const selected = tasks.find((t) => t.index === selectedIndex) ?? null;

  // ── Actions ────────────────────────────────────────────────
  const pickFolder = async () => {
    const result = await window.nightcoder.pickFolder();
    if (result.kind === 'selected') setFolder(result);
  };

  const runTask = useCallback(async (idx: number) => {
    if (!plan || !folder) {
      pushToast({ kind: 'failed', title: 'No folder selected' });
      return;
    }
    const story = plan.stories[idx];
    if (!story) return;
    const currentStatus = runtime[idx]?.status;
    const isResumable = interrupted.has(idx) || currentStatus === 'interrupted';
    if (isResumable && story.taskId) {
      pushToast({ kind: 'info', title: 'Resuming task', desc: story.title });
      const res = await window.nightcoder.resumeTask({ taskId: story.taskId });
      if (res.kind === 'error') {
        pushToast({ kind: 'failed', title: 'Resume error', desc: res.message });
      }
      return;
    }
    if (currentStatus === 'running' || currentStatus === 'pushing' || currentStatus === 'review' || currentStatus === 'done') {
      return;
    }
    // Refuse when a blocker hasn't finished — `gh pr create --base <blocker>`
    // needs the blocker's branch on origin, which only happens after push
    // (i.e. status 'review' or 'done'). Plan runs already enforce this via the
    // DAG; this guard covers the per-card Run button.
    const blockers = plan.dependencies.filter((d) => d.to === idx).map((d) => d.from);
    const pendingBlocker = blockers.find((from) => {
      const st = runtime[from]?.status;
      return st !== 'review' && st !== 'done';
    });
    if (pendingBlocker !== undefined) {
      pushToast({
        kind: 'failed',
        title: 'Blocker not ready',
        desc: plan.stories[pendingBlocker]?.title
          ? `Finish "${plan.stories[pendingBlocker].title}" first`
          : 'A blocking task has not finished yet',
      });
      return;
    }
    const storyRunId = `story-${Date.now()}-${idx}`;
    pushToast({ kind: 'info', title: 'Task started', desc: story.title });
    const res = await window.nightcoder.runStory({ runId: storyRunId, storyIndex: idx, folderPath: folder.path, plan });
    if (res.kind === 'error') {
      pushToast({ kind: 'failed', title: 'Run error', desc: res.message });
    }
  }, [plan, folder, runtime, interrupted, pushToast]);

  const runAll = useCallback(async () => {
    if (!plan || !folder) {
      pushToast({ kind: 'failed', title: 'No folder selected' });
      return;
    }
    if (runId || runAllInFlight.current) return;
    const completedIndices = Object.entries(runtime)
      .filter(([, v]) => v.status === 'done' || v.status === 'review')
      .map(([k]) => Number(k));
    const started = (async () => {
      const res = await window.nightcoder.startRun({ folderPath: folder.path, plan, completedIndices });
      if (res.kind === 'error') {
        pushToast({ kind: 'failed', title: 'Run error', desc: res.message });
        return;
      }
      setRunId(res.runId);
      pushToast({ kind: 'info', title: 'Run started' });
    })();
    runAllInFlight.current = started.finally(() => { runAllInFlight.current = null; });
    await runAllInFlight.current;
  }, [plan, folder, runtime, runId, pushToast]);

  const handleDrop = useCallback(async (taskId: string, colId: 'queue' | 'running' | 'review' | 'done') => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (colId === 'running' && (task.status === 'pending' || task.status === 'failed' || task.status === 'blocked')) {
      await runTask(task.index);
    } else if (colId === 'done' && task.status === 'review') {
      setRuntime((prev) => {
        const cur = prev[task.index];
        if (!cur || cur.status !== 'review') return prev;
        return { ...prev, [task.index]: { ...cur, status: 'done' } };
      });
    } else if (colId !== statusToCol(task.status)) {
      pushToast({ kind: 'info', title: 'Move not supported', desc: 'Use the Run button to start a task.' });
    }
  }, [tasks, runTask, pushToast, setRuntime]);

  const addTask = useCallback((data: AddTaskPayload) => {
    let newTaskId: string | null = null;
    setPlan((prev) => {
      const currentPlan = prev ?? { stories: [], dependencies: [] };
      const taskId = taskIdForNewStory(data.title, collectTaskIds(currentPlan.stories));
      newTaskId = taskId;
      return addStoryToPlan(currentPlan, {
        taskId,
        title: data.title,
        description: data.description,
        acceptance: data.acceptance,
        model: data.model,
        agents: data.agents,
        blockingIndex: data.blockingIndex,
      });
    });
    setAddOpen(false);
    if (data.attachedFilePaths.length > 0 && newTaskId) {
      const taskIdForCopy = newTaskId;
      void (async () => {
        const res = await window.nightcoder.addTaskFiles({ taskId: taskIdForCopy, sourcePaths: data.attachedFilePaths });
        if (res.kind === 'error') {
          pushToast({ kind: 'failed', title: 'Attach files failed', desc: res.message });
        } else if (res.files.length > 0) {
          pushToast({ kind: 'info', title: 'Files attached', desc: `${res.files.length} file${res.files.length === 1 ? '' : 's'}` });
        }
      })();
    }
  }, [pushToast]);

  const blockerCandidates = useMemo<BlockerCandidate[]>(() => {
    // Only tasks with a live branch can serve as blockers. Cancelled/failed
    // tasks branch off stale state; 'done' tasks may have had their source
    // branch deleted on origin by `gh pr merge --squash`, so `gh pr create
    // --base` against them would fail.
    const DISALLOWED: ReadonlyArray<typeof tasks[number]['status']> = ['cancelled', 'failed', 'done'];
    return tasks
      .filter((t) => !DISALLOWED.includes(t.status))
      .map((t) => ({
        index: t.index,
        title: t.title,
        numericId: t.numericId,
        status: t.status,
      }));
  }, [tasks]);

  const editTask = useCallback((idx: number, data: { title: string; description: string; acceptance: string[]; model?: string }) => {
    setPlan((prev) => {
      if (!prev) return prev;
      const stories = prev.stories.map((s, i) =>
        i === idx ? { ...s, title: data.title, description: data.description, acceptanceCriteria: data.acceptance, model: data.model } : s
      );
      return { ...prev, stories };
    });
  }, []);

  const deleteTask = useCallback((idx: number) => {
    setPlan((prev) => {
      if (!prev) return prev;
      const stories = prev.stories.filter((_, i) => i !== idx);
      const dependencies = prev.dependencies
        .filter((d) => d.from !== idx && d.to !== idx)
        .map((d) => ({
          ...d,
          from: d.from > idx ? d.from - 1 : d.from,
          to: d.to > idx ? d.to - 1 : d.to,
        }));
      return { stories, dependencies };
    });
    setRuntime((prev) => {
      const next: Record<number, StoryRuntime> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const n = Number(k);
        if (n !== idx) next[n > idx ? n - 1 : n] = v;
      });
      return next;
    });
    setInterrupted((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set<number>();
      prev.forEach((n) => {
        if (n === idx) return;
        next.add(n > idx ? n - 1 : n);
      });
      return next;
    });
    if (selectedIndex === idx) setSelectedIndex(null);
  }, [selectedIndex]);

  // ── Commands ───────────────────────────────────────────────
  const commands = useMemo<Command[]>(() => [
    {
      id: 'run-all', icon: 'play', label: 'Run all pending tasks', kbd: '⌘⏎',
      run: () => { void runAll(); },
    },
    { id: 'add', icon: 'plus', label: 'Add task', kbd: 'n', run: () => setAddOpen(true) },
    {
      id: 'theme', icon: theme === 'dark' ? 'sun' : 'moon',
      label: `Toggle theme (→ ${theme === 'dark' ? 'light' : 'dark'})`,
      run: () => setTheme((t) => t === 'dark' ? 'light' : 'dark'),
    },
    { id: 'folder', icon: 'folder', label: 'Pick folder…', hint: folder?.path, run: () => void pickFolder() },
    ...tasks.map((t) => ({
      id: 'task-' + t.id,
      icon: 'arrowRight' as const,
      label: `Go to: ${t.title}`,
      hint: `#${t.index} · ${t.status}`,
      run: () => { setSelectedIndex(t.index); setDrawerTab('logs'); },
    })),
  ], [tasks, theme, folder, runAll]);

  // ── Drag ───────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/task-id', id);
    e.dataTransfer.effectAllowed = 'move';
    setDragId(id);
  };
  const handleDragEnd = () => setDragId(null);

  // ── Render ─────────────────────────────────────────────────
  const runtimeMs = (t: TaskVM) => t.startedAt && t.status === 'running' ? Date.now() - t.startedAt : null;

  return (
    <div className={`zb${theme === 'light' ? ' theme-light' : ''}`} style={{
      minHeight: '100%', background: 'var(--bg-0)', color: 'var(--text-0)',
      display: 'flex', flexDirection: 'column', fontSize: 13,
    }}>
      {/* Top bar */}
      <header style={{
        padding: '14px 20px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-1)', display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BrandMark theme={theme} size={30} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-.01em' }}>{theme === 'light' ? 'DayCoder' : 'NightCoder'}</div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>multi-agent coding workflow</div>
          </div>
        </div>

        {/* Folder chip */}
        {folder && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8 }}>
            <Icon name="folder" size={13} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-1)', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {folder.path}
            </span>
            <div style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 4px' }} />
            <Chip icon="git" tone="accent" style={{ height: 20 }}>main</Chip>
            <button
              onClick={() => void pickFolder()}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 2, display: 'flex', marginLeft: 2 }}
            >
              <Icon name="chevronDown" size={12} />
            </button>
          </div>
        )}
        {!folder && (
          <Btn icon="folder" variant="secondary" size="sm" onClick={() => void pickFolder()}>Pick folder</Btn>
        )}

        <div style={{ flex: 1 }} />

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, minWidth: 220 }}>
          <Icon name="search" size={13} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks"
            style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-0)', fontSize: 12, outline: 'none' }}
          />
          <kbd style={{ fontFamily: 'var(--mono)', fontSize: 10, padding: '1px 5px', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--text-3)' }}>⌘K</kbd>
        </div>

        <UsagePanel tick={tick} />

        <button
          onClick={() => setTheme((t) => t === 'dark' ? 'light' : 'dark')}
          style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', color: 'var(--text-1)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          title="Toggle theme"
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={14} />
        </button>
      </header>

      {/* Sub-bar */}
      <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-0)', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
          {tasks.length} tasks · {tasks.filter((t) => t.status === 'running').length} running
        </span>
        <div style={{ width: 1, height: 16, background: 'var(--border)', flexShrink: 0 }} />
        {([
          { key: 'interrupted' as const,     label: 'Interrupted',      activeColor: 'var(--amber)',  activeBg: 'rgba(245,158,11,.12)',  activeBorder: 'rgba(245,158,11,.3)' },
          { key: 'cancelled_error' as const, label: 'Cancelled / Error', activeColor: 'var(--rose)',   activeBg: 'rgba(244,63,94,.12)',   activeBorder: 'rgba(244,63,94,.3)'  },
          { key: 'pending' as const,         label: 'Pending',          activeColor: 'var(--sky)',    activeBg: 'rgba(56,189,248,.12)',  activeBorder: 'rgba(56,189,248,.3)' },
        ] as const).map(({ key, label, activeColor, activeBg, activeBorder }) => {
          const isActive = activeFilters.has(key);
          return (
            <button
              key={key}
              onClick={() => toggleFilter(key)}
              style={{
                display: 'inline-flex', alignItems: 'center', height: 24, padding: '0 9px',
                borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: 'pointer',
                fontFamily: 'var(--mono)', whiteSpace: 'nowrap', transition: 'background .12s, border-color .12s, color .12s',
                color: isActive ? activeColor : 'var(--text-2)',
                background: isActive ? activeBg : 'transparent',
                border: `1px solid ${isActive ? activeBorder : 'var(--border)'}`,
              }}
            >
              {label}
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        <Btn icon="plus" variant="secondary" size="sm" onClick={() => setAddOpen(true)}>Add task</Btn>
        <Btn
          icon="play" variant="primary" size="sm"
          disabled={!hasRunnableTasks}
          onClick={() => void runAll()}
        >
          Run all
        </Btn>
      </div>

      {error && (
        <div style={{ padding: '10px 20px', background: 'rgba(244,63,94,.08)', borderBottom: '1px solid rgba(244,63,94,.2)', color: 'var(--rose)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="warn" size={14} /> {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>
            <Icon name="x" size={14} />
          </button>
        </div>
      )}

      {/* Main body */}
      <main style={{ flex: 1, padding: '16px 20px 24px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
        <div style={{ display: 'flex', gap: 14, flex: 1 }}>
          {COLS.map((col) => (
            <Column
              key={col.id}
              id={col.id}
              title={col.title}
              accent={col.accent}
              count={grouped[col.id].length}
              isEmpty={grouped[col.id].length === 0}
              onDropTask={(id) => void handleDrop(id, col.id)}
            >
              {grouped[col.id].map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  runtimeMs={runtimeMs(t)}
                  isDragging={dragId === t.id}
                  dragHandlers={{
                    draggable: true,
                    onDragStart: (e: React.DragEvent) => handleDragStart(e, t.id),
                    onDragEnd: handleDragEnd,
                  }}
                  onOpen={() => { setSelectedIndex(t.index); setDrawerTab('logs'); }}
                  onEdit={() => { setSelectedIndex(t.index); setDrawerTab('details'); }}
                  onRun={() => void runTask(t.index)}
                  onDelete={() => deleteTask(t.index)}
                />
              ))}
            </Column>
          ))}
        </div>
      </main>

      <TaskDrawer
        task={selected}
        open={!!selected}
        onClose={() => setSelectedIndex(null)}
        onRun={() => selected && void runTask(selected.index)}
        onSave={(data) => selected && editTask(selected.index, data)}
        tab={drawerTab}
        setTab={setDrawerTab}
        runtimeMs={selected ? runtimeMs(selected) : null}
      />

      <AddTaskDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={addTask}
        blockerCandidates={blockerCandidates}
        folderPath={folder?.path ?? null}
      />

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />

      <Toasts toasts={toasts} onDismiss={(id) => setToasts((arr) => arr.filter((t) => t.id !== id))} />
    </div>
  );
}
