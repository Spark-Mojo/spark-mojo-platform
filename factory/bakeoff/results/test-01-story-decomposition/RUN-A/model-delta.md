model: model-delta
test: 01-story-decomposition
run: A
date: 2026-04-09
JAMES NOTE: THIS MODEL DID NOT PRODUCE THE FILES ON THE FIRST TRY. IT REASONED FOR 20 MIN+ THEN SAID "PRODUCING MD FILES" AND STOPPED. TRIED ON SEVERAL PROVIDERS TO SEE IF IT WAS A PROVIDER ISSUE BUT SAME RESULTS. PROMPTED IT AGAIN EXPLICITLY SAYING TO PRODUCE THE OUTPUT IN THE CHAT WINDOW AND AFTER 4 MORE TRIES, IT COMPLETED THE TASK. 

# STORIES.md — CRM / Client Identity Capability

**Decomposed by:** Story Decomposer — Spark Mojo Build Factory
**Date:** April 9, 2026
**Source documents:** CRM-CLIENT-IDENTITY-WORKFLOW-RESEARCH.md · TECHNICAL-RESEARCH.md · AI-ANALYSIS.md · SYNTHESIS.md
**Governing authority:** Platform Guardrails (highest authority) → DECISION-013 → DECISION-020
**Story count:** 27 | **Categories:** BACKEND (14) · CONFIG (3) · FRONTEND (4) · INTEGRATION (4) · AI (2)
**Sizes used:** XS (22) · S (5) — no M or L permitted

> ⚠️ **Pre-condition (RC-024):** All MAL endpoint stories assume bearer-token auth middleware is operational. If ADMIN-001 is not yet deployed, each endpoint story must include a stub auth dependency note.

> ⚠️ **OQ-002:** Model names in AI stories (Haiku, Nova Micro) are directional. Verify against current AWS Bedrock catalog at implementation time.

> ⚠️ **RC-012 / RC-013:** DECISION-020 citation for activity capture must be verified before implementing any INTEGRATION story. The CRM activity timeline is **mandatory infrastructure**, not a feature — every cross-system event must write to it.

---

## 📋 Summary Table

| ID | Title | Category | Size | Dependencies |
|----|-------|----------|------|-------------|
| CRM-001 | Contact list endpoint | BACKEND | XS | None |
| CRM-002 | Contact detail endpoint | BACKEND | XS | CRM-001 |
| CRM-003 | Contact write endpoints | BACKEND | XS | CRM-001 |
| CRM-004 | Lead read endpoints | BACKEND | XS | None |
| CRM-005 | Lead write endpoints | BACKEND | XS | CRM-004 |
| CRM-006 | Lead convert endpoint | BACKEND | XS | CRM-005, CRM-003 |
| CRM-007 | Organization read endpoints | BACKEND | XS | None |
| CRM-008 | Organization create endpoint | BACKEND | XS | CRM-007 |
| CRM-009 | Global CRM search endpoint | BACKEND | XS | None |
| CRM-010 | Vocabulary and stages utility endpoints | BACKEND | XS | None |
| CRM-011 | Activity timeline endpoints | BACKEND | XS | CRM-002 |
| CRM-012 | Duplicate check endpoint | BACKEND | XS | CRM-001 |
| CRM-013 | Contact merge endpoint | BACKEND | XS | CRM-012, CRM-003 |
| CRM-014 | Consent validation server hook | BACKEND | XS | CRM-016 |
| CRM-015 | CRM roles and DocType permissions | CONFIG | XS | None |
| CRM-016 | Healthcare vertical custom fields provisioning | CONFIG | S | None |
| CRM-017 | Lead pipeline stages per-vertical configuration | CONFIG | XS | None |
| CRM-018 | Contact list component | FRONTEND | S | CRM-001, CRM-003, CRM-010, CRM-015 |
| CRM-019 | Contact detail + activity timeline component | FRONTEND | S | CRM-002, CRM-003, CRM-011 |
| CRM-020 | Lead pipeline Kanban component | FRONTEND | S | CRM-004, CRM-005, CRM-006, CRM-010, CRM-017 |
| CRM-021 | Contact merge review UI component | FRONTEND | XS | CRM-012, CRM-013, CRM-019 |
| CRM-022 | n8n Lead conversion workflow | INTEGRATION | S | CRM-006, CRM-003 |
| CRM-023 | n8n inbound CRM activity webhook workflow | INTEGRATION | S | CRM-011 |
| CRM-024 | n8n nightly duplicate detection batch | INTEGRATION | XS | CRM-012, CRM-015 |
| CRM-025 | n8n consent expiration check workflow | INTEGRATION | XS | CRM-016, CRM-014 |
| CRM-026 | Contact summary AI endpoint | AI | XS | CRM-002, CRM-011 |
| CRM-027 | Lead urgency triage AI endpoint | AI | XS | CRM-004, CRM-005, CRM-016 |

