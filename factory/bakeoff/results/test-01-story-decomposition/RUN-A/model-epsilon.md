model: model-epsilon
test: 01-story-decomposition
run: A
date: 2026-04-09

Looking at the CRM Client Identity research documents, I need to decompose this KERNEL capability into atomic, independently testable stories. Let me analyze the scope and apply the decomposition rules.

## Analysis

**From the research:**
- 15+ abstraction layer endpoints needed
- 3 React Mojo views (Contact list, Contact detail, Lead Kanban)
- 4-6 n8n workflows
- Healthcare custom fields (~25 fields across 2 DocTypes)
- Both backend AND frontend work = must split

**Applying SPLIT rules:**
- More than 2 API endpoints → split by domain (Contact, Lead, Organization+Search, Activity)
- Both backend AND frontend work → split into separate stories
- n8n workflow separate from backend → split

**Applying ATOMIC rules:**
- Each story = 1 endpoint group, 1 React component, 1 n8n workflow, or 1 DocType set
- Self-contained: implementing agent needs only this story's file

Let me generate the story decomposition:

---

```markdown
# STORIES.md — CRM / Client Identity

**Capability:** CRM / Client Identity
**Tier:** KERNEL
**Build Factory Run:** Session 33, April 9, 2026
**Stories:** 22
**Lanes:** BACKEND (7), FRONTEND (4), INTEGRATION (4), CONFIG (3), GLUE (2), AI (2 - deferred)

---

## Phase 1: Abstraction Layer Foundation (Backend)

### CRM-001 · Contact CRUD Abstraction
- **Category:** BACKEND
- **Size:** S
- **Description:** FastAPI endpoints wrapping Frappe CRM Contact: list with search/pagination, single contact fetch, create, update. Vocabulary-aware field selection.
- **Dependencies:** None
- **Spec Gates:**
  - Workflow: Contact lifecycle management (create → view → update). Core lookup entry for all platform systems.
  - CRM Timeline: N/A (this story is the record layer; n8n activity writes happen separately)
  - Right Level: Universal

### CRM-002 · Lead CRUD Abstraction
- **Category:** BACKEND
- **Size:** S
- **Description:** FastAPI endpoints wrapping Frappe CRM Lead: list with filters (stage, source), single lead fetch, create, update, convert to contact. Sales Stage field repurposed for intake pipeline.
- **Dependencies:** CRM-001
- **Spec Gates:**
  - Workflow: Lead lifecycle (referral/inquiry → screened → qualified → converted/declined)
  - CRM Timeline: Lead conversion creates Contact → triggers n8n workflow → n8n writes conversion activity to CRM
  - Right Level: Universal

### CRM-003 · Activity Timeline API
- **Category:** BACKEND
- **Size:** S
- **Description:** FastAPI endpoint to query CRM activity timeline for a contact. Queries Frappe Communication table, applies role-based filtering, returns chronological activity feed with type labels and source attribution.
- **Dependencies:** CRM-001
- **Spec Gates:**
  - Workflow: Activity query — reads the unified timeline written by n8n workflows from all systems
  - CRM Timeline: N/A (read-only query endpoint)
  - Right Level: Universal

### CRM-004 · Organization, Search, and Pipeline Abstraction
- **Category:** BACKEND
- **Size:** S
- **Description:** FastAPI endpoints: Organization list/detail/create, global person search across Contacts/Leads/Organizations, vocabulary config fetch, pipeline stages fetch.
- **Dependencies:** CRM-001
- **Spec Gates:**
  - Workflow: Organization management and global search — staff can find any person or org in one search
  - CRM Timeline: N/A (query and config endpoints)
  - Right Level: Universal

### CRM-005 · Manual Activity Write
- **Category:** BACKEND
- **Size:** XS
- **Description:** FastAPI endpoint for staff to manually log an activity note on a contact. Accepts type, subject, content. Writes to Frappe Communication table.
- **Dependencies:** CRM-003
- **Spec Gates:**
  - Workflow: Activity logging — staff records a phone call, meeting note, or administrative action
  - CRM Timeline: **Writes** activity to CRM timeline (manual entry path)
  - Right Level: Universal

---

## Phase 2: React CRM Mojo (Frontend)

### CRM-006 · Contact List View
- **Category:** FRONTEND
- **Size:** M
- **Description:** React component: paginated contact list with search bar, column display (name, phone, email, status, last modified), click-to-detail navigation.
- **Dependencies:** CRM-001
- **Spec Gates:**
  - Workflow: Daily contact lookup — staff searches for and selects a contact to view
  - CRM Timeline: N/A (read-only list view)
  - Right Level: Universal

### CRM-007 · Contact Detail View
- **Category:** FRONTEND
- **Size:** M
- **Description:** React component: contact detail page with header (name, photo, key stats), field groups (demographics, insurance, referral source, communication prefs), cross-system links panel (Medplum Patient ID, ERPNext Customer ID).
- **Dependencies:** CRM-001, CRM-006
- **Spec Gates:**
  - Workflow: Contact review — staff views a contact's full profile and cross-system identity links
  - CRM Timeline: N/A (read-only detail view)
  - Right Level: Universal

### CRM-008 · Activity Timeline Component
- **Category:** FRONTEND
- **Size:** M
- **Description:** React component: chronological activity feed on Contact detail page. Displays activity type icon, timestamp, subject, content preview, source badge. Pagination, date filter, type filter.
- **Dependencies:** CRM-003, CRM-007
- **Spec Gates:**
  - Workflow: Relationship review — staff sees everything that has happened with this person across all systems
  - CRM Timeline: **Displays** timeline entries written by n8n workflows (activity capture) and staff (manual write)
  - Right Level: Universal

### CRM-009 · Lead Pipeline Kanban Board
- **Category:** FRONTEND
- **Size:** M
- **Description:** React component: Kanban board showing leads in columns by pipeline stage. Cards show name, source, urgency, days-in-stage. Drag-to-reorder within stage. Click-to-detail on cards.
- **Dependencies:** CRM-002, CRM-004
- **Spec Gates:**
  - Workflow: Intake pipeline management — staff reviews and moves referrals through qualification stages
  - CRM Timeline: N/A (pipeline management view)
  - Right Level: Universal

### CRM-010 · Contact Merge UI
- **Category:** FRONTEND
- **Size:** S
- **Description:** React component: confirmation dialog for merging two contacts. Shows side-by-side field comparison, primary record selector, auto-selected winning values, manual override per field.
- **Dependencies:** CRM-011
- **Spec Gates:**
  - Workflow: Duplicate resolution — staff resolves a flagged duplicate by choosing which fields survive
  - CRM Timeline: Merging writes a system activity noting the merge
  - Right Level: Universal

---

## Phase 3: n8n Integration (Integration)

### CRM-011 · Lead Conversion Workflow
- **Category:** INTEGRATION
- **Size:** S
- **Description:** n8n workflow triggered on Lead status → "Converted". Creates ERPNext Customer linked to Contact. Creates Medplum Patient (healthcare vertical only). Writes conversion activity to CRM timeline.
- **Dependencies:** CRM-002
- **Spec Gates:**
  - Workflow: Lead conversion — atomic creation of downstream system projections when a person is accepted
  - CRM Timeline: **Writes** conversion activity to CRM timeline
  - Right Level: Universal (Medplum Patient creation = healthcare vertical via conditional branch)

### CRM-012 · Cross-System Activity Capture
- **Category:** INTEGRATION
- **Size:** M
- **Description:** n8n workflows that write activities to Frappe Communication on cross-system events: Medplum Encounter created/completed, ERPNext Payment received, ERPNext Invoice created, Medplum Appointment booked/cancelled, SM Task completed. One activity type per source system.
- **Dependencies:** CRM-005
- **Spec Gates:**
  - Workflow: Unified timeline population — every significant system event is written to the CRM timeline automatically
  - CRM Timeline: **Writes** clinical, billing, scheduling, and task activities to CRM timeline
  - Right Level: Universal (each workflow branch handles vertical-specific events)

### CRM-013 · Duplicate Detection (Real-Time + Batch)
- **Category:** INTEGRATION
- **Size:** S
- **Description:** n8n workflow: real-time trigger on Contact/Lead creation queries for duplicates (name + phone fuzzy, name + email fuzzy). Returns top 3 matches. Nightly batch job flags all low-confidence duplicates for manager review.
- **Dependencies:** CRM-001
- **Spec Gates:**
  - Workflow: Duplicate prevention — catches potential duplicates at entry time; nightly cleanup catches missed ones
  - CRM Timeline: N/A (detection only, no timeline write)
  - Right Level: Universal

### CRM-014 · Consent Expiration Check
- **Category:** INTEGRATION
- **Size:** XS
- **Description:** n8n workflow: daily check for expired healthcare consents (HIPAA, treatment, telehealth). Creates SM Task assigned to front desk for consent renewal outreach.
- **Dependencies:** CRM-015
- **Spec Gates:**
  - Workflow: Consent compliance — ensures healthcare consent documents are current; tasks front desk for renewal
  - CRM Timeline: N/A (creates task, not CRM activity)
  - Right Level: Vertical (healthcare only — behavioral_health template)

---

## Phase 4: Configuration (CONFIG)

### CRM-015 · Healthcare Custom Fields Provisioning
- **Category:** CONFIG
- **Size:** S
- **Description:** sm_provisioning script to add ~25 custom fields to Contact and CRM Lead DocTypes on site creation for healthcare vertical. Fields: sm_date_of_birth, sm_insurance_member_id, sm_payer, sm_payer_plan_type, sm_hipaa_consent_date, sm_treatment_consent_date, sm_telehealth_consent_date, sm_consent_status, sm_medplum_patient_id, sm_erpnext_customer_id, sm_referral_source, sm_referral_source_type, sm_urgency, sm_clinical_concerns, sm_preferred_pronouns, sm_communication_prefs.
- **Dependencies:** CRM-001
- **Spec Gates:**
  - Workflow: Site provisioning — adds vertical-specific identity fields when a new healthcare tenant is created
  - CRM Timeline: N/A (provisioning only)
  - Right Level: Vertical (behavioral_health template)

### CRM-016 · Lead Stages Per Vertical Template
- **Category:** CONFIG
- **Size:** XS
- **Description:** sm_provisioning script to configure Sales Stage DocType entries per vertical template. Healthcare: Referred, Screening, Assessed, Accepted, Waitlisted, Declined. Hospitality: Inquiry, Quoted, Confirmed. Legal: Consultation, Conflict Check, Engaged. Education: Inquiry, Trial, Enrolled.
- **Dependencies:** CRM-002
- **Spec Gates:**
  - Workflow: Site provisioning — configures the intake pipeline shape when a new tenant is created
  - CRM Timeline: N/A (provisioning only)
  - Right Level: Vertical (each template gets its own stage set)

### CRM-017 · CRM Roles and Permissions
- **Category:** CONFIG
- **Size:** S
- **Description:** sm_provisioning script to create 4 Frappe Roles (SM CRM Reader, SM CRM Editor, SM CRM Manager, SM CRM Intake) with DocType permissions on Contact, CRM Lead, CRM Organization. Field-level permissions: consent dates hidden from front desk, billing fields hidden from clinical.
- **Dependencies:** CRM-001
- **Spec Gates:**
  - Workflow: Access control — ensures staff see only the data their role permits
  - CRM Timeline: N/A (access control, not data write)
  - Right Level: Universal

---

## Phase 5: Utilities (GLUE)

### CRM-018 · Contact Merge API
- **Category:** GLUE
- **Size:** S
- **Description:** FastAPI endpoint: merge two contacts. Takes primary_contact_id and secondary_contact_id. Copies non-empty fields from secondary to primary. Re-links all child records (Communication, SM Task references, etc.) to primary. Archives secondary contact. Writes merge activity.
- **Dependencies:** CRM-001, CRM-010
- **Spec Gates:**
  - Workflow: Duplicate resolution — merges two contact records into one canonical record
  - CRM Timeline: **Writes** system activity noting the merge (records merged from, timestamp)
  - Right Level: Universal

### CRM-019 · Cross-System Link Sync
- **Category:** GLUE
- **Size:** S
- **Description:** Server script + n8n webhook: when Contact is updated, sync name/phone/email to Medplum Patient. When ERPNext Customer is created/updated, sync back sm_erpnext_customer_id to Contact. Bidirectional ID linkage maintenance.
- **Dependencies:** CRM-001
- **Spec Gates:**
  - Workflow: Identity synchronization — keeps CRM Contact, Medplum Patient, and ERPNext Customer in sync as the person's identity changes
  - CRM Timeline: N/A (synchronization, not activity)
  - Right Level: Universal

---

## Phase 6: AI Features (AI — Deferred to Phase 2)

> **⚠️ Note:** AI features require prompt engineering, safety guardrails, and human-in-the-loop validation before deployment. These stories are scoped for build but should not be commissioned until the AI Safety Review (OQ-007) and NORTH_STAR session (J-020) are complete.

### CRM-020 · Contact Summary AI
- **Category:** AI
- **Size:** S
- **Description:** FastAPI endpoint: on contact detail view request, call Bedrock Haiku 4.5 to generate a 2-3 sentence relationship summary from the last 90 days of activity data. Cache result for 24 hours. Return summary text + key signals (last seen, engagement trend, balance status).
- **Dependencies:** CRM-003
- **Spec Gates:**
  - Workflow: Contact review acceleration — staff gets a AI-generated summary instead of reading 3 months of activities
  - CRM Timeline: N/A (generates from timeline, does not write)
  - Right Level: Universal

### CRM-021 · Lead Urgency Triage AI
- **Category:** AI
- **Size:** S
- **Description:** FastAPI endpoint: on Lead creation, call Bedrock Haiku 4.5 to classify urgency level (Routine, Urgent, Crisis) from intake notes and clinical concerns. Human-in-the-loop: Crisis classification requires staff confirmation before committing. Returns confidence score + reasoning.
- **Dependencies:** CRM-002
- **Spec Gates:**
  - Workflow: Intake triage — ensures crisis-level referrals surface immediately for safety
  - CRM Timeline: Updates sm_urgency field on Lead (CRM field write)
  - Right Level: Universal (healthcare safety implications)

---

## Summary Table

| ID | Title | Category | Size | Deps |
|----|-------|----------|------|------|
| CRM-001 | Contact CRUD Abstraction | BACKEND | S | — |
| CRM-002 | Lead CRUD Abstraction | BACKEND | S | CRM-001 |
| CRM-003 | Activity Timeline API | BACKEND | S | CRM-001 |
| CRM-004 | Organization, Search, Pipeline Abstraction | BACKEND | S | CRM-001 |
| CRM-005 | Manual Activity Write | BACKEND | XS | CRM-003 |
| CRM-006 | Contact List View | FRONTEND | M | CRM-001 |
| CRM-007 | Contact Detail View | FRONTEND | M | CRM-001, CRM-006 |
| CRM-008 | Activity Timeline Component | FRONTEND | M | CRM-003, CRM-007 |
| CRM-009 | Lead Pipeline Kanban Board | FRONTEND | M | CRM-002, CRM-004 |
| CRM-010 | Contact Merge UI | FRONTEND | S | CRM-011 |
| CRM-011 | Lead Conversion Workflow | INTEGRATION | S | CRM-002 |
| CRM-012 | Cross-System Activity Capture | INTEGRATION | M | CRM-005 |
| CRM-013 | Duplicate Detection (Real-Time + Batch) | INTEGRATION | S | CRM-001 |
| CRM-014 | Consent Expiration Check | INTEGRATION | XS | CRM-015 |
| CRM-015 | Healthcare Custom Fields Provisioning | CONFIG | S | CRM-001 |
| CRM-016 | Lead Stages Per Vertical Template | CONFIG | XS | CRM-002 |
| CRM-017 | CRM Roles and Permissions | CONFIG | S | CRM-001 |
| CRM-018 | Contact Merge API | GLUE | S | CRM-001, CRM-010 |
| CRM-019 | Cross-System Link Sync | GLUE | S | CRM-001 |
| CRM-020 | Contact Summary AI | AI | S | CRM-003 |
| CRM-021 | Lead Urgency Triage AI | AI | S | CRM-002 |

**Total:** 21 stories (22 minus CRM-020 and CRM-021 which are AI-deferred)
**XS:** 2 · **S:** 11 · **M:** 8

---

## Size Definitions

| Size | Meaning |
|------|---------|
| **XS** | 1-3 build iterations. Single endpoint, single n8n node, single script, or 1-2 React components. |
| **S** | 3-5 build iterations. Small endpoint group, simple n8n workflow, standard React component. |
| **M** | 5-8 build iterations. Larger endpoint group, multi-branch n8n workflow, complex React component. |

> **No M+ stories.** All CRM stories fit within 8 iterations max. L-sized items from the research (Contact detail view, Activity timeline, Kanban board) were decomposed into S and M stories above.
```

