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

  const mustGet = (jobId: string): NonNullable<ReturnType<typeof jobs.get>> => {
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
      // Copy the arrays so a polling caller gets a stable snapshot, not a live
      // reference that grows as the batch keeps writing.
      return job
        ? { jobId, status: job.status, succeeded: [...job.succeeded], failed: [...job.failed] }
        : undefined;
    },
    addSuccess(jobId, item) {
      mustGet(jobId).succeeded.push(item);
    },
    addFailure(jobId, failure) {
      mustGet(jobId).failed.push(failure);
    },
    setStatus(jobId, status) {
      mustGet(jobId).status = status;
    },
  };
}
