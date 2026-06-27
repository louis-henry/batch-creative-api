import { z } from 'zod';

const envSchema = z
  .object({
    OPENROUTER_API_KEY: z.string().min(1),
    // At least one image provider is required (see refine below); whichever keys
    // are present become the failover chain, Gemini first.
    GEMINI_API_KEY: z.string().min(1).optional(),
    OPENAI_API_KEY: z.string().min(1).optional(),
    PORT: z.coerce.number().int().positive().default(8787),
    PUBLIC_BASE_URL: z.string().url().default('http://localhost:8787'),
    // Allowed browser origin for CORS; omit to allow any origin (dev default).
    WEB_ORIGIN: z.string().url().optional(),
    // Enable the LLM quality gate: regenerate/fail over when a post scores below this (0..1).
    JUDGE_THRESHOLD: z.coerce.number().min(0).max(1).optional(),
    // Per-request product cap; lower on the public deploy to bound spend.
    MAX_PRODUCTS: z.coerce.number().int().positive().default(20),
  })
  .refine((e) => e.GEMINI_API_KEY !== undefined || e.OPENAI_API_KEY !== undefined, {
    // No path: this is a cross-field rule, so surface the instruction itself rather
    // than blaming one key (OpenAI-only is valid).
    message: 'set GEMINI_API_KEY and/or OPENAI_API_KEY',
  });

export type Env = z.infer<typeof envSchema>;

/** Parses and validates process env once at startup. Fails fast and loud. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  // Treat blank values (e.g. a leftover `GEMINI_API_KEY=` line) as unset.
  const cleaned = Object.fromEntries(Object.entries(source).filter(([, v]) => v !== ''));
  const result = envSchema.safeParse(cleaned);
  if (!result.success) {
    // Field issues report the field name; cross-field (path-less) issues report
    // their message, so a missing-image-provider boot is self-explanatory.
    const fields = result.error.issues.map((i) => i.path.join('.') || i.message).join(', ');
    throw new Error(`Invalid environment configuration: ${fields}`);
  }
  return result.data;
}
