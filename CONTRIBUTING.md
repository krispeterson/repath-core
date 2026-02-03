# Contributing

Thanks for helping improve RePath.

## Setup
```bash
npm install
```

## Validate packs
```bash
npm run validate
```

## Query a pack
```bash
npm run query -- --pack <pack-id> "search term"
```

## Data changes
- Update or add packs under `packages/packs/<pack-id>/pack.json`.
- Keep IDs stable and lowercase with hyphens.
- Prefer adding `keywords` to improve search hits.
- For non-US packs, prefer `jurisdiction` with `admin_areas` over `municipality`.
- If an item has both `dropoff_other` and `dropoff_recycle`, keep `copy_text` guidance consistent or more detailed for `dropoff_recycle`. Do not drop constraints like fees or minimum metal content.

## Pull requests
- Include validation output or note why it cannot be run.
- Describe any data sources used to update a pack.
