import { z } from "zod";

export const VIBES = ["Family", "Friends", "Colleagues", "Date", "Kids"] as const;

export type Vibe = (typeof VIBES)[number];

const dietarySchema = z.preprocess(
  (input) => {
    if (typeof input !== "string") return undefined;
    const trimmed = input.trim();
    const stripped = trimmed.replace(/^[,.;:!?-]+|[,.;:!?-]+$/g, "");
    if (stripped.length === 0) return undefined;
    return stripped;
  },
  z
    .string()
    .max(60, { message: "Keep it under 60 characters." })
    .refine(
      (value) => /^[a-zA-Z0-9\s,'-]+$/.test(value),
      "Use letters, numbers, spaces, commas, apostrophes, or hyphens."
    )
    .optional()
);

export const topicRequestSchema = z
  .object({
    vibe: z.enum(VIBES),
    people: z
      .number()
      .finite({ message: "Provide a valid number of guests." })
      .int({ message: "Whole numbers only." })
      .min(2, { message: "Invite at least 2 guests." })
      .max(12, { message: "Keep it to 12 guests or fewer." }),
    dietaryOrIngredient: dietarySchema
  })
  .strict();

export type TopicRequest = z.infer<typeof topicRequestSchema>;

export type TopicResponsePayload = {
  starters: string[];
  fact: string;
};

export const softDenylist = ["slur1", "slur2"]; // placeholder for extendable denylist

export const fallbackTopics: Record<Vibe, TopicResponsePayload> = {
  Family: {
    starters: [
      "What’s a small win someone had this week that we can celebrate together?",
      "Which family tradition should we keep alive—or start fresh—this season?",
      "If we planned a surprise day out together, what would we all want to include?"
    ],
    fact: "Tomatoes are technically a fruit, which is why they pair so naturally with both savory and sweet dishes."
  },
  Friends: {
    starters: [
      "What’s a tiny luxury you treated yourself to recently—or want to soon?",
      "Which adventure or day trip should we plan before the season ends?",
      "What song instantly takes you back to a memorable night with friends?"
    ],
    fact: "Sharing a meal releases oxytocin—the same hormone tied to feelings of trust and bonding."
  },
  Colleagues: {
    starters: [
      "What’s one non-work skill you picked up lately that surprised you?",
      "Which local spot should we recommend to the next out-of-town teammate?",
      "If we could swap roles for a day just for fun, whose job would you try?"
    ],
    fact: "In Japan, slurping noodles is seen as a compliment to the chef—and signals you’re enjoying the meal."
  },
  Date: {
    starters: [
      "What’s a simple joy you’ve discovered lately that makes the everyday feel special?",
      "If we could teleport to any café or dinner spot in the world, where would we choose?",
      "What’s a story from your week that made you smile more than you expected?"
    ],
    fact: "The tradition of clinking glasses began to ensure drinks were safe—and became a cheerful toast to shared trust."
  },
  Kids: {
    starters: [
      "If tonight’s meal could magically talk, what story would it tell us?",
      "What’s something awesome you’d add to a dream playground?",
      "If you could invent a new ice cream flavor, what would you call it?"
    ],
    fact: "Honey never spoils; archaeologists have found jars in ancient tombs that are still perfectly sweet."
  }
};

export function hasDenylistedTerm(input: unknown): boolean {
  if (typeof input !== "string") return false;
  const lower = input.toLowerCase();
  return softDenylist.some((term) => lower.includes(term));
}

export function buildClipboardBlock(response: TopicResponsePayload): string {
  const lines = ["Tonight’s starters:", ...response.starters.map((starter) => `• ${starter}`)];
  lines.push(`Fun fact: ${response.fact}`);
  return lines.join("\n");
}
