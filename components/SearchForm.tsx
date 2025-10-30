"use client";

import { FormEvent, ReactNode, useEffect, useId, useState } from "react";
import clsx from "clsx";

export type SearchFilters = {
  diets: string[];
  query: string;
  have: string;
};

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
  extraAction?: ReactNode;
};

export function SearchForm({
  value,
  loading = false,
  onSubmit,
  onSurprise,
  extraAction
}: SearchFormProps) {
  const [formState, setFormState] = useState<SearchFilters>(value);
  const dietsId = useId();
  const queryId = useId();
  const haveId = useId();

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
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5">
        <fieldset className="grid gap-3">
          <legend className="text-sm font-medium text-zinc-100">
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
                    "badge text-[12px] transition focus-visible:ring-2 focus-visible:ring-accent-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg",
                    active
                      ? "badge-active !text-white"
                      : "border-zinc-700/70 text-zinc-400 hover:border-accent-500 hover:text-accent-300"
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
            className="text-sm font-medium text-zinc-100"
          >
            Recipe query
          </label>
          <input
            id={queryId}
            type="text"
            placeholder="Search recipes (e.g., “creamy tomato pasta”)"
            className="input"
            value={formState.query}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, query: event.target.value }))
            }
          />
        </div>

        <div className="grid gap-2">
          <label
            htmlFor={haveId}
            className="text-sm font-medium text-zinc-100"
          >
            Ingredients you have
          </label>
          <input
            id={haveId}
            type="text"
            placeholder="comma-separated, e.g., chickpeas, spinach, lemons"
            className="input"
            value={formState.have}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, have: event.target.value }))
            }
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Finding dishes…" : "Search"}
          </button>
          <button
            type="button"
            className="btn-secondary disabled:opacity-60"
            onClick={() => onSurprise(formState)}
            disabled={loading}
          >
            Surprise me
          </button>
          {extraAction}
        </div>
      </div>
    </form>
  );
}
