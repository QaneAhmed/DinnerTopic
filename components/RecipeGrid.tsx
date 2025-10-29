import type { RecipeSummary } from "@/types/recipe";
import { RecipeCard } from "./RecipeCard";

type RecipeGridProps = {
  loading?: boolean;
  error?: string | null;
  results: RecipeSummary[];
  onSelect: (recipe: RecipeSummary) => void;
};

export function RecipeGrid({
  loading = false,
  error,
  results,
  onSelect
}: RecipeGridProps) {
  if (error) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-200">
        {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-72 animate-pulse rounded-3xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800/50"
          />
        ))}
      </div>
    );
  }

  if (!results.length) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white/60 p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
        Try adjusting your filters or click “Surprise me” for chef-tested favorites.
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {results.map((recipe) => (
        <RecipeCard key={recipe.id} recipe={recipe} onSelect={onSelect} />
      ))}
    </div>
  );
}
