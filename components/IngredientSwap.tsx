"use client";

import { useState } from "react";
import { getSubstitutionOptions } from "@/lib/substitutions";

type IngredientSwapProps = {
  ingredient: string;
  dietFilters: string[];
  recipeTitle: string;
  cuisine: string;
  steps: string[];
};

export function IngredientSwap({
  ingredient,
  dietFilters,
  recipeTitle,
  cuisine,
  steps
}: IngredientSwapProps) {
  const [open, setOpen] = useState(false);
  const [delta, setDelta] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestions = getSubstitutionOptions(ingredient, dietFilters);

  const chooseOption = async (option: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/substitutions/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: ingredient,
          to: option,
          recipe: {
            title: recipeTitle,
            cuisine,
            steps
          }
        })
      });
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      const data = (await response.json()) as { delta: string };
      setDelta(data.delta);
    } catch (err) {
      console.error(err);
      setError("Couldn’t get a cooking tip right now.");
    } finally {
      setLoading(false);
    }
  };

  if (!suggestions.length) return null;

  return (
    <div className="mt-1 text-xs text-accent-200">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-1 rounded-full border border-accent-500/40 bg-zinc-900/70 px-3 py-1 text-xs font-semibold text-accent-200 transition hover:border-accent-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
        aria-expanded={open}
      >
        Swap ingredient
      </button>
      {open && (
        <div className="mt-2 space-y-2 rounded-2xl border border-zinc-800/70 bg-zinc-900/80 p-3 text-zinc-200 shadow-indigo-soft">
          <p className="text-xs font-semibold text-accent-200">
            Alternatives for {ingredient}:
          </p>
          <div className="flex flex-col gap-2">
            {suggestions.map(({ option, hint }) => (
              <button
                key={option}
                type="button"
                className="rounded-xl border border-zinc-800/70 bg-zinc-950/70 px-3 py-2 text-left text-xs font-medium text-zinc-200 transition hover:border-accent-400 hover:text-accent-200 focus:outline-none focus:ring-2 focus:ring-accent-500"
                onClick={() => chooseOption(option)}
                disabled={loading}
              >
                <span className="block font-semibold text-zinc-100">
                  {option}
                </span>
                {hint && <span className="block text-[11px] text-zinc-400">{hint}</span>}
              </button>
            ))}
          </div>
          {loading && <p className="text-[11px] text-zinc-500">Drafting adjustment…</p>}
          {delta && !loading && (
            <p className="rounded-xl border border-accent-500/40 bg-accent-500/10 p-2 text-[11px] text-accent-200">
              {delta}
            </p>
          )}
          {error && (
            <p className="text-[11px] text-rose-300">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
