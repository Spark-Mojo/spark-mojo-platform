model: model-zeta
test: 01-story-decomposition
run: A
date: 2026-04-09

```markdown
<!-- STORIES.md -->
# CRM / Client Identity — Build Stories

**Capability:** CRM / Client Identity  
**Tier:** KERNEL  
**Decomposer:** Story Decomposer Agent  
**Date:** April 9, 2026  

---

## BACKEND Stories

| ID | Title | Category | Size | Description | Dependencies | Workflow | CRM Timeline | Right Level |
|----|-------|----------|------|-------------|--------------|----------|--------------|-------------|
| CRM-001 | Contact List Endpoint | BACKEND | S | FastAPI endpoint GET /api/modules/crm/contacts/list with pagination, search (name/email/phone), and status filters. | None | Person lookup workflow — staff searching for existing contacts. | N/A | Universal |
| CRM-002 | Contact Detail Endpoint | BACKEND | S | FastAPI endpoint GET /api/modules/crm/contacts/{id} returning full contact record with embedded recent activity timeline (last 50 entries). | CRM-015 | Person context workflow — staff viewing complete relationship history. | N/A | Universal |
| CRM-003 | Contact Create Endpoint | BACKEND | XS | FastAPI endpoint POST /api/modules/crm/contacts/create accepting contact payload with validation. | None | New person intake workflow — creating primary identity records. | "Contact record created" | Universal |
| CRM-004 | Contact Update Endpoint | BACKEND | XS | FastAPI endpoint PUT /api/modules/crm/contacts/{id}/update with field-level validation and optimistic locking. | CRM-002 | Person data maintenance workflow — updating demographics or preferences. | "Contact information updated" | Universal |
| CRM-005 | Contact Duplicate Check Endpoint | BACKEND | S | FastAPI endpoint GET /api/modules/crm/contacts/{id}/duplicates returning fuzzy-matched potential duplicates with confidence scores. | None | Data quality workflow — preventing duplicate records at point of entry. | N/A | Universal |
| CRM-006 | Contact Merge Endpoint | BACKEND | S | FastAPI endpoint POST /api/modules/crm/contacts/{id}/merge merging two contact records and re-linking all child records. | CRM-005, CRM-002 | Data cleanup workflow — consolidating duplicate person records. | "Contact merged" | Universal |
| CRM-007 | Lead List Endpoint | BACKEND | S | FastAPI endpoint GET /api/modules/crm/leads/list with pipeline stage filtering, source attribution, and pagination. | CRM-019 | Pipeline management workflow — intake coordinators reviewing referral queue. | N/A | Universal |
| CRM-008 | Lead Detail Endpoint | BACKEND | S | FastAPI endpoint GET /api/modules/crm/leads/{id} returning lead with qualification notes and urgency flags. | None | Lead qualification workflow — reviewing individual referral details. | N/A | Universal |
| CRM-009 | Lead Create Endpoint | BACKEND | XS | FastAPI endpoint POST /api/modules/crm/leads/create for new referrals from web forms, phone intake, or fax. | None | Referral capture workflow — recording initial inquiries. | "Lead created" | Universal |
| CRM-010 | Lead Update Endpoint | BACKEND | XS | FastAPI endpoint PUT /api/modules/crm/leads/{id}/update for status changes and qualification updates. | CRM-008 | Lead progression workflow — updating qualification status. | "Lead status updated" | Universal |
| CRM-011 | Lead Convert Endpoint | BACKEND | S | FastAPI endpoint POST /api/modules/crm/leads/{id}/convert triggering Frappe Workflow transition and n8n webhook for downstream record creation. | CRM-009, CRM-003 | Lead acceptance workflow — converting qualified prospects to active contacts. | "Lead converted to Contact" + triggers downstream activities | Universal |
| CRM-012 | Organization List Endpoint | BACKEND | XS | FastAPI endpoint GET /api/modules/crm/organizations/list for referral sources, payers, and entities. | None | Organization lookup workflow — finding business entities. | N/A | Universal |
| CRM-013 | Organization Detail Endpoint | BACKEND | XS | FastAPI endpoint GET /api/modules/crm/organizations/{id} with linked contacts and relationship metadata. | CRM-012 | Organization context workflow — reviewing entity relationships. | N/A | Universal |
| CRM-014 | Organization Create Endpoint | BACKEND | XS | FastAPI endpoint POST /api/modules/crm/organizations/create for new referral sources or payers. | None | Organization onboarding workflow — adding new business entities. | "Organization created" | Universal |
| CRM-015 | Activity Timeline List Endpoint | BACKEND | S | FastAPI endpoint GET /api/modules/crm/activities/{contact_id} with pagination and activity type filtering. | None | Activity review workflow — chronological audit of all interactions. | N/A | Universal |
| CRM-016 | Activity Create Endpoint | BACKEND | XS | FastAPI endpoint POST /api/modules/crm/activities/create for manual notes and system-generated activity writes. | CRM-015 | Activity logging workflow — recording manual notes or cross-system events. | Activity subject/content per event type | Universal |
| CRM-017 | Global Search Endpoint | BACKEND | S | FastAPI endpoint GET /api/modules/crm/search?q= returning unified results across Contacts, Leads, and Organizations. | CRM-001, CRM-007 | Global lookup workflow — finding any person or entity from any context. | N/A | Universal |
| CRM-018 | Vocabulary Config Endpoint | BACKEND | XS | FastAPI endpoint GET /api/modules/crm/vocabulary returning vertical-specific label mappings (person, lead, intake, etc.). | None | UI localization workflow — rendering correct terminology per vertical. | N/A | Vertical |
| CRM-019 | Pipeline Stages Endpoint | BACKEND | XS | FastAPI endpoint GET /api/modules/crm/stages returning configured Sales Stages for lead pipeline. | CRM-022 | Pipeline configuration workflow — Kanban column definitions. | N/A | Vertical |

## CONFIG Stories

| ID | Title | Category | Size | Description | Dependencies | Workflow | CRM Timeline | Right Level |
|----|-------|----------|------|-------------|--------------|----------|--------------|-------------|
| CRM-020 | Healthcare Contact Custom Fields | CONFIG | S | Provisioning configuration adding sm_date_of_birth, sm_insurance_member_id, sm_payer, sm_referral_source, sm_preferred_pronouns, sm_consent_status fields to Contact DocType via behavioral_health.yaml template. | None | Healthcare intake workflow — capturing medical demographics. | N/A | Vertical |
| CRM-021 | Healthcare Lead Custom Fields | CONFIG | S | Provisioning configuration adding sm_referral_source_type, sm_urgency, sm_clinical_concerns, sm_insurance_info fields to CRM Lead DocType. | None | Healthcare referral triage workflow — capturing clinical context. | N/A | Vertical |
| CRM-022 | Lead Pipeline Stages Configuration | CONFIG | S | Provisioning configuration setting Sales Stage DocType entries per vertical (Referred→Screened→Assessed→Accepted for healthcare). | None | Intake pipeline workflow — defining qualification stages. | N/A | Vertical |
| CRM-023 | CRM Roles and Permissions | CONFIG | S | Frappe Role creation (SM CRM Reader, Editor, Manager, Intake) with DocType permissions and field-level restrictions per Workflow Research Section 9. | None | Access control workflow — role-based data visibility. | N/A | Role |

## FRONTEND Stories

| ID | Title | Category | Size | Description | Dependencies | Workflow | CRM Timeline | Right Level |
|----|-------|----------|------|-------------|--------------|----------|--------------|-------------|
| CRM-024 | Contact List React Component | FRONTEND | S | JSX component displaying searchable, filterable contact grid with pagination, vocabulary-aware column headers, and quick actions. | CRM-001, CRM-018 | Person directory workflow — browsing and finding contacts. | N/A | Universal |
| CRM-025 | Contact Detail React Component | FRONTEND | S | JSX component displaying contact profile, demographic fields (role-aware), and embedded activity summary. | CRM-002, CRM-018, CRM-020 | Person review workflow — comprehensive relationship view. | N/A | Universal |
| CRM-026 | Contact Merge React Component | FRONTEND | S | JSX modal workflow for reviewing duplicate matches, selecting primary record, and executing merge with conflict resolution. | CRM-005, CRM-006, CRM-024 | Data stewardship workflow — resolving duplicate records. | "Contact merge executed" | Universal |
| CRM-027 | Lead List React Component | FRONTEND | S | JSX component displaying lead queue with filtering by stage, source, and urgency, optimized for intake coordinators. | CRM-007, CRM-018, CRM-021 | Referral queue workflow — managing intake pipeline. | N/A | Universal |
| CRM-028 | Lead Pipeline Kanban React Component | FRONTEND | S | JSX Kanban board with drag-to-convert functionality, stage-based columns from CRM-019, and lead card detail popovers. | CRM-007, CRM-019, CRM-027 | Pipeline management workflow — visual intake progression. | "Lead stage changed" on drop | Universal |
| CRM-029 | Lead Intake Form React Component | FRONTEND | S | JSX form component for creating new leads with field validation, duplicate warning integration (CRM-005), and vocabulary labels. | CRM-009, CRM-018, CRM-021 | Referral capture workflow — structured intake data entry. | "Lead created via form" | Universal |
| CRM-030 | Organization List React Component | FRONTEND | XS | JSX component displaying organization directory with type filters and linked contact counts. | CRM-012, CRM-018 | Entity directory workflow — managing referral sources and payers. | N/A | Universal |
| CRM-031 | Organization Detail React Component | FRONTEND | XS | JSX component displaying organization profile with linked contacts and relationship history. | CRM-013, CRM-030 | Entity review workflow — organization relationship context. | N/A | Universal |
| CRM-032 | Global Search React Component | FRONTEND | XS | JSX search bar component with typeahead dropdown showing unified results from CRM-017. | CRM-017, CRM-018 | Universal search workflow — finding any record from any screen. | N/A | Universal |
| CRM-033 | Activity Timeline React Component | FRONTEND | S | JSX component rendering chronological activity feed with type icons, role-based filtering, and "load more" pagination. | CRM-015, CRM-016 | Activity review workflow — chronological interaction history. | N/A | Universal |

## INTEGRATION Stories

| ID | Title | Category | Size | Description | Dependencies | Workflow | CRM Timeline | Right Level |
|----|-------|----------|------|-------------|--------------|----------|--------------|-------------|
| CRM-034 | Lead Conversion n8n Workflow | INTEGRATION | S | n8n workflow triggered by CRM-011 converting Lead to Contact, creating ERPNext Customer, Medplum Patient (healthcare), and writing cross-system creation activities. | CRM-011, CRM-003 | Cross-system identity provisioning workflow — establishing billing and clinical projections. | "ERPNext Customer created", "Medplum Patient created" | Universal |
| CRM-035 | Cross-System Activity Capture n8n Workflow | INTEGRATION | S | n8n workflow listening to Medplum FHIR subscriptions and ERPNext webhooks, writing clinical, billing, and scheduling events to CRM timeline via CRM-016. | CRM-016 | Unified timeline workflow — aggregating cross-system events. | Clinical event summaries, Billing event summaries | Universal |
| CRM-036 | Duplicate Detection Batch n8n Workflow | INTEGRATION | S | n8n nightly cron workflow querying for potential duplicates using fuzzy matching and creating SM Task records for manual review. | CRM-005 | Data quality audit workflow — ongoing duplicate detection. | "Duplicate detected" task created | Universal |
| CRM-037 | Consent Expiration n8n Workflow | INTEGRATION | S | n8n daily cron workflow checking consent date fields (CRM-020) and creating SM Task records for expired or expiring consents. | CRM-020 | Compliance workflow — consent renewal tracking. | "Consent expiration alert" task created | Vertical |

## AI Stories (Phase 1)

| ID | Title | Category | Size | Description | Dependencies | Workflow | CRM Timeline | Right Level |
|----|-------|----------|------|-------------|--------------|----------|--------------|-------------|
| CRM-038 | Contact Summary AI Service | AI | S | AWS Bedrock Haiku 4.5 service generating 2-3 sentence relationship summaries from last 90 days of activities, exposed via internal API for CRM-025. | CRM-015 | AI-assisted review workflow — rapid relationship context. | N/A | Universal |
| CRM-039 | Activity Classification AI Service | AI | S | AWS Bedrock Nova Micro service auto-tagging activities with type labels (clinical, billing, scheduling, communication) on CRM-016 writes. | CRM-016 | Automated categorization workflow — consistent activity taxonomy. | Classification metadata added | Universal |
```

