# Test 01: Story Decomposition

**Task type:** Architectural reasoning
**Evaluates:** Can the model break a complex capability into atomic, independently
testable stories following Spark Mojo's factory rules?

---

## Input Files

Provide these files as context (read-only, do not modify):

- `platform/research/crm-client-identity/CRM-CLIENT-IDENTITY-SYNTHESIS.md`
- `platform/research/crm-client-identity/CRM-CLIENT-IDENTITY-TECHNICAL-RESEARCH.md`
- `platform/research/crm-client-identity/CRM-CLIENT-IDENTITY-WORKFLOW-RESEARCH.md`
- `platform/research/crm-client-identity/CRM-CLIENT-IDENTITY-AI-ANALYSIS.md`

Also provide as context (rules reference):
- `factory/guardrails/PLATFORM-GUARDRAILS.md`

---

## Prompt (give this to the model, nothing else)

```
You are the Story Decomposer for the Spark Mojo build factory.
Read the CRM Client Identity research documents provided. Break this capability into atomic, independently testable stories for the build factory.
ATOMIC means:
* ONE endpoint, OR one React component, OR one n8n workflow, OR one DocType. Never multiple.
* Completable in 3-8 build iterations.
* Independently testable. Tests can run without other stories being complete.
* Self-contained spec. The implementing agent needs only this story's file.
SPLIT rules:
* More than 3 files to create: split it.
* More than 2 API endpoints: split it.
* Both backend AND frontend work: split into two stories.
* Both a DocType change AND an n8n workflow: split it.
CATEGORIES: BACKEND, FRONTEND, INTEGRATION, AI, CONFIG, GLUE
Every story must answer these three Spec Gates:
1. Workflow: What workflow does this story serve?
2. CRM Timeline: What does this story write to the CRM timeline? (N/A is valid)
3. Right Level: Universal, vertical, client, or role level?
Output a STORIES.md file with:
* Story ID (CRM-001, CRM-002, etc.), title, category, size (S or XS only)
* One-sentence description
* Dependencies (IDs or None)
* Spec Gate answers (one line each)
Then output a DEPENDENCY-GRAPH.md showing build order and parallel execution groups.
```

---

## Scoring Rubric

### Category A: Atomicity (0-5)
- 5: All stories are size S or XS, no story has both backend and frontend, no story has more than 2 endpoints
- 4: 1-2 stories are slightly over-scoped but splittable
- 3: Several stories are too large; would cause build failures
- 2: Stories are feature-sized, not work-item-sized
- 1: Monolithic decomposition; not usable

### Category B: Completeness (0-5)
- 5: Every workflow from the research maps to at least one story; every API endpoint in the technical research maps to a story
- 4: 1-2 workflows or endpoints missing
- 3: Noticeable gaps; significant features not represented
- 2: Major sections of the research unaddressed
- 1: Incomplete; more than half of the capability missing

### Category C: Spec Gate Compliance (0-5)
- 5: All three gates answered for every story; answers are substantive, not "N/A" without reason
- 4: All stories have all three gates; 1-2 answers are thin
- 3: Spec gates present but several are placeholder answers
- 2: Spec gates inconsistently applied
- 1: Spec gates absent or ignored

### Category D: Guardrail Awareness (0-5)
- 5: No story proposes React calling Frappe directly; no TypeScript; CRM timeline addressed; no story violates the Frappe/n8n boundary
- 4: One minor guardrail miss but catches itself or is easily fixed
- 3: 1-2 guardrail violations embedded in stories
- 2: Multiple guardrail violations; would cause downstream failures
- 1: Fundamental guardrail violations throughout

### Category E: Dependency Graph Quality (0-5)
- 5: Valid DAG, no circular dependencies, parallel groups identified, critical path clear
- 4: Valid DAG but parallel groups not well identified
- 3: Mostly valid but some ordering issues
- 2: DAG has circular dependencies or logical ordering errors
- 1: No dependency graph or completely wrong

**Maximum score: 25**
**Pass threshold: 18/25**

---

## What Good Looks Like

A passing submission will produce 20-40 atomic stories for CRM Client Identity.
It will separate backend CRUD endpoints (per-operation stories) from frontend components
and glue stories. It will identify the dual-identity vocabulary issue
(Client vs. Patient) and address CRM timeline write-back for every workflow.
The dependency graph will show that backend stories must complete before
frontend or glue stories that depend on them.
