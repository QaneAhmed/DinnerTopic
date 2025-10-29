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
    <div className="mt-1 text-xs text-indigo-600">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-full border border-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-indigo-500/40 dark:text-indigo-300"
        aria-expanded={open}
      >
        Swap ingredient
      </button>
      {open && (
        <div className="mt-2 space-y-2 rounded-2xl border border-slate-200 bg-white p-3 text-slate-600 shadow-md dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <p className="text-xs font-semibold text-slate-500">
            Alternatives for {ingredient}:
          </p>
          <div className="flex flex-col gap-2">
            {suggestions.map(({ option, hint }) => (
              <button
                key={option}
                type="button"
                className="rounded-xl border border-slate-200 px-3 py-2 text-left text-xs font-medium text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:text-slate-200"
                onClick={() => chooseOption(option)}
                disabled={loading}
              >
                <span className="block font-semibold text-slate-700 dark:text-slate-100">
                  {option}
                </span>
                {hint && <span className="block text-[11px] text-slate-500">{hint}</span>}
              </button>
            ))}
          </div>
          {loading && <p className="text-[11px] text-slate-400">Drafting adjustment…</p>}
          {delta && !loading && (
            <p className="rounded-xl bg-indigo-50 p-2 text-[11px] text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200">
              {delta}
            </p>
          )}
          {error && (
            <p className="text-[11px] text-rose-500 dark:text-rose-300">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
