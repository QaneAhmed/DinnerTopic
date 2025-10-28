"use client";

import { FormEvent, useMemo, useState } from "react";
import clsx from "clsx";
import { ResultCard } from "@/components/ResultCard";
import {
  VIBES,
  type TopicRequest,
  type TopicResponsePayload,
  hasDenylistedTerm,
  topicRequestSchema
} from "@/lib/topics";

type RequestStatus = "idle" | "loading" | "error" | "success";

const initialFormState = {
  vibe: "",
  people: "4",
  dietaryOrIngredient: ""
};

export default function HomePage() {
  const [formState, setFormState] = useState(initialFormState);
  const [status, setStatus] = useState<RequestStatus>("idle");
  const [result, setResult] = useState<TopicResponsePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateForm = (partial: Partial<typeof initialFormState>) => {
    setFormState((prev) => ({ ...prev, ...partial }));
    if (error) {
      setError(null);
    }
    if (status === "error") {
      setStatus("idle");
    }
  };

  const isLoading = status === "loading";

  const canSubmit = useMemo(() => {
    const peopleNumber = Number(formState.people);
    const vibeValid = VIBES.includes(formState.vibe as (typeof VIBES)[number]);
    const peopleValid =
      Number.isInteger(peopleNumber) && peopleNumber >= 2 && peopleNumber <= 12;
    return !isLoading && vibeValid && peopleValid;
  }, [formState.people, formState.vibe, isLoading]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = topicRequestSchema.safeParse(toRequestPayload(formState));

    if (!parsed.success) {
      setError("We spilled the soup. Try again?");
      setStatus("error");
      return;
    }

    if (hasDenylistedTerm(parsed.data.dietaryOrIngredient)) {
      setError("We spilled the soup. Try again?");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const response = await fetch("/api/topics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(parsed.data)
      });

      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`);
      }

      const data = (await response.json()) as TopicResponsePayload;

      if (!Array.isArray(data.starters) || data.starters.length !== 3 || !data.fact) {
        throw new Error("Invalid payload");
      }

      setResult(data);
      setStatus("success");
    } catch (err) {
      console.error(err);
      setError("We spilled the soup. Try again?");
      setStatus("error");
    }
  };

  const resetResult = () => {
    setResult(null);
    setStatus("idle");
    setError(null);
  };

  return (
    <main>
      <header className="text-center">
        <h1 className="text-3xl font-semibold text-neutral-900 sm:text-4xl">
          Dinner Topic Generator 🍽️
        </h1>
        <p className="mt-2 text-sm text-neutral-600">End awkward silences in 10 seconds.</p>
      </header>

      <form
        className="mt-8 space-y-6 rounded-3xl border border-neutral-200 bg-white/80 p-6 shadow-sm backdrop-blur"
        onSubmit={handleSubmit}
      >
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-800" htmlFor="vibe">
            Vibe
          </label>
          <select
            id="vibe"
            name="vibe"
            value={formState.vibe}
            onChange={(event) => updateForm({ vibe: event.target.value })}
            disabled={isLoading}
            className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-accent"
            required
          >
            <option value="" disabled>
              Choose the vibe
            </option>
            {VIBES.map((vibe) => (
              <option key={vibe} value={vibe}>
                {vibe}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-800" htmlFor="people">
            How many at the table?
          </label>
          <input
            id="people"
            name="people"
            type="number"
            min={2}
            max={12}
            value={formState.people}
            onChange={(event) => updateForm({ people: event.target.value })}
            disabled={isLoading}
            className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-accent"
            required
          />
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-medium text-neutral-800"
            htmlFor="dietary-or-ingredient"
          >
            Dietary or Ingredient (optional)
          </label>
          <input
            id="dietary-or-ingredient"
            name="dietary-or-ingredient"
            type="text"
            placeholder="e.g., vegetarian, gluten-free, mushrooms, salmon"
            value={formState.dietaryOrIngredient}
            onChange={(event) => updateForm({ dietaryOrIngredient: event.target.value })}
            disabled={isLoading}
            maxLength={60}
            className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div className="space-y-3">
          <button
            type="submit"
            className={clsx(
              "w-full rounded-2xl bg-accent px-6 py-4 text-base font-semibold text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-dark",
              canSubmit
                ? "hover:bg-accent-dark active:scale-[0.99]"
                : "cursor-not-allowed opacity-70"
            )}
            disabled={!canSubmit}
          >
            {isLoading ? "Simmering conversation…" : "Serve the topics"}
          </button>

          <p className="text-center text-xs text-neutral-500">
            You’ll get 3 tailored starters + 1 fun food fact.
          </p>

          {error && (
            <p className="text-center text-sm font-medium text-rose-600" role="alert">
              We spilled the soup. Try again?
            </p>
          )}
        </div>
      </form>

      {result && status === "success" ? (
        <ResultCard starters={result.starters} fact={result.fact} onReset={resetResult} />
      ) : null}

      <p className="mt-12 text-center text-xs text-neutral-400">Bon appétit, powered by AI.</p>
    </main>
  );
}

function toRequestPayload(form: typeof initialFormState): TopicRequest {
  return {
    vibe: form.vibe as TopicRequest["vibe"],
    people: Number(form.people),
    dietaryOrIngredient: form.dietaryOrIngredient
  };
}
