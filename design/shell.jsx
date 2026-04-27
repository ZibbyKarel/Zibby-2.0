/* global React */
const { useState: shS, useEffect: shE, useMemo: shM, useRef: shR } = React;

// ──────────────────────────────────────────────
// Add Task Dialog
// ──────────────────────────────────────────────
function AddTaskDialog({ open, onClose, onAdd, allTasks = [], folder }) {
  const [title, setTitle] = shS('');
  const [description, setDescription] = shS('');
  const [acceptance, setAcceptance] = shS('');
  const [waitsOn, setWaitsOn] = shS([]);
  const [planModel, setPlanModel] = shS('opus-4.5');
  const [codeModel, setCodeModel] = shS('sonnet-4.5');
  const [qaModel, setQaModel] = shS('sonnet-4.5');
  const [planThink, setPlanThink] = shS('high');
  const [codeThink, setCodeThink] = shS('medium');
  const [qaThink, setQaThink] = shS('medium');
  const [humanReview, setHumanReview] = shS(true);
  // Tree visibility persists across dialog opens — so users who rely on drag&drop
  // keep it on, and users who prefer a wider textarea keep it off.
  const [showTree, setShowTree] = shS(() => {
    try { return localStorage.getItem('zb.addTask.showTree') !== '0'; }
    catch { return true; }
  });
  shE(() => {
    try { localStorage.setItem('zb.addTask.showTree', showTree ? '1' : '0'); }
    catch { /* noop */ }
  }, [showTree]);

  shE(() => {
    if (open) {
      setTitle(''); setDescription(''); setAcceptance(''); setWaitsOn([]);
      setPlanModel('opus-4.5'); setCodeModel('sonnet-4.5'); setQaModel('sonnet-4.5');
      setPlanThink('high'); setCodeThink('medium'); setQaThink('medium');
      setHumanReview(true);
    }
  }, [open]);

  shE(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const canAdd = description.trim().length > 0;

  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:60,
      display:'flex', alignItems:'center', justifyContent:'center',
      animation:'fade-in .14s ease',
    }}>
      <div onClick={(e)=>e.stopPropagation()} style={{
        width:'min(820px, 96vw)', maxHeight:'92vh',
        background:'var(--bg-1)', border:'1px solid var(--border-2)',
        borderRadius:14, padding:20, boxShadow:'var(--shadow-2)',
        animation:'slide-up .2s ease',
        display:'flex', flexDirection:'column', minHeight:0,
      }}>
        <header style={{display:'flex', alignItems:'center', gap:10, marginBottom:16}}>
          <div style={{
            width:32, height:32, borderRadius:8, background:'var(--accent-soft)',
            display:'flex', alignItems:'center', justifyContent:'center', color:'var(--emerald)',
          }}>
            <Icon name="plus" size={16}/>
          </div>
          <h2 style={{margin:0, fontSize:15, fontWeight:600}}>New task</h2>
          <div style={{flex:1}}/>
          <button onClick={onClose} style={{background:'transparent', border:'none',
            color:'var(--text-3)', cursor:'pointer', padding:4, borderRadius:4, display:'flex'}}>
            <Icon name="x" size={16}/>
          </button>
        </header>

        <div style={{display:'flex', flexDirection:'column', gap:14,
          overflowY:'auto', flex:1, minHeight:0, paddingRight:4, margin:'0 -4px 0 0'}}>
          <Field label="Title" hint="optional — we'll infer one from the description if empty">
            <input autoFocus value={title} onChange={e=>setTitle(e.target.value)}
              placeholder="What should the agent do?"
              style={inputStyle}/>
          </Field>

          <Field label="Description / brief" required
            hint={showTree
              ? "drag files from the tree — they'll be inserted as @/path references"
              : "click the tree icon to show the file tree"}>
            <div style={{display:'grid',
              gridTemplateColumns: showTree ? '1fr 240px' : '1fr auto', gap:10,
              alignItems:'stretch'}}>
              <DescriptionInput value={description} onChange={setDescription}/>
              {showTree ? (
                <FileTreePanel folder={folder} onHide={() => setShowTree(false)}/>
              ) : (
                <button onClick={() => setShowTree(true)}
                  title="Show file tree"
                  style={{
                    display:'flex', alignItems:'center', justifyContent:'center',
                    width:32, background:'var(--bg-2)',
                    border:'1px solid var(--border)', borderRadius:8,
                    color:'var(--text-3)', cursor:'pointer',
                    transition:'color .12s, background .12s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = 'var(--emerald)';
                    e.currentTarget.style.background = 'var(--bg-3)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = 'var(--text-3)';
                    e.currentTarget.style.background = 'var(--bg-2)';
                  }}>
                  <Icon name="folder" size={14}/>
                </button>
              )}
            </div>
          </Field>

          <Field label="Acceptance criteria" hint="one per line, optional">
            <textarea value={acceptance} onChange={e=>setAcceptance(e.target.value)}
              placeholder="Column drag works&#10;Counts are correct&#10;Persists to localStorage"
              rows={3} style={{...inputStyle, resize:'vertical'}}/>
          </Field>

          <Field label="Blocked by" hint="task will wait until dependencies finish">
            <BlockedByPicker allTasks={allTasks} value={waitsOn} onChange={setWaitsOn}/>
          </Field>

          <Field label="Review">
            <label style={{
              display:'flex', alignItems:'flex-start', gap:10,
              padding:'10px 12px', background:'var(--bg-2)',
              border:`1px solid ${humanReview ? 'var(--emerald)' : 'var(--border)'}`,
              borderRadius:8, cursor:'pointer',
              transition:'border-color .12s, background .12s',
            }}>
              <input type="checkbox" checked={humanReview}
                onChange={e => setHumanReview(e.target.checked)}
                style={{
                  marginTop:2, width:14, height:14, accentColor:'var(--emerald)',
                  cursor:'pointer', flexShrink:0,
                }}/>
              <div style={{display:'flex', flexDirection:'column', gap:2, flex:1}}>
                <span style={{fontSize:12, fontWeight:500, color:'var(--text-0)',
                  display:'flex', alignItems:'center', gap:6}}>
                  Human review required
                  {humanReview && (
                    <span style={{
                      fontSize:9, fontWeight:600, letterSpacing:'.08em',
                      textTransform:'uppercase',
                      padding:'1px 6px', borderRadius:3,
                      background:'var(--accent-soft)', color:'var(--emerald)',
                      fontFamily:'var(--mono)',
                    }}>default</span>
                  )}
                </span>
                <span style={{fontSize:11, color:'var(--text-3)'}}>
                  Pause before merging so you can sign off on the agent's work.
                </span>
              </div>
            </label>
          </Field>

          <Field label="Agents" hint="pick the model and thinking depth for each phase">
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8}}>
              <ModelPick label="Plan" icon="sparkle"
                model={planModel} onModelChange={setPlanModel}
                think={planThink} onThinkChange={setPlanThink}/>
              <ModelPick label="Code" icon="code"
                model={codeModel} onModelChange={setCodeModel}
                think={codeThink} onThinkChange={setCodeThink}/>
              <ModelPick label="QA" icon="check"
                model={qaModel} onModelChange={setQaModel}
                think={qaThink} onThinkChange={setQaThink}/>
            </div>
          </Field>
        </div>

        <footer style={{display:'flex', alignItems:'center', justifyContent:'flex-end',
          gap:8, marginTop:18, paddingTop:14, borderTop:'1px solid var(--border)'}}>
          <div style={{display:'flex', gap:8}}>
            <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" icon="check" onClick={() => canAdd && onAdd({
              title:title.trim(), description:description.trim(),
              acceptance: acceptance.split('\n').map(s=>s.trim()).filter(Boolean),
              waitsOn,
              humanReview,
              agents: {
                plan: { model: planModel, thinking: planThink },
                code: { model: codeModel, thinking: codeThink },
                qa:   { model: qaModel,   thinking: qaThink   },
              },
              model: codeModel,
            })} disabled={!canAdd}>
              Add task
            </Btn>
          </div>
        </footer>
      </div>
    </div>
  );
}

