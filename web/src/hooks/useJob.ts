import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { BatchResult } from '@app/contracts';
import { fetchJob } from '@/lib/api';

const POLL_MS = 1200;

/** Polls the job until it reaches a terminal `done` status, then stops. */
export function useJob(jobId: string | null): UseQueryResult<BatchResult> {
  return useQuery({
    queryKey: ['job', jobId],
    queryFn: () => fetchJob(jobId ?? ''),
    enabled: jobId !== null,
    // Keep polling through transient errors (a blip recovers; the UI shows a
    // banner meanwhile) and stop only once the job is terminally done.
    refetchInterval: (query) => (query.state.data?.status === 'done' ? false : POLL_MS),
  });
}
