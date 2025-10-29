import type { DietFlag, RecipeSummary } from "@/types/recipe";

export function matchesDiet(recipe: RecipeSummary, diets: string[]): boolean {
  if (!diets.length) return true;
  const normalized = diets.map((diet) => diet.toLowerCase());
  return normalized.every((diet) =>
    recipe.dietFlags.some((flag) => flag.toLowerCase() === diet)
  );
}

export function matchesExclusions(recipe: RecipeSummary, exclude: string[]): boolean {
  if (!exclude.length) return true;
  const normalized = exclude.map((value) => value.toLowerCase());
  const haystack = [
    recipe.title,
    recipe.description,
    recipe.cuisine,
    recipe.tags.join(" "),
    ...(recipe as any).ingredients ?? []
  ]
    .join(" ")
    .toLowerCase();
  return !normalized.some((term) => haystack.includes(term));
}

export function normalizeDietFilters(values: string[] = []): DietFlag[] {
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
  const set = new Set(values.map((value) => value.trim().toLowerCase()));
  return allowed.filter((flag) => set.has(flag.toLowerCase()));
}
