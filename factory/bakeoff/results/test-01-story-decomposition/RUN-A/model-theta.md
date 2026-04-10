model: model-theta
test: 01-story-decomposition
run: A
date: 2026-04-09

# STORIES.md - CRM / Client Identity

## Backend Foundation

### CRM-001: Contact CRUD Endpoints
- **Category**: BACKEND
- **Size**: S
- **Description**: Create abstraction layer endpoints for Contact CRUD operations (list, get, create, update).
- **Dependencies**: None
- **Spec Gates**:
  1. **Workflow**: Contact lookup workflow - staff needs to view and update client information.
  2. **CRM Timeline**: N/A (read-only endpoints, timeline writes happen via activity endpoints).
  3. **Right Level**: Universal - contacts are universal across all verticals.

### CRM-002: Contact Duplicate Detection Endpoint
- **Category**: BACKEND
- **Size**: XS
- **Description**: Create endpoint to check for potential duplicate contacts on create/update.
- **Dependencies**: CRM-001
- **Spec Gates**:
  1. **Workflow**: Contact creation workflow - prevent duplicate records during data entry.
  2. **CRM Timeline**: N/A (detection only, no writes).
  3. **Right Level**: Universal - duplicate prevention applies to all verticals.

### CRM-003: Lead CRUD Endpoints
- **Category**: BACKEND
- **Size**: S
- **Description**: Create abstraction layer endpoints for Lead CRUD operations (list, get, create, update).
- **Dependencies**: None
- **Spec Gates**:
  1. **Workflow**: Intake pipeline workflow - track new inquiries through qualification stages.
  2. **CRM Timeline**: N/A (read-only endpoints, conversion writes via separate endpoint).
  3. **Right Level**: Universal - leads/intakes are universal across verticals.

### CRM-004: Lead Conversion Endpoint
- **Category**: BACKEND
- **Size**: XS
- **Description**: Create endpoint to convert a Lead to a Contact, triggering n8n workflows.
- **Dependencies**: CRM-001, CRM-003
- **Spec Gates**:
  1. **Workflow**: Intake qualification workflow - move qualified leads to active client status.
  2. **CRM Timeline**: Writes "Lead converted to Contact" activity with source attribution.
  3. **Right Level**: Universal - lead conversion is universal across verticals.

