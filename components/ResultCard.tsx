 "use client";

import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { buildClipboardBlock, type TopicResponsePayload } from "@/lib/topics";

type ResultCardProps = TopicResponsePayload & {
  onReset: () => void;
};

const COPY_FEEDBACK_DURATION = 1500;

export function ResultCard({ starters, fact, onReset }: ResultCardProps) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(async () => {
    const block = buildClipboardBlock({ starters, fact });
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
      className="mt-8 rounded-3xl border border-accent/30 bg-white/90 p-6 shadow-card backdrop-blur-sm"
      aria-live="polite"
    >
      <div>
        <h3 className="text-xl font-semibold text-neutral-900">Tonight’s starters</h3>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-neutral-800">
          {starters.map((starter, index) => (
            <li key={index} className="leading-snug">
              {starter}
            </li>
          ))}
        </ul>
      </div>

      <hr className="my-6 border-neutral-200" />

      <div className="space-y-2">
        <span className="inline-flex items-center rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent-dark">
          Fun fact
        </span>
        <p className="text-neutral-800">{fact}</p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy all conversation starters and fun fact"
          className={clsx(
            "rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-white transition",
            "hover:bg-accent-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-dark"
          )}
        >
          {copied ? "Copied!" : "Copy all"}
        </button>
        <button
          type="button"
          onClick={onReset}
          aria-label="Get a new set of conversation starters"
          className="rounded-2xl border border-neutral-200 px-5 py-3 text-sm font-semibold text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50"
        >
          Get new ones
        </button>
      </div>
    </section>
  );
}
