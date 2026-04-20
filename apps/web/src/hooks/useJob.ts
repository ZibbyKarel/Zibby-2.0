import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export function useJob(id: string | null) {
  return useQuery({
    queryKey: ['job', id],
    queryFn: () => api.getJob(id!),
    enabled: !!id,
    refetchInterval: 3_000,
  });
}
