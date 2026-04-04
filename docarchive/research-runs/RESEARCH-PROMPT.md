# Overnight Research Run — Billing Architecture + Medplum Implementation
# Session 19 Recovery Run

## How Ralph Works This File
Re-read this file every iteration. Work through tasks in order.
A task is ONLY complete when its output file EXISTS and is COMMITTED to sparkmojo-internal.
Do not move to the next task until the current task appears in git log.
Do not output LOOP_COMPLETE until every file in the COMPLETION CHECK is confirmed committed.

## Governance Repo
/Users/jamesilsley/GitHub/sparkmojo-internal/

## Platform Repo
/Users/jamesilsley/GitHub/spark-mojo-platform/

## Context — Read Once at Start Before Any Task
1. /Users/jamesilsley/GitHub/sparkmojo-internal/platform/AGENT_CONTEXT.md
2. /Users/jamesilsley/GitHub/sparkmojo-internal/platform/decisions/DECISION-011-stedi-clearinghouse-connector.md
3. /Users/jamesilsley/GitHub/sparkmojo-internal/platform/decisions/DECISION-020-medplum-fhir-clinical-layer.md
4. /Users/jamesilsley/GitHub/sparkmojo-internal/platform/decisions/DECISION-028-medplum-multi-tenancy.md
5. /Users/jamesilsley/GitHub/sparkmojo-internal/platform/decisions/DECISION-026-client-provisioning-architecture.md
6. /Users/jamesilsley/GitHub/sparkmojo-internal/JAMES_PROJECT_PLAN.md
7. /Users/jamesilsley/GitHub/sparkmojo-internal/platform/STORY_TEMPLATE.md
8. /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/PROV-001-provisioning-api.md
   (quality bar — match this specificity in all story specs)

## Key Facts
- Clearinghouse: Stedi (signed, non-negotiable)
- AI platform: AWS Bedrock (BAA, all models, multi-tier wanted)
- Pilot scale: ~3,000 sessions/month (Willow Center, 30 clinicians)
- Launch scale: 100+ practices
- Two billing value props:
  (a) Replacing billing company = cost savings
  (b) Replacing in-house manual billing = staff repurposed, life easier
- Credentialing: previously assumed human-only — challenge this assumption
- Sizing tables: GENERIC tiers only (Solo/Small Group/Medium/Large) — never client-specific
- Medplum: internal Docker only, no public subdomain ever
- Every Medplum API call must include projectId — immutable (DECISION-028)
- Three site_type values: behavioral_health, general_smb, spark_mojo_internal

---

## TASK 1: Billing Workflow Research
Output: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/research/billing/BILLING-WORKFLOW-RESEARCH.md
Do not mark done until file is substantive (minimum 500 lines) and committed.

Create directory first:
  mkdir -p /Users/jamesilsley/GitHub/sparkmojo-internal/platform/research/billing/

Research using web search. Cover all of the following thoroughly:

- Complete billing lifecycle: every step from session end to payment received,
  responsible party at each step, typical timeframes
- EDI transaction types: 837P (claim), 277 (acknowledgment), 835 (ERA/remittance),
  270/271 (eligibility), 276/277 (claim status) — what each does, when triggered
- Most common denial reasons in behavioral health, national average denial rate
- Days-to-payment: in-network vs out-of-network typical ranges
- ERA vs paper EOB: what percentage of payers still send paper EOBs
- Two value prop stories mapped separately:
  (a) Replacing billing company: what the practice gains, what changes, what stays
  (b) Replacing in-house manual billing: staff hours recaptured per week,
      financial value of repurposed staff time, morale/quality of life improvement
- Credentialing deep dive:
  What is credentialing, what data is involved, typical timeline
  CAQH: role in behavioral health credentialing, API capabilities, what it automates
  Stedi credentialing capabilities if any
  Other platforms: Medallion, Modio Health, Symplr, Council of Insurance Agents
  What is genuinely automatable vs requires human action today
  Business case for Spark Mojo offering credentialing automation as a feature