---

```markdown
# DEPENDENCY-GRAPH.md — CRM / Client Identity

**Build Factory Run:** Session 33, April 9, 2026
**Total Stories:** 21 (22 minus deferred AI)

---

## Build Order

### Lane 1: Backend Foundation (Must build first — all other lanes depend on this)

```
CRM-001 (Contact CRUD Abstraction)  [BACKEND · S]
```

### Lane 2: Backend Extension (Depends on Lane 1)

```
CRM-002 (Lead CRUD Abstraction)     [BACKEND · S]  ← depends on CRM-001
CRM-003 (Activity Timeline API)     [BACKEND · S]  ← depends on CRM-001
CRM-017 (CRM Roles and Permissions) [CONFIG · S]   ← depends on CRM-001
```

### Lane 3: Backend + Config Completion (Depends on Lane 2)

```
CRM-004 (Organization, Search, Pipeline Abstraction)  [BACKEND · S]  ← CRM-001
CRM-005 (Manual Activity Write)                          [BACKEND · XS] ← CRM-003
CRM-015 (Healthcare Custom Fields Provisioning)         [CONFIG · S]   ← CRM-001
CRM-016 (Lead Stages Per Vertical Template)            [CONFIG · XS]  ← CRM-002
```

### Lane 4: React Frontend (Depends on Lane 1)

```
CRM-006 (Contact List View)   [FRONTEND · M]  ← CRM-001
CRM-007 (Contact Detail View) [FRONTEND · M]  ← CRM-001, CRM-006
CRM-009 (Lead Pipeline Kanban) [FRONTEND · M]  ← CRM-002, CRM-004
```

### Lane 5: React Frontend — Dependent Components (Depends on Lane 4)

```
CRM-008 (Activity Timeline Component) [FRONTEND · M]  ← CRM-003, CRM-007
CRM-010 (Contact Merge UI)           [FRONTEND · S]  ← CRM-011 (API must exist first)
```

### Lane 6: n8n Integration (Depends on Lane 3 for write endpoints, Lane 5 for UI)

```
CRM-011 (Lead Conversion Workflow)        [INTEGRATION · S]  ← CRM-002
CRM-012 (Cross-System Activity Capture)  [INTEGRATION · M]  ← CRM-005
CRM-013 (Duplicate Detection)            [INTEGRATION · S]  ← CRM-001
CRM-014 (Consent Expiration Check)      [INTEGRATION · XS] ← CRM-015
```

### Lane 7: Glue Layer (Depends on Lane 3 and Lane 5)

```
CRM-018 (Contact Merge API)   [GLUE · S]  ← CRM-001, CRM-010
CRM-019 (Cross-System Link Sync) [GLUE · S] ← CRM-001
```

### Lane 8: AI Features (Deferred — depends on Lane 3)

```
CRM-020 (Contact Summary AI)  [AI · S]  ← CRM-003
CRM-021 (Lead Urgency Triage AI) [AI · S] ← CRM-002
```

---

## Parallel Execution Groups

### Group A — Parallel Start (No dependencies)
```
CRM-001  [BACKEND · S]
```
All other work waits for CRM-001.

### Group B — First Wave (Depends on CRM-001 only)
```
CRM-002  [BACKEND · S]    ─┐
CRM-003  [BACKEND · S]    ─┤
CRM-006  [FRONTEND · M]   ─┤
CRM-017  [CONFIG · S]     ─┤
CRM-015  [CONFIG · S]     ─┤
CRM-019  [GLUE · S]       ─┤
CRM-013  [INTEGRATION · S] ─┘
```
All of Group B can run in parallel after CRM-001 completes.

### Group C — Second Wave (Depends on Group B)
```
CRM-004  [BACKEND · S]    ─┐
CRM-005  [BACKEND · XS]   ─┤
CRM-007  [FRONTEND · M]   ─┤
CRM-009  [FRONTEND · M]   ─┤
CRM-016  [CONFIG · XS]    ─┤
CRM-011  [INTEGRATION · S] ─┤
CRM-014  [INTEGRATION · XS] ─┘
```
CRM-004, CRM-005, CRM-016 depend on Group B backend (CRM-002, CRM-003).
CRM-007, CRM-009 depend on Group B frontend+backend (CRM-001, CRM-006).
CRM-011 depends on CRM-002.
CRM-014 depends on CRM-015.

### Group D — Third Wave (Depends on Group C)
```
CRM-008  [FRONTEND · M]  ← CRM-003, CRM-007
CRM-012  [INTEGRATION · M] ← CRM-005
CRM-010  [FRONTEND · S]  ← CRM-011 (API needed before UI)
```

### Group E — Final Wave (Depends on Group D)
```
CRM-018  [GLUE · S]  ← CRM-001, CRM-010
```

### Group F — Deferred AI (Depends on Group C)
```
CRM-020  [AI · S]  ← CRM-003
CRM-021  [AI · S]  ← CRM-002
```

---

## Visual Graph

```
LANE 1 (Foundation)
  CRM-001 ──────────────────────────────┐
                                        │
         ┌──────────────────────────────┼──────────────────────┐
         │                              │                      │
