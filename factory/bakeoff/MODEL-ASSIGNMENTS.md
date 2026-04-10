# Build Factory - Model Assignments
**Last updated:** Session 38, April 10, 2026
**Status:** FINAL. All assignments locked post-bakeoff and external research sanity check.
**Bakeoff results:** `factory/bakeoff/results/bakeoff-2026-04-09.md`
**Research sources:** Three independent deep research runs (Claude, ChatGPT, Perplexity)
  synthesized against bakeoff findings. 9,000+ sources scanned.
---
## Architecture Note - Hybrid Human-in-Loop
The factory does NOT run all six hats autonomously. Two hats live outside the
factory loop entirely, handled by James using his Claude subscription (zero
marginal cost, maximum quality, maximum trust):
- **Planner** - James + Claude Chat (strategy sessions)
- **Spec Writer** - James + Claude Chat (story spec sessions)
The factory receives a verified, human-authored spec and handles Build, Review,
KB, and Deploy only. This eliminates the two highest-trust, highest-cost hats
from the agentic loop and keeps the factory focused on execution.
---
## Factory Hat Assignments (Locked)
| Hat | Model | Provider | Price | Rationale |
|-----|-------|----------|-------|-----------|
| **Planner** | James + Claude Chat | Anthropic subscription | $0 marginal | Highest trust gate. Human authored. |
| **Spec Writer** | James + Claude Chat | Anthropic subscription | $0 marginal | Highest trust gate. Human authored. |
| **Builder** | DeepSeek V3.2 | OpenRouter / DeepSeek direct | $0.26/M input | Bakeoff winner on implementation tasks. Best Aider Polyglot (~74%). Strongest cost-adjusted builder. |
| **Deployer** | DeepSeek V3.2 | OpenRouter / DeepSeek direct | $0.26/M input | Scripted task execution. Same model as Builder for consistency. Cost matters at this frequency. |
| **KB Verifier** | Kimi K2.5 | OpenRouter | $0.38/M input | 94% IFEval (field leader on constraint following). Designed for high-stakes document workflows. Cannot use MiniMax - hallucination risk on API references. |
| **Reviewer** | Kimi K2.5 | OpenRouter | $0.38/M input | 94% IFEval maximizes rule-violation detection. Dual-hatted with KB Verifier. Reviewer prompt must enumerate constraints explicitly, not ask for open-ended review. |
| **Finalizer** | Claude Sonnet | Anthropic API | $3/M input | Highest trust gate within the automated loop. Worth the premium for the final sign-off hat. |
---
## Model Selection Rationale - Full Record
### DeepSeek V3.2 (Builder + Deployer)
**Why selected:**
- Bakeoff consensus: Builder winner across all three evaluator analyses
- External validation: ~74% Aider Polyglot (most realistic code-editing benchmark),
  ~73% SWE-bench Verified, $0.26/M is 10-25x cheaper than Claude Opus
- MIT licensed - fully permissive commercial use, self-hosting available
**Known constraints:**
- Output quality degrades above ~8K tokens on long generations. This is a
  non-issue in the Spark Mojo factory because Ralph operates iteratively -
  we are not one-shotting large files. Stories are scoped to fit.
- Builder hat prompt must instruct: output only changed files or functions.
  Do not regenerate unchanged code.
- Instruction following is weaker than Kimi on "do not" style constraints.
  The harness (tests + loop-back) compensates for this, not the model.
**Considered and rejected alternatives:**
- GLM 5.1: Strong overall scores but on US Commerce Dept Entity List (January
  2025). Legal/compliance risk for US commercial SaaS operation is not
  acceptable even in early build phase.
- Kimi K2.5 for Builder: Agent Swarm architecture does not activate on small
  scoped stories. 2.3x token verbosity creates unnecessary cost. Bakeoff
  showed DeepSeek stronger on discrete task types that match our story format.
  Kimi Builder calibration is a future experiment once factory is live.
**V4 watch trigger:**
When DeepSeek V4 ships with official model card and real eval data (expected
late April 2026), run a focused Reviewer hat calibration against Kimi K2.5.
If V4 IFEval closes to within 5 points of Kimi's 94%, the cost differential
($0.30 vs $0.38) may justify swapping the Reviewer hat to DeepSeek V4.
---
### Kimi K2.5 (KB Verifier + Reviewer)
**Why selected:**
- 94% IFEval - field leader on constraint following across all evaluated models
- Designed for high-stakes document workflows with strict terminology adherence
- Strong document benchmarks (OmniDocBench, OCRBench)
- Modified MIT license - open weights available for self-hosting
- 300-step tool call stability without drift - appropriate for review loops
**Known constraints:**
- 2.3x average token verbosity vs competitors. Mitigate with explicit
  max_tokens limits in hat configuration.
