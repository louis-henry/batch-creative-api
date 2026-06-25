import type { ItemFailure, ItemResult, JobStatus } from '@app/contracts';
import type { JobStore } from '../../application/ports/jobStore.js';

/**
 * Process-local job store. Sufficient for this scale; the JobStore port lets it
 * be swapped for Redis/Upstash without touching application logic.
 */
export function createInMemoryJobStore(): JobStore {
  const jobs = new Map<
    string,
    { status: JobStatus; succeeded: ItemResult[]; failed: ItemFailure[] }
  >();

  const require = (jobId: string): NonNullable<ReturnType<typeof jobs.get>> => {
    const job = jobs.get(jobId);
    if (!job) throw new Error(`unknown job: ${jobId}`);
    return job;
  };

  return {
    create(jobId) {
      jobs.set(jobId, { status: 'pending', succeeded: [], failed: [] });
    },
    get(jobId) {
      const job = jobs.get(jobId);
      return job ? { jobId, ...job } : undefined;
    },
    addSuccess(jobId, item) {
      require(jobId).succeeded.push(item);
    },
    addFailure(jobId, failure) {
      require(jobId).failed.push(failure);
    },
    setStatus(jobId, status) {
      require(jobId).status = status;
    },
  };
}
