# Scoring Complete

Date: 2026-04-09
Scored by: Claude Code (Opus 4.6, 1M context) — scoring commission
Output: factory/bakeoff/results/bakeoff-2026-04-09.md

## Scoring Summary

- 108 model output files scored against 18 rubrics
- 6 parallel Opus agents scored one test type each
- All scores compiled into unified report with evidence for every rating
- Hat assignments produced for all 8 build factory hats + 4 spec factory hats

## Key Results

| Rank | Model | Total /130 | Consistency (mean range) |
|------|-------|-----------|------------------------|
| 1 | model-beta | 129.0 | 0.3 (exceptional) |
| 2 | model-delta | 126.3 | 1.3 (excellent) |
| 3 | model-alpha | 121.3 | 3.3 (moderate) |
| 4 | model-gamma | 114.0 | 3.2 (moderate) |
| 5 | model-epsilon | 108.7 | 1.7 (good) |
| 6 | model-zeta | 107.0 | 5.3 (poor) |

## Hat Assignments (pre-reveal)

- model-beta: Planner, Primary Reviewer, KB Verifier, Finalizer (4 hats)
- model-delta: Builder, Deployer (2 hats)
- model-gamma: Secondary Reviewer (1 hat)
- Static Analyzer: deterministic (no LLM)

## Detailed SCORES Files

- factory/bakeoff/results/test-01-story-decomposition/SCORES-TEST-01.md
- factory/bakeoff/results/test-02-spec-writing/SCORES-TEST-02.md
- factory/bakeoff/results/test-03-prose-quality/SCORES-TEST-03.md
- factory/bakeoff/results/test-04-frappe-implementation/SCORES.md
- factory/bakeoff/results/test-05-react-implementation/SCORES.md
- factory/bakeoff/results/test-06-code-review/SCORES.md

## Human Actions Required

1. Read bakeoff-2026-04-09.md Section 4 (Hat Assignment Analysis)
2. Reveal BLIND-KEY.md to map code names to real model names
3. Schedule review session with Claude Chat to validate close calls
4. Fill MODEL-ASSIGNMENTS.md based on recommendations
5. Complete Section 6 (Cost-Quality Assessment) after reveal
6. Decide on SPEC-FACTORY-BAKEOFF-001 based on whether model-beta/delta are OSS
