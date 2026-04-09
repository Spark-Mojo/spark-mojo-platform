model: model-gamma
test: 01-story-decomposition
run: A
date: 2026-04-09

# STORIES.md

## BACKEND

#### CRM-001: Contact List Endpoint
**Category:** BACKEND | **Size:** XS
- **Description:** Provides a paginated, searchable list of CRM contacts via the MAL.
- **Dependencies:** None
- **Workflow:** Contact lookup and management workflow
- **CRM Timeline:** N/A (read-only endpoint)
- **Right Level:** Universal

#### CRM-002: Contact Detail Endpoint
**Category:** BACKEND | **Size:** XS
- **Description:** Returns a single contact record with basic demographic fields.
- **Dependencies:** CRM-001
- **Workflow:** Contact review and update workflow
- **CRM Timeline:** N/A (read-only endpoint)
- **Right Level:** Universal

#### CRM-003: Contact Create Endpoint
**Category:** BACKEND | **Size:** S
- **Description:** Creates a new Contact record with validation and cross-field consistency checks.
- **Dependencies:** CRM-001
- **Workflow:** New person onboarding workflow
- **CRM Timeline:** Writes "Contact created" activity via Frappe server script hook
- **Right Level:** Universal

#### CRM-004: Contact Update Endpoint
**Category:** BACKEND | **Size:** S
- **Description:** Updates Contact fields with validation, logging changed fields for audit.
- **Dependencies:** CRM-001
- **Workflow:** Contact information maintenance workflow
- **CRM Timeline:** Writes "Contact updated" activity with field change summary
- **Right Level:** Universal

#### CRM-005: Contact Merge Endpoint
**Category:** BACKEND | **Size:** S
- **Description:** Merges two duplicate contacts, preserving activity history and cross-system links.
- **Dependencies:** CRM-002
- **Workflow:** Duplicate resolution workflow
- **CRM Timeline:** Writes "Contact merged" activity referencing source and target records
- **Right Level:** Universal

#### CRM-006: Contact Duplicates Check Endpoint
**Category:** BACKEND | **Size:** XS
- **Description:** Returns potential duplicate matches based on name, phone, email fuzzy matching.
- **Dependencies:** CRM-001
- **Workflow:** Duplicate detection workflow
- **CRM Timeline:** N/A (read-only endpoint)
- **Right Level:** Universal

#### CRM-007: Lead List Endpoint
**Category:** BACKEND | **Size:** XS
- **Description:** Provides a paginated list of leads filtered by pipeline stage and source.
- **Dependencies:** None
- **Workflow:** Lead pipeline management workflow
- **CRM Timeline:** N/A (read-only endpoint)
- **Right Level:** Universal

#### CRM-008: Lead Detail Endpoint
**Category:** BACKEND | **Size:** XS
- **Description:** Returns a single lead record with qualification fields.
- **Dependencies:** CRM-007
- **Workflow:** Lead review and qualification workflow
- **CRM Timeline:** N/A (read-only endpoint)
- **Right Level:** Universal

#### CRM-009: Lead Create Endpoint
**Category:** BACKEND | **Size:** XS
- **Description:** Creates a new Lead record with source attribution fields.
- **Dependencies:** CRM-007
- **Workflow:** New inquiry/referral capture workflow
- **CRM Timeline:** Writes "Lead created" activity with source metadata
- **Right Level:** Universal

#### CRM-010: Lead Update Endpoint
**Category:** BACKEND | **Size:** XS
- **Description:** Updates Lead fields including stage transition triggers.
- **Dependencies:** CRM-007
- **Workflow:** Lead qualification workflow
- **CRM Timeline:** Writes "Lead stage changed" activity when pipeline stage updates
- **Right Level:** Universal

#### CRM-011: Lead Convert Endpoint
**Category:** BACKEND | **Size:** S
- **Description:** Converts a Lead to a Contact, updates Lead status, and triggers downstream n8n workflows.
- **Dependencies:** CRM-007, CRM-008, CRM-009
- **Workflow:** Lead-to-contact conversion workflow
- **CRM Timeline:** Writes "Lead converted to contact" activity with created Contact ID
- **Right Level:** Universal

#### CRM-012: Organization List Endpoint
**Category:** BACKEND | **Size:** XS
- **Description:** Provides a paginated list of referral source and partner organizations.
- **Dependencies:** None
- **Workflow:** Referral source tracking workflow
- **CRM Timeline:** N/A (read-only endpoint)
- **Right Level:** Universal

