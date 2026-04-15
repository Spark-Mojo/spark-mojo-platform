> **Version History:** v1.0 initial concept (James, March 2026).
> v2.0 Session 32 (April 8, 2026) — corrupted by authoring agent. Contained
> fabricated capability names, Vue references, and wrong repository paths.
> v3.0 Session 34 (April 8, 2026) — restored to agreed design. Option A
> confirmed: factory lives in spark-mojo-platform/factory/.

# Spark Mojo Autonomous Development Factory
## System Design: Ralph-Orchestrator Method

**Author:** Claude Opus 4.6 for James Ilsley
**Date:** April 8, 2026
**Version:** 2.0
**Scope:** Ralph-orchestrator-based spec factory + build factory

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Model Strategy and Bakeoff](#2-model-strategy-and-bakeoff)
3. [Repository Architecture](#3-repository-architecture)
4. [Phase 0: Input Prep (Human)](#4-phase-0-input-prep)
5. [Phase 1: Spec Factory](#5-phase-1-spec-factory)
6. [Phase 2: Human Verification Gate](#6-phase-2-human-verification)
7. [Phase 3: Build Factory](#7-phase-3-build-factory)
8. [Phase 4: Post-Build Verification](#8-phase-4-post-build-verification)
9. [N8N Orchestration Layer](#9-n8n-orchestration-layer)
10. [File Conventions and Templates](#10-file-conventions-and-templates)
11. [Failure Modes and Recovery](#11-failure-modes-and-recovery)
12. [Scaling Strategy](#12-scaling-strategy)
13. [Calibration Tests Before First Run](#13-calibration-tests)

---

## 1. System Overview

### The Pipeline

```
HUMAN                    SPEC FACTORY                    HUMAN        BUILD FACTORY                    HUMAN
(Input Prep)             (Ralph + Claude Code)           (5-min gate) (Ralph + OpenCode/OSS)           (Spot check)

Capability Research  ->  Atomic Stories + Specs       ->  Go/No-Go ->  Code + Tests + Verify KB    ->  Verify on VPS
+ Guardrails             + Per-Story Spec Files                        + Deploy + Registry Updates
+ User Stories           + Test Plans                                  + LMS Fact-Check
                         + KB DRAFTS (full prose)
                         + LMS DRAFTS (full curriculum)
                         + Ralph Build Files
                         + Open Questions Report
```

### Design Principles

1. **Disk is state, Git is memory.** Every handoff between phases is a committed set of files in a known directory structure. No database, no API state, no ephemeral context.

2. **Backpressure over prescription.** Each hat knows what "done" looks like but figures out how to get there. Gates reject incomplete work.

3. **The spec factory never writes code. The build factory never invents requirements.** Clean separation. The spec factory produces everything the build factory needs to be a pure executor.

4. **Fail loudly.** Any ambiguity, missing input, or guardrail violation produces a BLOCKED file, not a guess.

5. **Knowledge base is a build gate.** Documentation is drafted at spec time by the strong model and verified at build time against the actual implementation.

6. **Atomic stories, minimal context per iteration.** Stories are the smallest testable unit of work. Each story has its own spec file. The build agent reads only what it needs for the current story. This keeps context windows manageable across all model sizes.

7. **Best model for each job.** Not every hat needs the same model. The model bakeoff determines which model is optimal for each hat's specific task type.

---

## 2. Model Strategy and Bakeoff

### Why Model Assignment Matters

Different hats in the factory require fundamentally different capabilities. A hat that writes fifth-grader-readable prose is a different task than a hat that implements Frappe API endpoints. Assigning the same model everywhere wastes money on easy tasks and produces poor results on hard ones.

### Hat-to-Capability Mapping

Each hat falls into one of these task categories:

| Task Category | What It Demands | Examples |
|--------------|-----------------|----------|
| **Architectural reasoning** | Understanding system boundaries, dependency graphs, design tradeoffs | Story Decomposer, Build File Generator |
| **Specification writing** | Precise technical detail, consistency, completeness | Spec Writer, Test Plan Writer |
| **Prose generation** | Clear, human-readable writing at controlled reading levels | KB Writer, LMS Builder |
| **Code implementation** | Working code in specific frameworks (Frappe, React JSX, FastAPI) | Story Builder |
| **Adversarial review** | Finding problems, verifying claims, catching inconsistencies | Spec Verifier, Code Reviewer |
| **Static verification** | Deterministic checks (tests pass, files exist, patterns match) | Test Runner, Deploy Verifier |

### The Bakeoff Process

Before running the factory on real capabilities, run a structured model evaluation:

#### Step 1: Define Test Cases (1-2 hours, human)

Create a standardized test battery using your existing completed work:

| Test | Input | Expected Output | Evaluates |
|------|-------|-----------------|-----------|
| **Story decomposition** | CRM Client Identity Synthesis + Workflow Research | Story list comparable to your existing 14-story breakdown | Architectural reasoning |
| **Spec writing** | One existing story (e.g., "Abstraction layer CRUD endpoints") | Spec comparable to what Claude produces today | Specification writing |
| **Prose quality** | Existing implemented feature + its code | USER-GUIDE.md at fifth-grader level with 20+ FAQs | Prose generation |
| **Frappe implementation** | Spec for a simple SM DocType + API endpoint | Working Frappe code that follows your conventions | Code implementation |
| **React implementation** | Spec for a simple Mojo component | Working .jsx that uses var(--sm-*) tokens, calls MAL | Code implementation |
| **Code review** | Deliberately buggy implementation (direct Frappe call from React, missing SM prefix) | Catches all planted bugs | Adversarial review |

#### Step 2: Run Each Candidate Model (2-3 hours, automated)

Test each model against every test case:

| Model | Provider | Test Via |
|-------|----------|---------|
| Kimi 2.5 | Moonshot | OpenCode |
| MiniMax 2.7 | MiniMax | OpenCode |
| Qwen 3 (highest available) | Alibaba | OpenCode |
| Claude Sonnet 4.6 | Anthropic | Claude Code (for comparison baseline) |

#### Step 3: Score and Assign (30 min, human)

Score each model 1-5 on each test case. Then assign models to hats:

```
SPEC FACTORY (all Claude Opus - this is settled):
  All hats: Claude Opus via Claude Code

BUILD FACTORY (model assignment from bakeoff):
  Planner:        {best architectural reasoning scorer}
  Builder:        {best code implementation scorer}
  Reviewer:       {best adversarial review scorer, MUST differ from Builder}
  KB Verifier:    {best prose scorer}
  LMS Verifier:   {best prose scorer}
  Deployer:       {best code implementation scorer}
  Finalizer:      Any (deterministic checks)
```

#### Step 4: Per-Hat Backend Configuration

Ralph supports per-hat backend overrides. After the bakeoff:

```yaml
hats:
  builder:
    backend: "opencode"  # Configured for Kimi 2.5 (hypothetical winner)
    # ...
  reviewer:
    backend: "opencode"  # Configured for MiniMax 2.7 (different model!)
    # ...
```

If the bakeoff reveals that NO OSS model handles a specific task well enough, that hat gets Claude (via Claude Code backend) and you accept the rate limit / cost tradeoff for that specific hat only.

### Model Assignment is Revisited Per Quarter

New models ship constantly. The bakeoff battery is reusable. Re-run it whenever a new strong OSS coding model drops and re-assign hats if a new model wins a category.

---

## 3. Repository Architecture

### Monorepo with Factory Workspace

Keep the factory inside the platform repo. The agents need access to existing code, patterns, and the live codebase to build against.

```
spark-mojo-platform/
├── factory/
│   ├── guardrails/
│   │   ├── PLATFORM-GUARDRAILS.md
│   │   └── RESEARCH-CORRECTIONS.md
│   │
│   ├── capabilities/                  # One directory per capability
│   │   └── crm-client-identity/
│   │       ├── input/                 # HUMAN PUTS STUFF HERE
│   │       │   ├── SYNTHESIS.md
│   │       │   ├── TECHNICAL-RESEARCH.md
│   │       │   ├── WORKFLOW-RESEARCH.md
│   │       │   ├── AI-ANALYSIS.md
│   │       │   ├── USER-STORIES.md    # From ChatPRD
│   │       │   └── READY.md           # Human sign-off on input quality
│   │       │
│   │       ├── spec/                  # SPEC FACTORY WRITES HERE
│   │       │   ├── STORIES.md         # Master story list with IDs + status
│   │       │   ├── stories/           # ONE FILE PER STORY
│   │       │   │   ├── CRM-001.md     # Full spec for this atomic story
│   │       │   │   ├── CRM-002.md
│   │       │   │   ├── CRM-003.md
│   │       │   │   └── ...
│   │       │   ├── DEPENDENCY-GRAPH.md # Story ordering + parallelism map
│   │       │   ├── ONBOARDING-PLAN.md
│   │       │   ├── OPEN-QUESTIONS.md
│   │       │   ├── VERIFICATION-REPORT.md
│   │       │   │
│   │       │   ├── kb-drafts/         # KB PROSE WRITTEN BY SPEC FACTORY
│   │       │   │   ├── DEPLOYMENT.md
│   │       │   │   ├── INTERNAL-PLAYBOOK.md
│   │       │   │   ├── USER-GUIDE.md
│   │       │   │   ├── FAQ.md
│   │       │   │   ├── DEFICIENCIES-TEMPLATE.md  # Can't be final until built
│   │       │   │   ├── EXTENSION-ROADMAP.md
│   │       │   │   └── LMS/
│   │       │   │       ├── MODULE-01.md
│   │       │   │       ├── MODULE-02.md
│   │       │   │       └── ...
│   │       │   │
│   │       │   └── build-factory/     # EXACT FILES FOR BUILD PHASE
│   │       │       ├── ralph.yml
│   │       │       ├── PROMPT.md      # Lightweight status tracker only
│   │       │       └── CLAUDE.md      # Agent instructions
│   │       │
│   │       ├── build/                 # BUILD FACTORY WRITES HERE
│   │       │   ├── STORIES-STATUS.md
│   │       │   └── kb/               # VERIFIED + UPDATED KB artifacts
│   │       │       ├── DEPLOYMENT.md
│   │       │       ├── INTERNAL-PLAYBOOK.md
│   │       │       ├── USER-GUIDE.md
│   │       │       ├── FAQ.md
│   │       │       ├── DEFICIENCIES.md    # Written fresh by build factory
│   │       │       ├── EXTENSION-ROADMAP.md
│   │       │       └── LMS/
│   │       │
│   │       └── BLOCKED-*.md
│   │
│   ├── templates/
│   │   ├── STORY-TEMPLATE.md
│   │   ├── KB-DEPLOYMENT-TEMPLATE.md
│   │   ├── KB-PLAYBOOK-TEMPLATE.md
│   │   ├── KB-USER-GUIDE-TEMPLATE.md
│   │   ├── KB-FAQ-TEMPLATE.md
│   │   ├── KB-DEFICIENCIES-TEMPLATE.md
│   │   └── KB-EXTENSION-ROADMAP-TEMPLATE.md
│   │
│   ├── spec-factory/
│   │   ├── ralph.yml
│   │   ├── hats.yml
│   │   └── PROMPT-TEMPLATE.md
│   │
│   ├── build-factory/
│   │   ├── ralph-template.yml
│   │   ├── hats.yml
│   │   └── PROMPT-TEMPLATE.md
│   │
│   └── bakeoff/                       # MODEL EVALUATION
│       ├── README.md                  # How to run the bakeoff
│       ├── test-cases/
│       │   ├── story-decomposition.md
│       │   ├── spec-writing.md
│       │   ├── prose-quality.md
│       │   ├── frappe-implementation.md
│       │   ├── react-implementation.md
│       │   └── code-review-with-bugs.md
│       ├── results/
│       │   └── bakeoff-YYYY-MM-DD.md  # Scored results
│       └── MODEL-ASSIGNMENTS.md       # Current model-to-hat mapping
│
├── platform/
└── docs/
```

### Key Structural Change: Per-Story Spec Files

Instead of one giant BUILD-SPEC.md, the spec factory produces individual files per story in `spec/stories/`. Each file is self-contained:

```markdown
# CRM-001: Abstraction Layer CRUD Endpoints for Contact

## Category: BACKEND
## Size: S
## Dependencies: None (first story)
## Estimated iterations: 3-5

## What To Build
Create 5 MAL endpoints under /api/modules/crm/ that wrap Frappe CRM's
Contact DocType REST API...

## Files To Create or Modify
- platform/apps/mojo_abstraction_layer/crm/contact.py (new)
- platform/apps/mojo_abstraction_layer/crm/__init__.py (modify)
- ...

## API Specification
### POST /api/modules/crm/contact/create
Request: { ... }
Response: { ... }
Error states: { ... }
...

## Tests
### Unit Tests
- test_create_contact_valid_input() -> 201, returns contact with SM ID
- test_create_contact_missing_required_field() -> 400, error message
- ...

### Integration Tests
- test_contact_crud_full_cycle() -> create, read, update, archive
- ...

## CRM Timeline Event
On contact creation: write "Contact created" activity to CRM timeline

## Acceptance Criteria
1. All 5 endpoints return correct responses for valid input
2. All 5 endpoints return appropriate errors for invalid input
3. No endpoint calls Frappe directly from React (MAL only)
4. All tests pass with >= 80% coverage on contact.py
5. DocType prefix is SM where applicable
```

The build factory agent reads ONLY this file when working on CRM-001. Not the whole spec. Not other stories. Just this file plus the existing codebase.

---

## 4. Phase 0: Input Prep (Human)

### What The Human Does

1. Takes the raw capability research (Synthesis, Technical, Workflow, AI Analysis)
2. Reviews and resolves any open questions that can be resolved without building
3. Runs the research through ChatPRD to generate user stories
4. Places all files in `factory/capabilities/{capability-name}/input/`
5. Creates `READY.md`:

```markdown
# Capability Ready for Spec Factory

- Capability: CRM / Client Identity
- Date: 2026-04-08
- Research reviewed: YES
- Open questions resolved: All resolvable OQs addressed
- Remaining OQs: OQ-001 (pricing), OQ-007 (clinical AI legal) - flagged, not blocking
- User stories generated: YES (ChatPRD)
- Guardrails version confirmed: Session 31
- Research corrections applied: YES
- Model assignments confirmed: YES (see factory/bakeoff/MODEL-ASSIGNMENTS.md)

## GO
```

### Input Quality Checklist

- [ ] Synthesis doc has no "TBD" or "pending" items that block spec writing
- [ ] Technical research explicitly addresses all 4 evaluation levels
- [ ] Workflow research defines all states and transitions
- [ ] AI analysis has concrete model assignments, not placeholders
- [ ] User stories cover all workflows in the workflow research
- [ ] RESEARCH-CORRECTIONS.md checked for this capability
- [ ] No unresolved conflicts between research docs
- [ ] Model bakeoff completed and MODEL-ASSIGNMENTS.md current

---

## 5. Phase 1: Spec Factory

### Ralph Configuration

**Backend:** Claude Code (Opus model)
**Mode:** Hat-based
**Rationale:** Spec writing, prose generation, and architectural reasoning are the spec factory's job. These are high-reasoning tasks where Opus dramatically outperforms. The spec factory runs once per capability and costs a fraction of the build.

#### `factory/spec-factory/ralph.yml`

```yaml
cli:
  backend: "claude"

event_loop:
  completion_promise: "LOOP_COMPLETE"
  max_iterations: 50
  max_runtime_seconds: 10800   # 3 hours max
  idle_timeout_secs: 600
  starting_event: "spec.start"
  checkpoint_interval: 3

core:
  guardrails:
    - "You are the Spec Factory. You NEVER write implementation code. You write specifications and documentation."
    - "Read factory/guardrails/PLATFORM-GUARDRAILS.md at the start of every iteration."
    - "Read factory/guardrails/RESEARCH-CORRECTIONS.md and apply corrections for this capability."
    - "If ANY input is ambiguous or conflicts with guardrails, write BLOCKED-{TOPIC}.md and stop."
    - "All output files go in factory/capabilities/{CAPABILITY}/spec/"
    - "Every story must have a unique ID in format {CAP}-{NNN} (e.g., CRM-001)."
    - "Do not invent requirements. If research does not specify, flag as open question."
    - "Stories must be ATOMIC: the smallest testable unit of work. One endpoint, one component, one workflow. NOT one feature."

memories:
  enabled: true
  inject: auto
  budget: 3000

tasks:
  enabled: true
```

#### `factory/spec-factory/hats.yml`

```yaml
event_loop:
  starting_event: "spec.start"

hats:

  # ─────────────────────────────────────────────
  # HAT 1: STORY DECOMPOSER
  # ─────────────────────────────────────────────
  story_decomposer:
    name: "Story Decomposer"
    description: "Breaks capability research into atomic, independently testable stories"
    triggers: ["spec.start", "spec.rejected"]
    publishes: ["stories.written"]
    default_publishes: "stories.written"
    max_activations: 4
    instructions: |
      ## Your Job
      Read ALL input files in factory/capabilities/{CAPABILITY}/input/.
      Read factory/guardrails/PLATFORM-GUARDRAILS.md.
      Read factory/guardrails/RESEARCH-CORRECTIONS.md.

      If factory/capabilities/{CAPABILITY}/spec/VERIFICATION-REPORT.md exists,
      read it and address every BLOCKER issue in your revised output.

      Break the capability into ATOMIC stories. Atomic means:

      ### Definition of Atomic
      - ONE endpoint, OR one React component, OR one n8n workflow, OR one
        configuration template. Never multiple.
      - Completable by an agent in 3-8 iterations (15-45 minutes of wall time).
      - Independently testable. The story's tests can run without other
        stories being complete (mock dependencies if needed).
      - Self-contained spec. The agent implementing this story needs ONLY
        this story's spec file plus the existing codebase. No cross-referencing
        other story specs required.

      ### Decomposition Rules
      - If a "story" has more than 3 files to create, split it.
      - If a "story" has more than 2 API endpoints, split it.
      - If a "story" has both backend AND frontend work, split it into
        a backend story and a frontend story.
      - If a "story" has both a DocType change AND an n8n workflow, split it.
      - Prefer 40 small stories over 14 medium stories. The build factory
        handles high count gracefully. It does NOT handle high complexity.

      ### Story Categories
      - BACKEND: Frappe DocType, single API endpoint, abstraction layer route
      - FRONTEND: Single React component, single page, single widget
      - INTEGRATION: Single n8n workflow, single cross-system connector
      - AI: Single Bedrock-powered feature
      - CONFIG: Vertical configuration template, provisioning script
      - GLUE: Wiring between existing components (e.g., "connect Contact list
        component to contact/list endpoint")

      ### Spec Gate Compliance
      Every story must pass all three Mandatory Spec Gates from the guardrails:
      1. Workflow: What workflow does this story serve?
      2. CRM Timeline: What does this story write to the CRM timeline? (N/A is valid with explanation)
      3. Right Level: Is this universal, vertical, client, or role level?

      ## Output Files

      ### factory/capabilities/{CAPABILITY}/spec/STORIES.md
      Master list. For each story:
      - ID, title, category, size (all should be S or XS)
      - One-sentence description
      - Dependencies (story IDs that must complete first)
      - Spec Gate answers (one line each)

      ### factory/capabilities/{CAPABILITY}/spec/DEPENDENCY-GRAPH.md
      - Topological sort of stories (build order)
      - Parallel execution groups (stories with no mutual dependencies)
      - Critical path identified

      ## Backpressure
      Before emitting stories.written:
      - Every workflow from the Workflow Research maps to at least one story
      - Every API endpoint from the Technical Research maps to at least one story
      - Every story has size S or XS (reject M or L, split further)
      - Dependencies form a DAG (no circular dependencies)
      - All three Spec Gates answered for every story
      - No story requires more than 3 files to create

      Evidence: "stories: {count}, max_size: S, gates: pass, dag: valid"

  # ─────────────────────────────────────────────
  # HAT 2: SPEC WRITER
  # ─────────────────────────────────────────────
  spec_writer:
    name: "Spec Writer"
    description: "Writes individual per-story spec files with implementation details and test plans"
    triggers: ["stories.written"]
    publishes: ["specs.written"]
    default_publishes: "specs.written"
    max_activations: 4
    instructions: |
      ## Your Job
      Read STORIES.md. For EACH story, create a self-contained spec file.

      ## Output
      One file per story: factory/capabilities/{CAPABILITY}/spec/stories/{STORY-ID}.md

      Each file follows this exact structure:

      ```
      # {STORY-ID}: {Title}

      ## Category: {BACKEND|FRONTEND|INTEGRATION|AI|CONFIG|GLUE}
      ## Size: {XS|S}
      ## Dependencies: {comma-separated story IDs, or "None"}
      ## Estimated build iterations: {3-8}

      ## What To Build
      {2-3 paragraphs of clear, specific instructions. The agent reading
      this has never seen the research docs. This must be self-contained.}

      ## Architecture Constraints
      {Relevant guardrail rules for this specific story. Not all rules,
      just the ones that apply. E.g., "This endpoint is in the MAL.
      React will call /api/modules/crm/contact/create. Do not create
      a Frappe whitelisted endpoint."}

      ## Files To Create or Modify
      {Exact file paths and whether create or modify}

      ## Detailed Specification
      {API schemas, component props, workflow node definitions, etc.
      Whatever the implementer needs to write correct code.}

      ## Tests
      ### Unit Tests
      {Function name, input, expected output for each test}

      ### Integration Tests
      {Endpoint, request, expected response for each test}

      ### Edge Cases
      {Explicitly listed edge cases to test}

      ## CRM Timeline Event
      {What to write, or "N/A: {reason}"}

      ## Acceptance Criteria
      {Numbered, testable. Every criterion must be verifiable by running
      a command or checking a file.}
      ```

      ## Backpressure
      Before emitting specs.written:
      - Every story in STORIES.md has a corresponding file in spec/stories/
      - Every spec file has all required sections (non-empty)
      - No spec references files outside the platform repo
      - No spec calls Frappe directly from React
      - All custom DocTypes are SM-prefixed
      - No TypeScript files specified
      - n8n handles all cross-system operations
      - Frappe/n8n boundary respected

      Evidence: "spec_files: {count}/{total}, all_sections: complete, guardrails: pass"

  # ─────────────────────────────────────────────
  # HAT 3: KB AND LMS DRAFTER
  # ─────────────────────────────────────────────
  kb_drafter:
    name: "Knowledge Base and LMS Drafter"
    description: "Writes full-prose knowledge base articles and LMS curriculum based on specs"
    triggers: ["specs.written"]
    publishes: ["kb_drafts.written"]
    default_publishes: "kb_drafts.written"
    max_activations: 3
    instructions: |
      ## Your Job
      You write the actual documentation and learning materials NOW, at spec
      time, using the strong model (Claude Opus). The build factory will only
      verify these against the actual implementation and make corrections if
      the implementation diverged from spec.

      Read ALL story spec files in spec/stories/.
      Read the input research docs for context.

      ## Output: factory/capabilities/{CAPABILITY}/spec/kb-drafts/

      ### DEPLOYMENT.md (full draft)
      - What this feature does in one plain sentence
      - Who deploys it
      - Pre-deployment checklist: every config question, dependency, credential
      - Step-by-step deployment instructions
      - How to verify deployment succeeded
      - How to roll back
      - Known gotchas
      - MUST include placeholder markers {{VERIFY-AFTER-BUILD}} on any claims
        that depend on actual implementation details (e.g., exact config values)

      ### INTERNAL-PLAYBOOK.md (full draft)
      - Complete feature overview
      - Every function documented screen by screen, field by field
      - Every workflow the Spark Mojo admin would execute
      - Admin view vs end user view documented separately
      - Every configuration option with examples
      - Common support scenarios and diagnosis steps
      - Every error state explained
      - Edge cases, limits, audit trail
      - Use {{VERIFY-AFTER-BUILD}} markers for implementation-specific details

      ### USER-GUIDE.md (full draft)
      - Plain sentence description
      - Who uses it by role
      - Every workflow click by click with "You will see..." language
      - Every field and button explained
      - Success and error states
      - Minimum 10 real-world use case scenarios
      - Minimum 20 FAQ questions from a confused first-time user
      - Glossary
      - QUALITY STANDARD: Fifth-grader readable. Short sentences. No jargon
        without definition. Active voice. "You" not "the user."

      ### FAQ.md (full draft)
      Two sections: end user FAQs + admin/support FAQs.
      Minimum 20 questions per applicable section. Plain language.

      ### DEFICIENCIES-TEMPLATE.md (template only)
      This one CANNOT be written until after build. Create a template with
      section headers and instructions for the build factory to fill in:
      - What was cut (build factory fills)
      - What edge cases are unhandled (build factory fills)
      - What will break under production load (build factory fills)
      - What was stubbed (build factory fills)
      - What technical debt was incurred (build factory fills)

      ### EXTENSION-ROADMAP.md (full draft)
      - What this feature is designed to grow into
      - Deferred stories by ID (from stories that were intentionally not included)
      - Next 3-5 logical stories
      - Architectural decisions that enable or constrain extension
      - External dependencies
      - Data model changes needed for full vision

      ### LMS/ (full curriculum)
      For each module defined in the capability's logical sections:
      - MODULE-{NN}.md with:
        - Learning objectives
        - Prerequisites
        - Lesson content (step-by-step with "you will see..." language)
        - Knowledge check questions (multiple choice, 5 per lesson minimum)
        - Practical exercises
        - Module summary
      - Use USER-GUIDE.md as source material but restructure for progressive
        disclosure (learning sequence, not reference format)

      ## Backpressure
      Before emitting kb_drafts.written:
      - All 6 KB files exist (5 full drafts + 1 template)
      - USER-GUIDE.md has >= 10 use cases and >= 20 FAQ-style questions
      - FAQ.md has >= 20 questions per section
      - INTERNAL-PLAYBOOK.md covers every story's functionality
      - At least 3 LMS modules exist
      - All drafts use {{VERIFY-AFTER-BUILD}} markers for implementation details
      - Prose quality: no sentences over 25 words, no undefined jargon

      Evidence: "kb_files: 6/6, user_guide_faqs: {n}, lms_modules: {n}, markers: {n}"

  # ─────────────────────────────────────────────
  # HAT 4: BUILD FILE GENERATOR
  # ─────────────────────────────────────────────
  build_file_generator:
    name: "Build File Generator"
    description: "Generates the lightweight ralph.yml, PROMPT.md, and CLAUDE.md the build factory needs"
    triggers: ["kb_drafts.written"]
    publishes: ["build_files.ready"]
    default_publishes: "build_files.ready"
    max_activations: 2
    instructions: |
      ## Your Job
      Generate the exact files the build factory needs to run autonomously.
      The build factory's PROMPT.md must be LIGHTWEIGHT because the agent
      reads it every iteration. All spec detail lives in per-story files.

      ## Output: factory/capabilities/{CAPABILITY}/spec/build-factory/

      ### ralph.yml
      - backend: opencode
      - max_iterations: stories_count * 6 (minimum 30, max 200)
      - max_runtime_seconds: 28800 (8 hours)
      - RObot enabled with Telegram for monitoring

      ### PROMPT.md (LIGHTWEIGHT - this is critical)
      This file must be UNDER 2000 tokens. It is read every iteration.
      Structure:
      ```
      # Build Factory: {CAPABILITY}

      ## Your Mission
      {2 sentences on what you're building}

      ## How This Works
      1. Read this file to find the next unchecked story
      2. Read that story's spec file at spec/stories/{STORY-ID}.md
      3. Implement it, test it, mark it done here
      4. Repeat until all stories are checked
      5. Then verify KB drafts, deploy, and finalize

      ## Architecture Rules (always)
      {5-7 critical guardrail rules, one line each}

      ## Story Status
      - [ ] CRM-001: Abstraction layer - Contact create endpoint
      - [ ] CRM-002: Abstraction layer - Contact read endpoint
      - [ ] CRM-003: Abstraction layer - Contact update endpoint
      ...
      (just IDs and titles, no specs here)

      ## After All Stories Complete
      - [ ] KB-VERIFY: Verify and update kb-drafts against actual implementation
      - [ ] DEPLOY: Run full test suite, commit, push, deploy to VPS
      - [ ] REGISTRY: Update MOJO_REGISTRY.md and CREDENTIALS.md
      - [ ] FINAL: Emit LOOP_COMPLETE
      ```

      ### CLAUDE.md
      Agent instructions for the build factory. Include:
      - How to read story status from PROMPT.md
      - How to find the spec file for a story (spec/stories/{ID}.md)
      - How to run tests (pytest, specific commands)
      - How to mark a story done (check the box in PROMPT.md)
      - KB verification process: read kb-drafts/, compare to actual
        implementation, resolve {{VERIFY-AFTER-BUILD}} markers, copy
        finalized versions to build/kb/
      - When to write BLOCKED files
      - Deployment procedure
      - When to emit LOOP_COMPLETE

      ## Backpressure
      Before emitting build_files.ready:
      - PROMPT.md is under 2000 tokens
      - PROMPT.md lists every story from STORIES.md
      - ralph.yml is valid YAML
      - CLAUDE.md contains KB verification instructions
      - CLAUDE.md contains deployment procedure

      Evidence: "prompt_tokens: {n}, stories_listed: {n}/{total}, yaml: valid"

  # ─────────────────────────────────────────────
  # HAT 5: ADVERSARIAL VERIFIER
  # ─────────────────────────────────────────────
  verifier:
    name: "Adversarial Verifier"
    description: "Finds problems in all spec factory outputs before they go to human review"
    triggers: ["build_files.ready"]
    publishes: ["spec.verified", "spec.rejected"]
    default_publishes: "spec.verified"
    max_activations: 4
    instructions: |
      ## Your Job
      You are the adversary. Your job is to find problems.
      Read EVERY output file. Read EVERY input file. Read guardrails.

      ## Verification Checklist

      ### Story Atomicity
      - [ ] No story has more than 3 files to create
      - [ ] No story has both backend AND frontend work
      - [ ] No story lists more than 2 API endpoints
      - [ ] All stories are size S or XS
      - [ ] Every story's spec is self-contained (no "see story CRM-005 for details")

      ### Completeness
      - [ ] Every workflow in Workflow Research has corresponding stories
      - [ ] Every API endpoint in Technical Research has a story
      - [ ] Every AI feature in AI Analysis has a story or explicit deferral
      - [ ] Every Spec Gate answered per story
      - [ ] Test plan covers every acceptance criterion
      - [ ] KB drafts reference every user-facing feature

      ### Guardrail Compliance
      - [ ] No React-to-Frappe direct calls in any spec
      - [ ] All DocTypes SM-prefixed
      - [ ] No TypeScript anywhere
      - [ ] n8n for all cross-system operations
      - [ ] Frappe/n8n boundary respected in every spec
      - [ ] Evaluation order documented where applicable

      ### Consistency
      - [ ] Story IDs are unique and sequential
      - [ ] Dependencies form a DAG
      - [ ] No circular dependencies
      - [ ] PROMPT.md story list matches STORIES.md
      - [ ] No conflicts between story specs

      ### KB Quality
      - [ ] USER-GUIDE.md is fifth-grader readable (no sentence > 25 words)
      - [ ] FAQ sections have >= 20 questions each
      - [ ] INTERNAL-PLAYBOOK.md covers admin AND user perspectives
      - [ ] LMS modules have progressive structure (not just copy of user guide)
      - [ ] {{VERIFY-AFTER-BUILD}} markers present where needed

      ### Build Factory Readiness
      - [ ] PROMPT.md is under 2000 tokens
      - [ ] Per-story spec files are self-contained
      - [ ] CLAUDE.md has clear completion criteria
      - [ ] ralph.yml iteration count sufficient for story count

      ## Output
      Write VERIFICATION-REPORT.md with:
      - Pass/Fail per checklist item
      - Issues found with severity: BLOCKER, WARNING, NOTE
      - Specific file + location for each issue

      ## Decision
      ANY BLOCKER: emit spec.rejected (triggers Story Decomposer re-run)
      Only WARNINGs/NOTEs: emit spec.verified

      Evidence: "blockers: {n}, warnings: {n}, notes: {n}"

  # ─────────────────────────────────────────────
  # HAT 6: OPEN QUESTIONS + FINALIZE
  # ─────────────────────────────────────────────
  finalizer:
    name: "Open Questions Reporter and Finalizer"
    description: "Catalogs unresolvable questions and signals spec factory completion"
    triggers: ["spec.verified"]
    publishes: ["LOOP_COMPLETE"]
    max_activations: 1
    instructions: |
      ## Your Job
      Scan ALL output files for flagged uncertainties, assumptions,
      or items requiring human decision.

      Write factory/capabilities/{CAPABILITY}/spec/OPEN-QUESTIONS.md:
      - Question ID (OQ-SPEC-001, etc.)
      - Question text
      - Context (which story, which spec section)
      - Impact if deferred
      - Suggested default if human doesn't respond

      Then emit LOOP_COMPLETE.

      Evidence: "open_questions: {count}, blocking: {count}"
```

### Spec Factory Event Flow

```
spec.start
  -> Story Decomposer -> stories.written
  -> Spec Writer -> specs.written
  -> KB & LMS Drafter -> kb_drafts.written
  -> Build File Generator -> build_files.ready
  -> Adversarial Verifier -> spec.verified OR spec.rejected
                               |                    |
                               v                    v
  -> Finalizer              Story Decomposer (with VERIFICATION-REPORT.md)
  -> LOOP_COMPLETE          (retry, max 4 times)
```

### Running the Spec Factory

```bash
cd spark-mojo-platform
export CAPABILITY="crm-client-identity"

ralph run \
  -c factory/spec-factory/ralph.yml \
  -H factory/spec-factory/hats.yml \
  --no-tui \
  -p "Build specifications for the ${CAPABILITY} capability. \
      Input: factory/capabilities/${CAPABILITY}/input/. \
      Output: factory/capabilities/${CAPABILITY}/spec/."
```

---

## 6. Phase 2: Human Verification Gate

### What The Human Does (5-15 minutes)

1. Read `VERIFICATION-REPORT.md` - confirms automated verifier did its job
2. Skim `STORIES.md` - are the atomic stories the right decomposition?
3. Skim `OPEN-QUESTIONS.md` - answer what you can, accept defaults for the rest
4. Spot-check 2-3 story specs in `spec/stories/` - do they make sense?
5. Skim `kb-drafts/USER-GUIDE.md` - is the prose quality there?
6. Look at `build-factory/PROMPT.md` - is it under 2000 tokens? Does it list every story?

### Go/No-Go

Create `factory/capabilities/{CAPABILITY}/spec/APPROVED.md`:

```markdown
# Spec Approved for Build Factory

- Reviewer: James
- Date: 2026-04-08
- Open questions resolved: 2 of 5 (remaining non-blocking)
- Modifications: None
- Story count: 38 (approved)
- KB draft quality: Approved

## GO
```

---

## 7. Phase 3: Build Factory

### Ralph Configuration

**Backend:** OpenCode with model assignments from bakeoff (see Section 2)
**Mode:** Hat-based with multi-model review pipeline

The spec factory generates a customized `ralph.yml` and `PROMPT.md` per capability. Below is the reusable **hats.yml** template.

#### `factory/build-factory/hats.yml`

```yaml
event_loop:
  starting_event: "build.start"

hats:

  # ─────────────────────────────────────────────
  # HAT 1: PLANNER
  # ─────────────────────────────────────────────
  planner:
    name: "Build Planner"
    description: "Reads story status, determines next implementable story"
    triggers: ["build.start", "story.verified", "kb.verified", "review.cycle.complete"]
    publishes: ["story.ready", "all_stories.done", "build.blocked"]
    default_publishes: "story.ready"
    max_activations: 100
    instructions: |
      ## Your Job
      Read PROMPT.md. Check which stories are done [x] and which remain [ ].
      Read DEPENDENCY-GRAPH.md to determine which stories are unblocked.

      Pick the next story where:
      1. Not yet checked off
      2. All dependencies are checked off
      3. Prefer stories earlier in the dependency graph

      If ALL stories are checked: emit all_stories.done
      If next story identified: emit story.ready with story ID in payload
      If stuck (all remaining have unmet deps): emit build.blocked

      Evidence: "done: {n}/{total}, next: {STORY_ID}"

  # ─────────────────────────────────────────────
  # HAT 2: BUILDER
  # ─────────────────────────────────────────────
  builder:
    name: "Story Builder"
    description: "Implements a single atomic story: writes code and tests"
    triggers: ["story.ready", "review.fix_required"]
    publishes: ["story.built", "story.blocked"]
    default_publishes: "story.built"
    # backend: from MODEL-ASSIGNMENTS.md (best code implementation scorer)
    max_activations: 100
    instructions: |
      ## Your Job
      Read the story spec file at:
      factory/capabilities/{CAPABILITY}/spec/stories/{STORY_ID}.md

      This file contains EVERYTHING you need. Do not read other story specs.

      ## Process
      1. Read the spec
      2. Write the implementation code at the specified file paths
      3. Write the tests specified in the spec
      4. Run tests: pytest (backend) or appropriate test command
      5. If tests fail, fix and re-run until passing
      6. Do NOT update PROMPT.md yet (Reviewer does that)

      ## Architecture Rules
      - React NEVER calls Frappe directly. All through /api/modules/
      - Custom DocTypes prefixed SM
      - No TypeScript. All .jsx
      - No hardcoded colors. var(--sm-*) only
      - n8n for cross-system ops. Never in UI hot path.
      - Frappe = internal state. n8n = external actions. HARD LINE.

      ## If Blocked
      If the spec is unclear or you cannot proceed, write
      BLOCKED-{STORY_ID}.md and emit story.blocked.

      Evidence: "story: {ID}, tests: pass, files_created: {n}"

  # ─────────────────────────────────────────────
  # HAT 3: STATIC ANALYSIS GATE
  # ─────────────────────────────────────────────
  static_analyzer:
    name: "Static Analysis Gate"
    description: "Runs deterministic, model-independent checks on implemented code"
    triggers: ["story.built"]
    publishes: ["static.pass", "static.fail"]
    default_publishes: "static.pass"
    max_activations: 100
    instructions: |
      ## Your Job
      Run DETERMINISTIC checks. Do not use judgment. Run commands and
      report results.

      ## Checks (run ALL, report ALL)

      ### 1. Tests Pass
      Run: pytest (or appropriate test command)
      Gate: ALL tests pass. Zero failures.

      ### 2. Coverage Check
      Run: pytest --cov --cov-report=term-missing
      Gate: >= 80% coverage on new/modified files

      ### 3. Anti-Pattern Grep
      Run these greps against new/modified files:
      - grep -r "frappe.call\|frappe.xcall" frontend/ -> FAIL if found
        (React calling Frappe directly)
      - grep -r "\.tsx\b" platform/ -> FAIL if found (TypeScript)
      - grep -rn "fetch.*:8000\|fetch.*frappe" frontend/ -> FAIL if found
        (Direct Frappe URL in frontend)
      - Check all new DocType names start with "SM " or "SM_"
      - grep -r "#[0-9a-fA-F]\{3,6\}" frontend/ -> WARN if found
        (Hardcoded hex colors)

      ### 4. File Existence
      Verify all files listed in the story spec's "Files To Create or Modify"
      section actually exist.

      ## Output
      If ALL gates pass: emit static.pass
      If ANY gate fails: emit static.fail with specific failures listed

      Evidence: "tests: {pass/fail}, coverage: {pct}%, antipatterns: {count}, files: {exist/missing}"

  # ─────────────────────────────────────────────
  # HAT 4: FIRST MODEL REVIEWER
  # ─────────────────────────────────────────────
  reviewer_primary:
    name: "Primary Code Reviewer"
    description: "Reviews implemented code against spec using a DIFFERENT model than the Builder"
    triggers: ["static.pass"]
    publishes: ["review.primary.pass", "review.primary.fail"]
    default_publishes: "review.primary.pass"
    # backend: from MODEL-ASSIGNMENTS.md (best adversarial review scorer, DIFFERENT from Builder)
    max_activations: 100
    instructions: |
      ## Your Job
      You are an adversarial reviewer. Your goal is to find problems the
      Builder missed.

      Read the story spec at spec/stories/{STORY_ID}.md.
      Read the implementation code the Builder wrote.

      ## Review Checklist
      1. Does the implementation match the spec? Check every acceptance criterion.
      2. Are there logic errors? Off-by-one, missing null checks, wrong status codes?
      3. Is the CRM timeline event implemented (if spec requires it)?
      4. Does the code follow existing patterns in the codebase?
      5. Are error states handled as specified?
      6. Do tests actually test what the spec says, or are they trivial?

      ## Output
      If clean: emit review.primary.pass with summary
      If issues: emit review.primary.fail with specific issues and fix instructions

      Evidence: "story: {ID}, criteria_met: {n}/{total}, issues: {n}"

  # ─────────────────────────────────────────────
  # HAT 5: SECOND MODEL REVIEWER (BELT AND SUSPENDERS)
  # ─────────────────────────────────────────────
  reviewer_secondary:
    name: "Secondary Code Reviewer"
    description: "Second-opinion review using a third model to catch blind spots"
    triggers: ["review.primary.pass"]
    publishes: ["review.cycle.complete", "review.fix_required"]
    default_publishes: "review.cycle.complete"
    # backend: from MODEL-ASSIGNMENTS.md (third model, different from both Builder and Primary Reviewer)
    max_activations: 100
    instructions: |
      ## Your Job
      You are the second reviewer. The Primary Reviewer already approved
      this code. Your job is to catch what they missed.

      Focus specifically on:
      1. Guardrail violations (the most common blind spot for AI reviewers)
      2. Subtle integration issues (will this break when connected to other stories?)
      3. Test quality (are tests actually meaningful or are they just checking "true == true"?)
      4. Security: no credentials in code, no SQL injection vectors, proper input validation

      Read the story spec. Read the code. Read the Primary Reviewer's assessment.

      ## Output
      If clean: emit review.cycle.complete
        -> Planner will mark the story done in PROMPT.md and pick the next one
      If issues: emit review.fix_required with specific issues
        -> Builder will receive this and fix

      Note: After review.cycle.complete, the Planner marks the story [x] in
      PROMPT.md before selecting the next story.

      Evidence: "story: {ID}, second_review: pass, issues: {n}"

  # ─────────────────────────────────────────────
  # HAT 6: KB VERIFIER
  # ─────────────────────────────────────────────
  kb_verifier:
    name: "Knowledge Base Verifier"
    description: "Verifies KB drafts against actual implementation and resolves markers"
    triggers: ["all_stories.done"]
    publishes: ["kb.verified"]
    default_publishes: "kb.verified"
    max_activations: 3
    instructions: |
      ## Your Job
      The spec factory drafted all KB articles. Your job is to VERIFY
      them against what was actually built and fix any discrepancies.

      ## Process
      1. Read each KB draft in spec/kb-drafts/
      2. Compare claims against the actual implemented code
      3. Resolve every {{VERIFY-AFTER-BUILD}} marker with real values
      4. Fix any descriptions that don't match the implementation
      5. Write DEFICIENCIES.md from scratch (this was only templated)
      6. Copy finalized versions to build/kb/

      ### DEFICIENCIES.md (write fresh, brutally honest)
      - What was cut (check BLOCKED-*.md files)
      - What edge cases are unhandled
      - What will break under production load
      - What was stubbed
      - What technical debt was incurred
      - What assumptions may not hold
      No softening. If nothing was cut, justify why.

      ## Backpressure
      Before emitting kb.verified:
      - All 6 KB files exist in build/kb/
      - Zero {{VERIFY-AFTER-BUILD}} markers remain
      - DEFICIENCIES.md is honest and substantive
      - USER-GUIDE.md FAQs still >= 20
      - LMS modules updated for any implementation changes

      Evidence: "markers_resolved: {n}, deficiencies_items: {n}, kb_files: 6/6"

  # ─────────────────────────────────────────────
  # HAT 7: DEPLOYER
  # ─────────────────────────────────────────────
  deployer:
    name: "Deployer"
    description: "Runs full test suite, commits, pushes, triggers deployment"
    triggers: ["kb.verified"]
    publishes: ["deploy.complete", "deploy.failed"]
    default_publishes: "deploy.complete"
    max_activations: 3
    instructions: |
      ## Your Job
      1. Run the FULL test suite (not just this capability's tests)
      2. Commit all changes to branch: feature/{CAPABILITY}
      3. Push to GitHub
      4. SSH to VPS and run deploy.sh
      5. Run verification steps from build/kb/DEPLOYMENT.md
      6. If all pass, merge to main

      ## Backpressure
      Before emitting deploy.complete:
      - Full test suite passes
      - Branch pushed to GitHub
      - deploy.sh ran on VPS
      - Verification steps from DEPLOYMENT.md pass
      - Merged to main
      - MOJO_REGISTRY.md updated if new Mojo
      - CREDENTIALS.md updated if new env vars

      Evidence: "tests: pass, branch: merged, vps: verified, registry: updated"

  # ─────────────────────────────────────────────
  # HAT 8: FINALIZER
  # ─────────────────────────────────────────────
  finalizer:
    name: "Finalizer"
    description: "Final completeness check, then LOOP_COMPLETE"
    triggers: ["deploy.complete"]
    publishes: ["LOOP_COMPLETE"]
    max_activations: 1
    instructions: |
      ## Final Checklist
      - [ ] All stories marked [x] in PROMPT.md
      - [ ] All tests pass
      - [ ] Coverage >= 80%
      - [ ] build/kb/ has all 6 KB files
      - [ ] Zero {{VERIFY-AFTER-BUILD}} markers remain
      - [ ] LMS modules in build/kb/LMS/
      - [ ] MOJO_REGISTRY.md updated
      - [ ] CREDENTIALS.md updated
      - [ ] Merged to main
      - [ ] VPS deployment verified
      - [ ] No outstanding BLOCKED-*.md files for this capability

      Write build/STORIES-STATUS.md with final status of every story.
      Emit LOOP_COMPLETE.

      Evidence: "capability: {NAME}, stories: {done}/{total}, kb: 6/6, deployed: yes"
```

### Build Factory Event Flow

```
build.start
  -> Planner -> story.ready
  -> Builder -> story.built
  -> Static Analysis Gate -> static.pass OR static.fail
                               |                |
                               v                v
  -> Primary Reviewer      Builder (fix static issues)
       -> review.primary.pass OR review.primary.fail
            |                        |
            v                        v
  -> Secondary Reviewer          Builder (fix review issues)
       -> review.cycle.complete OR review.fix_required
            |                        |
            v                        v
       Planner (marks done,      Builder (fix issues)
        picks next story)
            |
            v (when all done)
       all_stories.done
  -> KB Verifier -> kb.verified
  -> Deployer -> deploy.complete OR deploy.failed
                    |                    |
                    v                    v
               Finalizer            Planner (retry)
  -> LOOP_COMPLETE
```

### The Multi-Model Review Pipeline (Belt and Suspenders)

Every story passes through FOUR verification layers before being marked complete:

| Layer | Type | Model | What It Catches |
|-------|------|-------|-----------------|
| **Static Analysis** | Deterministic | None (shell commands) | Test failures, coverage gaps, anti-pattern greps, file existence |
| **Primary Review** | AI judgment | Model B (different from Builder) | Logic errors, spec mismatches, missing edge cases |
| **Secondary Review** | AI judgment | Model C (different from both) | Guardrail violations, integration issues, test quality, security |
| **Builder self-test** | Backpressure | Model A (Builder) | Tests must pass before story.built is emitted |

This means a bug must fool three different models AND survive deterministic grep-based checks to make it through.

### Running the Build Factory

```bash
cd spark-mojo-platform
export CAPABILITY="crm-client-identity"

# Copy agent instructions
cp factory/capabilities/${CAPABILITY}/spec/build-factory/CLAUDE.md ./CLAUDE.md

# Run (ralph.yml was generated by spec factory with correct iteration count)
ralph run \
  -c factory/capabilities/${CAPABILITY}/spec/build-factory/ralph.yml \
  -H factory/build-factory/hats.yml \
  --no-tui
```

---

## 8. Phase 4: Post-Build Verification (Human, 15-30 min)

1. **Read STORIES-STATUS.md** - all stories complete
2. **Read DEFICIENCIES.md** - understand what was cut or stubbed
3. **Read any BLOCKED-*.md** - these need human resolution
4. **Browser walkthrough on VPS** - manual click-through of key workflows
5. **Spot-check USER-GUIDE.md** - compare a few sections against actual UI
6. **Check MOJO_REGISTRY.md** - endpoints registered

---

## 9. N8N Orchestration Layer

### Optional but Recommended: N8N as the Factory Controller

```
Webhook: /factory/start/{capability}
  -> Verify input/READY.md exists
  -> Run Spec Factory (exec ralph command)
  -> Wait for completion
  -> Telegram: "Spec factory done for {capability}. Review needed."
  -> Poll for APPROVED.md (or webhook)
  -> Run Build Factory (exec ralph command)
  -> Wait for completion
  -> Telegram: "Build factory done for {capability}. VPS verification needed."
```

### Telegram Integration

Ralph's native RObot config (enabled in the build factory ralph.yml) provides:
- 15-minute status updates during build
- Immediate notification on BLOCKED states
- Ability to send guidance mid-run
- Parallel loop routing if running multiple builds

---

## 10. File Conventions and Templates

### Story ID Format
`{CAP}-{NNN}` where CAP is a short capability code.
- CRM-001, CRM-002 for CRM Client Identity
- BILL-001 for Billing
- SCHED-001 for Scheduling

### Atomic Story Size Guide
| Size | Files | Endpoints | Iterations | Wall Time |
|------|-------|-----------|-----------|-----------|
| XS | 1 file | 0-1 | 2-4 | 10-20 min |
| S | 2-3 files | 1 | 4-8 | 20-45 min |

No M or L stories. If it's bigger than S, split it.

### Blocked File Format

```markdown
# BLOCKED: {Topic}

**Phase:** Spec Factory / Build Factory
**Story:** {STORY-ID} (if applicable)
**Date:** {date}

## Problem
{What is blocking progress}

## Why This Cannot Be Resolved Automatically
{Why the agent cannot make this decision}

## Options
1. {Option A} - {tradeoff}
2. {Option B} - {tradeoff}

## Recommended Default
{What the agent would do if forced to choose}

## Impact of Deferral
{What happens if we skip this}
```

### KB Verify-After-Build Marker

Used in spec factory KB drafts for implementation-specific details:

```markdown
The configuration screen shows {{VERIFY-AFTER-BUILD: exact field names and
default values from the implemented SM Custom Fields}}.
```

The KB Verifier hat in the build factory resolves every marker with actual values.

---

## 11. Failure Modes and Recovery

### Spec Factory Failures

| Failure | Detection | Recovery |
|---------|-----------|---------|
| Verifier rejects 4 times | max_activations hit | Ralph stops. Human reads VERIFICATION-REPORT.md, fixes input, re-runs. |
| Missing input docs | BLOCKED file | Human adds missing doc, re-runs. |
| Guardrail conflict | BLOCKED file | Human resolves, re-runs. |
| Claude rate limit | Ralph backoff | Self-resolves. Wait if persistent. |
| Context window exceeded | Truncated output | Unlikely with atomic stories. If hit, reduce scope. |

### Build Factory Failures

| Failure | Detection | Recovery |
|---------|-----------|---------|
| Tests won't pass (3+ review rejections) | Loop burns iterations | Telegram notification. Human reviews via Telegram guidance or direct fix. |
| Static analysis keeps failing | static.fail loops | Usually an anti-pattern grep catching legitimate code. Human adds exception or fixes. |
| VPS deploy fails | deploy.failed | Deployer retries 3x. Then BLOCKED file. |
| OSS model produces garbage | Tests never pass | Switch model for Builder hat. Re-run. |
| Story spec is ambiguous | BLOCKED file | Human clarifies in spec file. Build factory re-reads next iteration. |
| Git conflicts | Build fails | ralph clean + manual merge + re-run. |

### Recovery Commands

```bash
ralph run --continue              # Resume
ralph clean && ralph run -c ...   # Full restart
ralph events                      # Event history
ralph tools task list             # Task status
```

---

## 12. Scaling Strategy

### Phase 1: Sequential (Start Here)
One capability at a time. Validate the process end-to-end.

### Phase 2: Parallel Specs, Sequential Builds
Spec factories in parallel (read-only). Build factories sequential (modify repo).

### Phase 3: Parallel Builds via Worktrees
Ralph's git worktree support. Each capability builds in its own worktree.
Mac Minis each run one build factory instance. Ralph's `ralph loops` manages merges.

### Phase 4: Full Automation (Post-Ralph Exploration)
N8N + OpenClaw/Hermes on Mac Mini cluster. Fully autonomous pipeline with
n8n as the queue manager and merge sequencer. This is the next design task.

---

## 13. Calibration Tests Before First Run

Run these before committing to the full pipeline:

### Test 1: OSS Model Code Quality
Give your chosen OSS model one existing completed story as a spec.
Can it reproduce a working implementation?
**This determines if the build factory works at all.**

### Test 2: Spec Factory Dry Run
Run the spec factory on CRM Client Identity.
Review the story decomposition and specs.
**This validates the atomic story approach.**

### Test 3: KB Prose Quality
Give Claude Opus an existing implemented feature.
Have it write USER-GUIDE.md and FAQ.md.
**This validates the spec-time KB drafting approach.**

### Test 4: Multi-Model Review Effectiveness
Take a deliberately buggy implementation (plant 5 known bugs).
Run it through the three-layer review (static + primary + secondary).
**How many of the 5 bugs does the pipeline catch?**

### Estimated Calibration Cost
- Tests 1-4: ~$15-30 total, 3-4 hours elapsed
- Bakeoff (Section 2): ~$20-40 total, 2-3 hours elapsed
- Total before first real run: ~$35-70, one working day

### Estimated First Capability Run (Post-Calibration)

| Phase | Duration | Cost |
|-------|----------|------|
| Input prep (human) | 1-2 hours | $0 |
| Spec factory (Claude Opus) | 45-90 min | ~$8-20 |
| Human verification | 10-15 min | $0 |
| Build factory (OSS model) | 4-10 hours | ~$0-10 |
| Human verification | 15-30 min | $0 |
| **Total** | **6-14 hours elapsed** | **~$8-30** |

With atomic stories (higher count, lower complexity), expect the build factory to take slightly longer per story but with dramatically fewer failures and retries. Net time should be comparable or faster than medium-complexity stories that require multiple fix cycles.
#######################################

SEPARATE PART: FACTORY COMMAND CENTER (Not to be completed until the above is done)
# Spark Mojo Development Factory Command Center
## Product Requirements Document + Implementation Guide

**Author:** Claude Opus 4.6 for James Ilsley
**Date:** April 8, 2026
**Version:** 1.0
**Companion to:** Autonomous Dev Factory Design v3

---

## Part 1: Product Requirements

### 1.1 What It Is

The Factory Command Center is a single-screen dashboard and workflow enforcement layer for the Spark Mojo Autonomous Development Factory. It is the human interface to the two-pipeline factory system (Spec Factory + Build Factory), designed for a solo founder with ADHD who needs to see everything at a glance, get told exactly when action is needed, and never have to remember what step comes next.

It is NOT a project management tool. It is NOT a general-purpose dashboard. It is a purpose-built control room for one specific automated process with exactly four human touchpoints.

### 1.2 The Problem It Solves

The factory design document (v3) defines a technically excellent automated pipeline. But the human experience of operating it has these gaps:

- **No single view of what's happening.** Capabilities could be in various pipeline stages across different terminal sessions, directories, and Ralph runs. The human has to mentally track all of it.
- **No proactive notification system.** Ralph has Telegram integration for individual build runs, but nothing that orchestrates across the full pipeline or across multiple capabilities.
- **No guided checklists.** The human touchpoints (input prep, spec review, deploy approval, VPS verification) are documented in the design doc but not enforced or guided at runtime.
- **No history.** "What happened overnight?" requires reading Ralph event logs, git history, and file timestamps across multiple directories.
- **No dopamine.** Shipping capabilities is invisible. There's no moment of completion, no running tally, no sense of velocity.

### 1.3 Design Principles

1. **One number.** The home screen shows one number: how many things need your attention right now. Everything else is secondary.
2. **Cards, not dashboards.** Each capability is a card. Cards flow through columns. You see the whole pipeline at a glance.
3. **Checklists, not instructions.** When it's your turn, you get a step-by-step checklist with copy-paste commands. Not paragraphs to read.
4. **Push, don't pull.** Telegram tells you when you're needed. You don't check the dashboard. The dashboard checks on you.
5. **Celebrate completion.** When a capability ships, you see it. Running total. Cost. Time. Stories built. The win matters.

### 1.4 Users

One user: James. Solo founder. ADHD. Operates from Mac. Uses Telegram. Runs n8n on a VPS. Has Claude Code and OpenCode installed locally.

### 1.5 Core Features

#### F1: Pipeline Kanban Board

A single-screen Kanban with 7 columns representing the factory pipeline:

| Column | State | Card Color | Human Action? |
|--------|-------|-----------|---------------|
| Backlog | Research complete, not yet prepped | Gray | No |
| Input Prep | Human assembling inputs | Yellow | YES |
| Spec Running | Spec factory Ralph loop active | Blue (animated) | No |
| Spec Review | Spec complete, awaiting human review | Yellow (pulsing) | YES |
| Build Running | Build factory Ralph loop active | Blue (animated) | No |
| Deploy Review | Build complete, awaiting human verification | Yellow (pulsing) | YES |
| Shipped | Deployed, verified, done | Green | No |

Each card shows:
- Capability name (e.g., "CRM Client Identity")
- Time in current column (e.g., "2h 14m")
- If in Build Running: progress bar (e.g., "24/38 stories")
- If blocked: red border + "BLOCKED" badge
- If clinical: small shield icon

#### F2: Action Required Panel

When you tap a yellow card (or when the dashboard loads with pending actions), a right-side panel opens with:

- **What to do** (one sentence)
- **Why** (one sentence)
- **Step-by-step checklist** with checkboxes
- Each step includes a **copy button** for terminal commands or file paths
- Steps are context-aware (they know which capability, which directory, which phase)
- A "Done" button that writes the appropriate gate file (READY.md, APPROVED.md, etc.) and advances the card

Example for Spec Review:

```
ACTION REQUIRED: Review specs for CRM Client Identity

The spec factory completed 47 minutes ago. 38 atomic stories were generated.
2 open questions flagged (non-blocking).

CHECKLIST:
□ Read verification report
  [COPY] cat factory/capabilities/crm-client-identity/spec/VERIFICATION-REPORT.md

□ Skim story list (38 stories, all size S or XS)
  [COPY] cat factory/capabilities/crm-client-identity/spec/STORIES.md

□ Check open questions
  [COPY] cat factory/capabilities/crm-client-identity/spec/OPEN-QUESTIONS.md

□ Spot-check 2-3 story specs
  [COPY] ls factory/capabilities/crm-client-identity/spec/stories/
  [COPY] cat factory/capabilities/crm-client-identity/spec/stories/CRM-001.md

□ Skim KB draft quality
  [COPY] head -100 factory/capabilities/crm-client-identity/spec/kb-drafts/USER-GUIDE.md

□ Verify PROMPT.md is lightweight
  [COPY] wc -w factory/capabilities/crm-client-identity/spec/build-factory/PROMPT.md

[APPROVE] → Creates APPROVED.md and triggers build factory
[REQUEST CHANGES] → Opens text input for revision notes
```

#### F3: Telegram Notifications

N8n sends Telegram messages at these moments:

| Trigger | Message | Urgency |
|---------|---------|---------|
| Spec factory complete | "Spec factory done for {capability}. 38 stories generated. Review needed. ~10 min task." | Normal |
| Build factory 50% milestone | "{capability} build: 19/38 stories complete. Running smoothly. No action needed." | Low |
| Build factory BLOCKED | "BLOCKED: {capability} story CRM-024 hit a blocker. See BLOCKED-CRM-024.md. Needs your input." | High |
| Clinical deploy gate | "CLINICAL GATE: {capability} ready to deploy. Reply YES to approve or NO to hold." | High |
| Build factory complete | "Build factory done for {capability}. All 38 stories built. VPS verification needed. ~15 min task." | Normal |
| Capability shipped | "SHIPPED: {capability}. 38 stories, 6 KB articles, $14.20 total cost. Capability #7 complete." | Celebration |
| Morning digest (8 AM) | "Good morning. 2 capabilities in flight. Billing waiting on spec review (14h). CRM building, ETA 3h." | Daily |
| Stale reminder (24h+ in yellow) | "{capability} has been waiting on your review for 26 hours. ~10 min task." | Nudge |

#### F4: Overnight Log (What Happened While I Slept)

A timeline view for any capability showing human-readable events:

```
CRM Client Identity - Last 12 Hours

04:47 AM  All 38 stories complete. KB verification starting.
04:31 AM  CRM-038 passed secondary review (MiniMax 2.7)
04:14 AM  CRM-037 built, static analysis passed, under review
03:52 AM  CRM-036 passed all 4 verification layers
...
10:45 PM  Build factory started. 38 stories queued.
10:44 PM  You approved specs.
10:30 PM  Spec factory complete. You were notified via Telegram.
```

Not log files. Not JSON. Human sentences with timestamps.

#### F5: Shipped Board

A permanent record of everything the factory has produced:

```
SHIPPED CAPABILITIES

#7  CRM Client Identity    April 9, 2026     38 stories  $14.20   12h 34m
#6  Workflow Engine         April 7, 2026     42 stories  $18.50   14h 12m
#5  Configuration Mojo     April 5, 2026     22 stories  $ 8.30    6h 45m
...

TOTALS: 7 capabilities | 194 stories | $72.40 | 62 hours factory time
```

#### F6: Pre-Flight Readiness Check

Before starting input prep for a new capability, the dashboard checks:

- [ ] Research pack exists (all 4 docs present in platform/research/)
- [ ] RESEARCH-CORRECTIONS.md checked for this capability
- [ ] Model bakeoff current (MODEL-ASSIGNMENTS.md less than 30 days old)
- [ ] No unresolved BLOCKED files from previous capabilities
- [ ] VPS is reachable (simple health check)
- [ ] Git repo is clean (no uncommitted changes)

Green = ready to start. Red = fix before proceeding.

#### F7: Factory Process Enforcement

N8n enforces the pipeline sequence. You cannot skip steps:

- Build factory will not start unless APPROVED.md exists
- Deploy will not proceed if clinical_feature is true without Telegram YES
- A capability cannot move to Shipped unless post-deploy verification checklist is complete
- READY.md cannot be created if pre-flight checks fail

### 1.6 What It Is NOT

- Not a code editor or IDE integration
- Not a replacement for reading specs and docs (it links to them)
- Not a multi-user collaboration tool
- Not a general project management tool
- Not where you write research or user stories (those happen elsewhere)

### 1.7 Tech Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Dashboard UI | React JSX, single page | Matches your platform stack. No new tech. |
| State management | JSON files in factory/ directory | Disk is state. Same philosophy as Ralph. |
| Workflow automation | n8n (self-hosted, automation.sparkmojo.com) | Already running. Already in your stack. |
| Push notifications | Telegram via n8n | Already wired into Ralph. |
| Hosting | Local dev server or VPS static site | Lightweight. No infrastructure needed. |

---

## Part 2: Implementation Guide

### Overview of What You're Building

There are 3 components to build:

1. **State files and conventions** - The JSON state file format and directory conventions
2. **N8n workflows** - 5 workflows that watch, enforce, notify, and orchestrate
3. **Dashboard UI** - A React JSX single-page app that reads state and renders the Kanban

Build them in this order. Each step is independently useful.

---

### Step 1: State File Convention

Create the state tracking infrastructure. This is manual setup, no code needed.

#### 1a: Create the state directory

```bash
mkdir -p factory/state
```

#### 1b: Create a template state file

Create `factory/templates/STATE-TEMPLATE.json`:

```json
{
  "capability": "",
  "capability_short": "",
  "phase": "backlog",
  "phase_entered": "",
  "human_action_required": false,
  "human_action_type": null,
  "stories_total": 0,
  "stories_complete": 0,
  "blocked": false,
  "blocked_reason": null,
  "clinical_feature": false,
  "cost_so_far": "$0.00",
  "spec_factory_started": null,
  "spec_factory_completed": null,
  "build_factory_started": null,
  "build_factory_completed": null,
  "deployed_at": null,
  "shipped_at": null,
  "total_elapsed_minutes": 0,
  "events": []
}
```

#### 1c: Define the phase state machine

Valid phase transitions (n8n will enforce these):

```
backlog -> input_prep -> spec_running -> spec_review -> build_running -> deploy_review -> shipped
                                ^                            |
                                |                            v
                                +--- spec_rejected (loops back to spec_running)
```

The `events` array captures the overnight log. Each entry:

```json
{
  "time": "2026-04-09T03:14:00Z",
  "type": "story_complete",
  "message": "CRM-024 passed secondary review",
  "phase": "build_running"
}
```

---

### Step 2: N8n Workflows

Build 5 n8n workflows. Each is independent and can be built/tested separately.

#### Workflow 1: Factory State Watcher

**Purpose:** Watches the factory directory for gate files (READY.md, APPROVED.md, LOOP_COMPLETE) and updates state accordingly.

**Claude Code prompt to generate this workflow:**

```
I need an n8n workflow JSON that does the following:

TRIGGER: Cron schedule, runs every 60 seconds.

LOGIC:
1. List all directories under factory/capabilities/ (each is a capability)
2. For each capability, read factory/state/{capability}.json (or create from template if missing)
3. Check the current phase and look for transition triggers:

   Phase "backlog":
   - If factory/capabilities/{cap}/input/READY.md exists -> transition to "input_prep"

   Phase "input_prep":
   - If READY.md contains "## GO" -> transition to "spec_running"
   - (The transition to spec_running also triggers Workflow 2: Ralph Runner)

   Phase "spec_running":
   - If factory/capabilities/{cap}/spec/VERIFICATION-REPORT.md exists
     AND spec/OPEN-QUESTIONS.md exists
     AND no BLOCKED-*.md files in the capability root
     -> transition to "spec_review", set human_action_required: true

   Phase "spec_review":
   - If factory/capabilities/{cap}/spec/APPROVED.md exists -> transition to "build_running"
   - If factory/capabilities/{cap}/spec/REVISE.md exists -> transition to "spec_running" (re-run)

   Phase "build_running":
   - Read factory/capabilities/{cap}/spec/build-factory/PROMPT.md
   - Count checked [x] vs unchecked [ ] stories
   - Update stories_total and stories_complete
   - If build/STORIES-STATUS.md exists -> transition to "deploy_review"
   - If any BLOCKED-*.md exists -> set blocked: true

   Phase "deploy_review":
   - If human confirms via Telegram (clinical) or checklist (non-clinical)
     -> transition to "shipped"

4. On any transition, append an event to the events array
5. Write updated state back to factory/state/{capability}.json

ENVIRONMENT:
- n8n has filesystem access to the repo at /path/to/spark-mojo-platform
- Use the "Read/Write File" and "Execute Command" nodes
- Use "If" nodes for phase logic

OUTPUT: Valid n8n workflow JSON I can import directly.
```

#### Workflow 2: Ralph Runner

**Purpose:** Automatically starts Ralph loops when a capability enters spec_running or build_running phase.

**Claude Code prompt:**

```
I need an n8n workflow JSON that does the following:

TRIGGER: Webhook - POST /factory/run-ralph
Payload: { "capability": "crm-client-identity", "phase": "spec" | "build" }

LOGIC:
For phase "spec":
1. Set working directory to the platform repo root
2. Execute command (async, don't wait for completion):
   ralph run \
     -c factory/spec-factory/ralph.yml \
     -H factory/spec-factory/hats.yml \
     --no-tui \
     -p "Build specifications for the {capability} capability. Input: factory/capabilities/{capability}/input/. Output: factory/capabilities/{capability}/spec/." \
     2>&1 | tee factory/state/{capability}-spec-factory.log
3. Update state JSON: spec_factory_started = now()
4. Append event: "Spec factory started"

For phase "build":
1. Copy CLAUDE.md to repo root:
   cp factory/capabilities/{capability}/spec/build-factory/CLAUDE.md ./CLAUDE.md
2. Execute command (async):
   ralph run \
     -c factory/capabilities/{capability}/spec/build-factory/ralph.yml \
     -H factory/build-factory/hats.yml \
     --no-tui \
     2>&1 | tee factory/state/{capability}-build-factory.log
3. Update state JSON: build_factory_started = now()
4. Append event: "Build factory started"

ENVIRONMENT:
- n8n server can execute shell commands on the machine where Ralph runs
- If Ralph runs on a different machine (Mac Mini), use SSH Execute node instead
- The ralph binary is in PATH

OUTPUT: Valid n8n workflow JSON I can import.
```

#### Workflow 3: Telegram Notifier

**Purpose:** Sends context-aware Telegram messages at key moments.

**Claude Code prompt:**

```
I need an n8n workflow JSON that does the following:

TRIGGER: Webhook - POST /factory/notify
Payload: {
  "capability": "crm-client-identity",
  "event_type": "spec_complete" | "build_progress" | "blocked" | "clinical_gate" | "build_complete" | "shipped" | "stale_reminder",
  "details": { ... event-specific data }
}

LOGIC:
Based on event_type, compose and send a Telegram message:

"spec_complete":
  "Spec factory done for {capability}. {stories_total} stories generated.
  {open_questions} open questions. Review needed. ~10 min task."

"build_progress" (only send at 25%, 50%, 75%):
  "{capability} build: {complete}/{total} stories done. Running smoothly."

"blocked":
  "BLOCKED: {capability} story {story_id} hit a blocker.
  Reason: {reason}. Needs your input."

"clinical_gate":
  "CLINICAL GATE: {capability} ready to deploy.
  clinical_feature is TRUE. Reply YES to approve deploy or NO to hold."
  (Wait for reply using Telegram Trigger node, timeout 4 hours)
  (Write response to factory/state/{capability}-clinical-response.txt)

"build_complete":
  "Build factory done for {capability}. All {total} stories built.
  6 KB articles written. VPS verification needed. ~15 min task."

"shipped":
  "SHIPPED: {capability}. {stories} stories, {kb_count} KB articles,
  {cost} total cost, {elapsed} elapsed. Capability #{number} complete."

"stale_reminder":
  "{capability} has been waiting on your review for {hours} hours.
  ~{estimated_minutes} min task."

TELEGRAM CONFIG:
- Bot token: (use environment variable TELEGRAM_BOT_TOKEN)
- Chat ID: (use environment variable TELEGRAM_CHAT_ID)
- Use Telegram node for sending
- For clinical_gate, use Telegram Trigger node to wait for reply

OUTPUT: Valid n8n workflow JSON I can import.
```

#### Workflow 4: Morning Digest

**Purpose:** Sends a daily summary at 8 AM.

**Claude Code prompt:**

```
I need an n8n workflow JSON that does the following:

TRIGGER: Cron - every day at 8:00 AM Eastern

LOGIC:
1. Read all state files from factory/state/*.json
2. Categorize capabilities by phase
3. Identify any that are human_action_required: true
4. Calculate time-in-phase for anything in a yellow state

5. Compose Telegram message:
   "Good morning James.

   ACTION NEEDED:
   - {capability}: waiting on spec review (Xh)
   - {capability}: waiting on deploy verification (Xh)

   IN PROGRESS:
   - {capability}: building, {n}/{total} stories (ETA ~Xh)
   - {capability}: spec factory running (~Xm remaining)

   SHIPPED THIS WEEK: {count} capabilities

   Nothing else needs you right now. Have a good morning."

   If nothing needs attention:
   "Good morning James. Factory is quiet. No action needed.
   {count} capabilities shipped total."

6. Send via Telegram

OUTPUT: Valid n8n workflow JSON I can import.
```

#### Workflow 5: Stale Checker

**Purpose:** Detects capabilities stuck waiting for human action and nudges.

**Claude Code prompt:**

```
I need an n8n workflow JSON that does the following:

TRIGGER: Cron - every 4 hours

LOGIC:
1. Read all state files from factory/state/*.json
2. For each capability where human_action_required is true:
   - Calculate hours since phase_entered
   - If > 24 hours: send stale_reminder via Workflow 3 webhook
   - If > 48 hours: send escalated reminder with stronger language
3. For each capability where blocked is true:
   - If blocked for > 12 hours: send reminder about the blocked item

OUTPUT: Valid n8n workflow JSON I can import.
```

---

### Step 3: Dashboard UI

A single React JSX file that reads state files and renders the Kanban board.

**Claude Code prompt for the dashboard:**

```
Build a single-file React JSX dashboard for the Spark Mojo Development
Factory Command Center. No TypeScript. No separate CSS file - use inline
styles or a style block.

REQUIREMENTS:

1. DATA SOURCE:
   - Fetch state from a local API endpoint: GET /api/factory/state
     (This will be served by a simple Express server or n8n webhook that
     reads all factory/state/*.json files and returns them as an array)
   - Poll every 30 seconds for updates
   - Also accept a static JSON file for development/testing

2. LAYOUT (single screen, no scrolling on desktop):
   - Top bar: "Spark Mojo Factory" title on left, "Action Required: {n}"
     badge on right (yellow pulsing if n > 0)
   - Main area: 7-column Kanban board
   - Bottom bar: "Shipped: {n} capabilities | {total_stories} stories |
     {total_cost} | {total_hours}h factory time"

3. KANBAN COLUMNS:
   - Backlog (gray header)
   - Input Prep (yellow header)
   - Spec Running (blue header)
   - Spec Review (yellow header)
   - Build Running (blue header)
   - Deploy Review (yellow header)
   - Shipped (green header)

4. CAPABILITY CARDS:
   - Rounded rectangle, white background
   - Capability name (bold, 14px)
   - Time in phase: "2h 14m" (gray, 12px)
   - If build_running: progress bar showing stories_complete/stories_total
   - If blocked: red left border, "BLOCKED" badge
   - If clinical_feature: small shield icon in top-right corner
   - If human_action_required: yellow glow/pulse animation
   - Cards are clickable

5. ACTION PANEL (slides in from right when card clicked):
   - Shows context-aware checklist based on current phase
   - Each step has a "copy to clipboard" button for commands
   - Commands use the actual capability name from state
   - For spec_review phase, checklist items:
     a. Read verification report [COPY: cat factory/capabilities/{cap}/spec/VERIFICATION-REPORT.md]
     b. Skim story list [COPY: cat factory/capabilities/{cap}/spec/STORIES.md]
     c. Check open questions [COPY: cat factory/capabilities/{cap}/spec/OPEN-QUESTIONS.md]
     d. Spot-check story specs [COPY: ls factory/capabilities/{cap}/spec/stories/]
     e. Skim KB draft quality [COPY: head -100 factory/capabilities/{cap}/spec/kb-drafts/USER-GUIDE.md]
     f. Verify PROMPT.md size [COPY: wc -w factory/capabilities/{cap}/spec/build-factory/PROMPT.md]
   - For deploy_review phase, checklist items:
     a. Read stories status [COPY: cat factory/capabilities/{cap}/build/STORIES-STATUS.md]
     b. Read deficiencies [COPY: cat factory/capabilities/{cap}/build/kb/DEFICIENCIES.md]
     c. Check for blockers [COPY: ls factory/capabilities/{cap}/BLOCKED-*.md 2>/dev/null]
     d. Browser walkthrough on VPS [LINK: https://poc-dev.sparkmojo.com]
     e. Spot-check user guide [COPY: head -100 factory/capabilities/{cap}/build/kb/USER-GUIDE.md]
   - [APPROVE] button at bottom (green, makes POST to /api/factory/approve)
   - [REQUEST CHANGES] button (orange, opens text input)

6. OVERNIGHT LOG (accessible via clock icon in top bar):
   - Modal overlay
   - Dropdown to select capability
   - Shows events array from state file in reverse chronological order
   - Format: "HH:MM AM/PM - {message}"
   - Group by date if multiple days

7. SHIPPED BOARD (accessible via trophy icon in top bar):
   - Modal overlay
   - Table of all shipped capabilities
   - Columns: #, Name, Date, Stories, Cost, Time
   - Running totals at bottom

8. STYLING:
   - Use CSS variables: --sm-bg: #f8f9fa, --sm-card: #ffffff,
     --sm-yellow: #fbbf24, --sm-blue: #3b82f6, --sm-green: #22c55e,
     --sm-red: #ef4444, --sm-gray: #6b7280
   - No hardcoded hex colors outside the variable definitions
   - Clean, minimal. Geist or Inter font if available, system-ui fallback
   - Dark mode support via prefers-color-scheme media query

9. ANIMATIONS:
   - Yellow pulse on cards requiring action (CSS keyframes, subtle)
   - Blue shimmer on cards in automated phases (CSS keyframes, very subtle)
   - Smooth slide-in for action panel
   - Confetti or checkmark animation when a capability moves to Shipped
     (keep it brief, 2 seconds)

10. RESPONSIVE:
    - Desktop: full 7-column Kanban
    - Mobile (< 768px): single column, stacked phases, only show
      cards requiring action at the top

Do NOT use TypeScript. Do NOT use external component libraries.
Use only React hooks (useState, useEffect, useCallback).
The entire dashboard must be a single .jsx file.
```

---

### Step 4: Simple API Server

The dashboard needs an API to read state and trigger actions. Build a minimal Express server or use n8n webhooks.

**Claude Code prompt for the API:**

```
Build a minimal Express.js server (single file, server.jsx is fine or
server.js) that serves the Factory Command Center dashboard and provides
these API endpoints:

1. GET /api/factory/state
   - Reads all .json files from factory/state/ directory
   - Returns them as a JSON array
   - Sorts by phase (action-required phases first)

2. POST /api/factory/approve
   Body: { "capability": "crm-client-identity", "phase": "spec_review" | "deploy_review" }
   - For spec_review: creates factory/capabilities/{cap}/spec/APPROVED.md
     with reviewer name "James", current timestamp, and "## GO"
   - For deploy_review: updates state to "shipped", appends shipped event
   - Returns updated state

3. POST /api/factory/request-changes
   Body: { "capability": "crm-client-identity", "notes": "..." }
   - Creates factory/capabilities/{cap}/spec/REVISE.md with the notes
   - Updates state phase to "spec_running" (triggers re-run)
   - Returns updated state

4. GET /api/factory/events/{capability}
   - Returns the events array from that capability's state file
   - Supports ?since=ISO_DATE query param to filter

5. GET /
   - Serves the dashboard JSX file (use a simple static file serve
     or inline it)

CONFIGURATION:
- FACTORY_ROOT environment variable points to the factory/ directory
- PORT defaults to 3333
- No authentication needed (local use only)

Keep it minimal. Under 200 lines. No database.
```

---

### Step 5: Wire It All Together

#### 5a: Start the state watcher

Import Workflow 1 (Factory State Watcher) into n8n. Activate it. It will start polling the factory directory every 60 seconds and creating/updating state files.

#### 5b: Configure Telegram

If not already done:

```bash
# Set these in your n8n environment
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id
```

Import Workflows 3, 4, and 5 (Notifier, Morning Digest, Stale Checker). Activate them.

#### 5c: Configure Ralph Runner

Import Workflow 2 (Ralph Runner). Update the working directory paths to match your setup. Activate it.

The State Watcher (Workflow 1) calls the Ralph Runner webhook when a capability transitions to spec_running or build_running.

#### 5d: Start the dashboard

```bash
cd spark-mojo-platform
node factory/command-center/server.js
# Dashboard available at http://localhost:3333
```

#### 5e: Test with a dry run

Create a test capability to verify the full flow:

```bash
# Create a test capability
mkdir -p factory/capabilities/test-capability/input

# Create minimal input files
echo "# Test Synthesis" > factory/capabilities/test-capability/input/SYNTHESIS.md
echo "# Test Technical" > factory/capabilities/test-capability/input/TECHNICAL-RESEARCH.md
echo "# Test Workflow" > factory/capabilities/test-capability/input/WORKFLOW-RESEARCH.md
echo "# Test AI" > factory/capabilities/test-capability/input/AI-ANALYSIS.md
echo "# Test Stories" > factory/capabilities/test-capability/input/USER-STORIES.md

# Create RUN-META.yml
cat > factory/capabilities/test-capability/input/RUN-META.yml << 'EOF'
capability: TEST-CAPABILITY
capability_short: TEST
environment: poc-dev
branch: main
risk_level: preprod
clinical_feature: false
vertical: behavioral_health
lms_stubs: false
EOF

# Watch the dashboard - test-capability should appear in Backlog

# Create READY.md to trigger transition to Input Prep
cat > factory/capabilities/test-capability/input/READY.md << 'EOF'
# Capability Ready for Spec Factory
- Capability: Test Capability
- Date: 2026-04-08
## GO
EOF

# Watch the dashboard - card should move through phases
# (Spec factory will fail on test data, which tests your blocked/error handling)
```

---

### Build Order Summary

| Step | What | Time Estimate | Dependencies |
|------|------|---------------|-------------|
| 1 | State file convention + templates | 15 min (manual) | None |
| 2a | N8n Workflow 1: State Watcher | 1-2 hours (Claude Code) | Step 1 |
| 2b | N8n Workflow 2: Ralph Runner | 1 hour (Claude Code) | Step 1 |
| 2c | N8n Workflow 3: Telegram Notifier | 1 hour (Claude Code) | Telegram bot configured |
| 2d | N8n Workflow 4: Morning Digest | 30 min (Claude Code) | Workflow 3 |
| 2e | N8n Workflow 5: Stale Checker | 30 min (Claude Code) | Workflow 3 |
| 3 | Dashboard UI | 2-3 hours (Claude Code) | Step 1 |
| 4 | API Server | 1 hour (Claude Code) | Steps 1, 3 |
| 5 | Wire and test | 1-2 hours (manual) | All above |
| **Total** | | **8-12 hours** | |

You can build this incrementally. Steps 1 + 2a + 2c give you the state tracking and Telegram notifications without any dashboard. That alone is high value. Add the dashboard later when you want the visual layer.

---

### File Locations

After building, your factory directory gains:

```
factory/
├── state/                          # NEW: State files
│   ├── crm-client-identity.json
│   └── ...
├── command-center/                 # NEW: Dashboard app
│   ├── dashboard.jsx               # The single-file React dashboard
│   ├── server.js                   # Minimal Express API
│   └── package.json                # Express dependency only
├── templates/
│   ├── STATE-TEMPLATE.json         # NEW: State file template
│   └── ... (existing templates)
└── ... (existing factory structure)
```

---

### Future Enhancements (Not in V1)

- **Voice command integration:** "Hey Siri, what's the factory status?" via Shortcuts + API
- **Cost tracking integration:** Read Ralph diagnostics for actual token usage and compute real costs per capability
- **Velocity chart:** Graph showing capabilities shipped per week over time
- **Dependency visualization:** If two capabilities have dependencies, show them on the Kanban
- **Auto-prioritization:** Suggest which capability to prep next based on platform roadmap and dependency graph
- **iPad companion:** Optimized tablet view for reviewing specs on the couch