```markdown
<!-- DEPENDENCY-GRAPH.md -->
# CRM / Client Identity — Build Dependency Graph

**Build Order:** Sequential groups indicate dependencies (must complete before next group). Parallel groups can be built simultaneously.

---

## Build Order

### Phase 1: Foundation (Backend Core)
**Parallel Group A: Contact Backend**
- CRM-001: Contact List Endpoint
- CRM-003: Contact Create Endpoint  
- CRM-004: Contact Update Endpoint

**Parallel Group B: Lead Backend**
- CRM-007: Lead List Endpoint
- CRM-009: Lead Create Endpoint
- CRM-010: Lead Update Endpoint

**Parallel Group C: Organization Backend**
- CRM-012: Organization List Endpoint
- CRM-014: Organization Create Endpoint

**Parallel Group D: Activity Backend**
- CRM-015: Activity Timeline List Endpoint
- CRM-016: Activity Create Endpoint

---

### Phase 2: Business Logic (Backend Advanced)
**Depends on:** Phase 1 (Contact Create, Lead Create, Activity List)

**Parallel Group E: Detail & Check**
- CRM-002: Contact Detail Endpoint (needs CRM-015)
- CRM-008: Lead Detail Endpoint
- CRM-013: Organization Detail Endpoint
- CRM-005: Contact Duplicate Check Endpoint

**Parallel Group F: Conversion & Config**
- CRM-011: Lead Convert Endpoint (needs CRM-003, CRM-009)
- CRM-018: Vocabulary Config Endpoint
- CRM-019: Pipeline Stages Endpoint
- CRM-017: Global Search Endpoint (needs CRM-001, CRM-007)

---

### Phase 3: Configuration & Permissions
**Depends on:** Phase 1 (backend endpoints exist for testing)

**Parallel Group G: Vertical Config**
- CRM-020: Healthcare Contact Custom Fields
- CRM-021: Healthcare Lead Custom Fields
- CRM-022: Lead Pipeline Stages Configuration
- CRM-023: CRM Roles and Permissions

---

### Phase 4: Integration Workflows
**Depends on:** Phase 2 (Lead Convert, Activity Create, Duplicate Check)

**Parallel Group H: n8n Workflows**
- CRM-034: Lead Conversion n8n Workflow (needs CRM-011)
- CRM-035: Cross-System Activity Capture n8n Workflow (needs CRM-016)
- CRM-036: Duplicate Detection Batch n8n Workflow (needs CRM-005)
- CRM-037: Consent Expiration n8n Workflow (needs CRM-020)

---

### Phase 5: Frontend Core
**Depends on:** Phase 1, Phase 3 (backend endpoints + config)

**Parallel Group I: List Components**
- CRM-024: Contact List React Component (needs CRM-001, CRM-018)
- CRM-027: Lead List React Component (needs CRM-007, CRM-018)
- CRM-030: Organization List React Component (needs CRM-012, CRM-018)
- CRM-032: Global Search React Component (needs CRM-017, CRM-018)

**Parallel Group J: Detail Components**
- CRM-025: Contact Detail React Component (needs CRM-002, CRM-018, CRM-020)
- CRM-031: Organization Detail React Component (needs CRM-013, CRM-018)

---

### Phase 6: Frontend Advanced
**Depends on:** Phase 5 (List components exist)

**Parallel Group K: Interaction Components**
- CRM-029: Lead Intake Form React Component (needs CRM-009, CRM-005, CRM-018)
- CRM-033: Activity Timeline React Component (needs CRM-015)

**Parallel Group L: Pipeline & Merge**
- CRM-028: Lead Pipeline Kanban React Component (needs CRM-007, CRM-019, CRM-027)
- CRM-006: Contact Merge Endpoint (needs CRM-005, CRM-002)
- CRM-026: Contact Merge React Component (needs CRM-006, CRM-005, CRM-024)

---

### Phase 7: AI Enhancement (Optional Extension)
**Depends on:** Phase 4 (Activity system stable)

**Parallel Group M: AI Services**
- CRM-038: Contact Summary AI Service (needs CRM-015)
- CRM-039: Activity Classification AI Service (needs CRM-016)

---

## Summary Statistics

| Phase | Stories | Est. Ralph Nights | Deliverable |
|-------|---------|-------------------|-------------|
| Phase 1 | 9 | 2-3 | Backend CRUD API |
| Phase 2 | 8 | 2-3 | Business logic + search |
| Phase 3 | 4 | 1 | Vertical configuration |
| Phase 4 | 4 | 2 | n8n automation |
| Phase 5 | 7 | 2-3 | List/search UI |
| Phase 6 | 5 | 2-3 | Forms, Kanban, Merge |
| Phase 7 | 2 | 1 | AI features |
| **Total** | **39** | **12-17** | **Complete CRM Kernel** |

**Critical Path:** Phase 1 → Phase 2 (CRM-002) → Phase 5 (CRM-025) → Phase 6 (CRM-028)

**Parallel Execution Max:** 8 stories (Phase 1-2 transition)
```