model: model-gamma
test: 02-spec-writing
run: A
date: 2026-04-09

# STORIES.md

## CRM / Client Identity — Atomic Story Decomposition

| ID | Title | Category | Size | Description | Dependencies | Spec Gate: Workflow | Spec Gate: CRM Timeline | Spec Gate: Right Level |
|---|---|---|---|---|---|---|---|---|
| CRM-001 | Contact list endpoint | BACKEND | XS | GET `/api/modules/crm/contacts/list` with search, pagination, and field selection | None | Daily contact lookup: staff searches for a person to handle interaction | N/A (read endpoint) | Universal |
| CRM-002 | Contact detail endpoint | BACKEND | S | GET `/api/modules/crm/contacts/{id}` returning contact with activity timeline | CRM-001 | Daily contact lookup: staff views complete person record | N/A (read endpoint) | Universal |
| CRM-003 | Contact create endpoint | BACKEND | XS | POST `/api/modules/crm/contacts/create` to add new person records | None | New referral/inquiry: person record created when someone contacts business | Writes Contact creation activity | Universal |
| CRM-004 | Contact update endpoint | BACKEND | XS | PUT `/api/modules/crm/contacts/{id}/update` for field modifications | None | Returning client re-engagement: update contact info, reason for return | Writes Contact update activity | Universal |
| CRM-005 | Contact merge endpoint | BACKEND | S | POST `/api/modules/crm/contacts/{id}/merge` to combine duplicate records | CRM-002, CRM-028 | Duplicate resolution: merge two records into canonical person | Writes merge activity to surviving contact | Universal |
| CRM-006 | Lead list endpoint | BACKEND | XS | GET `/api/modules/crm/leads/list` with pipeline stage filtering | None | Intake pipeline management: view and manage incoming referrals | N/A (read endpoint) | Universal |
| CRM-007 | Lead detail endpoint | BACKEND | XS | GET `/api/modules/crm/leads/{id}` returning lead with notes and status | CRM-006 | Intake qualification: review referral details before acceptance | N/A (read endpoint) | Universal |
| CRM-008 | Lead create endpoint | BACKEND | XS | POST `/api/modules/crm/leads/create` for new referrals/inquiries | None | New referral intake: record person's initial contact and source | Writes Lead creation activity | Universal |
| CRM-009 | Lead update endpoint | BACKEND | XS | PUT `/api/modules/crm/leads/{id}/update` for stage transitions | None | Lead qualification: update stage as person moves through pipeline | Writes Lead stage change activity | Universal |
| CRM-010 | Lead convert endpoint | BACKEND | S | POST `/api/modules/crm/leads/{id}/convert` creating Contact from Lead | CRM-003 | Lead acceptance: qualified person becomes client/patient | Writes conversion activity to new Contact | Universal |
| CRM-011 | Organization list and detail endpoints | BACKEND | S | GET `/api/modules/crm/organizations/list` and GET `/organizations/{id}` | None | Referral source management: view organizations that send clients | N/A (read endpoints) | Universal |
| CRM-012 | Organization create endpoint | BACKEND | XS | POST `/api/modules/crm/organizations/create` for new entities | None | Referral source setup: add new referral source organizations | Writes Organization creation activity | Universal |
| CRM-013 | Global search endpoint | BACKEND | S | GET `/api/modules/crm/search` across Contacts, Leads, Organizations | None | Daily contact lookup: find person by name, phone, email, or ID | N/A (read endpoint) | Universal |
| CRM-014 | Vocabulary mapping endpoint | BACKEND | XS | GET `/api/modules/crm/vocabulary` returning vertical-specific labels | None | Vocabulary abstraction: React Mojo renders correct labels per vertical | N/A (configuration endpoint) | Universal |
| CRM-015 | Activity timeline endpoints | BACKEND | S | GET `/api/modules/crm/activities/{contact_id}` and POST `/activities/create` | None | Unified person timeline: view all interactions; staff adds manual notes | POST writes manual activity note | Universal |
| CRM-016 | Pipeline stages endpoint | BACKEND | XS | GET `/api/modules/crm/stages` returning configured Lead stages | None | Pipeline configuration: frontend renders correct stage columns | N/A (configuration endpoint) | Universal |
| CRM-017 | Healthcare Contact custom fields | CONFIG | S | Add sm_date_of_birth, sm_insurance_member_id, sm_payer, sm_consent fields to Contact DocType | None | Healthcare intake: capture insurance, DOB, consent status per patient | N/A (provisioning step) | Vertical (healthcare) |
| CRM-018 | Healthcare Lead custom fields | CONFIG | XS | Add sm_referral_source_type, sm_urgency, sm_clinical_concerns to Lead DocType | None | Healthcare intake: capture referral source, urgency, clinical concerns | N/A (provisioning step) | Vertical (healthcare) |
| CRM-019 | Lead stages per vertical configuration | CONFIG | S | Configure Sales Stage DocType with vertical-specific pipeline stages | None | Intake pipeline: stages reflect vertical workflow (Referred→Screened→Accepted) | N/A (provisioning step) | Vertical (each template) |
| CRM-020 | CRM roles and permissions setup | CONFIG | S | Create SM CRM Reader, Editor, Manager, Intake roles with DocType permissions | None | Role-based access: staff sees only authorized data and actions | N/A (provisioning step) | Role level |
| CRM-021 | Contact list React component | FRONTEND | S | Contact list view with search bar, filters, and pagination | CRM-001, CRM-014 | Daily contact lookup: staff finds person quickly | N/A (UI component) | Universal |
| CRM-022 | Contact detail React component | FRONTEND | S | Contact detail view with fields, cross-system links, and activity timeline | CRM-002, CRM-015, CRM-014 | Daily contact lookup: staff views complete person record in one place | N/A (UI component) | Universal |
| CRM-023 | Lead pipeline Kanban React component | FRONTEND | S | Kanban board with drag-to-convert Lead cards between stages | CRM-006, CRM-010, CRM-016, CRM-014 | Intake pipeline management: visualize and progress referrals | N/A (UI component) | Universal |
| CRM-024 | Lead to Customer conversion workflow | INTEGRATION | S | n8n workflow: Lead accepted → create ERPNext Customer | CRM-010, CRM-020 | Lead acceptance: billing account created automatically for new client | Writes Customer creation activity to CRM | Universal |
| CRM-025 | Lead to Patient conversion workflow | INTEGRATION | S | n8n workflow: Lead accepted (healthcare) → create Medplum Patient | CRM-024 | Lead acceptance: clinical chart created automatically for new patient | Writes Patient creation activity to CRM | Vertical (healthcare) |
| CRM-026 | Clinical event activity capture workflow | INTEGRATION | S | n8n workflow: Medplum encounter/assessment → write CRM activity | CRM-022, CRM-015 | Session documentation: clinical events appear on person timeline | Writes clinical activity (encounter completed, assessment scored) | Vertical (healthcare) |
| CRM-027 | Billing event activity capture workflow | INTEGRATION | S | n8n workflow: ERPNext invoice/payment/claim → write CRM activity | CRM-022, CRM-015 | Billing tracking: financial events appear on person timeline | Writes billing activity (invoice created, payment received, claim submitted) | Universal |
| CRM-028 | Duplicate detection batch workflow | INTEGRATION | S | n8n nightly workflow: fuzzy match on name+phone+email → flag for review | CRM-029 | Data quality: detect and flag duplicate person records for staff | Creates SM Task for duplicate review | Universal |
| CRM-029 | Duplicate detection scoring logic | BACKEND | S | Fuzzy match algorithm: confidence score 0-100 based on name, DOB, phone, email | None | Duplicate detection: identify potential matches before staff reviews | N/A (scoring logic) | Universal |
| CRM-030 | Consent expiration check workflow | INTEGRATION | XS | n8n daily workflow: check consent dates → create renewal tasks | CRM-017 | Compliance tracking: ensure consent renewals happen on time | Creates SM Task for consent renewal | Vertical (healthcare) |
| CRM-031 | Consent status computation logic | BACKEND | S | Compute sm_consent_status from HIPAA, treatment, telehealth consent dates | CRM-017 | Consent tracking: status field reflects complete/incomplete/expired | N/A (computed field logic) | Vertical (healthcare) |

