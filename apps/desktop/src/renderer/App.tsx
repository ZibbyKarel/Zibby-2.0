export default function App() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight">Zibby 2.0</h1>
        <p className="text-neutral-400">
          Preload bridge v{window.zibby?.version ?? '—'} · Electron + React + Vite + Tailwind 4
        </p>
      </div>
    </div>
  );
}