---

## 🔧 Category: BACKEND

---

### CRM-001 — Contact List Endpoint
**Category:** BACKEND | **Size:** XS
**Description:** Implement `GET /api/modules/crm/contacts/list` on the MAL, returning paginated Frappe CRM Contact records searchable by name, phone, or email and filterable by status.
**Dependencies:** None
- **Gate 1 – Workflow:** Serves the person identity management workflow — every staff interaction requiring a person lookup originates at this endpoint.
- **Gate 2 – CRM Timeline:** N/A — read-only; no events written.
- **Gate 3 – Right Level:** Universal — operates on the same Contact DocType for every vertical; vertical-specific custom field values are included in the response payload when present.

---

### CRM-002 — Contact Detail Endpoint
**Category:** BACKEND | **Size:** XS
**Description:** Implement `GET /api/modules/crm/contacts/{id}` on the MAL, returning a full Frappe Contact record with the most recent 50 activity entries from the Communication DocType, filtered by the requesting user's role.
**Dependencies:** CRM-001
- **Gate 1 – Workflow:** Serves the daily contact lookup workflow — gives any authorised staff member a complete person snapshot without switching systems.
- **Gate 2 – CRM Timeline:** N/A — read-only; activity entries returned were written by other stories.
- **Gate 3 – Right Level:** Universal — role-based field filtering is applied in the MAL before data reaches the caller; no vertical-specific branching in this endpoint.

---

### CRM-003 — Contact Write Endpoints
**Category:** BACKEND | **Size:** XS
**Description:** Implement `POST /api/modules/crm/contacts/create` and `PUT /api/modules/crm/contacts/{id}/update` on the MAL, writing validated Contact records to Frappe CRM with support for all provisioned custom fields.
**Dependencies:** CRM-001
- **Gate 1 – Workflow:** Serves the person intake workflow — contacts are created on lead conversion and updated as relationship data evolves over the client lifecycle.
- **Gate 2 – CRM Timeline:** N/A — the timeline activity for contact creation is written by CRM-022 (n8n), not this endpoint.
- **Gate 3 – Right Level:** Universal — the same create/update endpoints accept any provisioned custom field payload; vertical-specific fields from CRM-016 are accepted without endpoint changes.

---

### CRM-004 — Lead Read Endpoints
**Category:** BACKEND | **Size:** XS
**Description:** Implement `GET /api/modules/crm/leads/list` (with pipeline stage filter and pagination) and `GET /api/modules/crm/leads/{id}` on the MAL, returning Frappe CRM Lead records.
**Dependencies:** None
- **Gate 1 – Workflow:** Serves the referral/intake pipeline workflow — intake coordinators use these endpoints to manage the Lead queue and review individual referral detail.
- **Gate 2 – CRM Timeline:** N/A — read-only.
- **Gate 3 – Right Level:** Universal — stage values used in the filter are configurable per vertical via CRM-017; the endpoint itself contains no vertical logic.

---

### CRM-005 — Lead Write Endpoints
**Category:** BACKEND | **Size:** XS
**Description:** Implement `POST /api/modules/crm/leads/create` and `PUT /api/modules/crm/leads/{id}/update` on the MAL, creating and updating CRM Lead records including vertical-specific fields such as urgency, referral source type, and clinical concerns.
**Dependencies:** CRM-004
- **Gate 1 – Workflow:** Serves the intake pipeline — new referrals enter as Leads and are updated as qualification proceeds through pipeline stages.
- **Gate 2 – CRM Timeline:** N/A — no direct timeline writes; Lead stage transitions emit Frappe system Communication entries automatically.
- **Gate 3 – Right Level:** Universal — custom fields such as `sm_urgency` and `sm_clinical_concerns` are accepted only on tenants where CRM-016 has added them; the endpoint does not error if they are absent.

---

### CRM-006 — Lead Convert Endpoint
**Category:** BACKEND | **Size:** XS
**Description:** Implement `POST /api/modules/crm/leads/{id}/convert` on the MAL, transitioning a CRM Lead to "Converted" status via Frappe Workflow `transition_state()` and creating the linked Contact record, restricted to SM CRM Intake and Manager roles.
**Dependencies:** CRM-005, CRM-003
- **Gate 1 – Workflow:** Serves the person intake workflow at the acceptance gate — this is the moment a qualified referral becomes an active client and downstream system records are triggered.
- **Gate 2 – CRM Timeline:** N/A for this story — the "Lead converted" activity is written by CRM-022 (n8n), which is triggered by the state change this endpoint initiates via Frappe Workflow.
- **Gate 3 – Right Level:** Universal — state transition mechanism is identical for every vertical; downstream projections (Medplum Patient, ERPNext Customer) are vertical-conditional and handled in the n8n workflow.

