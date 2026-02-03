# Architecture

RePath is a data-first decision engine. Packs encode local reuse/recycling guidance as structured JSON. Node scripts read those packs to validate data and answer simple item queries.

## Components
- `packages/packs/`: Pack data by jurisdiction.
- `tools/query-pack.js`: Simple search over a pack's items.
- `tools/validate-pack.js`: Lightweight schema validation for packs.

## Data flow
1. A pack is created or updated under `packages/packs/<pack-id>/pack.json`.
2. `npm run validate` checks structure and required fields.
3. `npm run query` searches items and prints option cards for a match.
