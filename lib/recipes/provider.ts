import type { RecipeDetail, RecipeSummary } from "@/types/recipe";
import { LocalRecipeProvider } from "./local";
import { SpoonacularRecipeProvider } from "./spoonacular";
import { EdamamRecipeProvider } from "./edamam";

export interface RecipeProvider {
  search(params: {
    q?: string;
    diet: string[];
    have: string[];
    exclude: string[];
    people: number;
  }): Promise<RecipeSummary[]>;
  getById(id: string): Promise<RecipeDetail | null>;
}

let provider: RecipeProvider | null = null;

export function getRecipeProvider(): RecipeProvider {
  if (provider) return provider;

  const spoonacularKey = process.env.SPOONACULAR_API_KEY;
  const edamamId = process.env.EDAMAM_APP_ID;
  const edamamKey = process.env.EDAMAM_APP_KEY;

  if (spoonacularKey) {
    provider = new SpoonacularRecipeProvider(spoonacularKey);
    return provider;
  }

  if (edamamId && edamamKey) {
    provider = new EdamamRecipeProvider(edamamId, edamamKey);
    return provider;
  }

  provider = new LocalRecipeProvider();
  return provider;
}
