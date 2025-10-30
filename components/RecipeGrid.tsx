import { useEffect, useMemo, useRef, useState } from "react";
import type { RecipeSummary } from "@/types/recipe";
import { RecipeCard, type PeekTopics } from "./RecipeCard";

type RecipeGridProps = {
  loading?: boolean;
  error?: string | null;
  results: RecipeSummary[];
  onSelect: (recipe: RecipeSummary, preview?: PeekTopics | null) => void;
  off?: boolean;
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

function buildOffTableFallback(recipe: RecipeSummary): OffTableEntry {
  return {
    id: recipe.id,
    offTitle: `Maybe skip talking about ${recipe.title}`,
    starters: [
      "Ask about everyone's exes (actually, maybe not).",
      "Bring up politics before dessert (probably a terrible idea).",
      "Compare salaries around the table (nope!)."
    ],
    fun_fact: "Fun (don’t) fact: Nothing ends dinner faster than mixing in money, exes, or politics."
  };
}

type OffTableEntry = {
  id: string;
  offTitle: string;
  starters: string[];
  fun_fact: string;
};

function useTopicPreviews(recipes: RecipeSummary[], enabled: boolean) {
  const cacheRef = useRef<Record<string, PeekTopics>>({});
  const [previews, setPreviews] = useState<Record<string, PeekTopics>>({});

  const idsKey = recipes.map((recipe) => recipe.id).sort().join("|");

  useEffect(() => {
    if (!enabled) {
      setPreviews({});
      return;
    }
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
  }, [enabled, idsKey, recipes]);

  useEffect(() => {
    if (!enabled) {
      return () => undefined;
    }
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
  }, [enabled, idsKey, recipes]);

  return previews;
}

export function RecipeGrid({
  loading = false,
  error,
  results,
  onSelect,
  off = false
}: RecipeGridProps) {
  const previews = useTopicPreviews(results, !off);
  const idsKey = useMemo(() => results.map((recipe) => recipe.id).sort().join("|"), [results]);
  const [offTable, setOffTable] = useState<Record<string, OffTableEntry>>({});

  useEffect(() => {
    let ignore = false;
    if (!off || !results.length) {
      setOffTable({});
      return;
    }

    setOffTable({});

    (async () => {
      try {
        const payload = {
          recipes: results.map((recipe) => ({
            id: recipe.id,
            title: recipe.title,
            cuisine: recipe.cuisine
          }))
        };
        const res = await fetch("/api/offtable", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Off-table request failed");
        const data = (await res.json()) as { items: OffTableEntry[] };
        if (!ignore) {
          const map: Record<string, OffTableEntry> = {};
          const incoming = new Map(data.items.map((item) => [item.id, item]));
          results.forEach((recipe) => {
            const found = incoming.get(recipe.id);
            map[recipe.id] = found ?? buildOffTableFallback(recipe);
          });
          setOffTable(map);
        }
      } catch {
        if (!ignore) {
          const fallback: Record<string, OffTableEntry> = {};
          results.forEach((recipe) => {
            fallback[recipe.id] = buildOffTableFallback(recipe);
          });
          setOffTable(fallback);
        }
        return;
      }
    })();

    return () => {
      ignore = true;
    };
  }, [off, idsKey, results]);

  const enrichedResults = useMemo(() => {
    if (!off) return results;
    return results.map((recipe) => {
      const offEntry = offTable[recipe.id];
      return offEntry
        ? {
            ...recipe,
            offTitle: offEntry.offTitle,
            offStarters: offEntry.starters,
            offFunFact: offEntry.fun_fact
          }
        : recipe;
    });
  }, [off, offTable, results]);

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
      {enrichedResults.map((recipe) => {
        const initial =
          off && recipe.offStarters && recipe.offFunFact
            ? { starters: recipe.offStarters, fun_fact: recipe.offFunFact }
            : !off
            ? previews[recipe.id] ?? null
            : null;
        return (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            onOpen={onSelect}
            initialPreview={initial}
            off={off}
          />
        );
      })}
    </div>
  );
}
