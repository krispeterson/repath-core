# RePath Core Release Notes

## Version
- `v0.2.0`

## Summary
- Adds deterministic reuse-channel and donation-place support to the core decide engine.
- Extends the pack system with inheritance, scoped channel filtering, and URL templating for reusable options.
- Standardizes runtime bundle generation for deployable pack/schema/manifest/search artifacts.

## User-Facing Additions
- Decision outputs can now include:
  - online/community reuse channels (sell/give-away/exchange/repair/donation directories)
  - physical donation places from pack data
- Top-ranked pathways can now request missing city/ZIP context only when needed to resolve relevant channels.

## Developer and Integration Additions
- Decide-engine and pack updates:
  - pack inheritance with `extends`
  - pack-level `variables` for URL templating
  - country/municipality channel scope filtering
  - top-pathway follow-up question generation for missing template fields
- New baseline packs:
  - `repath.base.channels.v1`
  - `repath.country.us.channels.v1`
  - `repath.country.us.default.v1`
  - `repath.muni.us-co-fort-collins.v1`
- Runtime release tooling:
  - `npm run release:runtime`
  - `docs/release-contract.md`
  - optional `REPATH_PACK_BASE_URL` support for hosted pack URLs in generated `dist/manifest.json`
- Runtime bundle contract includes:
  - `packages/packs/*/pack.json`
  - `schema/pack.schema.json`
  - `dist/manifest.json`
  - `dist/search.json`

## Release Artifacts
- `repath-core-v0.2.0-runtime-data.tar.gz`
- `repath-core-v0.2.0-runtime-data.sha256`
- `repath-core-v0.2.0-runtime-data.files.sha256`

## Validation Snapshot
- `npm run validate` passed.
- `npm run smoke` passed.
- `npm test` passed.

## Known Limitations
- Runtime release script packages local runtime data artifacts only; publication to package/CDN registries is a separate step.
