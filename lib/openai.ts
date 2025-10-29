import OpenAI from "openai";
import type {
  SubstitutionExplainRequest,
  SubstitutionExplainResponse,
  TopicsRequestBody,
  TopicsResponseBody
} from "@/types/api";
import { formatList, hashString } from "./utils";

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
    "ingredients" in recipe ? recipe.ingredients.slice(0, 3).join(", ") : recipe.title;
  const starters = [
    `Ask which memory this ${recipe.cuisine} classic stirs up while everyone samples the ${recipe.title}.`,
    `Invite the table to guess which ingredient—${focusIngredient}—makes ${recipe.title} shine.`,
    `If we hosted a ${vibe.toLowerCase()} dinner around ${recipe.title} every year, what new ritual would we add next time?`
  ];
  const fun_fact = `${recipe.cuisine} cooks often say balance is everything—${recipe.title} delivers it in every bite.`;
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
