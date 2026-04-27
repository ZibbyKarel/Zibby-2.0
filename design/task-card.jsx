/* global React */
const { useState: tdS, useEffect: tdE, useRef: tdR, useMemo: tdM } = React;

// ──────────────────────────────────────────────
// Task Card (kanban item)
// ──────────────────────────────────────────────
function TaskCard({ task, onOpen, onRun, onEdit, onDelete, onPreview, onApprove, onReject, dragHandlers, isDragging, runtimeMs }) {
  const waits = task.waitsOn?.length > 0;
  const canRun = task.status === 'pending' || task.status === 'failed' || task.status === 'queued';
  const inReview = task.status === 'review';
  return (
    <article
      {...dragHandlers}
      onClick={onOpen}
      style={{
        background: 'var(--bg-2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: 12,
        cursor: 'pointer',
        transition: 'border-color .12s, transform .12s, box-shadow .12s',
        opacity: isDragging ? 0.4 : 1,
        position: 'relative',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      {task.status === 'running' && (
        <div style={{position:'absolute', top:0, left:0, right:0, height:2, borderRadius:'10px 10px 0 0',
          overflow:'hidden'}}>
          <div className="shimmer-bar" style={{height:'100%', width:'100%'}}/>
        </div>
      )}

      <header style={{display:'flex', alignItems:'flex-start', gap:8, marginBottom:8}}>
        <span style={{fontSize:11, fontFamily:'var(--mono)', color:'var(--text-3)', marginTop:2}}>
          #{task.index}
        </span>
        <h3 style={{margin:0, fontSize:13, fontWeight:600, color:'var(--text-0)',
          lineHeight:1.35, flex:1, letterSpacing:'-.005em'}}>
          {task.title}
        </h3>
        <button onClick={(e)=>{e.stopPropagation(); onEdit();}}
          style={{background:'transparent', border:'none', color:'var(--text-3)', cursor:'pointer',
            padding:2, borderRadius:4, display:'flex'}}
          onMouseEnter={e => e.currentTarget.style.color='var(--text-0)'}
          onMouseLeave={e => e.currentTarget.style.color='var(--text-3)'}
          title="More">
          <Icon name="more" size={14}/>
        </button>
      </header>

      {task.description && (
        <p style={{margin:'0 0 10px', fontSize:12, color:'var(--text-2)', lineHeight:1.5,
          display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical',
          overflow:'hidden'}}>
          {task.description}
        </p>
      )}

      {/* chips row */}
      <div style={{display:'flex', flexWrap:'wrap', gap:5, marginBottom:10}}>
        {task.branch && <Chip icon="git">{task.branch.replace('zibby/','')}</Chip>}
        {task.prUrl && <Chip icon="github" tone="accent">PR #{task.prUrl.split('/').pop()}</Chip>}
        {task.model && <Chip icon="sparkle" tone="violet">{task.model}</Chip>}
        {waits && <Chip icon="clock" tone="warn">waits #{task.waitsOn.join(', #')}</Chip>}
      </div>

      {/* footer: meta + actions */}
      <footer style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:8}}>
        <div style={{display:'flex', alignItems:'center', gap:10, fontSize:11,
          fontFamily:'var(--mono)', color:'var(--text-3)'}}>
          {task.status === 'running' && runtimeMs != null && (
            <span style={{color:'var(--emerald)', display:'flex', alignItems:'center', gap:4}}>
              <span className="dot-running"/> {fmtDuration(runtimeMs)}
            </span>
          )}
          {task.status === 'done' && task.endedAt && task.startedAt && (
            <span style={{display:'flex', alignItems:'center', gap:4}}>
              <Icon name="check" size={11}/> {fmtDuration(task.endedAt - task.startedAt)}
            </span>
          )}
          {task.status === 'failed' && task.endedAt && task.startedAt && (
            <span style={{color:'var(--rose)', display:'flex', alignItems:'center', gap:4}}>
              <Icon name="warn" size={11}/> {fmtDuration(task.endedAt - task.startedAt)}
            </span>
          )}
          {task.tokens && (
            <span title="tokens in / out">
              ↑{(task.tokens.in/1000).toFixed(1)}k ↓{(task.tokens.out/1000).toFixed(1)}k
            </span>
          )}
        </div>

        <StatusPill status={task.status}/>
      </footer>

      {inReview && (
        <div onClick={e => e.stopPropagation()}
          style={{
            marginTop:10, paddingTop:10, borderTop:'1px solid var(--border)',
            display:'flex', gap:6, alignItems:'center',
          }}>
          <button onClick={onPreview}
            title="Run app on this branch so you can review it manually"
            style={{
              flex:1, display:'inline-flex', alignItems:'center', justifyContent:'center',
              gap:6, padding:'7px 10px',
              background:'rgba(167,139,250,.12)',
              border:'1px solid rgba(167,139,250,.35)',
              color:'var(--violet)', borderRadius:6,
              fontSize:12, fontWeight:600, cursor:'pointer',
              transition:'background .12s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(167,139,250,.22)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(167,139,250,.12)'}>
            <Icon name="play" size={12}/> Run preview
          </button>
          <button onClick={onApprove} title="Approve → Done"
            style={{
              display:'flex', alignItems:'center', justifyContent:'center',
              width:30, height:30, background:'transparent',
              border:'1px solid var(--border)', borderRadius:6,
              color:'var(--emerald)', cursor:'pointer',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,.12)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <Icon name="check" size={13}/>
          </button>
          <button onClick={onReject} title="Send back to queue"
            style={{
              display:'flex', alignItems:'center', justifyContent:'center',
              width:30, height:30, background:'transparent',
              border:'1px solid var(--border)', borderRadius:6,
              color:'var(--rose)', cursor:'pointer',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(244,63,94,.12)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <Icon name="x" size={13}/>
          </button>
        </div>
      )}

      {canRun && (
        <button
          onClick={(e)=>{e.stopPropagation(); onRun();}}
          style={{
            position:'absolute', inset:0, borderRadius:'var(--radius)',
            background:'transparent', border:'none', cursor:'pointer',
            pointerEvents:'none',
          }}
          aria-hidden
        />
      )}
    </article>
  );
}

// ──────────────────────────────────────────────
// Kanban Column
// ──────────────────────────────────────────────
function Column({ title, count, accent, tasks, onDropTask, children, id, headerAction }) {
  const [hover, setHover] = tdS(false);
  return (
    <section
      onDragOver={(e) => { e.preventDefault(); setHover(true); }}
      onDragLeave={() => setHover(false)}
      onDrop={(e) => {
        setHover(false);
        const id = e.dataTransfer.getData('text/task-id');
        if (id) onDropTask?.(id);
      }}
      style={{
        flex:1, minWidth:280,
        background:'var(--bg-1)',
        border:'1px solid var(--border)',
        borderRadius:12, padding:12,
        display:'flex', flexDirection:'column',
        gap:10, minHeight:420,
        transition:'background .12s, border-color .12s',
        ...(hover ? { background:'var(--bg-2)', borderColor: accent } : {}),
      }}
      data-col={id}
    >
      <header style={{display:'flex', alignItems:'center', gap:8, padding:'2px 4px'}}>
        <span style={{width:7, height:7, borderRadius:'50%', background:accent}}/>
        <h2 style={{margin:0, fontSize:12, fontWeight:600, color:'var(--text-1)',
          letterSpacing:'.08em', textTransform:'uppercase'}}>{title}</h2>
        <span style={{fontSize:11, fontFamily:'var(--mono)', color:'var(--text-3)',
          background:'var(--bg-3)', padding:'1px 7px', borderRadius:999}}>
          {count}
        </span>
        <div style={{flex:1}}/>
        {headerAction}
      </header>
      <div style={{display:'flex', flexDirection:'column', gap:8, flex:1}}>
        {children}
        {tasks?.length === 0 && (
          <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center',
            color:'var(--text-3)', fontSize:11, fontStyle:'italic', padding:'20px 10px',
            border:'1px dashed var(--border)', borderRadius:8, minHeight:80}}>
            drop tasks here
          </div>
        )}
      </div>
    </section>
  );
}

Object.assign(window, { TaskCard, Column });
