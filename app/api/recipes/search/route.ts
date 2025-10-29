import { NextResponse } from "next/server";
import { z } from "zod";
import { getRecipeProvider } from "@/lib/recipes/provider";
import { rateLimit, getRateLimitHint } from "@/lib/rateLimit";
import { dedupe, normalizeQuery, splitCommaList } from "@/lib/utils";

const querySchema = z.object({
  q: z.string().max(80).optional(),
  diet: z.array(z.string()).max(8).optional(),
  have: z.array(z.string()).max(30).optional(),
  exclude: z.array(z.string()).max(30).optional(),
  people: z
    .number()
    .int()
    .min(1)
    .max(16)
    .default(2)
});

export async function GET(request: Request) {
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

  const url = new URL(request.url);
  const diets = dedupe([
    ...url.searchParams.getAll("diet"),
    ...splitCommaList(url.searchParams.get("diet"))
  ]).filter(Boolean);

  const have = dedupe([
    ...url.searchParams.getAll("have"),
    ...splitCommaList(url.searchParams.get("have"))
  ]).filter(Boolean);

  const exclude = dedupe([
    ...url.searchParams.getAll("exclude"),
    ...splitCommaList(url.searchParams.get("exclude"))
  ]).filter(Boolean);

  const parsed = querySchema.safeParse({
    q: normalizeQuery(url.searchParams.get("q")),
    diet: diets,
    have,
    exclude,
    people: Number(url.searchParams.get("people") ?? 2)
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const provider = getRecipeProvider();
  try {
    const results = await provider.search({
      q: parsed.data.q,
      diet: parsed.data.diet ?? [],
      have: parsed.data.have ?? [],
      exclude: parsed.data.exclude ?? [],
      people: parsed.data.people
    });
    return NextResponse.json({ results }, { status: 200, headers: cachingHeaders() });
  } catch (error) {
    console.error("Recipe search failed", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

function cachingHeaders(): HeadersInit {
  return {
    "cache-control": "s-maxage=86400, stale-while-revalidate=86400"
  };
}
