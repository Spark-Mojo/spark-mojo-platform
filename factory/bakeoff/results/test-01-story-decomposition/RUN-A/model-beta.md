model: model-beta
test: 01-story-decomposition
run: A
date: 2026-04-09

# STORIES.md

```markdown
# CRM / Client Identity — Atomic Story Decomposition

**Capability:** CRM / Client Identity
**Tier:** KERNEL
**Decomposed:** April 9, 2026
**Source Research:** CRM-CLIENT-IDENTITY-WORKFLOW-RESEARCH.md, CRM-CLIENT-IDENTITY-TECHNICAL-RESEARCH.md, CRM-CLIENT-IDENTITY-AI-ANALYSIS.md, CRM-CLIENT-IDENTITY-SYNTHESIS.md
**Authority:** DECISION-013, DECISION-020, PLATFORM-GUARDRAILS.md
**Story Count:** 29
**Categories:** BACKEND (12), CONFIG (3), FRONTEND (4), INTEGRATION (6), GLUE (1), AI (3)

---

## BACKEND

---

### CRM-001 · Contact Read Endpoints
**Category:** BACKEND · **Size:** S

MAL endpoints `GET /api/modules/crm/contacts/list` (search, filter, paginate) and `GET /api/modules/crm/contacts/{id}` (single contact record without activity timeline) wrapping Frappe CRM Contact DocType via `frappe.get_list` and `frappe.get_doc`.

**Dependencies:** None
**Workflow:** Daily contact lookup — staff searches for and views person records across all relationship types.
**CRM Timeline:** N/A (read-only endpoints).
**Right Level:** Universal — every vertical needs contact reads.

---

### CRM-002 · Contact Write Endpoints
**Category:** BACKEND · **Size:** S

MAL endpoints `POST /api/modules/crm/contacts/create` and `PUT /api/modules/crm/contacts/{id}/update` wrapping Frappe CRM Contact insert and save, with field validation and `sm_` custom field support.

**Dependencies:** CRM-001
**Workflow:** Contact creation and update — staff creates person records during intake or updates contact information during data maintenance.
**CRM Timeline:** Contact creation writes a "Contact Created" activity via Communication DocType.
**Right Level:** Universal.

---

### CRM-003 · Lead Read Endpoints
**Category:** BACKEND · **Size:** S

MAL endpoints `GET /api/modules/crm/leads/list` (with stage filtering for pipeline views) and `GET /api/modules/crm/leads/{id}` (single lead detail) wrapping Frappe CRM Lead DocType.

**Dependencies:** None
**Workflow:** Referral/inquiry pipeline — intake staff views and filters incoming leads by pipeline stage.
**CRM Timeline:** N/A (read-only endpoints).
**Right Level:** Universal — all verticals have an intake pipeline concept.

---

### CRM-004 · Lead Write Endpoints
**Category:** BACKEND · **Size:** S

MAL endpoints `POST /api/modules/crm/leads/create` and `PUT /api/modules/crm/leads/{id}/update` wrapping CRM Lead insert and save, including `sm_referral_source`, `sm_urgency`, and `sm_clinical_concerns` custom fields.

**Dependencies:** CRM-003
**Workflow:** New referral/inquiry intake — staff records incoming inquiries and updates their qualification status through pipeline stages.
**CRM Timeline:** Lead creation writes a "New Lead" activity via Communication DocType.
**Right Level:** Universal.

---

### CRM-005 · Lead Conversion Endpoint
**Category:** BACKEND · **Size:** S

MAL endpoint `POST /api/modules/crm/leads/{id}/convert` that creates a Contact from Lead data, copies relevant fields (name, email, phone, referral source), and sets Lead status to "Converted"; returns the new Contact record.

**Dependencies:** CRM-002, CRM-004
**Workflow:** Lead-to-Contact conversion — a qualified lead is accepted and promoted to a permanent contact record.
**CRM Timeline:** Writes "Lead Converted to Contact" activity on the new Contact.
**Right Level:** Universal.

---

### CRM-006 · Organization Read Endpoints
**Category:** BACKEND · **Size:** S

MAL endpoints `GET /api/modules/crm/organizations/list` and `GET /api/modules/crm/organizations/{id}` (with linked contacts) wrapping CRM Organization DocType.

**Dependencies:** None
**Workflow:** Referral source management — staff views referring organizations, payers, and employer entities.
**CRM Timeline:** N/A (read-only endpoints).
**Right Level:** Universal.

---

### CRM-007 · Organization Create Endpoint
**Category:** BACKEND · **Size:** XS

MAL endpoint `POST /api/modules/crm/organizations/create` wrapping CRM Organization insert with name, website, industry, and linked contact support.

**Dependencies:** CRM-006
**Workflow:** Referral source creation — staff adds new referring organizations, payer contacts, or partner entities.
**CRM Timeline:** N/A (organizations do not have individual timelines in v1).
**Right Level:** Universal.

---

### CRM-008 · Global Search Endpoint
**Category:** BACKEND · **Size:** S

MAL endpoint `GET /api/modules/crm/search?q=` that searches across Contacts (name, email, phone), Leads (name, email, phone), and Organizations (name) using `or_filters` with fuzzy `like` matching; returns categorized results capped at 10 per type.

**Dependencies:** CRM-001, CRM-003, CRM-006
**Workflow:** Daily contact lookup — staff searches across all person and organization types from a single search bar.
**CRM Timeline:** N/A (read-only).
**Right Level:** Universal.

---

### CRM-009 · Activity Timeline Endpoints
**Category:** BACKEND · **Size:** S

MAL endpoints `GET /api/modules/crm/activities/{contact_id}` (paginated, chronological, role-filtered activity list from Communication DocType) and `POST /api/modules/crm/activities/create` (manual activity note creation linked to a Contact).

**Dependencies:** CRM-001
**Workflow:** Contact interaction tracking — staff views full cross-system activity history and records manual interaction notes.
**CRM Timeline:** POST endpoint creates a manual activity entry on the contact's timeline.
**Right Level:** Universal.

---

### CRM-010 · Duplicate Check Endpoint
**Category:** BACKEND · **Size:** S

MAL endpoint `GET /api/modules/crm/contacts/{id}/duplicates` that performs fuzzy matching on phone, email, and name fields against existing Contacts; returns potential matches with match-reason metadata.

**Dependencies:** CRM-001
**Workflow:** Contact creation data quality — system checks for potential duplicates when new records are created.
**CRM Timeline:** N/A (read-only check).
**Right Level:** Universal.

---

### CRM-011 · Contact Merge Endpoint
**Category:** BACKEND · **Size:** S

MAL endpoint `POST /api/modules/crm/contacts/{id}/merge` (Manager role required) that accepts a source and target Contact ID, reassigns all Communication/activity records, transfers cross-system links (`sm_medplum_patient_id`, `sm_erpnext_customer_id`), and archives the source record.

**Dependencies:** CRM-001, CRM-010
**Workflow:** Data quality maintenance — manager merges confirmed duplicate contact records into a single canonical record.
**CRM Timeline:** Writes "Contact Merged — [source] merged into [target]" activity.
**Right Level:** Universal.

---

### CRM-012 · Vocabulary and Stages Read Endpoints
**Category:** BACKEND · **Size:** XS

MAL endpoints `GET /api/modules/crm/vocabulary` (returns tenant-specific label map from SM Site Registry) and `GET /api/modules/crm/stages` (returns configured Sales Stage records for the current site's pipeline).

**Dependencies:** CRM-014
**Workflow:** CRM UI initialization — React Mojo loads tenant-specific labels ("Client" vs. "Patient") and pipeline stage definitions on mount.
**CRM Timeline:** N/A (config read).
**Right Level:** Universal (returns vertical-specific configuration).

---

## CONFIG

---

### CRM-013 · Healthcare Custom Fields Provisioning
**Category:** CONFIG · **Size:** S

Provisioning script that adds ~15 `sm_` custom fields to Contact DocType (DOB, insurance member ID, payer link, consent dates, Medplum patient ID, ERPNext customer ID, pronouns, communication prefs) and ~5 to CRM Lead (referral source, urgency, clinical concerns, insurance notes) for the behavioral health vertical template.

**Dependencies:** None
**Workflow:** Tenant provisioning — healthcare-specific CRM fields are created during site setup based on `behavioral_health.yaml` template.
**CRM Timeline:** N/A (provisioning-time configuration).
**Right Level:** Vertical (behavioral health template).

---

### CRM-014 · Vertical Pipeline and Vocabulary Configuration
**Category:** CONFIG · **Size:** S

Provisioning script that inserts Sales Stage records per vertical template (healthcare: Referred → Screening → Assessed → Accepted → Waitlisted → Declined) and writes vocabulary mapping JSON to SM Site Registry (`person: "Client"`, `lead: "Referral"`, etc.).

**Dependencies:** None
**Workflow:** Tenant provisioning — pipeline stages and UI labels are configured per vertical during site creation.
**CRM Timeline:** N/A (provisioning-time configuration).
**Right Level:** Vertical (template-driven; each vertical has its own stage/vocabulary set).

---

### CRM-015 · CRM Roles and Permissions
**Category:** CONFIG · **Size:** S

Creates four Frappe Roles (`SM CRM Reader`, `SM CRM Editor`, `SM CRM Manager`, `SM CRM Intake`) with DocType-level permissions on Contact, CRM Lead, and CRM Organization; configures field-level permissions to hide consent/insurance fields from unauthorized roles; sets up User Permission patterns for clinician caseload restriction.

**Dependencies:** None
**Workflow:** Tenant provisioning — role-based access control for all CRM data is established during site setup.
**CRM Timeline:** N/A (provisioning-time configuration).
**Right Level:** Role level.

---

## FRONTEND

---

### CRM-016 · React Contact List View
**Category:** FRONTEND · **Size:** S

React component rendering a searchable, filterable, paginated Contact list; consumes `CRM-001` list endpoint and `CRM-008` search endpoint; renders vocabulary-mapped labels from `CRM-012`; supports status filter and click-through to detail view; uses `var(--sm-*)` tokens only.

**Dependencies:** CRM-001, CRM-008, CRM-012
**Workflow:** Daily contact lookup — staff browses and searches person records from the CRM Mojo landing view.
**CRM Timeline:** N/A (read-only UI).
**Right Level:** Universal.

---

### CRM-017 · React Contact Detail View
**Category:** FRONTEND · **Size:** S

React component rendering a single Contact's full record: demographic fields, vertical-specific fields (consent status, insurance), and a scrollable activity timeline fed by `CRM-009`; includes inline activity note creation form; vocabulary labels from `CRM-012`; uses `var(--sm-*)` tokens only.

**Dependencies:** CRM-001, CRM-009, CRM-012
**Workflow:** Daily contact lookup — staff views complete person record with cross-system interaction history.
**CRM Timeline:** N/A (read-only UI; activity creation calls CRM-009 API).
**Right Level:** Universal.

---

### CRM-018 · React Lead Pipeline Kanban View
**Category:** FRONTEND · **Size:** S

React component rendering a Kanban board with columns from `CRM-012` stages endpoint; cards show lead name, source, urgency, and creation date from `CRM-003`; drag-and-drop triggers `CRM-004` update to change stage; vocabulary-mapped column headers; uses `var(--sm-*)` tokens only.

**Dependencies:** CRM-003, CRM-004, CRM-012
**Workflow:** Referral/inquiry pipeline — intake staff manages leads through qualification stages with visual drag-and-drop.
**CRM Timeline:** N/A (stage changes via CRM-004 API may generate timeline entries).
**Right Level:** Universal.

---

### CRM-019 · React Contact Merge Modal
**Category:** FRONTEND · **Size:** XS

React modal component showing side-by-side comparison of two Contact records; user selects which field values to keep; submit calls `CRM-011` merge endpoint; accessible from Contact detail view when duplicate is flagged; uses `var(--sm-*)` tokens only.

**Dependencies:** CRM-011, CRM-017
**Workflow:** Data quality maintenance — manager resolves flagged duplicate records through visual comparison.
**CRM Timeline:** N/A (merge action via CRM-011 writes timeline entry).
**Right Level:** Universal.

---

## INTEGRATION

---

### CRM-020 · n8n Lead Conversion Workflow
**Category:** INTEGRATION · **Size:** S

Single n8n workflow triggered by Frappe webhook on CRM Lead status change to "Converted"; creates ERPNext Customer (all verticals) and Medplum Patient (healthcare vertical, conditional on `vertical_template`); writes `sm_erpnext_customer_id` and `sm_medplum_patient_id` back to the new Contact; writes CRM activity entries for each record created.

**Dependencies:** CRM-005
**Workflow:** Lead conversion — automated downstream record creation when a lead is accepted into the business.
**CRM Timeline:** Writes "ERPNext Customer Created" and (if healthcare) "Medplum Patient Created" activities.
**Right Level:** Universal (Medplum step is vertical-conditional).

---

### CRM-021 · n8n Billing Event Activity Capture
**Category:** INTEGRATION · **Size:** XS

Single n8n workflow triggered by ERPNext webhook on Sales Invoice submit, Payment Entry submit, and SM Claim state change; writes a Communication record to the linked CRM Contact with billing-specific activity type, subject, and amount.

**Dependencies:** CRM-009
**Workflow:** Cross-system activity capture — billing events (invoices, payments, claims) appear on the contact timeline.
**CRM Timeline:** Writes billing activity (e.g., "Payment Received: $175 via credit card").
**Right Level:** Universal.

---

### CRM-022 · n8n Clinical Event Activity Capture
**Category:** INTEGRATION · **Size:** XS

Single n8n workflow triggered by Medplum FHIR subscription on Encounter create/update and Observation create; writes a Communication record to the linked CRM Contact (resolved via `sm_medplum_patient_id`) with clinical activity type and summary.

**Dependencies:** CRM-009
**Workflow:** Cross-system activity capture — clinical events (sessions, assessments) appear on the contact timeline.
**CRM Timeline:** Writes clinical activity (e.g., "Session Completed — DAP note filed").
**Right Level:** Vertical (healthcare).

---

### CRM-023 · n8n Scheduling Event Activity Capture
**Category:** INTEGRATION · **Size:** XS

Single n8n workflow triggered by Medplum FHIR subscription on Appointment create/update/cancel; writes a Communication record to the linked CRM Contact with scheduling activity type, provider name, date, and status.

**Dependencies:** CRM-009
**Workflow:** Cross-system activity capture — scheduling events (bookings, cancellations, no-shows) appear on the contact timeline.
**CRM Timeline:** Writes scheduling activity (e.g., "Appointment Booked: April 15 2pm with Dr. Smith").
**Right Level:** Universal.

---

### CRM-024 · n8n Nightly Duplicate Detection Batch
**Category:** INTEGRATION · **Size:** XS

Single n8n workflow on nightly cron schedule; queries all Contacts with fuzzy matching on name + phone + email + DOB; groups potential duplicates by confidence score; creates an SM Task per duplicate set for Manager review.

**Dependencies:** CRM-010
**Workflow:** Data quality — proactive nightly detection of potential duplicate records across the full contact base.
**CRM Timeline:** N/A (creates SM Task, not a CRM timeline activity).
**Right Level:** Universal.

---

### CRM-025 · n8n Consent Expiration Check
**Category:** INTEGRATION · **Size:** XS

Single n8n workflow on daily cron schedule; queries Contact records where `sm_hipaa_consent_date`, `sm_treatment_consent_date`, or `sm_telehealth_consent_date` is older than the configured expiration window (default: 365 days); creates an SM Task per expired consent for front desk follow-up; writes a CRM activity on the affected Contact.

**Dependencies:** CRM-013
**Workflow:** Consent tracking — automated daily monitoring of consent expiration dates for healthcare compliance.
**CRM Timeline:** Writes "Consent Expiration Alert — [consent type] expired" on affected Contact.
**Right Level:** Vertical (healthcare).

---

## GLUE

---

### CRM-026 · Frappe Server Hooks for Contact Lifecycle
**Category:** GLUE · **Size:** XS

Server-side hooks in `sm_widgets/crm_hooks.py`: `on_contact_insert` sets `sm_consent_status` to "Incomplete" for healthcare verticals; `validate_contact` auto-computes `sm_consent_status` (Complete/Incomplete/Expired) from consent date fields; validates `sm_date_of_birth` is in the past.

**Dependencies:** CRM-013
**Workflow:** Contact data integrity — automatic consent status computation and field validation on every Contact save.
**CRM Timeline:** N/A (modifies Contact record fields, does not write timeline entries).
**Right Level:** Vertical (healthcare-specific logic; no-op on non-healthcare sites).

---

## AI

---

### CRM-027 · AI Contact Summary Generation
**Category:** AI · **Size:** S

MAL endpoint `GET /api/modules/crm/contacts/{id}/summary` that retrieves the last 90 days of activities from `CRM-009`, sends them to AWS Bedrock (Haiku 4.5) with a prompt template, and returns a 2–3 sentence natural-language relationship summary; response cached for 24 hours per Contact; estimated cost $0.0024/operation.

**Dependencies:** CRM-009
**Workflow:** Daily contact lookup — AI-generated summary gives staff instant context ("Active client since Jan 2026. 12 sessions with Dr. Smith. PHQ-9 trending down. Balance: $0.").
**CRM Timeline:** N/A (read-only AI output, not persisted to timeline).
**Right Level:** Universal.

---

### CRM-028 · AI Activity Type Classification
**Category:** AI · **Size:** XS

Utility function callable by n8n activity capture workflows (CRM-021/022/023) that sends activity text to AWS Bedrock (Nova Micro) and returns a classified type label (clinical, billing, scheduling, communication, task, consent, system); enables role-based activity filtering in CRM-009; estimated cost $0.00003/operation.

**Dependencies:** CRM-009
**Workflow:** Cross-system activity capture — auto-tags incoming activities for role-based timeline filtering without manual tagging.
**CRM Timeline:** Enriches activity records with a `communication_type` classification.
**Right Level:** Universal.

---

### CRM-029 · AI Duplicate Confidence Scoring
**Category:** AI · **Size:** XS

Enhancement to `CRM-010` duplicate check that sends candidate pairs to AWS Bedrock (Nova Micro) for fuzzy confidence scoring (0–100) with match-reason explanation; augments deterministic phone/email matching with name-similarity, address-proximity, and DOB-closeness signals; estimated cost $0.000014/operation.

**Dependencies:** CRM-010
**Workflow:** Data quality — AI-scored confidence reduces false positives, so staff only reviews high-confidence duplicate matches.
**CRM Timeline:** N/A (scoring metadata attached to duplicate check response, not timeline).
**Right Level:** Universal.

---

## Summary Table

| ID | Title | Category | Size | Dependencies |
|----|-------|----------|------|-------------|
| CRM-001 | Contact Read Endpoints | BACKEND | S | None |
| CRM-002 | Contact Write Endpoints | BACKEND | S | CRM-001 |
| CRM-003 | Lead Read Endpoints | BACKEND | S | None |
| CRM-004 | Lead Write Endpoints | BACKEND | S | CRM-003 |
| CRM-005 | Lead Conversion Endpoint | BACKEND | S | CRM-002, CRM-004 |
| CRM-006 | Organization Read Endpoints | BACKEND | S | None |
| CRM-007 | Organization Create Endpoint | BACKEND | XS | CRM-006 |
| CRM-008 | Global Search Endpoint | BACKEND | S | CRM-001, CRM-003, CRM-006 |
| CRM-009 | Activity Timeline Endpoints | BACKEND | S | CRM-001 |
| CRM-010 | Duplicate Check Endpoint | BACKEND | S | CRM-001 |
| CRM-011 | Contact Merge Endpoint | BACKEND | S | CRM-001, CRM-010 |
| CRM-012 | Vocabulary & Stages Read Endpoints | BACKEND | XS | CRM-014 |
| CRM-013 | Healthcare Custom Fields Provisioning | CONFIG | S | None |
| CRM-014 | Vertical Pipeline & Vocabulary Config | CONFIG | S | None |
| CRM-015 | CRM Roles and Permissions | CONFIG | S | None |
| CRM-016 | React Contact List View | FRONTEND | S | CRM-001, CRM-008, CRM-012 |
| CRM-017 | React Contact Detail View | FRONTEND | S | CRM-001, CRM-009, CRM-012 |
| CRM-018 | React Lead Pipeline Kanban | FRONTEND | S | CRM-003, CRM-004, CRM-012 |
| CRM-019 | React Contact Merge Modal | FRONTEND | XS | CRM-011, CRM-017 |
| CRM-020 | n8n Lead Conversion Workflow | INTEGRATION | S | CRM-005 |
| CRM-021 | n8n Billing Event Activity Capture | INTEGRATION | XS | CRM-009 |
| CRM-022 | n8n Clinical Event Activity Capture | INTEGRATION | XS | CRM-009 |
| CRM-023 | n8n Scheduling Event Activity Capture | INTEGRATION | XS | CRM-009 |
| CRM-024 | n8n Nightly Duplicate Detection Batch | INTEGRATION | XS | CRM-010 |
| CRM-025 | n8n Consent Expiration Check | INTEGRATION | XS | CRM-013 |
| CRM-026 | Frappe Server Hooks for Contact Lifecycle | GLUE | XS | CRM-013 |
| CRM-027 | AI Contact Summary Generation | AI | S | CRM-009 |
| CRM-028 | AI Activity Type Classification | AI | XS | CRM-009 |
| CRM-029 | AI Duplicate Confidence Scoring | AI | XS | CRM-010 |
```

