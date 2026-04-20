import { useState, useEffect } from 'react';
import { useJobs } from './hooks/useJobs';
import { useJob } from './hooks/useJob';
import { JobForm } from './components/JobForm';
import { StatusBadge } from './components/StatusBadge';
import { SubtaskCard } from './components/SubtaskCard';

function JobDetail({ jobId, onBack }: { jobId: string; onBack: () => void }) {
  const { data: job, isLoading } = useJob(jobId);

  if (isLoading || !job) return <p className="text-gray-500 text-sm">Loading...</p>;

  const j = job as {
    id: string; prompt: string; status: string; error?: string;
    subtasks?: Array<{ id: string; title: string; spec: string; acceptanceCriteria: string; status: string; branch: string | null; prUrl: string | null; error: string | null; order: number }>;
  };

  const prCount = j.subtasks?.filter((s) => s.status === 'PR_CREATED').length ?? 0;
  const total = j.subtasks?.length ?? 0;

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-blue-600 text-sm underline">← Back</button>
      <div className="bg-white border rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between">
          <StatusBadge status={j.status} />
          <span className="text-xs text-gray-500">{prCount}/{total} PRs created</span>
        </div>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{j.prompt}</p>
        {j.error && <p className="text-red-600 text-xs">{j.error}</p>}
      </div>
      <div className="space-y-3">
        {j.subtasks?.sort((a, b) => a.order - b.order).map((s) => (
          <SubtaskCard key={s.id} subtask={s} />
        ))}
      </div>
    </div>
  );
}

function JobList({ onSelect }: { onSelect: (id: string) => void }) {
  const { data: jobs, isLoading } = useJobs();

  if (isLoading) return <p className="text-gray-500 text-sm">Loading jobs...</p>;
  if (!jobs?.length) return <p className="text-gray-400 text-sm">No jobs yet. Submit one above.</p>;

  const list = jobs as Array<{
    id: string; prompt: string; status: string; createdAt: string;
    subtasks?: Array<{ status: string }>;
  }>;

  return (
    <div className="space-y-2">
      {list.map((job) => {
        const prCount = job.subtasks?.filter((s) => s.status === 'PR_CREATED').length ?? 0;
        const total = job.subtasks?.length ?? 0;
        return (
          <button
            key={job.id}
            onClick={() => onSelect(job.id)}
            className="w-full text-left border rounded-lg p-3 bg-white hover:border-blue-400 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-gray-800 line-clamp-2">{job.prompt}</p>
              <StatusBadge status={job.status} />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-gray-400">{new Date(job.createdAt).toLocaleString()}</span>
              {total > 0 && (
                <span className="text-xs text-gray-500">{prCount}/{total} PRs</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const jobId = params.get('jobId');

  const selectJob = (id: string) => {
    window.history.pushState({}, '', `?jobId=${id}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const goBack = () => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const handler = () => setTick((n) => n + 1);
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  void tick;
  const currentJobId = new URLSearchParams(window.location.search).get('jobId');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900">Agent Orchestrator</h1>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {currentJobId ? (
          <JobDetail jobId={currentJobId} onBack={goBack} />
        ) : (
          <>
            <section>
              <h2 className="text-sm font-medium text-gray-700 mb-2">New Job</h2>
              <JobForm />
            </section>
            <section>
              <h2 className="text-sm font-medium text-gray-700 mb-2">Jobs</h2>
              <JobList onSelect={selectJob} />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