- ~12% tool call failure rate. Mitigate with stream=true in API calls.
- 429 rate limit complaints under high concurrency. Mitigate with retry
  logic in orchestration layer.
**Reviewer hat prompt note:**
Kimi's IFEval advantage is maximized when constraints are enumerated
explicitly, not inferred. The Reviewer hat prompt must be a checklist of
specific violations to detect (layer boundary crossings, forbidden imports,
naming convention failures, missing tests) - not "review this code."
**Why MiniMax M2.7 was rejected for KB Verifier:**
MiniMax was the Session 37 preliminary assignment for KB Verifier. Rejected
post-research for one disqualifying reason: documented hallucination of
non-existent API calls in real-world testing. A model that invents API calls
cannot verify that KB documentation accurately describes real APIs. The
failure mode is directly opposed to the task requirement.
MiniMax remains viable for human-supervised interactive coding workflows
where a human catches hallucinations. Not appropriate for autonomous factory
loops where KB sign-off is load-bearing.
---
### Claude Sonnet (Finalizer)
**Why selected:**
- Highest trust gate within the automated loop
- Not subject to the cost concerns that eliminated Opus from factory hats
  (Finalizer fires once per build, not repeatedly)
- Anthropic model on Anthropic API - no data sovereignty concerns
---
## Models Evaluated and Not Assigned
| Model | Evaluated | Not Assigned Because |
|-------|-----------|---------------------|
| Claude Opus 4.6 | Yes (bakeoff baseline) | $30/M is not viable for any repeatedly-firing factory hat |
| Claude Sonnet | Yes (bakeoff baseline) | Assigned to Finalizer only |
| GLM 5.1 | Yes (bakeoff) + external research | Z.ai on US Commerce Dept Entity List since Jan 2025. Legal/compliance risk for US commercial SaaS. |
| MiniMax M2.7 | Yes (bakeoff) + external research | API hallucination on unfamiliar libraries. Proprietary - no open weights. Not viable for autonomous loops requiring technical accuracy. |
| Qwen 3.6 Plus | External research only | GA but very new. 26.5% fabrication rate on API reasoning claims. Regulatory risk (Alibaba). No hat requires it given current lineup. Reserve for future calibration. |
| Kimi K2 (original bakeoff candidate) | Yes (bakeoff) | Superseded by K2.5 |
---
## Billing Model
**Pay-per-token for all factory models. No flat-rate plans.**
The Alibaba Cloud Model Studio Coding Plan ($50/month, 90,000 requests/month)
is real and includes Kimi K2.5, GLM-5, MiniMax M2.5, and Qwen 3.5 Plus.
It is explicitly prohibited for this use case. Alibaba terms state: use only
in interactive coding tools. Automated scripts, custom backends, and
non-interactive batch API calls are prohibited. Factory automation is the
exact prohibited pattern. Suspension risk with no guaranteed refund.
At DeepSeek ($0.26/M) and Kimi ($0.38/M) per-token rates, factory runs
are extremely cheap. Pay-per-token is the correct model.
---
## Future Experiments
These are not blockers. They are queued for after the factory is live and
producing real build data.
1. **Kimi Builder calibration** - Run a larger-scope story (multi-file,
   cross-layer feature) through Kimi K2.5 as Builder. Designed to test
   whether the Agent Swarm architecture surfaces an advantage on Spark Mojo
   factory tasks. Decision point: if Kimi produces materially fewer loop-back
   iterations on complex stories, evaluate cost/quality tradeoff.
2. **DeepSeek V4 Reviewer evaluation** - When V4 ships with official model
   card and real eval data, run against Kimi K2.5 on the Reviewer hat.
   Evaluate whether IFEval gap justifies any hat swap.
3. **Qwen 3.6 Plus calibration** - Once Qwen accumulates independent
   benchmark coverage (currently new/sparse), run a targeted Builder
   calibration. Strong SWE-bench Verified (78.8%) makes it a credible
   secondary Builder candidate if V3.2 shows limitations in practice.
---
*Maintained by Claude Chat (strategy). Committed by CoWork. Do not edit
directly - all changes require a dedicated model evaluation session.*
