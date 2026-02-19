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
- Fill `.github/pull_request_template.md` (including `Agent Reviews`).
- Ensure local gates pass before opening PR:
  - `npm run validate`
  - `npm run smoke`
  - `npm test`
  - `npm run review:devsecops`
  - `npm run review:pm`

## Role contracts
- Review role expectations in `docs/agents/README.md`.
- Use the specific role docs (`ux.md`, `qa.md`, `devsecops.md`, `pm.md`) when preparing review findings.
- `Role Review Gates` runs automatically on PRs and can be run manually from GitHub Actions.

## AI role-contract workflow
Role contracts are AI-oriented reviewer specs. They define:
- the role's mission and scope
- required checks
- expected output format and severity rubric

They are designed for local AI coding/review tools (for example GPT-Codex or Claude Code) so review quality is consistent across pack and engine changes.

Recommended invocation pattern:
1. Pick a single role contract (`ux.md`, `qa.md`, `devsecops.md`, or `pm.md`).
2. Ask your AI tool to review only through that contract.
3. Request findings in the contract format, then add them to the PR `Agent Reviews` section.
4. Run local gates (`validate`, `smoke`, `test`, `review:devsecops`, `review:pm`) before opening PR.

Example prompts for Codex/Claude-style tools:
```text
Use docs/agents/qa.md as the review contract.
Review my current branch changes against that contract only.
Return findings ordered by severity with file references and concrete fixes.
```

```text
Use docs/agents/pm.md as the review contract.
Check scope alignment, acceptance criteria coverage, and release-note impact.
```

Notes:
- Run one role at a time to avoid mixed recommendations.
- AI role reviews are advisory; CI gates remain authoritative.
