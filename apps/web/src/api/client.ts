import type { CreateJobDto } from 'shared-types';

const BASE_URL = import.meta.env['VITE_API_URL'] ?? '';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}/api${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${init?.method ?? 'GET'} ${path} failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  createJob: (input: CreateJobDto) =>
    apiFetch<{ id: string; status: string; prompt: string; directory: string; createdAt: string }>('/jobs', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  listJobs: () => apiFetch<unknown[]>('/jobs'),
  getJob: (id: string) => apiFetch<unknown>(`/jobs/${id}`),
  getSubtask: (id: string) => apiFetch<unknown>(`/subtasks/${id}`),
};
