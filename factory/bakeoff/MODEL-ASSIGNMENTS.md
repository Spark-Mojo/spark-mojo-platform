# Build Factory Model Assignments

**Last updated:** [DATE]
**Bakeoff results file:** `factory/bakeoff/results/bakeoff-[DATE].md`

---

## Spec Factory (Settled - No Bakeoff Required)

All spec factory hats use Claude Opus via Claude Code.

---

## Build Factory Assignments

Fill in after running the bakeoff. Builder and Reviewer 1 MUST be different models.

| Hat | Task Type | Assigned Model | Score | Notes |
|-----|-----------|---------------|-------|-------|
| Planner | Architectural reasoning | | /25 | |
| Builder | Code implementation (Frappe + React) | | /25 avg | Average of tests 04 and 05 |
| Static Analyzer | Deterministic (shell commands) | N/A | N/A | No model - runs bash |
| Reviewer 1 (Primary) | Adversarial review | | /5 | MUST differ from Builder |
| Reviewer 2 (Secondary) | Adversarial review | | /5 | MUST differ from Builder AND Reviewer 1 |
| KB Verifier | Prose quality | | /25 | Test 03 score |
| Deployer | Code implementation | | | Use same model as Builder |
| Finalizer | Deterministic checks | | | Use cheapest passing model |

---

## Model Scores Summary

| Model | Test 01 Story Decomp | Test 02 Spec Writing | Test 03 Prose | Test 04 Frappe Impl | Test 05 React Impl | Test 06 Code Review | Total |
|-------|---------------------|---------------------|--------------|--------------------|--------------------|---------------------|-------|
| Kimi K2 | /25 | /25 | /25 | /25 | /25 | /5 | /130 |
| MiniMax M1 | /25 | /25 | /25 | /25 | /25 | /5 | /130 |
| Qwen 3 235B | /25 | /25 | /25 | /25 | /25 | /5 | /130 |
| Sonnet 4.5 (baseline) | /25 | /25 | /25 | /25 | /25 | /5 | /130 |

---

## Decision Rules

1. If NO OSS model scores >= 18/25 on implementation tests (04 + 05): use Claude Code for Builder. Accept the rate limit cost for that hat only.
2. If Builder and best Reviewer are the same model: use second-best Reviewer scorer instead.
3. If Planner best scorer is the same as Builder: acceptable. Planner is a planning task, not a review task.
4. Minimum passing score for any hat assignment: 15/25 (or 3/5 for review hats).

---
