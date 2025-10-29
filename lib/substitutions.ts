import substitutionData from "@/data/substitutions.json" assert { type: "json" };

type SubstitutionDataset = Record<string, Record<string, string[]>>;

const data = substitutionData as SubstitutionDataset;

const ratioMap: Record<string, string> = {
  "milk + lemon juice": "Use 1 cup milk + 1 tbsp lemon.",
  "oat milk + lemon juice": "Use the same volume plus 1 tsp lemon.",
  "tamari": "Swap 1:1 for soy sauce.",
  "coconut aminos": "Use 1.5x for the same saltiness.",
  "nutritional yeast": "Start with 2 tbsp for cheesy notes.",
  "vegan butter": "Use equal amount as butter.",
  "olive oil": "Use slightly less than butter for sautés."
};

export function getSubstitutionOptions(
  ingredient: string,
  dietFilters: string[]
): { option: string; hint?: string }[] {
  const normalized = ingredient.toLowerCase();
  const collected = new Set<string>();

  dietFilters.forEach((diet) => {
    const entries = data[diet.toLowerCase()];
    if (!entries) return;
    const match = entries[normalized];
    if (match) match.forEach((value) => collected.add(value));
  });

  const general = data.general ?? {};
  if (general[normalized]) {
    general[normalized].forEach((value) => collected.add(value));
  }

  return Array.from(collected)
    .slice(0, 3)
    .map((option) => ({ option, hint: ratioMap[option] }));
}