---

# DEPENDENCY-GRAPH.md

```markdown
# CRM / Client Identity — Dependency Graph & Build Order

**Generated:** April 9, 2026
**Total Stories:** 29 (16 S + 13 XS)

---

## Build Order by Parallel Execution Group

Stories within the same group have NO cross-dependencies and can be built simultaneously.
Each group requires ALL stories in the previous group to be complete.

---

### GROUP 1 — Foundation (No Dependencies)
> **All stories in this group can be built in parallel. Start here.**

```
┌─────────────────────────────────────────────────────────────┐
│  CRM-001  Contact Read Endpoints              BACKEND   S  │
│  CRM-003  Lead Read Endpoints                 BACKEND   S  │
│  CRM-006  Organization Read Endpoints         BACKEND   S  │
│  CRM-013  Healthcare Custom Fields Prov.      CONFIG    S  │
│  CRM-014  Vertical Pipeline & Vocab Config    CONFIG    S  │
│  CRM-015  CRM Roles and Permissions           CONFIG    S  │
└─────────────────────────────────────────────────────────────┘
  6 stories  ·  all independent  ·  maximum parallelism
```

---

### GROUP 2 — Core CRUD + Config Reads (Depends on Group 1)

```
┌─────────────────────────────────────────────────────────────┐
│  CRM-002  Contact Write Endpoints             BACKEND   S  │ ← CRM-001
│  CRM-004  Lead Write Endpoints                BACKEND   S  │ ← CRM-003
│  CRM-007  Organization Create Endpoint        BACKEND  XS  │ ← CRM-006
│  CRM-008  Global Search Endpoint              BACKEND   S  │ ← CRM-001, CRM-003, CRM-006
│  CRM-009  Activity Timeline Endpoints         BACKEND   S  │ ← CRM-001
│  CRM-010  Duplicate Check Endpoint            BACKEND   S  │ ← CRM-001
│  CRM-012  Vocabulary & Stages Read EPs        BACKEND  XS  │ ← CRM-014
│  CRM-025  n8n Consent Expiration Check        INTEG    XS  │ ← CRM-013
│  CRM-026  Frappe Server Hooks                 GLUE     XS  │ ← CRM-013
└─────────────────────────────────────────────────────────────┘
  9 stories  ·  all depend only on Group 1  ·  maximum parallelism
