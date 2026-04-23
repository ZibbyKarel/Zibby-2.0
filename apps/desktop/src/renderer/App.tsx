import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PickFolderResult, RefinedPlan, PersistedStoryRuntime } from '@zibby/shared-types/ipc';

import { Icon } from './components/icons';
import { Btn, Chip } from './components/primitives';
import { TaskCard } from './components/TaskCard';
import { Column } from './components/Column';
import { TaskDrawer } from './components/TaskDrawer';
import type { DrawerTab } from './components/TaskDrawer';
import { AddTaskDialog } from './components/AddTaskDialog';
import { CommandPalette } from './components/CommandPalette';
import type { Command } from './components/CommandPalette';
import { Toasts } from './components/Toasts';
import type { Toast } from './components/Toasts';
import { UsagePanel } from './components/UsagePanel';
import { DependencyGraph } from './components/DependencyGraph';

import {
  toTasks, statusToCol, emptyRuntime, isTerminal,
} from './viewModel';
import type { StoryRuntime, LogLine, TaskVM } from './viewModel';

type SelectedFolder = Extract<PickFolderResult, { kind: 'selected' }>;
type FilterStatus = 'all' | 'pending' | 'running' | 'review' | 'done' | 'failed';

const COLS = [
  { id: 'queue'   as const, title: 'Queued',  accent: 'var(--amber)' },
  { id: 'running' as const, title: 'Running', accent: 'var(--emerald)' },
  { id: 'review'  as const, title: 'Review',  accent: 'var(--violet)' },
  { id: 'done'    as const, title: 'Done',    accent: 'var(--sky)' },
];

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [folder, setFolder] = useState<SelectedFolder | null>(null);
  const [plan, setPlan] = useState<RefinedPlan | null>(null);

  const [runId, setRunId] = useState<string | null>(null);
  const [runtime, setRuntime] = useState<Record<number, StoryRuntime>>({});

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('logs');
  const [addOpen, setAddOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [showGraph, setShowGraph] = useState(true);
  const [tick, setTick] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydrated = useRef(false);

  // ── Bootstrap ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    window.zibby.loadState().then((state) => {
      if (cancelled) return;
      if (state.folder?.kind === 'selected') setFolder(state.folder);
      setPlan(state.plan ?? { stories: [], dependencies: [] });
      if (state.runtime) {
        setRuntime((prev) => {
          const next = { ...prev };
          for (const [k, v] of Object.entries(state.runtime!)) {
            const idx = Number(k);
            next[idx] = { ...v, logs: prev[idx]?.logs ?? [] };
          }
          return next;
        });
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
      persistedRuntime[idx] = { status: v.status, branch: v.branch, prUrl: v.prUrl, startedAt: v.startedAt, endedAt: v.endedAt };
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      window.zibby.saveState({ folderPath: folder?.path, plan: plan ?? undefined, runtime: persistedRuntime }).catch(() => {});
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
    const unsub = window.zibby.onRunEvent((ev) => {
      if (ev.kind === 'run-done') {
        pushToast({ kind: ev.success ? 'done' : 'failed', title: ev.success ? 'Run finished' : 'Run failed' });
        return;
      }
      const idx = ev.storyIndex;
      setRuntime((prev) => {
        const cur = prev[idx] ?? emptyRuntime();
        switch (ev.kind) {
          case 'status': {
            const next: StoryRuntime = {
              ...cur,
              status: ev.status,
              startedAt: ev.status === 'running' && !cur.startedAt ? Date.now() : cur.startedAt,
              endedAt: isTerminal(ev.status) ? (cur.endedAt ?? Date.now()) : cur.endedAt,
            };
            if (ev.status === 'done') {
              pushToast({ kind: 'done', title: 'Task done', desc: plan?.stories[idx]?.title });
            } else if (ev.status === 'failed') {
              pushToast({ kind: 'failed', title: 'Task failed', desc: plan?.stories[idx]?.title });
            }
            return { ...prev, [idx]: next };
          }
          case 'log': {
            const stream = ev.stream === 'stderr' ? 'err' : ev.stream === 'info' ? 'info' : 'out';
            const line: LogLine = { s: stream, l: ev.line };
            const logs = cur.logs.length >= 2000 ? [...cur.logs.slice(1), line] : [...cur.logs, line];
            return { ...prev, [idx]: { ...cur, logs } };
          }
          case 'pr': {
            pushToast({ kind: 'done', title: 'PR opened', desc: ev.url });
            return { ...prev, [idx]: { ...cur, branch: ev.branch, prUrl: ev.url } };
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

  const tasks = useMemo(() => toTasks(plan ?? { stories: [], dependencies: [] }, runtime), [plan, runtime]);

  const visible = useMemo(() => {
    const q = search.toLowerCase();
    return tasks.filter((t) =>
      (!q || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)) &&
      (filterStatus === 'all' || t.status === filterStatus)
    );
  }, [tasks, search, filterStatus]);

  const grouped = useMemo(() => {
    const out = { queue: [] as TaskVM[], running: [] as TaskVM[], review: [] as TaskVM[], done: [] as TaskVM[] };
    visible.forEach((t) => out[statusToCol(t.status)].push(t));
    return out;
  }, [visible]);

  const selected = tasks.find((t) => t.index === selectedIndex) ?? null;

  // ── Actions ────────────────────────────────────────────────
  const pickFolder = async () => {
    const result = await window.zibby.pickFolder();
    if (result.kind === 'selected') setFolder(result);
  };

  const runTask = useCallback(async (idx: number) => {
    if (!plan || !folder) {
      pushToast({ kind: 'failed', title: 'No folder selected' });
      return;
    }
    let currentRunId = runId;
    if (!currentRunId) {
      const res = await window.zibby.startRun({ folderPath: folder.path, plan });
      if (res.kind === 'error') { pushToast({ kind: 'failed', title: 'Run error', desc: res.message }); return; }
      currentRunId = res.runId;
      setRunId(currentRunId);
    }
    pushToast({ kind: 'info', title: 'Task started', desc: plan.stories[idx]?.title });
    window.zibby.runStory({ runId: currentRunId, storyIndex: idx, folderPath: folder.path, plan }).catch(() => {});
  }, [plan, folder, runId, pushToast]);

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

  const addTask = useCallback((data: { title: string; description: string; acceptance: string[]; model?: string }) => {
    setPlan((prev) => {
      const stories = prev?.stories ?? [];
      return {
        stories: [...stories, {
          title: data.title,
          description: data.description,
          acceptanceCriteria: data.acceptance,
          affectedFiles: [],
          model: data.model,
        }],
        dependencies: prev?.dependencies ?? [],
      };
    });
    setAddOpen(false);
  }, []);

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
    if (selectedIndex === idx) setSelectedIndex(null);
  }, [selectedIndex]);

  // ── Commands ───────────────────────────────────────────────
  const commands = useMemo<Command[]>(() => [
    {
      id: 'run-all', icon: 'play', label: 'Run all pending tasks', kbd: '⌘⏎',
      run: () => { tasks.filter((t) => t.status === 'pending' || t.status === 'blocked').forEach((t) => void runTask(t.index)); },
    },
    { id: 'add', icon: 'plus', label: 'Add task', kbd: 'n', run: () => setAddOpen(true) },
    {
      id: 'theme', icon: theme === 'dark' ? 'sun' : 'moon',
      label: `Toggle theme (→ ${theme === 'dark' ? 'light' : 'dark'})`,
      run: () => setTheme((t) => t === 'dark' ? 'light' : 'dark'),
    },
    { id: 'folder', icon: 'folder', label: 'Pick folder…', hint: folder?.path, run: () => void pickFolder() },
    { id: 'graph', icon: 'graph', label: showGraph ? 'Hide dependency graph' : 'Show dependency graph', run: () => setShowGraph((s) => !s) },
    ...tasks.map((t) => ({
      id: 'task-' + t.id,
      icon: 'arrowRight' as const,
      label: `Go to: ${t.title}`,
      hint: `#${t.index} · ${t.status}`,
      run: () => { setSelectedIndex(t.index); setDrawerTab('logs'); },
    })),
  ], [tasks, theme, showGraph, folder, runTask]);

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
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'linear-gradient(135deg, var(--emerald), #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#04140d', fontWeight: 700, fontSize: 14,
            boxShadow: '0 0 0 1px rgba(16,185,129,.3), 0 0 20px rgba(16,185,129,.15)',
          }}>Z</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-.01em' }}>Zibby 2.0</div>
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
        <div style={{ width: 1, height: 14, background: 'var(--border)' }} />
        {(['all', 'pending', 'running', 'review', 'done', 'failed'] as FilterStatus[]).map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)} style={{
            padding: '3px 10px', fontSize: 11, borderRadius: 5, cursor: 'pointer',
            fontFamily: 'var(--mono)', border: '1px solid',
            background: filterStatus === s ? 'var(--bg-3)' : 'transparent',
            borderColor: filterStatus === s ? 'var(--border-2)' : 'transparent',
            color: filterStatus === s ? 'var(--text-0)' : 'var(--text-2)',
          }}>
            {s}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <Btn icon="graph" variant="ghost" size="sm" onClick={() => setShowGraph((s) => !s)}>
          {showGraph ? 'Hide graph' : 'Show graph'}
        </Btn>
        <Btn icon="plus" variant="secondary" size="sm" onClick={() => setAddOpen(true)}>Add task</Btn>
        <Btn icon="sparkle" variant="outline" size="sm">Ask Opus</Btn>
        <Btn
          icon="play" variant="primary" size="sm"
          onClick={() => tasks.filter((t) => t.status === 'pending').forEach((t) => void runTask(t.index))}
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
        {showGraph && plan && <DependencyGraph tasks={tasks} onClickTask={(t) => { setSelectedIndex(t.index); setDrawerTab('logs'); }} />}

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

      <AddTaskDialog open={addOpen} folderPath={folder?.path ?? null} onClose={() => setAddOpen(false)} onAdd={addTask} />

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />

      <Toasts toasts={toasts} onDismiss={(id) => setToasts((arr) => arr.filter((t) => t.id !== id))} />
    </div>
  );
}
