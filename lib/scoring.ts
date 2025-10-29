import type { RecipeDetail, RecipeSummary } from "@/types/recipe";

const PENALTY = 0.2;
const BONUS = 0.15;

export function scoreRecipe(options: {
  recipe: RecipeDetail;
  have: string[];
  exclude: string[];
  diets: string[];
}): number {
  const { recipe, have, exclude, diets } = options;
  const ingredientSet = recipe.ingredients.map((ingredient) => ingredient.toLowerCase());

  const matched = have.filter((item) =>
    ingredientSet.some((ingredient) => ingredient.includes(item.toLowerCase()))
  );

  const disallowed = exclude.filter((item) =>
    ingredientSet.some((ingredient) => ingredient.includes(item.toLowerCase()))
  );

  const dietMatch =
    diets.length &&
    diets.every((diet) =>
      recipe.dietFlags.some((flag) => flag.toLowerCase() === diet.toLowerCase())
    );

  const base = matched.length / Math.max(recipe.ingredients.length, 1);
  const penalty = disallowed.length * PENALTY;
  const bonus = dietMatch ? BONUS : 0;

  const score = base - penalty + bonus;
  return clamp(score, 0, 1);
}

export function applyMatchScore<T extends RecipeSummary>(
  recipe: T,
  score: number
): T {
  return { ...recipe, matchScore: Number(score.toFixed(3)) };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
