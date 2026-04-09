# Bakeoff Scoring Commission
# factory/bakeoff/SCORING-COMMISSION.md

**Agent:** Claude Code (direct invocation, not Ralph)
**Task:** Score all 108 model output files against their rubrics. Produce a
completed bakeoff-2026-04-09.md. Write SCORING-COMPLETE.md when done.

---

## Your Task

You are scoring a blind model bakeoff. You do NOT know which real model
corresponds to which code name. Do not attempt to infer it. Score only
what you observe in the output files.

Read each model's output file. Read the corresponding test case rubric.
Score the output against the rubric. Record evidence for every score.
Never assign a score without a specific observation to support it.

---

## File Locations

All paths are relative to the repo root (`spark-mojo-platform/`).

**Test case rubrics (18 files):**
factory/bakeoff/test-cases/01-story-decomposition.md <- Run A rubric
factory/bakeoff/test-cases/01-story-decomposition-run-b.md
factory/bakeoff/test-cases/01-story-decomposition-run-c.md
factory/bakeoff/test-cases/02-spec-writing.md
factory/bakeoff/test-cases/02-spec-writing-run-b.md
factory/bakeoff/test-cases/02-spec-writing-run-c.md
factory/bakeoff/test-cases/03-prose-quality.md
factory/bakeoff/test-cases/03-prose-quality-run-b.md
factory/bakeoff/test-cases/03-prose-quality-run-c.md
factory/bakeoff/test-cases/04-frappe-implementation.md
factory/bakeoff/test-cases/04-frappe-implementation-run-b.md
factory/bakeoff/test-cases/04-frappe-implementation-run-c.md
factory/bakeoff/test-cases/05-react-implementation.md
factory/bakeoff/test-cases/05-react-implementation-run-b.md
factory/bakeoff/test-cases/05-react-implementation-run-c.md
factory/bakeoff/test-cases/06-code-review-with-bugs.md <- Run A rubric (filename retained from original)
factory/bakeoff/test-cases/06-code-review-run-b.md
factory/bakeoff/test-cases/06-code-review-run-c.md


**Model output files (108 files):**
factory/bakeoff/results/test-01-story-decomposition/RUN-A/model-alpha.md
factory/bakeoff/results/test-01-story-decomposition/RUN-A/model-beta.md
factory/bakeoff/results/test-01-story-decomposition/RUN-A/model-gamma.md
factory/bakeoff/results/test-01-story-decomposition/RUN-A/model-delta.md
factory/bakeoff/results/test-01-story-decomposition/RUN-A/model-epsilon.md
factory/bakeoff/results/test-01-story-decomposition/RUN-A/model-zeta.md
[...same pattern for RUN-B and RUN-C, and for all 6 test types]


**Scoring template to fill:**
`factory/bakeoff/results/bakeoff-2026-04-09.md`

**Completion signal to write:**
`factory/bakeoff/results/SCORING-COMPLETE.md`

---

## Order of Operations

Process one test type at a time. For each test:
1. Read the Run A, Run B, and Run C rubric files for that test.
2. Note the named scoring categories from the rubric (each test has 5 named
   categories - use those names, not generic A/B/C/D/E labels).
3. For each run, read all 6 model output files.
4. Score each model against the rubric. Produce the scoring block below.
5. After all 3 runs for a model are scored, produce the per-model summary block.
6. Move to the next test type.

After all 6 test types are scored, fill the summary table and all hat
assignment sections in bakeoff-2026-04-09.md. Write the executive summary
last (Section 1).

---

## Scoring Format

### Per-Model Per-Run Block

```
MODEL: model-[code] | TEST: [NN] | RUN: [A/B/C]
[Category name from rubric]: [score]/5
Evidence: [1-2 sentences citing specific observation from the output]
Failure classification: [FUNDAMENTAL / CORRECTABLE / DOMAIN / N/A]

[Category name from rubric]: [score]/5
Evidence: [...]
Failure classification: [...]

[...repeat for all 5 named categories]

TOTAL: [sum]/25
Notable strength: [what this output did particularly well, 1 sentence]
Notable failure: [the most significant problem, 1 sentence, or "None"]
```

For Test 06 (binary scoring - use violation category names, not generic labels):

```
MODEL: model-[code] | TEST: 06 | RUN: [A/B/C]
[REACT-FRAPPE]: [1=caught / 0=missed]
Evidence: [what the model said, or why it was missed]
Failure classification if missed: [FUNDAMENTAL / CORRECTABLE]

[TYPESCRIPT]: [1/0] — Evidence: [...]
[HEX-COLOR]: [1/0] — Evidence: [...]
[SM-PREFIX]: [1/0] — Evidence: [...]
[N8N-BOUNDARY]: [1/0] — Evidence: [...]
TOTAL: [sum]/5
```

### Per-Model Per-Test Aggregation

After scoring all 3 runs for a model on a test:

```
MODEL: model-[code] | TEST: [NN] SUMMARY
Run A: [score] | Run B: [score] | Run C: [score]
Mean: [X.X] | Range: [Y] | Consistency: [High/Medium/Low]
High = range 0-1 | Medium = range 2 | Low = range 3+

Consistency narrative: [1-2 sentences: what changed between runs? Was it
domain-specific? Did it improve or degrade? Which category drove variance?]

Dominant strength: [what this model reliably does well on this task type]
Dominant weakness: [what this model consistently misses or gets wrong]
Prompt engineering note: [if assigned to this hat, what one instruction in
the hat prompt would compensate for the dominant weakness? Be specific.]
```

