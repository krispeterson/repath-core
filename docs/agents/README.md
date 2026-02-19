# Agent Review Contracts

This folder defines role contracts for structured reviews during implementation and release.
These contracts are written for AI coding/review agents (for example GPT-Codex or Claude Code) and can also be used as manual reviewer checklists.

## Roles
- `ux.md`: user-facing copy and flow quality for decision outputs and CLI/app touchpoints.
- `qa.md`: correctness, regression coverage, and deterministic behavior.
- `devsecops.md`: dependency/security posture and release process integrity.
- `pm.md`: issue alignment, acceptance criteria, and release-note hygiene.

## How to use
1. Review contracts before implementation and before merge.
2. Record findings in PR under `Agent Reviews`.
3. Block merge on unresolved critical/high findings unless waived.
4. Invoke one role at a time in your AI tool and request output in the contract format.
