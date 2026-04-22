import { useState } from 'react';
import type { PickFolderResult } from '@zibby/shared-types';

export default function App() {
  const [selection, setSelection] = useState<PickFolderResult | null>(null);
  const [picking, setPicking] = useState(false);

  const handlePick = async () => {
    setPicking(true);
    try {
      const result = await window.zibby.pickFolder();
      setSelection(result);
    } finally {
      setPicking(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-8">
      <div className="max-w-xl w-full space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-semibold tracking-tight">Zibby 2.0</h1>
          <p className="text-neutral-400 text-sm">
            Preload bridge v{window.zibby?.version ?? '—'} · Electron + React + Vite + Tailwind 4
          </p>
        </div>

        <button
          onClick={handlePick}
          disabled={picking}
          className="px-5 py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium transition-colors"
        >
          {picking ? 'Opening…' : 'Select folder'}
        </button>

        {selection && <SelectionSummary result={selection} />}
      </div>
    </div>
  );
}

function SelectionSummary({ result }: { result: PickFolderResult }) {
  if (result.kind === 'cancelled') {
    return <p className="text-neutral-500 text-sm">No folder selected.</p>;
  }
  return (
    <div className="text-left bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-1 text-sm">
      <div>
        <span className="text-neutral-500">Path: </span>
        <span className="font-mono text-neutral-200">{result.path}</span>
      </div>
      <div className="flex gap-3">
        <Badge ok={result.isGitRepo} label={result.isGitRepo ? 'Git repo' : 'Not a git repo'} />
        <Badge
          ok={result.hasOrigin}
          label={result.hasOrigin ? 'Has origin remote' : 'No origin remote'}
        />
      </div>
    </div>
  );
}

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${
        ok ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'
      }`}
    >
      {label}
    </span>
  );
}
