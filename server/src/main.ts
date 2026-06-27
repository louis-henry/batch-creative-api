import 'dotenv/config';
import { mkdirSync } from 'node:fs';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import pino from 'pino';
import { loadEnv } from './config/env.js';
import { createInMemoryJobStore } from './adapters/jobs/inMemoryJobStore.js';
import { createLocalImageStore } from './adapters/storage/localImageStore.js';
import { createGeminiImageProvider } from './adapters/providers/image/geminiImageProvider.js';
import { createOpenAiImageProvider } from './adapters/providers/image/openaiImageProvider.js';
import { createOpenRouterTextProvider } from './adapters/providers/text/openRouterTextProvider.js';
import { runBatch } from './application/batch/runBatch.js';
import type { ImageProvider } from './application/ports/imageProvider.js';
import type { RetryPolicy } from './application/resilience/policy.js';
import { createApp, type StartBatch } from './interface/http/app.js';

const OUTPUT_DIR = '.output';
const POLICY: RetryPolicy = { maxRetries: 2, baseMs: 300, maxMs: 8000, attemptTimeoutMs: 60_000 };

const env = loadEnv();
const logger = pino({
  redact: {
    paths: [
      '*.headers.authorization',
      '*.headers["x-goog-api-key"]',
      'err.cause',
      // Failover throws AggregateError; scrub each child cause too (belt-and-braces:
      // provider bodies are already secret-scrubbed at the source).
      'err.errors[*].cause',
    ],
    censor: '[redacted]',
  },
});

const jobStore = createInMemoryJobStore();
const text = createOpenRouterTextProvider({ apiKey: env.OPENROUTER_API_KEY });

// Use whichever image providers have keys; Gemini first, OpenAI as failover.
const imageProviders: ImageProvider[] = [];
if (env.GEMINI_API_KEY)
  imageProviders.push(createGeminiImageProvider({ apiKey: env.GEMINI_API_KEY }));
if (env.OPENAI_API_KEY)
  imageProviders.push(createOpenAiImageProvider({ apiKey: env.OPENAI_API_KEY }));
logger.info(`image providers: ${imageProviders.map((p) => p.name).join(', ')}`);
const store = createLocalImageStore({
  directory: OUTPUT_DIR,
  publicBaseUrl: `${env.PUBLIC_BASE_URL}/images`,
});

const startBatch: StartBatch = (jobId, products, refs, options) => {
  // Fire-and-forget: the client polls GET /batch/:id for progress.
  runBatch(jobId, products, refs, {
    imageProviders,
    text,
    store,
    jobStore,
    logger,
    policy: POLICY,
    concurrency: options.concurrency,
    chaos: options.chaos,
    ...(env.JUDGE_THRESHOLD !== undefined ? { judgeThreshold: env.JUDGE_THRESHOLD } : {}),
  }).catch((error: unknown) => {
    // Catastrophic failure outside per-item handling: drive the job terminal so
    // pollers stop instead of spinning forever.
    logger.error({ jobId, err: error }, 'batch run failed');
    try {
      jobStore.setStatus(jobId, 'done');
    } catch {
      // job already gone; nothing to reconcile
    }
  });
};

mkdirSync(OUTPUT_DIR, { recursive: true });

const app = createApp({
  jobStore,
  startBatch,
  maxProducts: env.MAX_PRODUCTS,
  // Basic spend guard on the public, unauthenticated endpoint. The hard backstop
  // is the provider-side spend caps; this just stops casual abuse from draining them.
  rateLimits: {
    perIp: { limit: 6, windowMs: 10 * 60_000 },
    global: { limit: 40, windowMs: 60 * 60_000 },
  },
  ...(env.WEB_ORIGIN !== undefined ? { corsOrigin: env.WEB_ORIGIN } : {}),
});
app.use(
  '/images/*',
  serveStatic({ root: OUTPUT_DIR, rewriteRequestPath: (p) => p.replace(/^\/images/, '') }),
);

const server = serve({ fetch: app.fetch, port: env.PORT }, () => {
  logger.info(`listening on :${env.PORT}`);
});

// Graceful shutdown: stop accepting connections on redeploy/termination.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    logger.info(`received ${signal}, shutting down`);
    server.close(() => process.exit(0));
  });
}
