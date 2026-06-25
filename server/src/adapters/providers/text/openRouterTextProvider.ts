import { type Copy, copySchema } from '@app/contracts';
import type {
  CopyRequest,
  DescribeRequest,
  JudgeRequest,
  JudgeResult,
  StyleAnalysis,
  TextProvider,
} from '../../../application/ports/textProvider.js';
import { ProviderError } from '../../../application/resilience/errors.js';
import { dataUrl, ensureOk, fetchText, parseJson, type FetchFn } from '../providerHttp.js';
import { buildCopyPrompt, buildJudgePrompt, buildStylePrompt } from '../prompts.js';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'google/gemini-2.5-flash';
const DEFAULT_MODELS = { describe: DEFAULT_MODEL, copy: DEFAULT_MODEL, judge: DEFAULT_MODEL };

const STYLE_SCHEMA = {
  type: 'object',
  properties: {
    descriptor: { type: 'string', maxLength: 300 },
    palette: { type: 'array', items: { type: 'string' }, maxItems: 6 },
  },
  required: ['descriptor', 'palette'],
  additionalProperties: false,
};
const COPY_SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string', maxLength: 60 },
    subtext: { type: 'string', maxLength: 120 },
    cta: { type: 'string', maxLength: 24 },
  },
  required: ['headline', 'subtext', 'cta'],
  additionalProperties: false,
};
const JUDGE_SCHEMA = {
  type: 'object',
  properties: { score: { type: 'number' } },
  required: ['score'],
  additionalProperties: false,
};

interface ChatResponse {
  choices?: { message?: { content?: string } }[];
}

interface ChatClient {
  fetchFn: FetchFn;
  apiKey: string;
}

async function chat(
  client: ChatClient,
  label: string,
  body: Record<string, unknown>,
  signal: AbortSignal,
): Promise<string> {
  const { status, text } = await fetchText(
    label,
    ENDPOINT,
    {
      method: 'POST',
      signal,
      headers: { Authorization: `Bearer ${client.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    client.fetchFn,
  );
  ensureOk(label, status, text);
  const content = parseJson<ChatResponse>(label, text).choices?.[0]?.message?.content;
  if (!content) throw new ProviderError(`${label} returned no content`, { retryable: true });
  return content;
}

export function createOpenRouterTextProvider(deps: {
  apiKey: string;
  fetchFn?: FetchFn;
  models?: { describe: string; copy: string; judge: string };
}): TextProvider {
  const client: ChatClient = { fetchFn: deps.fetchFn ?? fetch, apiKey: deps.apiKey };
  const models = deps.models ?? DEFAULT_MODELS;

  return {
    name: 'openrouter',
    async describeStyle({ refs, signal }: DescribeRequest): Promise<StyleAnalysis> {
      const body = message({
        model: models.describe,
        text: buildStylePrompt(),
        images: refs,
        schemaName: 'style',
        schema: STYLE_SCHEMA,
      });
      return parseStyle(await chat(client, 'openrouter style', body, signal));
    },
    async copy({ product, style, signal }: CopyRequest): Promise<Copy> {
      const body = message({
        model: models.copy,
        text: buildCopyPrompt(style),
        images: [product],
        schemaName: 'copy',
        schema: COPY_SCHEMA,
      });
      return parseCopy(await chat(client, 'openrouter copy', body, signal));
    },
    async judge({ image, style, signal }: JudgeRequest): Promise<JudgeResult> {
      const body = message({
        model: models.judge,
        text: buildJudgePrompt(style),
        images: [image],
        schemaName: 'judge',
        schema: JUDGE_SCHEMA,
      });
      return parseJudge(await chat(client, 'openrouter judge', body, signal));
    },
  };
}

function message(args: {
  model: string;
  text: string;
  images: readonly Buffer[];
  schemaName: string;
  schema: object;
}): Record<string, unknown> {
  const { model, text, images, schemaName, schema } = args;
  const imageParts = images.map((img) => ({ type: 'image_url', image_url: { url: dataUrl(img) } }));
  return {
    model,
    messages: [{ role: 'user', content: [{ type: 'text', text }, ...imageParts] }],
    response_format: {
      type: 'json_schema',
      json_schema: { name: schemaName, strict: true, schema },
    },
  };
}

function parseStyle(content: string): StyleAnalysis {
  const body = parseJson<{ descriptor?: unknown; palette?: unknown }>('openrouter style', content);
  const palette = Array.isArray(body.palette)
    ? body.palette.filter((c) => typeof c === 'string')
    : [];
  if (typeof body.descriptor !== 'string' || body.descriptor.trim().length === 0) {
    throw new ProviderError('openrouter style returned no descriptor', { retryable: true });
  }
  return { descriptor: body.descriptor, palette };
}

function parseCopy(content: string): Copy {
  const result = copySchema.safeParse(parseJson<unknown>('openrouter copy', content));
  if (!result.success) {
    throw new ProviderError('openrouter copy did not match the schema', { retryable: true });
  }
  return result.data;
}

function parseJudge(content: string): JudgeResult {
  const body = parseJson<{ score?: unknown }>('openrouter judge', content);
  if (typeof body.score !== 'number' || Number.isNaN(body.score)) {
    throw new ProviderError('openrouter judge returned no score', { retryable: true });
  }
  return { score: Math.max(0, Math.min(1, body.score)) };
}
