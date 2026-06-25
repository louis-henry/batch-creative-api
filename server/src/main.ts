import { mkdirSync } from 'node:fs';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import pino from 'pino';
import { loadEnv } from './config/env.js';
import { createInMemoryJobStore } from './adapters/jobs/inMemoryJobStore.js';
import { createLocalImageStore } from './adapters/storage/localImageStore.js';
import { createSharpCompositor } from './adapters/compositor/sharpCompositor.js';
import { createGeminiImageProvider } from './adapters/providers/image/geminiImageProvider.js';
import { createOpenAiImageProvider } from './adapters/providers/image/openaiImageProvider.js';
import { createOpenRouterTextProvider } from './adapters/providers/text/openRouterTextProvider.js';
import { runBatch } from './application/batch/runBatch.js';
import type { RetryPolicy } from './application/resilience/policy.js';
import { createApp, type StartBatch } from './interface/http/app.js';

const OUTPUT_DIR = '.output';
const POLICY: RetryPolicy = { maxRetries: 2, baseMs: 300, maxMs: 8000, attemptTimeoutMs: 60_000 };

const env = loadEnv();
const logger = pino();

const jobStore = createInMemoryJobStore();
const text = createOpenRouterTextProvider({ apiKey: env.OPENROUTER_API_KEY });
const imageProviders = [
  createGeminiImageProvider({ apiKey: env.GEMINI_API_KEY }),
  createOpenAiImageProvider({ apiKey: env.OPENAI_API_KEY }),
];
const compositor = createSharpCompositor();
const store = createLocalImageStore({
  directory: OUTPUT_DIR,
  publicBaseUrl: `${env.PUBLIC_BASE_URL}/images`,
});

const startBatch: StartBatch = (jobId, products, refs, options) => {
  // Fire-and-forget: the client polls GET /batch/:id for progress. Errors are logged.
  runBatch(jobId, products, refs, {
    imageProviders,
    text,
    compositor,
    store,
    jobStore,
    policy: POLICY,
    concurrency: options.concurrency,
    chaos: options.chaos,
  }).catch((error: unknown) => {
    logger.error({ jobId, err: error }, 'batch run failed');
  });
};

mkdirSync(OUTPUT_DIR, { recursive: true });

const app = createApp({ jobStore, startBatch });
app.use(
  '/images/*',
  serveStatic({ root: OUTPUT_DIR, rewriteRequestPath: (p) => p.replace(/^\/images/, '') }),
);

serve({ fetch: app.fetch, port: env.PORT }, () => {
  logger.info(`listening on :${env.PORT}`);
});
