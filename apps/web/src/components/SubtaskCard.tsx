import { useState } from 'react';
import { StatusBadge } from './StatusBadge';
import { LogTail } from './LogTail';

interface SubtaskCardProps {
  subtask: {
    id: string;
    title: string;
    spec: string;
    acceptanceCriteria: string; // JSON-encoded
    status: string;
    branch: string | null;
    prUrl: string | null;
    error: string | null;
  };
}

export function SubtaskCard({ subtask }: SubtaskCardProps) {
  const [expanded, setExpanded] = useState(false);

  let criteria: string[] = [];
  try { criteria = JSON.parse(subtask.acceptanceCriteria) as string[]; } catch { /* noop */ }

  const isActive = ['RUNNING', 'PUSHING'].includes(subtask.status);

  return (
    <div className="border rounded-lg p-4 space-y-2 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-sm">{subtask.title}</span>
        <StatusBadge status={subtask.status} />
      </div>

      {subtask.prUrl && (
        <a href={subtask.prUrl} target="_blank" rel="noreferrer" className="text-blue-600 text-xs underline">
          View PR →
        </a>
      )}

      {subtask.error && (
        <p className="text-red-600 text-xs bg-red-50 rounded p-2">{subtask.error}</p>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-gray-500 underline"
      >
        {expanded ? 'Hide details' : 'Show details'}
      </button>

      {expanded && (
        <div className="space-y-3 pt-2 border-t">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Specification</p>
            <p className="text-xs text-gray-700 whitespace-pre-wrap">{subtask.spec}</p>
          </div>
          {criteria.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Acceptance Criteria</p>
              <ol className="list-decimal list-inside space-y-1">
                {criteria.map((c, i) => (
                  <li key={i} className="text-xs text-gray-700">{c}</li>
                ))}
              </ol>
            </div>
          )}
          {(isActive || subtask.status === 'FAILED') && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Live Logs</p>
              <LogTail subtaskId={subtask.id} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