#### CRM-013: Organization Detail Endpoint
**Category:** BACKEND | **Size:** XS
- **Description:** Returns a single organization with linked contacts.
- **Dependencies:** CRM-012
- **Workflow:** Organization review workflow
- **CRM Timeline:** N/A (read-only endpoint)
- **Right Level:** Universal

#### CRM-014: Organization Create Endpoint
**Category:** BACKEND | **Size:** XS
- **Description:** Creates a new Organization (referral source, payer, employer).
- **Dependencies:** CRM-012
- **Workflow:** Referral source onboarding workflow
- **CRM Timeline:** Writes "Organization created" activity
- **Right Level:** Universal

#### CRM-015: Activities By Contact Endpoint
**Category:** BACKEND | **Size:** S
- **Description:** Returns a paginated, chronological activity timeline for a contact with role-based type filtering.
- **Dependencies:** CRM-001, CRM-002
- **Workflow:** Activity review workflow
- **CRM Timeline:** N/A (read-only endpoint)
- **Right Level:** Universal

#### CRM-016: Activity Create Endpoint
**Category:** BACKEND | **Size:** XS
- **Description:** Creates a manual activity note on a contact's timeline.
- **Dependencies:** CRM-015
- **Workflow:** Manual activity logging workflow
- **CRM Timeline:** Writes the manually created activity to the contact's timeline
- **Right Level:** Universal

#### CRM-017: Global Search Endpoint
**Category:** BACKEND | **Size:** S
- **Description:** Searches across contacts, leads, and organizations with result type grouping.
- **Dependencies:** CRM-001, CRM-007, CRM-012
- **Workflow:** Universal person/entity lookup workflow
- **CRM Timeline:** N/A (read-only endpoint)
- **Right Level:** Universal

#### CRM-018: Vocabulary Config Endpoint
**Category:** BACKEND | **Size:** XS
- **Description:** Returns per-tenant label mapping (patient vs. guest vs. client vs. student) for dynamic UI rendering.
- **Dependencies:** None
- **Workflow:** Dynamic label rendering workflow
- **CRM Timeline:** N/A (read-only endpoint)
- **Right Level:** Client (per-tenant configuration)

#### CRM-019: Stages Config Endpoint
**Category:** BACKEND | **Size:** XS
- **Description:** Returns configurable pipeline stages for the current vertical template.
- **Dependencies:** None
- **Workflow:** Lead pipeline transition workflow
- **CRM Timeline:** N/A (read-only endpoint)
- **Right Level:** Client (per-tenant configuration)

## FRONTEND

#### CRM-020: Contact List View Component
**Category:** FRONTEND | **Size:** S
- **Description:** React JSX view component displaying paginated contact list with search, filters, and vocabulary-adaptive labels.
- **Dependencies:** CRM-001, CRM-018
- **Workflow:** Contact lookup workflow
- **CRM Timeline:** N/A (presentation layer only)
- **Right Level:** Universal

#### CRM-021: Contact Detail View Component
**Category:** FRONTEND | **Size:** S
- **Description:** React JSX view component showing contact details, edit forms, and embedded activity timeline.
- **Dependencies:** CRM-020, CRM-002, CRM-015
- **Workflow:** Contact review and update workflow
- **CRM Timeline:** N/A (presentation layer only)
- **Right Level:** Universal

#### CRM-022: Lead Pipeline Kanban View Component
**Category:** FRONTEND | **Size:** S
- **Description:** React JSX Kanban component for drag-and-drop lead pipeline stage management with vocabulary-adaptive labels.
- **Dependencies:** CRM-007, CRM-010, CRM-019
- **Workflow:** Lead qualification workflow
- **CRM Timeline:** N/A (presentation layer only)
- **Right Level:** Universal

## INTEGRATION

#### CRM-023: Lead Conversion n8n Workflow
**Category:** INTEGRATION | **Size:** S
- **Description:** n8n workflow triggered on Lead status change to "Accepted" that creates ERPNext Customer and Medplum Patient (healthcare vertical only).
- **Dependencies:** CRM-011
- **Workflow:** Lead-to-contact conversion workflow
- **CRM Timeline:** Writes "Systems synced" activity after successful Customer + Patient creation
- **Right Level:** Universal