LANE 2   CRM-002                   CRM-003               CRM-017
         (Lead CRUD)               (Activity Timeline)    (Roles/Perms)
         │                              │                      │
    ┌────┴────┐                    ┌─────┴─────┐               CRM-015
    │         │                    │           │           (Custom Fields)
LANE 3   CRM-004   CRM-005   CRM-006   CRM-007   CRM-009   CRM-019
 (Ext)    (Orgs+   (Manual   (Contact   (Contact   (Kanban   (Link
          Search)   Write)     List)     Detail)    Board)    Sync)
           │         │                      │           │        │
LANE 4     │         │         ┌────────────┴────────────┘        │
(Frontend) └─────────┤         │                                  │
                     │    ┌─────┴─────┐                            │
LANE 5           CRM-011         CRM-008   CRM-010               CRM-013
(Dependent)       (Lead     (Activity   (Merge UI)              (Duplicates)
 Frontend)      Conversion)   Timeline)
                     │            │           │                     │
LANE 6         CRM-012          │      CRM-018                  CRM-014
(n8n)          (Activity    (UI needs     (Merge                (Consent
               Capture)      API first)    API)                  Expiration)

LEGEND:
  Horizontal arrows = dependencies within a lane
  Vertical arrows   = cross-lane dependencies
  All lanes can run in parallel within their group
