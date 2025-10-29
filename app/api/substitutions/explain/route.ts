import { NextResponse } from "next/server";
import { z } from "zod";
import { generateSubstitutionDelta } from "@/lib/openai";
import { rateLimit, getRateLimitHint } from "@/lib/rateLimit";

const bodySchema = z.object({
  from: z.string().min(1).max(60),
  to: z.string().min(1).max(60),
  recipe: z.object({
    title: z.string().min(1).max(120),
    cuisine: z.string().min(1).max(60),
    steps: z.array(z.string()).min(1).max(30)
  })
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

  const payload = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const result = await generateSubstitutionDelta(parsed.data);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Substitution delta failed", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