---

### CRM-007 — Organization Read Endpoints
**Category:** BACKEND | **Size:** XS
**Description:** Implement `GET /api/modules/crm/organizations/list` and `GET /api/modules/crm/organizations/{id}` (including linked contact names) on the MAL, returning Frappe CRM Organization records.
**Dependencies:** None
- **Gate 1 – Workflow:** Serves the referral source management workflow — intake coordinators and managers view referring organizations (physician groups, schools, agencies) to track relationship health and referral volume.
- **Gate 2 – CRM Timeline:** N/A — read-only.
- **Gate 3 – Right Level:** Universal — organizations represent referral sources, payers, and employers across all verticals without vertical-specific branching.

---

### CRM-008 — Organization Create Endpoint
**Category:** BACKEND | **Size:** XS
**Description:** Implement `POST /api/modules/crm/organizations/create` on the MAL, creating a new Frappe CRM Organization record used to represent referral sources, payers, and other business entities linked to contacts.
**Dependencies:** CRM-007
- **Gate 1 – Workflow:** Serves the referral source onboarding workflow — new referring organizations are captured at the moment of their first inbound referral.
- **Gate 2 – CRM Timeline:** N/A — organization creation is reference data, not a relationship event; no CRM activity is written.
- **Gate 3 – Right Level:** Universal — organization creation is vertical-agnostic.

---

### CRM-009 — Global CRM Search Endpoint
**Category:** BACKEND | **Size:** XS
**Description:** Implement `GET /api/modules/crm/search?q=` on the MAL, executing a unified fuzzy lookup across Frappe Contact, CRM Lead, and CRM Organization DocTypes by name, phone, and email in a single response.
**Dependencies:** None
- **Gate 1 – Workflow:** Serves the duplicate prevention and person lookup workflows — staff search before creating any record; receptionists use this in real time when a person calls or arrives.
- **Gate 2 – CRM Timeline:** N/A — read-only.
- **Gate 3 – Right Level:** Universal — searches the same three DocTypes regardless of vertical; no vertical branching in search logic.

---

### CRM-010 — Vocabulary and Stages Utility Endpoints
**Category:** BACKEND | **Size:** XS
**Description:** Implement `GET /api/modules/crm/vocabulary` (returns tenant-specific label map from SM Site Registry) and `GET /api/modules/crm/stages` (returns configured Sales Stage records) on the MAL.
**Dependencies:** None
- **Gate 1 – Workflow:** Serves the CRM Mojo rendering workflow — the React frontend calls both endpoints at load time to determine correct labels ("Patient" vs "Client") and pipeline column headings.
- **Gate 2 – CRM Timeline:** N/A — read-only configuration data.
- **Gate 3 – Right Level:** Client level — each tenant's SM Site Registry holds its own vocabulary and stages, set from the vertical template at provisioning time; these endpoints expose that client-specific configuration.

---

### CRM-011 — Activity Timeline Endpoints
**Category:** BACKEND | **Size:** XS
**Description:** Implement `GET /api/modules/crm/activities/{contact_id}` (paginated, 50 entries per page) and `POST /api/modules/crm/activities/create` (manual staff note) on the MAL, reading from and writing to the Frappe Communication DocType.
**Dependencies:** CRM-002
- **Gate 1 – Workflow:** Serves the relationship management workflow — staff log call notes and contextual updates on a contact; paginated timeline is consumed by the contact detail view.
- **Gate 2 – CRM Timeline:** `POST /activities/create` writes a manual staff note to the CRM activity timeline (Communication DocType, `communication_type = "Comment"`).
- **Gate 3 – Right Level:** Universal — manual activity notes and timeline pagination function identically across all verticals and roles.

---

### CRM-012 — Duplicate Check Endpoint
**Category:** BACKEND | **Size:** XS
**Description:** Implement `GET /api/modules/crm/contacts/{id}/duplicates` on the MAL, querying existing Contact records by fuzzy-matched phone, email, and name to surface potential duplicate records before they are committed.
**Dependencies:** CRM-001
- **Gate 1 – Workflow:** Serves the data quality workflow — called at Contact and Lead creation to surface potential duplicates before a record is saved; also queried by CRM-024 (batch).
- **Gate 2 – CRM Timeline:** N/A — read-only detection; resolution is performed via CRM-013.
- **Gate 3 – Right Level:** Universal — duplicate matching logic is identical for all verticals.

---

