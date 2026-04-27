/* global React */
const { useState: amS, useMemo: amM, useEffect: amE } = React;

// ──────────────────────────────────────────────
// Archive Modal
// Full-screen searchable archive of completed tasks.
// Grouped by date, with bulk-select + restore/delete actions.
// ──────────────────────────────────────────────
function ArchiveModal({ open, onClose, tasks, onRestore, onDelete, onOpenTask }) {
  const [query, setQuery] = amS('');
  const [statusFilter, setStatusFilter] = amS('all');
  const [selected, setSelected] = amS(() => new Set());
  const [sortBy, setSortBy] = amS('date-desc'); // date-desc | date-asc | title

  // Reset selection whenever the archive is opened
  amE(() => { if (open) { setSelected(new Set()); setQuery(''); setStatusFilter('all'); } }, [open]);

  // Esc to close
  amE(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const filtered = amM(() => {
    const q = query.trim().toLowerCase();
    const list = tasks.filter(t =>
      (statusFilter === 'all' || t.status === statusFilter) &&
      (!q || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) ||
        (t.branch && t.branch.toLowerCase().includes(q)))
    );
    if (sortBy === 'title') list.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortBy === 'date-asc') list.sort((a, b) => (a.archivedAt || 0) - (b.archivedAt || 0));
    else list.sort((a, b) => (b.archivedAt || 0) - (a.archivedAt || 0));
    return list;
  }, [tasks, query, statusFilter, sortBy]);

  // Group by relative date bucket: Today / Yesterday / This week / Earlier
  const grouped = amM(() => {
    const now = new Date(); now.setHours(0,0,0,0);
    const day = 86400000;
    const bucketsOrder = ['Today', 'Yesterday', 'This week', 'Earlier'];
    const buckets = { Today:[], Yesterday:[], 'This week':[], Earlier:[] };
    for (const t of filtered) {
      const at = t.archivedAt ? new Date(t.archivedAt) : null;
      if (!at) { buckets.Earlier.push(t); continue; }
      const d = new Date(at); d.setHours(0,0,0,0);
      const diff = (now - d) / day;
      if (diff <= 0) buckets.Today.push(t);
      else if (diff <= 1) buckets.Yesterday.push(t);
      else if (diff <= 7) buckets['This week'].push(t);
      else buckets.Earlier.push(t);
    }
    return bucketsOrder.map(k => [k, buckets[k]]).filter(([, v]) => v.length > 0);
  }, [filtered]);

  const toggle = (id) => setSelected(s => {
    const next = new Set(s); if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const allFilteredIds = filtered.map(t => t.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selected.has(id));
  const toggleAll = () => setSelected(s => {
    if (allSelected) return new Set([...s].filter(id => !allFilteredIds.includes(id)));
    return new Set([...s, ...allFilteredIds]);
  });

  if (!open) return null;

  const statuses = [...new Set(tasks.map(t => t.status))];

  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:60,
      display:'flex', alignItems:'center', justifyContent:'center',
      animation:'fade-in .14s ease', padding:24,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width:'min(1100px, 96vw)', height:'min(780px, 92vh)',
        background:'var(--bg-1)', border:'1px solid var(--border-2)',
        borderRadius:14, boxShadow:'var(--shadow-2)',
        animation:'slide-up .2s ease',
        display:'flex', flexDirection:'column', overflow:'hidden',
      }}>
        {/* Header */}
        <header style={{padding:'14px 20px', borderBottom:'1px solid var(--border)',
          display:'flex', alignItems:'center', gap:12, background:'var(--bg-1)'}}>
          <div style={{width:32, height:32, borderRadius:8, background:'var(--bg-3)',
            display:'flex', alignItems:'center', justifyContent:'center', color:'var(--sky)'}}>
            <Icon name="archive" size={16}/>
          </div>
          <div>
            <h2 style={{margin:0, fontSize:15, fontWeight:600}}>Archive</h2>
            <div style={{fontSize:11, color:'var(--text-3)', fontFamily:'var(--mono)'}}>
              {tasks.length} archived task{tasks.length === 1 ? '' : 's'}
              {filtered.length !== tasks.length && ` · ${filtered.length} shown`}
            </div>
          </div>
          <div style={{flex:1}}/>
          <button onClick={onClose} style={{background:'transparent', border:'none',
            color:'var(--text-3)', cursor:'pointer', padding:6, borderRadius:6, display:'flex'}}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <Icon name="x" size={16}/>
          </button>
        </header>

        {/* Toolbar: search + filters */}
        <div style={{padding:'12px 20px', borderBottom:'1px solid var(--border)',
          display:'flex', alignItems:'center', gap:10, flexWrap:'wrap'}}>
          <div style={{display:'flex', alignItems:'center', gap:8, padding:'6px 10px',
            background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:8,
            minWidth:240, flex:'1 1 240px', maxWidth:360}}>
            <Icon name="search" size={13}/>
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search archived…"
              style={{flex:1, background:'transparent', border:'none',
                color:'var(--text-0)', fontSize:12, outline:'none'}}/>
            {query && (
              <button onClick={() => setQuery('')}
                style={{background:'transparent', border:'none', color:'var(--text-3)',
                  cursor:'pointer', padding:0, display:'flex'}}>
                <Icon name="x" size={11}/>
              </button>
            )}
          </div>

          <div style={{display:'flex', gap:4, background:'var(--bg-2)',
            border:'1px solid var(--border)', borderRadius:8, padding:2}}>
            {['all', ...statuses].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                style={{
                  padding:'4px 10px', fontSize:11, borderRadius:5,
                  background: statusFilter === s ? 'var(--bg-3)' : 'transparent',
                  border:'none', color: statusFilter === s ? 'var(--text-0)' : 'var(--text-2)',
                  cursor:'pointer', fontFamily:'var(--mono)',
                }}>{s}</button>
            ))}
          </div>

          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            style={{padding:'7px 10px', background:'var(--bg-2)',
              border:'1px solid var(--border)', borderRadius:8, color:'var(--text-1)',
              fontSize:11, fontFamily:'var(--mono)', outline:'none', cursor:'pointer'}}>
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
            <option value="title">Title A→Z</option>
          </select>

          <div style={{flex:1}}/>

          {selected.size > 0 ? (
            <>
              <span style={{fontSize:11, color:'var(--text-2)', fontFamily:'var(--mono)'}}>
                {selected.size} selected
              </span>
              <Btn icon="arrowRight" variant="outline" size="sm"
                onClick={() => { [...selected].forEach(onRestore); setSelected(new Set()); }}>
                Restore
              </Btn>
              <Btn icon="trash" variant="outline" size="sm"
                onClick={() => {
                  if (confirm(`Permanently delete ${selected.size} task${selected.size===1?'':'s'}?`)) {
                    onDelete([...selected]); setSelected(new Set());
                  }
                }}>
                Delete
              </Btn>
            </>
          ) : (
            <button onClick={toggleAll} disabled={filtered.length === 0}
              style={{fontSize:11, padding:'4px 10px', background:'transparent',
                border:'1px solid var(--border)', borderRadius:6, color:'var(--text-2)',
                cursor: filtered.length === 0 ? 'not-allowed' : 'pointer',
                fontFamily:'var(--mono)', opacity: filtered.length === 0 ? .5 : 1}}>
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
          )}
        </div>

        {/* List */}
        <div style={{flex:1, overflowY:'auto', padding:'8px 0'}}>
          {filtered.length === 0 ? (
            <div style={{padding:'60px 20px', textAlign:'center', color:'var(--text-3)'}}>
              <div style={{marginBottom:10, opacity:.4}}>
                <Icon name="archive" size={32}/>
              </div>
              <div style={{fontSize:13, marginBottom:4}}>
                {tasks.length === 0 ? 'Nothing archived yet' : 'No matches'}
              </div>
              <div style={{fontSize:11, fontFamily:'var(--mono)'}}>
                {tasks.length === 0
                  ? 'Use the archive button in the Done column to archive completed tasks.'
                  : 'Try a different search or filter.'}
              </div>
            </div>
          ) : grouped.map(([bucket, rows]) => (
            <section key={bucket} style={{marginBottom:8}}>
              <header style={{
                padding:'8px 20px 4px', fontSize:10, fontWeight:600,
                letterSpacing:'.1em', textTransform:'uppercase',
                color:'var(--text-3)', position:'sticky', top:0,
                background:'var(--bg-1)', zIndex:1,
                display:'flex', alignItems:'center', gap:8,
              }}>
                {bucket}
                <span style={{fontFamily:'var(--mono)', letterSpacing:0, textTransform:'none',
                  color:'var(--text-3)', fontWeight:400}}>· {rows.length}</span>
              </header>
              {rows.map(t => (
                <ArchiveRow key={t.id} task={t}
                  selected={selected.has(t.id)}
                  onToggle={() => toggle(t.id)}
                  onRestore={() => onRestore(t.id)}
                  onDelete={() => {
                    if (confirm(`Delete "${t.title}" permanently?`)) onDelete([t.id]);
                  }}
                  onOpen={() => onOpenTask(t.id)}/>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function ArchiveRow({ task, selected, onToggle, onRestore, onDelete, onOpen }) {
  const archivedAgo = task.archivedAt
    ? fmtRelative(Date.now() - task.archivedAt)
    : '—';
  return (
    <div style={{
      padding:'10px 20px', display:'flex', alignItems:'center', gap:12,
      borderBottom:'1px solid var(--border)',
      background: selected ? 'var(--accent-soft)' : 'transparent',
      cursor:'default', transition:'background .1s',
    }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'var(--bg-2)'; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}>

      <input type="checkbox" checked={selected} onChange={onToggle}
        style={{cursor:'pointer', accentColor:'var(--emerald)'}}/>

      <span style={{fontSize:11, fontFamily:'var(--mono)', color:'var(--text-3)',
        width:30, flexShrink:0}}>#{task.index}</span>

      <div style={{flex:1, minWidth:0, cursor:'pointer'}} onClick={onOpen}>
        <div style={{fontSize:13, color:'var(--text-0)', fontWeight:500,
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
          marginBottom:2}}>
          {task.title}
        </div>
        <div style={{display:'flex', alignItems:'center', gap:10, fontSize:11,
          color:'var(--text-3)', fontFamily:'var(--mono)'}}>
          {task.branch && (
            <span style={{display:'flex', alignItems:'center', gap:4}}>
              <Icon name="git" size={10}/> {task.branch.replace('zibby/','')}
            </span>
          )}
          {task.prUrl && (
            <span style={{color:'var(--emerald)'}}>PR #{task.prUrl.split('/').pop()}</span>
          )}
          {task.tokens && (
            <span>↑{(task.tokens.in/1000).toFixed(1)}k ↓{(task.tokens.out/1000).toFixed(1)}k</span>
          )}
        </div>
      </div>

      <StatusPill status={task.status}/>

      <span style={{fontSize:11, fontFamily:'var(--mono)', color:'var(--text-3)',
        width:80, textAlign:'right', flexShrink:0}}>
        {archivedAgo}
      </span>

      <div style={{display:'flex', gap:4}}>
        <button onClick={onRestore} title="Restore to Done"
          style={rowBtn}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,.15)'; e.currentTarget.style.color='var(--emerald)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color='var(--text-3)'; }}>
          <Icon name="arrowRight" size={12}/>
        </button>
        <button onClick={onDelete} title="Delete permanently"
          style={rowBtn}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(244,63,94,.15)'; e.currentTarget.style.color='var(--rose)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color='var(--text-3)'; }}>
          <Icon name="trash" size={12}/>
        </button>
      </div>
    </div>
  );
}

const rowBtn = {
  display:'flex', alignItems:'center', justifyContent:'center',
  width:26, height:26, background:'transparent',
  border:'1px solid var(--border)', borderRadius:5,
  color:'var(--text-3)', cursor:'pointer',
  transition:'background .12s, color .12s',
};

function fmtRelative(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(Date.now() - ms).toLocaleDateString();
}

window.ArchiveModal = ArchiveModal;
