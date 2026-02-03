# RePath pack creation prompt

You are creating a jurisdiction pack for RePath.

Constraints:
- Follow `schema/pack.schema.json` exactly.
- Output JSON only (no prose, no markdown).
- Do not fabricate rules, hours, or locations. If unsure, leave items out.
- Use only official sources for rules and locations; cite them inline in a `sources` field inside each item if needed (non-schema) and remove before final output.
- Use `retrieved_at` as an ISO 8601 UTC timestamp when data was last verified.

Process:
1) Collect official sources for the jurisdiction (city/county recycling program pages, HHW pages, official A–Z lists).
2) Create `locations` with IDs, names, addresses, hours, and websites from official sources.
3) Create `items` with clear `name` and `keywords` (include common terms and misspellings).
4) For each item, add one or more `option_cards` using appropriate `kind` values:
   - reuse, curbside_recycle, dropoff_recycle, dropoff_other, dropoff_hhw, compost, trash, sell
5) For each `option_card`, include `actions`:
   - `copy_text` with short, targeted guidance.
   - `navigate` with `payload.location_id` when a specific location applies.
   - If an item has both `dropoff_other` and `dropoff_recycle`, keep the `copy_text` guidance identical or more detailed for `dropoff_recycle`. Do not omit constraints (fees, minimum metal content, prep steps, etc.).
6) For `reuse` (and `sell`) cards, include local sharing/resale options in the guidance:
   - Always consider Craigslist, Facebook Marketplace, Freecycle, and The Buy Nothing Project.
   - Add any other locale-specific options if officially listed.
6) Ensure IDs are lowercase and hyphenated.

Example action objects:
- copy_text: {"type":"copy_text","label":"Prep","text":"Flatten cardboard; keep clean and dry."}
- navigate: {"type":"navigate","label":"Go","payload":{"location_id":"timberline-recycling-center"}}
