/* global React, ReactDOM */
const { useState: apS, useEffect: apE, useMemo: apM, useRef: apR, useCallback: apC } = React;

// Kanban column grouping
const COLS = [
  { id: 'queue',   title: 'Queued',  accent: 'var(--amber)',    statuses: ['pending', 'queued', 'blocked'] },
  { id: 'running', title: 'Running', accent: 'var(--emerald)',  statuses: ['running', 'pushing'] },
  { id: 'review',  title: 'Review',  accent: 'var(--violet)',   statuses: ['review'] },
  { id: 'done',    title: 'Done',    accent: 'var(--sky)',      statuses: ['done', 'failed', 'cancelled'] },
];
const statusToCol = (s) => COLS.find(c => c.statuses.includes(s))?.id || 'queue';
const dropColDefault = (colId) => {
  if (colId === 'queue') return 'pending';
  if (colId === 'running') return 'running';
  if (colId === 'review') return 'review';
  return 'done';
};

function Dashboard({ variant = 'a', tweaks, setTweak }) {
  const [tasks, setTasks] = apS(() => window.ZIBBY.SEED_TASKS.map(t => ({ ...t })));
  const [folder] = apS(window.ZIBBY.FOLDER);
  const [usage] = apS(window.ZIBBY.USAGE);
  // When true, show archived tasks in the Done column instead of active ones.
  const [showArchived, setShowArchived] = apS(false);
  const [archiveOpen, setArchiveOpen] = apS(false);

  const theme = tweaks?.theme || 'dark';
  const setTheme = (v) => setTweak?.('theme', typeof v === 'function' ? v(theme) : v);

  // Theme-aware brand defaults. Only override if the user has explicitly set appName / accent.
  const themedName = theme === 'light' ? 'DayCoder' : 'NightCoder';
  const themedAccent = theme === 'light' ? '#f59e0b' : '#10b981';
  const userName = tweaks?.appName && tweaks.appName !== 'NightCoder' && tweaks.appName !== 'DayCoder'
    ? tweaks.appName : null;
  const userAccent = tweaks?.accent && tweaks.accent !== '#10b981' && tweaks.accent !== '#f59e0b'
    ? tweaks.accent : null;
  const appName = userName || themedName;
  const accent = userAccent || themedAccent;
  const density = tweaks?.density || 'comfortable';
  apE(() => { document.documentElement.style.setProperty('--emerald', accent); }, [accent]);
  const [selectedId, setSelectedId] = apS(null);
  const [drawerTab, setDrawerTab] = apS('logs');
  const [addOpen, setAddOpen] = apS(false);
  const [paletteOpen, setPaletteOpen] = apS(false);
  const [search, setSearch] = apS('');
  const [filterStatus, setFilterStatus] = apS('all');
  const [tick, setTick] = apS(0);
  const [toasts, setToasts] = apS([]);
  const [dragId, setDragId] = apS(null);

  // tick every second for countdowns and timers
  apE(() => {
    const id = setInterval(() => setTick(t => t + 1000), 1000);
    return () => clearInterval(id);
  }, []);

  // apply theme
  apE(() => {
    const el = document.querySelector(`.zb[data-variant="${variant}"]`);
    if (el) el.className = `zb ${theme === 'light' ? 'theme-light' : ''}`;
    el?.setAttribute('data-variant', variant);
  }, [theme, variant]);

  // global ⌘K
  apE(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); setPaletteOpen(o => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const selected = tasks.find(t => t.id === selectedId) || null;

  const pushToast = (t) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(arr => [...arr, { id, ...t }]);
    setTimeout(() => setToasts(arr => arr.filter(x => x.id !== id)), 5000);
  };

  const moveTask = (id, toCol) => {
    setTasks(ts => ts.map(t => t.id === id
      ? { ...t, status: dropColDefault(toCol),
          startedAt: toCol === 'running' ? Date.now() : t.startedAt,
          endedAt: (toCol === 'done' || toCol === 'review') ? Date.now() : t.endedAt }
      : t));
  };

  // Preview/run the branch for a task under review. In a real app this would
  // spawn a worktree run (pnpm dev etc) and pop open the preview URL.
  const previewTask = (id) => {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    pushToast({
      kind:'info',
      title:'Preview starting',
      desc:`${t.branch || 'branch'} → http://localhost:5173`,
    });
  };

  // Approve a review task — move it to Done.
  const approveTask = (id) => {
    moveTask(id, 'done');
    const t = tasks.find(x => x.id === id);
    if (t) pushToast({ kind:'success', title:'Task approved', desc:t.title });
  };

  // Reject from review — send back to queue as pending.
  const rejectTask = (id) => {
    setTasks(ts => ts.map(t => t.id === id ? { ...t, status:'pending', endedAt:null } : t));
    const t = tasks.find(x => x.id === id);
    if (t) pushToast({ kind:'warn', title:'Task sent back', desc:t.title });
  };

  const runTask = (id) => {
    moveTask(id, 'running');
    pushToast({ kind:'info', title:'Task started', desc: tasks.find(t=>t.id===id)?.title });
  };

  const addTask = (data) => {
    // Title is optional — if empty, derive a short one from the description's
    // first line so the card and command palette have something to show.
    const fallbackTitle = (() => {
      const first = (data.description || '').split('\n')[0].trim();
      if (!first) return 'Untitled task';
      return first.length > 60 ? first.slice(0, 57) + '…' : first;
    })();
    setTasks(ts => [...ts, {
      id: 'n' + Math.random().toString(36).slice(2, 6),
      index: ts.length, status: data.waitsOn?.length ? 'blocked' : 'pending',
      waitsOn:[], logs:[], diff:null,
      affectedFiles:[], tokens:null, branch:null, prUrl:null, startedAt:null, endedAt:null,
      ...data,
      title: data.title || fallbackTitle,
    }]);
    setAddOpen(false);
  };

  // Archive every task currently in the Done column (status done/failed/cancelled
  // AND not already archived). Archived tasks stay in state but are hidden from
  // the Done column. They live on in the Archive view, which has its own UI.
  // Returns the number of tasks archived.
  const archiveDone = () => {
    const doneStatuses = ['done', 'failed', 'cancelled'];
    const archivable = tasks.filter(t => doneStatuses.includes(t.status) && !t.archived);
    if (archivable.length === 0) {
      pushToast({ kind:'warn', title:'Nothing to archive', desc:'No completed tasks in Done.' });
      return 0;
    }
    setTasks(ts => ts.map(t =>
      doneStatuses.includes(t.status) && !t.archived
        ? { ...t, archived:true, archivedAt:Date.now() } : t));
    pushToast({
      kind:'success',
      title:`Archived ${archivable.length} task${archivable.length === 1 ? '' : 's'}`,
      desc:'Open the Archive to find them.',
    });
    return archivable.length;
  };

  // Restore one archived task back to its previous status (it shows up in Done
  // again, since done/failed/cancelled are the archivable statuses).
  const restoreTask = (id) => {
    setTasks(ts => ts.map(t => t.id === id ? { ...t, archived:false, archivedAt:null } : t));
  };

  // Permanently delete archived tasks.
  const deleteArchived = (ids) => {
    const set = new Set(ids);
    setTasks(ts => ts.filter(t => !set.has(t.id)));
  };

  // filter + search
  const visible = apM(() => {
    const q = search.toLowerCase();
    return tasks.filter(t =>
      // Archived tasks never show on the kanban — they live in the Archive modal
      !t.archived &&
      (!q || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)) &&
      (filterStatus === 'all' || t.status === filterStatus)
    );
  }, [tasks, search, filterStatus]);

  const grouped = apM(() => {
    const out = { queue:[], running:[], review:[], done:[] };
    visible.forEach(t => out[statusToCol(t.status)].push(t));
    return out;
  }, [visible]);

  const commands = apM(() => [
    { id:'run-all', icon:'play', label:'Run all tasks', kbd:'⌘⏎',
      run: () => { tasks.filter(t => t.status==='pending' || t.status==='queued').forEach(t => runTask(t.id)); } },
    { id:'add', icon:'plus', label:'Add task', kbd:'n', run: () => setAddOpen(true) },
    { id:'theme', icon: theme==='dark'?'sun':'moon', label:`Toggle theme (${theme==='dark'?'light':'dark'})`,
      run: () => setTheme(t => t==='dark'?'light':'dark') },
    { id:'folder', icon:'folder', label:'Change folder…', hint: folder.path, run: () => {} },
    ...tasks.map(t => ({ id:'task-'+t.id, icon:'arrowRight',
      label: `Go to: ${t.title}`, hint: `#${t.index} · ${t.status}`,
      run: () => { setSelectedId(t.id); setDrawerTab('logs'); } })),
  ], [tasks, theme, folder]);

  const handleDragStart = (e, id) => {
    e.dataTransfer.setData('text/task-id', id);
    e.dataTransfer.effectAllowed = 'move';
    setDragId(id);
  };
  const handleDragEnd = () => setDragId(null);

  return (
    <div className={`zb ${theme === 'light' ? 'theme-light' : ''}`} data-variant={variant} data-density={density}
      style={{ minHeight:'100%', background:'var(--bg-0)', color:'var(--text-0)',
        display:'flex', flexDirection:'column', fontSize:13 }}>

      {/* Top bar */}
      <header style={{
        padding:'14px 20px',
        borderBottom:'1px solid var(--border)',
        background:'var(--bg-1)',
        display:'flex', alignItems:'center', gap:16,
      }}>
        <div style={{display:'flex', alignItems:'center', gap:10}}>
          <BrandMark size={30} theme={theme} accent={accent}/>
          <div>
            <div style={{fontSize:13, fontWeight:700, letterSpacing:'-.01em'}}>{appName}</div>
            <div style={{fontSize:10, color:'var(--text-3)', fontFamily:'var(--mono)'}}>
              multi-agent coding workflow
            </div>
          </div>
        </div>

        {/* Folder */}
        <div style={{display:'flex', alignItems:'center', gap:6, padding:'6px 10px',
          background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:8}}>
          <Icon name="folder" size={13}/>
          <span style={{fontFamily:'var(--mono)', fontSize:12, color:'var(--text-1)'}}>
            {folder.path}
          </span>
          <div style={{width:1, height:14, background:'var(--border)', margin:'0 4px'}}/>
          <Chip icon="git" tone="accent" style={{height:20}}>{folder.branch}</Chip>
          <button style={{background:'transparent', border:'none', color:'var(--text-3)',
            cursor:'pointer', padding:2, display:'flex', marginLeft:2}}>
            <Icon name="chevronDown" size={12}/>
          </button>
        </div>

        <div style={{flex:1}}/>

        {/* search */}
        <div style={{display:'flex', alignItems:'center', gap:8, padding:'6px 10px',
          background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:8, minWidth:220}}>
          <Icon name="search" size={13}/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search tasks"
            style={{flex:1, background:'transparent', border:'none', color:'var(--text-0)',
              fontSize:12, outline:'none'}}/>
          <kbd style={{fontFamily:'var(--mono)', fontSize:10, padding:'1px 5px',
            background:'var(--bg-3)', border:'1px solid var(--border)', borderRadius:3,
            color:'var(--text-3)'}}>⌘K</kbd>
        </div>

        <UsagePanel usage={usage} tick={tick}/>

        <button onClick={() => setTheme(t => t==='dark'?'light':'dark')}
          style={{background:'var(--bg-2)', border:'1px solid var(--border)',
            borderRadius:8, padding:'6px 8px', color:'var(--text-1)', cursor:'pointer',
            display:'flex', alignItems:'center'}}
          title="Toggle theme">
          <Icon name={theme==='dark'?'sun':'moon'} size={14}/>
        </button>
      </header>

      {/* Sub-bar: filters + actions */}
      <div style={{padding:'12px 20px', display:'flex', alignItems:'center', gap:10,
        background:'var(--bg-0)', borderBottom:'1px solid var(--border)'}}>
        <span style={{fontSize:11, color:'var(--text-3)', fontFamily:'var(--mono)'}}>
          {tasks.length} tasks · {tasks.filter(t=>t.status==='running').length} running
        </span>
        <div style={{width:1, height:14, background:'var(--border)'}}/>
        {['all', 'pending', 'review', 'failed', 'interrupted'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            style={{
              padding:'3px 10px', fontSize:11, borderRadius:5,
              background: filterStatus === s ? 'var(--bg-3)' : 'transparent',
              border:'1px solid', borderColor: filterStatus === s ? 'var(--border-2)' : 'transparent',
              color: filterStatus === s ? 'var(--text-0)' : 'var(--text-2)', cursor:'pointer',
              fontFamily:'var(--mono)',
            }}>
            {s}
          </button>
        ))}
        <div style={{flex:1}}/>
        {tasks.some(t => t.archived) && (
          <Btn icon="archive" variant="ghost" size="sm" onClick={() => setArchiveOpen(true)}>
            Archive
            <span style={{
              marginLeft:6, padding:'1px 6px', borderRadius:999,
              background:'var(--bg-3)', fontSize:10, fontFamily:'var(--mono)',
              color:'var(--text-2)',
            }}>
              {tasks.filter(t => t.archived).length}
            </span>
          </Btn>
        )}
        <Btn icon="plus" variant="secondary" size="sm" onClick={() => setAddOpen(true)}>
          Add task
        </Btn>
        <Btn icon="play" variant="primary" size="sm"
          onClick={() => tasks.filter(t=>t.status==='pending').forEach(t=>runTask(t.id))}>
          Run all
        </Btn>
      </div>

      {/* Body: kanban */}
      <main style={{flex:1, padding:'16px 20px 24px', display:'flex',
        flexDirection:'column', gap:16, overflowY:'auto'}}>

        <div style={{display:'flex', gap:14, flex:1}}>
          {COLS.map(col => (
            <Column key={col.id} id={col.id}
              title={col.title}
              accent={col.accent}
              count={grouped[col.id].length} tasks={grouped[col.id]}
              onDropTask={(id) => moveTask(id, col.id)}
              headerAction={col.id === 'done' ? (
                <button onClick={archiveDone}
                  title="Archive all completed tasks"
                  style={{
                    background:'transparent', border:'none',
                    color:'var(--text-3)',
                    cursor:'pointer', padding:4, borderRadius:4,
                    display:'flex', alignItems:'center',
                    transition:'color .12s, background .12s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = 'var(--text-0)';
                    e.currentTarget.style.background = 'var(--bg-3)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = 'var(--text-3)';
                    e.currentTarget.style.background = 'transparent';
                  }}>
                  <Icon name="archive" size={13}/>
                </button>
              ) : null}>
              {grouped[col.id].map(t => (
                <TaskCard key={t.id} task={t} runtimeMs={t.startedAt ? tick + (Date.now() - t.startedAt) : null}
                  isDragging={dragId === t.id}
                  dragHandlers={{
                    draggable:true,
                    onDragStart:(e)=>handleDragStart(e, t.id),
                    onDragEnd: handleDragEnd,
                  }}
                  onOpen={() => { setSelectedId(t.id); setDrawerTab('logs'); }}
                  onEdit={() => { setSelectedId(t.id); setDrawerTab('details'); }}
                  onRun={() => runTask(t.id)}
                  onPreview={() => previewTask(t.id)}
                  onApprove={() => approveTask(t.id)}
                  onReject={() => rejectTask(t.id)}
                  onDelete={() => setTasks(ts => ts.filter(x => x.id !== t.id))}
                />
              ))}
            </Column>
          ))}
        </div>
      </main>

      <TaskDrawer task={selected} open={!!selected} onClose={() => setSelectedId(null)}
        onRun={() => selected && runTask(selected.id)} tab={drawerTab} setTab={setDrawerTab}
        runtimeMs={selected?.startedAt ? tick + (Date.now() - selected.startedAt) : null}/>

      <AddTaskDialog open={addOpen} onClose={() => setAddOpen(false)} onAdd={addTask} allTasks={tasks} folder={folder}/>

      <ArchiveModal open={archiveOpen} onClose={() => setArchiveOpen(false)}
        tasks={tasks.filter(t => t.archived)}
        onRestore={(id) => { restoreTask(id); pushToast({kind:'info', title:'Task restored'}); }}
        onDelete={(ids) => { deleteArchived(ids); pushToast({kind:'warn', title:`Deleted ${ids.length} task${ids.length===1?'':'s'}`}); }}
        onOpenTask={(id) => { setArchiveOpen(false); setSelectedId(id); setDrawerTab('logs'); }}/>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands}/>

      <Toasts toasts={toasts} onDismiss={(id) => setToasts(arr => arr.filter(t => t.id !== id))}/>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Brand">
          <TweakText label="App name" value={appName} onChange={v => setTweak('appName', v)}/>
          <TweakColor label="Accent" value={accent} onChange={v => setTweak('accent', v)}/>
        </TweakSection>
        <TweakSection label="Appearance">
          <TweakRadio label="Theme" value={theme}
            options={['dark','light']}
            onChange={v => setTweak('theme', v)}/>
          <TweakRadio label="Density" value={density}
            options={['compact','comfortable']}
            onChange={v => setTweak('density', v)}/>
        </TweakSection>
        <TweakSection label="Layout">
          <TweakToggle label="Monospace logs" value={tweaks?.monoLogs !== false}
            onChange={v => setTweak('monoLogs', v)}/>
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

window.Dashboard = Dashboard;
