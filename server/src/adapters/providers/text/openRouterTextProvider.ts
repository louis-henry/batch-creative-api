import { type Copy, copySchema } from '@app/contracts';
import type {
  CopyRequest,
  JudgeRequest,
  JudgeResult,
  TextProvider,
} from '../../../application/ports/textProvider.js';
import { ProviderError } from '../../../application/resilience/errors.js';
import { dataUrl, ensureOk, fetchText, parseJson, type FetchFn } from '../providerHttp.js';
import { buildCopyPrompt, buildJudgePrompt } from '../prompts.js';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODELS = { copy: 'google/gemini-2.5-flash', judge: 'google/gemini-2.5-flash' };

const COPY_SCHEMA = {
  type: 'object',
  properties: {
    headline: { type: 'string' },
    subtext: { type: 'string' },
    cta: { type: 'string' },
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

export function createOpenRouterTextProvider(deps: {
  apiKey: string;
  fetchFn?: FetchFn;
  models?: { copy: string; judge: string };
}): TextProvider {
  const fetchFn = deps.fetchFn ?? fetch;
  const models = deps.models ?? DEFAULT_MODELS;

  const chat = async (
    label: string,
    body: Record<string, unknown>,
    signal: AbortSignal,
  ): Promise<string> => {
    const { status, text } = await fetchText(
      label,
      ENDPOINT,
      {
        method: 'POST',
        signal,
        headers: { Authorization: `Bearer ${deps.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      fetchFn,
    );
    ensureOk(label, status, text);
    const content = parseJson<ChatResponse>(label, text).choices?.[0]?.message?.content;
    if (!content) throw new ProviderError(`${label} returned no content`, { retryable: true });
    return content;
  };

  return {
    name: 'openrouter',
    async copy({ product, style, signal }: CopyRequest): Promise<Copy> {
      const content = await chat(
        'openrouter copy',
        message({
          model: models.copy,
          text: buildCopyPrompt(style),
          image: product,
          schemaName: 'copy',
          schema: COPY_SCHEMA,
        }),
        signal,
      );
      return parseCopy(content);
    },
    async judge({ image, style, signal }: JudgeRequest): Promise<JudgeResult> {
      const content = await chat(
        'openrouter judge',
        message({
          model: models.judge,
          text: buildJudgePrompt(style),
          image,
          schemaName: 'judge',
          schema: JUDGE_SCHEMA,
        }),
        signal,
      );
      return parseJudge(content);
    },
  };
}

function message(args: {
  model: string;
  text: string;
  image: Buffer;
  schemaName: string;
  schema: object;
}): Record<string, unknown> {
  const { model, text, image, schemaName, schema } = args;
  return {
    model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text },
          { type: 'image_url', image_url: { url: dataUrl(image) } },
        ],
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: schemaName, strict: true, schema },
    },
  };
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