---

## Final Report Structure

Fill bakeoff-2026-04-09.md with these sections in order.

### Section 1: Executive Summary
Write last. 3-5 sentences. Which models performed best overall. Any surprises.
Whether any OSS model clearly dominates or whether performance splits by task type.

### Section 2: Summary Score Table

| Model | T01 /25 | T02 /25 | T03 /25 | T04 /25 | T05 /25 | T06 /5 | TOTAL | CONSISTENCY |
(means across 3 runs. Consistency = mean range across all 6 tests.)

### Section 3: Detailed Scores By Test

For each test:
- Score table (mean + range per model)
- Per-model per-run evidence notes
- Per-model consistency narrative
- Test-level ranking with brief rationale

### Section 4: Hat Assignment Analysis

For each build factory hat, produce this block:

```
HAT: [Name]
Relevant tests: [e.g. T04 + T05]
Combined mean scores:
  model-alpha: [X.X]
  model-beta: [X.X]
  model-gamma: [X.X]
  model-delta: [X.X]
  model-epsilon: [X.X]
  model-zeta: [X.X]

TIER 1 — Strongly Recommended (mean >= 20/25, range <= 2):
  [list models, or "None"]

TIER 2 — Acceptable with Caveats (mean 15-19 or range 3-4):
  [list models with specific caveat]
  Example: "model-beta (mean 17.3): Acceptable but consistently misses error
  handling edge cases — add explicit error state enumeration to hat prompt"

TIER 3 — Not Recommended (mean < 15 or critical failure):
  [list models with specific disqualification reason]
  Example: "model-gamma: DISQUALIFIED — produced TypeScript in .jsx files
  across all 3 React runs despite explicit prohibition. FUNDAMENTAL failure."

Recommended assignment: [specific model, tier, confidence level]
Confidence: High / Medium / Low
  High = clear Tier 1 winner with no close competitor
  Medium = Tier 1 winner but margin is small or consistency is medium
  Low = no clear winner; recommendation is best-available

Hat-specific prompt addition: [one instruction to add to this hat's system
prompt based on the recommended model's known dominant weakness]
```

Produce this block for all 8 hats:
- Planner (Story Decomposer) — T01
- Builder (Code Implementation) — T04 + T05 weighted equally
- Static Analyzer — deterministic, skip model analysis
- Primary Reviewer — T06
- Secondary Reviewer — T06
- KB Verifier — T03
- Deployer — T04
- Finalizer — T02 + T04 weighted equally

Constraints:
- Builder and Primary Reviewer MUST be different models.
- Secondary Reviewer MUST differ from both Builder and Primary Reviewer.
- If only 1 model clears Tier 1 for a hat, second reviewer comes from Tier 2.

### Section 5: Cross-Model Pattern Analysis
- Models that over- or under-performed expectations
- Models with inconsistent profiles (strong at one task type, weak at another)
- Violation categories where all models struggled (systemic prompt gap, not model weakness)
- Violation categories all models caught reliably

### Section 6: Cost-Quality Assessment

**SKIP — complete after blind key reveal.**

Leave this section in bakeoff-2026-04-09.md with this placeholder:

```
## Section 6: Cost-Quality Assessment

Status: Pending blind key reveal. Cannot complete until real model names
are known. Pricing varies significantly by provider and model.

Complete in the post-reveal review session with Claude Chat using:
- OpenRouter pricing for OSS models
- Claude Opus 4.5: ~$15/MTok input
- Claude Sonnet 4.6: ~$3/MTok input
- Assumption: 50K input tokens per hat activation, 8 hats per capability run
```

### Section 7: Spec Factory Applicability

Apply a higher quality bar for spec factory: minimum mean 22/25 for Tier 1
(vs 20/25 for build factory). Produce a separate spec factory hat assignment
table for these hats:
- Story Decomposer — T01
- Spec Writer — T02
- KB Drafter — T03
- Adversarial Verifier — T06 (scaled: Tier 1 = 4.4/5)

Flag whether any OSS model clears Tier 1 for any spec factory hat.

### Section 8: Recommended Next Steps
- Final MODEL-ASSIGNMENTS.md entries (copy-paste ready)
- Any hats where a re-run with better context (skill files, codebase snapshot)
  is warranted before final assignment
- Whether SPEC-FACTORY-BAKEOFF-001 should proceed or data already answers
  the spec factory question

---

## Completion Signal

When all sections are filled, write
`factory/bakeoff/results/SCORING-COMPLETE.md`:

```markdown
# Scoring Complete

Date: [date]
Scored by: Claude Code (scoring commission)
Output: factory/bakeoff/results/bakeoff-2026-04-09.md

## Human Actions Required
1. Read bakeoff-2026-04-09.md Section 4 (Hat Assignment Analysis)
2. Reveal BLIND-KEY.md to map code names to real model names
3. Schedule review session with Claude Chat to validate close calls
4. Fill MODEL-ASSIGNMENTS.md based on recommendations
```
