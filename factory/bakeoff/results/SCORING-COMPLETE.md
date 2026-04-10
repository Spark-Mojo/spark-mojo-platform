# Scoring Complete

Date: 2026-04-10
Scored by: Claude Code (Opus 4.6, 1M context) — scoring commission
Output: factory/bakeoff/results/bakeoff-2026-04-09.md

## Scoring Summary

- 126 model output files scored against 18 rubrics (7 models x 18 submissions)
- Parallel scoring agents per test type, each reading all model outputs independently
- Chat-window delivery artifacts (reasoning text, intermediate versions) excluded from scoring — final implementations evaluated
- Hat assignments produced for all 8 build factory hats + 4 spec factory hats

## Key Results

| Rank | Model | Total /130 | Consistency (mean range) |
|------|-------|-----------|------------------------|
| 1 | model-beta | 129.0 | 0.3 (exceptional) |
| 2 | model-delta | 126.3 | 1.3 (excellent) |
| 3 | model-alpha | 121.3 | 3.3 (moderate) |
| 4 | model-theta | 116.3 | 2.0 (good) |
| 5 | model-gamma | 114.0 | 3.2 (moderate) |
| 6 | model-epsilon | 108.7 | 1.7 (good) |
| 7 | model-zeta | 107.0 | 5.3 (poor) |

## Hat Assignments (pre-reveal)

- model-beta: Planner, Primary Reviewer, KB Verifier, Finalizer (4 hats)
- model-delta: Builder, Deployer (2 hats)
- model-gamma: Secondary Reviewer (1 hat)
- model-theta: No primary hat; backup Planner (T01 range 0) and backup Builder (T05: 24.0)
- Static Analyzer: deterministic (no LLM)

## Human Actions Required

1. Read bakeoff-2026-04-09.md Section 4 (Hat Assignment Analysis)
2. Reveal BLIND-KEY.md to map code names to real model names
3. Schedule review session with Claude Chat to validate close calls
4. Fill MODEL-ASSIGNMENTS.md based on recommendations
5. Complete Section 6 (Cost-Quality Assessment) after reveal
6. Decide on SPEC-FACTORY-BAKEOFF-001 based on whether model-beta/delta are OSS