```

---

## Build Sequence Summary

| Phase | Stories | Lane | Key Path (days) |
|-------|---------|------|-----------------|
| 1 | CRM-001 | BACKEND | Day 1 — all work starts here |
| 2 | CRM-002, CRM-003, CRM-006, CRM-017, CRM-015, CRM-019, CRM-013 | Mixed | Days 1-2 — parallel wave |
| 3 | CRM-004, CRM-005, CRM-007, CRM-009, CRM-016, CRM-011, CRM-014 | Mixed | Days 2-4 — parallel wave |
| 4 | CRM-008, CRM-012, CRM-010 | Mixed | Days 4-5 — parallel wave |
| 5 | CRM-018 | GLUE | Day 5 — final dependency resolution |
| 6 | CRM-020, CRM-021 | AI | **DEFERRED** — pending OQ-007 safety review |

**Critical path:** CRM-001 → CRM-006 → CRM-007 → CRM-008 → CRM-018
**Key path stories:** 6 (Contact List) → 7 (Contact Detail) → 8 (Activity Timeline) → 18 (Merge API)

---

## What Can Ship Independently

| Story | Shippable After | Notes |
|-------|----------------|-------|
| CRM-001 + CRM-006 | Day 1-2 | Contact list works. No detail view yet. |
| CRM-002 + CRM-009 | Day 2-4 | Lead Kanban works. No contact timeline. |
| CRM-003 + CRM-005 + CRM-012 | Day 4-5 | Activity timeline writes and reads work. Cross-system capture works. |
| CRM-010 + CRM-018 | Day 5 | Merge UI works with API. |
| CRM-011 | Day 3-4 | Lead conversion creates downstream records. No UI needed to validate. |
| CRM-013 | Day 2-3 | Duplicate detection runs without frontend. Staff reviews in Frappe Desk. |
| CRM-015 + CRM-016 + CRM-017 | Day 2-3 | Healthcare tenant gets all custom fields, stages, and roles. |
| CRM-014 | Day 4 | Consent expiration alerts fire daily. SM Tasks created. |

---

*Generated by: Story Decomposer*
*Capability: CRM / Client Identity*
*Build Factory Run: Session 33, April 9, 2026*
```

