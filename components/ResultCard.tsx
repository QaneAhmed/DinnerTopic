 "use client";

import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { buildClipboardBlock, type Mode, type TopicResponsePayload } from "@/lib/topics";

type ResultCardProps = TopicResponsePayload & {
  mode?: Mode;
  onReset: () => void;
};

const COPY_FEEDBACK_DURATION = 1500;

export function ResultCard({ starters, fact, onReset, mode = "standard" }: ResultCardProps) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEvil = mode === "evil";

  const handleCopy = useCallback(async () => {
    const block = buildClipboardBlock({ starters, fact }, mode);
    try {
      await navigator.clipboard.writeText(block);
      setCopied(true);
      if (resetTimer.current) {
        clearTimeout(resetTimer.current);
      }
      resetTimer.current = setTimeout(() => {
        setCopied(false);
        resetTimer.current = null;
      }, COPY_FEEDBACK_DURATION);
    } catch (error) {
      setCopied(false);
      console.error("Failed to copy topics", error);
    }
  }, [fact, starters]);

  useEffect(() => {
    return () => {
      if (resetTimer.current) {
        clearTimeout(resetTimer.current);
      }
    };
  }, []);

  return (
    <section
      className={clsx(
        "mt-8 rounded-3xl p-6 transition-all",
        isEvil
          ? "border border-rose-700/60 bg-[#12020f]/90 shadow-[0_0_45px_rgba(209,53,123,0.35)]"
          : "border border-accent/30 bg-white/90 shadow-card backdrop-blur-sm"
      )}
      aria-live="polite"
    >
      <div>
        <h3
          className={clsx(
            "text-xl font-semibold",
            isEvil ? "text-rose-100" : "text-neutral-900"
          )}
        >
          {isEvil ? "Tonight’s cursed starters" : "Tonight’s starters"}
        </h3>
        <ul
          className={clsx(
            "mt-3 list-disc space-y-2 pl-5",
            isEvil ? "text-rose-100/80" : "text-neutral-800"
          )}
        >
          {starters.map((starter, index) => (
            <li key={index} className="leading-snug">
              {starter}
            </li>
          ))}
        </ul>
      </div>

      <hr
        className={clsx(
          "my-6",
          isEvil ? "border-rose-800/60" : "border-neutral-200"
        )}
      />

      <div className="space-y-2">
        <span
          className={clsx(
            "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
            isEvil
              ? "bg-rose-900/40 text-rose-200"
              : "bg-accent/20 text-accent-dark"
          )}
        >
          {isEvil ? "Sinister fact" : "Fun fact"}
        </span>
        <p className={clsx(isEvil ? "text-rose-100/90" : "text-neutral-800")}>{fact}</p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy all conversation starters and fun fact"
          className={clsx(
            "rounded-2xl px-5 py-3 text-sm font-semibold text-white transition",
            isEvil
              ? "bg-rose-700 hover:bg-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
              : "bg-accent hover:bg-accent-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-dark"
          )}
        >
          {copied ? (isEvil ? "Cursed copied!" : "Copied!") : isEvil ? "Copy if you dare" : "Copy all"}
        </button>
        <button
          type="button"
          onClick={onReset}
          aria-label="Get a new set of conversation starters"
          className={clsx(
            "rounded-2xl px-5 py-3 text-sm font-semibold transition",
            isEvil
              ? "border border-rose-800/70 text-rose-200 hover:border-rose-600 hover:bg-rose-900/40"
              : "border border-neutral-200 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50"
          )}
        >
          {isEvil ? "Summon more" : "Get new ones"}
        </button>
      </div>
    </section>
  );
}
