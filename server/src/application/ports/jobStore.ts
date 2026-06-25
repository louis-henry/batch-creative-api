import type { BatchResult, ItemFailure, ItemResult, JobStatus } from '@app/contracts';

/** Holds the state of a running batch so clients can poll for progress. */
export interface JobStore {
  create(jobId: string): void;
  get(jobId: string): BatchResult | undefined;
  addSuccess(jobId: string, item: ItemResult): void;
  addFailure(jobId: string, failure: ItemFailure): void;
  setStatus(jobId: string, status: JobStatus): void;
}
