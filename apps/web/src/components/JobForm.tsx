import { useId, useState } from 'react';
import { useCreateJob } from '../hooks/useJobs';

const DIRECTORY_SUGGESTIONS = [
  { value: '.', label: 'Repository root' },
  { value: 'apps/web', label: 'apps/web' },
  { value: 'apps/api', label: 'apps/api' },
  { value: 'libs', label: 'libs' },
  { value: 'docs', label: 'docs' },
] as const;

export function JobForm() {
  const directorySuggestionsId = useId();
  const [prompt, setPrompt] = useState('');
  const [directory, setDirectory] = useState('apps/web');
  const { mutate, isPending, error } = useCreateJob();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    mutate(
      { prompt: prompt.trim(), directory },
      { onSuccess: () => setPrompt('') },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block space-y-1">
        <span className="text-sm font-medium text-gray-700">Execution directory</span>
        <input
          type="text"
          list={directorySuggestionsId}
          className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={directory}
          onChange={(e) => setDirectory(e.target.value)}
          disabled={isPending}
          placeholder="/Users/you/project or apps/web"
          spellCheck={false}
        />
        <datalist id={directorySuggestionsId}>
          {DIRECTORY_SUGGESTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </datalist>
        <p className="text-xs text-gray-500">Enter an absolute path on this machine or a path relative to the repo root.</p>
      </label>
      <textarea
        className="w-full border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
        placeholder="Describe what needs to be done overnight..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={isPending}
      />
      {error && <p className="text-red-600 text-sm">{String(error)}</p>}
      <button
        type="submit"
        disabled={isPending || !prompt.trim()}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
      >
        {isPending ? 'Submitting...' : 'Submit Job'}
      </button>
    </form>
  );
}
