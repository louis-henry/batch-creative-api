import { useEffect, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { Sparkles, RotateCcw, WifiOff } from 'lucide-react';
import { useBatchStore } from '@/store/batchStore';
import { useJob } from '@/hooks/useJob';
import { createBatch } from '@/lib/api';
import { deriveItems } from '@/lib/status';
import { Dropzone } from '@/components/Dropzone';
import { Thumbs } from '@/components/Thumbs';
import { Controls } from '@/components/Controls';
import { ProgressList } from '@/components/ProgressList';
import { ResultGrid } from '@/components/ResultGrid';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function App() {
  const s = useBatchStore();
  const { data: job, isError } = useJob(s.jobId);
  const [submitting, setSubmitting] = useState(false);

  const finished = job?.status === 'done';
  const running = (s.jobId !== null && !finished && !isError) || submitting;
  // Once submitted, derive against the snapshot count so editing the queue
  // mid-run can't invent phantom pending items.
  const items = deriveItems(s.jobId ? s.submittedCount : s.products.length, job);
  const results = items.flatMap((i) => (i.status === 'done' ? [i.result] : []));
  const failures = items.flatMap((i) => (i.status === 'failed' ? [i] : []));
  const canRun = s.products.length > 0 && s.refs.length >= 1;

  const failedSuffix = failures.length > 0 ? `, ${String(failures.length)} failed` : '';
  const summary = s.jobId
    ? `${String(results.length)} of ${String(s.products.length)} posts ready${failedSuffix}`
    : '';

  useEffect(() => {
    if (job?.status !== 'done') return;
    const suffix = job.failed.length > 0 ? `, ${String(job.failed.length)} failed` : '';
    toast.success(`Batch complete — ${String(job.succeeded.length)} ready${suffix}`);
  }, [job?.status, job?.succeeded.length, job?.failed.length]);

  const run = (): void => {
    setSubmitting(true);
    createBatch(s.products, s.refs, { concurrency: s.concurrency, chaos: s.chaos })
      .then((id) => {
        s.submit(id);
        toast('Batch started', { description: `${String(s.products.length)} product image(s)` });
      })
      .catch((e: unknown) => {
        toast.error(e instanceof Error ? e.message : 'Failed to start batch');
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <header className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Sparkles aria-hidden="true" className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Batch Creative Studio</h1>
            <p className="text-sm text-muted">
              Product images in, styled social posts out — with provider failover and consistent
              style.
            </p>
          </div>
        </header>

        <p className="sr-only" role="status" aria-live="polite">
          {summary}
        </p>

        <main className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <Card className="h-fit space-y-5 p-5">
            <div>
              <Dropzone
                label="Product images"
                hint="Click to choose, or drag images here — one post per image"
                onFiles={s.addProducts}
              />
              <Thumbs files={s.products} onRemove={s.removeProduct} />
            </div>
            <div>
              <Dropzone
                label="Reference images"
                hint="1–2 images that define the mood"
                onFiles={s.addRefs}
              />
              <Thumbs files={s.refs} onRemove={s.removeRef} />
            </div>
            <div className="h-px bg-border" />
            <Controls
              concurrency={s.concurrency}
              chaos={s.chaos}
              running={running}
              canRun={canRun}
              onConcurrency={s.setConcurrency}
              onChaos={s.setChaos}
              onRun={run}
            />
            {finished && (
              <Button variant="outline" className="w-full" onClick={s.reset}>
                <RotateCcw aria-hidden="true" className="h-4 w-4" /> New batch
              </Button>
            )}
          </Card>

          <div className="space-y-6">
            <h2 className="sr-only">Generated posts</h2>
            {!s.jobId && (
              <Card className="flex min-h-64 flex-col items-center justify-center gap-2 p-10 text-center">
                <Sparkles aria-hidden="true" className="h-6 w-6 text-muted" />
                <p className="text-sm text-muted">
                  Upload product and reference images, then generate to see posts appear here.
                </p>
              </Card>
            )}

            {isError && (
              <Card role="alert" className="flex items-center gap-2 p-4 text-sm text-danger">
                <WifiOff aria-hidden="true" className="h-4 w-4" />
                Lost connection to the job. Check the API is running.
              </Card>
            )}

            {items.length > 0 && running && <ProgressList items={items} />}

            <ResultGrid results={results} />

            {failures.length > 0 && (
              <Card className="space-y-2 p-4">
                <h2 className="text-sm font-medium text-danger">Failed items</h2>
                {failures.map((f) => (
                  <div key={f.id} className="flex justify-between gap-3 text-xs text-muted">
                    <span className="font-mono">{f.id}</span>
                    <span className="text-right">{f.failure.reason}</span>
                  </div>
                ))}
              </Card>
            )}
          </div>
        </main>

        <Toaster theme="dark" position="top-right" richColors />
      </div>
    </MotionConfig>
  );
}
