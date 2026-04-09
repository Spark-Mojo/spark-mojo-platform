model: model-alpha
test: 01-story-decomposition
run: B
date: 2026-04-09

# STORIES.md

```markdown
# Scheduling Mojo — Atomic Stories

## SCHED-001: SM Appointment Type DocType
**Category:** BACKEND | **Size:** XS

Create the SM Appointment Type DocType with fields: name, duration_minutes, is_telehealth, buffer_minutes_after, default_location_type. This is the foundational configuration data for all scheduling operations.

**Dependencies:** None

**Spec Gates:**
1. **Workflow:** Provider Setup — defines the appointment types a provider can offer
2. **CRM Timeline:** N/A — DocType creation does not write to CRM; APIs using this DocType do
3. **Right Level:** Universal — all verticals need configurable appointment types

---

## SCHED-002: SM Provider Schedule DocType
**Category:** BACKEND | **Size:** XS

Create the SM Provider Schedule DocType with fields: provider_id, day_of_week, start_time, end_time, appointment_types_allowed. This stores weekly recurring schedule templates for providers.

**Dependencies:** None

**Spec Gates:**
1. **Workflow:** Provider Setup — defines provider weekly availability templates
2. **CRM Timeline:** N/A — DocType creation does not write to CRM
3. **Right Level:** Universal — all verticals need provider schedule templates

---

## SCHED-003: SM Schedule Block DocType
**Category:** BACKEND | **Size:** XS

Create the SM Schedule Block DocType with fields: provider_id, date, start_time, end_time, reason. This stores individual blocked time slots for vacations, lunches, and admin time.

**Dependencies:** None

**Spec Gates:**
1. **Workflow:** Provider Setup — allows blocking off individual time slots from the weekly template
2. **CRM Timeline:** N/A — DocType creation does not write to CRM
3. **Right Level:** Universal — all verticals need schedule blocking

---

## SCHED-004: SM Appointment DocType with State Machine
**Category:** BACKEND | **Size:** S

Create the SM Appointment DocType with all fields (provider_id, patient_id, appointment_type, start_datetime, end_datetime, status, location_type, telehealth_link, notes, cancellation_reason, series_id, recurring_parent_id) and configure the Frappe Workflow state machine with states: Requested, Confirmed, In Progress, Completed, Cancelled, No-Show and valid transitions per the lifecycle definition.

**Dependencies:** SCHED-001

**Spec Gates:**
1. **Workflow:** Appointment Booking through Cancellation — the core document and state machine for the entire appointment lifecycle
2. **CRM Timeline:** N/A — DocType and Workflow setup do not write to CRM; state transition APIs do
3. **Right Level:** Universal — all verticals need appointment documents with state machines

---

## SCHED-005: SM Waitlist Entry DocType
**Category:** BACKEND | **Size:** XS

Create the SM Waitlist Entry DocType with fields: patient_id, provider_id, appointment_type, requested_date_from, requested_date_to, notified. This stores patients waiting for slots to open.

**Dependencies:** None

**Spec Gates:**
1. **Workflow:** Waitlist — stores patients who want to be notified when slots become available
2. **CRM Timeline:** N/A — DocType creation does not write to CRM
3. **Right Level:** Universal — all verticals benefit from waitlist functionality

---

## SCHED-006: Provider List & Schedule Query API
**Category:** BACKEND | **Size:** S

Implement two MAL endpoints: GET /api/modules/scheduling/providers (list providers with availability metadata) and GET /api/modules/scheduling/provider/{id}/schedule (retrieve a specific provider's weekly schedule template).

**Dependencies:** SCHED-002

**Spec Gates:**
1. **Workflow:** Provider Setup and Appointment Booking — enables viewing provider availability for scheduling decisions
2. **CRM Timeline:** N/A — read-only queries do not write to CRM
3. **Right Level:** Universal — all verticals need to query provider availability

---

## SCHED-007: Provider Schedule Template Management API
**Category:** BACKEND | **Size:** S

Implement POST /api/modules/scheduling/provider/{id}/schedule to create or update a provider's weekly schedule template, including validation of appointment types against SM Appointment Type records.

**Dependencies:** SCHED-001, SCHED-002

**Spec Gates:**
1. **Workflow:** Provider Setup — enables admins to configure provider weekly schedules
2. **CRM Timeline:** N/A — schedule template changes do not write to patient CRM timeline
3. **Right Level:** Universal — all verticals need schedule template management

---

## SCHED-008: Provider Schedule Block Management API
**Category:** BACKEND | **Size:** S

Implement POST /api/modules/scheduling/provider/{id}/block (create a schedule block) and DELETE /api/modules/scheduling/provider/{id}/block/{block_id} (remove a schedule block). Validates blocks against existing appointments.

**Dependencies:** SCHED-003, SCHED-004

**Spec Gates:**
1. **Workflow:** Provider Setup — enables blocking time for vacations, lunches, and admin time
2. **CRM Timeline:** N/A — schedule block changes do not write to patient CRM timeline
3. **Right Level:** Universal — all verticals need schedule blocking capability

---

## SCHED-009: Available Slots Search API
**Category:** BACKEND | **Size:** S

Implement GET /api/modules/scheduling/slots to query available appointment slots by provider, date range, and appointment type. This endpoint computes availability by combining provider schedule templates, subtracting schedule blocks and existing appointments, and filtering by appointment type duration and buffer requirements.

**Dependencies:** SCHED-001, SCHED-002, SCHED-003, SCHED-004

**Spec Gates:**
1. **Workflow:** Appointment Booking and Waitlist — the core search capability for finding available slots
2. **CRM Timeline:** N/A — read-only search does not write to CRM
3. **Right Level:** Universal — all verticals need slot search functionality

---

## SCHED-010: Appointment Create & Read API
**Category:** BACKEND | **Size:** S

Implement POST /api/modules/scheduling/appointment/create (create appointment in Requested state after validating slot availability) and GET /api/modules/scheduling/appointment/{id} (retrieve appointment details). Creation writes "Appointment created" to the patient's CRM timeline.

**Dependencies:** SCHED-004, SCHED-009

**Spec Gates:**
1. **Workflow:** Appointment Booking — creates the appointment record after validating availability
2. **CRM Timeline:** Writes "Appointment created" entry to the patient's CRM activity timeline
3. **Right Level:** Universal — all verticals need appointment creation

---

## SCHED-011: Appointment Confirm & Start API
**Category:** BACKEND | **Size:** S

Implement PUT /api/modules/scheduling/appointment/{id}/confirm (transition from Requested to Confirmed) and PUT /api/modules/scheduling/appointment/{id}/start (transition from Confirmed to In Progress). Confirmation writes "Appointment confirmed" to CRM timeline.

**Dependencies:** SCHED-010

**Spec Gates:**
1. **Workflow:** Appointment Confirmation and Appointment Execution — advances the appointment through the lifecycle
2. **CRM Timeline:** Confirmation writes "Appointment confirmed" entry; start does not write additional CRM entry
3. **Right Level:** Universal — all verticals need confirmation and session start transitions

---

## SCHED-012: Appointment Completion API
**Category:** BACKEND | **Size:** S

Implement PUT /api/modules/scheduling/appointment/{id}/complete to transition from In Progress to Completed. Completion writes "Appointment completed" to CRM timeline including appointment type and duration. This is the billing trigger per platform vocabulary.

**Dependencies:** SCHED-010

**Spec Gates:**
1. **Workflow:** Appointment Execution — marks the session as completed, triggering the billing workflow
2. **CRM Timeline:** Writes "Appointment completed" entry including type and duration to CRM timeline
3. **Right Level:** Universal — all verticals need session completion and billing triggers

---

## SCHED-013: Appointment Cancellation & No-Show API
**Category:** BACKEND | **Size:** S

Implement PUT /api/modules/scheduling/appointment/{id}/cancel (transition to Cancelled with reason code) and PUT /api/modules/scheduling/appointment/{id}/no-show (transition from Confirmed to No-Show). Cancellation writes "Appointment cancelled" with reason to CRM; no-show writes "No-show" entry.

**Dependencies:** SCHED-010

**Spec Gates:**
1. **Workflow:** Cancellation and No-Show — handles appointment failure states with distinct transitions and CRM entries
2. **CRM Timeline:** Cancel writes "Appointment cancelled" with reason; no-show writes "No-show" entry to CRM timeline
3. **Right Level:** Universal — all verticals need cancellation and no-show handling

---

## SCHED-014: Waitlist Entry API
**Category:** BACKEND | **Size:** S

Implement POST /api/modules/scheduling/waitlist/join (add patient to waitlist for a provider+type combination) and DELETE /api/modules/scheduling/waitlist/{id} (remove patient from waitlist). Validates against available slots before allowing join.

**Dependencies:** SCHED-005, SCHED-009

**Spec Gates:**
1. **Workflow:** Waitlist — enables patients to join and leave the waitlist for specific provider and appointment type combinations
2. **CRM Timeline:** N/A — waitlist operations do not write to CRM; only appointment state changes do
3. **Right Level:** Universal — waitlist is a universal scheduling feature

---

## SCHED-015: ProviderScheduleEditor Component
**Category:** FRONTEND | **Size:** S

Build the ProviderScheduleEditor React component for weekly template management. Allows admins to set available days, hours, and permitted appointment types for a provider. Integrates with SCHED-006, SCHED-007, and SCHED-008 APIs.

**Dependencies:** SCHED-006, SCHED-007, SCHED-008

**Spec Gates:**
1. **Workflow:** Provider Setup — provides the UI for configuring provider weekly schedules and blocks
2. **CRM Timeline:** N/A — frontend components do not write to CRM; they call backend APIs that do
3. **Right Level:** Universal — all verticals need schedule editing UI

---

## SCHED-016: AvailabilityCalendar Component
**Category:** FRONTEND | **Size:** S

Build the AvailabilityCalendar React component displaying a weekly view of provider availability with slot selection. Integrates with SCHED-009 slot search API. Highlights available, blocked, and booked slots.

**Dependencies:** SCHED-009

**Spec Gates:**
1. **Workflow:** Appointment Booking — visualizes available slots for selection during booking
2. **CRM Timeline:** N/A — frontend components do not write to CRM
3. **Right Level:** Universal — all verticals need availability visualization

---

## SCHED-017: AppointmentBookingForm Component
**Category:** FRONTEND | **Size:** S

Build the AppointmentBookingForm React component with slot picker, patient selector, appointment type picker, and confirmation step. Integrates with AvailabilityCalendar (SCHED-016) and Appointment Create API (SCHED-010).

**Dependencies:** SCHED-010, SCHED-016

**Spec Gates:**
1. **Workflow:** Appointment Booking — provides the complete booking flow from slot selection to appointment creation
2. **CRM Timeline:** N/A — frontend components do not write to CRM; they call backend APIs that do
3. **Right Level:** Universal — all verticals need a booking form

---

## SCHED-018: AppointmentCard Component
**Category:** FRONTEND | **Size:** S

Build the AppointmentCard React component for displaying appointment details with status-aware action buttons (Confirm, Start, Complete, Cancel, Mark No-Show). Integrates with SCHED-011, SCHED-012, and SCHED-013 APIs.

**Dependencies:** SCHED-011, SCHED-012, SCHED-013

**Spec Gates:**
1. **Workflow:** Appointment Confirmation through Cancellation — provides the UI for managing appointment lifecycle transitions
2. **CRM Timeline:** N/A — frontend components do not write to CRM; they call backend APIs that do
3. **Right Level:** Universal — all verticals need appointment detail and action UI

---

## SCHED-019: WaitlistPanel Component
**Category:** FRONTEND | **Size:** S

Build the WaitlistPanel React component to view and manage waitlist entries. Displays patients waiting for specific provider+type combinations, allows adding and removing entries. Integrates with SCHED-014 API.

**Dependencies:** SCHED-014

**Spec Gates:**
1. **Workflow:** Waitlist — provides the UI for managing patients on the waitlist
2. **CRM Timeline:** N/A — frontend components do not write to CRM
3. **Right Level:** Universal — all verticals need waitlist management UI

---

## SCHED-020: Appointment Reminder Notification Workflow
**Category:** INTEGRATION | **Size:** S

Build the n8n workflow for appointment reminder notifications. Triggers at 24h and 1h before appointment, sends email and SMS reminders to patients. For telehealth appointments, includes the video link in the reminder.

**Dependencies:** SCHED-010

**Spec Gates:**
1. **Workflow:** Appointment Confirmation and Appointment Execution — reduces no-shows by sending timely reminders
2. **CRM Timeline:** N/A — n8n workflows do not write to CRM; they send external notifications
3. **Right Level:** Universal — all verticals need appointment reminders

---

## SCHED-021: Telehealth Link Generation Workflow
**Category:** INTEGRATION | **Size:** S

Build the n8n workflow that generates video links for telehealth appointments. Triggered when a telehealth appointment is created or confirmed, calls the video provider API to generate a link, and updates the appointment record via SCHED-026 API.

**Dependencies:** SCHED-026

**Spec Gates:**
1. **Workflow:** Appointment Booking and Telehealth Link Generation — enables virtual visits by generating video links
2. **CRM Timeline:** N/A — n8n workflows do not write to CRM; they call MAL endpoints that may write
3. **Right Level:** Universal — telehealth is increasingly universal across verticals

---

## SCHED-022: Billing Trigger on Completion Workflow
**Category:** INTEGRATION | **Size:** S

Build the n8n workflow that triggers the billing workflow in Healthcare Billing Mojo when an appointment is completed. Listens for appointment completion events and kicks off the billing workflow.

**Dependencies:** SCHED-012

**Spec Gates:**
1. **Workflow:** Appointment Execution — session completion is the billing trigger per platform vocabulary
2. **CRM Timeline:** N/A — n8n workflows do not write to CRM; they orchestrate cross-system actions
3. **Right Level:** Vertical — billing trigger logic is specific to behavioral health (first vertical); may generalize later

---

## SCHED-023: Waitlist Slot-Opening Notification Workflow
**Category:** INTEGRATION | **Size:** S

Build the n8n workflow that notifies waitlisted patients when a matching slot opens. Triggered when a schedule block is removed or an appointment is cancelled, queries SM Waitlist Entry for matching patients, and sends notifications.

**Dependencies:** SCHED-008, SCHED-014

**Spec Gates:**
1. **Workflow:** Waitlist — fulfills the auto-notification promise when slots become available
2. **CRM Timeline:** N/A — n8n workflows do not write to CRM; they send external notifications
3. **Right Level:** Universal — waitlist notification is a universal scheduling feature

---

## SCHED-024: Appointment Rescheduling Orchestration
**Category:** GLUE | **Size:** S

Implement the rescheduling orchestration logic that cancels the existing appointment, creates a new appointment, and preserves the link to the original if part of a recurring series. This coordinates SCHED-013 (cancel) and SCHED-010 (create) APIs with series_id and recurring_parent_id linkage.

**Dependencies:** SCHED-010, SCHED-013

**Spec Gates:**
1. **Workflow:** Rescheduling — enables changing appointment times while preserving history and series relationships
2. **CRM Timeline:** N/A — this glue story orchestrates existing APIs; those APIs write to CRM (cancel writes cancel entry, create writes created entry)
3. **Right Level:** Universal — rescheduling is a universal scheduling need

---

## SCHED-025: FHIR Appointment Sync Workflow
**Category:** INTEGRATION | **Size:** S

Build the n8n workflow that syncs SM Appointment data to Medplum as FHIR R4 Appointment resources. Triggered on appointment create and state transitions, transforms SM Appointment fields to FHIR format, and creates/updates the FHIR Appointment in Medplum.

**Dependencies:** SCHED-010

**Spec Gates:**
1. **Workflow:** Appointment Booking through Cancellation — maintains clinical data consistency between Frappe and Medplum
2. **CRM Timeline:** N/A — n8n workflows do not write to CRM; they sync to clinical data layer
3. **Right Level:** Universal — FHIR sync is a platform-level requirement for clinical data

---

## SCHED-026: Appointment Telehealth Link Update API
**Category:** BACKEND | **Size:** XS

Implement PUT /api/modules/scheduling/appointment/{id}/telehealth-link to update the telehealth_link field on an existing appointment. This endpoint is called by the n8n telehealth link generation workflow (SCHED-021) after it obtains a video link from the external provider.

**Dependencies:** SCHED-010

**Spec Gates:**
1. **Workflow:** Telehealth Link Generation — enables n8n to update appointment records with generated video links
2. **CRM Timeline:** N/A — link update does not change appointment state or write to CRM
3. **Right Level:** Universal — telehealth link management is a universal need
```