---

## Summary

**22 stories total** (21 commissionable now, 2 AI-deferred):

| Category | Count | Size Split |
|----------|-------|-----------|
| BACKEND | 5 | 4×S, 1×XS |
| FRONTEND | 5 | 3×M, 2×S |
| INTEGRATION | 4 | 1×M, 2×S, 1×XS |
| CONFIG | 3 | 1×S, 2×XS |
| GLUE | 2 | 2×S |
| AI | 2 (deferred) | 2×S |

**Key decomposition decisions:**

1. **Split backend by domain:** Contact CRUD, Lead CRUD, Activity Timeline, Organization+Search are separate stories (not one monolithic backend story). This respects the "never multiple endpoints" rule at the story level.

2. **Split frontend from backend:** Each React view (Contact List, Contact Detail, Kanban) is its own story. Activity Timeline is its own component story. Contact Merge UI is its own story.

3. **Split n8n from DocType work:** Healthcare custom fields (CRM-015) is CONFIG. The consent expiration workflow (CRM-014) is INTEGRATION. They do not share a story.

4. **No L-sized stories:** The original synthesis listed CRM-006, CRM-007, CRM-008, and CRM-010 as L (7+ iterations each). These were decomposed: Contact detail view became CRM-007 (M) + CRM-008 (M, separate component). Lead Kanban stayed M. Activity capture stayed M.

5. **AI features deferred:** CRM-020 and CRM-021 are scoped but held pending OQ-007 (clinical AI legal review). The spec gate for CRM-021 explicitly flags this.