### CRM-013 — Contact Merge Endpoint
**Category:** BACKEND | **Size:** XS
**Description:** Implement `POST /api/modules/crm/contacts/{id}/merge` on the MAL, transferring activities, custom field values, and cross-system links from a source Contact into a target Contact and archiving the source record, restricted to SM CRM Manager role.
**Dependencies:** CRM-012, CRM-003
- **Gate 1 – Workflow:** Serves the data quality workflow — a Manager-role user resolves a flagged duplicate by confirming the surviving record.
- **Gate 2 – CRM Timeline:** Writes a "Records merged" system activity to the surviving Contact's CRM timeline (Communication DocType).
- **Gate 3 – Right Level:** Universal — merge logic is vertical-agnostic; the role requirement (SM CRM Manager) is enforced by the MAL and defined in CRM-015.

---

### CRM-014 — Consent Validation Server Hook
**Category:** BACKEND | **Size:** XS
**Description:** Implement a Frappe `validate` event hook on the Contact DocType in `sm_widgets` that auto-computes the `sm_consent_status` Select field ("Complete", "Incomplete", "Expired") from individual consent date custom fields on every Contact save.
**Dependencies:** CRM-016
- **Gate 1 – Workflow:** Serves the healthcare intake compliance workflow — consent status is always accurate without requiring staff to manually update a derived field.
- **Gate 2 – CRM Timeline:** N/A — server-side field computation on save; not a logged activity.
- **Gate 3 – Right Level:** Vertical (healthcare) — the hook inspects `sm_hipaa_consent_date`, `sm_treatment_consent_date`, and `sm_telehealth_consent_date` which only exist on healthcare-vertical tenants; the hook is a no-op if these fields are absent.

---

## ⚙️ Category: CONFIG

---

### CRM-015 — CRM Roles and DocType Permissions
**Category:** CONFIG | **Size:** XS
**Description:** Create the four SM CRM Frappe Roles (SM CRM Reader, SM CRM Editor, SM CRM Manager, SM CRM Intake) and configure idempotent DocType-level read/write/create/delete permissions on Contact, CRM Lead, and CRM Organization for each role.
**Dependencies:** None
- **Gate 1 – Workflow:** Serves the access control enforcement workflow — without roles, any authenticated Frappe user has unrestricted CRM access; these roles gate who can read, write, convert leads, and merge contacts.
- **Gate 2 – CRM Timeline:** N/A — permission configuration; no runtime events written.
- **Gate 3 – Right Level:** Role level — defines the four CRM roles that all BACKEND, FRONTEND, and INTEGRATION stories depend on for authorization; all four roles are provisioned on every vertical tenant.

---

### CRM-016 — Healthcare Vertical Custom Fields Provisioning
**Category:** CONFIG | **Size:** S
**Description:** Extend the `behavioral_health` provisioning template YAML and its apply script in `sm_provisioning` to idempotently add healthcare-specific custom fields to the Frappe Contact DocType (`sm_date_of_birth`, `sm_insurance_member_id`, `sm_payer`, `sm_referral_source`, `sm_preferred_pronouns`, `sm_hipaa_consent_date`, `sm_treatment_consent_date`, `sm_telehealth_consent_date`, `sm_consent_status`, `sm_medplum_patient_id`, `sm_erpnext_customer_id`) and the CRM Lead DocType (`sm_referral_source`, `sm_referral_source_type`, `sm_insurance_info`, `sm_urgency`, `sm_clinical_concerns`).
**Dependencies:** None
- **Gate 1 – Workflow:** Serves the healthcare client intake workflow — these fields capture the insurance, referral, and consent data required to advance a referral through the intake pipeline and into billing and clinical systems.
- **Gate 2 – CRM Timeline:** N/A — provisioning configuration; no runtime events written.
- **Gate 3 – Right Level:** Vertical (healthcare) — fields are added only on sites provisioned with the `behavioral_health` template; the apply script checks for field existence before creation and is safe to re-run.

---

### CRM-017 — Lead Pipeline Stages Per-Vertical Configuration
**Category:** CONFIG | **Size:** XS
**Description:** Extend the `behavioral_health` provisioning template to idempotently create Frappe Sales Stage records for the healthcare intake pipeline (Referred → Screening → Assessed → Accepted → Waitlisted → Declined) and the `general_smb` template for a generic pipeline (Inquiry → Qualifying → Accepted → Declined).
**Dependencies:** None
- **Gate 1 – Workflow:** Serves the intake pipeline workflow — pipeline stages define the Kanban columns in CRM-020 and the valid state transitions for a CRM Lead; without this config, stages are empty and the pipeline view cannot render.
- **Gate 2 – CRM Timeline:** N/A — reference data configuration; no runtime events written.
- **Gate 3 – Right Level:** Vertical — stage definitions differ per vertical; the mechanism (Sales Stage DocType) is universal; adding a new vertical requires adding a new stage set to the corresponding YAML template, not code changes.

---

## 🖥️ Category: FRONTEND

---

