# DinnerTopic

## Implementation Notes

- The `/api/topics` route now caches results for identical inputs (vibe, group size, dietary/ingredient detail) for 15 minutes to keep repeat requests instant.
- Only one OpenAI call runs per request (with a fallback model if rate-limited), reducing typical response time while still returning canned topics if the API is unavailable.
- The UI includes an “Evil mode” toggle that swaps in a horror-themed prompt, styling, and fallback set—click “Go back I am scared” to return to wholesome conversation.
