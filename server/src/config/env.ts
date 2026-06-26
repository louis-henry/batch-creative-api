import { z } from 'zod';

const envSchema = z.object({
  OPENROUTER_API_KEY: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(8787),
  PUBLIC_BASE_URL: z.string().url().default('http://localhost:8787'),
  // Allowed browser origin for CORS; omit to allow any origin (dev default).
  WEB_ORIGIN: z.string().url().optional(),
  // Enable the LLM quality gate: regenerate/fail over when a post scores below this (0..1).
  JUDGE_THRESHOLD: z.coerce.number().min(0).max(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

/** Parses and validates process env once at startup. Fails fast and loud. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const fields = result.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`Invalid environment configuration: ${fields}`);
  }
  return result.data;
}
