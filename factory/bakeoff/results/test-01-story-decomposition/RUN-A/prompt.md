Prompt
test: 01-story-decomposition
run: A
date: 2026-04-09

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
```markdown
# Spark Mojo — Platform Guardrails

**Every agent reads this file. Every spec factory hat loads this file first.**
This document contains the platform's identity, immutable rules, locked decisions, and open questions.
It takes precedence over all research documents, feature specs, and story files.
If this document conflicts with any other document, this document wins.

---

## Section 1: The Three Legs of the Platform

Everything Spark Mojo builds rests on three legs. If a capability cannot answer
to all three, it is not ready to be built.

### Leg 1: Everything is a workflow.

**Everything is a workflow. Workflows generate tasks. Tasks are done by a human or a computer.**

This is not a metaphor. It is the literal architecture of every capability on this platform.

Billing is a workflow. The 19-state claim lifecycle IS the workflow. The clearinghouse is the
tool that enables one of those tasks. Scheduling is a workflow. Clinical documentation is a
workflow. Voicemail triage is a workflow. Onboarding a new client is a workflow. Even
provisioning a new tenant is a workflow.

**When designing any capability, answer these three questions in order:**

1. **What is the work to be done?** Define the workflow: the stages, the valid transitions
   between stages, and the divergences that can occur. This is always the first question.
   Not "what database schema do we need" or "which API do we call." What is the work,
   and what are its steps?

2. **What do we need to enable each step?** For each task in the workflow, determine the
   tool, integration, API, or service required to execute it. The clearinghouse enables the
   "submit claim" task. The EHR API enables the "fetch clinical note" task. The SMS service
   enables the "send reminder" task. These are spokes. The workflow is the hub.

3. **How do we store and surface the output?** Reporting, analytics, and storage exist to
   inform future workflow decisions. The denial rate report informs the billing workflow.
   The no-show rate informs the scheduling workflow. Data is not an end - it is feedback
   into the next workflow cycle.

A capability that skips question 1 and starts at question 2 is being built backwards.

**Workflow Configurator is a core early Mojo, not a deferred feature.** It is how every
business, regardless of vertical, defines and manages their work. It is the product.

### Leg 2: Everything about a customer lives in the CRM.

**The CRM is the complete lifelong record of every interaction between the business and
every person it has a relationship with. From first contact to last. Every channel.
Every system. Every event.**

First inquiry email - logged to CRM. Phone call from front desk - logged to CRM.
Appointment booked - logged to CRM. Insurance card uploaded - logged to CRM.
Session completed - logged to CRM. Claim submitted - logged to CRM.
Payment received - logged to CRM. Document signed - logged to CRM.
Text reminder sent - logged to CRM. No-show - logged to CRM.
Discharge - logged to CRM.

Every capability that touches a customer record has a **mandatory contract** to write
that event to the CRM activity timeline. This is not optional. This is not phased.
This is not a nice-to-have. The unified activity timeline is not a feature.
It is the definition of what CRM means on this platform.

### Leg 3: Universal first, vertical second, client third, role fourth.

**Build everything to work for any business. Configure for a vertical. Customize for a
client. Permission for a role.**

If you are about to build something vertical-specific, ask first whether it can be achieved
through configuration of a universal capability. If you are about to build something
client-specific, ask whether it should be a vertical configuration instead.

**The dental scheduling example:** An agent seeing "make appointments for a dentist" should
not build a new dental scheduling app. The correct answer is to find the universal Scheduling
Mojo and build a configuration layer for the dental vertical on top of it. Building a new
app for every new noun is the failure mode this leg prevents.

Every capability that ships must register its configurable options in the Configuration Mojo.
Configuration is enacted by Spark Mojo staff based on the client onboarding questionnaire.
Clients do not configure their own instances except for user management and role assignment.

---

## Section 2: Mandatory Spec Gates

Every capability spec must explicitly answer these three questions before it can be
commissioned for build. A spec that cannot answer all three does not pass Step 5 of
the Feature Development Lifecycle.

**Gate 1 - Workflow:** What is the workflow? If there is no workflow, explain why not.
No explanation = no commission.

**Gate 2 - CRM Timeline:** What does this capability write to the CRM timeline? If it
writes nothing, explain why not. No explanation = no commission.

**Gate 3 - Right Level:** Is this being built at the right level of specificity? Could
this be universal instead of vertical-specific? Could this be configuration instead of
code? Before building any new capability, confirm no existing capability can serve this
need through configuration. New capabilities require James approval.

---

## Section 3: Platform Identity (What Spark Mojo Is and Is Not)

- Spark Mojo IS a universal business OS for SMBs. Staff act once; every downstream system
  updates automatically. Staff are never the human API between systems.
- Spark Mojo IS the workflow engine. The clearinghouse, EHR, SMS provider, and analytics
  layer are spokes that support workflows. They are not the product.
- Spark Mojo CAN be the EHR. Behavioral health is the first vertical, not the platform's
  identity. The platform is not defined by or limited to consuming third-party EHRs.
  Medplum is a headless EHR - it is up to Spark Mojo to give it a head.
- Spark Mojo's preferred path for any client is Spark Mojo AS the system of record.
  Third-party system connectors are a concession to client reality, not the architectural
  target. The connector/ingestion capability and the migration capability are the same
  workflow running at different frequencies.
- Spark Mojo IS NOT defined by behavioral health. That is the first vertical.
- Spark Mojo IS NOT a feature factory. Every capability must answer the three workflow
  questions before a story is written.
- The Data Ingestion and Migration engine must support file-based ingestion (CSV, XLS,
  database exports) as a first-class method alongside API polling. Third-party systems
  frequently have no outgoing API by design. File-based ingestion is not a fallback.
  It is a primary path.

---

## Section 4: Architecture Immutables

These rules are locked. No research, spec, or story may contradict them.
If a spec requires violating one of these rules, stop and write a BLOCKED-[TOPIC].md file.

1. React NEVER calls Frappe directly. All React calls go through
   `/api/modules/[capability]/[action]` on the Mojo Abstraction Layer.
2. Never modify core Frappe/ERPNext. All custom logic lives in SM custom apps
   (sm_widgets, sm_connectors, sm_billing).
3. SM DocTypes are prefixed `SM`. No exceptions.
4. No TypeScript. All frontend files are `.jsx`.
5. No hardcoded hex colors. Use `var(--sm-*)` semantic tokens only.
6. n8n handles ALL cross-system operations. n8n is never in the hot path of UI requests.
7. **Frappe Workflow / transition_state() manages internal document state.
   n8n manages cross-system actions triggered by state changes.
   The workflow engine NEVER calls external systems.
   n8n NEVER modifies document state.
   This boundary is the most locked rule in the platform. No exceptions.**
8. Architecture decisions in `platform/decisions/` are locked. Do not re-litigate.
9. If two documents conflict, stop and write BLOCKED-[TOPIC].md. Never resolve unilaterally.
10. Archive, don't delete. Stale docs go to `platform/archive/`.
11. If you add a document, add it to `platform/README.md`.
12. **Evaluation order for all backend capabilities, business logic, and system
    integrations:** (1) Native Frappe/ERPNext functionality, (2) Open-source Frappe
    community app, (3) Third-party integration, (4) Custom build. Each research
    document must explicitly address all four levels. Skipping a level requires
    documented justification. This is equivalent in weight to the MAL rule.
    SCOPE LIMIT: This rule applies to backend capabilities only. Frappe's frontend
    layer (Desk UI, Frappe Builder, portal pages, Whitelabel app) is NEVER evaluated
    as a candidate for any client-facing surface. Spark Mojo owns the React frontend
    and the abstraction layer. No Frappe frontend component is a valid client-facing
    solution under any circumstances.
    Scope clarification (RC-030): This evaluation order applies to backend capabilities,
    business logic, and system integrations only. The Frappe frontend layer is never
    evaluated as a client-facing candidate under any circumstances. React/MAL is the
    only client-facing frontend.
13. Admin API credentials are NEVER stored or displayed in any Mojo. Only vault reference
    strings (e.g., `vault:willow/stedi`) are managed. Never actual secrets.

---

## Section 5: Technology Stack (Locked Choices)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Backend | Frappe / ERPNext | Custom apps only, never modify core |
| Abstraction Layer | FastAPI (Mojo Abstraction Layer) | Single routing point for all React calls |
| Frontend | React JSX | No TypeScript, no .tsx files |
| Clinical Data | Medplum (self-hosted, internal Docker only) | No public subdomain, headless only |
| Cross-system Automation | n8n (self-hosted, automation.sparkmojo.com) | All external integrations go here |
| HIPAA AI | AWS Bedrock | BAA covers all models, pay-per-token |
| Clearinghouse | Stedi | All clients switch to Stedi on onboarding |
| Cloud Host | DigitalOcean | Post-BAA. Hostinger is current/temporary. |
| Tenant Subdomain | `[clientname].sparkmojo.com` | NOT app.sparkmojo.com. Reserve: www, app, api, admin, automation, docs |

---

## Section 6: Data Isolation Model (Locked)

- Multi-tenancy = Frappe multi-site (one Frappe site per client, database-per-tenant)
- Clinical data = Medplum shared instance, one Project per client (row-level projectId isolation)
- This is NOT a shared database model. Each client has an isolated Frappe site.
- DECISION-028 (Medplum multi-tenancy) is locked.
- Storage routing is capability-determined, not platform-mandated. Structured clinical data
  belongs in Medplum (Coverage, Patient, Encounter, etc. as FHIR resources). Structured
  business data belongs in Frappe. Unstructured file attachments belong in Frappe Drive
  backed by DO Spaces. Each capability determines correct storage during feature design.
  See `platform/architecture/FHIR-RESOURCE-MAP.md` for clinical data routing reference.

---

## Section 7: Locked Decisions (Summary)

One line per decision. Rationale is in `platform/decisions/`. Do not re-litigate.

| Decision | Answer |
|---------|--------|
| Frontend-to-backend contract | React calls MAL only. Never Frappe directly. |
| Custom app strategy | sm_widgets, sm_connectors, sm_billing. Custom Frappe image. |
| Multi-tenancy model | Frappe multi-site, database-per-tenant. |
| Clinical data layer | Medplum, self-hosted, internal Docker, one Project per client. |
| State machine approach | Hybrid: transition_state() for programmatic, Frappe Workflow for simple approvals. |
| Claim lifecycle | 19-state model including written_off. |
| Clearinghouse | Stedi-native. All clients use Stedi. |
| AI platform | AWS Bedrock. BAA covers all models. |
| Cloud provider | DigitalOcean (post-BAA). |
| Bench topology | Two-tier model with capacity thresholds. |
| Site provisioning | Three-site topology (poc-dev, willow, internal). |
| Admin Console | Dedicated admin architecture. |
| Workflow/n8n boundary | Frappe = internal state. n8n = external actions. Hard line. |
| Tenant subdomain | `[clientname].sparkmojo.com`. Wildcard cert `*.sparkmojo.com`. |
| CRM | The complete lifelong record of every customer interaction. Activity timeline is mandatory for all capabilities. |
| EHR strategy | Two paths: (A) connector for clients retaining existing EHR, (B) Spark Mojo as EHR via Medplum (preferred). |
| Configuration model | SM staff configure client instances via Configuration Mojo based on onboarding questionnaire. Clients do not self-configure except user management and role assignment. |

---

## Section 8: Open Questions

Things that are NOT yet decided. An agent encountering one of these must flag it, not infer.

| # | Question | Context |
|---|---------|--------|
| OQ-001 | Pricing and metering model | Every capability has invented pricing independently. Not locked. Requires dedicated session before spec factory runs on any revenue-sensitive capability. |
| OQ-002 | AI model names at build time | Bedrock model availability changes rapidly. Model names in research docs are directional. Verify against current Bedrock catalog at implementation. |
| OQ-003 | canonical_state field type for Workflow Engine | Select (Frappe Desk friendly, requires bench migrate on change) vs. Data (no migrate, supports client-facing configurator). Pending workflow configurator priority decision. |
| OQ-004 | Generic SM State Log migration | Build generic SM State Log now and migrate SM Claim State Log, or accept per-DocType State Log debt temporarily. |
| OQ-005 | Canonical phase/release definitions | Not resolved until NORTH_STAR.md session (J-020). All phase references in all research docs are directional only. |
| OQ-006 | Session note sync timing relative to billing AI | Does session note sync need to precede or accompany billing AI claim coding features? Unphased. Requires NORTH_STAR.md. |
| OQ-007 | Clinical AI legal review | All clinical AI features (diagnosis code suggestion, treatment plan drafting, clinical decision support) require James legal go/no-go before spec factory commission. This is not a technical question. It is a liability question. |
| OQ-008 | Pricing and packaging strategy blocks final Mojo completion | Every capability requires pricing mechanics to be considered complete. The commercial model is unresolved: metered vs. base + usage vs. all-inclusive vs. all-inclusive with limits. Which capabilities are base, which are add-ons, which are usage-billed, where seat limits sit, annual vs. monthly differential - none decided. The choice is whether to continue building capabilities and add pricing mechanics later (J-NEW-001), or solve pricing structure first. Either way, no Mojo ships as complete without it. Platform-level constraint affecting every capability in the library. |

---

## Section 9: Corrections to Research Documents

The research in `platform/research/` is high quality but contains errors that must not
propagate into spec factory outputs. The full corrections list is in
`platform/research/RESEARCH-CORRECTIONS.md`.

**Before any spec factory hat reads a capability research document, it must also read
`platform/research/RESEARCH-CORRECTIONS.md` and apply any corrections for that capability.**

**James does a final review of all capability research before spec factory runs on that
capability.** This is a mandatory process gate, not optional.

**URGENT - RC-024:** Admin API routes (`/api/admin/*`) currently have zero authentication.
ADMIN-001 (admin authentication middleware) must be built immediately as the next priority
story. This is a live security gap.

---

*Authored: Session 30, April 7, 2026. Updated: Session 32, April 8, 2026. Section 10 (process documentation) removed - see platform/FACTORY-DESIGN.md.*
*James Ilsley verbal confirmation on record in session transcripts.*
*Maintained by: Claude Chat (strategy). Updated via CoWork at end of session.*
*This document is the highest-authority governance document on the platform.*

``````markdown
# CRM / Client Identity -- AI Analysis

**Capability:** CRM / Client Identity
**Tier:** KERNEL
**Researcher:** Claude Code (Capability Deep Dive)
**Date:** April 6, 2026
**Authority:** DECISION-013, DECISION-020
**AI Infrastructure:** AWS Bedrock (Nova Micro, Nova Lite, Haiku 4.5, Sonnet 4.5, Nova Pro)

---

## 1. AI Opportunity Map

### 1.1 Classification Opportunities

| Opportunity | Description | Model | Trigger | Input | Output | Value |
|------------|-------------|-------|---------|-------|--------|-------|
| Lead source classification | Auto-classify referral source type from free-text referral notes | Nova Micro | Lead creation | Referral note text | Source type (Physician, School, Self, Insurance Panel, Web, Other) | Saves 30 seconds per referral. Enables accurate source attribution without staff training on categories. |
| Lead urgency triage | Classify urgency level from intake notes and clinical concerns | Haiku 4.5 | Lead creation | Clinical concerns text, referral context | Urgency (Routine, Urgent, Crisis) + reasoning | Critical for patient safety. Crisis cases surface immediately. Saves 2-5 minutes of manual assessment per referral. |
| Activity type classification | Auto-tag cross-system activities with type labels | Nova Micro | Activity write | Activity text, source system | Activity type (clinical, billing, scheduling, communication, task, consent, system) | Enables role-based filtering without manual tagging. |
| Contact sentiment analysis | Classify overall relationship health from recent activity patterns | Haiku 4.5 | Contact view (cached, refreshed daily) | Last 30 days of activities | Sentiment (Engaged, At-Risk, Disengaged, New) + key signals | Enables proactive outreach for at-risk relationships. |

### 1.2 Extraction Opportunities

| Opportunity | Description | Model | Trigger | Input | Output | Value |
|------------|-------------|-------|---------|-------|--------|-------|
| Referral fax/email parsing | Extract structured data from referral documents (fax, email, PDF) | Haiku 4.5 | Document upload or email receipt | Fax image, email body, PDF | Structured Lead fields (name, DOB, insurance, referring provider, diagnosis codes) | Saves 5-10 minutes per referral. Reduces data entry errors. Game-changer for practices receiving 20+ referrals/day. |
| Insurance card OCR | Extract insurance information from photos of insurance cards | Sonnet 4.5 (multimodal) | Photo upload | Insurance card image (front + back) | Member ID, group number, payer name, plan type, copay, phone number | Saves 3-5 minutes per patient. Reduces transcription errors that cause claim denials. |
| Contact info extraction from communication | Extract phone numbers, addresses, email from unstructured communication | Nova Micro | Email/message receipt | Email or message body | Structured contact fields | Auto-populates missing contact fields. Reduces incomplete records. |
| Consent document parsing | Extract consent dates and types from scanned/uploaded consent forms | Haiku 4.5 | Document upload | Scanned consent form | Consent type, date signed, signatory name | Auto-populates consent tracking fields. Eliminates manual date entry. |

### 1.3 Generation Opportunities

| Opportunity | Description | Model | Trigger | Input | Output | Value |
|------------|-------------|-------|---------|-------|--------|-------|
| Contact summary | Generate a natural language summary of a person's relationship history | Haiku 4.5 | Contact view | Last 90 days of activities, contact metadata | 2-3 sentence summary | "Active client since Jan 2026. 12 sessions with Dr. Smith. PHQ-9 trending down (18 -> 9). Balance: $0. Next appointment: April 15." Saves 2-3 minutes of review per contact. |
| Referral response email | Draft a response to a referring provider acknowledging the referral | Haiku 4.5 | Lead creation from referral | Referral details, practice templates | Draft email to referring provider | Professionalizes referral source relationships. Saves 3-5 minutes per referral. |
| Intake preparation brief | Generate a pre-intake summary for the clinician meeting a new patient | Haiku 4.5 | Appointment scheduled for new intake | Lead data, referral notes, insurance info | Structured brief (demographics, insurance, referral reason, concerns, relevant history) | Clinician walks into intake prepared. Saves 5-10 minutes of chart review. |
| Consent reminder message | Generate a personalized message reminding a client to complete missing consent forms | Nova Micro | Consent expiration check | Client name, missing consents, communication preferences | Personalized reminder (email or SMS text) | Automates consent renewal follow-up. Reduces staff time on administrative outreach. |

### 1.4 Validation Opportunities

| Opportunity | Description | Model | Trigger | Input | Output | Value |
|------------|-------------|-------|---------|-------|--------|-------|
| Duplicate confidence scoring | Score the likelihood that two records are the same person | Nova Micro | Duplicate detection | Two contact records (name, DOB, phone, email, address) | Confidence score (0-100) + match reasons | Reduces false positive duplicates. Staff only reviews high-confidence matches. |
| Data completeness validation | Check if a contact record has all required fields for its lifecycle stage | Nova Micro | Contact save | Contact fields, vertical template requirements | Missing fields list, completion percentage | Ensures data quality without blocking workflow. Gentle prompts rather than hard validations. |
| Insurance eligibility pre-check | Validate insurance information format before submitting to Stedi | Nova Micro | Insurance fields updated | Member ID, payer, DOB | Format validation (member ID pattern matches payer requirements) | Catches data entry errors before they cause eligibility check failures. |

### 1.5 Prediction Opportunities

| Opportunity | Description | Model | Trigger | Input | Output | Value |
|------------|-------------|-------|---------|-------|--------|-------|
| No-show risk prediction | Predict likelihood a new intake will no-show based on lead attributes | Haiku 4.5 | Intake appointment scheduled | Lead source, time-to-schedule, communication patterns, demographic factors | No-show probability (0-100%) + contributing factors | Enables double-booking strategy for high-risk slots. Estimated 5-10% reduction in no-shows. |
| Lead conversion prediction | Predict likelihood a lead will convert to active client | Haiku 4.5 | Lead qualified | Lead source, insurance type, clinical concerns, urgency, wait time | Conversion probability + recommendation (prioritize, standard, deprioritize) | Helps intake coordinators focus on leads most likely to convert. |
| Churn risk prediction | Predict likelihood a client will disengage based on attendance patterns | Nova Pro | Weekly batch | Appointment history, cancellation rate, time since last session, payment history | Churn risk (Low/Medium/High) + recommended intervention | Enables proactive outreach before a client disengages. High value for practices with retention challenges. |
| Referral source quality scoring | Predict which referral sources will produce the highest-value, longest-retained clients | Nova Pro | Monthly batch | Historical lead-to-conversion data by source, retention data, revenue data | Source quality score + ROI estimate | Informs referral source relationship investment. Where to spend lunch-and-learn time. |

---

## 2. AI Cost Projection

### 2.1 Per-Operation Costs (AWS Bedrock Pricing, April 2026)

| Model | Input Cost (per 1K tokens) | Output Cost (per 1K tokens) | Typical CRM Operation | Tokens (est.) | Cost per Operation |
|-------|---------------------------|----------------------------|----------------------|---------------|-------------------|
| Nova Micro | $0.000035 | $0.00014 | Lead source classification | 200 in / 50 out | $0.000014 |
| Nova Lite | $0.00006 | $0.00024 | Activity classification | 300 in / 50 out | $0.000030 |
| Haiku 4.5 | $0.0008 | $0.004 | Contact summary generation | 2,000 in / 200 out | $0.002400 |
| Haiku 4.5 | $0.0008 | $0.004 | Referral fax parsing | 3,000 in / 500 out | $0.004400 |
| Haiku 4.5 | $0.0008 | $0.004 | Urgency triage | 500 in / 100 out | $0.000800 |
| Sonnet 4.5 | $0.003 | $0.015 | Insurance card OCR | 5,000 in / 300 out | $0.019500 |
| Nova Pro | $0.0008 | $0.0032 | Churn prediction (batch) | 5,000 in / 500 out | $0.005600 |

### 2.2 Monthly Volume Estimates

**Pilot Scale (1 practice, ~200 active patients, 5 staff):**

| AI Feature | Monthly Volume | Cost per Op | Monthly Cost |
|-----------|---------------|-------------|-------------|
| Lead source classification | 30 leads | $0.000014 | $0.00 |
| Lead urgency triage | 30 leads | $0.000800 | $0.02 |
| Activity classification | 1,500 activities | $0.000030 | $0.05 |
| Contact summary (on view, cached 24h) | 500 views | $0.002400 | $1.20 |
| Referral fax parsing | 15 faxes | $0.004400 | $0.07 |
| Insurance card OCR | 10 cards | $0.019500 | $0.20 |
| Duplicate detection scoring | 30 checks | $0.000014 | $0.00 |
| Consent reminder generation | 20 reminders | $0.000014 | $0.00 |
| Churn prediction (weekly batch) | 200 patients x 4 | $0.005600 | $4.48 |
| **TOTAL (Pilot)** | | | **$6.02/month** |

**50-Practice Scale:**

| AI Feature | Monthly Volume (per practice) | Cost per Practice | Total (50 practices) |
|-----------|-------------------------------|-------------------|---------------------|
| All real-time features | ~2,100 operations | ~$1.54 | $77.00 |
| Batch features (churn, referral scoring) | ~1,000 operations | ~$4.48 | $224.00 |
| **TOTAL (50 practices)** | | | **$301.00/month** |

### 2.3 Cost Assessment

**Verdict: AI costs for CRM are negligible.** At $6/month for a pilot practice and $301/month for 50 practices, AI is essentially free relative to the value delivered. The most expensive single operation (insurance card OCR at $0.02) saves 3-5 minutes of staff time worth $1.50-$2.50. ROI is 75-125x per operation.

The cost-heavy features (churn prediction, referral source scoring) use batch processing on Nova Pro, which is the most cost-effective model for analytical workloads. Even at scale, batch AI costs are under $5/practice/month.

**Recommendation:** Enable all AI features by default. Do not gate AI behind pricing tiers for CRM. The cost is too low to justify the complexity of tiered AI access. Include AI infrastructure cost in the base subscription.

---

## 3. Differentiator AI Features

### 3.1 Intelligent Referral Intake (Bold Feature)

**What it does:** When a referral arrives (fax, email, phone, web form), AI processes it end-to-end:

1. **Parse** the referral document (fax OCR, email extraction) into structured data
2. **Create** a Lead record with all extracted fields
3. **Classify** urgency (Crisis / Urgent / Routine)
4. **Verify** insurance by checking the payer against SM Payer list
5. **Match** the patient's needs to available providers (specialty, availability, insurance acceptance)
6. **Draft** a response to the referral source
7. **Present** everything to the intake coordinator in a single "Referral Ready" view

**Staff experience:** Instead of 10-15 minutes of manual data entry, searching, and verification per referral, staff sees: "New referral from Dr. Johnson. Sarah Williams, DOB 3/15/1990, Aetna PPO (accepted). Anxiety + depression. Urgency: Routine. Best fit: Dr. Smith (availability: Tuesday 3pm, Thursday 10am). Draft response ready."

**Staff action:** Review, confirm, schedule. 2 minutes instead of 15.

**Model chain:** Haiku 4.5 (parsing) -> Nova Micro (classification) -> Nova Micro (insurance check) -> Haiku 4.5 (provider matching) -> Haiku 4.5 (response draft)

**Total cost per referral:** ~$0.01

**Competitive advantage:** No competing CRM offers this for SMBs. SimplePractice and TherapyNotes have basic intake forms but no AI parsing. HubSpot has AI but not for healthcare intake. Salesforce Health Cloud has AI but costs $300/user/month.

**Confidence: HIGH.** All components exist in the architecture. Referral parsing is well-understood NLP. Provider matching is a structured query. The challenge is UX design, not AI capability.

### 3.2 Relationship Health Score (Bold Feature)

**What it does:** Every Contact gets a dynamic "Relationship Health Score" (0-100) computed from:

- Appointment attendance rate (cancellation/no-show patterns)
- Payment behavior (on-time, overdue, balance)
- Communication engagement (response rate, outreach frequency)
- Clinical progress (assessment score trends -- healthcare only)
- Tenure (how long they have been a client)
- Recency (days since last interaction)

**Staff experience:** The Contact list shows a color-coded health indicator next to each person. Green (80-100), Yellow (50-79), Red (0-49). Staff can sort/filter by health score. The practice manager gets a monthly "Relationship Health Report" showing trends.

**Model:** Nova Pro (batch, weekly) for score computation. Nova Micro for real-time score lookup.

**Total cost per practice per month:** ~$3-5

**Competitive advantage:** HubSpot has "Health Score" but only for SaaS companies tracking product usage. Salesforce has Einstein Activity Capture but it is marketing-focused. No healthcare CRM offers a relationship health score that combines clinical, billing, and engagement data. This is uniquely enabled by Spark Mojo's unified data model (CRM + Medplum + ERPNext all feeding the same activity timeline).

**Confidence: MEDIUM-HIGH.** The data inputs exist. The scoring model needs tuning with real data. The initial version can use rule-based scoring (no AI needed); AI upgrades the scoring with pattern detection over time.

### 3.3 Smart Consent Manager (Bold Feature)

**What it does:**
- Scans uploaded consent documents and auto-populates consent tracking fields
- Monitors consent expiration dates and auto-generates renewal reminders
- For new patients, generates a personalized consent packet based on their services
- Tracks consent across multiple systems (CRM consent fields + Medplum Consent resource)

**Model:** Haiku 4.5 for document parsing. Nova Micro for reminders.

**Total cost per practice per month:** ~$1-2

**Competitive advantage:** Consent tracking is the #1 compliance pain point for healthcare practices. No CRM offers automated consent document parsing + expiration tracking + renewal generation. This is a significant differentiator for the healthcare vertical.

**Confidence: HIGH for tracking and reminders. MEDIUM for document parsing** (consent form formats vary widely; structured forms work well, handwritten forms are harder).

---

## 4. AI Readiness Assessment

### 4.1 Training Data Needs

| AI Feature | Training Data Required | Data Source | Current Availability |
|-----------|----------------------|-------------|---------------------|
| Lead source classification | 100+ labeled referral records | Practice intake logs | NOT AVAILABLE. Need to collect from pilot practices during onboarding. Cold-start solution: use few-shot prompting with 10-20 examples in the system prompt. |
| Urgency triage | 50+ labeled urgency assessments | Practice intake coordinators | NOT AVAILABLE. Same cold-start approach. Add feedback loop: staff confirms/overrides AI urgency -> labeled data accumulates. |
| Referral fax parsing | 30+ sample referral faxes | Pilot practices | PARTIALLY AVAILABLE. Willow Center and Artemis Counseling can provide anonymized samples. |
| Insurance card OCR | 20+ insurance card images | Publicly available samples | AVAILABLE. Insurance card formats are standardized. Pre-trained models handle this well. |
| Contact summary | No training data needed | Activity timeline data | AVAILABLE once activities are flowing. Prompt engineering only. |
| Duplicate scoring | 100+ labeled duplicate/non-duplicate pairs | CRM data | NOT AVAILABLE. Cold-start: use deterministic scoring (exact match rules). Upgrade to ML after data accumulates. |
| Churn prediction | 200+ client records with outcome labels | Practice historical data | NOT AVAILABLE. Need 6+ months of platform usage data. Cold-start: rule-based scoring (days since last visit, cancellation rate). |
| No-show prediction | 200+ appointment records with attendance labels | Practice scheduling data | NOT AVAILABLE. Same timeline requirement. Cold-start: industry benchmarks (25% average no-show rate for behavioral health). |

### 4.2 Prompt Engineering Requirements

| Feature | Prompt Complexity | Prompt Engineering Effort | Notes |
|---------|------------------|--------------------------|-------|
| Lead source classification | LOW | 2-4 hours | Simple category classification with examples |
| Urgency triage | MEDIUM | 4-8 hours | Requires healthcare-specific safety guardrails. Must never classify a crisis as routine. |
| Referral parsing | MEDIUM | 8-16 hours | Document format variability. Need to handle fax noise, poor OCR, handwriting. |
| Insurance card OCR | LOW | 2-4 hours | Structured format. Well-understood problem. |
| Contact summary | LOW | 2-4 hours | Template-based generation with activity data. |
| Intake preparation brief | MEDIUM | 4-8 hours | Must balance completeness with brevity. Clinician preferences vary. |
| Relationship health score | HIGH | 16-24 hours | Multi-factor scoring model. Needs calibration with real data. Consider rule-based v1 first. |
| Churn prediction | HIGH | 16-24 hours | Same as health score. Rule-based v1, ML upgrade later. |

### 4.3 Readiness Summary

| Dimension | Status | Notes |
|-----------|--------|-------|
| Model access (AWS Bedrock) | READY | All models available. Credentials configured. |
| Abstraction layer integration pattern | READY | FastAPI can call Bedrock via boto3. Pattern established. |
| Training data | NOT READY | Most features can cold-start with few-shot prompting. ML-based features (churn, no-show) need 6+ months of usage data. |
| Prompt engineering | NOT STARTED | Estimated 60-100 hours total across all features. Can be done incrementally. |
| Safety guardrails | CRITICAL for healthcare | Urgency triage must never miss a crisis. Requires explicit safety testing before deployment. Consider human-in-the-loop for crisis classification until confidence is established. |
| Cost infrastructure | READY | Bedrock pay-per-use. No upfront commitment. Costs are negligible ($6/month/practice). |

### 4.4 Recommended AI Phasing

**Phase 1 (Launch with CRM):**
- Contact summary generation (Haiku 4.5, prompt engineering only)
- Activity type classification (Nova Micro, rule-based with AI fallback)
- Data completeness validation (Nova Micro)
- Duplicate confidence scoring (Nova Micro, deterministic with AI boost)

**Phase 2 (After 1 month of usage data):**
- Lead source classification (Nova Micro, few-shot with feedback loop)
- Lead urgency triage (Haiku 4.5, with human-in-the-loop for crisis)
- Consent reminder generation (Nova Micro)
- Referral response email drafting (Haiku 4.5)

**Phase 3 (After 3 months of usage data):**
- Referral fax/email parsing (Haiku 4.5, multimodal)
- Insurance card OCR (Sonnet 4.5, multimodal)
- Intake preparation brief (Haiku 4.5)
- Intelligent referral intake (full pipeline)

**Phase 4 (After 6 months of usage data):**
- No-show risk prediction (Haiku 4.5 -> Nova Pro)
- Lead conversion prediction (Haiku 4.5)
- Churn risk prediction (Nova Pro, batch)
- Referral source quality scoring (Nova Pro, batch)
- Relationship health score (Nova Pro, batch)

---

*End of AI Analysis. Next: CRM-CLIENT-IDENTITY-SYNTHESIS.md*

``````markdown
<!-- CORRECTIONS APPLIED: See platform/research/RESEARCH-CORRECTIONS.md for full detail -->
> [!WARNING]
> **This document has known corrections from the Session 30-31 verification pass.**
> Review the corrections below before using this research in any spec or design work.

## Applied Corrections

| RC # | Tag | Summary |
|------|-----|---------|
| RC-012 | FLAG | DECISION-020 citation for activity capture may be wrong. Verify correct decision number before spec factory use. |
| RC-013 | CRITICAL | CRM is the complete lifelong record of every interaction. Unified activity timeline IS the definition, not a feature. Mandatory write-back contract for all capabilities. |
| RC-PRICING-BLOCKS-ALL | CRITICAL | Pricing numbers in this document are directional only. Pricing strategy unresolved - pending J-NEW-001. |
| RC-PRICING | RC-PRICING | Pricing numbers in this document are directional only. Pricing strategy unresolved - pending J-NEW-001. |

---

<!-- ORIGINAL DOCUMENT FOLLOWS -->
# CRM / Client Identity -- Synthesis

**Capability:** CRM / Client Identity
**Tier:** KERNEL
**Researcher:** Claude Code (Capability Deep Dive)
**Date:** April 6, 2026

---

## 1. What You Need to Know (5 Bullets)

1. **Frappe CRM is ready to use.** It is installed on poc-dev, all API endpoints work, and the data model (Lead, Contact, Organization, Deal) maps cleanly to every vertical we target. No new SM DocType is needed. Custom fields added at provisioning handle vertical differences.

2. **The unified activity timeline is the killer feature.** No competing SMB CRM shows clinical + billing + scheduling + communication history in one view. Spark Mojo can because of the n8n activity capture architecture defined in DECISION-020. This is the Salesforce Health Cloud value proposition at 1/10th the cost.

3. **AI costs are negligible (~$6/month/practice).** Every AI feature in the CRM (intake triage, contact summaries, duplicate detection, churn prediction) costs less than a single cup of coffee per month per practice. Enable everything by default. Do not tier-gate AI.

4. **Vocabulary abstraction is the universal-first enabler.** The same CRM data model serves healthcare (patient), hospitality (guest), legal (client), and education (student). The provisioning template controls labels, pipeline stages, custom fields, and consent requirements. No code changes per vertical.

5. **14 stories, 6-9 Ralph nights, 2-3 calendar weeks.** The build is medium-sized. Hard dependencies are all met (Frappe CRM installed, abstraction layer running, SM Site Registry exists). Soft dependencies (Medplum, n8n workflows, AI) can be added incrementally after the core CRM routes and React Mojo are built.

---

## 2. The Capability in Plain English

CRM / Client Identity is the address book for the entire platform. Every person the business has a relationship with -- clients, patients, guests, students, referral sources, payers, vendors -- has one record in the CRM. That record is the single place any staff member goes to find out who this person is, how they got here, what has happened with them, and what needs to happen next.

When a new person contacts the business (phone, web form, referral fax, walk-in), a Lead record is created. The Lead tracks how the person arrived and whether they are a fit. When the person is accepted (enrolled, admitted, booked, engaged), the Lead converts to a Contact. That Contact becomes the permanent record that every other system in the platform points to: billing creates an account linked to this Contact, clinical creates a chart linked to this Contact, scheduling books appointments for this Contact. Everything that happens -- session completed, payment received, claim submitted, assessment scored -- is written back to the Contact's activity timeline by automated workflows.

The result: any staff member can look up a person and see their complete story in one view, without switching systems or asking coworkers for information.

---

## 3. Universal Value Table

| Vertical | Person Label | Pipeline | CRM Value | Unique Requirements |
|----------|-------------|----------|-----------|-------------------|
| **Behavioral Health** | Patient / Client | Referral -> Screened -> Assessed -> Accepted -> Active -> Discharged | Referral source tracking, insurance verification, consent management, clinical-billing-scheduling unified view | HIPAA consent tracking, 42 CFR Part 2, insurance as identity attribute, Medplum Patient projection |
| **Hospitality** | Guest | Inquiry -> Quoted -> Confirmed -> Checked In -> Checked Out -> Follow-up | Guest preference tracking, loyalty management, repeat visit history, corporate rate management | PCI-DSS (no credit card storage), room/dietary preferences, loyalty tier, travel agent commissions |
| **Legal** | Client | Consultation -> Conflict Check -> Engaged -> Active Matter -> Closed | Conflict of interest checking, matter tracking, engagement letter management, referral attorney relationships | ABA conflict checking (cross-matter party search), engagement letter tracking, IOLTA trust accounting link |
| **Education** | Student | Inquiry -> Trial -> Enrolled -> Active -> Semester Break -> Re-enrolled -> Graduated | Student progress tracking, parent/guardian linking, enrollment management, skill level tracking | FERPA (if federally funded), minor consent via parent, instrument/skill tracking, recital participation |
| **Consulting / Agency** | Client | Lead -> Qualified -> Proposal -> Engaged -> Active -> Completed | Deal pipeline, proposal tracking, project-to-client linking, revenue forecasting | Deal/opportunity management (Frappe CRM Deal DocType), project billing link |
| **Fitness / Wellness** | Member | Inquiry -> Trial -> Membership -> Active -> Frozen -> Cancelled | Membership management, class booking, attendance tracking, health goals | Liability waiver consent, membership freeze/cancel workflows, class capacity management |

---

## 4. Recommended Approach (One Paragraph)

Use Frappe CRM as-is with custom fields added at provisioning time per vertical template. Build 15 abstraction layer endpoints under `/api/modules/crm/*` that wrap Frappe's REST API, adding vocabulary mapping, role-based activity filtering, and duplicate detection. Build a React CRM Mojo with three views: Contact list with search, Contact detail with activity timeline, and Lead pipeline as Kanban board. Wire n8n workflows for Lead conversion (creates ERPNext Customer + Medplum Patient), cross-system activity capture (clinical, billing, scheduling events written to CRM), and nightly duplicate detection. Do not build a custom SM DocType -- this was explicitly decided against in DECISION-013 and reaffirmed in DECISION-020. Do not deploy the Frappe CRM Vue frontend to client tenants -- the React Mojo is the UI surface. AI features (contact summaries, intake triage, duplicate scoring) are added incrementally after the core CRM is working, starting with prompt-engineered features that require no training data.

---

## 5. Effort and Timeline

| Metric | Value |
|--------|-------|
| **T-shirt size** | **M-L** |
| **Story count** | **14** |
| **Ralph nights** | **6-9** |
| **Calendar weeks** | **2-3** |
| **Lane** | **GREEN** -- all hard dependencies met, no blocking unknowns, proven architecture pattern |

### Story Sequence

```
CRM-001: Abstraction layer - contacts CRUD                 [M]  Night 1
CRM-002: Abstraction layer - leads CRUD + pipeline          [M]  Night 1-2
CRM-003: Abstraction layer - orgs, search, vocabulary       [S]  Night 2
CRM-004: Custom fields provisioning (healthcare)            [M]  Night 2-3
CRM-005: Lead stages configuration per vertical             [S]  Night 3
CRM-012: CRM roles and permissions                          [S]  Night 3
CRM-006: React CRM Mojo - Contact list + search             [L]  Night 4-5
CRM-007: React CRM Mojo - Contact detail + timeline         [L]  Night 5-6
CRM-008: React CRM Mojo - Lead pipeline Kanban              [L]  Night 6-7
CRM-009: n8n: Lead conversion workflow                      [M]  Night 7
CRM-010: n8n: Cross-system activity capture                 [L]  Night 7-8
CRM-011: Duplicate detection (real-time + batch)            [M]  Night 8
CRM-013: Consent tracking (healthcare)                      [M]  Night 8-9
CRM-014: Contact merge functionality                        [M]  Night 9
```

---

## 6. Provisioning Impact

CRM / Client Identity adds the following to provisioning templates:

**New provisioning steps (added to DECISION-017 runbook):**
1. Create custom fields on Contact and Lead DocTypes based on vertical template
2. Configure Sales Stages (pipeline stages) based on vertical template
3. Create SM CRM roles (Reader, Editor, Manager, Intake)
4. Assign CRM roles to default users
5. Write vocabulary configuration to SM Site Registry
6. Apply default CRM Settings (source options, assignment rules)

**Template additions:**

```yaml
# Added to behavioral_health.yaml
crm:
  custom_fields:
    contact: [sm_date_of_birth, sm_insurance_member_id, sm_payer, ...]
    lead: [sm_referral_source, sm_urgency, sm_clinical_concerns, ...]
  stages: [Referred, Screening, Assessed, Accepted, Waitlisted, Declined]
  vocabulary:
    person: "Client"
    lead: "Referral"
    intake: "Intake"
  roles: [SM CRM Reader, SM CRM Editor, SM CRM Manager, SM CRM Intake]
```

**New vertical templates needed:** None. Existing templates (behavioral_health.yaml, general_smb.yaml) are extended with a `crm` section. New verticals (hospitality.yaml, legal.yaml, education.yaml) are created when those verticals are activated.

---

## 7. Dependencies

```
                    +-------------------+
                    |  Frappe CRM       |
                    |  (installed)      |
                    +--------+----------+
                             |
                    +--------v----------+
                    |  Abstraction Layer |
                    |  /api/modules/crm |
                    +--------+----------+
                             |
              +--------------+--------------+
              |              |              |
     +--------v---+  +------v------+  +----v--------+
     | React CRM  |  | n8n         |  | SM Site     |
     | Mojo       |  | Workflows   |  | Registry    |
     | (NEW)      |  | (NEW)       |  | (EXISTS)    |
     +------------+  +------+------+  +-------------+
                            |
              +-------------+-------------+
              |             |             |
     +--------v---+  +-----v------+  +---v----------+
     | ERPNext    |  | Medplum    |  | SM Payer     |
     | Customer   |  | Patient    |  | (EXISTS)     |
     | (EXISTS)   |  | (EXISTS)   |  +--------------+
     +------------+  +------------+

     HARD deps (must exist): Frappe CRM, Abstraction Layer, SM Site Registry
     SOFT deps (nice to have): Medplum, ERPNext Customer, SM Payer, n8n
     PROVIDES TO: Billing, Clinical, Scheduling, Tasks, Analytics, Notifications
```

---

## 8. Open Questions for James (Max 3)

### Question 1: Activity Storage -- Communication DocType or Custom SM CRM Activity?

Frappe's Communication DocType is designed for email/SMS. Using it for arbitrary cross-system activities (clinical events, billing events, task completions) works but may hit edge cases with Frappe's email-specific handling. The alternative is creating an `SM CRM Activity` DocType in sm_widgets -- cleaner but adds a DocType to the system.

**My recommendation:** Start with Communication DocType (simpler, no new DocType). If we hit edge cases, create SM CRM Activity as a fallback. The abstraction layer insulates the React Mojo from this decision -- switching storage behind the API does not change the frontend.

**Confidence:** MEDIUM. I have not tested Communication with non-email activity types at scale.

### Question 2: Should Lead Auto-Convert for Non-Pipeline Verticals?

Some verticals (music school, walk-in fitness studio) have no qualification step. Every inquiry becomes a client. Should these verticals skip Lead entirely and create Contact directly, or should Lead be created and auto-converted for source attribution?

**My recommendation:** Auto-convert. Lead is created, immediately converted to Contact. The Lead persists for source attribution reporting. The staff never sees the Lead as a separate step -- the UX is "create new client" which internally creates Lead + Contact atomically.

**Confidence:** HIGH. This preserves data model consistency while eliminating unnecessary workflow steps.

### Question 3: When Should CRM Be Prioritized Relative to Healthcare Billing?

CRM is KERNEL and unblocked (D019-G). Healthcare Billing is IN DESIGN with BILL-006 through BILL-010 in the current sprint. CRM provides the identity layer that billing depends on (Contact -> Customer link). Should CRM be built before, after, or in parallel with the remaining billing stories?

**My recommendation:** After the current billing sprint (BILL-006 through BILL-010) completes, CRM should be next. The billing stories currently create ERPNext Customers directly. Once CRM is built, the Customer creation pathway changes to: CRM Contact -> Lead conversion -> n8n -> Customer. Building CRM first would require reworking in-flight billing stories. Building it immediately after is cleaner.

**Confidence:** HIGH. This is a sequencing question with a clear answer.

---

## 9. Proposed Story List

### For Ralph Build Commission (Feature Design Session First)

| Story | Title | Size | Phase |
|-------|-------|------|-------|
| CRM-001 | Abstraction layer: Contact CRUD endpoints | M | Backend |
| CRM-002 | Abstraction layer: Lead CRUD + pipeline endpoints | M | Backend |
| CRM-003 | Abstraction layer: Organization, search, vocabulary endpoints | S | Backend |
| CRM-004 | Provisioning: Healthcare vertical custom fields | M | Backend |
| CRM-005 | Provisioning: Lead stages per vertical template | S | Backend |
| CRM-006 | React: CRM Mojo - Contact list with search | L | Frontend |
| CRM-007 | React: CRM Mojo - Contact detail with activity timeline | L | Frontend |
| CRM-008 | React: CRM Mojo - Lead pipeline Kanban board | L | Frontend |
| CRM-009 | n8n: Lead conversion workflow (Customer + Patient creation) | M | Integration |
| CRM-010 | n8n: Cross-system activity capture (D020-5 events) | L | Integration |
| CRM-011 | Duplicate detection: real-time check + nightly batch | M | Backend |
| CRM-012 | CRM roles and permissions setup | S | Backend |
| CRM-013 | Consent tracking: fields, validation, expiration alerts | M | Backend |
| CRM-014 | Contact merge: API endpoint + React UI | M | Full-stack |

### Design Session Agenda (If Scheduled Before Build)

1. **Activity storage decision** (10 min) -- Communication DocType vs. SM CRM Activity. Review edge cases. Make final call.
2. **Vocabulary mapping UX** (15 min) -- How does the React Mojo consume vocabulary config? Static at load time or dynamic per API call? Review performance implications.
3. **Lead pipeline UX** (20 min) -- Kanban columns, card content, drag-to-convert. Review Frappe CRM v2 Kanban for inspiration. Decide on column configuration (hardcoded stages vs. dynamic from Sales Stage DocType).
4. **Contact detail layout** (20 min) -- Activity timeline position (right panel? bottom section?). Field grouping (demographics, insurance, consent, cross-system links). Role-based field visibility in the UI.
5. **Consent tracking UX** (10 min) -- Inline on Contact detail vs. separate consent panel. Expiration alerting mechanism. Document upload/link integration.
6. **Duplicate detection UX** (10 min) -- When to show duplicates (on create? on save? separate review queue?). Merge workflow (which record wins?).
7. **AI feature prioritization** (15 min) -- Which Phase 1 AI features ship with CRM launch? Review contact summary, activity classification, duplicate scoring. Confirm model selection.

**Total session time:** ~100 minutes

---

*End of Synthesis. All 4 research documents complete.*

---

**Research Package Contents:**

| File | Lines | Focus |
|------|-------|-------|
| CRM-CLIENT-IDENTITY-WORKFLOW-RESEARCH.md | ~460 | Scope, universal analysis (4 verticals), competitive landscape (4 competitors), behavioral health overlay, user workflows, differentiators, provisioning, permissions, training |
| CRM-CLIENT-IDENTITY-TECHNICAL-RESEARCH.md | ~530 | Frappe CRM native coverage, 3 implementation options, recommended approach with code patterns, data model, 15+ API endpoints, integration points, dependencies, effort estimate, risks |
| CRM-CLIENT-IDENTITY-AI-ANALYSIS.md | ~280 | AI opportunity map (18 opportunities across 5 categories), cost projection ($6/month/practice), 3 bold differentiator features, readiness assessment, 4-phase AI roadmap |
| CRM-CLIENT-IDENTITY-SYNTHESIS.md | ~240 | Executive summary, universal value table, recommended approach, effort (M-L, 14 stories, 6-9 nights), dependency diagram, 3 open questions, story list, design session agenda |

``````markdown
# CRM / Client Identity -- Technical Research

**Capability:** CRM / Client Identity
**Tier:** KERNEL
**Researcher:** Claude Code (Capability Deep Dive)
**Date:** April 6, 2026
**Authority:** DECISION-013, DECISION-019 (MEGA-001), DECISION-020

---

## 1. Frappe/ERPNext Native Coverage

### 1.1 What Frappe CRM Provides Out of the Box

Frappe CRM (v2.0.0-dev, installed on poc-dev.sparkmojo.com) provides:

**Core DocTypes:**

| DocType | Fields | Purpose | Spark Mojo Fit |
|---------|--------|---------|----------------|
| Lead (CRM Lead) | ~25 fields | Pre-qualification person record. Source, status, qualification, contact info, notes. | GOOD. Maps to referral/inquiry. Custom stages needed per vertical. |
| Contact | ~20 fields | Frappe core DocType extended by CRM. Name, email, phone, links to Customer/Supplier/etc. | GOOD. Canonical person record per DECISION-013. |
| Organization (CRM Organization) | ~15 fields | Company/entity record. Website, industry, annual revenue, linked contacts. | GOOD. Referral sources, payers, employers. |
| Deal (CRM Deal) | ~20 fields | Sales opportunity. Stage, probability, amount, linked contact/org. | OPTIONAL. Not needed for most SMB verticals. CORE add-on. |
| CRM Note | ~5 fields | Child table for notes on Lead/Deal. | GOOD. Activity notes. |
| Sales Stage | ~3 fields | Configurable pipeline stages. | GOOD. Reconfigured per vertical (intake stages, not sales stages). |
| Opportunity | ~30 fields | Legacy ERPNext CRM opportunity. Party, items, probability. | SKIP. Use Deal if pipeline is needed. Opportunity is the old ERPNext CRM module, not Frappe CRM v2. |
| Contract | ~25 fields | Agreement management. Party, dates, terms, signatures, fulfilment. | GOOD. Payer agreements, engagement letters. |
| Appointment | ~10 fields | Basic scheduling. Time, status, contact. | SKIP. Too basic for any vertical. SchedulerMojo handles scheduling. |
| Campaign | ~10 fields | Marketing campaign definition. | OPTIONAL. CORE add-on for businesses that do outbound marketing. |
| Email Campaign | ~10 fields | Automated email sequences linked to Campaign. | OPTIONAL. Same as Campaign. |
| CRM Settings | ~5 fields | Module configuration. | CONFIGURE. Set defaults per vertical. |

**API Coverage:**

All DocTypes are accessible via standard Frappe REST API:
- `GET /api/resource/{DocType}` -- list with filters, pagination, field selection
- `GET /api/resource/{DocType}/{name}` -- single record
- `POST /api/resource/{DocType}` -- create
- `PUT /api/resource/{DocType}/{name}` -- update
- `DELETE /api/resource/{DocType}/{name}` -- delete

Verified on poc-dev.sparkmojo.com (MEGA-001 evaluation): all endpoints return clean JSON, HTTP 200.

**Custom Fields:**

Frappe CRM supports custom fields via:
1. Frappe Desk "Customize Form" -- UI-based field addition
2. Frappe CRM side panel layout builder -- drag-and-drop field arrangement
3. Custom Field DocType -- programmatic field addition via `frappe.get_doc("Custom Field", ...)`
4. Provisioning API -- batch field creation at site setup

**Communication:**
- Email: send/receive from Lead/Deal pages
- WhatsApp: integration available
- Telephony: Exotel, Twilio integration with call recordings
- Comments: internal team comments on any record

**Search:**
- Frappe's built-in `frappe.get_list()` with `or_filters` supports multi-field search
- Full-text search via MariaDB `MATCH AGAINST` on text fields
- Link field typeahead for related records

### 1.2 Gaps Assessment

| Gap | Severity | Mitigation |
|-----|----------|------------|
| No unified activity timeline across systems | HIGH | n8n activity capture (D020-5) + CRM Activity child table or Communication DocType |
| No duplicate detection | HIGH | Custom: real-time fuzzy match on create + nightly batch dedup job |
| No consent tracking fields | MEDIUM | Custom fields per vertical template. Not a structural gap -- just configuration. |
| No vocabulary abstraction | MEDIUM | Abstraction layer returns label metadata. React Mojo renders dynamically. |
| No field-level permission on activity types | MEDIUM | Abstraction layer filters activities by type/role before returning to frontend |
| No merge contacts functionality in CRM v2 | MEDIUM | Custom API endpoint in abstraction layer that merges two Contact records |
| Lead-to-Contact conversion workflow is sales-oriented | LOW | Reconfigure stages. The mechanism works; the labels need changing. |
| No mobile-optimized view | LOW | React Mojo is responsive. Not a CRM-level gap. |
| CRM Vue frontend is separate from React app | LOW | We do not use the Vue frontend for clients. Not a gap -- a design choice. |
| No built-in AI features | LOW | AWS Bedrock integration via abstraction layer. Not expected from Frappe CRM. |

---

## 2. Implementation Options

### Option A: Frappe CRM Native + Custom Fields + Abstraction Layer

**Description:** Use Frappe CRM DocTypes as-is. Add custom fields per vertical via provisioning. Build abstraction layer routes that wrap Frappe REST API calls. Build React CRM Mojo that calls abstraction layer.

**Architecture:**
```
React CRM Mojo
    |
    v
FastAPI /api/modules/crm/* (abstraction-layer/routes/crm.py)
    |
    v
Frappe REST API (Contact, Lead, Organization, Deal, CRM Note)
    |
    +-- Custom Fields (added at provisioning)
    +-- Frappe Workflow (Lead stage transitions)
    +-- n8n (cross-system activity capture)
```

**Pros:**
- Minimal custom code. Frappe CRM does 80% of the work.
- Follows the established abstraction layer pattern (same as billing, clinical, tasks).
- Custom fields are a first-class Frappe concept -- no hacks needed.
- Lead pipeline, Contact management, Organization linking all work out of the box.
- Frappe's permission system handles role-based access natively.
- Upgrades to Frappe CRM are non-breaking (custom fields survive upgrades).

**Cons:**
- Frappe CRM's data model is sales-oriented. Vocabulary needs remapping.
- The Vue frontend exists but is not used, creating maintenance overhead for an unused app.
- Frappe CRM v2 is on develop branch (pre-release). Risk of breaking changes.
- Activity timeline is Frappe's Communication DocType, which is email-centric. Non-email activities (clinical, billing) need to be written as Communication or a custom Activity DocType.

**Effort:** T-shirt M (6-10 stories, 3-5 Ralph nights)

### Option B: Custom SM Contact DocType + Thin CRM Wrapper

**Description:** Build a custom `SM Contact` DocType in `sm_widgets` that wraps Frappe CRM's Contact but adds vertical-specific fields, consent tracking, and activity timeline natively. Frappe CRM Lead and Organization are used as-is but SM Contact replaces Contact as the lookup entry point.

**Architecture:**
```
React CRM Mojo
    |
    v
FastAPI /api/modules/crm/* (abstraction-layer/routes/crm.py)
    |
    v
SM Contact DocType (sm_widgets)
    |
    +-- Links to: Frappe Contact (base identity)
    +-- Links to: ERPNext Customer (billing projection)
    +-- Links to: Medplum Patient ID (clinical projection)
    +-- Has: SM Activity child table (unified timeline)
    +-- Has: SM Consent child table (consent tracking)
    +-- Has: Vertical-specific field groups
```

**Pros:**
- Full control over the data model. No dependency on Frappe CRM's evolution.
- SM Activity child table provides a clean, unified timeline without relying on Communication DocType.
- SM Consent child table is purpose-built for consent tracking.
- Vocabulary mapping is built into the DocType definition.
- No unused Vue frontend to maintain.

**Cons:**
- **Violates DECISION-013.** This is explicitly the approach that was rejected ("SM Client DocType is retired"). Building SM Contact is the same pattern under a different name.
- Duplicates Frappe CRM's existing functionality (Contact management, organization linking, communication tracking).
- Creates two identity systems (SM Contact + Frappe Contact). Exactly the problem DECISION-013 was designed to prevent.
- Significantly more custom code to build and maintain.
- Frappe CRM's built-in integrations (WhatsApp, telephony, email) would not automatically work with SM Contact.

**Effort:** T-shirt L (15-20 stories, 6-10 Ralph nights)

### Option C: Hybrid -- Frappe CRM Contact + SM CRM Extension DocType

**Description:** Use Frappe CRM Contact as the base record (per DECISION-013). Create an `SM CRM Extension` DocType in `sm_widgets` that links 1:1 to Contact and stores Spark Mojo-specific data (consent tracking, cross-system links, vocabulary metadata). The abstraction layer joins both DocTypes when returning a contact to the frontend.

**Architecture:**
```
React CRM Mojo
    |
    v
FastAPI /api/modules/crm/* (abstraction-layer/routes/crm.py)
    |
    v
Frappe CRM Contact (base identity, communication, standard CRM fields)
    +
SM CRM Extension (sm_widgets) -- 1:1 linked
    |
    +-- medplum_patient_id (Link to Medplum)
    +-- erpnext_customer_id (Link to ERPNext Customer)
    +-- consent_records (child table: SM Consent Record)
    +-- communication_preferences (JSON field)
    +-- vertical_metadata (JSON field)
    +-- activities (child table: SM CRM Activity -- cross-system timeline)
```

**Pros:**
- Respects DECISION-013 (CRM Contact is canonical).
- Adds Spark Mojo-specific features without modifying Frappe CRM's core DocTypes.
- Clean separation: Frappe CRM handles standard CRM. SM CRM Extension handles platform-specific needs.
- SM CRM Activity child table provides the unified timeline without polluting Communication DocType.
- Consent tracking is structured (child table), not ad-hoc (custom fields).
- Frappe CRM's integrations (WhatsApp, telephony, email) continue to work on the Contact record.
- Vocabulary metadata lives in SM CRM Extension, not in custom fields on Contact.

**Cons:**
- Two DocTypes per person (Contact + SM CRM Extension) adds query complexity.
- The abstraction layer must join both DocTypes for every contact read. Performance overhead (mitigated by caching).
- Child tables (consent, activities) can grow large for long-term relationships. Pagination needed.
- SM CRM Extension creation must be atomic with Contact creation (n8n or server script).

**Effort:** T-shirt M (8-12 stories, 4-6 Ralph nights)

---

## 3. Recommended Technical Approach

### Recommendation: Option A (Frappe CRM Native + Custom Fields) with Selected Elements from Option C

**Rationale:**

Option A is the simplest path that respects DECISION-013. The gaps identified (activity timeline, consent tracking, cross-system linking) can be addressed with custom fields on Contact rather than a separate extension DocType, **for the initial implementation**. If the custom field approach proves insufficient (e.g., consent tracking needs a child table, activity timeline becomes unwieldy), Option C's SM CRM Extension can be introduced later without breaking changes.

**Specific implementation:**

1. **Custom fields on Contact** (added at provisioning):
   - `sm_medplum_patient_id` (Data) -- link to Medplum Patient
   - `sm_erpnext_customer_id` (Link to Customer) -- link to ERPNext billing account
   - `sm_date_of_birth` (Date) -- healthcare vertical
   - `sm_insurance_member_id` (Data) -- healthcare vertical
   - `sm_payer` (Link to SM Payer) -- healthcare vertical
   - `sm_referral_source` (Link to Organization) -- all verticals
   - `sm_preferred_pronouns` (Select: He/Him, She/Her, They/Them, Other) -- all verticals
   - `sm_communication_prefs` (JSON) -- structured communication preferences
   - `sm_hipaa_consent_date` (Date) -- healthcare vertical
   - `sm_treatment_consent_date` (Date) -- healthcare vertical
   - `sm_telehealth_consent_date` (Date) -- healthcare vertical
   - `sm_consent_status` (Select: Complete, Incomplete, Expired) -- computed field

2. **Custom fields on Lead** (added at provisioning):
   - `sm_referral_source` (Link to Organization)
   - `sm_referral_source_type` (Select: Physician, School, Self, Insurance Panel, Web, Other)
   - `sm_insurance_info` (Small Text) -- quick insurance notes
   - `sm_urgency` (Select: Routine, Urgent, Crisis)
   - `sm_clinical_concerns` (Small Text) -- brief reason for referral

3. **Lead stages reconfigured per vertical** via Sales Stage DocType:
   - Healthcare: Referred, Screening, Assessed, Accepted, Waitlisted, Declined
   - Hospitality: Inquiry, Quoted, Confirmed, Cancelled
   - Legal: Consultation Requested, Conflict Check, Consultation Scheduled, Engaged, Declined
   - Education: Inquiry, Trial Scheduled, Trial Completed, Enrolled, Waitlisted

4. **Activity timeline via Frappe Communication DocType:**
   - n8n writes CRM activities as Communication records (type = "Comment" or custom type)
   - The abstraction layer queries Communication for a given Contact and returns a chronological timeline
   - Activity types: clinical, billing, scheduling, communication, task, consent, system
   - Role-based filtering happens in the abstraction layer (not in Frappe)

5. **Duplicate detection:**
   - Real-time: on Lead/Contact creation, the abstraction layer runs a fuzzy match query and returns potential duplicates
   - Batch: nightly n8n workflow queries for duplicate candidates and creates SM Task for review

### Code Patterns

**Abstraction layer route (crm.py):**

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from auth import get_current_user, get_frappe_client
from typing import Optional

router = APIRouter(prefix="/api/modules/crm", tags=["crm"])

@router.get("/contacts/list")
async def list_contacts(
    q: Optional[str] = Query(None, description="Search query"),
    status: Optional[str] = Query(None),
    limit: int = Query(20, le=100),
    offset: int = Query(0),
    user=Depends(get_current_user),
    frappe=Depends(get_frappe_client),
):
    """List contacts with search and filtering."""
    filters = {}
    or_filters = {}
    
    if q:
        or_filters = {
            "first_name": ["like", f"%{q}%"],
            "last_name": ["like", f"%{q}%"],
            "email_id": ["like", f"%{q}%"],
            "phone": ["like", f"%{q}%"],
            "mobile_no": ["like", f"%{q}%"],
        }
    
    if status:
        filters["status"] = status
    
    fields = [
        "name", "first_name", "last_name", "email_id",
        "phone", "mobile_no", "company_name", "status",
        "sm_date_of_birth", "sm_payer", "sm_consent_status",
        "image", "modified",
    ]
    
    contacts = frappe.get_list(
        "Contact",
        filters=filters,
        or_filters=or_filters if or_filters else None,
        fields=fields,
        limit_page_length=limit,
        limit_start=offset,
        order_by="modified desc",
    )
    
    total = frappe.get_count("Contact", filters=filters)
    
    return {
        "data": contacts,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/contacts/{contact_id}")
async def get_contact(
    contact_id: str,
    user=Depends(get_current_user),
    frappe=Depends(get_frappe_client),
):
    """Get a single contact with activity timeline."""
    contact = frappe.get_doc("Contact", contact_id)
    
    # Get activity timeline
    activities = frappe.get_list(
        "Communication",
        filters={
            "reference_doctype": "Contact",
            "reference_name": contact_id,
        },
        fields=[
            "name", "subject", "content", "communication_type",
            "communication_medium", "creation", "sender",
        ],
        order_by="creation desc",
        limit_page_length=50,
    )
    
    return {
        "contact": contact,
        "activities": activities,
    }


@router.post("/contacts/create")
async def create_contact(
    data: dict,
    user=Depends(get_current_user),
    frappe=Depends(get_frappe_client),
):
    """Create a new contact."""
    contact = frappe.new_doc("Contact")
    contact.update(data)
    contact.insert()
    return {"data": contact}


@router.get("/contacts/{contact_id}/duplicates")
async def check_duplicates(
    contact_id: str,
    user=Depends(get_current_user),
    frappe=Depends(get_frappe_client),
):
    """Check for potential duplicate contacts."""
    contact = frappe.get_doc("Contact", contact_id)
    
    or_filters = []
    if contact.phone:
        or_filters.append(["phone", "=", contact.phone])
    if contact.mobile_no:
        or_filters.append(["mobile_no", "=", contact.mobile_no])
    if contact.email_id:
        or_filters.append(["email_id", "=", contact.email_id])
    
    if not or_filters:
        return {"duplicates": []}
    
    duplicates = frappe.get_list(
        "Contact",
        or_filters=or_filters,
        filters={"name": ["!=", contact_id]},
        fields=["name", "first_name", "last_name", "email_id", "phone"],
        limit_page_length=10,
    )
    
    return {"duplicates": duplicates}


@router.get("/leads/list")
async def list_leads(
    stage: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    limit: int = Query(20, le=100),
    offset: int = Query(0),
    user=Depends(get_current_user),
    frappe=Depends(get_frappe_client),
):
    """List leads with pipeline stage filtering."""
    filters = {}
    if stage:
        filters["sales_stage"] = stage  # Repurposed for intake stages
    if source:
        filters["source"] = source
    
    leads = frappe.get_list(
        "CRM Lead",
        filters=filters,
        fields=[
            "name", "first_name", "last_name", "email",
            "mobile_no", "organization", "status",
            "lead_owner", "source", "creation",
            "sm_referral_source", "sm_urgency",
        ],
        limit_page_length=limit,
        limit_start=offset,
        order_by="creation desc",
    )
    
    total = frappe.get_count("CRM Lead", filters=filters)
    
    return {
        "data": leads,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.post("/leads/{lead_id}/convert")
async def convert_lead(
    lead_id: str,
    user=Depends(get_current_user),
    frappe=Depends(get_frappe_client),
):
    """Convert a lead to a contact.
    
    This triggers n8n workflows to create:
    - ERPNext Customer (billing projection)
    - Medplum Patient (clinical projection, healthcare only)
    """
    lead = frappe.get_doc("CRM Lead", lead_id)
    
    # Create Contact from Lead data
    contact = frappe.new_doc("Contact")
    contact.first_name = lead.first_name
    contact.last_name = lead.last_name
    contact.email_id = lead.email
    contact.phone = lead.mobile_no
    contact.sm_referral_source = lead.sm_referral_source
    contact.insert()
    
    # Update Lead status
    lead.status = "Converted"
    lead.save()
    
    # n8n webhook will fire on Contact creation to:
    # 1. Create ERPNext Customer
    # 2. Create Medplum Patient (if healthcare vertical)
    # 3. Write CRM Activity
    
    return {
        "contact": contact,
        "lead_status": "Converted",
    }


@router.get("/search")
async def global_search(
    q: str = Query(..., min_length=2),
    user=Depends(get_current_user),
    frappe=Depends(get_frappe_client),
):
    """Global person search across Contacts, Leads, and Organizations."""
    results = {
        "contacts": [],
        "leads": [],
        "organizations": [],
    }
    
    search_filter = f"%{q}%"
    
    results["contacts"] = frappe.get_list(
        "Contact",
        or_filters={
            "first_name": ["like", search_filter],
            "last_name": ["like", search_filter],
            "email_id": ["like", search_filter],
            "phone": ["like", search_filter],
        },
        fields=["name", "first_name", "last_name", "email_id", "phone", "image"],
        limit_page_length=10,
    )
    
    results["leads"] = frappe.get_list(
        "CRM Lead",
        or_filters={
            "first_name": ["like", search_filter],
            "last_name": ["like", search_filter],
            "email": ["like", search_filter],
            "mobile_no": ["like", search_filter],
        },
        fields=["name", "first_name", "last_name", "email", "mobile_no", "status"],
        limit_page_length=10,
    )
    
    results["organizations"] = frappe.get_list(
        "CRM Organization",
        or_filters={
            "organization_name": ["like", search_filter],
        },
        fields=["name", "organization_name", "website"],
        limit_page_length=10,
    )
    
    return results


@router.get("/vocabulary")
async def get_vocabulary(
    user=Depends(get_current_user),
    frappe=Depends(get_frappe_client),
):
    """Return vocabulary mapping for the current tenant.
    
    The React CRM Mojo uses this to render labels dynamically.
    """
    # Read from SM Site Registry or tenant config
    site_name = frappe.get_site_name()
    
    # Default vocabulary (overridden per vertical template)
    vocabulary = {
        "person": "Client",
        "person_plural": "Clients",
        "organization": "Organization",
        "lead": "Lead",
        "lead_plural": "Leads",
        "intake": "Intake",
        "discharge": "Discharge",
    }
    
    # Try to load vertical-specific vocabulary
    try:
        site_config = frappe.get_doc("SM Site Registry", site_name)
        if hasattr(site_config, "vocabulary_config"):
            import json
            vocabulary.update(json.loads(site_config.vocabulary_config))
    except Exception:
        pass  # Use defaults
    
    return {"vocabulary": vocabulary}
```

**Frappe server script (Contact creation hook):**

```python
# frappe-apps/sm_widgets/sm_widgets/crm_hooks.py

import frappe

def on_contact_insert(doc, method):
    """When a new Contact is created, ensure cross-system links are initialized."""
    # Set consent status to Incomplete if healthcare vertical
    site_config = frappe.db.get_value("SM Site Registry", frappe.local.site, "vertical_template")
    if site_config == "behavioral_health":
        doc.sm_consent_status = "Incomplete"


def validate_contact(doc, method):
    """Validate Contact before save."""
    # Compute consent status for healthcare
    if hasattr(doc, "sm_hipaa_consent_date") and doc.sm_hipaa_consent_date:
        if hasattr(doc, "sm_treatment_consent_date") and doc.sm_treatment_consent_date:
            doc.sm_consent_status = "Complete"
        else:
            doc.sm_consent_status = "Incomplete"
```

---

## 4. Data Model Impact

### 4.1 DocTypes -- No New SM DocTypes for Initial Implementation

The recommended approach (Option A) does not create new SM DocTypes. It uses:

- **Contact** (Frappe core, extended by CRM) -- canonical person record
- **CRM Lead** (Frappe CRM) -- pre-qualification person record
- **CRM Organization** (Frappe CRM) -- entity record
- **CRM Deal** (Frappe CRM) -- optional sales pipeline (CORE add-on)
- **Sales Stage** (Frappe CRM) -- configurable pipeline stages
- **Communication** (Frappe core) -- activity timeline entries
- **Contract** (Frappe CRM) -- agreement management

### 4.2 Custom Fields Added at Provisioning

**On Contact DocType:**

| Field Name | Type | Label | Vertical | Required |
|-----------|------|-------|----------|----------|
| sm_medplum_patient_id | Data | Medplum Patient ID | Healthcare | No |
| sm_erpnext_customer_id | Link (Customer) | Billing Account | All | No |
| sm_date_of_birth | Date | Date of Birth | Healthcare, Education | Yes (Healthcare) |
| sm_insurance_member_id | Data | Insurance Member ID | Healthcare | No |
| sm_payer | Link (SM Payer) | Insurance Payer | Healthcare | No |
| sm_payer_plan_type | Select | Plan Type | Healthcare | No |
| sm_referral_source | Link (CRM Organization) | Referral Source | All | No |
| sm_referral_source_type | Select | Referral Source Type | All | No |
| sm_preferred_pronouns | Select | Preferred Pronouns | All | No |
| sm_communication_prefs | JSON | Communication Preferences | All | No |
| sm_hipaa_consent_date | Date | HIPAA Consent Date | Healthcare | No |
| sm_treatment_consent_date | Date | Treatment Consent Date | Healthcare | No |
| sm_telehealth_consent_date | Date | Telehealth Consent Date | Healthcare | No |
| sm_consent_status | Select | Consent Status | Healthcare | No |
| sm_loyalty_tier | Select | Loyalty Tier | Hospitality | No |
| sm_room_preferences | JSON | Room Preferences | Hospitality | No |
| sm_dietary_restrictions | Small Text | Dietary Restrictions | Hospitality | No |
| sm_conflict_check_status | Select | Conflict Check Status | Legal | No |
| sm_engagement_letter_date | Date | Engagement Letter Date | Legal | No |
| sm_instrument | Data | Instrument | Education | No |
| sm_skill_level | Select | Skill Level | Education | No |
| sm_parent_contact | Link (Contact) | Parent/Guardian | Education | No |

**On CRM Lead DocType:**

| Field Name | Type | Label | Vertical | Required |
|-----------|------|-------|----------|----------|
| sm_referral_source | Link (CRM Organization) | Referral Source | All | No |
| sm_referral_source_type | Select | Source Type | All | No |
| sm_insurance_info | Small Text | Insurance Notes | Healthcare | No |
| sm_urgency | Select | Urgency Level | Healthcare | No |
| sm_clinical_concerns | Small Text | Clinical Concerns | Healthcare | No |

### 4.3 Field Constraints and Validation

- `sm_date_of_birth`: Must be in the past. Must be at least 0 years old. If minor (under 18), `sm_parent_contact` becomes required (education vertical).
- `sm_consent_status`: Computed field. Not directly editable. Updated by validate hook based on consent date fields.
- `sm_payer`: Only valid if SM Payer DocType exists on the site (healthcare vertical only).
- `sm_medplum_patient_id`: Read-only after creation. Set by n8n workflow on Lead conversion.
- `sm_erpnext_customer_id`: Read-only after creation. Set by n8n workflow on Lead conversion.

---

## 5. Integration Points

### 5.1 Abstraction Layer API Endpoints

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/modules/crm/contacts/list` | GET | List contacts with search, filter, pagination | Bearer token |
| `/api/modules/crm/contacts/{id}` | GET | Get contact with activity timeline | Bearer token |
| `/api/modules/crm/contacts/create` | POST | Create new contact | Bearer token |
| `/api/modules/crm/contacts/{id}/update` | PUT | Update contact fields | Bearer token |
| `/api/modules/crm/contacts/{id}/merge` | POST | Merge two contacts | Bearer token (Manager role) |
| `/api/modules/crm/contacts/{id}/duplicates` | GET | Check for duplicates | Bearer token |
| `/api/modules/crm/leads/list` | GET | Lead pipeline list | Bearer token |
| `/api/modules/crm/leads/{id}` | GET | Lead detail | Bearer token |
| `/api/modules/crm/leads/create` | POST | Create lead | Bearer token |
| `/api/modules/crm/leads/{id}/update` | PUT | Update lead | Bearer token |
| `/api/modules/crm/leads/{id}/convert` | POST | Convert lead to contact | Bearer token (Intake role) |
| `/api/modules/crm/organizations/list` | GET | List organizations | Bearer token |
| `/api/modules/crm/organizations/{id}` | GET | Org with linked contacts | Bearer token |
| `/api/modules/crm/organizations/create` | POST | Create organization | Bearer token |
| `/api/modules/crm/activities/{contact_id}` | GET | Activity timeline | Bearer token |
| `/api/modules/crm/activities/create` | POST | Manual activity note | Bearer token |
| `/api/modules/crm/search` | GET | Global search | Bearer token |
| `/api/modules/crm/vocabulary` | GET | Vocabulary mapping | Bearer token |
| `/api/modules/crm/stages` | GET | Pipeline stages | Bearer token |

### 5.2 n8n Workflows

| Workflow | Trigger | Source | Target | Description |
|----------|---------|--------|--------|-------------|
| Lead Accepted | Lead status change to "Accepted" | Frappe CRM | ERPNext + Medplum | Create Customer + Patient |
| Contact Updated | Contact save webhook | Frappe CRM | Medplum | Sync demographics to Patient |
| Clinical Event -> Activity | Medplum FHIR subscription | Medplum | Frappe CRM | Write activity (encounter, assessment) |
| Billing Event -> Activity | ERPNext webhook | ERPNext | Frappe CRM | Write activity (invoice, payment, claim) |
| Scheduling Event -> Activity | Medplum FHIR subscription | Medplum | Frappe CRM | Write activity (appointment booked/cancelled) |
| Task Event -> Activity | SM Task webhook | Frappe | Frappe CRM | Write activity (task completed) |
| Duplicate Detection | Cron (nightly) | n8n | Frappe | Flag potential duplicates |
| Consent Expiration Check | Cron (daily) | n8n | Frappe | Create tasks for expired consents |

### 5.3 Medplum FHIR Integration

| CRM Field | FHIR Patient Field | Sync Direction |
|-----------|-------------------|----------------|
| first_name | name[0].given[0] | CRM -> Medplum |
| last_name | name[0].family | CRM -> Medplum |
| sm_date_of_birth | birthDate | CRM -> Medplum |
| phone | telecom[phone] | CRM -> Medplum |
| email_id | telecom[email] | CRM -> Medplum |
| sm_preferred_pronouns | extension[pronouns] | CRM -> Medplum |
| (CRM Contact ID) | identifier[0] | CRM -> Medplum (set once) |
| sm_medplum_patient_id | id | Medplum -> CRM (set once) |

### 5.4 ERPNext Integration

| CRM Field | ERPNext Customer Field | Sync Direction |
|-----------|----------------------|----------------|
| first_name + last_name | customer_name | CRM -> ERPNext |
| email_id | email | CRM -> ERPNext |
| phone | phone | CRM -> ERPNext |
| (CRM Contact ID) | sm_crm_contact_id (custom) | CRM -> ERPNext (set once) |
| sm_erpnext_customer_id | name | ERPNext -> CRM (set once) |

---

## 6. Cross-Cutting Concerns

### 6.1 Provisioning

CRM / Client Identity provisioning happens during site creation:

1. Frappe CRM app is already installed (KERNEL -- always present)
2. Custom fields are added based on vertical template
3. Sales Stages are configured based on vertical template
4. CRM roles are assigned to default users
5. Vocabulary configuration is written to SM Site Registry
6. Default CRM Settings are applied (source options, assignment rules)

**Provisioning template addition (behavioral_health.yaml):**

```yaml
crm:
  custom_fields:
    contact:
      - sm_date_of_birth
      - sm_insurance_member_id
      - sm_payer
      - sm_payer_plan_type
      - sm_referral_source
      - sm_referral_source_type
      - sm_preferred_pronouns
      - sm_communication_prefs
      - sm_hipaa_consent_date
      - sm_treatment_consent_date
      - sm_telehealth_consent_date
      - sm_consent_status
      - sm_medplum_patient_id
      - sm_erpnext_customer_id
    lead:
      - sm_referral_source
      - sm_referral_source_type
      - sm_insurance_info
      - sm_urgency
      - sm_clinical_concerns
  stages:
    - Referred
    - Screening
    - Assessed
    - Accepted
    - Waitlisted
    - Declined
  vocabulary:
    person: "Client"
    person_plural: "Clients"
    lead: "Referral"
    lead_plural: "Referrals"
    intake: "Intake"
    discharge: "Discharge"
  roles:
    - SM CRM Reader
    - SM CRM Editor
    - SM CRM Manager
    - SM CRM Intake
```

### 6.2 Permissions

See Workflow Research Section 9 for full role mapping.

Implementation:
- 4 SM CRM roles created in Frappe
- DocType Permissions set per role on Contact, CRM Lead, CRM Organization
- User Permissions for caseload restriction (clinician sees own patients only)
- Field-level permissions on sensitive fields (consent dates, insurance)
- Abstraction layer filters activity timeline by role (clinical activities hidden from billing staff)

### 6.3 Multi-Tenancy

- Each tenant has its own Frappe site with its own CRM data
- No cross-tenant data access except through Admin Console (admin.sparkmojo.com)
- Custom fields are per-site (Frappe's Custom Field is site-scoped)
- CRM vocabulary and stages are per-site
- HIPAA isolation is architectural (site-per-client per DECISION-004)

### 6.4 AI Integration

| AI Feature | Model | Trigger | Description |
|-----------|-------|---------|-------------|
| Intake triage | Nova Micro + Haiku 4.5 | Lead creation | Auto-check insurance, suggest provider, suggest time |
| Duplicate detection | Nova Micro | Contact creation | Fuzzy name/phone/email match scoring |
| Activity summarization | Haiku 4.5 | Contact view | "Last 30 days: 3 sessions, PHQ-9 improved, balance $0" |
| Referral source insights | Nova Pro | Monthly report | "Top 3 referral sources, conversion rates, trends" |
| Smart search | Haiku 4.5 | Search query | Natural language search: "patients with anxiety who haven't been seen in 30 days" |

### 6.5 Notifications

| Event | Notification | Channel | Role |
|-------|-------------|---------|------|
| New Lead created | "New referral: [name] from [source]" | In-app + email | Intake Coordinator |
| Lead waiting > 48 hours | "Referral [name] has been waiting [X] days" | In-app | Intake Coordinator, Manager |
| Consent expiring | "Consent renewal needed for [name]" | In-app + SM Task | Front Desk |
| Duplicate detected | "Potential duplicate: [name] matches [existing]" | In-app | Manager |
| Lead converted | "New client: [name] -- records created" | In-app | Manager |

### 6.6 Workflow

Lead lifecycle managed via Frappe Workflow:
- States: Open, Contacted, Qualified, Accepted, Waitlisted, Declined, Converted, Lost
- Transitions: role-gated (only Intake Coordinator can move to Accepted)
- Actions: on transition to Accepted, trigger n8n workflow for Customer/Patient creation

---

## 7. Dependencies

### 7.1 HARD Dependencies (Must Exist Before CRM Build)

| Dependency | Status | Notes |
|-----------|--------|-------|
| Frappe CRM installed on poc-dev | DONE | Installed in INFRA-007, verified MEGA-001 |
| Abstraction layer running | DONE | FastAPI running on poc-dev |
| SM Site Registry DocType | BUILT | Exists in sm_provisioning |
| Frappe REST API access | DONE | Verified in MEGA-001 |

### 7.2 SOFT Dependencies (Nice to Have, Not Blocking)

| Dependency | Status | Notes |
|-----------|--------|-------|
| Medplum infrastructure | BUILT | D020 Phase 1 complete. Patient creation pathway exists. |
| SM Payer DocType | BUILT | Exists in sm_billing (BILL stories). |
| n8n instance | BUILT | Running on VPS. |
| Frappe Workflow configured | NOT STARTED | Can be added after initial CRM build. |
| AI Infrastructure (AWS Bedrock) | NOT STARTED | AI features are Phase 2 enhancements. |

### 7.3 PROVIDES TO (Downstream Dependents)

| Downstream | What CRM Provides | Notes |
|-----------|-------------------|-------|
| Healthcare Billing Mojo | Patient identity (Contact -> Customer link) | Billing needs `sm_erpnext_customer_id` on Contact |
| Clinical Documentation (Medplum) | Patient identity (Contact -> Patient link) | Clinical needs `sm_medplum_patient_id` on Contact |
| SchedulerMojo | Person to schedule for | Scheduler needs Contact record to book appointments against |
| Task & Workboard | Person context for tasks | Tasks reference a Contact for person-related work |
| Notification Infrastructure | Person context for notifications | Notifications reference Contact for person-specific alerts |
| Analytics / Reporting | Person data for reports | Reports query Contact data for metrics |

### 7.4 DATA Dependencies

| Data | Source | When Needed |
|------|--------|-------------|
| SM Payer list | sm_billing (BILL stories) | Before healthcare intake workflow works end-to-end |
| Vertical template configs | sm_provisioning | Before multi-vertical provisioning |
| Therapist/provider list | Employee DocType or Medplum Practitioner | Before intake triage AI works |
| Referral source organizations | Manual or import | Before referral tracking is useful |

---

## 8. Effort Estimate

### 8.1 Story Breakdown

| Story | Description | Size | Dependencies |
|-------|-------------|------|-------------|
| CRM-001 | Abstraction layer CRM routes (contacts CRUD) | M | None |
| CRM-002 | Abstraction layer CRM routes (leads CRUD + pipeline) | M | CRM-001 |
| CRM-003 | Abstraction layer CRM routes (organizations, search, vocabulary) | S | CRM-001 |
| CRM-004 | Custom fields provisioning (healthcare vertical) | M | CRM-001 |
| CRM-005 | Lead stages configuration per vertical | S | CRM-002 |
| CRM-006 | React CRM Mojo -- Contact list + search | L | CRM-001, CRM-003 |
| CRM-007 | React CRM Mojo -- Contact detail + activity timeline | L | CRM-006 |
| CRM-008 | React CRM Mojo -- Lead pipeline (Kanban) | L | CRM-002, CRM-005 |
| CRM-009 | n8n: Lead conversion workflow (Contact + Customer + Patient) | M | CRM-002, Medplum |
| CRM-010 | n8n: Cross-system activity capture (D020-5 events) | L | CRM-007, n8n, Medplum |
| CRM-011 | Duplicate detection (real-time + batch) | M | CRM-001 |
| CRM-012 | CRM roles and permissions | S | CRM-001 |
| CRM-013 | Consent tracking (healthcare vertical) | M | CRM-004 |
| CRM-014 | Contact merge functionality | M | CRM-001, CRM-011 |

### 8.2 T-Shirt Summary

| Metric | Value |
|--------|-------|
| **T-shirt size** | **M-L** |
| **Story count** | **14 stories** |
| **Ralph nights (estimated)** | **6-9 nights** |
| **Calendar weeks** | **2-3 weeks** |
| **Abstraction layer routes** | **~15 endpoints** |
| **React components** | **3-4 Mojo views** |
| **n8n workflows** | **4-6 workflows** |
| **Custom fields** | **~25 fields across 2 DocTypes** |

### 8.3 Scale Projections

| Scale | CRM Contacts | Activity Records | Performance Concern |
|-------|-------------|-----------------|-------------------|
| Pilot (1 practice, 200 patients) | 200-500 | 5,000-10,000 | None |
| Small rollout (10 practices) | 2,000-5,000 per site | 50,000-100,000 per site | None |
| Mid rollout (50 practices) | Same per site (site isolation) | Same per site | MariaDB indexing on Communication table |
| Large (100+ practices) | Same per site | Same per site | Communication table partitioning may be needed for high-activity practices |

Performance is not a concern at anticipated scale because of site-per-client isolation. Each site has its own database. The largest behavioral health practice would have ~5,000 contacts and ~100,000 activities. MariaDB handles this trivially.

---

## 9. Risks and Gotchas

### 9.1 Frappe CRM Version Risk

**Risk:** Frappe CRM is on v2.0.0-dev (develop branch). Breaking changes could occur.
**Severity:** MEDIUM
**Mitigation:** Pin Frappe CRM version in Dockerfile.frappe. Only upgrade after testing. Custom fields survive upgrades. Abstraction layer insulates React from Frappe API changes.

### 9.2 Communication DocType as Activity Store

**Risk:** Using Frappe's Communication DocType for cross-system activities may conflict with Frappe's email communication handling. Communication has specific handling for email/SMS that may not work well for arbitrary activities.
**Severity:** MEDIUM
**Mitigation:** Use Communication with `communication_type = "Other"` for non-email activities. If this proves problematic, create an `SM CRM Activity` DocType (Option C's approach) as a fallback. Monitor Communication table size.

### 9.3 Custom Field Proliferation

**Risk:** Adding 20+ custom fields per vertical across multiple DocTypes creates maintenance burden. Frappe Custom Fields are global per site but the provisioning system must track which fields belong to which template.
**Severity:** LOW
**Mitigation:** Custom field names are prefixed `sm_` for easy identification. Provisioning templates are the source of truth for which fields exist on which vertical. Unused fields are invisible (not deleted) on other verticals.

### 9.4 Duplicate Detection False Positives

**Risk:** Name-based duplicate detection will produce false positives, especially for common names. Phone/email matching is more reliable but many contacts share the same household phone.
**Severity:** LOW
**Mitigation:** Duplicates are flagged, not auto-merged. Staff reviews and decides. Confidence scoring (exact match > partial match > name-only match) helps prioritize.

### 9.5 Contact vs. CRM Lead Naming

**Risk:** Frappe CRM uses "CRM Lead" (not "Lead") as the DocType name. The old ERPNext CRM module also has a "Lead" DocType. If both are present, API calls must use the correct DocType name.
**Severity:** LOW
**Mitigation:** The abstraction layer always uses the correct DocType name. The React Mojo never calls Frappe directly. Document this clearly in the story specs.

### 9.6 Activity Timeline Volume

**Risk:** Long-term patients accumulate hundreds or thousands of activity entries. Loading the full timeline on contact view could be slow.
**Severity:** LOW
**Mitigation:** Paginate activity timeline (50 entries per page). Add "load more" or infinite scroll. Add date range filter. Consider archiving activities older than 2 years to a separate table.

---

## 10. Questions for Architecture Session

1. **Activity storage mechanism:** Should cross-system activities be stored as Frappe Communication records (simple, but email-centric) or as a new SM CRM Activity DocType (clean, but adds a DocType)? The Communication approach is simpler to implement but may hit edge cases with Frappe's email handling assumptions.

2. **Vocabulary mapping granularity:** Should vocabulary be a JSON blob on SM Site Registry, or a dedicated SM Vocabulary Config DocType with per-field label overrides? JSON blob is simpler. Dedicated DocType is more maintainable at scale.

3. **CRM Deal (sales pipeline) activation:** Should Deal be available on all verticals with a feature flag, or only provisioned on verticals that explicitly need it (consulting, agency)? Feature flag approach is simpler but means unused DocType data exists on sites that don't need it.

4. **Frappe CRM Vue frontend disposition:** Should the Vue frontend be completely disabled (remove from nginx routing), available but hidden (accessible at /crm but not linked), or available as a power-user option? Recommendation: available but hidden, for admin debugging.

5. **Lead auto-conversion:** For verticals with no qualification step (e.g., walk-in music school enrollment), should Lead creation auto-convert to Contact, or should those verticals skip Lead entirely and create Contact directly? Auto-conversion keeps the data model consistent. Skipping Lead is simpler for the user but loses source attribution.

6. **Contact image/photo:** Should Contact records store a profile photo? If yes, where is the photo stored (Frappe File, S3)? Frappe natively supports an `image` field on Contact. This is a nice-to-have for visual recognition in the CRM Mojo but adds storage considerations.

---

*End of Technical Research. Next: CRM-CLIENT-IDENTITY-AI-ANALYSIS.md*

``````markdown
# CRM / Client Identity -- Workflow Research

**Capability:** CRM / Client Identity
**Tier:** KERNEL
**Status:** BACKLOG (unblocked per D019-G)
**Researcher:** Claude Code (Capability Deep Dive)
**Date:** April 6, 2026
**Authority:** DECISION-013 (Frappe CRM as canonical hub), DECISION-020 (CRM Contact as canonical identity)

---

## 1. What This Capability IS (Scope Definition)

### In Scope

CRM / Client Identity is the **canonical person record** for the entire Spark Mojo platform. Every person who has a relationship with a business -- at any lifecycle stage, in any system -- has a Frappe CRM record. This capability covers:

- **Person identity management.** Creating, reading, updating, merging, and archiving person records. The CRM Contact is the single lookup entry point for any person across the platform.
- **Relationship lifecycle tracking.** From first contact (Lead) through active engagement (Contact/Customer) through dormancy or churn. Every stage is represented.
- **Organization management.** Companies, practices, referral sources, payer organizations -- any entity that is not a natural person but has a business relationship.
- **Communication history.** Email, phone, SMS, in-app -- all communication with a person is captured as CRM activity.
- **Referral and intake pipeline.** Tracking how people arrive (source attribution) and move through qualification into active status.
- **Contact segmentation and search.** Finding people by attributes, tags, custom fields, relationship type, or status.
- **Cross-system identity linking.** CRM Contact links to Medplum Patient (clinical projection), ERPNext Customer (billing projection), and any future system projections.
- **Activity feed / timeline.** A unified view of everything that has happened with a person, across all systems, captured via n8n activity writes.
- **Vocabulary abstraction.** The same underlying data model serves all verticals, but the UI labels and workflow stages are configurable per tenant (patient vs. guest vs. client vs. student).
- **Consent and communication preferences.** Opt-in/opt-out for communication channels, marketing consent, HIPAA authorization tracking (healthcare vertical).

### Out of Scope

- **Clinical documentation.** Owned by Medplum (DECISION-020). CRM shows clinical summary but does not store clinical records.
- **Billing and invoicing.** Owned by ERPNext Accounting + sm_billing. CRM links to the billing account but does not process payments.
- **Scheduling.** Owned by SchedulerMojo / Medplum Appointment. CRM shows next appointment but does not manage the calendar.
- **Sales pipeline / deal management.** Traditional CRM deal tracking (revenue forecasting, win/loss, competitor analysis) is available in Frappe CRM but is a CORE add-on, not KERNEL. The KERNEL scope is the person record and relationship lifecycle.
- **Marketing automation.** Email campaigns, drip sequences, landing pages. These are Frappe CRM features but are CORE, not KERNEL.
- **User authentication.** Frappe native auth is a separate KERNEL capability.

### Boundary Clarifications

| Question | Answer |
|----------|--------|
| Is the CRM Contact the same as a Frappe User? | No. A CRM Contact is a person the business has a relationship with. A User is someone who logs into the platform. A staff member is both a User and a Contact (employee record). A client is a Contact but never a User (unless client portal is built). |
| Where does Lead end and Contact begin? | Lead is the pre-qualification record. When a Lead is accepted/converted, a Contact is created (or the Lead is promoted). The Lead record persists for source attribution. |
| Who owns the person record if they exist in multiple systems? | CRM Contact. Always. Medplum Patient and ERPNext Customer are projections linked via identifier fields. CRM is the lookup entry point. |
| Is Organization a separate capability? | No. Organization management is part of CRM / Client Identity. An Organization is a container for Contacts (e.g., a referral source, a payer, an employer). |

---

## 2. Universal Business Analysis

### 2.1 Healthcare (Behavioral Health Practice)

**Person types:** Patient/Client, Referral Source (physician, school counselor), Insurance Payer Contact, Emergency Contact, Guardian/Parent (minors)

**Lifecycle:** Referral received -> Screened (insurance verified, availability checked) -> Intake scheduled -> Intake completed -> Active client -> Discharged/Inactive -> Re-engaged

**Data standards:**
- HIPAA Privacy Rule: all person data containing health information is PHI. CRM stores demographic data (name, DOB, phone, address, insurance) which becomes PHI when linked to clinical records. Minimum necessary standard applies.
- 42 CFR Part 2: Substance use disorder records have additional federal protections beyond HIPAA. Consent for disclosure is required before sharing any SUD treatment information.
- FHIR R4: Patient resource is the clinical projection of the CRM Contact. Linked via `identifier[0].system = "https://sparkmojo.com/crm-contact"`.

**Regulatory requirements:**
- Business Associate Agreement (BAA) required with any vendor storing PHI
- Consent tracking: HIPAA authorization, treatment consent, telehealth consent, communication preferences
- Right of access: patients can request all their records within 30 days
- Accounting of disclosures: must track every time PHI is shared with a third party
- Breach notification: 60-day notification requirement for PHI breaches affecting 500+ individuals

**Unique fields:** Date of birth, insurance member ID, payer name, referral source, primary diagnosis (display only -- clinical detail in Medplum), emergency contact, preferred pronouns, communication preferences (no voicemail with clinical info, etc.)

### 2.2 Hospitality (Boutique Hotel)

**Person types:** Guest, Corporate Booker, Travel Agent, Group Contact, VIP/Loyalty Member

**Lifecycle:** Inquiry -> Reservation -> Check-in -> In-house -> Check-out -> Post-stay follow-up -> Repeat guest

**Data standards:**
- PCI-DSS: Credit card data must not be stored in the CRM. Only last-4 reference.
- GDPR (if international guests): Right to erasure, data portability, consent for marketing.
- No industry-specific CRM standard. PMS (Property Management System) is the operational system of record for stays; CRM is the relationship layer.

**Regulatory requirements:**
- Guest data retention policies vary by jurisdiction
- Marketing consent (CAN-SPAM, GDPR)
- No healthcare-level consent tracking needed

**Unique fields:** Loyalty tier, stay history count, room preferences (floor, bed type, pillow type), dietary restrictions, anniversary/birthday, corporate rate code, travel agent commission rate

### 2.3 Legal (Small Law Firm)

**Person types:** Client, Opposing Party, Witness, Expert Witness, Court Contact, Referral Source (other attorneys), Co-counsel

**Lifecycle:** Consultation request -> Conflict check -> Initial consultation -> Engagement letter signed -> Active matter -> Matter closed -> Alumni client

**Data standards:**
- ABA Model Rules: Client confidentiality (Rule 1.6). Conflict of interest checking (Rules 1.7-1.10) requires knowing all parties across all matters.
- Trust accounting: Client funds held in IOLTA accounts must be tracked separately. The billing projection (ERPNext Customer) handles this, but CRM must link to it.
- No federal data standard equivalent to HIPAA for legal, but attorney-client privilege creates similar confidentiality obligations.

**Regulatory requirements:**
- Conflict of interest checking: before accepting any new client, must search all existing and past clients, opposing parties, and related parties. This is a CRM search function.
- Engagement letter tracking: equivalent to consent tracking in healthcare
- Matter-based access control: staff on one matter should not see another matter's data without authorization

**Unique fields:** Conflict check status, engagement letter date, matter type, billing arrangement (hourly/flat/contingency), responsible attorney, originating attorney, referral source

### 2.4 Education (Music School / Tutoring Center)

**Person types:** Student, Parent/Guardian (for minors), Teacher/Instructor, Referral Source

**Lifecycle:** Inquiry -> Trial lesson -> Enrollment -> Active student -> Semester break -> Re-enrollment -> Graduated/Withdrawn

**Data standards:**
- FERPA (if receiving federal funds): Protects student education records. Similar to HIPAA but for education.
- No industry CRM standard for small music schools. Larger institutions use Student Information Systems (SIS).

**Regulatory requirements:**
- Minor consent: parent/guardian must consent for students under 18
- Photo/video consent for recitals and marketing
- Background check tracking for instructors working with minors

**Unique fields:** Instrument(s), skill level, lesson day/time preference, parent contact (linked Contact), enrollment date, semester, recital participation, practice log access

### 2.5 Cross-Vertical Patterns

| Pattern | Healthcare | Hospitality | Legal | Education |
|---------|-----------|-------------|-------|-----------|
| Person vocabulary | Patient/Client | Guest | Client | Student |
| Organization vocabulary | Practice/Payer | Hotel/Agency | Firm/Court | School/Studio |
| Intake pipeline | Referral -> Screened -> Accepted | Inquiry -> Booked | Consult -> Conflict check -> Engaged | Inquiry -> Trial -> Enrolled |
| Consent tracking | HIPAA authorization, treatment consent | Marketing consent | Engagement letter | Parent consent, photo consent |
| Regulatory framework | HIPAA, 42 CFR Part 2 | PCI-DSS, GDPR | ABA Rules, privilege | FERPA |
| Relationship multiplicity | 1 patient : many providers | 1 guest : many stays | 1 client : many matters | 1 student : many enrollments |
| Source attribution | Referral source tracking | Channel tracking | Referral attorney | Word of mouth / web |

**Universal truth:** Every vertical needs a person record, an organization record, a way to track how the person arrived, a lifecycle pipeline, communication history, and consent management. The data model is the same. The vocabulary and validation rules differ.

---

## 3. Competitive Landscape

### 3.1 HubSpot CRM

**Product:** HubSpot CRM (Free, Starter, Professional, Enterprise)
**Target:** SMB to mid-market. Strong inbound marketing heritage.

**Pricing (2026):**
- Free: Unlimited users, 1M contacts, basic CRM features
- Starter: $20/seat/month (or $15/seat/month annual). Promotional rate: $9/seat/month for new customers.
- Professional: $800/month (3 seats included). $1,500 one-time onboarding fee.
- Enterprise: $3,600/month (5 seats included).

**Strengths:**
- Exceptional free tier. Unlimited users with meaningful CRM functionality.
- Best-in-class inbound marketing integration (forms, landing pages, blog, SEO)
- Intuitive UI. Low training burden. Staff can self-serve within days.
- Massive app marketplace (1,500+ integrations)
- Strong reporting and dashboard builder at Professional tier
- Contact timeline is industry-leading -- every interaction in one view

**Weaknesses:**
- Steep price jump: Starter ($15/seat) to Professional ($800/month) is a 50x increase. Most SMBs hit this wall within 12-18 months.
- Contact-based pricing at scale becomes expensive. 10,000+ contacts = significant cost.
- No healthcare-specific features. No HIPAA BAA available on standard plans. HubSpot explicitly disclaims PHI storage.
- No multi-tenancy. One HubSpot account per business. Cannot serve as a platform CRM for a multi-tenant SaaS.
- Vendor lock-in. Data export is possible but workflow/automation recreation is painful.
- No self-hosting option. Cloud-only.

**SMB Fit:** Excellent for marketing-led SMBs (agencies, SaaS startups, e-commerce). Poor for regulated industries (healthcare, legal) and businesses that need data sovereignty.

### 3.2 Salesforce (Starter / Essentials)

**Product:** Salesforce Starter (formerly Essentials)
**Target:** SMB entry point into the Salesforce ecosystem.

**Pricing (2026):**
- Starter: $25/user/month (billed annually)
- Professional: $80/user/month
- Enterprise: $165/user/month
- Unlimited: $330/user/month

**Strengths:**
- Industry standard. "Nobody gets fired for buying Salesforce."
- Einstein AI integration at higher tiers (predictive lead scoring, opportunity insights)
- AppExchange: 5,000+ apps including healthcare-specific (Veeva, Health Cloud)
- Salesforce Health Cloud exists for healthcare verticals ($300/user/month)
- Extremely customizable. Custom objects, flows, Apex code, Lightning components.
- Strong ecosystem of implementation partners and developers

**Weaknesses:**
- Complexity. Salesforce requires dedicated admin time even at Starter tier. Average SMB takes 3-6 months to fully configure.
- Cost compounds rapidly. $25/user starts affordable but Professional ($80) and Enterprise ($165) add up fast for 10+ user teams.
- Health Cloud is priced for enterprise ($300/user/month). A 5-therapist practice paying $1,500/month for CRM alone is untenable.
- Implementation cost. Average Salesforce implementation for SMB: $5,000-$75,000 depending on complexity.
- No self-hosting. Cloud-only. Data residency concerns for HIPAA (though Salesforce offers BAA on Shield).
- Over-engineered for most SMBs. A 3-person music school does not need Salesforce.

**SMB Fit:** Best for SMBs that plan to grow into mid-market and want a CRM they will not outgrow. Poor for micro-businesses (1-10 employees) due to complexity and cost.

### 3.3 Zoho CRM

**Product:** Zoho CRM (Free, Standard, Professional, Enterprise, Ultimate)
**Target:** Cost-conscious SMBs. Strong in emerging markets.

**Pricing (2026):**
- Free: Up to 3 users. Basic CRM.
- Standard: $14/user/month (annual) or $20/user/month (monthly)
- Professional: $23/user/month (annual) or $35/user/month (monthly)
- Enterprise: $40/user/month (annual)
- Ultimate: $52/user/month (annual)

**Strengths:**
- Best price-to-feature ratio in the market. Professional at $23/user/month includes workflow automation, Blueprint process management, and web forms.
- Zoho One bundle: $45/employee/month for 45+ apps (CRM, Books, People, Desk, Projects, etc.). Closest competitor to the Spark Mojo "universal business OS" vision.
- Multi-channel communication: email, phone, social, live chat, web forms
- Canvas Design Studio: visual CRM page builder for custom layouts per vertical
- Vertical CRM editions: Zoho for healthcare, real estate, insurance, education
- Self-hosted option via Zoho Creator (limited)
- HIPAA compliance available on Enterprise tier with BAA

**Weaknesses:**
- UI is functional but dated compared to HubSpot. Training burden is moderate.
- Integration quality varies. Native integrations are shallow compared to HubSpot/Salesforce marketplace depth.
- Vertical editions are configuration presets, not deep domain solutions. Healthcare CRM is relabeled fields, not clinical workflow.
- Customer support quality is inconsistent. Response times vary significantly by tier.
- Data migration tools are basic. Moving from Zoho to another platform is friction-heavy.
- No true multi-tenancy for platform builders. Each business needs its own Zoho account.

**SMB Fit:** Excellent for cost-conscious SMBs that want broad functionality without enterprise pricing. The Zoho One bundle is the most direct competitor to Spark Mojo's value proposition.

### 3.4 Frappe CRM (Open Source)

**Product:** Frappe CRM v2 (open source, self-hosted or Frappe Cloud)
**Target:** ERPNext ecosystem users, open-source advocates, businesses wanting data sovereignty.

**Pricing:**
- Self-hosted: Free (open source, MIT license)
- Frappe Cloud: $10/site/month (Starter), $25/site/month (Business)
- No per-user fees. Unlimited users on all plans.

**Strengths:**
- Truly unlimited users. A 50-person practice pays the same as a 3-person practice.
- Full source code access. Any customization is possible.
- Deep ERPNext integration. Lead -> Customer -> Sales Invoice pipeline is native.
- Modern Vue 3 frontend with Kanban boards, side panel layout builder, email integration
- Custom fields via UI (no code). Side panel layout builder for per-DocType customization.
- WhatsApp integration built-in
- Telephony integration (Exotel, Twilio)
- Self-hosted = full data sovereignty. HIPAA compliance is an infrastructure decision, not a vendor limitation.

**Weaknesses:**
- Small community compared to HubSpot/Salesforce/Zoho. Fewer integrations, fewer tutorials, fewer implementation partners.
- Vue 2 -> Vue 3 transition created instability in 2024-2025. v2 is stable but still maturing.
- No native HIPAA compliance features. Self-hosted means you own the compliance burden.
- Limited marketing automation compared to HubSpot. No landing page builder, limited email campaign features.
- Documentation is sparse. API documentation is adequate but workflow/customization guides are thin.
- No mobile app. Responsive web only.
- CRM is a separate Frappe app from ERPNext. Installation and version management adds complexity.

**SMB Fit:** Excellent for businesses that value data ownership and are in the ERPNext ecosystem. Poor for businesses that want turnkey setup with no technical involvement.

### 3.5 Competitive Summary

| Feature | HubSpot | Salesforce | Zoho | Frappe CRM | Spark Mojo (target) |
|---------|---------|------------|------|-----------|-------------------|
| Price (5 users) | $75-100/mo | $125/mo | $70-115/mo | Free (self-hosted) | Included in subscription |
| Unlimited users | Yes (free tier) | No | No | Yes | Yes |
| Healthcare HIPAA | No BAA | Shield ($) | Enterprise BAA | Self-managed | Built-in (DECISION-012) |
| Multi-tenancy | No | No | No | Site-per-client | Site-per-client |
| Self-hosted | No | No | Limited | Yes | Yes |
| Vertical vocabulary | No | Custom objects | Preset editions | Custom fields | Provisioning templates |
| Activity timeline | Excellent | Good | Good | Basic | Target: excellent |
| AI features | ChatSpot | Einstein | Zia | None | AWS Bedrock (KERNEL) |
| Open source | No | No | No | Yes (MIT) | Yes (custom apps) |

---

## 4. Behavioral Health Vertical Overlay

### 4.1 Patient vs. Client Terminology

Behavioral health practices vary in terminology preferences:
- **"Patient"** -- used by psychiatrists, clinical psychologists, and practices affiliated with medical systems. Implies a medical model.
- **"Client"** -- used by counselors, social workers, and practices emphasizing therapeutic alliance. Implies a collaborative model.
- **"Member"** -- used by group practices with subscription/membership models.

Spark Mojo must support all three. The CRM Contact is the underlying record. The display label is a provisioning configuration.

### 4.2 PHI in the CRM

The CRM Contact stores demographic data: name, date of birth, phone, email, address, insurance information. In a healthcare context, this data becomes PHI when associated with a healthcare provider. HIPAA's minimum necessary standard means:

- Front desk staff see: name, phone, email, insurance, appointment status
- Billing staff see: name, insurance, claim status, balance
- Clinical staff see: name, clinical summary (from Medplum), treatment plan status
- Practice manager sees: all of the above

This maps directly to Frappe's role-based field permissions.

### 4.3 Consent Tracking

A behavioral health practice needs to track:

| Consent Type | Frequency | Storage |
|-------------|-----------|---------|
| HIPAA Notice of Privacy Practices | Once at intake | CRM custom field (date signed) |
| Informed consent for treatment | Once at intake, renewed annually | CRM custom field + signed document in Frappe Drive |
| Telehealth consent | Once, if applicable | CRM custom field |
| Communication preferences | Ongoing | CRM custom fields (OK to leave voicemail, OK to text, OK to email) |
| Release of information | Per-request | Medplum Consent resource + CRM activity |
| 42 CFR Part 2 consent (SUD) | Per-disclosure | Medplum Consent resource + CRM activity |
| Emergency contact authorization | Once at intake | CRM custom field |
| Payment responsibility acknowledgment | Once at intake | CRM custom field |

### 4.4 Insurance as an Identity Attribute

In behavioral health, a patient's insurance is a first-class identity attribute:
- Insurance member ID
- Payer name (linked to SM Payer DocType)
- Plan type (PPO, HMO, EAP, Medicaid)
- Copay amount
- Deductible status
- Authorization status and remaining sessions

This data lives partly in CRM (member ID, payer link) and partly in the billing system (SM Claim, SM Eligibility Response). The CRM shows a summary; the billing Mojo shows the detail.

---

## 5. User Workflow Analysis

### 5.1 New Referral / Inquiry (All Verticals)

**Trigger:** Phone call, web form, email, fax, walk-in, referral from another provider

**Workflow:**
1. Staff creates a Lead record (or Lead is auto-created from web form / n8n webhook)
2. Lead captures: name, contact info, source (how they found us), reason for inquiry
3. Staff qualifies the Lead: Is this person a fit? Do we have capacity? Is insurance accepted?
4. If qualified: Lead status -> "Qualified". Schedule intake/consultation.
5. If not qualified: Lead status -> "Declined". Capture reason. Optionally provide referral.
6. After intake/consultation: Lead converts to Contact + Organization (if applicable)
7. n8n workflow fires: creates ERPNext Customer, Medplum Patient (if healthcare), writes CRM activity

**Time per occurrence:** 5-15 minutes for phone intake, 1-2 minutes for web form auto-creation

**Pain points in current tools:**
- Many SMBs track this in spreadsheets, notebooks, or sticky notes
- Referral source attribution is lost -- practices cannot tell which referral sources generate the most clients
- Insurance verification is manual and disconnected from intake

### 5.2 Returning Client Re-engagement

**Trigger:** Former client calls back, referral source sends them again, client self-refers via web

**Workflow:**
1. Staff searches CRM for existing record
2. If found: review history, update contact info, note reason for return
3. Update Lead/Contact status to reflect re-engagement
4. Schedule new intake or follow-up
5. If not found: treat as new referral (workflow 5.1)

**Pain points:**
- Duplicate records are the #1 CRM data quality problem. Merge/dedup is critical.
- Staff often cannot find existing records because of name spelling variations, married name changes, or incomplete data.

### 5.3 Daily Contact Lookup

**Trigger:** Client calls, arrives for appointment, sends message, or is referenced in a meeting

**Workflow:**
1. Staff searches by name, phone number, or ID
2. CRM shows the Contact record with: basic info, relationship status, recent activity, upcoming appointments, outstanding balance, clinical status (if authorized to view)
3. Staff handles the interaction and records an activity note

**Time per occurrence:** 30 seconds to 2 minutes
**Frequency:** 20-50 times per day in a busy practice

**Pain points:**
- Slow search kills productivity. Sub-second search is mandatory.
- Incomplete activity timeline means staff must check multiple systems
- Field-level permissions must work correctly -- a receptionist should not see clinical notes

### 5.4 Referral Source Management

**Trigger:** Practice wants to track which referral sources (physicians, schools, agencies) send the most clients

**Workflow:**
1. When creating a Lead, staff selects or creates a referral source Organization
2. Organization record accumulates: number of referrals, conversion rate, last referral date
3. Practice manager reviews referral source report monthly/quarterly
4. Top referral sources get thank-you notes, lunch meetings, or other relationship maintenance

**Pain points:**
- Most SMBs do not track referral sources at all. They have no idea where their clients come from.
- Those that do track use spreadsheets that become stale

### 5.5 Consent and Document Collection

**Trigger:** New client intake, annual consent renewal, specific disclosure request

**Workflow:**
1. Staff generates consent packet (HIPAA notice, treatment consent, communication preferences)
2. Client signs (e-signature or paper scan)
3. Staff records consent dates in CRM custom fields
4. Signed documents stored in Frappe Drive, linked to Contact record
5. CRM shows consent status dashboard: which consents are current, which are expired

**Pain points:**
- Paper-based consent tracking is the norm. "Did they sign the HIPAA form?" involves digging through a filing cabinet.
- Consent expiration tracking is nearly nonexistent

---

## 6. Recommended Approach for Spark Mojo

### 6.1 Architecture Summary

```
React CRM Mojo
    |
    v
/api/modules/crm/* (FastAPI abstraction layer)
    |
    v
Frappe CRM (Contact, Lead, Organization, Deal, CRM Note)
    |
    +-- n8n --> Medplum Patient (clinical projection)
    +-- n8n --> ERPNext Customer (billing projection)
    +-- n8n --> CRM Activity writes (from all systems)
```

### 6.2 Use Frappe CRM As-Is, Extend with Custom Fields

**Do not build a custom SM Client DocType.** This was decided in DECISION-013 and reaffirmed in DECISION-020. The implementation approach is:

1. **Install Frappe CRM** on every tenant site. It is KERNEL.
2. **Configure custom fields** per vertical via provisioning templates. A behavioral health site gets `date_of_birth`, `insurance_member_id`, `payer_link`, `referral_source`, `preferred_pronouns`, `communication_preferences`. A hotel site gets `loyalty_tier`, `room_preferences`, `dietary_restrictions`.
3. **Configure Lead stages** per vertical. Behavioral health: Referred -> Screened -> Assessed -> Accepted -> Active. Hotel: Inquiry -> Quoted -> Booked. Law firm: Consultation -> Conflict check -> Engaged.
4. **Build a React CRM Mojo** that calls `/api/modules/crm/*` for the client-facing CRM experience. This Mojo shows the Contact record with the appropriate vocabulary and field visibility for the current user's role.
5. **Do NOT deploy the Frappe CRM Vue frontend** to client tenants. The React CRM Mojo is the UI surface. The Frappe CRM Vue frontend may be useful for Spark Mojo admin / power users via Frappe Desk, but it is not the client-facing experience.

### 6.3 Abstraction Layer Routes

```
GET  /api/modules/crm/contacts/list          -- paginated contact list with search
GET  /api/modules/crm/contacts/{id}          -- single contact with activity feed
POST /api/modules/crm/contacts/create        -- create new contact
PUT  /api/modules/crm/contacts/{id}/update   -- update contact fields
POST /api/modules/crm/contacts/{id}/merge    -- merge duplicate contacts

GET  /api/modules/crm/leads/list             -- lead pipeline view
GET  /api/modules/crm/leads/{id}             -- single lead detail
POST /api/modules/crm/leads/create           -- create new lead
PUT  /api/modules/crm/leads/{id}/update      -- update lead fields
POST /api/modules/crm/leads/{id}/convert     -- convert lead to contact

GET  /api/modules/crm/organizations/list     -- organization list
GET  /api/modules/crm/organizations/{id}     -- single org with linked contacts
POST /api/modules/crm/organizations/create   -- create new organization

GET  /api/modules/crm/activities/{contact_id} -- activity timeline for a contact
POST /api/modules/crm/activities/create       -- manual activity note

GET  /api/modules/crm/search?q=              -- global person search (name, phone, email, ID)
```

### 6.4 n8n Workflows

| Workflow | Trigger | Actions |
|----------|---------|---------|
| Lead Accepted | Lead status -> "Accepted" | Create ERPNext Customer, Create Medplum Patient (healthcare only), Write CRM activity |
| Contact Updated | Contact save | Sync name/phone/email to Medplum Patient identifier, Sync to ERPNext Customer |
| External Event -> CRM Activity | Medplum webhook, ERPNext webhook | Write CRM Activity per D020-5 event list |
| Duplicate Detection | Nightly batch | Flag potential duplicates based on name + DOB + phone fuzzy match |
| Consent Expiration | Daily check | Create SM Task for staff to renew expired consents |

---

## 7. Differentiators -- What Nobody Does Well

### 7.1 Unified Person Timeline Across All Systems

**The problem:** No SMB CRM shows a person's complete history across clinical, billing, scheduling, and communication systems in one view. HubSpot shows marketing/sales interactions. Salesforce Health Cloud shows clinical + billing but costs $300/user/month. SimplePractice shows clinical notes and billing but no CRM pipeline. Nobody has all four in one timeline for under $100/user/month.

**What Spark Mojo can build:** The CRM Contact timeline shows:
- Communication: emails sent/received, calls logged, texts
- Clinical: "Session completed (DAP note) -- Jan 15" (from Medplum via n8n)
- Billing: "Payment received: $175 via credit card -- Jan 16" (from ERPNext via n8n)
- Scheduling: "Appointment booked: Jan 22 at 2pm with Dr. Smith" (from Medplum via n8n)
- Tasks: "Intake paperwork received -- Jan 10" (from SM Task via n8n)
- Consent: "HIPAA authorization signed -- Jan 8" (from CRM custom field)

**Confidence:** HIGH. The architecture supports this today (n8n activity capture is defined in D020-5). The implementation is straightforward -- each system writes activities, CRM displays them chronologically.

**Competitive advantage:** This is the Salesforce Health Cloud value proposition delivered at 1/10th the cost, self-hosted, with data sovereignty.

### 7.2 Vocabulary-Adaptive CRM with Zero Configuration Drift

**The problem:** Multi-vertical CRM platforms (Zoho, Salesforce) offer "vertical editions" that are really just relabeled field names. When the platform updates, the customizations break. When a new vertical is added, someone must manually reconfigure everything. There is no provisioning-level vocabulary abstraction.

**What Spark Mojo can build:** A provisioning template system where:
- The Lead pipeline stages are defined per vertical template (behavioral_health.yaml, hospitality.yaml, legal.yaml)
- Field labels are vocabulary-mapped at provisioning time ("Patient" vs. "Guest" vs. "Client" vs. "Student")
- Custom fields are added/removed per template
- The same React CRM Mojo renders correctly regardless of which template was applied
- Adding a new vertical = writing a new YAML template. No code changes.

**Confidence:** MEDIUM-HIGH. The provisioning template system exists (behavioral_health.yaml, general_smb.yaml). Vocabulary mapping requires the abstraction layer to return label metadata alongside field data. This is a design decision, not a technical blocker.

### 7.3 AI-Powered Intake Triage

**The problem:** When a new referral comes in, a staff member must manually check: Do we accept their insurance? Do we have a therapist with the right specialty? Is there availability? This takes 5-15 minutes per inquiry and is error-prone.

**What Spark Mojo can build:** When a Lead is created:
1. AI (Nova Micro) checks insurance against SM Payer list -- instant accept/reject
2. AI (Haiku) matches clinical concerns to therapist specialties -- suggests best-fit provider
3. AI (Nova Micro) checks provider availability -- suggests next available slot
4. Staff sees: "Insurance: Accepted (Aetna PPO). Best fit: Dr. Smith (anxiety, CBT). Next available: Tuesday 3pm."

**Confidence:** MEDIUM. Requires SM Payer data, therapist specialty data, and scheduling data to be populated. Technically straightforward but data-dependent.

---

## 8. Provisioning and Configuration Analysis

### 8.1 Per-Vertical Configuration

| Configuration Item | Behavioral Health | Hospitality | Legal | Education |
|-------------------|------------------|-------------|-------|-----------|
| Person label | "Client" or "Patient" | "Guest" | "Client" | "Student" |
| Organization label | "Practice" / "Payer" | "Hotel" / "Agency" | "Firm" / "Court" | "School" / "Studio" |
| Lead stages | Referred, Screened, Assessed, Accepted, Active | Inquiry, Quoted, Booked | Consultation, Conflict Check, Engaged | Inquiry, Trial, Enrolled |
| Custom fields on Contact | DOB, insurance, referral source, pronouns, communication prefs | Loyalty tier, room prefs, dietary | Conflict check status, engagement letter date | Instrument, skill level, parent contact |
| Consent types | HIPAA, treatment, telehealth, communication, ROI, 42 CFR Part 2 | Marketing, data retention | Engagement letter, conflict waiver | Parent consent, photo consent |
| HIPAA required | Yes | No | No (but privilege applies) | No (unless FERPA) |
| Insurance tracking | Yes (member ID, payer, plan type) | No | No | No |
| Medplum Patient projection | Yes | No | No | No |

### 8.2 Vocabulary Mapping Implementation

The provisioning template should include a `vocabulary` section:

```yaml
vocabulary:
  person: "Client"          # or "Patient", "Guest", "Student"
  person_plural: "Clients"
  organization: "Practice"
  lead: "Referral"          # or "Inquiry", "Consultation Request"
  lead_plural: "Referrals"
  contact: "Client"
  intake: "Intake"          # or "Check-in", "Consultation", "Enrollment"
  discharge: "Discharge"    # or "Check-out", "Matter Closed", "Graduated"
```

The abstraction layer returns this vocabulary map alongside CRM data. The React CRM Mojo uses it to render labels dynamically.

### 8.3 Custom Field Provisioning

Custom fields are added to Frappe CRM DocTypes via the provisioning API:
1. Provisioning template lists required custom fields per DocType
2. `sm_provisioning` app creates custom fields on site creation
3. Custom fields are grouped into fieldsets (sections) per vertical

This follows the existing Frappe Custom Field mechanism -- no custom development needed for the field creation itself.

---

## 9. Permissions Model

### 9.1 Role-to-Action Mapping

| Role | Contact Read | Contact Write | Lead Read | Lead Write | Lead Convert | Activity Read | Activity Write | Merge Contacts | Export |
|------|-------------|--------------|-----------|-----------|-------------|---------------|---------------|----------------|--------|
| Receptionist / Front Desk | All | Limited fields | All | Create + update | No | All (non-clinical) | Yes | No | No |
| Intake Coordinator | All | All | All | All | Yes | All (non-clinical) | Yes | No | No |
| Clinician / Provider | Own caseload | Limited fields | No | No | No | All (own caseload) | Yes | No | No |
| Billing Staff | All | Billing fields only | No | No | No | Billing activities | Yes | No | Yes (billing) |
| Practice Manager / Owner | All | All | All | All | Yes | All | Yes | Yes | Yes |
| Spark Mojo Admin | All (cross-tenant) | All | All | All | Yes | All | Yes | Yes | Yes |

### 9.2 Frappe Permission System Fit

Frappe's native permission system supports this model:

- **DocType Permissions:** Role-based read/write/create/delete per DocType (Lead, Contact, Organization)
- **User Permissions:** Restrict access to specific records (e.g., clinician sees only their caseload via `contact_owner` or linked practitioner field)
- **Field-Level Permissions:** Hide/read-only specific fields per role (e.g., billing fields hidden from receptionists)
- **Workflow Permissions:** Transition permissions (only Intake Coordinator can convert Lead to Contact)

**Gap:** Frappe does not natively support "activity-level permissions" (show billing activities but hide clinical activities in the same timeline). This requires the abstraction layer to filter activities by type before returning them to the React Mojo.

### 9.3 Implementation

CRM roles are defined as Frappe Roles:
- `SM CRM Reader` -- read-only access to Contacts, Leads, Organizations
- `SM CRM Editor` -- read/write access
- `SM CRM Manager` -- full access including merge, export, Lead conversion
- `SM CRM Intake` -- Lead management and conversion (subset of Manager)

These roles are assigned per user at provisioning time based on the staff member's job function.

---

## 10. Training Requirements

### 10.1 Onboarding Time Estimates

| User Type | Time to Proficiency | Training Method |
|-----------|--------------------|--------------------|
| Receptionist / Front Desk | 2-4 hours | In-app walkthrough + 30-minute live demo |
| Intake Coordinator | 4-8 hours | In-app walkthrough + 1-hour live demo + practice exercises |
| Clinician / Provider | 1-2 hours | In-app walkthrough (limited CRM interaction) |
| Billing Staff | 2-4 hours | In-app walkthrough + billing-specific training |
| Practice Manager | 4-8 hours | Full platform training + admin features |

### 10.2 In-App Guidance Opportunities

| Opportunity | Description | Priority |
|------------|-------------|----------|
| First Lead creation | Step-by-step overlay showing each field and why it matters | HIGH |
| Lead conversion | Walkthrough of what happens when a Lead becomes a Contact | HIGH |
| Contact search | Tips on search syntax (phone number, partial name, ID) | MEDIUM |
| Activity timeline | Explanation of activity types and sources | MEDIUM |
| Duplicate detection | What to do when a potential duplicate is flagged | LOW |
| Consent tracking | Guided checklist for intake consent collection | HIGH (healthcare) |

### 10.3 Common Mistakes to Prevent

1. **Creating duplicate records** instead of searching first. Mitigation: mandatory search before Lead creation (AI-suggested matches).
2. **Skipping required fields** during intake. Mitigation: required field validation per vertical template.
3. **Not recording the referral source.** Mitigation: referral source is a required field on Lead (healthcare template).
4. **Forgetting consent tracking.** Mitigation: consent checklist on Contact record with expiration alerts.

---

## 11. Open Questions

| # | Question | Best-Guess Answer | Confidence |
|---|----------|-------------------|------------|
| 1 | Should we deploy the Frappe CRM Vue frontend alongside the React CRM Mojo, or is the Mojo the sole UI? | Mojo is the sole client-facing UI. Vue frontend is available via Frappe Desk for admin/power users but is not surfaced to staff. | HIGH -- consistent with the platform's React-first architecture |
| 2 | How do we handle the Lead-to-Contact conversion for verticals that do not use a "lead" concept (e.g., a music school where every inquiry becomes a student)? | Auto-convert: Lead is created and immediately converted to Contact. The Lead exists for source attribution but the user never sees it as a separate step. Configurable per vertical template. | MEDIUM -- needs design session validation |
| 3 | Should CRM Deal (Frappe CRM's deal/opportunity tracking) be part of KERNEL or a CORE add-on? | CORE add-on. Most SMBs (therapy practice, music school) do not have a "deal" concept. Businesses with a sales pipeline (consulting firm, agency) would enable it. | HIGH -- clear vertical split |
| 4 | How do we handle the Frappe CRM Contact vs. ERPNext Contact naming collision? Frappe CRM uses the `Contact` DocType which is also a core Frappe DocType. | Frappe CRM extends the core Contact DocType rather than creating a separate one. The CRM Lead and CRM Deal are separate DocTypes. No collision, but we must be precise in API naming. The abstraction layer always references "CRM Contact" in its vocabulary. | HIGH -- verified in MEGA-001 evaluation |
| 5 | What is the duplicate detection strategy? Real-time (on create) or batch (nightly)? | Both. Real-time: when creating a Lead, show potential matches (name + phone fuzzy match). Batch: nightly n8n job flags potential duplicates for manual review. | MEDIUM -- real-time matching adds latency that needs benchmarking |
| 6 | How does the CRM handle multi-practice scenarios (a therapist who works at two practices)? | Each practice is a separate tenant with separate CRM data. The therapist has a User account on each site. The patient who sees this therapist at Practice A does not appear in Practice B's CRM unless they are also a patient there. This is correct for HIPAA isolation. | HIGH -- follows DECISION-004 site-per-client model |

---

*End of Workflow Research. Next: CRM-CLIENT-IDENTITY-TECHNICAL-RESEARCH.md*

```