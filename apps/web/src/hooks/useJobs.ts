import type { CreateJobDto } from 'shared-types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export function useJobs() {
  return useQuery({ queryKey: ['jobs'], queryFn: () => api.listJobs(), refetchInterval: 5_000 });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateJobDto) => api.createJob(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  });
}
