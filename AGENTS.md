# Agents

This repo is intentionally small and uses plain JSON packs plus minimal Node tooling.

## Guardrails
- Keep pack data source-of-truth in `packages/packs/<pack-id>/pack.json`.
- Prefer small, readable scripts in `tools/` over new dependencies.
- Avoid network calls in scripts; operate on local files only.

## Common tasks
```bash
npm run validate
npm run query -- --pack <pack-id> "search term"
```

## Pack structure (high level)
- `pack_id`, `pack_version`, `retrieved_at`
- `municipality` (name, region, country)
- `locations[]` (id, name, country)
- `items[]` (id, name, keywords?, option_cards[])
