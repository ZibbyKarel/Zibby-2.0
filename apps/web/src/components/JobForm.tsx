import { useState } from 'react';
import { useCreateJob } from '../hooks/useJobs';

export function JobForm() {
  const [prompt, setPrompt] = useState('');
  const { mutate, isPending, error } = useCreateJob();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    mutate(prompt.trim(), { onSuccess: () => setPrompt('') });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
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
