import { matchesDiet, matchesExclusions, normalizeDietFilters } from "@/lib/filters";
import { applyMatchScore, scoreRecipe } from "@/lib/scoring";
import type { DietFlag, RecipeDetail, RecipeSummary } from "@/types/recipe";
import { LocalRecipeProvider } from "./local";
import type { RecipeProvider } from "./provider";

type SpoonacularSearchResult = {
  id: number;
  title: string;
  summary: string;
  image: string;
  readyInMinutes: number;
  cuisines: string[];
  diets: string[];
  dishTypes: string[];
  extendedIngredients?: { original: string; name: string }[];
  analyzedInstructions?: { steps: { number: number; step: string }[] }[];
};

export class SpoonacularRecipeProvider implements RecipeProvider {
  private fallback = new LocalRecipeProvider();

  constructor(private apiKey: string) {}

  async search(params: {
    q?: string;
    diet: string[];
    have: string[];
    exclude: string[];
    people: number;
  }): Promise<RecipeSummary[]> {
    const url = new URL("https://api.spoonacular.com/recipes/complexSearch");
    url.searchParams.set("apiKey", this.apiKey);
    url.searchParams.set("number", "30");
    url.searchParams.set("addRecipeInformation", "true");
    if (params.q) url.searchParams.set("query", params.q);
    if (params.have.length) url.searchParams.set("includeIngredients", params.have.join(","));
    if (params.exclude.length)
      url.searchParams.set("excludeIngredients", params.exclude.join(","));
    if (params.diet.length) url.searchParams.set("diet", params.diet.join(","));

    try {
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Spoonacular search failed with ${response.status}`);
      }

      const data = (await response.json()) as { results: SpoonacularSearchResult[] };
      const dietFilters = normalizeDietFilters(params.diet);
      const have = params.have.map((item) => item.toLowerCase());
      const exclude = params.exclude.map((item) => item.toLowerCase());

      const mapped = data.results
        .map((item) => toDetail(item))
        .filter((recipe) => {
          if (dietFilters.length && !matchesDiet(recipe, dietFilters)) return false;
          if (exclude.length && !matchesExclusions(recipe, exclude)) return false;
          return true;
        })
        .map((recipe) => {
          const score = scoreRecipe({ recipe, have, exclude, diets: dietFilters });
          const { ingredients, steps, ...summary } = recipe;
          return applyMatchScore(summary, score);
        });

      return mapped.sort((a, b) => {
        const scoreDelta = (b.matchScore ?? 0) - (a.matchScore ?? 0);
        if (Math.abs(scoreDelta) > 0.0001) return scoreDelta;
        return a.timeMinutes - b.timeMinutes;
      });
    } catch (error) {
      console.warn("Falling back to local provider for search", error);
      return this.fallback.search(params);
    }
  }

  async getById(id: string): Promise<RecipeDetail | null> {
    const url = new URL(`https://api.spoonacular.com/recipes/${id}/information`);
    url.searchParams.set("apiKey", this.apiKey);

    try {
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Spoonacular detail failed with ${response.status}`);
      }
      const data = (await response.json()) as SpoonacularSearchResult;
      return toDetail(data);
    } catch (error) {
      console.warn("Falling back to local provider for detail", error);
      return this.fallback.getById(id);
    }
  }
}

function toDetail(record: SpoonacularSearchResult): RecipeDetail {
  const ingredients =
    record.extendedIngredients?.map((item) => item.original.trim()) ?? [];
  const steps =
    record.analyzedInstructions?.[0]?.steps.map((step) => step.step.trim()) ??
    ["Prepare ingredients", "Cook according to instructions."];

  return {
    id: String(record.id),
    title: record.title,
    description: stripHtml(record.summary ?? "").trim(),
    image: record.image || "/placeholder.jpg",
    timeMinutes: record.readyInMinutes ?? 30,
    cuisine: record.cuisines?.[0] ?? "Fusion",
    dietFlags: normalizeDietFlags(record.diets),
    tags: record.dishTypes ?? [],
    ingredients,
    steps
  };
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, "");
}

function normalizeDietFlags(diets: string[] = []): DietFlag[] {
  if (!diets.length) return [];
  const allowed: DietFlag[] = [
    "Vegetarian",
    "Vegan",
    "Gluten-Free",
    "Dairy-Free",
    "Nut-Free",
    "Halal",
    "Kosher",
    "Pescatarian"
  ];
  const set = new Set(diets.map((diet) => diet.toLowerCase()));
  return allowed.filter((flag) => set.has(flag.toLowerCase()));
}
