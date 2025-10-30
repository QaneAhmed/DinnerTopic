import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeDietFilters } from "@/lib/filters";
import { generateTopics } from "@/lib/openai";
import { rateLimit, getRateLimitHint } from "@/lib/rateLimit";

const recipeSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().min(1),
  description: z.string().default(""),
  image: z.string().default("/placeholder.jpg"),
  timeMinutes: z.number().nonnegative().default(30),
  cuisine: z.string().default("Global"),
  dietFlags: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  ingredients: z.array(z.string()).default([]),
  steps: z.array(z.string()).default([])
});

const bodySchema = z.object({
  recipe: recipeSchema.optional(),
  vibe: z.string().min(1).max(30).default("Friends"),
  people: z.number().int().min(1).max(16).default(2),
  previousHashes: z.array(z.string()).optional(),
  preview: z.boolean().optional()
});

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (!rateLimit(ip)) {
    return NextResponse.json(
      { error: "Easy there. Try again in a moment.", hint: getRateLimitHint() },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const recipeDefaults = {
    id: "preview",
    description: "",
    image: "/placeholder.jpg",
    timeMinutes: 30,
    cuisine: "Global",
    dietFlags: [],
    tags: [],
    ingredients: [],
    steps: []
  };

  const normalizedPayload = {
    ...parsed.data,
    recipe: {
      ...(parsed.data.recipe ?? { title: "Dinner", ...recipeDefaults }),
      id: parsed.data.recipe?.id ?? "preview",
      dietFlags: normalizeDietFilters(parsed.data.recipe?.dietFlags ?? [])
    }
  };

  try {
    if (parsed.data.preview) {
      const previewTopics = await generateTopics(normalizedPayload);
      return NextResponse.json(
        {
          starters: previewTopics.starters.slice(0, 2),
          fun_fact: previewTopics.fun_fact
        },
        { status: 200 }
      );
    }

    const topics = await generateTopics(normalizedPayload);
    return NextResponse.json(
      {
        starters: topics.starters,
        fun_fact: topics.fun_fact,
        hashes: topics.hashes ?? []
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Topics generation failed", {
      error,
      payloadSummary: {
        recipeId: normalizedPayload.recipe.id,
        vibe: normalizedPayload.vibe,
        people: normalizedPayload.people,
        dietFlags: normalizedPayload.recipe.dietFlags
      }
    });
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
