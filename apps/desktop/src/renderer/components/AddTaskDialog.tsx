import React, { useEffect, useState } from 'react';
import { Icon } from './icons';
import { Btn } from './primitives';

type NewTask = {
  title: string;
  description: string;
  acceptance: string[];
  model?: string;
  attachedFilePaths: string[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  onAdd: (data: NewTask) => void;
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px',
  background: 'var(--bg-2)', border: '1px solid var(--border)',
  borderRadius: 8, color: 'var(--text-0)', fontSize: 13,
  outline: 'none', transition: 'border-color .12s',
};

function basename(p: string): string {
  const idx = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'));
  return idx >= 0 ? p.slice(idx + 1) : p;
}

export function AddTaskDialog({ open, onClose, onAdd }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [acceptance, setAcceptance] = useState('');
  const [model, setModel] = useState('');
  const [attachedFilePaths, setAttachedFilePaths] = useState<string[]>([]);
  const [pickError, setPickError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle(''); setDescription(''); setAcceptance(''); setModel('');
      setAttachedFilePaths([]); setPickError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const canAdd = description.trim().length > 0;

  const pickFiles = async () => {
    setPickError(null);
    try {
      const result = await window.nightcoder.pickFilesToAttach();
      if (result.kind === 'cancelled') return;
      setAttachedFilePaths((prev) => {
        const seen = new Set(prev);
        const next = [...prev];
        for (const p of result.paths) {
          if (!seen.has(p)) { next.push(p); seen.add(p); }
        }
        return next;
      });
    } catch (err) {
      setPickError(err instanceof Error ? err.message : String(err));
    }
  };

  const removeFile = (path: string) => {
    setAttachedFilePaths((prev) => prev.filter((p) => p !== path));
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 60,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fade-in .14s ease',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 'min(560px, 94vw)', background: 'var(--bg-1)',
        border: '1px solid var(--border-2)', borderRadius: 14, padding: 20,
        boxShadow: 'var(--shadow-2)', animation: 'slide-up .2s ease',
      }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--emerald)' }}>
            <Icon name="plus" size={16} />
          </div>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>New task</h2>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 4, borderRadius: 4, display: 'flex' }}>
            <Icon name="x" size={16} />
          </button>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Title" hint="optional">
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="What should the agent do?" style={inputStyle} />
          </Field>
          <Field label="Description / brief" required>
            <textarea autoFocus value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the work. Refine will expand this into a user story."
              rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
          </Field>
          <Field label="Acceptance criteria" hint="one per line, optional">
            <textarea value={acceptance} onChange={(e) => setAcceptance(e.target.value)}
              placeholder={"Column drag works\nCounts are correct"}
              rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </Field>
          <Field label="Model">
            <select value={model} onChange={(e) => setModel(e.target.value)} style={{ ...inputStyle, height: 32 }}>
              <option value="">Default (sonnet)</option>
              <option value="sonnet">Sonnet</option>
              <option value="opus">Opus</option>
              <option value="haiku">Haiku</option>
            </select>
          </Field>
          <Field label="Attached files" hint="shared with the agent as context">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {attachedFilePaths.length > 0 && (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {attachedFilePaths.map((p) => (
                    <li key={p} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 8px', background: 'var(--bg-2)',
                      border: '1px solid var(--border)', borderRadius: 6,
                    }}>
                      <Icon name="file" size={13} />
                      <span
                        title={p}
                        style={{
                          flex: 1, fontSize: 12, fontFamily: 'var(--mono)',
                          color: 'var(--text-1)', overflow: 'hidden',
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
                        }}
                      >
                        {basename(p)}
                      </span>
                      <button
                        onClick={() => removeFile(p)}
                        title="Remove"
                        style={{
                          background: 'transparent', border: 'none',
                          color: 'var(--text-3)', cursor: 'pointer',
                          padding: 2, display: 'flex',
                        }}
                      >
                        <Icon name="x" size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div>
                <Btn icon="paperclip" variant="secondary" size="sm" onClick={() => void pickFiles()}>
                  Attach files
                </Btn>
              </div>
              {pickError && (
                <div style={{ fontSize: 11, color: 'var(--rose)' }}>{pickError}</div>
              )}
            </div>
          </Field>
        </div>

        <footer style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" icon="check" disabled={!canAdd} onClick={() => canAdd && onAdd({
              title: title.trim() || description.trim().split(' ').slice(0, 6).join(' '),
              description: description.trim(),
              acceptance: acceptance.split('\n').map((s) => s.trim()).filter(Boolean),
              model: model || undefined,
              attachedFilePaths,
            })}>
              Add task
            </Btn>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-2)', letterSpacing: '.04em', display: 'flex', gap: 6, alignItems: 'center' }}>
        {label}{required && <span style={{ color: 'var(--emerald)' }}>*</span>}
        {hint && <span style={{ color: 'var(--text-3)', fontWeight: 400, fontStyle: 'italic' }}>· {hint}</span>}
      </span>
      {children}
    </label>
  );
}
