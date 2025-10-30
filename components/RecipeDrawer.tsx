"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { ConversationPanel } from "./ConversationPanel";
import { IngredientSwap } from "./IngredientSwap";
import type { RecipeDetail, RecipeSummary } from "@/types/recipe";
import { hashString } from "@/lib/utils";

type RecipeDrawerProps = {
  recipeId: string | null;
  open: boolean;
  onClose: () => void;
  initialTopics?: { starters: string[]; fun_fact: string } | null;
  off?: boolean;
  summary?: RecipeSummary | null;
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

export function RecipeDrawer({
  recipeId,
  open,
  onClose,
  initialTopics,
  off = false,
  summary = null
}: RecipeDrawerProps) {
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
  const displayTitle = off
    ? summary?.offTitle ?? recipe?.title ?? summary?.title ?? ""
    : recipe?.title ?? summary?.title ?? "";

  const loadTopics = useCallback(
    async (resetHashes: boolean) => {
      if (off) return;
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
        const nextHashes = payload.hashes ?? [...payload.starters, payload.fun_fact].map(hashString);
        hashesRef.current = nextHashes;
        setHashes(nextHashes);
      } catch (err) {
        console.error(err);
        setTopicsError("We’ll riff on house topics while the AI rests.");
      } finally {
        setTopicsLoading(false);
      }
    },
    [off, recipe]
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
    if (off) {
      if (initialTopics) {
        setTopics(initialTopics);
      }
      setTopicsLoading(false);
      setTopicsError(null);
    }
  }, [off, initialTopics]);

  useEffect(() => {
    if (!open) return;
    if (initialTopics) {
      setTopics(initialTopics);
      const nextHashes = [...initialTopics.starters, initialTopics.fun_fact].map(hashString);
      hashesRef.current = nextHashes;
      setHashes(nextHashes);
      setTopicsLoading(false);
      setTopicsError(null);
    }
  }, [initialTopics, open]);

  useEffect(() => {
    if (off) return;
    if (open && recipe) {
      if (!initialTopics) {
        loadTopics(true);
      }
    }
  }, [off, open, recipe, loadTopics, initialTopics]);

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
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur-md sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-t-3xl border border-zinc-800/70 bg-app-bg/95 shadow-modal transition sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-6 top-6 inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700/80 text-zinc-300 transition hover:border-accent-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
          aria-label="Close recipe drawer"
        >
          ×
        </button>
        <div className="grid max-h-[calc(100vh-4rem)] gap-8 overflow-y-auto p-6 pb-16 pt-16 sm:grid-cols-[minmax(0,1fr)_320px] sm:gap-10 sm:p-10 sm:pt-20">
          <div className="surface border-zinc-800/70 bg-zinc-950/80 space-y-6 p-6 md:p-8">
            {isLoading && (
              <div className="space-y-4">
                <div className="h-8 w-3/4 animate-pulse rounded bg-zinc-800/60" />
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-3 w-full animate-pulse rounded bg-zinc-800/60"
                    />
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
                Couldn’t load recipe details. Try another dish.
              </div>
            )}

            {recipe && (
              <>
                <header className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent-300">
                    {recipe.cuisine}
                  </p>
                  <h2 className="text-2xl font-semibold text-zinc-100">{displayTitle}</h2>
                  {off && (
                    <p className="text-xs meta">🙊 Off-Table Mode — cheeky titles, hover previews disabled</p>
                  )}
                  <p className="text-sm text-zinc-300">
                    {recipe.description}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-4">
                    <span className="badge-time text-xs font-semibold">
                      {recipe.timeMinutes} min
                    </span>
                    {recipe.dietFlags.map((flag) => (
                      <span
                        key={flag}
                        className="badge text-xs font-semibold text-zinc-200"
                      >
                        {flag}
                      </span>
                    ))}
                  </div>
                </header>

                <section className="space-y-4">
                  <h3 className="text-lg font-semibold text-zinc-100">
                    Ingredients
                  </h3>
                  <ul className="rounded-2xl border border-zinc-800/60 bg-zinc-900/60 text-sm text-zinc-200">
                    {recipe.ingredients.map((ingredient) => (
                      <li key={ingredient} className="list-row text-sm text-zinc-100">
                        <span>{ingredient}</span>
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
                  <h3 className="text-lg font-semibold text-zinc-100">
                    Steps
                  </h3>
                  <ol className="step-list">
                    {recipe.steps.map((step, index) => (
                      <li key={index} className="step-row">
                        <span className="step-index">{index + 1}</span>
                        <span className="step-body">{step}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              </>
            )}
          </div>

          <div className="space-y-4">
            {topicsError && (
              <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-3 text-xs text-amber-100">
                {topicsError}
              </div>
            )}
            <ConversationPanel
              loading={topicsLoading}
              topics={topics}
              onRegenerate={() => loadTopics(false)}
              off={off}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
