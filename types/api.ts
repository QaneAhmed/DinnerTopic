import type { RecipeDetail, RecipeSummary, RecipeSummaryOrDetail } from "./recipe";

export type RecipeSearchParams = {
  q?: string;
  diet?: string[];
  have?: string[];
  exclude?: string[];
  people: number;
};

export type RecipeSearchResponse = {
  results: RecipeSummary[];
};

export type RecipeDetailResponse = {
  recipe: RecipeDetail;
};

export type TopicsRequestBody = {
  recipe: RecipeSummaryOrDetail;
  vibe: string;
  people: number;
  previousHashes?: string[];
};

export type TopicsResponseBody = {
  starters: string[];
  fun_fact: string;
  hashes?: string[];
};

export type SubstitutionExplainRequest = {
  from: string;
  to: string;
  recipe: {
    title: string;
    cuisine: string;
    steps: string[];
  };
};

export type SubstitutionExplainResponse = {
  delta: string;
};
