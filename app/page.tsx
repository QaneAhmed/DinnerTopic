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
  const [evilMode, setEvilMode] = useState(false);

  const mode = evilMode ? "evil" : "standard";

  const updateForm = (partial: Partial<typeof initialFormState>) => {
    setFormState((prev) => ({ ...prev, ...partial }));
    if (error) {
      setError(null);
    }
    if (status === "error") {
      setStatus("idle");
    }
  };

  const toggleMode = () => {
    setEvilMode((previous) => {
      const next = !previous;
      setResult(null);
      setStatus("idle");
      setError(null);
      return next;
    });
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

    const payload = toRequestPayload(formState, mode);
    const parsed = topicRequestSchema.safeParse(payload);

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
    <main
      className={clsx(
        "min-h-screen px-4 py-12 transition-colors duration-300 sm:px-6",
        evilMode ? "bg-[#050108] text-rose-100" : "bg-[#f9f6ff] text-neutral-900"
      )}
    >
      <div className="mx-auto flex w-full max-w-xl flex-col gap-8">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={toggleMode}
            aria-pressed={evilMode}
            className={clsx(
              "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition",
              evilMode
                ? "bg-rose-700 text-rose-50 hover:bg-rose-600"
                : "bg-neutral-900 text-white hover:bg-neutral-700"
            )}
          >
            {evilMode ? "Go back I am scared" : "Evil mode"}
          </button>
        </div>

        <header className="text-center">
          <h1
            className={clsx(
              "text-3xl font-semibold sm:text-4xl",
              evilMode ? "text-rose-100" : "text-neutral-900"
            )}
          >
            Dinner Topic Generator 🍽️ {evilMode ? "— Evil" : ""}
          </h1>
          <p
            className={clsx(
              "mt-2 text-sm",
              evilMode ? "text-rose-200/80" : "text-neutral-600"
            )}
          >
            {evilMode
              ? "Be sent away from the table in 10 seconds."
              : "End awkward silences in 10 seconds."}
          </p>
        </header>

        <form
          className={clsx(
            "space-y-6 rounded-3xl border p-6 shadow-sm transition",
            evilMode
              ? "border-rose-900/50 bg-[#14020f]/85 backdrop-blur text-rose-100"
              : "border-neutral-200 bg-white/80 backdrop-blur text-neutral-800"
          )}
          onSubmit={handleSubmit}
        >
          <div className="space-y-2">
            <label
              className={clsx(
                "text-sm font-medium",
                evilMode ? "text-rose-100" : "text-neutral-800"
              )}
              htmlFor="vibe"
            >
              Vibe
            </label>
            <select
              id="vibe"
              name="vibe"
              value={formState.vibe}
              onChange={(event) => updateForm({ vibe: event.target.value })}
              disabled={isLoading}
              className={clsx(
                "w-full rounded-2xl border px-4 py-3 focus:outline-none focus:ring-2",
                evilMode
                  ? "border-rose-900/60 bg-[#1f0717] text-rose-100 focus:ring-rose-500"
                  : "border-neutral-200 bg-white text-neutral-800 focus:ring-accent"
              )}
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
            <label
              className={clsx(
                "text-sm font-medium",
                evilMode ? "text-rose-100" : "text-neutral-800"
              )}
              htmlFor="people"
            >
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
              className={clsx(
                "w-full rounded-2xl border px-4 py-3 focus:outline-none focus:ring-2",
                evilMode
                  ? "border-rose-900/60 bg-[#1f0717] text-rose-100 focus:ring-rose-500"
                  : "border-neutral-200 bg-white text-neutral-800 focus:ring-accent"
              )}
              required
            />
          </div>

          <div className="space-y-2">
            <label
              className={clsx(
                "text-sm font-medium",
                evilMode ? "text-rose-100" : "text-neutral-800"
              )}
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
              className={clsx(
                "w-full rounded-2xl border px-4 py-3 focus:outline-none focus:ring-2",
                evilMode
                  ? "border-rose-900/60 bg-[#1f0717] text-rose-100 placeholder:text-rose-300/50 focus:ring-rose-500"
                  : "border-neutral-200 bg-white text-neutral-800 placeholder:text-neutral-400 focus:ring-accent"
              )}
            />
          </div>

          <div className="space-y-3">
            <button
              type="submit"
              className={clsx(
                "w-full rounded-2xl px-6 py-4 text-base font-semibold text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
                canSubmit
                  ? evilMode
                    ? "bg-rose-700 hover:bg-rose-600 focus-visible:outline-rose-500"
                    : "bg-accent hover:bg-accent-dark focus-visible:outline-accent-dark"
                  : "cursor-not-allowed opacity-70",
                evilMode && !canSubmit ? "bg-rose-900/60" : undefined
              )}
              disabled={!canSubmit}
            >
              {isLoading
                ? evilMode
                  ? "Summoning nightmares…"
                  : "Simmering conversation…"
                : evilMode
                  ? "Serve the horrors"
                  : "Serve the topics"}
            </button>

            <p
              className={clsx(
                "text-center text-xs",
                evilMode ? "text-rose-200/70" : "text-neutral-500"
              )}
            >
              {evilMode
                ? "You’ll unleash 3 ghastly starters + 1 sinister fact."
                : "You’ll get 3 tailored starters + 1 fun food fact."}
            </p>

            {error && (
              <p
                className={clsx(
                  "text-center text-sm font-medium",
                  evilMode ? "text-rose-400" : "text-rose-600"
                )}
                role="alert"
              >
                {evilMode ? "The ritual faltered. Try again?" : "We spilled the soup. Try again?"}
              </p>
            )}
          </div>
        </form>

        {result && status === "success" ? (
          <ResultCard
            starters={result.starters}
            fact={result.fact}
            onReset={resetResult}
            mode={mode}
          />
        ) : null}

        <p
          className={clsx(
            "mt-4 text-center text-xs",
            evilMode ? "text-rose-300/60" : "text-neutral-400"
          )}
        >
          {evilMode ? "Bon appétit… if you last." : "Bon appétit, powered by AI."}
        </p>
      </div>
    </main>
  );
}

function toRequestPayload(
  form: typeof initialFormState,
  mode: "standard" | "evil"
): TopicRequest {
  return {
    vibe: form.vibe as TopicRequest["vibe"],
    people: Number(form.people),
    dietaryOrIngredient: form.dietaryOrIngredient,
    mode
  };
}