### CRM-018 — Contact List Component
**Category:** FRONTEND | **Size:** S
**Description:** Build `ContactList.jsx`, the CRM Mojo's main people directory, with debounced search input, status-filter pills, paginated results table with vocabulary-aware column headers, and a "New Contact" modal that posts to CRM-003 on submit.
**Dependencies:** CRM-001, CRM-003, CRM-010, CRM-015
- **Gate 1 – Workflow:** Serves the daily contact lookup and new contact intake workflows — this view is the primary entry point for any staff action involving a person.
- **Gate 2 – CRM Timeline:** N/A — display component; "New Contact" modal calls CRM-003, whose downstream activity write is handled by CRM-022.
- **Gate 3 – Right Level:** Universal — vocabulary labels ("Client", "Patient", "Guest") and visible columns adapt per tenant vocabulary config loaded from CRM-010; no vertical-specific JSX branches.

---

### CRM-019 — Contact Detail + Activity Timeline Component
**Category:** FRONTEND | **Size:** S
**Description:** Build `ContactDetail.jsx`, a full-page contact record view with tabbed field groups (demographics, insurance/custom, consent status), inline field editing via CRM-003, a paginated chronological activity timeline with type-badge filtering, and a "Add Note" action that calls CRM-011's POST endpoint.
**Dependencies:** CRM-002, CRM-003, CRM-011
- **Gate 1 – Workflow:** Serves the relationship management workflow — this is the primary view staff use during any live interaction with a person, surfacing everything known about the relationship across all systems.
- **Gate 2 – CRM Timeline:** N/A — display only; the "Add Note" action calls CRM-011 `POST /activities/create` which writes the activity.
- **Gate 3 – Right Level:** Universal — field sections are shown or hidden based on which custom fields are provisioned on the tenant; role-based field visibility is enforced by the MAL before data reaches this component.

---

### CRM-020 — Lead Pipeline Kanban Component
**Category:** FRONTEND | **Size:** S
**Description:** Build `LeadPipeline.jsx`, an intake Kanban board where columns are vocabulary-mapped pipeline stages from CRM-010, Lead cards are draggable to adjacent stage columns (calling CRM-005 `PUT` on drop), and a "New Referral" modal creates a Lead via CRM-005 and then optionally converts it via CRM-006.
**Dependencies:** CRM-004, CRM-005, CRM-006, CRM-010, CRM-017
- **Gate 1 – Workflow:** Serves the referral/intake pipeline workflow — intake coordinators manage all referrals through pipeline stages in this view, from received to accepted or declined.
- **Gate 2 – CRM Timeline:** N/A — display only; stage transitions trigger Frappe Workflow which emits system Communication entries automatically.
- **Gate 3 – Right Level:** Universal — stage column headers and Lead card vocabulary labels are loaded dynamically from CRM-010; any vertical's pipeline renders through the same Kanban component without code changes.

---

### CRM-021 — Contact Merge Review UI Component
**Category:** FRONTEND | **Size:** XS
**Description:** Build `ContactMerge.jsx`, a side-panel screen accessible from `ContactDetail.jsx` that displays two Contact records side-by-side with field-level winner selection and a confirmation button that calls CRM-013's merge endpoint.
**Dependencies:** CRM-012, CRM-013, CRM-019
- **Gate 1 – Workflow:** Serves the data quality workflow — a Manager-role user resolves a flagged duplicate by reviewing both records and confirming the surviving record.
- **Gate 2 – CRM Timeline:** N/A — the CRM-013 endpoint (not this component) writes the "Records merged" activity on confirmation.
- **Gate 3 – Right Level:** Universal — merge UI is vertical-agnostic; the role requirement (SM CRM Manager) is enforced by CRM-013 at the MAL, not by this component.

---

## 🔗 Category: INTEGRATION

---

### CRM-022 — n8n Lead Conversion Workflow
**Category:** INTEGRATION | **Size:** S
**Description:** Build an n8n workflow triggered by a Frappe webhook on CRM Lead `transition_state` to "Accepted" that creates an ERPNext Customer, conditionally creates a Medplum Patient (healthcare tenants only, checked via SM Site Registry `vertical_template` field), writes `sm_erpnext_customer_id` and `sm_medplum_patient_id` back to the Frappe Contact record via Frappe REST, and posts a "Lead converted to client" Communication record to the CRM timeline.
**Dependencies:** CRM-006, CRM-003
- **Gate 1 – Workflow:** Serves the person intake workflow at the conversion gate — this workflow completes the moment a referral becomes an active client with records in all downstream systems.
- **Gate 2 – CRM Timeline:** Writes "Lead converted — ERPNext Customer `[ID]` and Medplum Patient `[ID]` linked" as a system Communication record on the Contact's CRM timeline.
- **Gate 3 – Right Level:** Universal workflow with vertical branching — ERPNext Customer creation is universal; Medplum Patient creation branch executes only on healthcare tenants.

