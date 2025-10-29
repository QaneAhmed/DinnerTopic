"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { SearchForm, type SearchFilters } from "@/components/SearchForm";
import { RecipeGrid } from "@/components/RecipeGrid";
import { RecipeDrawer } from "@/components/RecipeDrawer";
import type { RecipeSummary } from "@/types/recipe";

const defaultFilters: SearchFilters = {
  vibe: "Friends",
  people: 2,
  diets: [],
  query: "",
  have: "",
  exclude: ""
};

const SURPRISE_PRESETS = [
  "crispy seasonal veggies",
  "cozy one-pot stew",
  "bright citrus seafood",
  "late-night noodles",
  "date night pasta",
  "family-style tray bake",
  "vegan comfort"
];

type SearchResponse = {
  results: RecipeSummary[];
};

const fetcher = async (url: string): Promise<SearchResponse> => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Search failed: ${res.status}`);
  }
  return res.json();
};

export default function HomePage() {
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
  const [submitted, setSubmitted] = useState<SearchFilters>(defaultFilters);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeSummary | null>(null);

  const searchKey = useMemo(() => buildSearchKey(submitted), [submitted]);

  const { data, error, isLoading } = useSWR<SearchResponse>(searchKey, fetcher, {
    revalidateOnFocus: false
  });

  const results = data?.results ?? [];

  const handleSubmit = (next: SearchFilters) => {
    setFilters(next);
    setSubmitted(next);
    setSelectedRecipe(null);
  };

  const handleSurprise = (source: SearchFilters = filters) => {
    const pantry = toList(source.have);
    const baseQuery = pantry.length
      ? `${pantry[0]} recipe`
      : SURPRISE_PRESETS[Math.floor(Math.random() * SURPRISE_PRESETS.length)];
    const surpriseFilters = {
      ...source,
      query: baseQuery
    };
    setFilters(surpriseFilters);
    setSubmitted(surpriseFilters);
  };

  return (
    <main className="flex flex-1 flex-col gap-10">
      <header className="space-y-3 text-center sm:space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-500 dark:text-indigo-300">
          SupperTalk
        </p>
        <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl dark:text-white">
          Plan dinner, spark the conversation
        </h1>
        <p className="mx-auto max-w-2xl text-sm text-slate-600 dark:text-slate-300">
          Search recipes by cravings, pantry staples, or dietary needs. Open a dish to get
          three ready-to-go conversation starters and a fun food fact, all tuned to your vibe.
        </p>
      </header>

      <SearchForm
        value={filters}
        loading={isLoading}
        onSubmit={handleSubmit}
        onSurprise={(current) => handleSurprise(current)}
      />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {results.length ? `Showing ${results.length} dishes` : "Browse ideas"}
          </h2>
          {submitted.query && (
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Query: {submitted.query}
            </span>
          )}
        </div>
        <RecipeGrid
          loading={isLoading}
          error={error ? "We couldn’t reach the kitchen. Try again shortly." : undefined}
          results={results}
          onSelect={setSelectedRecipe}
        />
      </section>

      <RecipeDrawer
        recipeId={selectedRecipe?.id ?? null}
        open={Boolean(selectedRecipe)}
        onClose={() => setSelectedRecipe(null)}
        vibe={submitted.vibe}
        people={submitted.people}
      />
    </main>
  );
}

function buildSearchKey(filters: SearchFilters): string {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("q", filters.query.trim());
  params.set("people", filters.people.toString());
  filters.diets.forEach((diet) => params.append("diet", diet));
  toList(filters.have).forEach((item) => params.append("have", item));
  toList(filters.exclude).forEach((item) => params.append("exclude", item));
  const query = params.toString();
  return `/api/recipes/search${query ? `?${query}` : ""}`;
}

function toList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 30);
}
