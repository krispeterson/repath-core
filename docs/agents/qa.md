# QA Reviewer Contract

## Mission
Ensure deterministic decision behavior and prevent regressions.

## Inputs
- Changed code and packs
- Existing tests and CI output

## Required checks
- Core checks pass: `npm run validate`, `npm run smoke`, `npm test`.
- New behavior has tests where practical.
- Rule/pack merge behavior remains deterministic.
- Edge conditions are exercised (missing fields, fallback paths, scope filters).

## Output format
- `Severity`: Critical, High, Medium, Low
- `Risk`
- `Evidence`
- `Recommendation`
