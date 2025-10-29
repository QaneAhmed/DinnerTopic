"use client";

import { useState } from "react";
import clsx from "clsx";

type ConversationPanelProps = {
  loading: boolean;
  topics: {
    starters: string[];
    fun_fact: string;
  } | null;
  onRegenerate: () => Promise<void> | void;
};

export function ConversationPanel({
  loading,
  topics,
  onRegenerate
}: ConversationPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!topics) return;
    const block = [
      "Tonight’s starters:",
      ...topics.starters.map((item) => `• ${item}`),
      `Fun fact: ${topics.fun_fact}`
    ].join("\n");
    await navigator.clipboard.writeText(block);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside className="space-y-4 rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          Tonight’s starters
        </h3>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!topics}
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600 disabled:cursor-not-allowed disabled:border-transparent disabled:text-slate-400 dark:border-slate-700 dark:text-slate-300"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <div className="space-y-3">
        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-4 animate-pulse rounded bg-slate-200 dark:bg-slate-700/60"
              />
            ))}
          </div>
        )}
        {!loading && topics && (
          <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            {topics.starters.map((starter, index) => (
              <li key={index} className="rounded-2xl bg-slate-100/70 p-3 dark:bg-slate-800/60">
                {starter}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="rounded-2xl bg-indigo-50/80 p-4 text-sm text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500 dark:text-indigo-300">
          Fun fact
        </p>
        <p className="mt-2 text-sm">
          {loading ? (
            <span className="inline-block h-4 w-3/4 animate-pulse rounded bg-indigo-200/80 dark:bg-indigo-500/30" />
          ) : (
            topics?.fun_fact ?? "Warming up your conversation starters..."
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onRegenerate()}
        disabled={loading}
        className={clsx(
          "w-full rounded-full px-5 py-2 text-sm font-semibold transition",
          loading
            ? "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            : "bg-slate-900 text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        )}
      >
        {loading ? "Refreshing…" : "New topics"}
      </button>
    </aside>
  );
}