#### CRM-024: Contact-to-Medplum Sync n8n Workflow
**Category:** INTEGRATION | **Size:** S
- **Description:** n8n workflow triggered on Contact save that synchronizes demographics to Medplum Patient resource.
- **Dependencies:** CRM-004
- **Workflow:** Clinical identity maintenance workflow
- **CRM Timeline:** N/A (syncs existing record, no new timeline entry)
- **Right Level:** Universal

#### CRM-025: Clinical Event to CRM Activity n8n Workflow
**Category:** INTEGRATION | **Size:** S
- **Description:** n8n workflow triggered by Medplum FHIR subscription that writes clinical events (encounters, assessments) to CRM timeline.
- **Dependencies:** CRM-016
- **Workflow:** Cross-system activity capture workflow
- **CRM Timeline:** Writes clinical events ("Session completed", "Assessment scored") to contact timeline
- **Right Level:** Universal

#### CRM-026: Billing Event to CRM Activity n8n Workflow
**Category:** INTEGRATION | **Size:** S
- **Description:** n8n workflow triggered by ERPNext webhook that writes billing events (invoices, payments, claims) to CRM timeline.
- **Dependencies:** CRM-016
- **Workflow:** Cross-system activity capture workflow
- **CRM Timeline:** Writes billing events ("Payment received", "Claim submitted") to contact timeline
- **Right Level:** Universal

#### CRM-027: Scheduling Event to CRM Activity n8n Workflow
**Category:** INTEGRATION | **Size:** S
- **Description:** n8n workflow triggered by Medplum FHIR subscription that writes scheduling events (booking, cancellation) to CRM timeline.
- **Dependencies:** CRM-016
- **Workflow:** Cross-system activity capture workflow
- **CRM Timeline:** Writes scheduling events ("Appointment booked", "Appointment cancelled") to contact timeline
- **Right Level:** Universal

#### CRM-028: Task Event to CRM Activity n8n Workflow
**Category:** INTEGRATION | **Size:** S
- **Description:** n8n workflow triggered by SM Task webhook that writes task completions to CRM timeline.
- **Dependencies:** CRM-016
- **Workflow:** Cross-system activity capture workflow
- **CRM Timeline:** Writes task completion events to contact timeline
- **Right Level:** Universal

#### CRM-029: Duplicate Detection Batch n8n Workflow
**Category:** INTEGRATION | **Size:** S
- **Description:** n8n nightly cron workflow that scans for potential duplicate contacts using fuzzy matching and flags for review.
- **Dependencies:** CRM-005
- **Workflow:** Duplicate detection workflow
- **CRM Timeline:** Writes "Potential duplicate flagged" activity on matched records
- **Right Level:** Universal

#### CRM-030: Consent Expiration Check n8n Workflow
**Category:** INTEGRATION | **Size:** S
- **Description:** n8n daily cron workflow that checks healthcare consent dates and creates renewal tasks for expired items.
- **Dependencies:** CRM-031
- **Workflow:** Consent renewal workflow
- **CRM Timeline:** Writes "Consent expired" activity and creates SM Task for renewal
- **Right Level:** Vertical (healthcare-specific)

## CONFIG

#### CRM-031: Healthcare Custom Fields Provisioning
**Category:** CONFIG | **Size:** S
- **Description:** Provisioning configuration that adds healthcare-specific custom fields to Contact and Lead DocTypes (DOB, insurance, consent dates, etc.).
- **Dependencies:** None
- **Workflow:** Healthcare client intake workflow
- **CRM Timeline:** N/A (schema-level change)
- **Right Level:** Vertical (healthcare template only)

#### CRM-032: Pipeline Stages Configuration Template
**Category:** CONFIG | **Size:** XS
- **Description:** Defines per-vertical Sales Stage configurations mapped to CRM Lead pipeline stages.
- **Dependencies:** CRM-019
- **Workflow:** Lead pipeline configuration workflow
- **CRM Timeline:** N/A (configuration-level change)
- **Right Level:** Client (per-tenant, driven by vertical template)

## GLUE

#### CRM-033: CRM Roles and Permissions Setup
**Category:** GLUE | **Size:** S
- **Description:** Creates SM CRM roles (Reader, Editor, Manager, Intake) and configures DocType permissions, User Permissions, and field-level visibility.
- **Dependencies:** CRM-001, CRM-007, CRM-012
- **Workflow:** N/A (access control infrastructure)
- **CRM Timeline:** N/A
- **Right Level:** Role (defines role-based access boundaries)