# Decisions

Record significant decisions and rationale here.

## 2026-02-02 - Data-first packs + minimal tooling
- Packs are plain JSON to keep data portable and easy to audit.
- Validation and querying are handled by small Node scripts to avoid heavy dependencies.

## 2026-02-03 - Schema evolution + search index
- Added `jurisdiction` to support non-US hierarchies while keeping `municipality` backward compatible.
- Added optional `pack_schema_version` and schema hash in manifests for compatibility checks.
- Introduced a lightweight token search index (`dist/search.json`) to improve lookup without a server.