```

---

### GROUP 3 — Composite Backend + Frontend + AI (Depends on Group 2)

```
┌─────────────────────────────────────────────────────────────┐
│  CRM-005  Lead Conversion Endpoint            BACKEND   S  │ ← CRM-002, CRM-004
│  CRM-011  Contact Merge Endpoint              BACKEND   S  │ ← CRM-001, CRM-010
│  CRM-016  React Contact List View             FRONT     S  │ ← CRM-001, CRM-008, CRM-012
│  CRM-017  React Contact Detail View           FRONT     S  │ ← CRM-001, CRM-009, CRM-012
│  CRM-018  React Lead Pipeline Kanban          FRONT     S  │ ← CRM-003, CRM-004, CRM-012
│  CRM-021  n8n Billing Event Activity          INTEG    XS  │ ← CRM-009
│  CRM-022  n8n Clinical Event Activity         INTEG    XS  │ ← CRM-009
│  CRM-023  n8n Scheduling Event Activity       INTEG    XS  │ ← CRM-009
│  CRM-024  n8n Nightly Dedup Batch             INTEG    XS  │ ← CRM-010
│  CRM-027  AI Contact Summary Generation       AI        S  │ ← CRM-009
│  CRM-028  AI Activity Type Classification     AI       XS  │ ← CRM-009
│  CRM-029  AI Duplicate Confidence Scoring     AI       XS  │ ← CRM-010
└─────────────────────────────────────────────────────────────┘
  12 stories  ·  all depend only on Groups 1-2  ·  maximum parallelism
