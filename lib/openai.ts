import OpenAI from "openai";
import type {
  SubstitutionExplainRequest,
  SubstitutionExplainResponse,
  TopicsRequestBody,
  TopicsResponseBody
} from "@/types/api";
import { formatList, hashString, sample } from "./utils";

const apiKey = process.env.OPENAI_API_KEY;

const client = apiKey
  ? new OpenAI({
      apiKey
    })
  : null;

export function hasOpenAI(): boolean {
  return Boolean(client);
}

export async function generateTopics(
  payload: TopicsRequestBody
): Promise<TopicsResponseBody> {
  if (!client) {
    console.warn("OpenAI client unavailable; using fallback topics.", {
      recipeId: payload.recipe.id,
      vibe: payload.vibe
    });
    return buildTopicsFallback(payload);
  }

  const { recipe, vibe, people, previousHashes = [] } = payload;
  const dietary = recipe.dietFlags?.length ? formatList(recipe.dietFlags) : "none";
  const mainIngredients = "ingredients" in recipe ? recipe.ingredients : [];

  const prompt = [
    `Dish: ${recipe.title}`,
    `Cuisine: ${recipe.cuisine}`,
    `Main ingredients: ${formatList(mainIngredients) || "varied"}`,
    `Dietary context: ${dietary}`,
    `Vibe: ${vibe}, People: ${people}`,
    previousHashes.length
      ? `Avoid ideas similar to these hashes: ${previousHashes.join(", ")}`
      : ""
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input: [
        {
          role: "system",
          content:
            "You generate conversation starters and one fun food fact for a dinner."
        },
        {
          role: "user",
          content: `${prompt}\nOutput JSON with keys: starters (array of 3), fun_fact (string).\nConstraints: Must relate to this dish/cuisine/ingredients; family-friendly; avoid controversy and precise stats; each item 1–2 sentences.`
        }
      ]
    });

    const raw = response.output?.[0];
    const jsonText =
      raw && typeof raw === "object" && "content" in raw
        ? raw.content
        : response.output_text;

    const parsed = parseTopics(jsonText);
    if (!parsed) throw new Error("Invalid JSON payload");

    const hashes = [...parsed.starters, parsed.fun_fact].map(hashString);
    return { ...parsed, hashes };
  } catch (error) {
    console.warn("OpenAI topics generation failed; using fallback.", {
      error,
      recipeId: payload.recipe.id,
      vibe: payload.vibe
    });
    return buildTopicsFallback(payload);
  }
}

export async function generateSubstitutionDelta(
  body: SubstitutionExplainRequest
): Promise<SubstitutionExplainResponse> {
  if (!client) {
    return { delta: fallbackDelta(body.from, body.to) };
  }

  const { from, to, recipe } = body;
  try {
    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input: [
        {
          role: "system",
          content:
            "You write one-sentence cooking instruction adjustments when an ingredient is swapped."
        },
        {
          role: "user",
          content: `Recipe: ${recipe.title} (${recipe.cuisine})\nOriginal ingredient: ${from}\nReplacement: ${to}\nSteps: ${recipe.steps.join(
            " | "
          )}\nIn one concise sentence, say how cooking changes (time, order, prep). Output plain text only.`
        }
      ]
    });

    const text = response.output_text?.trim();
    return { delta: text && text.length ? text : fallbackDelta(from, to) };
  } catch (error) {
    console.warn("OpenAI substitution delta failed", error);
    return { delta: fallbackDelta(from, to) };
  }
}