---

# DEPENDENCY-GRAPH.md

## Build Order and Parallel Execution Groups

```
PARALLEL GROUP 1 - Foundation (Backend routes with no dependencies)
├── CRM-001: Contact list endpoint
├── CRM-003: Contact create endpoint
├── CRM-004: Contact update endpoint
├── CRM-006: Lead list endpoint
├── CRM-008: Lead create endpoint
├── CRM-009: Lead update endpoint
├── CRM-011: Organization list and detail endpoints
├── CRM-012: Organization create endpoint
├── CRM-013: Global search endpoint
├── CRM-014: Vocabulary mapping endpoint
├── CRM-015: Activity timeline endpoints
├── CRM-016: Pipeline stages endpoint
├── CRM-029: Duplicate detection scoring logic
│
├── PARALLEL GROUP 1A - Configuration (independent provisioning steps)
│   ├── CRM-017: Healthcare Contact custom fields
│   ├── CRM-018: Healthcare Lead custom fields
│   ├── CRM-019: Lead stages per vertical configuration
│   └── CRM-020: CRM roles and permissions setup
│
└── PARALLEL GROUP 1B - Healthcare-specific backend logic
    └── CRM-031: Consent status computation logic

PARALLEL GROUP 2 - Dependent Backend Routes
├── CRM-002: Contact detail endpoint (depends on CRM-001)
├── CRM-005: Contact merge endpoint (depends on CRM-002, CRM-029)
├── CRM-007: Lead detail endpoint (depends on CRM-006)
└── CRM-010: Lead convert endpoint (depends on CRM-003)

PARALLEL GROUP 3 - Frontend Components
├── CRM-021: Contact list React component (depends on CRM-001, CRM-014)
├── CRM-022: Contact detail React component (depends on CRM-002, CRM-015, CRM-014)
└── CRM-023: Lead pipeline Kanban React component (depends on CRM-006, CRM-010, CRM-016, CRM-014)

PARALLEL GROUP 4 - Core Integration Workflows
├── CRM-024: Lead to Customer conversion workflow (depends on CRM-010, CRM-020)
├── CRM-027: Billing event activity capture workflow (depends on CRM-022, CRM-015)
└── CRM-028: Duplicate detection batch workflow (depends on CRM-029)

PARALLEL GROUP 5 - Healthcare-specific Integration
├── CRM-025: Lead to Patient conversion workflow (depends on CRM-024)
├── CRM-026: Clinical event activity capture workflow (depends on CRM-022, CRM-015)
└── CRM-030: Consent expiration check workflow (depends on CRM-017)
```