```

---

### GROUP 4 — Final Composites (Depends on Group 3)

```
┌─────────────────────────────────────────────────────────────┐
│  CRM-019  React Contact Merge Modal           FRONT    XS  │ ← CRM-011, CRM-017
│  CRM-020  n8n Lead Conversion Workflow        INTEG     S  │ ← CRM-005
└─────────────────────────────────────────────────────────────┘
  2 stories  ·  both depend on Group 3 items
```

---

## Full Dependency Map (Arrow = "depends on")

```
           GROUP 1                    GROUP 2                  GROUP 3               GROUP 4
       ┌──────────┐
       │ CRM-001  │──┬──────────────► CRM-002 ──┐
       │ Contact  │  ├──────────────► CRM-009 ──┼──────────► CRM-021
       │ Reads    │  ├──────────────► CRM-010 ──┼──────────► CRM-022
       │          │  │               │           │            CRM-023
       │          │  │               │           ├──────────► CRM-027
       │          │  │               │           ├──────────► CRM-028
       │          │  │               │           │
       │          │  │               │ CRM-010 ──┼──────────► CRM-011 ──► CRM-019
       │          │  │               │           ├──────────► CRM-024
       │          │  │               │           └──────────► CRM-029
       └──────────┘  │               │
                     │               │
       ┌──────────┐  │               │
       │ CRM-003  │──┼──────────────► CRM-004 ──┤
       │ Lead     │  │               │           ├──CRM-005──► CRM-020
       │ Reads    │  │               │           │
       └──────────┘  │               │           │
                     │               │           │
       ┌──────────┐  │               │           │
       │ CRM-006  │──┼──────────────► CRM-007   │
       │ Org      │  │               │           │
       │ Reads    │  │               │           │
       └──────────┘  │               │           │
                     └──► CRM-008 ───┤           │
                                     │           │
       ┌──────────┐                  │           │
       │ CRM-014  │────────────────► CRM-012 ───┤
       │ Pipeline │                  │           ├──────────► CRM-016
       │ & Vocab  │                  │           ├──────────► CRM-017 ──► CRM-019
       └──────────┘                  │           └──────────► CRM-018
                                     │
       ┌──────────┐                  │
       │ CRM-013  │──┬──────────────► CRM-025
       │ Custom   │  └──────────────► CRM-026
       │ Fields   │
       └──────────┘

       ┌──────────┐
       │ CRM-015  │  (no downstream deps within CRM)
       │ Roles    │
       └──────────┘
