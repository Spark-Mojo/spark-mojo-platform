# Scoring Complete

Date: 2026-04-09
Scored by: Claude Code (Opus 4.6, 1M context — scoring commission)
Output: factory/bakeoff/results/bakeoff-2026-04-09.md

## Scoring Summary

- 108 model output files scored against 18 rubrics
- 6 parallel Opus agents scored one test type each
- All scores compiled into unified report with evidence for every rating
- Hat assignments produced for all 8 build factory hats + 4 spec factory hats

## Key Results

| Rank | Model | Total /130 | Consistency (mean range) |
|------|-------|-----------|------------------------|
| 1 | model-beta | 128.7 | 0.5 (exceptional) |
| 2 | model-delta | 127.7 | 1.0 (excellent) |
| 3 | model-alpha | 117.7 | 3.8 (moderate) |
| 4 | model-gamma | 107.3 | 5.0 (poor) |
| 5 | model-epsilon | 107.0 | 2.2 (good) |
| 6 | model-zeta | 104.3 | 5.8 (poor) |

## Hat Assignments (pre-reveal)

- model-beta: Planner, Primary Reviewer, KB Verifier, Finalizer (4 hats)
- model-delta: Builder, Deployer (2 hats)
- model-gamma: Secondary Reviewer (1 hat)
- Static Analyzer: deterministic (no LLM)

## Human Actions Required

1. Read bakeoff-2026-04-09.md Section 4 (Hat Assignment Analysis)
2. Reveal BLIND-KEY.md to map code names to real model names
3. Schedule review session with Claude Chat to validate close calls
4. Fill MODEL-ASSIGNMENTS.md based on recommendations
5. Complete Section 6 (Cost-Quality Assessment) after reveal
6. Decide on SPEC-FACTORY-BAKEOFF-001 based on whether model-beta/delta are OSS
