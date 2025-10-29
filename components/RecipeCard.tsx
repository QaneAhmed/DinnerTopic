import type { RecipeSummary } from "@/types/recipe";
import clsx from "clsx";

type RecipeCardProps = {
  recipe: RecipeSummary;
  onSelect: (recipe: RecipeSummary) => void;
};

export function RecipeCard({ recipe, onSelect }: RecipeCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(recipe)}
      className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:border-indigo-400 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900"
    >
      <div
        className="relative h-44 w-full bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.05), rgba(15,23,42,0.25)), url(${recipe.image || "/placeholder.jpg"})`
        }}
        aria-hidden
      />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-lg font-semibold text-slate-800 transition group-hover:text-indigo-600 dark:text-slate-100">
            {recipe.title}
          </h3>
          <span className="whitespace-nowrap rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
            {recipe.timeMinutes} min
          </span>
        </div>
        <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
          {recipe.description}
        </p>
        <div className="mt-auto flex flex-wrap gap-2">
          <Badge>{recipe.cuisine}</Badge>
          {recipe.dietFlags.slice(0, 2).map((flag) => (
            <Badge key={flag} variant="muted">
              {flag}
            </Badge>
          ))}
          {typeof recipe.matchScore === "number" && (
            <span className="ml-auto text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Match {Math.round(recipe.matchScore * 100)}%
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

type BadgeProps = {
  children: React.ReactNode;
  variant?: "default" | "muted";
};

function Badge({ children, variant = "default" }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        variant === "default"
          ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
          : "bg-slate-50 text-slate-500 dark:bg-slate-800/80 dark:text-slate-300"
      )}
    >
      {children}
    </span>
  );
}
