import { NextResponse } from "next/server";
import { z } from "zod";
import { getRecipeProvider } from "@/lib/recipes/provider";
import { rateLimit, getRateLimitHint } from "@/lib/rateLimit";

const paramsSchema = z.object({
  id: z.string().min(1).max(120)
});

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
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

  const parsed = paramsSchema.safeParse({
    id: context.params.id ? decodeURIComponent(context.params.id) : null
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const provider = getRecipeProvider();
  try {
    const recipe = await provider.getById(parsed.data.id);
    if (!recipe) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ recipe }, { status: 200, headers: cachingHeaders() });
  } catch (error) {
    console.error("Recipe detail failed", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

function cachingHeaders(): HeadersInit {
  return {
    "cache-control": "s-maxage=86400, stale-while-revalidate=86400"
  };
}