function parseTopics(content: unknown): TopicsResponseBody | null {
  if (!content) return null;
  try {
    let text = "";
    if (typeof content === "string") {
      text = content;
    } else if (Array.isArray(content)) {
      text = content
        .map((part) => {
          if (typeof part === "string") return part;
          if (part && typeof part === "object" && "text" in part) {
            return (part as { text?: string }).text || "";
          }
          return "";
        })
        .join("");
    }
    const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (
      !parsed ||
      !Array.isArray(parsed.starters) ||
      parsed.starters.length !== 3 ||
      typeof parsed.fun_fact !== "string"
    ) {
      return null;
    }
    return {
      starters: parsed.starters.map((item: string) => item.trim()),
      fun_fact: parsed.fun_fact.trim()
    };
  } catch (error) {
    console.warn("Failed to parse topics payload", error);
    return null;
  }
}

function buildTopicsFallback(payload: TopicsRequestBody): TopicsResponseBody {
  const { recipe, vibe } = payload;
  const focusIngredient =
    "ingredients" in recipe && recipe.ingredients.length
      ? recipe.ingredients.slice(0, 3).join(", ")
      : recipe.tags?.slice(0, 3).join(", ") || recipe.title;

  const vibeKey = vibe.toLowerCase();
  const templates: Record<string, string[]> = {
    friends: [
      `What story about ${recipe.title} would make everyone laugh tonight?`,
      `Who in the group would host the next ${recipe.cuisine} night and what twist would they add?`,
      `If this ${recipe.title} became a standing tradition, what inside joke would it inspire?`
    ],
    family: [
      `Ask who in the family first fell for ${recipe.title} and why it stuck.`,
      `If ${recipe.title} were on every holiday table, what “family rule” would we create?`,
      `What memory from home does the aroma of ${focusIngredient} bring back?`
    ],
    date: [
      `What part of ${recipe.cuisine} feels most romantic to you—flavors, ambiance, or rituals?`,
      `If we planned a getaway inspired by ${recipe.title}, where are we going and what’s on the menu?`,
      `What small gesture would you pair with serving ${recipe.title} to make the night memorable?`
    ],
    colleagues: [
      `If ${recipe.title} kicked off a team retreat, what breakout session would you lead afterwards?`,
      `Who on the team would secretly crush a ${recipe.cuisine} cooking competition and why?`,
      `What work challenge would you toast to after sharing ${recipe.title}?`
    ],
    kids: [
      `If ${recipe.title} were a superhero, what powers would the ${focusIngredient} give it?`,
      `What silly name would you give this dish to convince everyone to try it?`,
      `If you opened a café serving ${recipe.cuisine}, what games or surprises would you add for guests?`
    ]
  };

  const vibeStarters = templates[vibeKey] ?? templates.friends;
  const starters = [
    sample(vibeStarters),
    sample(
      [
        `Which part of ${recipe.title}—${focusIngredient} or the way it’s served—steals the spotlight?`,
        `What playlist or movie would you pair with a night centered on ${recipe.title}?`,
        `If ${recipe.title} could speak, what story from ${recipe.cuisine} would it share with the table?`
      ],
      `What new twist would you add to ${recipe.title} to make it unforgettable?`
    ),
    sample(
      [
        `How would a ${vibe.toLowerCase()} dinner change if we swapped ${focusIngredient} for something unexpected?`,
        `What’s the most surprising conversation you’ve had over a ${recipe.cuisine} meal?`,
        `If we wrote a postcard about tonight’s ${recipe.title}, what flavor moment would we highlight?`
      ],
      `If we turned ${recipe.title} into a ritual, what heartfelt detail should never change?`
    )
  ];
  const funFacts = [
    `${recipe.cuisine} cooks often say balance is everything—${recipe.title} delivers it in every bite.`,
    `Many ${recipe.cuisine} staples began as humble, thrifty meals; ${recipe.title} is tradition with flair.`,
    `Serving ${recipe.title} is a nod to how ${recipe.cuisine} celebrates community around the table.`
  ];
  const fun_fact = sample(funFacts);
  const hashes = [...starters, fun_fact].map(hashString);
  return {
    starters,
    fun_fact,
    hashes
  };
}

function fallbackDelta(from: string, to: string): string {
  return `Swap ${from} for ${to} and adjust seasoning to taste.`;
}
