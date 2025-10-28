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

const MODEL_PRIMARY = "gpt-5-mini";
const MODEL_FALLBACK = "gpt-4o-mini";
const RATE_LIMIT_WINDOW_MS = 3000;
const rateLimitMap = new Map<string, number>();

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
};

function describeError(error: unknown): SerializableError {
  if (error instanceof OpenAI.APIError) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      status: error.status ?? undefined,
      code: error.code ?? undefined,
      type: error.type ?? undefined,
      param: error.param ?? undefined,
      details: error.error,
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

async function generateTopics(payload: TopicRequest): Promise<TopicResponsePayload> {
  const userPrompt = buildUserPrompt(payload);

  const response = await callOpenAI(userPrompt);

  if (response) {
    return response;
  }

  throw new Error("Unable to generate valid topics");
}

async function callOpenAI(userPrompt: string): Promise<TopicResponsePayload | null> {
  const baseInput = [
    {
      role: "system" as const,
      content: [
        {
          type: "input_text" as const,
          text:
            "You are a witty, wholesome dinner host assistant. You craft short, inclusive conversation starters tailored to the group vibe and size, plus one fun food fact linked to any supplied dietary style or ingredient. Keep everything family-friendly, practical, and culturally respectful. Inject gentle variety and avoid repeating earlier phrasings, even when the context stays the same."
        }
      ]
    },
    {
      role: "user" as const,
      content: [{ type: "input_text" as const, text: userPrompt }]
    }
  ];

  const modelsToTry = [MODEL_PRIMARY, MODEL_FALLBACK];

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = (await getOpenAIClient().responses.create({
          model,
          max_output_tokens: 600,
          input:
            attempt === 0
              ? baseInput
              : [
                  ...baseInput,
                  {
                    role: "user" as const,
                    content: [
                      {
                        type: "input_text" as const,
                        text: "Return valid JSON only matching the schema."
                      }
                    ]
                  }
                ],
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
                    maxItems: 3
                  },
                  fact: { type: "string", minLength: 1 }
                },
                required: ["starters", "fact"],
                additionalProperties: false
              },
              strict: true
            }
          }
        } as any)) as unknown as OpenAIResponse;

        const textPayload = extractResponseText(response);
        if (!textPayload) {
          continue;
        }

        try {
          const parsed = JSON.parse(textPayload) as TopicResponsePayload;
          const sanitized = sanitizeResponse(parsed);

          if (sanitized) {
            return sanitized;
          }
        } catch (error) {
          console.warn("Failed to parse OpenAI response", error);
        }
      } catch (error) {
        logOpenAIError("request failed", error, {
          model,
          attempt,
          promptPreview: userPrompt.slice(0, 160),
        });
        break;
      }
    }
  }

  return null;
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
