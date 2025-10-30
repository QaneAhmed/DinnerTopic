"use client";

import { useEffect, useState, type FocusEvent } from "react";
import type { RecipeSummary } from "@/types/recipe";
import { cx } from "@/lib/ui";

export type PeekTopics = {
  starters: string[];
  fun_fact: string;
};

type RecipeCardProps = {
  recipe: RecipeSummary;
  onOpen: (recipe: RecipeSummary, preview?: PeekTopics | null) => void;
  initialPreview?: PeekTopics | null;
};

export function RecipeCard({ recipe, onOpen, initialPreview = null }: RecipeCardProps) {
  const [peek, setPeek] = useState<PeekTopics | null>(initialPreview);
  const [loadingPeek, setLoadingPeek] = useState(false);
  const [showPeek, setShowPeek] = useState(false);

  useEffect(() => {
    if (initialPreview) {
      setPeek(initialPreview);
    }
  }, [initialPreview]);

  const loadPeek = async (force = false): Promise<PeekTopics | null> => {
    if ((peek && !force) || loadingPeek) return peek;
    setLoadingPeek(true);
    let result: PeekTopics | null = null;
    try {
      const res = await fetch("/api/topics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          preview: true,
          recipe: {
            title: recipe.title,
            cuisine: recipe.cuisine,
            ingredients: recipe.tags?.slice(0, 6) ?? []
          }
        })
      });
      if (!res.ok) throw new Error("Preview request failed");
      result = (await res.json()) as PeekTopics;
      setPeek(result);
    } catch {
      result = {
        starters: [
          `What part of ${recipe.cuisine ?? "this cuisine"} do you crave most—spices, textures, or stories?`,
          "Which dinner memory always gets people laughing?"
        ],
        fun_fact:
          "Many beloved dishes started as humble, resourceful meals — thrift and creativity on a plate."
      };
      setPeek(result);
    } finally {
      setLoadingPeek(false);
    }
    return result;
  };

  const handleOpen = () => {
    onOpen(recipe, peek ?? null);
    if (!peek) {
      void loadPeek(true).then((latest) => {
        if (latest) {
          onOpen(recipe, latest);
        }
      });
    }
  };

  const handleReveal = () => {
    setShowPeek(true);
    void loadPeek();
  };

  const handleHide = () => {
    setShowPeek(false);
  };

  const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      handleReveal();
    }
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      handleHide();
    }
  };

  return (
    <div
      className="group surface hover-lift p-4 focus-within:ring-2 focus-within:ring-accent-400/50"
      onMouseEnter={handleReveal}
      onMouseLeave={handleHide}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onTouchStart={handleReveal}
      onTouchEnd={handleHide}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="cursor-pointer text-lg font-semibold text-zinc-100 transition-colors group-hover:text-accent-300">
            <button type="button" onClick={handleOpen} className="text-left">
              {recipe.title}
            </button>
          </h3>
        </div>
        <div className="flex items-center justify-between text-xs text-zinc-400">
          {recipe.timeMinutes ? (
            <span className="badge badge-time">{recipe.timeMinutes} min</span>
          ) : (
            <span />
          )}
          {recipe.matchScore !== undefined && (
            <span className="text-[11px] uppercase tracking-wide text-zinc-500">
              Match {Math.round(recipe.matchScore * 100)}%
            </span>
          )}
        </div>
        <p className="line-clamp-2 text-sm subtle">{recipe.description}</p>
        <div className="flex flex-wrap gap-2 text-xs text-zinc-400">
          {recipe.cuisine && <span className="badge">{recipe.cuisine}</span>}
          {recipe.dietFlags.slice(0, 2).map((flag) => (
            <span key={flag} className="badge">
              {flag}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={handleOpen}
          className={cx("btn-ghost mt-2 px-3 py-1 text-sm")}
          aria-label={`See conversation topics for ${recipe.title}`}
        >
          💬 See topics for this dish
        </button>
      </div>

      {showPeek && peek && (
        <div className="peek mt-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3">
          <p className="mb-1 text-xs uppercase tracking-wide text-indigo-300">Conversation preview</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-200">
            {(peek?.starters ?? []).slice(0, 2).map((starter, index) => (
              <li key={index}>{starter}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-zinc-500">
            {loadingPeek ? "Loading more ideas…" : "+ more when you open the recipe"}
          </p>
        </div>
      )}
    </div>
  );
}