## Critical Path

```
CRM-001 → CRM-002 → CRM-022 → CRM-026 → (Full healthcare timeline)
CRM-003 → CRM-010 → CRM-024 → CRM-025 → (Full lead-to-patient flow)
CRM-029 → CRM-028 → (Duplicate detection complete)
CRM-017 → CRM-031 → (Healthcare consent tracking complete)
```

## Story Count Summary

| Category | Count | Parallel Execution Groups |
|----------|-------|--------------------------|
| BACKEND | 14 | 1, 1A, 1B, 2 |
| CONFIG | 4 | 1A |
| FRONTEND | 3 | 3 |
| INTEGRATION | 6 | 4, 5 |
| AI | 0 | N/A (Phase 2) |
| GLUE | 0 | N/A |
| **TOTAL** | **27** | **5 groups** |

## Estimated Build Timeline

```
Week 1, Nights 1-2: GROUP 1 + 1A (17 stories, many can run in parallel)
Week 1, Night 3: GROUP 1B + start GROUP 2 (5 stories)
Week 1, Night 4: GROUP 2 complete + start GROUP 3 (7 stories)
Week 2, Nights 5-6: GROUP 3 complete (3 frontend components)
Week 2, Nights 7-8: GROUP 4 + 5 (6 integration workflows)
Week 2, Night 9: Testing and polish
```

**Total estimated effort:** 7-9 Ralph nights, 2-3 calendar weeks