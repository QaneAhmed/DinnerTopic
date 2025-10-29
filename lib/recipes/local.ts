import recipesData from "@/data/recipes.sample.json" assert { type: "json" };
import { normalizeDietFilters, matchesDiet, matchesExclusions } from "@/lib/filters";
import { applyMatchScore, scoreRecipe } from "@/lib/scoring";
import type { RecipeDetail, RecipeSummary } from "@/types/recipe";
import type { RecipeProvider } from "./provider";

type LocalRecipe = RecipeDetail;

const recipes = (recipesData as LocalRecipe[]).map((recipe) => ({
  ...recipe,
  ingredients: [...recipe.ingredients],
  steps: [...recipe.steps]
}));

const index = new Map<string, LocalRecipe>();
recipes.forEach((recipe) => {
  index.set(recipe.id, recipe);
});

export class LocalRecipeProvider implements RecipeProvider {
  async search(params: {
    q?: string;
    diet: string[];
    have: string[];
    exclude: string[];
    people: number;
  }): Promise<RecipeSummary[]> {
    const q = params.q?.toLowerCase() ?? "";
    const dietFilters = normalizeDietFilters(params.diet);
    const have = params.have.map((item) => item.toLowerCase());
    const exclude = params.exclude.map((item) => item.toLowerCase());

    const filtered = recipes.filter((recipe) => {
      if (dietFilters.length && !matchesDiet(recipe, dietFilters)) {
        return false;
      }
      if (exclude.length && !matchesExclusions(recipe, exclude)) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        recipe.title,
        recipe.description,
        recipe.cuisine,
        recipe.tags.join(" "),
        recipe.ingredients.join(" ")
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });

    const scored = filtered.map((recipe) => {
      const score = scoreRecipe({
        recipe,
        have,
        exclude,
        diets: dietFilters
      });
      const { ingredients, steps, ...summary } = recipe;
      return applyMatchScore(summary, score);
    });

    return scored.sort((a, b) => {
      const scoreDelta = (b.matchScore ?? 0) - (a.matchScore ?? 0);
      if (Math.abs(scoreDelta) > 0.0001) return scoreDelta;
      return a.timeMinutes - b.timeMinutes;
    });
  }

  async getById(id: string): Promise<RecipeDetail | null> {
    const record = index.get(id);
    if (!record) return null;
    return { ...record, ingredients: [...record.ingredients], steps: [...record.steps] };
  }
}