### CRM-005: Organization CRUD Endpoints
- **Category**: BACKEND
- **Size**: S
- **Description**: Create abstraction layer endpoints for Organization CRUD operations (list, get, create).
- **Dependencies**: None
- **Spec Gates**:
  1. **Workflow**: Referral source management workflow - track organizations that refer clients.
  2. **CRM Timeline**: N/A (organization management doesn't write to contact timeline).
  3. **Right Level**: Universal - organizations are universal across verticals.

### CRM-006: Global Search Endpoint
- **Category**: BACKEND
- **Size**: XS
- **Description**: Create endpoint for global person search across Contacts, Leads, and Organizations.
- **Dependencies**: CRM-001, CRM-003, CRM-005
- **Spec Gates**:
  1. **Workflow**: Daily contact lookup workflow - staff needs fast search to find client records.
  2. **CRM Timeline**: N/A (search only, no writes).
  3. **Right Level**: Universal - search is universal across all verticals.

### CRM-007: Vocabulary Endpoint
- **Category**: BACKEND
- **Size**: XS
- **Description**: Create endpoint to return vocabulary mapping (labels) for the current tenant's vertical.
- **Dependencies**: None
- **Spec Gates**:
  1. **Workflow**: Universal-first configuration workflow - render correct labels per vertical.
  2. **CRM Timeline**: N/A (configuration only, no writes).
  3. **Right Level**: Vertical - vocabulary differs by vertical template.

### CRM-008: Activity Timeline Endpoint
- **Category**: BACKEND
- **Size**: XS
- **Description**: Create endpoint to fetch activity timeline for a contact from Frappe Communication records.
- **Dependencies**: CRM-001
- **Spec Gates**:
  1. **Workflow**: Contact review workflow - staff needs complete interaction history in one view.
  2. **CRM Timeline**: Reads unified activity timeline (writes happen via CRM-009 and n8n workflows).
  3. **Right Level**: Universal - activity timeline is universal across all verticals.

### CRM-009: Activity Create Endpoint
- **Category**: BACKEND
- **Size**: XS
- **Description**: Create endpoint for manual activity note creation on a contact.
- **Dependencies**: CRM-001
- **Spec Gates**:
  1. **Workflow**: Communication logging workflow - staff needs to record manual interactions.
  2. **CRM Timeline**: Writes manual activity notes to the contact's timeline.
  3. **Right Level**: Universal - activity logging is universal across all verticals.

### CRM-010: Contact Merge Endpoint
- **Category**: BACKEND
- **Size**: XS
- **Description**: Create endpoint to merge two contact records (data consolidation and deduplication).
- **Dependencies**: CRM-001
- **Spec Gates**:
  1. **Workflow**: Data cleanup workflow - staff needs to merge duplicate client records.
  2. **CRM Timeline**: Writes "Contact merged" activity showing which records were combined.
  3. **Right Level**: Universal - contact merging is universal across all verticals.

## Frontend Components

### CRM-011: React CRM Mojo - Contact List with Search
- **Category**: FRONTEND
- **Size**: S
- **Description**: Build React component for contact list page with search, filtering, and pagination.
- **Dependencies**: CRM-001, CRM-006, CRM-007
- **Spec Gates**:
  1. **Workflow**: Daily contact lookup workflow - staff needs to find and view client records quickly.
  2. **CRM Timeline**: N/A (display only, writes via detail view).
  3. **Right Level**: Universal - contact list is universal across all verticals.

### CRM-012: React CRM Mojo - Contact Detail View
- **Category**: FRONTEND
- **Size**: S
- **Description**: Build React component for contact detail page with basic info and field display.
- **Dependencies**: CRM-001, CRM-007
- **Spec Gates**:
  1. **Workflow**: Contact review workflow - staff needs complete client information in one view.
  2. **CRM Timeline**: N/A (display only, timeline shown in separate component).
  3. **Right Level**: Universal - contact detail is universal across all verticals.

### CRM-013: React CRM Mojo - Activity Timeline Component
- **Category**: FRONTEND
- **Size**: XS
- **Description**: Build React component for activity timeline section within contact detail.
- **Dependencies**: CRM-008, CRM-012
- **Spec Gates**:
  1. **Workflow**: Contact review workflow - staff needs complete interaction history in one view.
  2. **CRM Timeline**: Displays unified activity timeline (the killer feature of CRM).
  3. **Right Level**: Universal - activity timeline is universal across all verticals.

### CRM-014: React CRM Mojo - Lead Pipeline Kanban Board
- **Category**: FRONTEND
- **Size**: S
- **Description**: Build React component for lead pipeline as Kanban board with drag-and-drop stages.
- **Dependencies**: CRM-003, CRM-007
- **Spec Gates**:
  1. **Workflow**: Intake pipeline workflow - track and manage new inquiries through qualification.
  2. **CRM Timeline**: N/A (lead management, conversion writes via CRM-004).
  3. **Right Level**: Universal - intake pipeline is universal across verticals.

### CRM-026: Contact Merge UI
- **Category**: FRONTEND
- **Size**: XS
- **Description**: Build UI for merging contacts within the contact detail view.
- **Dependencies**: CRM-010, CRM-012
- **Spec Gates**:
  1. **Workflow**: Data cleanup workflow - staff needs UI to merge duplicate client records.
  2. **CRM Timeline**: UI for triggering merge endpoint (CRM-010) which writes merge activity.
  3. **Right Level**: Universal - contact merging is universal across all verticals.

## Integration Workflows

### CRM-015: n8n Lead Conversion Workflow
- **Category**: INTEGRATION
- **Size**: S
- **Description**: Build n8n workflow that triggers when a lead converts, creating ERPNext Customer and Medplum Patient.
- **Dependencies**: CRM-004
- **Spec Gates**:
  1. **Workflow**: Intake qualification workflow - automated creation of downstream system records.
  2. **CRM Timeline**: Writes "Customer created" and "Patient created" activities to contact timeline.
  3. **Right Level**: Universal - lead conversion automation is universal across verticals.

### CRM-016: n8n Cross-System Activity Capture
- **Category**: INTEGRATION
- **Size**: S
- **Description**: Build n8n workflow to capture events from Medplum, ERPNext, etc. and write to CRM timeline.
- **Dependencies**: CRM-009
- **Spec Gates**:
  1. **Workflow**: Unified timeline workflow - automated capture of all client interactions across systems.
  2. **CRM Timeline**: Writes clinical, billing, scheduling, and system events to contact timeline (mandatory write-back).
  3. **Right Level**: Universal - cross-system activity capture is universal across all verticals.

### CRM-025: Duplicate Detection Batch Job
- **Category**: INTEGRATION
- **Size**: XS
- **Description**: Build nightly n8n batch job to flag potential duplicate contacts for manual review.
- **Dependencies**: CRM-002
- **Spec Gates**:
  1. **Workflow**: Data quality workflow - automated detection of duplicate records for cleanup.
  2. **CRM Timeline**: Creates "Potential duplicate detected" activities for review queue.
  3. **Right Level**: Universal - duplicate detection is universal across all verticals.

## Configuration

### CRM-017: Custom Fields Provisioning for Healthcare Vertical
- **Category**: CONFIG
- **Size**: S
- **Description**: Add custom fields to Contact and Lead DocTypes for healthcare vertical during provisioning.
- **Dependencies**: None
- **Spec Gates**:
  1. **Workflow**: Tenant provisioning workflow - configure CRM for healthcare-specific needs.
  2. **CRM Timeline**: N/A (configuration only, enables timeline writes for healthcare events).
  3. **Right Level**: Vertical - healthcare-specific fields (DOB, insurance, consent dates).

### CRM-018: Lead Stages Configuration per Vertical
- **Category**: CONFIG
- **Size**: XS
- **Description**: Configure Sales Stages (pipeline stages) based on vertical template during provisioning.
- **Dependencies**: None
- **Spec Gates**:
  1. **Workflow**: Intake pipeline workflow - vertical-specific qualification stages.
  2. **CRM Timeline**: N/A (configuration only, enables proper lead tracking).
  3. **Right Level**: Vertical - stages differ by vertical (healthcare: referral/screened/accepted; hospitality: inquiry/quoted/booked).

### CRM-019: CRM Roles and Permissions Setup
- **Category**: CONFIG
- **Size**: XS
- **Description**: Create SM CRM roles (Reader, Editor, Manager, Intake) and assign DocType permissions.
- **Dependencies**: None
- **Spec Gates**:
  1. **Workflow**: Role-based access workflow - control CRM access based on staff responsibilities.
  2. **CRM Timeline**: N/A (permissions only, controls who can write to timeline).
  3. **Right Level**: Role - permissions vary by staff role across all verticals.

## AI Features (Phase 1)

### CRM-020: Contact Summary Generation AI
- **Category**: AI
- **Size**: S
- **Description**: Integrate AWS Bedrock (Haiku 4.5) to generate natural language summary of contact's history.
- **Dependencies**: CRM-008
- **Spec Gates**:
  1. **Workflow**: Contact review workflow - quick understanding of client history without reading all activities.
  2. **CRM Timeline**: N/A (read-only AI analysis of timeline data).
  3. **Right Level**: Universal - contact summarization is universal across all verticals.

### CRM-021: Activity Type Classification AI
- **Category**: AI
- **Size**: XS
- **Description**: Integrate AWS Bedrock (Nova Micro) to classify activity type (clinical, billing, scheduling, etc.).
- **Dependencies**: CRM-009
- **Spec Gates**:
  1. **Workflow**: Activity logging workflow - auto-tag activities for role-based filtering.
  2. **CRM Timeline**: Enhances timeline with activity type metadata for filtering.
  3. **Right Level**: Universal - activity classification is universal across all verticals.

### CRM-022: Data Completeness Validation AI
- **Category**: AI
- **Size**: XS
- **Description**: Integrate AWS Bedrock (Nova Micro) to check if contact record has all required fields.
- **Dependencies**: CRM-001
- **Spec Gates**:
  1. **Workflow**: Data quality workflow - ensure complete client records without blocking workflow.
  2. **CRM Timeline**: N/A (validation only, no timeline writes).
  3. **Right Level**: Vertical - required fields differ by vertical template.

### CRM-023: Duplicate Confidence Scoring AI
- **Category**: AI
- **Size**: XS
- **Description**: Integrate AWS Bedrock (Nova Micro) to score duplicate matches with confidence levels.
- **Dependencies**: CRM-002
- **Spec Gates**:
  1. **Workflow**: Duplicate detection workflow - prioritize high-confidence matches for review.
  2. **CRM Timeline**: N/A (scoring only, enhances duplicate detection accuracy).
  3. **Right Level**: Universal - duplicate scoring is universal across all verticals.

## Additional Features

### CRM-024: Consent Tracking Fields and Validation
- **Category**: BACKEND
- **Size**: XS
- **Description**: Add consent tracking custom fields and validation hooks for healthcare vertical.
- **Dependencies**: CRM-017
- **Spec Gates**:
  1. **Workflow**: Compliance workflow - track consent dates and validate completeness.
  2. **CRM Timeline**: Writes consent status changes and expiration alerts to timeline.
  3. **Right Level**: Vertical - healthcare-specific consent tracking (HIPAA, treatment, telehealth).