- Stedi API surface (use https://www.stedi.com/docs):
  837P submission: exact request schema, required fields, response schema
  835 ERA webhook delivery model
  270/271 eligibility: real-time vs batch, request/response shape
  276/277 claim status API
  Pricing at 3,000 claims/month and 100,000 claims/month
  Payer coverage: total count, behavioral health payer confirmation
  (BCBS, Aetna, Cigna, United, Magellan, Carelon/Beacon, Optum)
  Sandbox/test environment availability
  Error codes and rejection handling patterns
- Payment processing:
  Current payment methods used in behavioral health practices
  Credit card processing fee benchmarks for therapy practices (% + per-transaction)
  ACH processing cost vs credit card — annual savings at 3,000 sessions/month
  Processors with BAAs: Stripe, Helcim, Ivy Pay, PaySimple, others
  Ivy Pay: behavioral-health-specific analysis — worth integrating?
  Case for integrated payment processing vs Stripe referral
  ACH migration playbook: patient communication required, typical conversion rates
- Generic practice sizing model (THIS IS THE PROSPECT REFERENCE TABLE):
  Four tiers: Solo (1-2 providers), Small Group (3-10), Medium (11-25), Large (25+)
  For each tier:
    Typical claims/month range
    Typical monthly collections range
    Billing company cost at 6% and at 8%
    Spark Mojo Starter/Growth/Autopilot tier fit
    Annual savings vs billing company
    Annual savings from ACH migration vs credit card
    Total combined savings potential
    Staff hours/week repurposed if currently doing in-house billing

Commit:
  cd /Users/jamesilsley/GitHub/sparkmojo-internal
  git add platform/research/billing/BILLING-WORKFLOW-RESEARCH.md
  git commit -m "research: billing workflow, Stedi API, credentialing, payment processing, sizing model"
  git push origin main

---

## TASK 2: Billing AI Tier Research
Output: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/research/billing/BILLING-AI-TIER-RESEARCH.md
Do not start until TASK 1 is committed. Minimum 300 lines.

Research:
- AWS Bedrock model catalog (current): all models with input/output token cost,
  context window, speed (tokens/sec), best use case
  Include: Claude family, Titan, Llama, Mistral, Cohere, Nova, any others
  Price per 1M tokens: cheapest available, mid-tier, Claude Sonnet, Claude Opus
- Full billing AI use case map. For each use case define:
  What the AI does (classify/extract/generate/validate/predict)
  Input data, output format, volume at 3,000 sessions/month
  Latency requirement (real-time under 2s vs async minutes-ok)
  Error cost (what happens if AI is wrong here)
  Recommended Bedrock model and why
  Evaluate all of these:
    Pre-session eligibility risk prediction
    ICD-10 diagnosis code validation against payer rules
    CPT procedure code selection assistance
    Claim completeness check before submission
    Modifier validation (25, 59, GT, 95, etc.)
    Denial reason classification (parse 835 codes to plain English + category)
    Denial root cause pattern detection across claim history
    Denial appeal letter generation (full letter)
    Prior authorization requirement detection
    Prior authorization letter generation
    Patient responsibility estimation
    Payment posting anomaly detection
    Underpayment detection (paid vs contracted rate)
    Credentialing document extraction and validation
- Full cost model at four scales (Solo/Small Group/Medium/Large from TASK 1):
  Total AI cost per month across all tiers
  AI cost per claim
  AI cost as % of billing savings delivered
  ROI vs human biller cost
- Example outputs:
  Full system prompt for denial appeal letter generation (Claude on Bedrock)
  JSON schema for denial classification output
  JSON schema for claim completeness check output

Commit:
  cd /Users/jamesilsley/GitHub/sparkmojo-internal
  git add platform/research/billing/BILLING-AI-TIER-RESEARCH.md
  git commit -m "research: billing AI tier model, Bedrock cost projections, prompt examples"
  git push origin main

---

## TASK 3: Billing Architecture Design
Output: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/research/billing/BILLING-ARCHITECTURE-DESIGN.md
Do not start until TASK 2 is committed. Minimum 400 lines.

Read DECISION-011, DECISION-020, DECISION-003, AGENT_CONTEXT before writing.

Required sections:

### System Context
ASCII diagram showing all components and data flows:
Medplum (clinical source) -> Frappe (billing DocTypes, AR) -> Abstraction Layer (FastAPI)
-> n8n (async workflows) -> Stedi (clearinghouse) -> Payers
+ Bedrock AI tier + Patient payment processor

### Frappe DocType Design
Every DocType needed for billing. For each: name (SM prefix), purpose,
all fields with fieldtype and constraints, relationships to other DocTypes,
which app it lives in (sm_billing).
Must include at minimum:
  SM Claim, SM Claim Line, SM ERA, SM ERA Line, SM Denial, SM Appeal,
  SM Eligibility Check, SM Payment, SM Payer, SM Provider

### Abstraction Layer API Design
Every billing endpoint. For each: HTTP method + path, request schema,
response schema, backend systems touched, sync vs async.
Must include at minimum:
  POST /api/modules/billing/claims/submit
  GET /api/modules/billing/claims/{claim_id}/status
  POST /api/modules/billing/eligibility/check
  GET /api/modules/billing/era/{era_id}
  POST /api/modules/billing/appeals/generate
  GET /api/modules/billing/ar/summary
  POST /api/modules/billing/payments/record

### n8n Workflow Design
Every n8n workflow in the billing module. For each:
  Name, trigger (webhook/schedule/Frappe event), steps,
  error handling, which AI tier is invoked and where

### Stedi Integration Map
For each Stedi API call: when called, what goes in, what comes out,
how response is stored in Frappe DocTypes

### AI Integration Points
Map each AI use case from TASK 2 to its exact location in the architecture.
Which endpoint or n8n workflow invokes it? What Bedrock model? Prompt structure?

### Credentialing Module Design
Based on TASK 1 research: what is automatable in Phase 1,
what DocTypes needed, what API endpoints, what external integrations (CAQH etc.)
Phase 1 scope vs deferred.

### Payment Processing Recommendation
One clear recommendation with annual savings number using generic sizing tiers.
What DocTypes and endpoints required.

### sm_billing App Structure
File and folder structure for the fourth SM custom app.
This sits alongside sm_widgets, sm_connectors, sm_provisioning.

Commit:
  cd /Users/jamesilsley/GitHub/sparkmojo-internal
  git add platform/research/billing/BILLING-ARCHITECTURE-DESIGN.md
  git commit -m "research: billing architecture design — DocTypes, API, n8n, Stedi map, sm_billing"
  git push origin main

---

## TASK 4: DECISION-027 Draft
Output: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/decisions/DECISION-027-billing-architecture.md
Do not start until TASK 3 is committed.
Read DECISION-026 as the format reference before writing.
Status: PROPOSED (James ratifies in next Claude Chat session).

Must lock:
  sm_billing as the fourth SM custom app
  The full DocType set (names and key fields)
  Stedi integration pattern (which transactions, webhook model)
  Multi-tier AI model (which Bedrock models, which use cases, cost basis)
  Payment processing stack recommendation
  Credentialing: what is automated Phase 1 vs deferred
  Abstraction layer API surface for billing
  n8n workflow pattern for async claim lifecycle
  Build sequence: which stories must come first

End with section titled "Questions for James" — maximum 3 questions.
These are the only items that cannot be resolved by research alone.

Commit:
  cd /Users/jamesilsley/GitHub/sparkmojo-internal
  git add platform/decisions/DECISION-027-billing-architecture.md
  git commit -m "decision: DECISION-027 billing architecture (PROPOSED)"
  git push origin main

---

## TASK 5: BILL-001 Story Spec
Output: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/BILL-001-sm-billing-app-scaffold.md
Do not start until TASK 4 is committed.
Follow STORY_TEMPLATE.md format exactly. Match PROV-001 specificity.

Story: Create sm_billing Frappe app scaffold.
  Create frappe-apps/sm_billing/ directory structure in spark-mojo-platform
  hooks.py, setup.py, __init__.py with correct app registration
  No DocTypes yet — just the correctly registered app shell
  Acceptance: bench install-app sm_billing succeeds on dev site with zero errors

Commit:
  cd /Users/jamesilsley/GitHub/sparkmojo-internal
  git add platform/feature-library/stories/BILL-001-sm-billing-app-scaffold.md
  git commit -m "story: BILL-001 sm_billing app scaffold"
  git push origin main

---

## TASK 6: BILL-002 Story Spec
Output: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/BILL-002-core-billing-doctypes.md
Do not start until TASK 5 is committed.
Follow STORY_TEMPLATE.md format exactly. Match PROV-001 specificity.

Story: Create all billing DocTypes from TASK 3 architecture design.
  All fields with correct fieldtype and constraints
  All relationships between DocTypes correctly defined
  bench migrate runs clean with zero errors
  No API endpoints in this story
  Acceptance: all DocTypes exist, bench migrate exits 0, fields verified in Frappe console

Commit:
  cd /Users/jamesilsley/GitHub/sparkmojo-internal
  git add platform/feature-library/stories/BILL-002-core-billing-doctypes.md
  git commit -m "story: BILL-002 core billing DocTypes"
  git push origin main

---

## TASK 7: BILL-003 Story Spec
Output: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/BILL-003-stedi-claim-submission.md
Do not start until TASK 6 is committed.
Follow STORY_TEMPLATE.md format exactly. Match PROV-001 specificity.

Story: Stedi claim submission endpoint.
  POST /api/modules/billing/claims/submit
  837P claim construction from SM Claim DocType fields
  Stedi API call with full error handling and retry logic
  SM Claim status field updated on submission (submitted/rejected/accepted)
  Webhook receiver for 277 claim acknowledgment
  STEDI_SANDBOX=true env var enables sandbox mode
  Acceptance: test claim submits to Stedi sandbox, 277 webhook received and parsed,
    SM Claim status updated correctly

Commit:
  cd /Users/jamesilsley/GitHub/sparkmojo-internal
  git add platform/feature-library/stories/BILL-003-stedi-claim-submission.md
  git commit -m "story: BILL-003 Stedi claim submission"
  git push origin main

---

## TASK 8: BILL-004 Story Spec
Output: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/BILL-004-era-835-processing.md
Do not start until TASK 7 is committed.
Follow STORY_TEMPLATE.md format exactly. Match PROV-001 specificity.

Story: 835 ERA processing.
  Stedi webhook receiver for 835 ERA delivery
  Parse ERA into SM ERA record and SM ERA Line records
  Auto-post matched payments to SM Payment records
  Flag unmatched ERA lines for manual review (create SM Task)
  Denial detection: create SM Denial record for each denied ERA line
  Acceptance: test ERA webhook received, SM ERA + Lines created, matched payments
    auto-posted, unmatched lines create SM Tasks, denied lines create SM Denials

Commit:
  cd /Users/jamesilsley/GitHub/sparkmojo-internal
  git add platform/feature-library/stories/BILL-004-era-835-processing.md
  git commit -m "story: BILL-004 835 ERA processing"
  git push origin main

---

## TASK 9: Medplum Infrastructure Design
Output: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/research/medplum-implementation/MEDPLUM-INFRA-DESIGN.md
Do not start until TASK 8 is committed. Minimum 300 lines.

Create directory first:
  mkdir -p /Users/jamesilsley/GitHub/sparkmojo-internal/platform/research/medplum-implementation/

Read before researching:
  /Users/jamesilsley/GitHub/spark-mojo-platform/docker-compose.poc.yml (read actual file)
  /Users/jamesilsley/GitHub/sparkmojo-internal/platform/decisions/DECISION-021-frappe-container-image-strategy.md
  /Users/jamesilsley/GitHub/sparkmojo-internal/platform/decisions/DECISION-025-single-provider-hipaa-by-default.md

Research using web search:

- Complete Docker Compose service definition for Medplum:
  medplum-server, medplum-postgres (PostgreSQL 16), medplum-redis (Redis 7)
  How it integrates with existing docker-compose.poc.yml
  (shared Docker network? separate compose file? same file?)
  Port mapping: Medplum on :8103 internally — never exposed externally
  Volume definitions for PostgreSQL data and Medplum binary/file storage
  All environment variables required
  Health check definitions for each service
  Memory requirements: total RAM for all three Medplum services,
    and whether current VPS size is sufficient alongside existing stack

- medplum.config.json:
  Every required field with explanation
  HIPAA-relevant config: audit logging, encryption settings
  Project isolation configuration
  Binary/file storage: DO Spaces S3-compatible config
  The exact 2-line S3Storage fork fix for DO Spaces compatibility
    (known issue from prior Medplum research — find the exact fix)
  SMTP config for magic link auth and notifications
  Base URL config for headless self-hosted mode

- Medplum first-run initialization:
  How to create the first super-admin account programmatically
  How to create a Project via Medplum REST API
    (exact shape of POST /admin/projects request and response)
  How to create a ClientApplication for the abstraction layer service account
  OAuth2 client credentials flow for service-to-service authentication
  What tokens are returned, how to refresh them

- medplum_connector.py design for the abstraction layer:
  Module location: abstraction-layer/connectors/medplum_connector.py
  MedplumClient class: initialization, OAuth2 client credentials auth, token refresh
  Core methods: get_resource, create_resource, update_resource, search_resources
  Every method requires project_id as a mandatory parameter
  MedplumProjectScopeError raised if project_id is missing or None
  No method may call Medplum without a scoped project_id — this is HIPAA enforcement
  Error handling: Medplum API errors mapped to abstraction layer error types

- FHIR resource map for behavioral health clinical workflows:
  For each workflow list: FHIR resources involved, key fields, required fields,
  relationship to Frappe DocTypes
  Cover:
    Patient intake: Patient, RelatedPerson, Coverage, Organization (payer)
    Scheduling: Schedule, Slot, Appointment
    Clinical documentation: Encounter, DocumentReference
      Note format mapping: DAP/SOAP/BIRP note structure -> DocumentReference content
    Assessment tools: Questionnaire, QuestionnaireResponse
      PHQ-9, GAD-7, PCL-5 structure
    Diagnosis: Condition (ICD-10 codes)
    Billing bridge: Claim, ClaimResponse, Coverage, ExplanationOfBenefit

Commit:
  cd /Users/jamesilsley/GitHub/sparkmojo-internal
  git add platform/research/medplum-implementation/MEDPLUM-INFRA-DESIGN.md
  git commit -m "research: Medplum infrastructure design — Docker, config, connector, FHIR resource map"
  git push origin main

---

## TASK 10: STORY-014 Spec
Output: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/STORY-014-medplum-docker-service.md
Do not start until TASK 9 is committed.
Follow STORY_TEMPLATE.md format exactly. Match PROV-001 specificity.

Story: Add Medplum Docker services to docker-compose.poc.yml.
  Add medplum-server, medplum-postgres, medplum-redis services
  medplum.config.json written to repo at correct path
  DO Spaces S3 storage fork applied (2-line fix from TASK 9 research)
  All services on internal Docker network only — no external port exposure
  Medplum server accessible at http://medplum:8103 from other containers
  IMPORTANT: Do NOT deploy to production VPS in this story — dev environment only
  IMPORTANT: No public subdomain for Medplum — internal only, always
  Acceptance: curl http://localhost:8103/healthcheck from inside Docker network returns 200

Commit:
  cd /Users/jamesilsley/GitHub/sparkmojo-internal
  git add platform/feature-library/stories/STORY-014-medplum-docker-service.md
  git commit -m "story: STORY-014 Medplum Docker service"
  git push origin main

---

## TASK 11: STORY-015 Spec
Output: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/STORY-015-medplum-abstraction-layer-connector.md
Do not start until TASK 10 is committed.
Follow STORY_TEMPLATE.md format exactly. Match PROV-001 specificity.

Story: Create abstraction-layer/connectors/medplum_connector.py.
  MedplumClient class with OAuth2 client credentials auth and token refresh
  get_resource, create_resource, update_resource, search_resources methods
  Every method has project_id as a required parameter — no default, no None
  MedplumProjectScopeError raised if project_id is missing
  Unit tests for each method using mocked Medplum HTTP responses
  Acceptance: all unit tests pass, python3 -m pytest exits 0,
    import MedplumClient succeeds, MedplumProjectScopeError raised on missing project_id

Commit:
  cd /Users/jamesilsley/GitHub/sparkmojo-internal
  git add platform/feature-library/stories/STORY-015-medplum-abstraction-layer-connector.md
  git commit -m "story: STORY-015 Medplum abstraction layer connector"
  git push origin main

---

## TASK 12: STORY-016 Spec
Output: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/STORY-016-medplum-project-provisioning.md
Do not start until TASK 11 is committed.
Follow STORY_TEMPLATE.md format exactly. Match PROV-001 specificity.

Story: Replace Medplum stub in PROV-001 provisioning API with real Medplum call.
  Update Step 8 in abstraction-layer/routes/provisioning.py
  When MEDPLUM_BASE_URL is set, call POST /admin/projects on real Medplum instance
  Capture returned project.id and store in SM Site Registry as medplum_project_id
  Non-stub project_id must not have the 'stub-' prefix
  Depends on STORY-014 (Medplum running) and STORY-015 (connector exists)
  Acceptance: provisioning API with MEDPLUM_BASE_URL set creates a real Medplum Project,
    GET /api/admin/sites/{site} returns medplum_project_id without 'stub-' prefix

Commit:
  cd /Users/jamesilsley/GitHub/sparkmojo-internal
  git add platform/feature-library/stories/STORY-016-medplum-project-provisioning.md
  git commit -m "story: STORY-016 Medplum project provisioning integration"
  git push origin main

---

## TASK 13: Billing Synthesis
Output: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/research/billing/BILLING-SYNTHESIS.md
Do not start until TASK 12 is committed.
Read all billing research outputs (TASKS 1-4) before writing.
This is the first document James reads. Direct, no fluff, no jargon.

Required sections:

### What You Need to Know (5 bullets max)
Most important findings. What changed from prior assumptions.

### The Billing Workflow (Plain English)
Session ends to money in bank. One page max.
Two columns: (a) replacing billing company story, (b) replacing in-house billing story.

### Practice Sizing Reference — The Prospect Table
THIS IS THE KEY SECTION. James uses this in every sales conversation.
Generic four-tier table: Solo / Small Group / Medium / Large
Columns: claims/month range, monthly collections range, billing company cost,
Spark Mojo tier fit, annual savings vs billing company, ACH migration upside,
total combined savings potential, staff hours/week repurposed
Note at bottom: This table is a reference tool. Not specific to any client.

### The AI Tier Model
Simple table: Tier name | Bedrock model | Use cases | Cost per claim
Total monthly AI cost at Small Group scale and Large scale.

### Payment Processing Recommendation
One recommendation. Annual savings by practice tier.
What is required to migrate a practice to ACH.

### Credentialing: What Is Actually Automatable
Honest answer. What percentage of credentialing work is automatable today.
Business case for Spark Mojo building this. Phase 1 scope recommendation.

### What DECISION-027 Locks
Items that are clear from research and ready to lock in the next Claude Chat session.

### Questions for James (3 max)
Only items that cannot be resolved by research.
These are the only inputs needed to ratify DECISION-027.

### Stories Ready for Ralph
BILL-001 through BILL-004 in dependency order.
What must be true before each story can run.

Commit:
  cd /Users/jamesilsley/GitHub/sparkmojo-internal
  git add platform/research/billing/BILLING-SYNTHESIS.md
  git commit -m "research: billing synthesis — executive summary"
  git push origin main

---

## TASK 14: Medplum Implementation Synthesis
Output: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/research/medplum-implementation/MEDPLUM-IMPL-SYNTHESIS.md
Do not start until TASK 13 is committed.
Read TASK 9 output (MEDPLUM-INFRA-DESIGN.md) before writing.
This is the first document James reads on Medplum. Direct, no fluff.

Required sections:

### What You Need to Know (5 bullets)
Most important findings. What is simpler or harder than expected.

### Docker Integration (Plain English)
How Medplum fits into the existing Docker stack.
What changes in docker-compose.poc.yml. RAM impact. Any risks identified.

### The Abstraction Layer Connector
How medplum_connector.py works in plain terms.
The project_id enforcement rule explained clearly.
Why this design is correct for HIPAA compliance.

### FHIR Resource Map Summary
Table: Clinical workflow | FHIR resources | Key fields | Frappe relationship
This is the reference for every future clinical story.

### Stories Ready for Ralph
STORY-014, STORY-015, STORY-016 in dependency order.
Time estimate for each (S/M/L). What must be true before each runs.

### Blockers Before STORY-014 Can Run
Only hard blockers. Flag: D2 droplet upgrade status, DO BAA status (J-003),
and anything new found during research.

Commit:
  cd /Users/jamesilsley/GitHub/sparkmojo-internal
  git add platform/research/medplum-implementation/MEDPLUM-IMPL-SYNTHESIS.md
  git commit -m "research: Medplum implementation synthesis"
  git push origin main

---

## TASK 15: Billing Executive Summary PPT
Output: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/research/billing/BILLING-EXEC-SUMMARY.pptx
Do not start until TASK 13 is committed.

Read the pptx skill BEFORE writing anything:
  /mnt/skills/public/pptx/SKILL.md

Read before writing:
  /Users/jamesilsley/GitHub/sparkmojo-internal/platform/research/billing/BILLING-SYNTHESIS.md
  /Users/jamesilsley/GitHub/sparkmojo-internal/platform/research/billing/BILLING-ARCHITECTURE-DESIGN.md
  /Users/jamesilsley/GitHub/sparkmojo-internal/platform/research/billing/BILLING-AI-TIER-RESEARCH.md

Visual standard: match SparkMojo_Research_Review.pptx exactly.
Teal/navy palette. Dark section divider slides. White content slides.
Footer on every content slide: SPARK MOJO INTERNAL | BILLING ARCHITECTURE RESEARCH | APRIL 2026
Slide number on every content slide.

Slide structure:
  Slide 1 — Title (dark background)
    "INTERNAL REVIEW DECK / Spark Mojo Platform / Billing Architecture Research"
    Subtitle: "DECISION-027 Research Run | April 2026 | Prepared for: James Ilsley"

  Slide 2 — What Was Researched
    Two-column: research areas covered / output counts
    (documents produced, story specs, decision drafted, models evaluated)

  Slide 3 — Key Numbers at a Glance
    Large stat callout cards:
    Annual savings potential for Large practice vs billing company
    AI cost per claim (Tier 1 model)
    Billing steps automated (X of 13)
    Story specs ready for Ralph

  Slide 4 — Section divider (dark): "The Billing Workflow"

  Slide 5 — The 13 Steps: Before and After
    Table: Step | Automation rating | How it works
    All 13 steps. Generic — not client-specific.

  Slide 6 — Practice Sizing Reference (THE KEY SLIDE)
    The generic prospect table from BILLING-SYNTHESIS.md
    Four tiers: Solo / Small Group / Medium / Large
    Note: "Reference tool for prospect conversations — not client-specific"
    This slide must be clean enough to screenshot and reference in a sales call

  Slide 7 — Section divider (dark): "AI Tier Model"

  Slide 8 — Multi-Tier AI Model
    Table: Tier | Bedrock model | Use cases | Cost per claim
    Footer stat: total AI cost at Large practice scale vs billing company equivalent

  Slide 9 — Section divider (dark): "Credentialing & Payments"

  Slide 10 — Credentialing: Automatable vs Human
    Two-column table
    Bottom: one-sentence business case for building credentialing automation

  Slide 11 — Payment Processing Recommendation
    Large stat: annual savings from ACH migration at Medium practice scale
    One clear recommendation with rationale

  Slide 12 — Section divider (dark): "Decisions & Open Questions"

  Slide 13 — What DECISION-027 Locks
    Table: Decision item | Status | Notes

  Slide 14 — Questions for James
    Max 3 questions. Each: question (bold) + why it matters (one line)

  Slide 15 — Stories Ready for Ralph
    Table: Story ID | Description | Depends on | Size
    BILL-001 through BILL-004

  Slide 16 — Next Steps (dark background)
    Three bullets: tonight / next Claude Chat session / next Ralph run

QA REQUIREMENTS (mandatory — do not skip):
  Follow the full QA process from SKILL.md
  Convert slides to images using the commands in SKILL.md
  Use a subagent for visual inspection with the exact prompt from SKILL.md
  Fix all issues found
  Re-verify until a full pass finds no new issues
  Do not declare success without at least one complete fix-and-verify cycle

Commit:
  cd /Users/jamesilsley/GitHub/sparkmojo-internal
  git add platform/research/billing/BILLING-EXEC-SUMMARY.pptx
  git commit -m "docs: billing research executive summary PPT"
  git push origin main

---

## TASK 16: Medplum Executive Summary PPT
Output: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/research/medplum-implementation/MEDPLUM-IMPL-EXEC-SUMMARY.pptx
Do not start until TASK 14 is committed.

Read the pptx skill BEFORE writing anything:
  /mnt/skills/public/pptx/SKILL.md

Read before writing:
  /Users/jamesilsley/GitHub/sparkmojo-internal/platform/research/medplum-implementation/MEDPLUM-IMPL-SYNTHESIS.md
  /Users/jamesilsley/GitHub/sparkmojo-internal/platform/research/medplum-implementation/MEDPLUM-INFRA-DESIGN.md

Same visual standard as billing PPT.

Slide structure:
  Slide 1 — Title (dark)
    "INTERNAL REVIEW DECK / Spark Mojo Platform / Medplum Implementation Design"
    Subtitle: "STORY-014/015/016 Design Run | April 2026 | Prepared for: James Ilsley"

  Slide 2 — What Was Designed
    What this run produced. Output counts. What is now ready to build.

  Slide 3 — Key Numbers
    Large stat cards: RAM required for Medplum stack, services added to Docker,
    story specs ready, estimated Ralph nights to complete all three stories

  Slide 4 — Section divider (dark): "Infrastructure"

  Slide 5 — Docker Stack: Before and After
    Two-column. Left: current services. Right: with Medplum added.
    Highlight what is new. Clearly note: Medplum is internal-only, never public.

  Slide 6 — Medplum Configuration Highlights
    Key config decisions: storage, auth, Project isolation, HIPAA settings.
    What James needs to confirm before STORY-014 runs.

  Slide 7 — Section divider (dark): "Integration Architecture"

  Slide 8 — Abstraction Layer Connector
    Simple diagram: React -> Abstraction Layer -> medplum_connector.py -> Medplum Server
    Highlight: projectId enforcement. Why it matters for HIPAA in plain terms.

  Slide 9 — FHIR Resource Map
    Table: Clinical workflow | FHIR resources | Frappe relationship
    Reference slide for every future clinical story.

  Slide 10 — Section divider (dark): "Stories & Next Steps"

  Slide 11 — Stories Ready for Ralph
    Table: Story ID | Description | Depends on | Size | Status
    STORY-014, STORY-015, STORY-016

  Slide 12 — Blockers and Prerequisites
    What must be true before STORY-014 can run.
    James action items with estimated time each.

  Slide 13 — Next Steps (dark)
    Three bullets: tonight / next Claude Chat session / next Ralph run

Same QA requirements as TASK 15. Do not skip.

Commit:
  cd /Users/jamesilsley/GitHub/sparkmojo-internal
  git add platform/research/medplum-implementation/MEDPLUM-IMPL-EXEC-SUMMARY.pptx
  git commit -m "docs: Medplum implementation executive summary PPT"
  git push origin main

---

## COMPLETION CHECK
Before outputting LOOP_COMPLETE, run this verification:

  cd /Users/jamesilsley/GitHub/sparkmojo-internal
  git log --oneline -25

Confirm ALL of the following files appear in git log as committed:

  platform/research/billing/BILLING-WORKFLOW-RESEARCH.md
  platform/research/billing/BILLING-AI-TIER-RESEARCH.md
  platform/research/billing/BILLING-ARCHITECTURE-DESIGN.md
  platform/research/billing/BILLING-SYNTHESIS.md
  platform/research/billing/BILLING-EXEC-SUMMARY.pptx
  platform/decisions/DECISION-027-billing-architecture.md
  platform/feature-library/stories/BILL-001-sm-billing-app-scaffold.md
  platform/feature-library/stories/BILL-002-core-billing-doctypes.md
  platform/feature-library/stories/BILL-003-stedi-claim-submission.md
  platform/feature-library/stories/BILL-004-era-835-processing.md
  platform/research/medplum-implementation/MEDPLUM-INFRA-DESIGN.md
  platform/research/medplum-implementation/MEDPLUM-IMPL-SYNTHESIS.md
  platform/research/medplum-implementation/MEDPLUM-IMPL-EXEC-SUMMARY.pptx
  platform/feature-library/stories/STORY-014-medplum-docker-service.md
  platform/feature-library/stories/STORY-015-medplum-abstraction-layer-connector.md
  platform/feature-library/stories/STORY-016-medplum-project-provisioning.md

If any file is missing from git log, go back and complete that task.
Only output LOOP_COMPLETE when all 16 files are confirmed committed.
