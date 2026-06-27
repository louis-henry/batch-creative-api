import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { WifiSlash, Sparkle, ArrowCounterClockwise } from '@phosphor-icons/react';
import { useBatchStore } from '@/store/batchStore';
import { useJob } from '@/hooks/useJob';
import { createBatch } from '@/lib/api';
import { deriveItems } from '@/lib/status';
import { loadSample, SAMPLE_PRODUCTS, SAMPLE_REFS } from '@/lib/samples';
import { ImagePicker } from '@/components/ImagePicker';
import { Gallery } from '@/components/Gallery';
import { LoadingView } from '@/components/LoadingView';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

const MAX_REFS = 2;
const nameOf = (url: string): string => url.split('/').pop()?.split('?')[0] ?? '';

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface/50 p-5">
      <h2 className="font-display text-base font-semibold tracking-tight">{title}</h2>
      <p className="mt-0.5 text-sm text-muted">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ConnectionError() {
  return (
    <div
      role="alert"
      className="mt-6 flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger"
    >
      <WifiSlash size={18} weight="bold" />
      Lost connection to the job, retrying. Check the API is running.
    </div>
  );
}

export function Workspace() {
  const s = useBatchStore();
  const { data: job, isError } = useJob(s.jobId);
  const [submitting, setSubmitting] = useState(false);

  const finished = job?.status === 'done';
  const running = (s.jobId !== null && !finished && !isError) || submitting;
  const items = s.jobId ? deriveItems(s.submittedCount, job) : [];
  const results = items.filter((i) => i.status === 'done').length;
  const failures = items.filter((i) => i.status === 'failed').length;
  const canRun = s.products.length > 0 && s.refs.length >= 1;
  const maxConcurrency = Math.max(1, s.products.length);
  const effectiveConcurrency = Math.min(s.concurrency, maxConcurrency);

  const failedSuffix = failures > 0 ? `, ${String(failures)} failed` : '';
  const summary = s.jobId
    ? `${String(results)} of ${String(s.submittedCount)} posts ready${failedSuffix}`
    : '';

  useEffect(() => {
    if (job?.status !== 'done') return;
    const suffix = job.failed.length > 0 ? `, ${String(job.failed.length)} failed` : '';
    toast.success(`Batch complete: ${String(job.succeeded.length)} ready${suffix}`);
  }, [job?.status, job?.succeeded.length, job?.failed.length]);

  const run = (): void => {
    setSubmitting(true);
    createBatch(s.products, s.refs, { concurrency: effectiveConcurrency, chaos: s.chaos })
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

  const toggle = (
    url: string,
    files: File[],
    add: (f: File[]) => void,
    remove: (i: number) => void,
  ): void => {
    const index = files.findIndex((f) => f.name === nameOf(url));
    if (index >= 0) {
      remove(index);
      return;
    }
    loadSample(url)
      .then((f) => {
        add([f]);
      })
      .catch(() => toast.error('Could not load that sample image'));
  };

  let phase: 'idle' | 'running' | 'done' = 'idle';
  if (running) phase = 'running';
  else if (finished) phase = 'done';

  return (
    <>
      {phase === 'idle' && (
        <div className="glow pointer-events-none absolute inset-x-0 top-0 h-72" />
      )}

      <p className="sr-only" role="status">
        {summary}
      </p>

      {phase === 'idle' && (
        <main className="relative mx-auto max-w-2xl px-5 pb-16">
          <div className="py-8 text-center sm:py-10">
            <h1 className="font-display text-3xl font-bold leading-[1.1] tracking-tight sm:text-4xl">
              Your product, <span className="text-accent-strong">styled into a set.</span>
            </h1>
            <p className="mx-auto mt-3 max-w-md text-muted">
              Pick or upload a product and a reference mood, then get a ready-to-post image with a
              title, caption, and hashtags, with provider failover and a consistent look.
            </p>
          </div>

          <div className="space-y-4">
            <Section title="Products" subtitle="One styled post is generated per product image.">
              <ImagePicker
                samples={SAMPLE_PRODUCTS}
                files={s.products}
                max={20}
                uploadLabel="Upload product images"
                onToggleSample={(url) => toggle(url, s.products, s.addProducts, s.removeProduct)}
                onUpload={s.addProducts}
                onRemoveFile={s.removeProduct}
              />
            </Section>

            <Section title="References" subtitle="1–2 images that set the mood, colour, and style.">
              <ImagePicker
                samples={SAMPLE_REFS}
                files={s.refs}
                max={MAX_REFS}
                uploadLabel="Upload reference images"
                onToggleSample={(url) => toggle(url, s.refs, s.addRefs, s.removeRef)}
                onUpload={s.addRefs}
                onRemoveFile={s.removeRef}
              />
            </Section>

            <Section title="Settings" subtitle="Tune how the batch runs.">
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Concurrency</p>
                    <p id="concurrency-desc" className="text-xs text-muted">
                      How many products generate in parallel (speed, not quantity).
                      {maxConcurrency === 1 && ' Add more products to raise this.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Slider
                      className="w-32"
                      min={1}
                      max={maxConcurrency}
                      step={1}
                      value={[effectiveConcurrency]}
                      onValueChange={([v]) => {
                        s.setConcurrency(v ?? 1);
                      }}
                      aria-label="Concurrency"
                      aria-describedby="concurrency-desc"
                      disabled={maxConcurrency === 1}
                    />
                    <span className="w-5 font-mono text-sm tabular-nums">
                      {effectiveConcurrency}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Chaos mode</p>
                    <p className="text-xs text-muted">
                      Force the primary provider to fail, to demo failover.
                    </p>
                  </div>
                  <Switch checked={s.chaos} onCheckedChange={s.setChaos} aria-label="Chaos mode" />
                </div>
              </div>
            </Section>
          </div>

          <div className="mt-6 flex flex-col items-center gap-3">
            <Button size="lg" className="w-full" onClick={run} disabled={!canRun}>
              <Sparkle size={17} weight="fill" />
              Generate posts
            </Button>
            {!canRun && (
              <p className="text-xs text-muted">
                Add at least one product and one reference to generate.
              </p>
            )}
          </div>
        </main>
      )}

      {phase === 'running' && (
        <main className="relative mx-auto max-w-6xl px-5 pb-24">
          <LoadingView done={results} total={s.submittedCount} />
          {isError && <ConnectionError />}
          <Gallery items={items} />
        </main>
      )}

      {phase === 'done' && (
        <main className="relative mx-auto max-w-6xl px-5 pb-24">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight">Your post set</h2>
              <p className="text-sm text-muted">
                {results} ready{failures > 0 ? `, ${String(failures)} failed` : ''} · save any post.
              </p>
            </div>
            <Button variant="outline" onClick={s.reset}>
              <ArrowCounterClockwise size={16} weight="bold" /> New batch
            </Button>
          </div>
          <Gallery items={items} />
        </main>
      )}
    </>
  );
}