---

# DEPENDENCY-GRAPH.md

```markdown
# Scheduling Mojo — Dependency Graph & Build Order

## Execution Phases

Stories within each phase can be built in parallel. A phase cannot start until all its dependencies from prior phases are complete.

---

### Phase 1: Foundation DocTypes
**No dependencies. Start immediately.**

| Story ID | Title | Size |
|----------|-------|------|
| SCHED-001 | SM Appointment Type DocType | XS |
| SCHED-002 | SM Provider Schedule DocType | XS |
| SCHED-003 | SM Schedule Block DocType | XS |
| SCHED-005 | SM Waitlist Entry DocType | XS |

---

### Phase 2: Core Appointment DocType
**Depends on: Phase 1 (SCHED-001)**

| Story ID | Title | Size | Depends On |
|----------|-------|------|------------|
| SCHED-004 | SM Appointment DocType with State Machine | S | SCHED-001 |

---

### Phase 3: Provider Management APIs
**Depends on: Phase 1 (SCHED-002, SCHED-003), Phase 2 (SCHED-004)**

| Story ID | Title | Size | Depends On |
|----------|-------|------|------------|
| SCHED-006 | Provider List & Schedule Query API | S | SCHED-002 |
| SCHED-007 | Provider Schedule Template Management API | S | SCHED-001, SCHED-002 |
| SCHED-008 | Provider Schedule Block Management API | S | SCHED-003, SCHED-004 |

---

### Phase 4: Slot Search Engine
**Depends on: Phase 1, Phase 2, Phase 3**

| Story ID | Title | Size | Depends On |
|----------|-------|------|------------|
| SCHED-009 | Available Slots Search API | S | SCHED-001, SCHED-002, SCHED-003, SCHED-004 |

---

### Phase 5: Appointment & Waitlist Creation APIs
**Depends on: Phase 4**

| Story ID | Title | Size | Depends On |
|----------|-------|------|------------|
| SCHED-010 | Appointment Create & Read API | S | SCHED-004, SCHED-009 |
| SCHED-014 | Waitlist Entry API | S | SCHED-005, SCHED-009 |

---

### Phase 6: Appointment Lifecycle APIs
**Depends on: Phase 5 (SCHED-010)**

| Story ID | Title | Size | Depends On |
|----------|-------|------|------------|
| SCHED-011 | Appointment Confirm & Start API | S | SCHED-010 |
| SCHED-012 | Appointment Completion API | S | SCHED-010 |
| SCHED-013 | Appointment Cancellation & No-Show API | S | SCHED-010 |
| SCHED-026 | Appointment Telehealth Link Update API | XS | SCHED-010 |

---

### Phase 7: Frontend - Provider Schedule
**Depends on: Phase 3**

| Story ID | Title | Size | Depends On |
|----------|-------|------|------------|
| SCHED-015 | ProviderScheduleEditor Component | S | SCHED-006, SCHED-007, SCHED-008 |

---

### Phase 8: Frontend - Availability & Search
**Depends on: Phase 4**

| Story ID | Title | Size | Depends On |
|----------|-------|------|------------|
| SCHED-016 | AvailabilityCalendar Component | S | SCHED-009 |

---

### Phase 9: Frontend - Booking & Waitlist
**Depends on: Phase 5, Phase 8**

| Story ID | Title | Size | Depends On |
|----------|-------|------|------------|
| SCHED-017 | AppointmentBookingForm Component | S | SCHED-010, SCHED-016 |
| SCHED-019 | WaitlistPanel Component | S | SCHED-014 |

---

### Phase 10: Frontend - Appointment Management
**Depends on: Phase 6**

| Story ID | Title | Size | Depends On |
|----------|-------|------|------------|
| SCHED-018 | AppointmentCard Component | S | SCHED-011, SCHED-012, SCHED-013 |

---

### Phase 11: Integration Workflows
**Depends on: Phase 5, Phase 6**

| Story ID | Title | Size | Depends On |
|----------|-------|------|------------|
| SCHED-020 | Appointment Reminder Notification Workflow | S | SCHED-010 |
| SCHED-021 | Telehealth Link Generation Workflow | S | SCHED-026 |
| SCHED-022 | Billing Trigger on Completion Workflow | S | SCHED-012 |
| SCHED-023 | Waitlist Slot-Opening Notification Workflow | S | SCHED-008, SCHED-014 |
| SCHED-025 | FHIR Appointment Sync Workflow | S | SCHED-010 |

---

### Phase 12: Glue & Orchestration
**Depends on: Phase 5, Phase 6**

| Story ID | Title | Size | Depends On |
|----------|-------|------|------------|
| SCHED-024 | Appointment Rescheduling Orchestration | S | SCHED-010, SCHED-013 |

---

## Parallel Execution Summary

```
Phase 1:  [SCHED-001] [SCHED-002] [SCHED-003] [SCHED-005]
                │