---

### CRM-023 — n8n Inbound CRM Activity Webhook Workflow
**Category:** INTEGRATION | **Size:** S
**Description:** Build an n8n workflow that exposes a standardized inbound webhook endpoint other platform workflows call to post activity events, validates the event schema (contact_id, activity_type, content, source_system, timestamp), and writes a typed Frappe Communication record to the specified contact's CRM timeline.
**Dependencies:** CRM-011
- **Gate 1 – Workflow:** Serves the unified activity timeline workflow — this is the write-side of the CRM's core differentiator; every downstream Mojo deposes events here rather than each building its own CRM write logic.
- **Gate 2 – CRM Timeline:** Writes any cross-system event to the CRM timeline — clinical encounters, billing payments, appointment bookings, task completions — as typed Communication records with `sm_activity_type` in ("clinical", "billing", "scheduling", "task", "communication", "consent", "system").
- **Gate 3 – Right Level:** Universal — the webhook is source-system agnostic; `activity_type` classifies the source; all platform Mojos use the same contract to write to the CRM timeline.

---

### CRM-024 — n8n Nightly Duplicate Detection Batch Workflow
**Category:** INTEGRATION | **Size:** XS
**Description:** Build an n8n cron workflow (runs nightly) that queries Frappe Contact records for phone, email, and name overlaps above a configurable confidence threshold and creates one SM Task per flagged pair, assigned to the SM CRM Manager role for manual review.
**Dependencies:** CRM-012, CRM-015
- **Gate 1 – Workflow:** Serves the data quality management workflow — this is the proactive background sweep that catches entry-time duplicates missed at point-of-creation, surfacing them as actionable review tasks.
- **Gate 2 – CRM Timeline:** N/A — creates SM Tasks (not CRM Communication records); the merge action that follows (via CRM-013) writes the timeline entry.
- **Gate 3 – Right Level:** Universal — duplicate detection logic is identical for all verticals and all tenant sites.

---

### CRM-025 — n8n Consent Expiration Check Workflow
**Category:** INTEGRATION | **Size:** XS
**Description:** Build an n8n cron workflow (runs daily) that queries healthcare-tenant Frappe Contact records where any consent date field is null or older than the configured renewal interval and creates one SM Task per Contact, assigned to the front desk staff role.
**Dependencies:** CRM-016, CRM-014
- **Gate 1 – Workflow:** Serves the healthcare intake compliance workflow — consent forms expire and must be renewed; this workflow ensures no Contact remains in a non-compliant state without an actionable staff task.
- **Gate 2 – CRM Timeline:** N/A — creates SM Tasks; no CRM activity is written for the detection event itself.
- **Gate 3 – Right Level:** Vertical (healthcare) — the workflow reads `vertical_template` from SM Site Registry and exits immediately on non-healthcare tenants.

---

## 🤖 Category: AI

---

### CRM-026 — Contact Summary AI Endpoint
**Category:** AI | **Size:** XS
**Description:** Implement `GET /api/modules/crm/contacts/{id}/summary` on the MAL, assembling the last 90 days of contact metadata and activity entries, calling AWS Bedrock (⚠️ verify model name per OQ-002; directional: Haiku) to generate a 2–3 sentence plain-English relationship summary, and caching the result for 24 hours.
**Dependencies:** CRM-002, CRM-011
- **Gate 1 – Workflow:** Serves the contact preparation workflow — staff use the summary before a call, appointment, or outreach to understand the current relationship state without reading the full timeline.
- **Gate 2 – CRM Timeline:** N/A — read-only AI generation; no activity written.
- **Gate 3 – Right Level:** Universal — the summary prompt is role-aware (clinical context is included only for users with clinical role permissions); content adapts to available data regardless of vertical.

---

### CRM-027 — Lead Urgency Triage AI Endpoint
**Category:** AI | **Size:** XS
**Description:** Implement `POST /api/modules/crm/leads/{id}/triage` on the MAL, sending the lead's clinical concerns and referral notes to AWS Bedrock (⚠️ verify model name per OQ-002; directional: Haiku) with explicit crisis-detection safety guardrails and returning an urgency classification of Routine, Urgent, or Crisis with a brief reasoning string; returns HTTP 400 on non-healthcare tenants.
**Dependencies:** CRM-004, CRM-005, CRM-016
- **Gate 1 – Workflow:** Serves the healthcare intake safety workflow — new referrals with crisis indicators must surface to clinical staff immediately; this endpoint automates the first-pass triage intake coordinators currently perform manually by reading every referral note.
- **Gate 2 – CRM Timeline:** N/A — the intake coordinator's decision to escalate is logged as a manual activity note via CRM-011; this endpoint only classifies, does not act.
- **Gate 3 – Right Level:** Vertical (healthcare) — urgency triage maps to behavioral health intake and has no analog in other verticals; the safety guardrail that Crisis must never be down-classified to Routine requires explicit testing before deployment.

