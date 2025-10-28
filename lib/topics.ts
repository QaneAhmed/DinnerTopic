import { z } from "zod";

export const VIBES = ["Family", "Friends", "Colleagues", "Date", "Kids"] as const;
export const MODES = ["standard", "evil"] as const;

export type Vibe = (typeof VIBES)[number];
export type Mode = (typeof MODES)[number];

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
    dietaryOrIngredient: dietarySchema,
    mode: z.enum(MODES).default("standard")
  })
  .strict();

export type TopicRequest = z.infer<typeof topicRequestSchema>;

export type TopicResponsePayload = {
  starters: string[];
  fact: string;
};

export const softDenylist = ["slur1", "slur2"]; // placeholder for extendable denylist

export const fallbackTopics: Record<Mode, Record<Vibe, TopicResponsePayload>> = {
  standard: {
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
  },
  evil: {
    Family: {
      starters: [
        "Which heirloom would you cling to if the house whispered it wanted something in return?",
        "Whose lullaby turned into a scream in that dream you never told anyone about?",
        "If the power went out right now, who would vanish first?"
      ],
      fact: "In Victorian England, families often photographed their dead children sitting upright with siblings to pretend death never came."
    },
    Friends: {
      starters: [
        "Which friend here would make the most convincing alibi if the shadows swallowed the rest of us?",
        "What secret pact would you confess if the candlelight started flickering in Morse code?",
        "If we heard scratching beneath the table, whose name would the creature hiss?"
      ],
      fact: "During the 1518 dancing plague in France, friends collapsed mid-song, dancing until their hearts stopped."
    },
    Colleagues: {
      starters: [
        "Which co-worker’s laugh would echo longest if the office elevator never stopped descending?",
        "What project would you abandon if the conference room door slowly locked on its own?",
        "If HR sent a midnight email titled “Final Notice,” what would you hope it wasn’t about?"
      ],
      fact: "In 19th century factories, night-shift workers claimed to hear machines whispering the names of the next accident victims."
    },
    Date: {
      starters: [
        "What rumor about your past would you confess if the dining room mirror spoke first?",
        "If we toasted to eternity, which one of us would you fear waking up beside?",
        "What’s the eeriest place you’ve felt someone breathing on your neck with no one there?"
      ],
      fact: "Victorian lovers traded “lover’s eye” lockets—mini portraits believed to watch over the wearer even after death."
    },
    Kids: {
      starters: [
        "If your imaginary friend suddenly showed up for dinner, what would they demand we feed them?",
        "What monster under the bed keeps score of who finishes their vegetables?",
        "If your toy started talking tonight, what secret would it spill first?"
      ],
      fact: "The ancient bog bodies of Europe still have hair and fingerprints, as if they might sit up and tell tales."
    }
  }
};

export function hasDenylistedTerm(input: unknown): boolean {
  if (typeof input !== "string") return false;
  const lower = input.toLowerCase();
  return softDenylist.some((term) => lower.includes(term));
}

export function buildClipboardBlock(
  response: TopicResponsePayload,
  mode: Mode = "standard"
): string {
  const heading =
    mode === "evil" ? "Tonight’s cursed starters:" : "Tonight’s starters:";
  const factLabel = mode === "evil" ? "Sinister fact" : "Fun fact";
  const lines = [heading, ...response.starters.map((starter) => `• ${starter}`)];
  lines.push(`${factLabel}: ${response.fact}`);
  return lines.join("\n");
}
