import React, { useEffect, useState } from 'react';
import { Icon } from './icons';
import { Btn } from './primitives';

type NewTask = {
  title: string;
  description: string;
  acceptance: string[];
  model?: string;
};

type Props = {
  open: boolean;
  folderPath: string | null;
  onClose: () => void;
  onAdd: (data: NewTask) => void;
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px',
  background: 'var(--bg-2)', border: '1px solid var(--border)',
  borderRadius: 8, color: 'var(--text-0)', fontSize: 13,
  outline: 'none', transition: 'border-color .12s',
};

export function AddTaskDialog({ open, folderPath, onClose, onAdd }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [acceptance, setAcceptance] = useState('');
  const [model, setModel] = useState('');
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setTitle(''); setDescription(''); setAcceptance(''); setModel(''); setRefining(false); setRefineError(null); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const canAdd = description.trim().length > 0 && !refining;

  const handleRefine = async () => {
    if (!description.trim()) return;
    setRefining(true);
    setRefineError(null);
    try {
      const result = await window.zibby.refineStory({
        folderPath: folderPath ?? '.',
        title: title.trim() || description.split(' ').slice(0, 6).join(' '),
        description: description.trim(),
      });
      if (result.kind === 'ok') {
        const s = result.story;
        if (!title.trim()) setTitle(s.title);
        setDescription(s.description);
        setAcceptance(s.acceptanceCriteria.join('\n'));
      } else {
        setRefineError(result.message);
      }
    } catch (err) {
      setRefineError(String(err));
    } finally {
      setRefining(false);
    }
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
          {refineError && (
            <div style={{ fontSize: 12, color: 'var(--rose)', background: 'rgba(244,63,94,.08)', border: '1px solid rgba(244,63,94,.2)', borderRadius: 6, padding: '8px 10px' }}>
              {refineError}
            </div>
          )}
        </div>

        <footer style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          <Btn icon="sparkle" variant="outline" onClick={() => void handleRefine()} disabled={refining || !description.trim()}>
            {refining ? 'Refining…' : 'Refine with Opus'}
          </Btn>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" icon="check" disabled={!canAdd} onClick={() => canAdd && onAdd({
              title: title.trim() || description.trim().split(' ').slice(0, 6).join(' '),
              description: description.trim(),
              acceptance: acceptance.split('\n').map((s) => s.trim()).filter(Boolean),
              model: model || undefined,
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
