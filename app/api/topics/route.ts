import { NextResponse, type NextRequest } from "next/server";
import OpenAI from "openai";
import type { Response as OpenAIResponse } from "openai/resources/responses/responses";
import {
  fallbackTopics,
  hasDenylistedTerm,
  topicRequestSchema,
  type TopicRequest,
  type TopicResponsePayload,
  type Vibe
} from "@/lib/topics";

export const runtime = "nodejs";

const MODEL_PRIMARY = "gpt-4o-mini";
const MODEL_FALLBACK = "gpt-5-mini";
const RATE_LIMIT_WINDOW_MS = 3000;
const rateLimitMap = new Map<string, number>();
const CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutes
const topicCache = new Map<
  string,
  { expiresAt: number; data: TopicResponsePayload }
>();
const MAX_OUTPUT_TOKENS = 450;

let openaiClient: OpenAI | null = null;

type SerializableError = {
  name: string;
  message: string;
  stack?: string;
  status?: number;
  code?: string;
  type?: string;
  param?: string;
  details?: unknown;
  requestId?: string;
  headers?: Record<string, string>;
};

function describeError(error: unknown): SerializableError {
  if (error instanceof OpenAI.APIError) {
    let headers: Record<string, string> | undefined;

    const rawHeaders = (error.headers ?? null) as unknown;

    if (
      rawHeaders &&
      typeof (rawHeaders as { forEach?: unknown }).forEach === "function"
    ) {
      headers = {};
      (rawHeaders as Headers).forEach((value: string, key: string) => {
        headers![key.toLowerCase()] = value;
      });
    } else if (rawHeaders && typeof rawHeaders === "object") {
      headers = Object.entries(rawHeaders as Record<string, string>).reduce<
        Record<string, string>
      >((acc, [key, value]) => {
        acc[key.toLowerCase()] = value;
        return acc;
      }, {});
    }

    const requestId =
      (headers && (headers["x-request-id"] ?? headers["openai-request-id"])) ||
      undefined;

    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      status: error.status ?? undefined,
      code: error.code ?? undefined,
      type: error.type ?? undefined,
      param: error.param ?? undefined,
      details: error.error,
      requestId,
      headers,
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    name: "UnknownError",
    message: typeof error === "string" ? error : JSON.stringify(error),
  };
}

function logOpenAIError(context: string, error: unknown, metadata?: Record<string, unknown>) {
  const base = describeError(error);
  console.error(`[OpenAI] ${context}`, {
    ...metadata,
    error: base,
  });
}

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not set");
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500, statusText: "Missing API key" }
    );
  }

  const identifier = getClientIdentifier(req);

  if (isRateLimited(identifier)) {
    return NextResponse.json(
      { error: "Easy there, chef. Try again in a moment." },
      { status: 429 }
    );
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch (error) {
    console.error("Invalid JSON body", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 400 });
  }

  let data: TopicRequest;
  try {
    data = topicRequestSchema.parse(body);
  } catch (error) {
    console.warn("Validation error", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 400 });
  }

  if (hasDenylistedTerm(data.dietaryOrIngredient)) {
    console.warn("Denylisted term detected");
    return NextResponse.json({ error: "Something went wrong" }, { status: 400 });
  }

  try {
    const payload = await generateTopics(data);
    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error("Falling back to canned topics", error);
    const fallback = fallbackTopics[data.vibe as Vibe];
    return NextResponse.json(fallback, { status: 200 });
  }
}

function getClientIdentifier(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "anonymous";
  }

  if (typeof req.ip === "string" && req.ip.length > 0) {
    return req.ip;
  }

  return "anonymous";
}

function isRateLimited(id: string): boolean {
  const now = Date.now();
  const lastRequest = rateLimitMap.get(id);

  if (lastRequest && now - lastRequest < RATE_LIMIT_WINDOW_MS) {
    return true;
  }

  rateLimitMap.set(id, now);

  rateLimitMap.forEach((value, key) => {
    if (now - value > RATE_LIMIT_WINDOW_MS) {
      rateLimitMap.delete(key);
    }
  });

  return false;
}

function buildCacheKey(payload: TopicRequest): string {
  return JSON.stringify({
    vibe: payload.vibe,
    people: payload.people,
    dietary:
      payload.dietaryOrIngredient?.trim().toLowerCase() ?? "__none__",
  });
}

function getCachedTopics(key: string): TopicResponsePayload | null {
  const entry = topicCache.get(key);
  if (!entry) {
    return null;
  }

  if (Date.now() > entry.expiresAt) {
    topicCache.delete(key);
    return null;
  }

  return entry.data;
}

function setCachedTopics(key: string, data: TopicResponsePayload) {
  topicCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, data });
}

async function generateTopics(payload: TopicRequest): Promise<TopicResponsePayload> {
  const userPrompt = buildUserPrompt(payload);
  const cacheKey = buildCacheKey(payload);

  const cached = getCachedTopics(cacheKey);
  if (cached) {
    return cached;
  }

  const response = await callOpenAI(userPrompt);

  if (response) {
    setCachedTopics(cacheKey, response);
    return response;
  }

  throw new Error("Unable to generate valid topics");
}

async function callOpenAI(userPrompt: string): Promise<TopicResponsePayload | null> {
  const baseInput = buildBaseInput(userPrompt);
  const modelsToTry = [MODEL_PRIMARY, MODEL_FALLBACK];

  for (const model of modelsToTry) {
    const outcome = await tryModel(model, baseInput, userPrompt);

    if (outcome.kind === "success") {
      return outcome.data;
    }

    if (outcome.kind === "nonretryable") {
      break;
    }
  }

  return null;
}

