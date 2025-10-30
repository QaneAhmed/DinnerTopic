"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { SearchForm, type SearchFilters } from "@/components/SearchForm";
import { RecipeGrid } from "@/components/RecipeGrid";
import { RecipeDrawer } from "@/components/RecipeDrawer";
import type { RecipeSummary } from "@/types/recipe";
import TopicOnlyPanel from "@/components/TopicOnlyPanel";

const defaultFilters: SearchFilters = {
  diets: [],
  query: "",
  have: ""
};

const SURPRISE_PRESETS = [
  "weeknight",
  "comfort",
  "seasonal",
  "spicy",
  "shareable",
  "seafood",
  "bowl",
  "curry",
  "noodles"
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
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();

  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
  const [submitted, setSubmitted] = useState<SearchFilters>(defaultFilters);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeSummary | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<{ starters: string[]; fun_fact: string } | null>(null);

  const searchKey = useMemo(() => buildSearchKey(submitted), [submitted]);

  const { data, error, isLoading } = useSWR<SearchResponse>(searchKey, fetcher, {
    revalidateOnFocus: false
  });

  const offTableMode = params.get("off") === "1";

  const toggleOffTableMode = () => {
    const query = new URLSearchParams(Array.from(params.entries()));
    if (offTableMode) {
      query.delete("off");
    } else {
      query.set("off", "1");
    }
    const queryString = query.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  };

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
    <main
      data-offtable={offTableMode ? "true" : "false"}
      className="relative hero-glow mx-auto max-w-5xl space-y-6 px-4 py-8"
    >
      <section className="fade-in mb-2 space-y-3 text-center">
        <h1 className="h1">
          Find dinner you’ll love <span className="text-gradient">and what to talk about.</span>
        </h1>
        <p className="mx-auto max-w-2xl text-base subtle">
          Search recipes, then get 3 conversation starters and 1 fun fact tailored to the dish.
        </p>
      </section>

      <TopicOnlyPanel>
        <section className="surface fade-in space-y-4 p-6 md:p-8">
          <SearchForm
            value={filters}
            loading={isLoading}
            onSubmit={handleSubmit}
            onSurprise={(current) => handleSurprise(current)}
            extraAction={<TopicOnlyPanel.Trigger />}
          />
        </section>
      </TopicOnlyPanel>
      <div className="fade-in">
        <div className="mx-auto flex max-w-screen-lg flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800/60 bg-zinc-900/60 px-4 py-2 text-[11px] uppercase tracking-wide text-zinc-400">
          <div className="flex flex-wrap items-center gap-3">
            {results.length > 0 && (
              <span>
                {results.length} match{results.length === 1 ? "" : "es"}
              </span>
            )}
            {submitted.query && <span>Query: {submitted.query}</span>}
          </div>
          <button
            type="button"
            onClick={toggleOffTableMode}
            className={`btn-ghost text-xs ${offTableMode ? "border-accent-400 text-accent-300" : ""}`}
            aria-pressed={offTableMode}
            title="Toggle Off-Table Mode (cheeky titles, hover previews disabled)"
          >
            🙊 Off-Table Mode
          </button>
        </div>
      </div>

      <section className="fade-in">
        <RecipeGrid
          off={offTableMode}
          loading={isLoading}
          error={error ? "We couldn’t reach the kitchen. Try again shortly." : undefined}
          results={results}
          onSelect={(recipe, preview) => {
            setSelectedRecipe(recipe);
            setSelectedPreview(preview ?? null);
          }}
        />
      </section>

      <RecipeDrawer
        off={offTableMode}
        recipeId={selectedRecipe?.id ?? null}
        open={Boolean(selectedRecipe)}
        onClose={() => {
          setSelectedRecipe(null);
          setSelectedPreview(null);
        }}
        initialTopics={selectedPreview}
        summary={selectedRecipe}
      />
    </main>
  );
}

function buildSearchKey(filters: SearchFilters): string {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("q", filters.query.trim());
  filters.diets.forEach((diet) => params.append("diet", diet));
  toList(filters.have).forEach((item) => params.append("have", item));
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
