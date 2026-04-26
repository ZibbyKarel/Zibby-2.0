import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PickFolderResult, RefinedPlan, PersistedStoryRuntime } from '@nightcoder/shared-types/ipc';
import { taskIdForNewStory, collectTaskIds } from '@nightcoder/shared-types/task-id';
import { TestIds } from '@nightcoder/test-ids';

import {
  Alert,
  Button,
  Chip as DsChip,
  DesignSystemProvider,
  Divider,
  FilterChip,
  Icon,
  IconButton,
  IconName,
  Kbd,
  SearchField,
  Spacer,
  Stack,
  Surface,
  Text,
} from '@nightcoder/design-system';
import { BrandMark } from './components/icons';
import { TaskCard } from './components/TaskCard';
import { Column } from './components/Column';
import { TaskDrawer } from './components/TaskDrawer';
import type { DrawerTab } from './components/TaskDrawer';
import { AddTaskDialog, type BlockerOption, type NewTaskData } from './components/AddTaskDialog';
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
  { id: 'queue'   as const, title: 'Queued',  accent: 'amber'   as const },
  { id: 'running' as const, title: 'Running', accent: 'emerald' as const },
  { id: 'review'  as const, title: 'Review',  accent: 'violet'  as const },
  { id: 'done'    as const, title: 'Done',    accent: 'sky'     as const },
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
  const [syncing, setSyncing] = useState(false);

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
  const blockerOptions = useMemo<BlockerOption[]>(
    () => tasks.map((t) => ({
      taskId: t.taskId,
      title: t.title,
      hint: t.numericId ? `#${t.numericId}` : `#${t.index + 1}`,
    })),
    [tasks],
  );
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

  const syncTaskStates = useCallback(async () => {
    if (!folder) {
      pushToast({ kind: 'failed', title: 'No folder selected' });
      return;
    }
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await window.nightcoder.syncTaskStates({ folderPath: folder.path });
      if (res.kind === 'error') {
        pushToast({ kind: 'failed', title: 'Synchronize failed', desc: res.message });
        return;
      }
      if (res.updates.length > 0) {
        setRuntime((prev) => {
          const next = { ...prev };
          for (const u of res.updates) {
            const cur = next[u.storyIndex] ?? emptyRuntime();
            next[u.storyIndex] = {
              ...cur,
              status: u.status,
              branch: u.branch ?? cur.branch,
              prUrl: u.prUrl ?? cur.prUrl,
              endedAt: cur.endedAt ?? Date.now(),
              limitResetsAt: null,
            };
          }
          return next;
        });
      }
      if (res.mergedCount > 0) {
        pushToast({
          kind: 'done',
          title: `Synchronized · ${res.mergedCount} merged externally`,
          desc: `Checked ${res.checked} task${res.checked === 1 ? '' : 's'}`,
        });
      } else {
        pushToast({
          kind: 'info',
          title: 'Synchronized',
          desc: `Checked ${res.checked} task${res.checked === 1 ? '' : 's'} — no external merges`,
        });
      }
    } finally {
      setSyncing(false);
    }
  }, [folder, syncing, pushToast]);

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

  const addTask = useCallback((data: NewTaskData) => {
    let newTaskId: string | null = null;
    setPlan((prev) => {
      const stories = prev?.stories ?? [];
      const taskId = taskIdForNewStory(data.title, collectTaskIds(stories));
      newTaskId = taskId;
      const nextStories = [...stories, {
        taskId,
        title: data.title,
        description: data.description,
        acceptanceCriteria: data.acceptance,
        affectedFiles: [],
        model: data.model,
        phaseModels: data.phaseModels,
        blockerTaskId: data.blockerTaskId,
      }];
      // If the user picked a blocker, mirror it into the DAG as a
      // dependency edge so the board, run ordering, and block cascade
      // behave as the UI implies. blockerTaskId on the story is the
      // source of truth for branch/PR-target resolution; the edge is
      // derived data.
      const nextDeps = prev?.dependencies ? [...prev.dependencies] : [];
      if (data.blockerTaskId) {
        const blockerIndex = stories.findIndex((s) => s.taskId === data.blockerTaskId);
        const newIndex = nextStories.length - 1;
        if (blockerIndex >= 0) {
          const already = nextDeps.some((d) => d.from === blockerIndex && d.to === newIndex);
          if (!already) {
            nextDeps.push({
              from: blockerIndex,
              to: newIndex,
              reason: `blocks ${data.title}`,
            });
          }
        }
      }
      return { stories: nextStories, dependencies: nextDeps };
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
      id: 'run-all', icon: IconName.Play, label: 'Run all pending tasks', kbd: '⌘⏎',
      run: () => { void runAll(); },
    },
    {
      id: 'sync', icon: IconName.Refresh, label: 'Synchronize task states',
      hint: 'Detect PRs merged externally',
      run: () => { void syncTaskStates(); },
    },
    { id: 'add', icon: IconName.Plus, label: 'Add task', kbd: 'n', run: () => setAddOpen(true) },
    {
      id: 'theme', icon: theme === 'dark' ? IconName.Sun : IconName.Moon,
      label: `Toggle theme (→ ${theme === 'dark' ? 'light' : 'dark'})`,
      run: () => setTheme((t) => t === 'dark' ? 'light' : 'dark'),
    },
    { id: 'folder', icon: IconName.Folder, label: 'Pick folder…', hint: folder?.path, run: () => void pickFolder() },
    ...tasks.map((t) => ({
      id: 'task-' + t.id,
      icon: IconName.ArrowRight,
      label: `Go to: ${t.title}`,
      hint: `#${t.index} · ${t.status}`,
      run: () => { setSelectedIndex(t.index); setDrawerTab('logs'); },
    })),
  ], [tasks, theme, folder, runAll, syncTaskStates]);

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
    <DesignSystemProvider theme={theme} layout="column">
      {/* Top bar */}
      <Surface
        as="header"
        background="bg1"
        bordered={{ bottom: true }}
        paddingX={20}
        paddingY={14}
        data-testid={TestIds.TopBar.root}
      >
        <Stack direction="row" align="center" gap={16}>
          <Stack direction="row" align="center" gap={10} data-testid={TestIds.TopBar.brand}>
            <BrandMark theme={theme} size={30} />
            <Stack direction="column">
              <Text size="md" weight="semibold" tracking="tight">
                {theme === 'light' ? 'DayCoder' : 'NightCoder'}
              </Text>
              <Text size="xxs" tone="faint" mono>multi-agent coding workflow</Text>
            </Stack>
          </Stack>

          {folder ? (
            <Surface background="bg2" bordered radius="sm" paddingX={10} paddingY={6}>
              <Stack direction="row" align="center" gap={6}>
                <Icon value={IconName.Folder} size={13} />
                <Surface maxWidth={260}>
                  <Text size="sm" mono tone="muted" truncate data-testid={TestIds.TopBar.folderPath}>
                    {folder.path}
                  </Text>
                </Surface>
                <Divider orientation="vertical" />
                <DsChip tone="accent" size="sm" icon={<Icon value={IconName.Git} size={11} />}>main</DsChip>
                <IconButton
                  aria-label="Change folder"
                  size="sm"
                  variant="ghost"
                  onClick={() => void pickFolder()}
                  icon={<Icon value={IconName.ChevronDown} size={12} />}
                  data-testid={TestIds.TopBar.changeFolderBtn}
                />
              </Stack>
            </Surface>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void pickFolder()}
              startIcon={<Icon value={IconName.Folder} size={13} />}
              label="Pick folder"
              data-testid={TestIds.TopBar.pickFolderBtn}
            />
          )}

          <Spacer />

          <SearchField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks"
            startAdornment={<Icon value={IconName.Search} size={13} />}
            endAdornment={<Kbd>⌘K</Kbd>}
            data-testid={TestIds.TopBar.searchInput}
          />

          <UsagePanel tick={tick} />

          <IconButton
            aria-label="Toggle theme"
            title="Toggle theme"
            variant="secondary"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            icon={<Icon value={theme === 'dark' ? IconName.Sun : IconName.Moon} size={14} />}
            data-testid={TestIds.TopBar.themeToggle}
          />
        </Stack>
      </Surface>

      {/* Sub-bar */}
      <Surface
        background="bg0"
        bordered={{ bottom: true }}
        paddingX={20}
        paddingY={12}
        data-testid={TestIds.SubBar.root}
      >
        <Stack direction="row" align="center" gap={10}>
          <Text size="xs" tone="faint" mono data-testid={TestIds.SubBar.taskCount}>
            {tasks.length} tasks · {tasks.filter((t) => t.status === 'running').length} running
          </Text>
          <Divider orientation="vertical" />
          {([
            { key: 'interrupted'     as const, label: 'Interrupted',         tone: 'warn'   as const, testId: TestIds.SubBar.filterInterrupted },
            { key: 'cancelled_error' as const, label: 'Cancelled / Error',   tone: 'rose'   as const, testId: TestIds.SubBar.filterCancelledErr },
            { key: 'pending'         as const, label: 'Pending',             tone: 'sky'    as const, testId: TestIds.SubBar.filterPending },
          ]).map(({ key, label, tone, testId }) => (
            <FilterChip
              key={key}
              tone={tone}
              size="md"
              active={activeFilters.has(key)}
              onToggle={() => toggleFilter(key)}
              data-testid={testId}
            >
              {label}
            </FilterChip>
          ))}
          <Spacer />
          <Button
            size="sm"
            variant="secondary"
            disabled={!folder || syncing}
            onClick={() => void syncTaskStates()}
            title="Synchronize task states with their pull requests"
            startIcon={<Icon value={IconName.Refresh} size={13} />}
            label={syncing ? 'Synchronizing…' : 'Synchronize'}
            data-testid={TestIds.SubBar.syncBtn}
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setAddOpen(true)}
            startIcon={<Icon value={IconName.Plus} size={13} />}
            label="Add task"
            data-testid={TestIds.SubBar.addTaskBtn}
          />
          <Button
            size="sm"
            variant="primary"
            disabled={!hasRunnableTasks}
            onClick={() => void runAll()}
            startIcon={<Icon value={IconName.Play} size={13} />}
            label="Run all"
            data-testid={TestIds.SubBar.runAllBtn}
          />
        </Stack>
      </Surface>

      {error && (
        <Surface paddingX={20} paddingY={10}>
          <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
        </Surface>
      )}

      {/* Main body */}
      <Surface
        as="main"
        grow
        direction="column"
        gap={16}
        paddingX={20}
        paddingTop={16}
        paddingBottom={24}
        overflowY="auto"
        data-testid={TestIds.Board.root}
      >
        <Stack direction="row" gap={14} grow>
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
        </Stack>
      </Surface>

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
        folderPath={folder?.path ?? null}
        blockerOptions={blockerOptions}
      />

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />

      <Toasts toasts={toasts} onDismiss={(id) => setToasts((arr) => arr.filter((t) => t.id !== id))} />
    </DesignSystemProvider>
  );
}
