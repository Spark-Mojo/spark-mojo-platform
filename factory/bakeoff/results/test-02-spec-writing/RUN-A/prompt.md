```
You are the Spec Writer for the Spark Mojo build factory.
Write a complete, self-contained story spec for the following story:
STORY ID: CRM-003
TITLE: Contact create endpoint - abstraction layer
CATEGORY: BACKEND
SIZE: S
DEPENDENCIES: None (first backend story)
CONTEXT: CRM Client Identity is a new capability being built on the Spark Mojo platform. The platform stack is: Frappe/ERPNext backend, FastAPI abstraction layer (MAL) at /api/modules/[capability]/[action], React JSX frontend.
The abstraction layer is the ONLY surface React calls. React never calls Frappe directly. All custom DocTypes are prefixed "SM ". No TypeScript. No hardcoded hex colors (use var(--sm-*) CSS variables).
The Contact create endpoint should:
* Accept a POST to /api/modules/crm/contact/create
* Create a Frappe Contact document (native ERPNext DocType)
* Apply vocabulary resolution: the "person" concept resolves to the site's configured label (e.g., "Client" for behavioral health)
* Write a CRM timeline event on successful creation
* Return the created contact with its Frappe name (document ID)
Write the full story spec file. It must be self-contained: the implementing agent reads ONLY this file and the existing codebase.
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

```