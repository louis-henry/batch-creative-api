import { useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import { Sparkles } from 'lucide-react';
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

export function App() {
  const s = useBatchStore();
  const { data: job } = useJob(s.jobId);

  const running = s.jobId !== null && job?.status !== 'done';
  const items = deriveItems(s.products.length, job);
  const results = items.flatMap((i) => (i.status === 'done' ? [i.result] : []));
  const failures = items.flatMap((i) => (i.status === 'failed' ? [i] : []));
  const canRun = s.products.length > 0 && s.refs.length >= 1;

  useEffect(() => {
    if (job?.status !== 'done') return;
    const failed = job.failed.length;
    const suffix = failed > 0 ? `, ${String(failed)} failed` : '';
    toast.success(`Batch complete — ${String(job.succeeded.length)} ready${suffix}`);
  }, [job?.status, job?.succeeded.length, job?.failed.length]);

  const run = (): void => {
    createBatch(s.products, s.refs, { concurrency: s.concurrency, chaos: s.chaos })
      .then((id) => {
        s.setJobId(id);
        toast('Batch started', { description: `${String(s.products.length)} product image(s)` });
      })
      .catch((e: unknown) => {
        toast.error(e instanceof Error ? e.message : 'Failed to start batch');
      });
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <header className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Batch Creative Studio</h1>
          <p className="text-sm text-muted">
            Product images in, styled social posts out — with provider failover and consistent
            style.
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card className="h-fit space-y-5 p-5">
          <div>
            <Dropzone
              label="Product images"
              hint="Drop or click — one post per image"
              onFiles={s.addProducts}
            />
            <Thumbs files={s.products} onRemove={s.removeProduct} />
          </div>
          <div>
            <Dropzone
              label="Reference images"
              hint="1–2 images defining the mood"
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
        </Card>

        <div className="space-y-6">
          {!s.jobId && (
            <Card className="flex min-h-64 flex-col items-center justify-center gap-2 p-10 text-center">
              <Sparkles className="h-6 w-6 text-muted" />
              <p className="text-sm text-muted">
                Upload product and reference images, then generate to see posts appear here.
              </p>
            </Card>
          )}

          {items.length > 0 && running && <ProgressList items={items} />}

          <ResultGrid results={results} />

          {failures.length > 0 && (
            <Card className="space-y-2 p-4">
              <p className="text-sm font-medium text-danger">Failed items</p>
              {failures.map((f) => (
                <div key={f.id} className="flex justify-between gap-3 text-xs text-muted">
                  <span className="font-mono">{f.id}</span>
                  <span className="text-right">{f.failure.reason}</span>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>

      <Toaster theme="dark" position="top-right" richColors />
    </div>
  );
}
