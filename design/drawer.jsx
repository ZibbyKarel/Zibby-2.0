/* global React */
const { useState: drS, useEffect: drE, useMemo: drM, useRef: drR } = React;

// ──────────────────────────────────────────────
// Task Detail Drawer with tabs: Logs / Diff / Details
// ──────────────────────────────────────────────
function TaskDrawer({ task, open, onClose, onRun, tab, setTab, runtimeMs }) {
  drE(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '1') setTab('logs');
      if (e.key === '2') setTab('diff');
      if (e.key === '3') setTab('details');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, setTab]);

  if (!task) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:50,
          opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
          transition:'opacity .18s',
        }}
      />
      <aside style={{
        position:'fixed', top:0, right:0, bottom:0, width: 'min(720px, 92vw)',
        background:'var(--bg-1)', borderLeft:'1px solid var(--border)',
        zIndex:51, display:'flex', flexDirection:'column',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition:'transform .22s cubic-bezier(.2,.7,.3,1)',
        boxShadow:'var(--shadow-2)',
      }}>
        {/* Header */}
        <header style={{padding:'14px 18px 12px', borderBottom:'1px solid var(--border)'}}>
          <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:8}}>
            <span style={{fontSize:11, fontFamily:'var(--mono)', color:'var(--text-3)'}}>#{task.index}</span>
            <StatusPill status={task.status}/>
            {task.status === 'running' && runtimeMs != null && (
              <span style={{fontSize:11, fontFamily:'var(--mono)', color:'var(--emerald)'}}>
                {fmtDuration(runtimeMs)}
              </span>
            )}
            <div style={{flex:1}}/>
            <Btn icon="play" variant="primary" size="sm" onClick={onRun}>Run</Btn>
            <Btn icon="x" variant="ghost" size="sm" onClick={onClose}/>
          </div>
          <h2 style={{margin:'2px 0 6px', fontSize:18, fontWeight:600, letterSpacing:'-.01em'}}>
            {task.title}
          </h2>
          <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
            {task.branch && <Chip icon="git">{task.branch}</Chip>}
            {task.prUrl && <Chip icon="github" tone="accent">PR #{task.prUrl.split('/').pop()}</Chip>}
            {task.model && <Chip icon="sparkle" tone="violet">{task.model}</Chip>}
            {task.tokens && <Chip icon="bolt">↑{fmtNum(task.tokens.in)} ↓{fmtNum(task.tokens.out)}</Chip>}
          </div>
        </header>

        {/* Tabs */}
        <nav style={{display:'flex', gap:2, padding:'0 12px', borderBottom:'1px solid var(--border)',
          background:'var(--bg-1)'}}>
          {[
            { k:'logs', label:'Logs', icon:'terminal', badge: task.logs?.length || null },
            { k:'diff', label:'Diff', icon:'diff', badge: task.diff?.length || null },
            { k:'details', label:'Details', icon:'edit', badge: null },
          ].map(t => (
            <button key={t.k} onClick={() => setTab(t.k)}
              style={{
                display:'inline-flex', alignItems:'center', gap:6,
                padding:'10px 12px', fontSize:12, fontWeight:500,
                background:'transparent', border:'none', cursor:'pointer',
                color: tab === t.k ? 'var(--text-0)' : 'var(--text-2)',
                borderBottom: tab === t.k ? '2px solid var(--emerald)' : '2px solid transparent',
                marginBottom:-1,
              }}>
              <Icon name={t.icon} size={13}/>
              {t.label}
              {t.badge != null && (
                <span style={{fontFamily:'var(--mono)', fontSize:10, color:'var(--text-3)',
                  background:'var(--bg-3)', padding:'1px 6px', borderRadius:999}}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div style={{flex:1, overflow:'auto'}}>
          {tab === 'logs' && <LogsView task={task}/>}
          {tab === 'diff' && <DiffView diff={task.diff}/>}
          {tab === 'details' && <DetailsView task={task}/>}
        </div>
      </aside>
    </>
  );
}

function LogsView({ task }) {
  const ref = drR(null);
  drE(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [task.logs?.length]);

  if (!task.logs || task.logs.length === 0) {
    return (
      <div style={{padding:40, textAlign:'center', color:'var(--text-3)', fontSize:12}}>
        <Icon name="terminal" size={28}/>
        <p style={{marginTop:8}}>No logs yet. Run this task to stream output.</p>
      </div>
    );
  }
  return (
    <pre ref={ref} style={{
      margin:0, padding:'14px 18px', fontSize:12, lineHeight:1.55,
      fontFamily:'var(--mono)', color:'var(--text-1)',
      whiteSpace:'pre-wrap', wordBreak:'break-word',
      background:'var(--bg-0)',
    }}>
      {task.logs.map((l, i) => {
        const color =
          l.s === 'err' ? 'var(--rose)'
          : l.s === 'info' ? 'var(--sky)'
          : 'var(--text-1)';
        const prefix =
          l.s === 'err' ? '✗ '
          : l.s === 'info' ? ''
          : '  ';
        return (
          <div key={i} style={{color, display:'flex', gap:8}}>
            <span style={{color:'var(--text-3)', userSelect:'none', minWidth:24, textAlign:'right'}}>
              {String(i+1).padStart(3, ' ')}
            </span>
            <span style={{flex:1}}>{prefix}{l.l}</span>
          </div>
        );
      })}
      {task.status === 'running' && <div className="caret" style={{color:'var(--emerald)'}}/>}
    </pre>
  );
}

function DiffView({ diff }) {
  if (!diff || diff.length === 0) {
    return (
      <div style={{padding:40, textAlign:'center', color:'var(--text-3)', fontSize:12}}>
        <Icon name="diff" size={28}/>
        <p style={{marginTop:8}}>No diff available. The task hasn't produced changes yet.</p>
      </div>
    );
  }
  return (
    <div style={{padding:14}}>
      {diff.map((f, i) => (
        <DiffFile key={i} file={f}/>
      ))}
    </div>
  );
}

function DiffFile({ file }) {
  const [open, setOpen] = drS(true);
  return (
    <div style={{border:'1px solid var(--border)', borderRadius:8, marginBottom:10, overflow:'hidden'}}>
      <button onClick={() => setOpen(o => !o)}
        style={{
          width:'100%', display:'flex', alignItems:'center', gap:8,
          padding:'8px 12px', background:'var(--bg-2)', border:'none',
          cursor:'pointer', color:'var(--text-0)', fontSize:12,
          fontFamily:'var(--mono)', textAlign:'left',
        }}>
        <span style={{transform: open ? 'rotate(90deg)' : 'none', transition:'transform .1s'}}>
          <Icon name="chevron" size={12}/>
        </span>
        <span style={{flex:1}}>{file.file}</span>
        <span style={{color:'var(--emerald)', fontSize:11}}>+{file.add}</span>
        <span style={{color:'var(--rose)', fontSize:11}}>−{file.del}</span>
      </button>
      {open && (
        <div style={{background:'var(--bg-0)', fontSize:12, fontFamily:'var(--mono)', lineHeight:1.55,
          padding:'6px 0'}}>
          {file.lines.map((line, i) => {
            const bg = line.t === 'add' ? 'rgba(16,185,129,.08)'
                     : line.t === 'del' ? 'rgba(244,63,94,.08)'
                     : 'transparent';
            const color = line.t === 'add' ? 'var(--emerald)'
                        : line.t === 'del' ? 'var(--rose)'
                        : line.t === 'hunk' ? 'var(--sky)'
                        : 'var(--text-1)';
            const gutter = line.t === 'add' ? '+'
                         : line.t === 'del' ? '−'
                         : line.t === 'hunk' ? ' '
                         : ' ';
            return (
              <div key={i} style={{display:'flex', background:bg, color}}>
                <span style={{userSelect:'none', color:'var(--text-3)', width:24, textAlign:'center'}}>{gutter}</span>
                <span style={{flex:1, paddingRight:12, whiteSpace:'pre-wrap', wordBreak:'break-all'}}>{line.l}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DetailsView({ task }) {
  return (
    <div style={{padding:18, display:'flex', flexDirection:'column', gap:18}}>
      <Section label="Description">
        <p style={{margin:0, fontSize:13, color:'var(--text-1)', lineHeight:1.6, whiteSpace:'pre-wrap'}}>
          {task.description}
        </p>
      </Section>

      {task.acceptance?.length > 0 && (
        <Section label="Acceptance criteria">
          <ul style={{margin:0, padding:0, listStyle:'none', display:'flex', flexDirection:'column', gap:8}}>
            {task.acceptance.map((a, i) => (
              <li key={i} style={{display:'flex', gap:8, alignItems:'flex-start',
                fontSize:13, color:'var(--text-1)', lineHeight:1.5}}>
                <span style={{
                  width:16, height:16, borderRadius:4, background:'var(--bg-3)',
                  border:'1px solid var(--border-2)', display:'flex',
                  alignItems:'center', justifyContent:'center', marginTop:1, flexShrink:0,
                  color: task.status === 'done' ? 'var(--emerald)' : 'var(--text-3)',
                }}>
                  {task.status === 'done' && <Icon name="check" size={10} stroke={2.5}/>}
                </span>
                {a}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {task.affectedFiles?.length > 0 && (
        <Section label="Affected files">
          <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
            {task.affectedFiles.map((f, i) => (
              <code key={i} style={{
                fontSize:12, padding:'3px 8px', background:'var(--bg-3)',
                color:'var(--text-1)', borderRadius:5, fontFamily:'var(--mono)',
                border:'1px solid var(--border)',
              }}>{f}</code>
            ))}
          </div>
        </Section>
      )}

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
        <KV k="Model" v={task.model || 'sonnet (default)'}/>
        <KV k="Branch" v={task.branch || '—'} mono/>
        <KV k="Status" v={task.status}/>
        <KV k="Tokens" v={task.tokens ? `↑${fmtNum(task.tokens.in)}  ↓${fmtNum(task.tokens.out)}` : '—'} mono/>
      </div>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div>
      <h3 style={{margin:'0 0 8px', fontSize:10, fontWeight:600,
        color:'var(--text-3)', letterSpacing:'.12em', textTransform:'uppercase'}}>{label}</h3>
      {children}
    </div>
  );
}
function KV({ k, v, mono }) {
  return (
    <div style={{padding:'8px 10px', border:'1px solid var(--border)', borderRadius:8,
      background:'var(--bg-2)'}}>
      <div style={{fontSize:10, color:'var(--text-3)', letterSpacing:'.1em',
        textTransform:'uppercase', marginBottom:2}}>{k}</div>
      <div style={{fontSize:12, color:'var(--text-0)',
        fontFamily: mono ? 'var(--mono)' : 'var(--sans)'}}>{v}</div>
    </div>
  );
}

Object.assign(window, { TaskDrawer });
