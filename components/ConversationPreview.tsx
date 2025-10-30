"use client";

import { useEffect, useState } from "react";

type Topics = { starters: string[]; fun_fact: string };

export default function ConversationPreview() {
  const [topics, setTopics] = useState<Topics | null>(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch("/api/topics", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            preview: true,
            recipe: {
              title: "Pasta Night",
              cuisine: "Italian",
              ingredients: ["tomato", "basil", "garlic"]
            }
          })
        });
        if (!res.ok) throw new Error("Preview request failed");
        const data = (await res.json()) as Topics;
        if (!ignore) setTopics(data);
      } catch {
        if (!ignore) {
          setTopics({
            starters: [
              "What’s a meal that always reminds you of home?",
              "If you could eat anywhere in Italy, where would it be and why?",
              "What’s your go-to comfort dish after a long week?"
            ],
            fun_fact:
              "Italians rarely drink cappuccino after 11 a.m.—they switch to espresso."
          });
        }
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  if (!topics) return null;

  return (
    <section className="card fade-in bg-zinc-950/60 border-zinc-800 p-6 md:p-7 max-w-3xl mx-auto">
      <p className="mb-2 text-[11px] uppercase tracking-wide text-indigo-300">
        Example · Tonight’s starters (Italian)
      </p>
      <ul className="list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-zinc-100">
        {topics.starters.slice(0, 3).map((starter, index) => (
          <li key={index}>{starter}</li>
        ))}
      </ul>
      <div className="mt-3 text-[15px] text-zinc-100">
        <span className="font-medium">💡 Fun fact:</span> {topics.fun_fact}
      </div>
    </section>
  );
}