---

*End of STORIES.md — 27 stories across 5 categories.*

---
---

# DEPENDENCY-GRAPH.md — CRM / Client Identity Capability

**Date:** April 9, 2026
**Total stories:** 27
**Build waves:** 5 (Wave 0 – Wave 4)
**Critical path length:** 5 waves
**Earliest functional MVP:** End of Wave 3

---

## Build Waves — Parallel Execution Groups

```
╔══════════════════════════════════════════════════════════════════════╗
║  WAVE 0 — 8 stories · Commission immediately · All run in parallel  ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  BACKEND           CONFIG                                            ║
║  ─────────────     ──────                                            ║
║  CRM-001  Contact list endpoint                                      ║
║  CRM-004  Lead read endpoints                                        ║
║  CRM-007  Organization read endpoints                                ║
║  CRM-009  Global search endpoint                                     ║
║  CRM-010  Vocabulary + stages utility endpoints                      ║
║  CRM-015  CRM roles and DocType permissions                          ║
║  CRM-016  Healthcare vertical custom fields provisioning             ║
║  CRM-017  Lead pipeline stages per-vertical config                   ║
╚══════════════════════════════════════════════════════════════════════╝
                              │
                              ▼
╔══════════════════════════════════════════════════════════════════════╗
║  WAVE 1 — 6 stories · Unblocked when Wave 0 completes               ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  CRM-002  Contact detail endpoint              (needs CRM-001)       ║
║  CRM-003  Contact write endpoints              (needs CRM-001)       ║
║  CRM-005  Lead write endpoints                 (needs CRM-004)       ║
║  CRM-008  Organization create endpoint         (needs CRM-007)       ║
║  CRM-012  Duplicate check endpoint             (needs CRM-001)       ║
║  CRM-014  Consent validation server hook       (needs CRM-016)       ║
╚══════════════════════════════════════════════════════════════════════╝
                              │
                              ▼
╔══════════════════════════════════════════════════════════════════════╗
║  WAVE 2 — 7 stories · Unblocked when Wave 1 completes               ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  BACKEND           FRONTEND      INTEGRATION     AI                  ║
║  ─────────────     ────────      ───────────     ──                  ║
║  CRM-006  Lead convert endpoint        (CRM-005, CRM-003)           ║
║  CRM-011  Activity timeline endpoints  (CRM-002)                     ║
║  CRM-013  Contact merge endpoint       (CRM-012, CRM-003)           ║
║  CRM-018  Contact list component       (CRM-001, CRM-003,           ║
║                                         CRM-010, CRM-015)           ║
║  CRM-024  Nightly dup detection batch  (CRM-012, CRM-015)           ║
║  CRM-025  Consent expiration workflow  (CRM-016, CRM-014)           ║
║  CRM-027  Lead urgency triage AI       (CRM-004, CRM-005,           ║
║                                         CRM-016)                    ║
╚══════════════════════════════════════════════════════════════════════╝
                              │
                              ▼
╔══════════════════════════════════════════════════════════════════════╗
║  WAVE 3 — 5 stories · Unblocked when Wave 2 completes               ║
║  ⭐ END-OF-WAVE MVP: CRM is functionally complete (contacts, leads,  ║
║     pipeline, timeline, lead conversion, activity capture)           ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  CRM-019  Contact detail + timeline component  (CRM-002, CRM-003,   ║
║                                                 CRM-011)            ║
║  CRM-020  Lead pipeline Kanban component       (CRM-004, CRM-005,   ║
║                                                 CRM-006, CRM-010,   ║
║                                                 CRM-017)            ║
║  CRM-022  n8n Lead conversion workflow         (CRM-006, CRM-003)   ║
║  CRM-023  n8n Inbound activity webhook         (CRM-011)            ║
║  CRM-026  Contact summary AI endpoint          (CRM-002, CRM-011)   ║
╚══════════════════════════════════════════════════════════════════════╝
                              │
                              ▼
╔══════════════════════════════════════════════════════════════════════╗
║  WAVE 4 — 1 story · Final polish — requires Wave 3 complete         ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  CRM-021  Contact merge review UI  (CRM-012, CRM-013, CRM-019)      ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## Full Dependency Reference Table

| Story | Depends On | Unblocks |
|-------|-----------|---------|
| CRM-001 | — | CRM-002, CRM-003, CRM-012, CRM-018 |
| CRM-002 | CRM-001 | CRM-011, CRM-019, CRM-026 |
| CRM-003 | CRM-001 | CRM-006, CRM-013, CRM-018, CRM-019, CRM-022 |
| CRM-004 | — | CRM-005, CRM-020, CRM-027 |
| CRM-005 | CRM-004 | CRM-006, CRM-020, CRM-027 |
| CRM-006 | CRM-005, CRM-003 | CRM-020, CRM-022 |
| CRM-007 | — | CRM-008 |
| CRM-008 | CRM-007 | — |
| CRM-009 | — | — |
| CRM-010 | — | CRM-018, CRM-020 |
| CRM-011 | CRM-002 | CRM-019, CRM-023, CRM-026 |
| CRM-012 | CRM-001 | CRM-013, CRM-021, CRM-024 |
| CRM-013 | CRM-012, CRM-003 | CRM-021 |
| CRM-014 | CRM-016 | CRM-025 |
| CRM-015 | — | CRM-018, CRM-024 |
| CRM-016 | — | CRM-014, CRM-025, CRM-027 |
| CRM-017 | — | CRM-020 |
| CRM-018 | CRM-001, CRM-003, CRM-010, CRM-015 | — |
| CRM-019 | CRM-002, CRM-003, CRM-011 | CRM-021 |
| CRM-020 | CRM-004, CRM-005, CRM-006, CRM-010, CRM-017 | — |
| CRM-021 | CRM-012, CRM-013, CRM-019 | — |
| CRM-022 | CRM-006, CRM-003 | — |
| CRM-023 | CRM-011 | — |
| CRM-024 | CRM-012, CRM-015 | — |
| CRM-025 | CRM-016, CRM-014 | — |
| CRM-026 | CRM-002, CRM-011 | — |
| CRM-027 | CRM-004, CRM-005, CRM-016 | — |

---

## Critical Path

The longest chain from start to fully deployed capability:

```
CRM-001 (W0) → CRM-002 (W1) → CRM-011 (W2) → CRM-019 (W3) → CRM-021 (W4)
```

**5 waves minimum.** No story ordering can compress this further. The contact detail view (CRM-019) cannot exist until the activity timeline endpoint (CRM-011) is built, which cannot exist until the contact detail endpoint (CRM-002) is built, which cannot exist until the contact list endpoint (CRM-001) is built.

A parallel second chain drives the pipeline side:

```
CRM-004 (W0) → CRM-005 (W1) → CRM-006 (W2) → CRM-020 (W3)
                                              → CRM-022 (W3)
