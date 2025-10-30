export type DietFlag =
  | "Vegetarian"
  | "Vegan"
  | "Gluten-Free"
  | "Dairy-Free"
  | "Nut-Free"
  | "Halal"
  | "Kosher"
  | "Pescatarian";

export type RecipeSummary = {
  id: string;
  title: string;
  description: string;
  image: string;
  timeMinutes: number;
  cuisine: string;
  dietFlags: DietFlag[];
  tags: string[];
  matchScore?: number;
  offTitle?: string;
  offStarters?: string[];
  offFunFact?: string;
};

export type RecipeDetail = RecipeSummary & {
  ingredients: string[];
  steps: string[];
};

export type RecipeSummaryOrDetail = RecipeSummary | RecipeDetail;