const inputStyle = {
  width:'100%', padding:'8px 10px', background:'var(--bg-2)',
  border:'1px solid var(--border)', borderRadius:8, color:'var(--text-0)',
  fontSize:13, outline:'none', transition:'border-color .12s, box-shadow .12s',
};

function Field({ label, hint, required, children }) {
  return (
    <label style={{display:'flex', flexDirection:'column', gap:6}}>
      <span style={{fontSize:11, fontWeight:500, color:'var(--text-2)',
        letterSpacing:'.04em', display:'flex', gap:6, alignItems:'center'}}>
        {label}{required && <span style={{color:'var(--emerald)'}}>*</span>}
        {hint && <span style={{color:'var(--text-3)', fontWeight:400, fontStyle:'italic'}}>· {hint}</span>}
      </span>
      {children}
    </label>
  );
}

// ──────────────────────────────────────────────
// Description input + File tree with drag-drop
// ──────────────────────────────────────────────

// Textarea that accepts files dropped from the FileTree and inserts their
// @/path reference at the caret position (or appends if the textarea isn't
// focused). Shows a drop overlay while dragging.
function DescriptionInput({ value, onChange }) {
  const ref = shR(null);
  const [over, setOver] = shS(false);

  const insertAtCaret = (text) => {
    const el = ref.current;
    if (!el) { onChange(value + text); return; }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const before = value.slice(0, start);
    const after = value.slice(end);
    // Ensure a space before the ref when inserting mid-sentence
    const needsSpaceBefore = before.length && !/\s$/.test(before);
    const needsSpaceAfter = after.length && !/^\s/.test(after);
    const inserted = (needsSpaceBefore ? ' ' : '') + text + (needsSpaceAfter ? ' ' : '');
    const next = before + inserted + after;
    onChange(next);
    // Restore caret after inserted text
    requestAnimationFrame(() => {
      el.focus();
      const pos = before.length + inserted.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const onDragOver = (e) => {
    // Accept either our custom type or generic text (plain-text fallback)
    if (e.dataTransfer.types.includes('application/x-zibby-path') ||
        e.dataTransfer.types.includes('text/plain')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setOver(true);
    }
  };
  const onDragLeave = () => setOver(false);
  const onDrop = (e) => {
    e.preventDefault();
    setOver(false);
    const path = e.dataTransfer.getData('application/x-zibby-path')
              || e.dataTransfer.getData('text/plain');
    if (path && path.startsWith('@/')) insertAtCaret(path);
  };

  return (
    <div style={{position:'relative', display:'flex', minHeight:170}}>
      <textarea ref={ref} value={value} onChange={e => onChange(e.target.value)}
        onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
        placeholder="Describe the work. Drag a file or folder from the tree → it'll be inserted as @/path/to/file."
        style={{...inputStyle, resize:'vertical', flex:1, minHeight:170,
          outline: over ? '2px dashed var(--emerald)' : undefined,
          outlineOffset: over ? -3 : undefined}}/>
      {over && (
        <div style={{
          position:'absolute', inset:0, pointerEvents:'none',
          background:'var(--accent-soft)', borderRadius:8,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:12, color:'var(--emerald)', fontWeight:500,
          fontFamily:'var(--mono)',
        }}>
          drop to insert @/path
        </div>
      )}
    </div>
  );
}

// Lightweight file tree rendered in a scrollable panel next to the
// description textarea. Each node is draggable; dropping into the textarea
// inserts "@/relative/path". Folders expand/collapse.
// A search input filters nodes by substring on name OR full path; matching
// nodes (and their ancestor directories, so the path stays visible) are kept,
// and matched substrings are highlighted. Ancestors of matches auto-expand.
function FileTreePanel({ folder, onHide }) {
  const tree = folder?.tree || [];
  const [query, setQuery] = shS('');
  const q = query.trim().toLowerCase();

  // Recursively filter: keep a file if its name/path contains q; keep a dir
  // if it matches OR any descendant matches (descendants are then filtered).
  const filter = (nodes, parentPath) => {
    const out = [];
    for (const n of nodes) {
      const full = parentPath ? `${parentPath}/${n.name}` : n.name;
      const selfMatch = !q
        || n.name.toLowerCase().includes(q)
        || full.toLowerCase().includes(q);
      if (n.type === 'dir') {
        const kids = n.children ? filter(n.children, full) : [];
        if (selfMatch || kids.length > 0) {
          out.push({ ...n, children: selfMatch ? (n.children || []) : kids });
        }
      } else if (selfMatch) {
        out.push(n);
      }
    }
    return out;
  };
  const filtered = q ? filter(tree, '') : tree;

  // Count matching files (leaves) so the header can show a result count
  const countFiles = (nodes) => {
    let c = 0;
    for (const n of nodes) {
      if (n.type === 'dir') c += countFiles(n.children || []);
      else c += 1;
    }
    return c;
  };
  const matchCount = q ? countFiles(filtered) : null;

  return (
    <div style={{
      background:'var(--bg-2)', border:'1px solid var(--border)',
      borderRadius:8, display:'flex', flexDirection:'column',
      overflow:'hidden', minHeight:170,
    }}>
      <div style={{
        padding:'6px 10px', fontSize:10, fontWeight:600, letterSpacing:'.1em',
        textTransform:'uppercase', color:'var(--text-3)',
        borderBottom:'1px solid var(--border)',
        display:'flex', alignItems:'center', gap:6,
        background:'var(--bg-1)',
      }}>
        <Icon name="folder" size={11}/>
        <span style={{flex:1, fontFamily:'var(--mono)', textTransform:'none',
          letterSpacing:0, color:'var(--text-2)', fontSize:10,
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
          {folder?.name || 'project'}
        </span>
        <span style={{fontSize:9, color:'var(--text-3)'}} title="Drag to insert">⇢</span>
        {onHide && (
          <button onClick={onHide} title="Hide file tree"
            style={{
              background:'transparent', border:'none', color:'var(--text-3)',
              cursor:'pointer', padding:2, borderRadius:4, display:'flex',
              marginLeft:2,
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-1)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}>
            <Icon name="x" size={11}/>
          </button>
        )}
      </div>

      {/* Search bar — substring match on name or path. Clear button appears
          when there's a query. */}
      <div style={{
        padding:'6px 8px', borderBottom:'1px solid var(--border)',
        position:'relative', display:'flex', alignItems:'center', gap:6,
        background:'var(--bg-1)',
      }}>
        <span style={{position:'absolute', left:16, color:'var(--text-3)',
          display:'flex', pointerEvents:'none'}}>
          <Icon name="search" size={11}/>
        </span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Filter files…"
          spellCheck={false}
          style={{
            flex:1, padding:'5px 24px 5px 26px',
            background:'var(--bg-2)', border:'1px solid var(--border)',
            borderRadius:6, color:'var(--text-0)',
            fontSize:11, outline:'none', fontFamily:'var(--mono)',
          }}/>
        {query && (
          <button onClick={() => setQuery('')} title="Clear"
            style={{
              position:'absolute', right:12, background:'transparent',
              border:'none', color:'var(--text-3)', cursor:'pointer',
              padding:2, borderRadius:4, display:'flex',
            }}>
            <Icon name="x" size={10}/>
          </button>
        )}
      </div>

      {/* Result count (only while searching) */}
      {q && (
        <div style={{
          padding:'4px 10px', fontSize:10, color:'var(--text-3)',
          fontFamily:'var(--mono)', borderBottom:'1px solid var(--border)',
          background:'var(--bg-1)',
        }}>
          {matchCount} {matchCount === 1 ? 'match' : 'matches'}
        </div>
      )}

      <div style={{flex:1, overflowY:'auto', padding:'6px 4px', fontSize:12,
        fontFamily:'var(--mono)'}}>
        {filtered.length === 0
          ? <div style={{padding:'8px 10px', color:'var(--text-3)', fontStyle:'italic'}}>
              {q ? `No matches for "${query}"` : 'No folder opened.'}
            </div>
          : filtered.map((n, i) => (
            <TreeNode key={n.name + i} node={n} path="" depth={0} query={q}/>
          ))}
      </div>
    </div>
  );
}

// Highlight occurrences of `q` (lowercase) inside `text` using the accent color.
// Case-insensitive; preserves original casing of the text.
function highlightMatch(text, q) {
  if (!q) return text;
  const lower = text.toLowerCase();
  const out = [];
  let i = 0;
  while (i < text.length) {
    const at = lower.indexOf(q, i);
    if (at === -1) { out.push(text.slice(i)); break; }
    if (at > i) out.push(text.slice(i, at));
    out.push(
      <mark key={at} style={{
        background:'var(--accent-soft)', color:'var(--emerald)',
        padding:0, borderRadius:2, fontWeight:600,
      }}>{text.slice(at, at + q.length)}</mark>
    );
    i = at + q.length;
  }
  return out;
}

function TreeNode({ node, path, depth, query }) {
  // When searching, force-expand so matches stay visible; otherwise default
  // to open at the first level and closed below.
  const [openState, setOpen] = shS(depth < 1);
  const open = query ? true : openState;
  const fullPath = path ? `${path}/${node.name}` : node.name;
  const ref = `@/${fullPath}`;
  const isDir = node.type === 'dir';

  const onDragStart = (e) => {
    // Custom type to detect drops from our own tree; text/plain for fallback
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/x-zibby-path', ref);
    e.dataTransfer.setData('text/plain', ref);
    // Improve drag preview with just the ref text
    try {
      const ghost = document.createElement('div');
      ghost.textContent = ref;
      ghost.style.cssText = 'position:absolute;top:-9999px;left:-9999px;' +
        'padding:4px 8px;background:#0f1114;color:#10b981;' +
        'font:12px "JetBrains Mono",monospace;border:1px solid #10b981;' +
        'border-radius:6px;';
      document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, 0, 0);
      setTimeout(() => document.body.removeChild(ghost), 0);
    } catch { /* noop */ }
  };

  return (
    <>
      <div draggable onDragStart={onDragStart}
        onClick={() => isDir && !query && setOpen(o => !o)}
        title={`Drag to insert ${ref}`}
        style={{
          display:'flex', alignItems:'center', gap:4,
          padding:`2px 6px 2px ${6 + depth * 12}px`,
          borderRadius:4, cursor: isDir ? 'pointer' : 'grab',
          color: isDir ? 'var(--text-1)' : 'var(--text-2)',
          userSelect:'none',
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-3)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
        {isDir ? (
          <span style={{display:'flex', width:10, color:'var(--text-3)',
            transform: open ? 'rotate(90deg)' : 'rotate(0)', transition:'transform .1s'}}>
            <Icon name="chevronRight" size={10}/>
          </span>
        ) : (
          <span style={{width:10}}/>
        )}
        <span style={{display:'flex', color: isDir ? 'var(--amber)' : 'var(--text-3)'}}>
          <Icon name={isDir ? 'folder' : 'file'} size={11}/>
        </span>
        <span style={{flex:1, overflow:'hidden', textOverflow:'ellipsis',
          whiteSpace:'nowrap'}}>{highlightMatch(node.name, query)}</span>
      </div>
      {isDir && open && node.children && node.children.map((c, i) => (
        <TreeNode key={c.name + i} node={c} path={fullPath} depth={depth + 1} query={query}/>
      ))}
    </>
  );
}

// ──────────────────────────────────────────────
// removable chips + a dropdown of remaining candidates. Only open/pending/running
// tasks make sense as dependencies; done/failed/cancelled are filtered out.
function BlockedByPicker({ allTasks, value, onChange }) {
  const candidates = allTasks.filter(t =>
    !['done','failed','cancelled'].includes(t.status) && !value.includes(t.id));
  const selected = value.map(id => allTasks.find(t => t.id === id)).filter(Boolean);
  const [pick, setPick] = shS('');

  const add = (id) => {
    if (!id) return;
    onChange([...value, id]);
    setPick('');
  };
  const remove = (id) => onChange(value.filter(v => v !== id));

  if (allTasks.length === 0) {
    return (
      <div style={{
        padding:'10px 12px', background:'var(--bg-2)', borderRadius:8,
        border:'1px dashed var(--border-2)',
        fontSize:12, color:'var(--text-3)', fontStyle:'italic',
      }}>
        No other tasks to depend on yet.
      </div>
    );
  }

  return (
    <div style={{display:'flex', flexDirection:'column', gap:8}}>
      {selected.length > 0 && (
        <div style={{display:'flex', flexWrap:'wrap', gap:6}}>
          {selected.map(t => (
            <span key={t.id} style={{
              display:'inline-flex', alignItems:'center', gap:6,
              padding:'3px 4px 3px 8px',
              background:'var(--bg-2)', border:'1px solid var(--border-2)',
              borderRadius:999, fontSize:11, color:'var(--text-1)',
              fontFamily:'var(--mono)', maxWidth:260,
            }}>
              <StatusDot status={t.status}/>
              <span style={{color:'var(--text-3)'}}>#{t.index}</span>
              <span style={{overflow:'hidden', textOverflow:'ellipsis',
                whiteSpace:'nowrap', fontFamily:'var(--sans)'}}>
                {t.title}
              </span>
              <button onClick={() => remove(t.id)} aria-label="Remove dependency"
                style={{
                  background:'transparent', border:'none', color:'var(--text-3)',
                  cursor:'pointer', padding:3, borderRadius:4, display:'flex',
                }}>
                <Icon name="x" size={10}/>
              </button>
            </span>
          ))}
        </div>
      )}

      {candidates.length > 0 ? (
        <div style={{position:'relative'}}>
          <select value={pick} onChange={e => add(e.target.value)}
            style={{
              width:'100%', appearance:'none', WebkitAppearance:'none',
              padding:'7px 28px 7px 10px',
              background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:8,
              color: pick ? 'var(--text-0)' : 'var(--text-3)',
              fontSize:12, outline:'none', fontFamily:'inherit', cursor:'pointer',
            }}>
            <option value="">
              {selected.length ? '+ Add another dependency…' : 'Select a task this depends on…'}
            </option>
            {candidates.map(t => (
              <option key={t.id} value={t.id}>
                #{t.index} · {t.title} ({t.status})
              </option>
            ))}
          </select>
          <div style={{position:'absolute', right:10, top:'50%',
            transform:'translateY(-50%)', pointerEvents:'none',
            color:'var(--text-3)', display:'flex'}}>
            <Icon name="chevronDown" size={12}/>
          </div>
        </div>
      ) : (
        <div style={{fontSize:11, color:'var(--text-3)', fontStyle:'italic'}}>
          All available tasks added as dependencies.
        </div>
      )}
    </div>
  );
}

// tiny status dot for the blocked-by chips
function StatusDot({ status }) {
  const color = {
    running:'var(--emerald)', pending:'var(--amber)', blocked:'var(--rose)',
    queued:'var(--amber)', pushing:'var(--emerald)',
    done:'var(--sky)', failed:'var(--rose)', cancelled:'var(--text-3)',
  }[status] || 'var(--text-3)';
  return (
    <span style={{
      width:6, height:6, borderRadius:6, background:color, flexShrink:0,
      boxShadow: status === 'running' ? `0 0 0 2px ${color}22` : 'none',
    }}/>
  );
}

// Model picker — card with phase label + icon + dropdown.
// Used in the AddTaskDialog to configure a different model per agent phase.
const MODEL_CATALOG = [
  { v:'opus-4.5',   name:'Opus 4.5',   tag:'reasoning',  cost:'$$$' },
  { v:'sonnet-4.5', name:'Sonnet 4.5', tag:'balanced',   cost:'$$' },
  { v:'sonnet-3.7', name:'Sonnet 3.7', tag:'balanced',   cost:'$$' },
  { v:'haiku-4.5',  name:'Haiku 4.5',  tag:'fast',       cost:'$' },
  { v:'gpt-5',      name:'GPT-5',      tag:'reasoning',  cost:'$$$' },
  { v:'gemini-2.5', name:'Gemini 2.5', tag:'balanced',   cost:'$$' },
];

function ModelPick({ label, icon, model, onModelChange, think, onThinkChange }) {
  const selected = MODEL_CATALOG.find(m => m.v === model) || MODEL_CATALOG[1];
  const thinkLevels = [
    { v:'off',    label:'Off',  dots:0, color:'var(--text-3)' },
    { v:'low',    label:'Low',  dots:1, color:'var(--sky)' },
    { v:'medium', label:'Med',  dots:2, color:'var(--amber)' },
    { v:'high',   label:'High', dots:3, color:'var(--emerald)' },
  ];
  const activeThink = thinkLevels.find(l => l.v === think) || thinkLevels[2];
  return (
    <div style={{
      background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:8,
      padding:'8px 10px', display:'flex', flexDirection:'column', gap:7, minWidth:0,
    }}>
      <div style={{display:'flex', alignItems:'center', gap:6,
        fontSize:10, fontWeight:600, letterSpacing:'.1em',
        textTransform:'uppercase', color:'var(--text-3)'}}>
        <Icon name={icon} size={11}/>{label}
      </div>

      {/* Model select */}
      <div style={{position:'relative'}}>
        <select value={model} onChange={e => onModelChange(e.target.value)}
          style={{
            width:'100%', appearance:'none', WebkitAppearance:'none',
            padding:'5px 22px 5px 8px',
            background:'var(--bg-1)', border:'1px solid var(--border)', borderRadius:6,
            color:'var(--text-0)', fontSize:12, fontWeight:500, outline:'none',
            fontFamily:'inherit', cursor:'pointer',
          }}>
          {MODEL_CATALOG.map(m => (
            <option key={m.v} value={m.v}>{m.name}</option>
          ))}
        </select>
        <div style={{position:'absolute', right:6, top:'50%', transform:'translateY(-50%)',
          pointerEvents:'none', color:'var(--text-3)', display:'flex'}}>
          <Icon name="chevronDown" size={11}/>
        </div>
      </div>

      {/* Thinking level */}
      <div>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between',
          fontSize:9, letterSpacing:'.08em', textTransform:'uppercase',
          color:'var(--text-3)', marginBottom:4}}>
          <span style={{display:'flex', alignItems:'center', gap:4}}>
            <Icon name="sparkle" size={9}/>Thinking
          </span>
          <span style={{fontFamily:'var(--mono)', color: activeThink.color, fontWeight:600,
            textTransform:'none', letterSpacing:0}}>
            {activeThink.label}
          </span>
        </div>
        <div style={{display:'flex', gap:3}}>
          {thinkLevels.map(lvl => {
            const active = lvl.v === think;
            return (
              <button key={lvl.v} onClick={() => onThinkChange(lvl.v)}
                title={`Thinking: ${lvl.label}`}
                style={{
                  flex:1, height:20, padding:0,
                  background: active ? 'var(--bg-1)' : 'transparent',
                  border: '1px solid',
                  borderColor: active ? lvl.color : 'var(--border)',
                  boxShadow: active ? `0 0 0 1px ${lvl.color}22 inset` : 'none',
                  borderRadius:5, cursor:'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:2,
                  transition:'all .12s',
                }}>
                {lvl.dots === 0 ? (
                  <span style={{fontSize:9, color: active ? lvl.color : 'var(--text-3)',
                    fontWeight:600}}>∅</span>
                ) : (
                  Array.from({length: lvl.dots}).map((_, i) => (
                    <span key={i} style={{
                      width:3, height:3, borderRadius:3,
                      background: active ? lvl.color : 'var(--text-3)',
                      opacity: active ? 1 : 0.5,
                    }}/>
                  ))
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center',
        fontSize:10, fontFamily:'var(--mono)', color:'var(--text-3)'}}>
        <span>{selected.tag}</span>
        <span>{selected.cost}</span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Command Palette (⌘K)
// ──────────────────────────────────────────────
function CommandPalette({ open, onClose, commands }) {
  const [q, setQ] = shS('');
  const [i, setI] = shS(0);
  const inputRef = shR(null);

  shE(() => {
    if (open) { setQ(''); setI(0); setTimeout(() => inputRef.current?.focus(), 10); }
  }, [open]);

  const matches = shM(() => {
    const ql = q.toLowerCase();
    return commands.filter(c => !ql || c.label.toLowerCase().includes(ql) ||
      c.hint?.toLowerCase().includes(ql));
  }, [q, commands]);

  shE(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') { e.preventDefault(); setI(v => Math.min(v+1, matches.length-1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setI(v => Math.max(v-1, 0)); }
      if (e.key === 'Enter') { e.preventDefault(); matches[i]?.run(); onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, matches, i, onClose]);

  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:70,
      display:'flex', alignItems:'flex-start', justifyContent:'center',
      paddingTop:'12vh', animation:'fade-in .12s ease',
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:'min(560px, 94vw)', background:'var(--bg-1)',
        border:'1px solid var(--border-2)', borderRadius:12,
        boxShadow:'var(--shadow-2)', overflow:'hidden',
        animation:'slide-up .15s ease',
      }}>
        <div style={{display:'flex', alignItems:'center', gap:10, padding:'12px 14px',
          borderBottom:'1px solid var(--border)'}}>
          <Icon name="search" size={16}/>
          <input ref={inputRef} value={q} onChange={e => { setQ(e.target.value); setI(0); }}
            placeholder="Type a command or search tasks…"
            style={{flex:1, background:'transparent', border:'none', color:'var(--text-0)',
              fontSize:14, outline:'none'}}/>
          <kbd style={kbd}>esc</kbd>
        </div>
        <div style={{maxHeight:360, overflowY:'auto', padding:6}}>
          {matches.length === 0 && (
            <div style={{padding:24, textAlign:'center', color:'var(--text-3)', fontSize:12}}>
              No commands match "{q}"
            </div>
          )}
          {matches.map((c, idx) => (
            <button key={c.id} onMouseEnter={() => setI(idx)}
              onClick={() => { c.run(); onClose(); }}
              style={{
                width:'100%', display:'flex', alignItems:'center', gap:10,
                padding:'8px 10px', background: idx === i ? 'var(--bg-3)' : 'transparent',
                border:'none', borderRadius:6, cursor:'pointer', textAlign:'left',
                color: 'var(--text-0)', fontSize:13,
              }}>
              <span style={{width:20, display:'flex', alignItems:'center', justifyContent:'center',
                color:'var(--text-2)'}}>
                <Icon name={c.icon || 'chevron'} size={14}/>
              </span>
              <span style={{flex:1}}>{c.label}</span>
              {c.hint && <span style={{fontSize:11, color:'var(--text-3)'}}>{c.hint}</span>}
              {c.kbd && <kbd style={kbd}>{c.kbd}</kbd>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
const kbd = {
  fontFamily:'var(--mono)', fontSize:10, padding:'2px 6px',
  background:'var(--bg-3)', border:'1px solid var(--border)', borderRadius:4,
  color:'var(--text-2)',
};

// ──────────────────────────────────────────────
// Toast notifications
// ──────────────────────────────────────────────
function Toasts({ toasts, onDismiss }) {
  return (
    <div style={{position:'fixed', top:16, right:16, zIndex:80, display:'flex',
      flexDirection:'column', gap:8, pointerEvents:'none'}}>
      {toasts.map(t => (
        <div key={t.id} style={{
          pointerEvents:'auto', minWidth:280,
          background:'var(--bg-1)', border:'1px solid var(--border-2)',
          borderLeft: `3px solid ${t.kind === 'done' ? 'var(--emerald)' : t.kind === 'failed' ? 'var(--rose)' : 'var(--sky)'}`,
          borderRadius:10, padding:'10px 12px', boxShadow:'var(--shadow-2)',
          display:'flex', alignItems:'flex-start', gap:10,
          animation:'slide-up .2s ease',
        }}>
          <div style={{color: t.kind === 'done' ? 'var(--emerald)' : t.kind === 'failed' ? 'var(--rose)' : 'var(--sky)',
            marginTop:1}}>
            <Icon name={t.kind === 'done' ? 'check' : t.kind === 'failed' ? 'warn' : 'bell'} size={15}/>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:12, fontWeight:600, color:'var(--text-0)'}}>{t.title}</div>
            {t.desc && <div style={{fontSize:11, color:'var(--text-2)', marginTop:2}}>{t.desc}</div>}
          </div>
          <button onClick={() => onDismiss(t.id)}
            style={{background:'transparent', border:'none', color:'var(--text-3)',
              cursor:'pointer', padding:2, display:'flex'}}>
            <Icon name="x" size={12}/>
          </button>
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────
// Usage Panel (top-right)
// ──────────────────────────────────────────────
function UsagePanel({ usage, tick }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:14,
      padding:'8px 12px', background:'var(--bg-1)',
      border:'1px solid var(--border)', borderRadius:10,
    }}>
      <UsageMini label="5H" pct={usage.fiveHour.usedPct}
        resets={usage.fiveHour.resetsInMs - tick}/>
      <div style={{width:1, height:30, background:'var(--border)'}}/>
      <UsageMini label="WEEK" pct={usage.weekly.usedPct}
        resets={usage.weekly.resetsInMs - tick}/>
    </div>
  );
}
function UsageMini({ label, pct, resets }) {
  return (
    <div style={{display:'flex', alignItems:'center', gap:8}}>
      <UsageRing pct={pct} size={34} stroke={3}/>
      <div style={{display:'flex', flexDirection:'column', gap:1}}>
        <span style={{fontSize:9, letterSpacing:'.14em', fontWeight:600,
          color:'var(--text-3)'}}>{label}</span>
        <span style={{fontSize:10, fontFamily:'var(--mono)', color:'var(--text-1)'}}>
          −{fmtCountdown(Math.max(0, resets))}
        </span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Dependency Mini-graph
// ──────────────────────────────────────────────
function DependencyGraph({ tasks, onClickTask }) {
  if (!tasks?.length) return null;
  const deps = [];
  tasks.forEach(t => t.waitsOn?.forEach(dep => deps.push({ from: dep, to: t.index })));
  if (deps.length === 0) return null;

  const cols = [0, 0, 0];
  const place = {};
  tasks.forEach(t => {
    const depth = Math.min(2, Math.max(0, (t.waitsOn?.length || 0)));
    place[t.index] = { col: depth, row: cols[depth]++ };
  });

  const W = 520, H = 80, CW = W / 3;
  return (
    <div style={{
      padding:12, background:'var(--bg-1)', border:'1px solid var(--border)',
      borderRadius:10, overflow:'hidden',
    }}>
      <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:8}}>
        <Icon name="graph" size={12}/>
        <span style={{fontSize:10, fontWeight:600, letterSpacing:'.12em',
          textTransform:'uppercase', color:'var(--text-2)'}}>Dependencies</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%', height:H, display:'block'}}>
        {deps.map((d, i) => {
          const a = place[d.from], b = place[d.to];
          if (!a || !b) return null;
          const x1 = a.col * CW + 50, y1 = 20 + a.row * 24;
          const x2 = b.col * CW + 50, y2 = 20 + b.row * 24;
          return <path key={i} d={`M${x1} ${y1} C${(x1+x2)/2} ${y1}, ${(x1+x2)/2} ${y2}, ${x2} ${y2}`}
            stroke="var(--border-2)" fill="none" strokeWidth="1"/>;
        })}
        {tasks.map(t => {
          const p = place[t.index];
          const x = p.col * CW + 50, y = 20 + p.row * 24;
          const color = t.status === 'done' ? 'var(--emerald)'
                      : t.status === 'running' ? 'var(--emerald)'
                      : t.status === 'failed' ? 'var(--rose)'
                      : 'var(--text-3)';
          return (
            <g key={t.index} style={{cursor:'pointer'}} onClick={() => onClickTask?.(t)}>
              <circle cx={x} cy={y} r="5" fill={color}
                style={{ filter: t.status === 'running' ? 'drop-shadow(0 0 4px var(--emerald))' : 'none' }}/>
              <text x={x + 10} y={y + 3} fontSize="10" fill="var(--text-2)"
                fontFamily="var(--mono)">
                #{t.index} {t.title.slice(0, 22)}{t.title.length > 22 ? '…' : ''}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

Object.assign(window, { AddTaskDialog, CommandPalette, Toasts, UsagePanel, DependencyGraph });