Phase 2:  [SCHED-004]
                │
Phase 3:  [SCHED-006] [SCHED-007] [SCHED-008]
                │
Phase 4:  [SCHED-009]
                │
Phase 5:  [SCHED-010] [SCHED-014]
                │
Phase 6:  [SCHED-011] [SCHED-012] [SCHED-013] [SCHED-026]
                │
Phase 7-10 (Frontend - can overlap):
          [SCHED-015] ──┐
          [SCHED-016] ──┤
          [SCHED-017] ──┤── Parallel after their API dependencies
          [SCHED-018] ──┤
          [SCHED-019] ──┘
                │
Phase 11: [SCHED-020] [SCHED-021] [SCHED-022] [SCHED-023] [SCHED-025]
                │
Phase 12: [SCHED-024]
```

## Critical Path

The critical path through the dependency graph is:

**SCHED-001 → SCHED-004 → SCHED-009 → SCHED-010 → SCHED-012 → SCHED-022**

This path represents: Appointment Type → Appointment DocType → Slot Search → Appointment Create → Appointment Complete → Billing Trigger

Total story points on critical path: XS + S + S + S + S + S = 6 stories

## Notes

- **Frontend stories (Phases 7-10) can begin as soon as their API dependencies are met**, not requiring sequential phase completion
- **Integration stories (Phase 11) can begin as soon as their trigger APIs are complete**, enabling early testing of n8n workflows
- **SCHED-009 (Available Slots Search)** is the most complex single story and a bottleneck; prioritize early
- **SCHED-010 (Appointment Create)** is a dependency for 7 other stories; prioritize immediately after SCHED-009
```