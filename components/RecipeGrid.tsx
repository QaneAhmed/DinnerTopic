import { useEffect, useRef, useState } from "react";
import type { RecipeSummary } from "@/types/recipe";
import { RecipeCard, type PeekTopics } from "./RecipeCard";

type RecipeGridProps = {
  loading?: boolean;
  error?: string | null;
  results: RecipeSummary[];
  onSelect: (recipe: RecipeSummary, preview?: PeekTopics | null) => void;
};

function buildFallbackPreview(recipe: RecipeSummary): PeekTopics {
  const cuisine = recipe.cuisine ?? "this cuisine";
  return {
    starters: [
      `What part of ${cuisine} instantly pulls you in—spice, comfort, or stories?`,
      `If we made ${recipe.title} a weekly ritual, what small twist would keep it fun?`
    ],
    fun_fact: `${cuisine} classics often started as resourceful home cooking—easy fuel for a great conversation.`
  };
}

function useTopicPreviews(recipes: RecipeSummary[]) {
  const cacheRef = useRef<Record<string, PeekTopics>>({});
  const [previews, setPreviews] = useState<Record<string, PeekTopics>>({});

  const idsKey = recipes.map((recipe) => recipe.id).sort().join("|");

  useEffect(() => {
    setPreviews((prev) => {
      const merged = { ...prev };
      recipes.forEach((recipe) => {
        const cached = cacheRef.current[recipe.id];
        if (cached) {
          merged[recipe.id] = cached;
        }
      });
      return merged;
    });
  }, [idsKey, recipes]);

  useEffect(() => {
    let cancelled = false;
    const pending = recipes.filter((recipe) => !cacheRef.current[recipe.id]);
    if (!pending.length) return () => {
      cancelled = true;
    };

    (async () => {
      for (const recipe of pending) {
        if (cancelled) break;
        try {
          const res = await fetch("/api/topics", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              preview: true,
              recipe: {
                title: recipe.title,
                cuisine: recipe.cuisine,
                ingredients: recipe.tags?.slice(0, 6) ?? []
              }
            })
          });
          const data = (await res.json()) as PeekTopics;
          if (cancelled) break;
          cacheRef.current[recipe.id] = data;
          setPreviews((prev) => ({ ...prev, [recipe.id]: data }));
        } catch (error) {
          const fallback = buildFallbackPreview(recipe);
          if (cancelled) break;
          cacheRef.current[recipe.id] = fallback;
          setPreviews((prev) => ({ ...prev, [recipe.id]: fallback }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [idsKey, recipes]);

  return previews;
}

export function RecipeGrid({
  loading = false,
  error,
  results,
  onSelect
}: RecipeGridProps) {
  const previews = useTopicPreviews(results);
  if (error) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-200">
        {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 max-w-screen-lg mx-auto">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-72 animate-pulse rounded-2xl border border-zinc-800/60 bg-zinc-900/40"
          />
        ))}
      </div>
    );
  }

  if (!results.length) {
    return (
      <div className="card mx-auto max-w-3xl p-6 text-sm text-zinc-300">
        Try adjusting your filters or click “Surprise me” for chef-tested favorites.
      </div>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 max-w-screen-lg mx-auto">
      {results.map((recipe) => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          onOpen={onSelect}
          initialPreview={previews[recipe.id] ?? null}
        />
      ))}
    </div>
  );
}
