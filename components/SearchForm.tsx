"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import clsx from "clsx";

export type SearchFilters = {
  vibe: string;
  people: number;
  diets: string[];
  query: string;
  have: string;
  exclude: string;
};

const VIBES = ["Friends", "Family", "Date", "Kids", "Colleagues"] as const;
const DIET_OPTIONS = [
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Dairy-Free",
  "Nut-Free",
  "Halal",
  "Kosher",
  "Pescatarian"
] as const;

type SearchFormProps = {
  value: SearchFilters;
  loading?: boolean;
  onSubmit: (filters: SearchFilters) => void;
  onSurprise: (filters: SearchFilters) => void;
};

export function SearchForm({
  value,
  loading = false,
  onSubmit,
  onSurprise
}: SearchFormProps) {
  const [formState, setFormState] = useState<SearchFilters>(value);
  const vibeId = useId();
  const peopleId = useId();
  const dietsId = useId();
  const queryId = useId();
  const haveId = useId();
  const excludeId = useId();

  useEffect(() => {
    setFormState(value);
  }, [value]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(formState);
  };

  const toggleDiet = (diet: string) => {
    setFormState((prev) => {
      const exists = prev.diets.includes(diet);
      return {
        ...prev,
        diets: exists
          ? prev.diets.filter((item) => item !== diet)
          : [...prev.diets, diet]
      };
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur-md transition-all dark:border-slate-800 dark:bg-slate-900/80"
    >
      <div className="grid gap-5">
        <div className="grid gap-2">
          <label htmlFor={vibeId} className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Vibe
          </label>
          <select
            id={vibeId}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            value={formState.vibe}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, vibe: event.target.value }))
            }
          >
            {VIBES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <label
            htmlFor={peopleId}
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            People
          </label>
          <input
            id={peopleId}
            min={1}
            max={16}
            type="number"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            value={formState.people}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                people: Number(event.target.value)
              }))
            }
          />
        </div>

        <fieldset className="grid gap-3">
          <legend className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Dietary filters
          </legend>
          <div
            id={dietsId}
            className="flex flex-wrap gap-2"
            aria-label="Dietary filters"
          >
            {DIET_OPTIONS.map((diet) => {
              const active = formState.diets.includes(diet);
              return (
                <button
                  type="button"
                  key={diet}
                  className={clsx(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                    active
                      ? "border-indigo-500 bg-indigo-500 text-white shadow"
                      : "border-slate-300 bg-white text-slate-700 hover:border-indigo-400 hover:text-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  )}
                  aria-pressed={active}
                  onClick={() => toggleDiet(diet)}
                >
                  {diet}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-2">
          <label
            htmlFor={queryId}
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Recipe query
          </label>
          <input
            id={queryId}
            type="text"
            placeholder="Search recipes (e.g., “creamy tomato pasta”)"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            value={formState.query}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, query: event.target.value }))
            }
          />
        </div>

        <div className="grid gap-2">
          <label
            htmlFor={haveId}
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Ingredients you have
          </label>
          <input
            id={haveId}
            type="text"
            placeholder="comma-separated, e.g., chickpeas, spinach, lemons"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            value={formState.have}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, have: event.target.value }))
            }
          />
        </div>

        <div className="grid gap-2">
          <label
            htmlFor={excludeId}
            className="text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Exclude ingredients
          </label>
          <input
            id={excludeId}
            type="text"
            placeholder="comma-separated, e.g., dairy, peanuts"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            value={formState.exclude}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, exclude: event.target.value }))
            }
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="button"
            className="text-sm font-semibold text-indigo-600 transition hover:text-indigo-500 dark:text-indigo-300 dark:hover:text-indigo-200"
            onClick={() => onSurprise(formState)}
            disabled={loading}
          >
            Surprise me
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
          >
            {loading ? "Finding dishes…" : "Search"}
          </button>
        </div>
      </div>
    </form>
  );
}