type ModelAttemptOutcome =
  | { kind: "success"; data: TopicResponsePayload }
  | { kind: "retryable" }
  | { kind: "nonretryable" };

function buildBaseInput(userPrompt: string) {
  return [
    {
      role: "system" as const,
      content: [
        {
          type: "input_text" as const,
          text:
            "You are a witty, wholesome dinner host assistant. You craft short, inclusive conversation starters tailored to the group vibe and size, plus one fun food fact linked to any supplied dietary style or ingredient. Keep everything family-friendly, practical, and culturally respectful. Inject gentle variety and avoid repeating earlier phrasings, even when the context stays the same.",
        },
      ],
    },
    {
      role: "user" as const,
      content: [{ type: "input_text" as const, text: userPrompt }],
    },
  ];
}

async function tryModel(
  model: string,
  baseInput: ReturnType<typeof buildBaseInput>,
  userPrompt: string,
): Promise<ModelAttemptOutcome> {
  try {
    const response = (await getOpenAIClient().responses.create({
      model,
      max_output_tokens: MAX_OUTPUT_TOKENS,
      input: baseInput,
      text: {
        format: {
          name: "dinner_topics_json",
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              starters: {
                type: "array",
                items: { type: "string", minLength: 1 },
                minItems: 3,
                maxItems: 3,
              },
              fact: { type: "string", minLength: 1 },
            },
            required: ["starters", "fact"],
            additionalProperties: false,
          },
          strict: true,
        },
      },
    })) as unknown as OpenAIResponse;

    const textPayload = extractResponseText(response);
    if (!textPayload) {
      console.warn("Empty OpenAI response payload", { model });
      return { kind: "retryable" };
    }

    try {
      const parsed = JSON.parse(textPayload) as TopicResponsePayload;
      const sanitized = sanitizeResponse(parsed);

      if (sanitized) {
        return { kind: "success", data: sanitized };
      }

      console.warn("OpenAI response failed sanitization", { model, parsed });
      return { kind: "retryable" };
    } catch (error) {
      console.warn("Failed to parse OpenAI response", error);
      return { kind: "retryable" };
    }
  } catch (error) {
    logOpenAIError("request failed", error, {
      model,
      promptPreview: userPrompt.slice(0, 160),
    });

    if (error instanceof OpenAI.APIError) {
      if (
        error.status === 429 ||
        error.code === "insufficient_quota" ||
        error.code === "rate_limit_exceeded" ||
        error.type === "insufficient_quota" ||
        error.type === "tokens" ||
        error.type === "requests" ||
        (typeof error.status === "number" && error.status >= 500)
      ) {
        return { kind: "retryable" };
      }
    }

    if (error instanceof Error && error.message.includes("Connection error")) {
      return { kind: "retryable" };
    }

    return { kind: "nonretryable" };
  }
}

function extractResponseText(response: OpenAIResponse): string | null {
  const firstOutput = response.output?.[0] as { content?: Array<{ text?: string }> } | undefined;
  const firstContent = firstOutput?.content?.[0];
  if (firstContent && typeof firstContent.text === "string" && firstContent.text.length > 0) {
    return firstContent.text;
  }

  const maybeOutputText = (response as { output_text?: string }).output_text;
  if (typeof maybeOutputText === "string" && maybeOutputText.length > 0) {
    return maybeOutputText;
  }

  return null;
}

function buildUserPrompt(payload: TopicRequest): string {
  const dietary = payload.dietaryOrIngredient ?? "none";

  return [
    "Create 3 short conversation starters and 1 fun food fact for a dinner.",
    "",
    "Context:",
    `- Vibe: ${payload.vibe}`,
    `- People: ${payload.people}`,
    `- Dietary or Ingredient (optional): ${dietary}`,
    "",
    "Constraints:",
    "- Starters: Each must be a single sentence, max 24 words, inclusive, easy for everyone to answer.",
    "- If Vibe=Colleagues: avoid sensitive topics; keep it light and neutral.",
    "- If Vibe=Kids: keep language simple; make at least one playful or imaginative.",
    "- If Vibe=Date: avoid interrogation; keep fun and open-ended.",
    "- If a dietary/ingredient is provided: weave it naturally into at least one starter.",
    "- Food fact: one sentence, true, non-controversial, tied to the dietary/ingredient if provided; otherwise a general culinary fact.",
    "- Absolutely no recipes, no medical/nutritional claims beyond widely accepted facts, no judgments.",
    "- Make each set feel fresh—vary phrasing and details across different requests, even if the context repeats.",
    "",
    "Output EXACTLY in JSON with keys:",
    '{ "starters": ["...", "...", "..."], "fact": "..." }'
  ].join("\n");
}

function sanitizeResponse(response: TopicResponsePayload): TopicResponsePayload | null {
  if (!Array.isArray(response.starters) || response.starters.length !== 3 || typeof response.fact !== "string") {
    return null;
  }

  const starters = response.starters.map((starter) => cleanSentence(starter));
  const fact = cleanSentence(response.fact);

  if (starters.some((starter) => starter.length === 0) || fact.length === 0) {
    return null;
  }

  return {
    starters,
    fact
  };
}

function cleanSentence(sentence: string): string {
  const trimmed = sentence.replace(/^["']+|["']+$/g, "").trim();
  const words = trimmed.split(/\s+/);
  if (words.length <= 24) {
    return trimmed;
  }
  return words.slice(0, 24).join(" ").trim();
}
function getOpenAIClient(): OpenAI {
  if (openaiClient) {
    return openaiClient;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
}