```

Both chains converge at Wave 3.

---

## MVP Milestone Definition

**At end of Wave 3, the CRM is functionally complete for a behavioral health pilot:**

| Capability | Stories Complete |
|-----------|----------------|
| Contact list with search | CRM-001, CRM-018 |
| Contact detail with full activity timeline | CRM-002, CRM-011, CRM-019 |
| Create and edit contacts | CRM-003 |
| Healthcare custom fields (insurance, consent, DOB) | CRM-016 |
| Lead pipeline Kanban | CRM-004, CRM-005, CRM-017, CRM-020 |
| Lead-to-client conversion (triggering n8n) | CRM-006, CRM-022 |
| Cross-system activity capture (from any Mojo) | CRM-011, CRM-023 |
| Contact summary AI | CRM-026 |
| Duplicate detection (real-time) | CRM-012 |
| Nightly duplicate batching | CRM-024 |
| Consent expiration alerts | CRM-014, CRM-025 |
| Lead urgency triage AI | CRM-027 |
| Roles and permissions enforced | CRM-015 |

**Wave 4 (CRM-021) adds:** Contact merge UI. This is data quality tooling — important but not blocking pilot use.

**Not in these 27 stories (intentional scope boundary):**
- Organization update endpoint (not in research endpoint list; add in a future story if needed)
- Phase 2+ AI features (lead source classification, no-show prediction, churn prediction, referral fax OCR, insurance card OCR) — require usage data accumulation first per AI analysis phasing
- Smart consent manager AI (Phase 3 per AI analysis)
- Relationship health score AI (Phase 4 per AI analysis)

---

## Commissioning Guidance

| When | Commission |
|------|-----------|
| **Immediately (Day 1)** | All 8 Wave 0 stories — run in parallel across available agents |
| **After first Wave 0 story passes tests** | Begin corresponding Wave 1 stories — do not wait for all Wave 0 to complete |
| **CONFIG first rule** | CRM-015 and CRM-016 should be the first two Wave 0 stories sent — backend agents building Wave 1+ will reference the role names and field names they define |
| **Wave 3 note** | CRM-022 and CRM-023 (n8n workflows) can be built in parallel with CRM-019 and CRM-020 (frontend) — they share no agent-blocking dependencies |
| **AI stories** | CRM-026 and CRM-027 can be batched together in Wave 3 as a single AI sprint alongside the frontend stories |

---

*End of DEPENDENCY-GRAPH.md*