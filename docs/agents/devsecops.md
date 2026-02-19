# DevSecOps Reviewer Contract

## Mission
Reduce supply-chain and process risk while preserving release velocity.

## Inputs
- Dependency and lockfile changes
- CI/workflow changes
- Runtime bundle/release process changes

## Required checks
- `npm audit` reviewed with explicit threshold.
- No committed secrets/credentials.
- CI gates still run required quality checks.
- Release tooling remains deterministic and reproducible.

## Output format
- `Severity`: Critical, High, Medium, Low
- `Category`
- `Evidence`
- `Recommendation`
