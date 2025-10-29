"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { ConversationPanel } from "./ConversationPanel";
import { IngredientSwap } from "./IngredientSwap";
import type { RecipeDetail } from "@/types/recipe";

type RecipeDrawerProps = {
  recipeId: string | null;
  open: boolean;
  onClose: () => void;
};

type RecipeResponse = {
  recipe: RecipeDetail;
};

const fetcher = async (url: string): Promise<RecipeResponse> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
  return res.json();
};

const DEFAULT_VIBE = "Friends";
const DEFAULT_PEOPLE = 4;

export function RecipeDrawer({ recipeId, open, onClose }: RecipeDrawerProps) {
  const { data, error, isLoading } = useSWR<RecipeResponse>(
    open && recipeId ? `/api/recipes/${encodeURIComponent(recipeId)}` : null,
    fetcher,
    {
      revalidateOnFocus: false
    }
  );

  const recipe = data?.recipe;

  const [topics, setTopics] = useState<{ starters: string[]; fun_fact: string } | null>(null);
  const [hashes, setHashes] = useState<string[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicsError, setTopicsError] = useState<string | null>(null);
  const hashesRef = useRef<string[]>([]);

  const dietFilters = useMemo(() => recipe?.dietFlags ?? [], [recipe?.dietFlags]);

  const loadTopics = useCallback(
    async (resetHashes: boolean) => {
      if (!recipe) return;
      setTopicsLoading(true);
      setTopicsError(null);
      try {
        const response = await fetch("/api/topics", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            recipe,
            vibe: DEFAULT_VIBE,
            people: DEFAULT_PEOPLE,
            previousHashes: resetHashes ? [] : hashesRef.current
          })
        });
        if (!response.ok) throw new Error(`Topic generation failed: ${response.status}`);
        const payload = (await response.json()) as {
          starters: string[];
          fun_fact: string;
          hashes?: string[];
        };
        const nextTopics = {
          starters: payload.starters,
          fun_fact: payload.fun_fact
        };
        setTopics(nextTopics);
        const nextHashes = payload.hashes ?? [];
        hashesRef.current = nextHashes;
        setHashes(nextHashes);
      } catch (err) {
        console.error(err);
        setTopicsError("We’ll riff on house topics while the AI rests.");
      } finally {
        setTopicsLoading(false);
      }
    },
    [recipe]
  );

  useEffect(() => {
    if (!open) {
      setTopics(null);
      setHashes([]);
      hashesRef.current = [];
      setTopicsError(null);
    }
  }, [open]);

  useEffect(() => {
    if (open && recipe) {
      loadTopics(true);
    }
  }, [open, recipe, loadTopics]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    if (open) {
      document.addEventListener("keydown", handleKey);
      return () => document.removeEventListener("keydown", handleKey);
    }
    return undefined;
  }, [open, onClose]);

  if (!open || !recipeId) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl transition dark:border-slate-800 dark:bg-slate-950 sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-6 top-6 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-400 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:text-slate-300"
          aria-label="Close recipe drawer"
        >
          ×
        </button>
        <div className="grid max-h-[calc(100vh-4rem)] gap-8 overflow-y-auto p-6 sm:grid-cols-[minmax(0,1fr)_320px] sm:gap-10 sm:p-10">
          <div className="space-y-6">
            {isLoading && (
              <div className="space-y-4">
                <div className="h-8 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-3 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800"
                    />
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                Couldn’t load recipe details. Try another dish.
              </div>
            )}

            {recipe && (
              <>
                <header className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500 dark:text-indigo-300">
                    {recipe.cuisine}
                  </p>
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                    {recipe.title}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {recipe.description}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {recipe.timeMinutes} min
                    </span>
                    {recipe.dietFlags.map((flag) => (
                      <span
                        key={flag}
                        className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300"
                      >
                        {flag}
                      </span>
                    ))}
                  </div>
                </header>

                <section className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Ingredients
                  </h3>
                  <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-200">
                    {recipe.ingredients.map((ingredient) => (
                      <li key={ingredient} className="rounded-2xl bg-slate-100/70 p-3 dark:bg-slate-900/60">
                        {ingredient}
                        <IngredientSwap
                          ingredient={ingredient}
                          dietFilters={dietFilters}
                          recipeTitle={recipe.title}
                          cuisine={recipe.cuisine}
                          steps={recipe.steps}
                        />
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Steps
                  </h3>
                  <ol className="space-y-3 text-sm text-slate-700 dark:text-slate-200">
                    {recipe.steps.map((step, index) => (
                      <li key={index} className="flex gap-3 rounded-2xl bg-white/60 p-3 shadow-sm dark:bg-slate-900/70">
                        <span className="mt-1 inline-flex h-7 w-7 flex-none items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-200">
                          {index + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              </>
            )}
          </div>

          <div className="space-y-4">
            {topicsError && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/30 dark:text-amber-200">
                {topicsError}
              </div>
            )}
            <ConversationPanel
              loading={topicsLoading}
              topics={topics}
              onRegenerate={() => loadTopics(false)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
