"use client";

import { useEffect, useState, type FocusEvent, type KeyboardEvent, type MouseEvent } from "react";
import type { RecipeSummary } from "@/types/recipe";

export type PeekTopics = {
  starters: string[];
  fun_fact: string;
};

type RecipeCardProps = {
  recipe: RecipeSummary & {
    offTitle?: string;
    offStarters?: string[];
    offFunFact?: string;
  };
  onOpen: (recipe: RecipeSummary, preview?: PeekTopics | null) => void;
  initialPreview?: PeekTopics | null;
  off?: boolean;
};

export function RecipeCard({
  recipe,
  onOpen,
  initialPreview = null,
  off = false
}: RecipeCardProps) {
  const [peek, setPeek] = useState<PeekTopics | null>(initialPreview);
  const [loadingPeek, setLoadingPeek] = useState(false);
  const [showPeek, setShowPeek] = useState(false);

  useEffect(() => {
    setPeek(initialPreview ?? null);
  }, [initialPreview]);

  useEffect(() => {
    if (off) {
      setShowPeek(false);
    }
  }, [off]);

  const displayTitle = off ? recipe.offTitle ?? recipe.title : recipe.title;

  const loadPeek = async (force = false): Promise<PeekTopics | null> => {
    if (off) {
      if (!peek && initialPreview) {
        setPeek(initialPreview);
      }
      return peek ?? initialPreview ?? null;
    }
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
    if (!peek && !off) {
      void loadPeek(true).then((latest) => {
        if (latest) {
          onOpen(recipe, latest);
        }
      });
    }
  };

  const handleReveal = () => {
    if (off) return;
    setShowPeek(true);
    void loadPeek();
  };

  const handleHide = () => {
    if (off) return;
    setShowPeek(false);
  };

  const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
    if (off) return;
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      handleReveal();
    }
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (off) return;
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      handleHide();
    }
  };

  const handleCardClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button")) return;
    handleOpen();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleOpen();
    }
  };

  const previewContent = !off && showPeek && peek ? (
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
  ) : null;

  return (
    <div
      className="group surface hover-lift p-4 focus-within:ring-2 focus-within:ring-accent-400/50 card-col"
      role="button"
      aria-label={`Open ${displayTitle}`}
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleReveal}
      onMouseLeave={handleHide}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onTouchStart={handleReveal}
      onTouchEnd={handleHide}
    >
      <div className="card-main">
        <div className="flex items-start justify-between gap-3">
          <h3 className="cursor-pointer text-lg font-semibold text-zinc-100 transition-colors group-hover:text-accent-300">
            {displayTitle}
          </h3>
          {recipe.matchScore !== undefined && (
            <span className="text-[11px] uppercase tracking-wide text-zinc-500">
              Match {Math.round(recipe.matchScore * 100)}%
            </span>
          )}
        </div>
        {recipe.description && <p className="text-sm subtle line-clamp-2">{recipe.description}</p>}
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span className="badge badge-time">{recipe.timeMinutes ?? 0} min</span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-zinc-400">
          {recipe.cuisine && <span className="badge">{recipe.cuisine}</span>}
          {recipe.dietFlags.slice(0, 2).map((flag) => (
            <span key={flag} className="badge">
              {flag}
            </span>
          ))}
        </div>

        <div className="card-spacer" />
        <div className="preview-reserved">{previewContent}</div>
      </div>

      <div className="card-footer">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            handleOpen();
          }}
          className="btn-ghost w-full justify-center text-sm"
          aria-label={`See conversation topics for ${displayTitle}`}
        >
          💬 See topics for this dish
        </button>
      </div>
    </div>
  );
}
