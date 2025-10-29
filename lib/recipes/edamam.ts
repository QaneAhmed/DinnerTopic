import { matchesDiet, matchesExclusions, normalizeDietFilters } from "@/lib/filters";
import { applyMatchScore, scoreRecipe } from "@/lib/scoring";
import type { DietFlag, RecipeDetail, RecipeSummary } from "@/types/recipe";
import { LocalRecipeProvider } from "./local";
import type { RecipeProvider } from "./provider";

type EdamamHit = {
  recipe: {
    uri: string;
    label: string;
    image?: string;
    cuisineType?: string[];
    totalTime?: number;
    ingredientLines: string[];
    yield?: number;
    dietLabels?: string[];
    healthLabels?: string[];
    mealType?: string[];
    dishType?: string[];
    instructions?: string[];
    url?: string;
  };
};

export class EdamamRecipeProvider implements RecipeProvider {
  private fallback = new LocalRecipeProvider();

  constructor(private appId: string, private appKey: string) {}

  async search(params: {
    q?: string;
    diet: string[];
    have: string[];
    exclude: string[];
    people: number;
  }): Promise<RecipeSummary[]> {
    const url = new URL("https://api.edamam.com/api/recipes/v2");
    url.searchParams.set("type", "public");
    url.searchParams.set("app_id", this.appId);
    url.searchParams.set("app_key", this.appKey);
    url.searchParams.set("random", "false");
    url.searchParams.set("field", "uri");
    url.searchParams.append("field", "label");
    url.searchParams.append("field", "image");
    url.searchParams.append("field", "cuisineType");
    url.searchParams.append("field", "totalTime");
    url.searchParams.append("field", "ingredientLines");
    url.searchParams.append("field", "dietLabels");
    url.searchParams.append("field", "healthLabels");
    url.searchParams.append("field", "dishType");
    url.searchParams.append("field", "mealType");
    if (params.q) url.searchParams.set("q", params.q);
    if (params.diet.length) {
      params.diet.forEach((diet) => url.searchParams.append("health", diet));
    }
    params.exclude.forEach((item) => url.searchParams.append("excluded", item));

    try {
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Edamam search failed with ${response.status}`);
      }
      const data = (await response.json()) as { hits: EdamamHit[] };
      const dietFilters = normalizeDietFilters(params.diet);
      const have = params.have.map((item) => item.toLowerCase());
      const exclude = params.exclude.map((item) => item.toLowerCase());

      const mapped = data.hits
        .map((hit) => toDetail(hit.recipe))
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
    const uri = decodeURIComponent(id);
    const url = new URL("https://api.edamam.com/api/recipes/v2/by-uri");
    url.searchParams.set("type", "public");
    url.searchParams.set("app_id", this.appId);
    url.searchParams.set("app_key", this.appKey);
    url.searchParams.append("uri", uri);

    try {
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Edamam detail failed with ${response.status}`);
      }
      const data = (await response.json()) as { hits: EdamamHit[] };
      const recipe = data.hits?.[0]?.recipe;
      return recipe ? toDetail(recipe) : this.fallback.getById(id);
    } catch (error) {
      console.warn("Falling back to local provider for detail", error);
      return this.fallback.getById(id);
    }
  }
}

function toDetail(recipe: EdamamHit["recipe"]): RecipeDetail {
  const id = encodeURIComponent(recipe.uri);
  const dietFlags = normalizeDietFlags([
    ...(recipe.dietLabels ?? []),
    ...(recipe.healthLabels ?? [])
  ]);

  const steps =
    recipe.instructions && recipe.instructions.length
      ? recipe.instructions
      : [
          "Review the linked instructions.",
          "Follow steps, adjusting seasoning to taste."
        ];

  return {
    id,
    title: recipe.label,
    description: `Inspired by Edamam reference: ${recipe.url ?? "See instructions link."}`,
    image: recipe.image ?? "/placeholder.jpg",
    timeMinutes: recipe.totalTime && recipe.totalTime > 0 ? recipe.totalTime : 35,
    cuisine: recipe.cuisineType?.[0] ?? "Global",
    dietFlags,
    tags: recipe.dishType ?? recipe.mealType ?? [],
    ingredients: recipe.ingredientLines ?? [],
    steps
  };
}

function normalizeDietFlags(flags: string[] = []): DietFlag[] {
  if (!flags.length) return [];
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
  const set = new Set(flags.map((flag) => flag.toLowerCase()));
  return allowed.filter((flag) => set.has(flag.toLowerCase()));
}
