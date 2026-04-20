const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  DECOMPOSING: 'bg-blue-100 text-blue-700 animate-pulse',
  RUNNING: 'bg-blue-100 text-blue-700 animate-pulse',
  PUSHING: 'bg-purple-100 text-purple-700 animate-pulse',
  PR_CREATED: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-green-100 text-green-700',
  PARTIALLY_COMPLETED: 'bg-yellow-100 text-yellow-700',
  QUEUED: 'bg-gray-100 text-gray-500',
  FAILED: 'bg-red-100 text-red-700',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}
