# Model Bakeoff — Spark Mojo Build Factory

**Purpose:** Determine which OSS model performs best at each build factory task type.
The spec factory always uses Claude Opus (settled). This bakeoff gates the BUILD factory only.

**When to re-run:** Whenever a new strong OSS coding model ships. The test battery is reusable.

---

## Models Under Test

| Model | Provider | Access Via |
|-------|----------|-----------|
| Kimi K2 | Moonshot AI | OpenCode (`moonshot/kimi-k2`) |
| MiniMax M1 | MiniMax | OpenCode (`minimax/minimax-m1`) |
| Qwen 3 235B | Alibaba | OpenCode (`openrouter/qwen/qwen3-235b-a22b`) |
| Claude Sonnet 4.5 | Anthropic | Claude Code (baseline) |

Update model strings as new versions ship. Check OpenCode `--list-models` to confirm available identifiers.

---

## Test Battery

Six tests, each targeting a distinct build factory task type:

| # | File | Task Type | Source Material |
|---|------|-----------|----------------|
| 01 | `test-cases/01-story-decomposition.md` | Architectural reasoning | CRM Client Identity research (CDP run) |
| 02 | `test-cases/02-spec-writing.md` | Specification writing | New story prompt, scored against BILL-010 quality bar |
| 03 | `test-cases/03-prose-quality.md` | Prose generation | WorkboardMojo (fully built) |
| 04 | `test-cases/04-frappe-implementation.md` | Frappe code implementation | Fresh micro-spec (single endpoint) |
| 05 | `test-cases/05-react-implementation.md` | React JSX implementation | Fresh component spec |
| 06 | `test-cases/06-code-review-with-bugs.md` | Adversarial code review | Deliberately buggy implementation (5 planted violations) |

---

## How to Run

### Step 1: Run each model against each test case

For each test case, paste the prompt section into OpenCode (or Claude Code for the baseline) with the specified model. Do NOT provide the scoring rubric or answer key to the model.

```bash
# Example: run test 01 with Kimi K2
opencode --model moonshot/kimi-k2 < test-cases/01-story-decomposition.md
```

Capture each output to a file:
```
results/kimi-k2-01.md
results/kimi-k2-02.md
...
results/sonnet-baseline-06.md
```

### Step 2: Score each output

Read each result against the scoring rubric in the test case file. Score 1-5 per category. Record in `results/bakeoff-YYYY-MM-DD.md`.

### Step 3: Assign models to hats

Read `MODEL-ASSIGNMENTS.md` and fill in the winner per hat based on scores. The Builder and Reviewer hats MUST be different models.

---

## Scoring Scale

| Score | Meaning |
|-------|--------|
| 5 | Excellent. Matches or exceeds the quality bar. No corrections needed. |
| 4 | Good. Minor gaps but usable. Light correction required. |
| 3 | Adequate. Significant gaps but structurally correct. |
| 2 | Poor. Fundamental misunderstandings. Would cause failures downstream. |
| 1 | Fail. Output is wrong, hallucinated, or violates hard constraints. |

---

## Estimated Run Time and Cost

- Each test: 5-15 minutes to run, 10-20 minutes to score
- Full battery (4 models x 6 tests): 2-3 hours elapsed, ~$15-30 total
- Baseline (Sonnet only, to establish quality bar first): 30-45 minutes, ~$3-5

**Recommended order:** Run Sonnet baseline first to calibrate what "good" looks like, then run OSS candidates.
