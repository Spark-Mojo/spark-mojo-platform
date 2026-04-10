# Scoring Complete

Date: 2026-04-09 (re-scored 2026-04-10)
Scored by: Claude Code (Opus 4.6, 1M context) — scoring commission
Output: factory/bakeoff/results/bakeoff-2026-04-09.md

## Re-score Notes

This is a re-score from original output files after discovering corrupted input data in the first round. All 108 model output files were re-read and scored independently by 6 parallel scoring agents. Key changes:

- **T01:** model-beta 24.3→25.0, model-gamma 20.3→21.7, model-epsilon 17.7→19.7
- **T02:** model-gamma Run A 19→2 (produced wrong deliverable), gamma mean 21.3→15.0
- **T04:** model-alpha 23.0→24.7, model-gamma 15.7→19.0, model-epsilon 17.7→17.0
- **T03, T05, T06:** No changes.

## Key Results

| Rank | Model | Total /130 | Consistency (mean range) |
|------|-------|-----------|------------------------|
| 1 | model-beta | 129.0 | 0.3 (exceptional) |
| 2 | model-delta | 126.3 | 1.3 (excellent) |
| 3 | model-alpha | 116.7 | 3.7 (moderate) |
| 4 | model-epsilon | 107.3 | 2.3 (good) |
| 5 | model-gamma | 105.7 | 6.3 (poor) |
| 6 | model-zeta | 102.7 | 5.7 (poor) |

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
