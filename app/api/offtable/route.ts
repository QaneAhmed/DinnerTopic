import { NextResponse } from "next/server";

type RecipeInput = {
  id: string;
  title: string;
  cuisine?: string;
};

function buildCheekyTitle(title: string, cuisine?: string): string {
  const base = title.trim() || "Mystery Dish";
  const replacements: Array<{ test: RegExp; value: string }> = [
    { test: /chicken/i, value: "Politely Controversial Chicken" },
    { test: /salmon/i, value: "Salary Negotiation Salmon" },
    { test: /taco/i, value: "Talk-About-Your-Ex Tacos" },
    { test: /pasta/i, value: "Pyramid Scheme Pasta" },
    { test: /bowl/i, value: "Boundary-Pushing Bowl" },
    { test: /steak/i, value: "Steak of Questionable Topics" },
    { test: /soup/i, value: "Spill-The-Tea Soup" }
  ];

  const match = replacements.find(({ test }) => test.test(base));
  if (match) {
    return base.replace(match.test, match.value);
  }

  const cue = cuisine ? `${cuisine} gossip` : "family gossip";
  return `Maybe Not Tonight ${cue.charAt(0).toUpperCase()}${cue.slice(1)}`;
}

function buildOffTableStarters(cuisine?: string): string[] {
  const cuisineText = cuisine ? cuisine.toLowerCase() : "tonight";
  return [
    `Kick things off with a heated debate about politics in ${cuisineText} — or maybe don’t.`,
    `Compare everyone’s salaries before the first bite. What could go wrong?`,
    `Bring up exes and elaborate family history. Definitely the vibe we’re avoiding.`
  ];
}

function buildOffTableFact(): string {
  return "Fun (don’t) fact: Money, politics, and exes are the fastest way to put the brakes on a great meal.";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const recipes: RecipeInput[] = Array.isArray(body.recipes) ? body.recipes : [];

  const items = recipes.map((recipe) => {
    const offTitle = buildCheekyTitle(recipe.title ?? "", recipe.cuisine);
    return {
      id: recipe.id,
      offTitle,
      starters: buildOffTableStarters(recipe.cuisine),
      fun_fact: buildOffTableFact()
    };
  });

  return NextResponse.json({ items });
}
