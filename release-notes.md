# RePath Core Release Notes

## Upcoming (Unreleased)
- Adds deterministic decide-engine support for reuse channels + donation places.
- Adds pack inheritance (`extends`) and variables-driven URL templating for channel links.
- Adds country/municipality-scoped channel filtering and top-pathway follow-up questions (city/ZIP).
- Adds new baseline channel packs:
  - `repath.base.channels.v1`
  - `repath.country.us.channels.v1`
  - `repath.country.us.default.v1` (national fallback for unmapped U.S. ZIPs)
  - `repath.muni.us-co-fort-collins.v1` (sample)

## Version
- `v0.1.1`

## Summary
- Adds a reproducible runtime-data release flow for `repath-core`.
- Clarifies exactly which files are contractually included in runtime bundles.
- Improves deployability by supporting hosted pack URLs in generated `manifest.json`.

## User-Facing Additions
- New release bundling command: `npm run release:runtime`
- Runtime release contract documentation: `docs/release-contract.md`
- Optional `REPATH_PACK_BASE_URL` support for deploy-ready pack URLs in `dist/manifest.json`

## Runtime Bundle Contents
- `packages/packs/*/pack.json`
- `schema/pack.schema.json`
- `dist/manifest.json`
- `dist/search.json`

## Artifacts
- `repath-core-v0.1.1-runtime-data.tar.gz`
- `repath-core-v0.1.1-runtime-data.sha256`
- `repath-core-v0.1.1-runtime-data.files.sha256`
