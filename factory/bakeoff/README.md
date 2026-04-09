# Model Bakeoff — Spark Mojo Build Factory

**Purpose:** Determine which model performs best at each build factory task type.
The spec factory always uses Claude Opus (settled — for now; see SPEC-FACTORY-BAKEOFF-001 in backlog). This bakeoff gates the BUILD factory only.

**When to re-run:** Whenever a new strong OSS model ships. The test battery is reusable.

---

## Protocol: Blind Testing

All models run under code names to prevent evaluator bias. The code name to real model mapping lives in `results/BLIND-KEY.md`. The evaluator does not see `BLIND-KEY.md` until all scoring is complete.

Code names: model-alpha, model-beta, model-gamma, model-delta, model-epsilon, model-zeta

---

## Models Under Test (April 2026)

| Code Name | Real Model | Provider | Model String |
|-----------|------------|----------|-------------|
| model-[assigned by James] | Kimi K2 | Moonshot AI | `moonshot/kimi-k2` |
| model-[assigned by James] | MiniMax M1 | MiniMax | `minimax/minimax-m1` |
| model-[assigned by James] | Qwen 3 235B | Alibaba | `openrouter/qwen/qwen3-235b-a22b` |
| model-[assigned by James] | GLM 5.1 | Zhipu AI | Verify string via OpenRouter `--list-models` |
| model-[assigned by James] | Claude Sonnet 4.6 | Anthropic | Baseline reference |
| model-[assigned by James] | Claude Opus 4.5 | Anthropic | Cost/quality comparison reference |

Assign code names privately in `results/BLIND-KEY.md` before running any submissions.

---

## Test Battery

18 total submissions (6 tests × 3 runs each). Each run uses a different example of the same task type.

| Test | Task Type | Runs |
|------|-----------|------|
| 01 Story decomposition | Architectural reasoning | A: CRM, B: Scheduling, C: Wiki |
| 02 Spec writing | Specification writing | A: CRM contact endpoint, B: Claim state query, C: Notification preferences |
| 03 Prose quality | Prose generation | A: WorkboardMojo USER-GUIDE, B: Billing INTERNAL-PLAYBOOK, C: Scheduling USER-GUIDE |
| 04 Frappe implementation | Backend code | A: Vocabulary cascade, B: Claim transition, C: Feature flags |
| 05 React implementation | Frontend code | A: FeatureFlagBadge, B: ClaimStatusPill, C: ProviderSelector |
| 06 Code review with bugs | Adversarial review | A: Vocabulary/settings, B: Scheduling, C: Payer management |

Test case files:
- Run A: `test-cases/[NN]-[name].md` (original files, unchanged)
- Run B: `test-cases/[NN]-[name]-run-b.md`
- Run C: `test-cases/[NN]-[name]-run-c.md`

---

## How to Run

### Step 1: Assign blind codes (James only, before running anything)
Fill in `results/BLIND-KEY.md`. Map 6 code names to 6 real model names. Keep private from evaluator.

### Step 2: Run 18 submissions in OpenRouter playground
Each submission: paste the prompt section from a test case file into the playground with all 6 models active simultaneously. All 6 respond at once.

Save each model's output as an individual file:
```
results/test-01-story-decomposition/RUN-A/prompt.md  ← the prompt you used
results/test-01-story-decomposition/RUN-A/model-alpha.md  ← one file per model
results/test-01-story-decomposition/RUN-A/model-beta.md
...
results/test-01-story-decomposition/RUN-A/model-zeta.md
```

Repeat for all 18 submissions. Total: 18 prompt.md files + 108 model output files.

### Step 3: Scoring session (Claude Chat)
Provide the test case file (rubric) and each model's output file. Score 1-5 per category. Record in `results/bakeoff-YYYY-MM-DD.md`.

### Step 4: Reveal blind key
James shares `results/BLIND-KEY.md`. Map code names to real model names. Fill in `MODEL-ASSIGNMENTS.md`.

---

## Output File Header Format

Add this minimal header to the top of each model output file when saving:
```
model: model-[code-name]
test: [NN]-[test-name]
run: [A/B/C]
date: YYYY-MM-DD
```

---

## Scoring Scale

| Score | Meaning |
|-------|---------|
| 5 | Excellent. Matches or exceeds the quality bar. No corrections needed. |
| 4 | Good. Minor gaps but usable. Light correction required. |
| 3 | Adequate. Significant gaps but structurally correct. |
| 2 | Poor. Fundamental misunderstandings. Would cause failures downstream. |
| 1 | Fail. Output is wrong, hallucinated, or violates hard constraints. |

**Test 06 uses binary scoring (0 or 1 per violation caught), not the 1-5 scale.**

Consistency metric: max score - min score across 3 runs. Range > 1 = reliability penalty.

---

## Estimated Time

- 18 submissions in OpenRouter: 1-2 hours
- Scoring session: 3-4 hours (evaluator reviews 108 output files)
- Total: approximately one working day
