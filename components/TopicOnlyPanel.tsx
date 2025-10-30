"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { cx } from "@/lib/ui";
import { sample } from "@/lib/utils";

type Topics = { starters: string[]; fun_fact: string };

type PanelContextValue = {
  open: () => void;
};

const PanelContext = createContext<PanelContextValue | null>(null);

type PanelProps = {
  children?: React.ReactNode;
};
type TopicOnlyPanelComponent = ((props: PanelProps) => JSX.Element) & {
  Trigger: () => JSX.Element;
};

const TopicOnlyPanel: TopicOnlyPanelComponent = ({ children }: PanelProps) => {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState("Italian");
  const [output, setOutput] = useState<Topics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const contextValue = useMemo<PanelContextValue>(
    () => ({
      open: () => {
        setOutput(null);
        setError(null);
        setOpen(true);
      }
    }),
    []
  );

  const close = () => {
    setOpen(false);
  };

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/topics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          recipe: {
            title: `${theme} dinner`,
            cuisine: theme,
            ingredients: []
          }
        })
      });
      if (!res.ok) {
        throw new Error(`Request failed with ${res.status}`);
      }
      const data = (await res.json()) as Topics;
      setOutput(data);
    } catch {
      setOutput({
        starters: [
          `What keeps you coming back to ${theme} flavors—nostalgia, spice, or something else?`,
          `If we built a whole dinner around ${theme}, what story or memory should lead the conversation?`,
          `What playful ritual would you add to a ${theme} night to make it unforgettable?`
        ],
        fun_fact: sample([
          `${theme} comfort dishes often began as resourceful home cooking—perfect fuel for genuine table talk.`,
          `${theme} cuisine is famous for gathering people—every course is an invitation to share stories.`,
          `Hosting a ${theme} dinner is really about connection—flavors, pacing, and tradition all spark conversation.`
        ])
      });
      setError("We’re serving a house-made sample instead.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PanelContext.Provider value={contextValue}>
      {children}
      {mounted && open
        ? createPortal(
            <div
              className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
              role="dialog"
              aria-modal="true"
            >
              <div className="w-full max-w-lg space-y-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-white">Get conversation topics</h2>
                  <button
                    onClick={close}
                    className="text-sm text-zinc-400 transition hover:text-white"
                  >
                    Close
                  </button>
                </div>
                <div className="grid gap-3">
                  <label className="text-sm text-zinc-300">
                    Cuisine / Theme
                    <input
                      value={theme}
                      onChange={(event) => setTheme(event.target.value)}
                      placeholder="e.g., Italian, BBQ, Vegan"
                      className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-800 p-2 text-sm text-white"
                    />
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={generate}
                    className={cx(
                      "btn-primary",
                      loading && "cursor-progress opacity-70"
                    )}
                    disabled={loading}
                  >
                    {loading ? "Drafting…" : "Generate"}
                  </button>
                  <p className="text-xs text-zinc-400">
                    No recipe needed — perfect for quick dinner chats.
                  </p>
                </div>
                {error && (
                  <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                    {error}
                  </p>
                )}
                {output && (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                    <p className="mb-1 text-xs uppercase tracking-wide text-indigo-300">
                      Tonight’s starters
                    </p>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-100">
                      {output.starters.map((starter, index) => (
                        <li key={index}>{starter}</li>
                      ))}
                    </ul>
                    <div className="mt-2 text-sm text-zinc-200">
                      <span className="font-medium">💡 Fun fact:</span> {output.fun_fact}
                    </div>
                  </div>
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </PanelContext.Provider>
  );
};

TopicOnlyPanel.Trigger = function TopicOnlyTrigger() {
  const ctx = useContext(PanelContext);
  return (
    <button
      type="button"
      onClick={() => ctx?.open()}
      className="btn-ghost text-sm"
      aria-label="Open topic-only generator"
    >
      💬 Just want topics?
    </button>
  );
};

export default TopicOnlyPanel;
