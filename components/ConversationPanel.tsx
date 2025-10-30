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
  off?: boolean;
};

export function ConversationPanel({
  loading,
  topics,
  onRegenerate,
  off = false
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
    <aside className="surface border-accent-500/40 bg-zinc-950/85 p-6 shadow-indigo-soft space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-100">Tonight’s starters</h3>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!topics}
          className={clsx(
            "btn-ghost px-3 py-1 text-xs",
            !topics && "cursor-not-allowed opacity-50"
          )}
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
                className="h-4 animate-pulse rounded bg-zinc-800/60"
              />
            ))}
          </div>
        )}
        {!loading && topics && (
          <ul className="space-y-3 text-sm text-zinc-200">
            {topics.starters.map((starter, index) => (
              <li key={index} className="rounded-2xl border border-zinc-800/60 bg-zinc-900/70 p-3">
                {starter}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="rounded-2xl border border-accent-500/40 bg-zinc-900/70 p-4 text-sm text-indigo-200">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent-300">Fun fact</p>
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
        onClick={() => {
          if (off) return;
          return onRegenerate();
        }}
        disabled={loading || off}
        className={clsx(
          "btn-primary w-full justify-center",
          (loading || off) && "cursor-not-allowed opacity-60"
        )}
      >
        {off ? "Off-Table Mode active" : loading ? "Refreshing…" : "New topics"}
      </button>
    </aside>
  );
}
