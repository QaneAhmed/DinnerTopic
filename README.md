# SupperTalk

SupperTalk is a conversational dinner companion built with Next.js 14 (App Router) and Tailwind CSS. Search recipes by vibe, pantry staples, or dietary filters, then open a dish to get three conversation starters and a fun food fact tailored to your table. Ingredient swaps come with quick cooking adjustments, and everything runs server-side so you keep your keys safe.

## Features

- 🔍 **Smart recipe search** using local dataset or Spoonacular/Edamam when keys are present.
- 🍽️ **Recipe detail drawer** with ingredient swaps and step-by-step guidance.
- 💬 **Conversation coach** that generates 3 starters + 1 fun fact per recipe, with duplicate avoidance.
- 🔄 **Ingredient substitutions** aware of dietary filters, with optional LLM deltas.
- ⚡ **Fast UI** powered by Tailwind, SWR, and lightweight caching.

## Quickstart

```bash
pnpm install
cp .env.example .env.local
# add OPENAI_API_KEY (optional recipe provider keys too)
pnpm dev
```

Visit `http://localhost:3000` to explore SupperTalk.

> Prefer npm? Run `npm install` / `npm run dev` instead of the pnpm commands above.

## Environment Variables

| Name | Required | Description |
| --- | --- | --- |
| `OPENAI_API_KEY` | optional | Enables live conversation starters and substitution deltas via OpenAI Responses API. Without it, SupperTalk falls back to deterministic prompts. |
| `SPOONACULAR_API_KEY` | optional | Use Spoonacular for recipe search/detail instead of the bundled dataset. |
| `EDAMAM_APP_ID`, `EDAMAM_APP_KEY` | optional | Use Edamam when Spoonacular is not configured. |

## APIs & Architecture

- **Client** uses SWR for data fetching and keeps state minimal.
- **Server** exposes `/api/recipes/search`, `/api/recipes/[id]`, `/api/topics`, and `/api/substitutions/explain`.
- **Providers** auto-select Spoonacular → Edamam → bundled dataset based on available keys.
- **Rate limiting**: lightweight in-memory guard (`60 requests / 5 min / IP`) to keep free-tier deploys healthy.
- **Caching**: search/detail responses ship with `s-maxage` and `stale-while-revalidate` hints for Vercel.

## Deployment

1. Push to GitHub (or your VCS of choice).
2. Create a new Vercel project and import the repository.
3. Set required environment variables in Vercel (UI or `vercel env` CLI).
4. Trigger a deploy – no extra build config is needed (`next build` runs on Node 18+).

## Testing Checklist

- [ ] Search by text, vibe, diets, pantry ingredients.
- [ ] Open a recipe and confirm ingredient swaps appear for active diet filters.
- [ ] Generate new conversation topics; ensure duplicates are avoided.
- [ ] Verify fallback topics show when OpenAI quota/rate limits are hit.
- [ ] Deploy to Vercel and confirm build + runtime succeed.

## Notes

- Bundled dataset lives in `data/recipes.sample.json` (~60 diverse dishes). Extend or swap as needed.
- Ingredient substitution rules are intentionally lightweight; tweak `data/substitutions.json` for your audience.
- Rate limiting is in-memory; distributed environments reset per serverless instance (documented here for transparency).