```

---

## Critical Path

The longest dependency chain determines minimum calendar time:

```
CRM-001 → CRM-010 → CRM-011 → CRM-019    (4 groups)
CRM-001 → CRM-002 ─┐
CRM-003 → CRM-004 ─┴→ CRM-005 → CRM-020  (4 groups)
CRM-014 → CRM-012 → CRM-017 → CRM-019    (4 groups)
```

**Minimum build groups: 4** (regardless of parallelism capacity).

---

## Lane Summary

| Group | Stories | Backend | Config | Frontend | Integration | Glue | AI |
|-------|---------|---------|--------|----------|-------------|------|----|
| 1     | 6       | 3       | 3      | 0        | 0           | 0    | 0  |
| 2     | 9       | 6       | 0      | 0        | 1           | 1    | 0  |
| 3     | 12      | 2       | 0      | 3        | 3           | 0    | 3  |
| 4     | 2       | 0       | 0      | 1        | 1           | 0    | 0  |
| **Total** | **29** | **11** | **3** | **4**    | **5**       | **1** | **3** |

---

## Notes

1. **CONFIG stories (Group 1) have no downstream CRM-timeline impact** but are prerequisites for CRM-012 (vocabulary/stages read) and CRM-026 (server hooks). Build them early.
2. **CRM-009 (Activity Timeline) is the most depended-upon story** — 6 downstream stories (3 n8n workflows, 1 frontend, 2 AI). Prioritize it within Group 2.
3. **AI stories (Group 3) are all independently testable** and can be deferred without blocking any other story. They enhance but do not gate the core CRM.
4. **n8n activity capture stories (CRM-021/022/023) require their respective source systems** (ERPNext billing, Medplum clinical, Medplum scheduling) to be generating events. These are soft external dependencies not shown in this graph.
5. **CRM-015 (Roles & Permissions)** has no in-graph dependents but should be applied before any frontend story is tested with real role-based access.
```