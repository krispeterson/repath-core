# RePath

RePath is a logic-first decision engine for reuse and recycling. It turns local rules into clear, ranked options—reuse, sell, recycle, drop-off, or trash—based on what you’re holding and where you are. Built for camera-first, offline-friendly, white-label apps.

## Quick start
```bash
npm install
npm run validate
npm run query -- --pack fort-collins-co-us "cardboard"
```

## Tooling
- `npm run build:manifest` generates `dist/manifest.json` from local packs.
- `npm run build:manifest` also generates `dist/search.json` with a lightweight token index.
- `npm run release:runtime` builds a release-ready runtime data bundle plus checksums.
- `npm run smoke` runs a tiny validation + query smoke test.
Notes:
- Search stemming is optional. If you install `stemmer`, search will use it; otherwise it falls back to basic token normalization.
- `build:manifest` supports `REPATH_PACK_BASE_URL` to produce deployable `manifest.json` URLs (for example: `REPATH_PACK_BASE_URL=https://cdn.example.com/packs npm run build:manifest`).

## Runtime Release Contract
Runtime releases are data-only and include:
- `packages/packs/*/pack.json`
- `schema/pack.schema.json`
- `dist/manifest.json`
- `dist/search.json`

Release assets should also include:
- `<bundle>.tar.gz`
- `<bundle>.sha256`
- `<bundle>.files.sha256`

For details, see `docs/release-contract.md`.
User-facing release highlights live in `release-notes.md`.

To generate a release bundle locally:
```bash
npm run release:runtime
```

Optional flags:
- `--tag vX.Y.Z`
- `--out-dir dist/releases`
- `--pack-base-url https://cdn.example.com/packs`

## Pack authoring
This repo uses a small schema and prompt template to create consistent jurisdiction packs.

Files:
- Schema: `schema/pack.schema.json`
- Prompt template: `prompts/pack-creator.md`
- Pack data: `packages/packs/<pack-id>/pack.json`

Steps:
1) Gather official sources
   - City/county recycling program pages
   - Official A–Z lists or accepted materials pages
   - HHW program pages (hours, fees, accepted materials)

2) Create a draft pack with the prompt
   - Use `prompts/pack-creator.md` with your sources
   - Output JSON only
   - Ensure IDs are lowercase and hyphenated

3) Validate
   - `npm run validate`
   - Fix any schema errors or missing required fields

4) Sanity-check
   - `npm run query -- --pack <pack-id> "cardboard"`
   - Verify option cards are targeted to the right `kind`

Notes:
- Prefer official sources over secondary listings.
- Keep `actions` short and specific to the `kind`.
- Use `dropoff_other` when there are multiple non-city drop-off options without a single official facility.
- When an item has both `dropoff_other` and `dropoff_recycle`, keep `copy_text` guidance consistent. Do not truncate constraints (fees, minimum metal content, prep steps, etc.) on location-specific cards.

## Pack format
Packs live at `packages/packs/<pack-id>/pack.json` and follow a small, stable schema.

Required fields:
- `pack_id`, `pack_version`, `retrieved_at`
- `jurisdiction` or `municipality`
- `locations[]` (id, name, country)
- `items[]` (id, name, keywords?, option_cards[])

Optional versioning:
- `pack_schema_version` (e.g. `1.1.0`)

Recommended fields for international support:
- `jurisdiction` (name, country, kind?, admin_areas?)
- `locations[].address_lines` or `locations[].locality`
- `locations[].admin_areas`

Example (minimal):
```json
{
  "pack_id": "example-town-us",
  "pack_version": "0.1.0",
  "retrieved_at": "2026-02-02T00:00:00Z",
  "jurisdiction": {
    "name": "Example Town",
    "country": "US",
    "kind": "municipality",
    "admin_areas": [
      {"name": "ST", "type": "region", "code": "ST"}
    ]
  },
  "locations": [
    {
      "id": "example-dropoff",
      "name": "Example Drop-off Center",
      "country": "US"
    }
  ],
  "items": [
    {
      "id": "cardboard",
      "name": "Cardboard",
      "keywords": ["boxes", "corrugated"],
      "option_cards": [
        {
          "id": "cardboard-dropoff",
          "kind": "dropoff_recycle",
          "title": "Recycle at drop-off",
          "priority": 10,
          "confidence": 0.8,
          "actions": [
            {
              "type": "navigate",
              "label": "Go",
              "payload": {
                "location_id": "example-dropoff"
              }
            }
          ]
        }
      ]
    }
  ]
}
```
