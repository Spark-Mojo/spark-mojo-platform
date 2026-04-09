model: model-beta
test: 01-story-decomposition
run: B
date: 2026-04-09

# STORIES.md

```markdown
# Scheduling Mojo — Atomic Story Backlog

> **Generated:** 2026-04-09
> **Capability:** Scheduling Mojo
> **First Vertical:** Behavioral Health
> **Total Stories:** 27

---

## DocType Foundation

### SCHED-001 · SM Appointment Type DocType
| | |
|---|---|
| **Category** | BACKEND |
| **Size** | XS |
| **Description** | Create the SM Appointment Type DocType with fields: `name`, `duration_minutes`, `is_telehealth`, `buffer_minutes_after`, `default_location_type`. |
| **Dependencies** | None |
| **Spec Gate 1 – Workflow** | Serves all scheduling workflows; defines the vocabulary of bookable appointment types. |
| **Spec Gate 2 – CRM Timeline** | N/A — configuration data, no patient-facing event. |
| **Spec Gate 3 – Right Level** | Universal. Appointment types are configured per vertical/client but the schema is universal. |

---

### SCHED-002 · SM Provider Schedule DocType
| | |
|---|---|
| **Category** | BACKEND |
| **Size** | XS |
| **Description** | Create the SM Provider Schedule DocType (weekly template) with fields: `provider_id`, `day_of_week`, `start_time`, `end_time`, `appointment_types_allowed` (link/table to SM Appointment Type). |
| **Dependencies** | None |
| **Spec Gate 1 – Workflow** | Provider Setup workflow — defines recurring weekly availability templates. |
| **Spec Gate 2 – CRM Timeline** | N/A — internal provider configuration, not a patient event. |
| **Spec Gate 3 – Right Level** | Universal. All verticals have providers with weekly schedules. |

---

### SCHED-003 · SM Schedule Block DocType
| | |
|---|---|
| **Category** | BACKEND |
| **Size** | XS |
| **Description** | Create the SM Schedule Block DocType with fields: `provider_id`, `date`, `start_time`, `end_time`, `reason`. Represents individual blocked-off time (vacation, lunch, admin). |
| **Dependencies** | None |
| **Spec Gate 1 – Workflow** | Provider Setup workflow — allows admins to block individual time slots. |
| **Spec Gate 2 – CRM Timeline** | N/A — internal provider configuration, not a patient event. |
| **Spec Gate 3 – Right Level** | Universal. Schedule blocking applies to any service-based business. |

---

### SCHED-004 · SM Appointment DocType with Status Lifecycle
| | |
|---|---|
| **Category** | BACKEND |
| **Size** | S |
| **Description** | Create the SM Appointment DocType with fields: `provider_id`, `patient_id`, `appointment_type` (link to SM Appointment Type), `start_datetime`, `end_datetime`, `status`, `location_type`, `telehealth_link`, `notes`, `cancellation_reason`, `series_id`, `recurring_parent_id`. Implement `transition_state()` enforcing the status lifecycle: Requested → Confirmed → In Progress → Completed; Requested → Cancelled; Confirmed → Cancelled; Confirmed → No-Show. Completed, Cancelled, and No-Show are terminal states. |
| **Dependencies** | SCHED-001 |
| **Spec Gate 1 – Workflow** | Core record for all appointment workflows (Booking, Confirmation, Execution, Cancellation, No-Show). |
| **Spec Gate 2 – CRM Timeline** | N/A at this layer — CRM timeline writes are handled by SCHED-025 hooks triggered by status transitions. |
| **Spec Gate 3 – Right Level** | Universal. Appointment lifecycle applies to any appointment-based business. |

---

### SCHED-005 · SM Waitlist Entry DocType
| | |
|---|---|
| **Category** | BACKEND |
| **Size** | XS |
| **Description** | Create the SM Waitlist Entry DocType with fields: `patient_id`, `provider_id`, `appointment_type` (link to SM Appointment Type), `requested_date_from`, `requested_date_to`, `notified` (boolean). |
| **Dependencies** | SCHED-001 |
| **Spec Gate 1 – Workflow** | Waitlist workflow — stores patient interest when no slots are available. |
| **Spec Gate 2 – CRM Timeline** | N/A — waitlist entry is an internal queue record, not a billable or clinical event. |
| **Spec Gate 3 – Right Level** | Universal. Waitlisting is applicable to any business with limited appointment slots. |

---

## Provider & Schedule Endpoints

### SCHED-006 · Provider Listing and Schedule Read Endpoints
| | |
|---|---|
| **Category** | BACKEND |
| **Size** | XS |
| **Description** | Implement two MAL endpoints: `GET /api/modules/scheduling/providers` (list providers with availability metadata) and `GET /api/modules/scheduling/provider/{id}/schedule` (return weekly schedule template for a provider). |
| **Dependencies** | SCHED-002 |
| **Spec Gate 1 – Workflow** | Provider Setup + Appointment Booking — staff and patients need to browse providers and see schedules. |
| **Spec Gate 2 – CRM Timeline** | N/A — read-only endpoints, no state change. |
| **Spec Gate 3 – Right Level** | Universal. Provider listing is a universal scheduling concept. |

---

### SCHED-007 · Provider Schedule Write Endpoint
| | |
|---|---|
| **Category** | BACKEND |
| **Size** | XS |
| **Description** | Implement MAL endpoint: `POST /api/modules/scheduling/provider/{id}/schedule`. Creates or updates SM Provider Schedule records (weekly template rows) for a given provider. Validates no overlapping time blocks for the same day. |
| **Dependencies** | SCHED-002 |
| **Spec Gate 1 – Workflow** | Provider Setup — admin configures provider weekly availability. |
| **Spec Gate 2 – CRM Timeline** | N/A — internal provider configuration, not a patient event. |
| **Spec Gate 3 – Right Level** | Universal. |

---

### SCHED-008 · Schedule Block Create and Delete Endpoints
| | |
|---|---|
| **Category** | BACKEND |
| **Size** | XS |
| **Description** | Implement two MAL endpoints: `POST /api/modules/scheduling/provider/{id}/block` (create SM Schedule Block for vacation/lunch/admin time) and `DELETE /api/modules/scheduling/provider/{id}/block/{block_id}` (remove a block). Validate block falls within provider's configured schedule days. |
| **Dependencies** | SCHED-003 |
| **Spec Gate 1 – Workflow** | Provider Setup — admin blocks off individual time slots. |
| **Spec Gate 2 – CRM Timeline** | N/A — internal provider configuration, not a patient event. |
| **Spec Gate 3 – Right Level** | Universal. |

---

## Availability & Booking Endpoints

### SCHED-009 · Slot Availability Query Endpoint
| | |
|---|---|
| **Category** | BACKEND |
| **Size** | S |
| **Description** | Implement MAL endpoint: `GET /api/modules/scheduling/slots`. Accepts query parameters: `provider_id`, `date_from`, `date_to`, `appointment_type`. Computes available slots by: (1) loading provider weekly template, (2) subtracting SM Schedule Blocks, (3) subtracting existing SM Appointment records (non-terminal status), (4) filtering by appointment type allowed, (5) applying `buffer_minutes_after` from SM Appointment Type. Returns list of available time slots with start/end times. |
| **Dependencies** | SCHED-001, SCHED-002, SCHED-003, SCHED-004 |
| **Spec Gate 1 – Workflow** | Appointment Booking — the core availability search that enables slot selection. |
| **Spec Gate 2 – CRM Timeline** | N/A — read-only query, no state change. |
| **Spec Gate 3 – Right Level** | Universal. Availability calculation logic is not vertical-specific. |

---

### SCHED-010 · Appointment Create and Read Endpoints
| | |
|---|---|
| **Category** | BACKEND |
| **Size** | S |
| **Description** | Implement two MAL endpoints: `POST /api/modules/scheduling/appointment/create` (validate slot availability against provider schedule and existing bookings, create SM Appointment in Requested status, return appointment) and `GET /api/modules/scheduling/appointment/{id}` (return full appointment record). Create endpoint must reject double-bookings and validate appointment type is allowed for the provider's schedule. |
| **Dependencies** | SCHED-004, SCHED-001 |
| **Spec Gate 1 – Workflow** | Appointment Booking — creates the appointment record in Requested state. |
| **Spec Gate 2 – CRM Timeline** | N/A at this layer — CRM write is handled by SCHED-025 hooks on create. |
| **Spec Gate 3 – Right Level** | Universal. Appointment creation is not vertical-specific. |

---

## State Transition Endpoints

### SCHED-011 · Appointment Confirm Endpoint
| | |
|---|---|
| **Category** | BACKEND |
| **Size** | XS |
| **Description** | Implement MAL endpoint: `PUT /api/modules/scheduling/appointment/{id}/confirm`. Validates current status is Requested, transitions to Confirmed via `transition_state()`. Returns updated appointment. |
| **Dependencies** | SCHED-004 |
| **Spec Gate 1 – Workflow** | Appointment Confirmation — provider or admin confirms a requested appointment. |
| **Spec Gate 2 – CRM Timeline** | N/A at this layer — CRM write handled by SCHED-025. |
| **Spec Gate 3 – Right Level** | Universal. |

---

### SCHED-012 · Appointment Start and Complete Endpoints
| | |
|---|---|
| **Category** | BACKEND |
| **Size** | XS |
| **Description** | Implement two MAL endpoints: `PUT /api/modules/scheduling/appointment/{id}/start` (Confirmed → In Progress) and `PUT /api/modules/scheduling/appointment/{id}/complete` (In Progress → Completed). Each validates current status and uses `transition_state()`. Complete endpoint records actual end time if different from scheduled. |
| **Dependencies** | SCHED-004 |
| **Spec Gate 1 – Workflow** | Appointment Execution — session start and clinician sign-off. |
| **Spec Gate 2 – CRM Timeline** | N/A at this layer — CRM write handled by SCHED-025. |
| **Spec Gate 3 – Right Level** | Universal. |

---

### SCHED-013 · Appointment Cancel Endpoint
| | |
|---|---|
| **Category** | BACKEND |
| **Size** | XS |
| **Description** | Implement MAL endpoint: `PUT /api/modules/scheduling/appointment/{id}/cancel`. Accepts `cancellation_reason` in request body. Validates current status is Requested or Confirmed, transitions to Cancelled via `transition_state()`. Stores reason on record. Returns updated appointment. |
| **Dependencies** | SCHED-004 |
| **Spec Gate 1 – Workflow** | Cancellation and No-Show — receptionist or patient cancels with reason code. |
| **Spec Gate 2 – CRM Timeline** | N/A at this layer — CRM write (including reason) handled by SCHED-025. |
| **Spec Gate 3 – Right Level** | Universal. |

---

### SCHED-014 · Appointment No-Show Endpoint
| | |
|---|---|
| **Category** | BACKEND |
| **Size** | XS |
| **Description** | Implement MAL endpoint: `PUT /api/modules/scheduling/appointment/{id}/no-show`. Validates current status is Confirmed, transitions to No-Show via `transition_state()`. Returns updated appointment. |
| **Dependencies** | SCHED-004 |
| **Spec Gate 1 – Workflow** | Cancellation and No-Show — clinician marks patient as no-show. |
| **Spec Gate 2 – CRM Timeline** | N/A at this layer — CRM write handled by SCHED-025. |
| **Spec Gate 3 – Right Level** | Universal. |

---

### SCHED-015 · Waitlist Join and Remove Endpoints
| | |
|---|---|
| **Category** | BACKEND |
| **Size** | XS |
| **Description** | Implement two MAL endpoints: `POST /api/modules/scheduling/waitlist/join` (create SM Waitlist Entry with patient, provider, type, date range) and `DELETE /api/modules/scheduling/waitlist/{id}` (remove entry). Join validates no duplicate entry for same patient+provider+type combination. |
| **Dependencies** | SCHED-005 |
| **Spec Gate 1 – Workflow** | Waitlist — patient joins waitlist when no slots are available. |
| **Spec Gate 2 – CRM Timeline** | N/A — waitlist management is a queue operation, not a clinical or billing event. |
| **Spec Gate 3 – Right Level** | Universal. |

---

## Frontend Components

### SCHED-016 · ProviderScheduleEditor Component
| | |
|---|---|
| **Category** | FRONTEND |
| **Size** | S |
| **Description** | Build React JSX component `ProviderScheduleEditor`. Renders a weekly grid (Mon–Sun) showing the provider's schedule template. Admin can add/edit time slots per day, assign allowed appointment types, and create/delete schedule blocks. Calls `GET /provider/{id}/schedule`, `POST /provider/{id}/schedule`, `POST /provider/{id}/block`, `DELETE /provider/{id}/block/{block_id}`. Uses `var(--sm-*)` tokens only. |
| **Dependencies** | SCHED-006, SCHED-007, SCHED-008 |
| **Spec Gate 1 – Workflow** | Provider Setup — the admin interface for managing weekly templates and blocks. |
| **Spec Gate 2 – CRM Timeline** | N/A — admin configuration UI, no patient event. |
| **Spec Gate 3 – Right Level** | Universal. Schedule editing applies to any provider-based business. |

---

### SCHED-017 · AvailabilityCalendar Component
| | |
|---|---|
| **Category** | FRONTEND |
| **Size** | S |
| **Description** | Build React JSX component `AvailabilityCalendar`. Renders a weekly calendar view of a provider's available slots. Accepts provider, date range, and appointment type as filter props. Calls `GET /api/modules/scheduling/slots`. Slots are clickable for selection. Visual distinction between available, blocked, and booked slots. Uses `var(--sm-*)` tokens only. |
| **Dependencies** | SCHED-009 |
| **Spec Gate 1 – Workflow** | Appointment Booking — slot selection step of the booking flow. |
| **Spec Gate 2 – CRM Timeline** | N/A — read-only display component. |
| **Spec Gate 3 – Right Level** | Universal. |

---

### SCHED-018 · AppointmentBookingForm Component
| | |
|---|---|
| **Category** | FRONTEND |
| **Size** | S |
| **Description** | Build React JSX component `AppointmentBookingForm`. Multi-step form: (1) select provider and appointment type, (2) pick slot via AvailabilityCalendar integration point, (3) confirm patient and notes, (4) submit. Calls `GET /api/modules/scheduling/slots` for availability preview and `POST /api/modules/scheduling/appointment/create` on submit. Shows confirmation summary before final submission. Uses `var(--sm-*)` tokens only. |
| **Dependencies** | SCHED-009, SCHED-010 |
| **Spec Gate 1 – Workflow** | Appointment Booking — the end-to-end booking interface for receptionist or patient. |
| **Spec Gate 2 – CRM Timeline** | N/A — CRM write triggered server-side by SCHED-025, not by the frontend. |
| **Spec Gate 3 – Right Level** | Universal. |

---

### SCHED-019 · AppointmentCard Component
| | |
|---|---|
| **Category** | FRONTEND |
| **Size** | S |
| **Description** | Build React JSX component `AppointmentCard`. Displays appointment details (provider, patient, type, time, location, status, telehealth link if present). Renders status-aware action buttons: Confirm (when Requested), Start (when Confirmed), Complete (when In Progress), Cancel (when Requested or Confirmed, prompts for reason), No-Show (when Confirmed). Buttons call the corresponding `PUT /api/modules/scheduling/appointment/{id}/{action}` endpoints. Refreshes card on success. Uses `var(--sm-*)` tokens only. |
| **Dependencies** | SCHED-010 |
| **Spec Gate 1 – Workflow** | Appointment Confirmation, Execution, Cancellation, No-Show — unified action surface for appointment lifecycle. |
| **Spec Gate 2 – CRM Timeline** | N/A — CRM writes triggered server-side by SCHED-025. |
| **Spec Gate 3 – Right Level** | Universal. |

---

### SCHED-020 · WaitlistPanel Component
| | |
|---|---|
| **Category** | FRONTEND |
| **Size** | XS |
| **Description** | Build React JSX component `WaitlistPanel`. Displays a list of SM Waitlist Entry records filtered by provider. Shows patient name, requested type, date range, and notified status. Provides a remove button per entry calling `DELETE /api/modules/scheduling/waitlist/{id}`. Uses `var(--sm-*)` tokens only. |
| **Dependencies** | SCHED-015 |
| **Spec Gate 1 – Workflow** | Waitlist — admin view and management of waitlisted patients. |
| **Spec Gate 2 – CRM Timeline** | N/A — display/management component, no clinical event. |
| **Spec Gate 3 – Right Level** | Universal. |

---

## Integration Workflows (n8n)

### SCHED-021 · Appointment Reminder Notifications Workflow
| | |
|---|---|
| **Category** | INTEGRATION |
| **Size** | S |
| **Description** | Build n8n workflow triggered by SM Appointment status change to Confirmed. Schedules two reminder notifications: 24 hours before and 1 hour before `start_datetime`. Each reminder sends via email and SMS. If appointment has a telehealth link, include it in the reminder body. Does NOT modify appointment state (per platform boundary). |
| **Dependencies** | SCHED-011 |
| **Spec Gate 1 – Workflow** | Appointment Confirmation — reminder notifications are queued upon confirmation. |
| **Spec Gate 2 – CRM Timeline** | N/A — reminder send events could be logged to CRM in a future story; this story handles delivery only. |
| **Spec Gate 3 – Right Level** | Universal. Reminders apply to any appointment-based business. |

---

### SCHED-022 · Telehealth Link Generation Workflow
| | |
|---|---|
| **Category** | INTEGRATION |
| **Size** | XS |
| **Description** | Build n8n workflow triggered by SM Appointment creation where the linked SM Appointment Type has `is_telehealth = true`. Calls video provider API to generate a unique meeting link. Writes the link back to the `telehealth_link` field on the SM Appointment record. n8n writes data to the record but does NOT change document status (per platform boundary — field update, not state transition). |
| **Dependencies** | SCHED-010 |
| **Spec Gate 1 – Workflow** | Telehealth Link Generation — auto-generates video link for telehealth appointment types. |
| **Spec Gate 2 – CRM Timeline** | N/A — link generation is an enrichment step, not a patient-facing event. |
| **Spec Gate 3 – Right Level** | Universal. Telehealth is not behavioral-health-specific. |

---

### SCHED-023 · Billing Trigger on Completion Workflow
| | |
|---|---|
| **Category** | INTEGRATION |
| **Size** | XS |
| **Description** | Build n8n workflow triggered by SM Appointment status change to Completed. Emits a billing event to the Healthcare Billing Mojo with appointment ID, provider, patient, appointment type, start/end times, and duration. Session completion is the billing trigger per platform vocabulary. Does NOT modify appointment state. |
| **Dependencies** | SCHED-012 |
| **Spec Gate 1 – Workflow** | Appointment Execution — completion triggers the billing workflow in Healthcare Billing Mojo. |
| **Spec Gate 2 – CRM Timeline** | N/A — billing event logging is the responsibility of the Billing Mojo, not Scheduling. |
| **Spec Gate 3 – Right Level** | Universal trigger, vertical-specific payload. The trigger mechanism is universal; billing payload may vary by vertical. |

---

### SCHED-024 · Waitlist Slot-Opening Notification Workflow
| | |
|---|---|
| **Category** | INTEGRATION |
| **Size** | S |
| **Description** | Build n8n workflow triggered by SM Appointment status change to Cancelled. Queries SM Waitlist Entry records matching the cancelled appointment's `provider_id`, `appointment_type`, and date within `requested_date_from`/`requested_date_to`. Sends email+SMS notification to matched waitlisted patients. Sets `notified = true` on matched SM Waitlist Entry records. Does NOT modify appointment state or create new appointments. |
| **Dependencies** | SCHED-013, SCHED-015 |
| **Spec Gate 1 – Workflow** | Waitlist — auto-notifies waitlisted patients when a matching slot opens via cancellation. |
| **Spec Gate 2 – CRM Timeline** | N/A — notification delivery, not a clinical or scheduling event. |
| **Spec Gate 3 – Right Level** | Universal. |

---

## Cross-Cutting

### SCHED-025 · CRM Timeline Writes for Appointment Events
| | |
|---|---|
| **Category** | GLUE |
| **Size** | S |
| **Description** | Implement Frappe server-side hooks on SM Appointment that write to the patient's CRM activity timeline on each status transition. Five events: (1) Created — log appointment type, provider, and scheduled time; (2) Confirmed — log confirmation; (3) Completed — log type and actual duration; (4) Cancelled — log cancellation reason; (5) No-Show — log no-show. All writes include appointment ID and timestamp. Hooks fire on `transition_state()` calls regardless of which endpoint triggered them. |
| **Dependencies** | SCHED-004 |
| **Spec Gate 1 – Workflow** | All appointment workflows — CRM timeline is a mandatory contract per platform guardrails. |
| **Spec Gate 2 – CRM Timeline** | Writes 5 distinct event types: created, confirmed, completed (with type+duration), cancelled (with reason), no-show. |
| **Spec Gate 3 – Right Level** | Universal. CRM timeline logging applies to all verticals. |

---

### SCHED-026 · FHIR R4 Appointment Sync to Medplum
| | |
|---|---|
| **Category** | INTEGRATION |
| **Size** | S |
| **Description** | Build n8n workflow triggered by SM Appointment create and status changes. Maps SM Appointment fields to FHIR R4 Appointment resource: `status` (mapped to FHIR status codes), `start`/`end`, `participant` (provider + patient as FHIR references), `appointmentType`, `description`. Syncs to Medplum via FHIR API, scoped to the client's Medplum Project. Updates existing FHIR resource on status changes; creates on first sync. Does NOT modify SM Appointment state. |
| **Dependencies** | SCHED-004 |
| **Spec Gate 1 – Workflow** | All appointment workflows — clinical data sync to FHIR-compliant store. |
| **Spec Gate 2 – CRM Timeline** | N/A — FHIR sync is a data replication concern, not a patient-facing event. |
| **Spec Gate 3 – Right Level** | Universal mechanism, vertical-specific FHIR mapping refinements may be needed. |

---

### SCHED-027 · Recurring Appointment Series Service
| | |
|---|---|
| **Category** | BACKEND |
| **Size** | S |
| **Description** | Implement a backend service module for recurring appointment series. Supports: (1) creating a series of SM Appointment records from recurrence parameters (frequency: weekly or biweekly, end date or count), linked via `series_id` with first appointment as `recurring_parent_id`; (2) cancelling a single instance vs. all future instances in a series; (3) each generated appointment is individually validated against provider availability. Exposes logic as importable service functions callable from the create and cancel MAL endpoints. Does NOT create new MAL endpoints. |
| **Dependencies** | SCHED-004, SCHED-010 |
| **Spec Gate 1 – Workflow** | Recurring Appointments — weekly or biweekly series with edit-one-or-all-future semantics. |
| **Spec Gate 2 – CRM Timeline** | N/A directly — each individual appointment created by the series triggers SCHED-025 hooks independently. |
| **Spec Gate 3 – Right Level** | Universal. Recurring appointments apply to any service-based business. |
```

---

# DEPENDENCY-GRAPH.md

```markdown
# Scheduling Mojo — Dependency Graph & Build Order

> **Generated:** 2026-04-09
> **Total Stories:** 27
> **Parallel Groups:** 4

---

## Visual Dependency Map

```
GROUP 0 ──────────────────────────────────────────────────────────────
  SCHED-001 (Appointment Type DocType)
  SCHED-002 (Provider Schedule DocType)
  SCHED-003 (Schedule Block DocType)
    │           │           │
    ▼           ▼           ▼
GROUP 1 ──────────────────────────────────────────────────────────────
  SCHED-004 (Appointment DocType) ◄── SCHED-001
  SCHED-005 (Waitlist Entry DocType) ◄── SCHED-001
  SCHED-006 (Provider list + schedule read) ◄── SCHED-002
  SCHED-007 (Provider schedule write) ◄── SCHED-002
  SCHED-008 (Block create/delete) ◄── SCHED-003
    │               │               │
    ▼               ▼               ▼
GROUP 2 ──────────────────────────────────────────────────────────────
  SCHED-009 (Slot availability) ◄── 001, 002, 003, 004
  SCHED-010 (Appointment create/read) ◄── 004, 001
  SCHED-011 (Confirm endpoint) ◄── 004
  SCHED-012 (Start + Complete endpoints) ◄── 004
  SCHED-013 (Cancel endpoint) ◄── 004
  SCHED-014 (No-show endpoint) ◄── 004
  SCHED-015 (Waitlist endpoints) ◄── 005
  SCHED-016 (ProviderScheduleEditor UI) ◄── 006, 007, 008
  SCHED-025 (CRM timeline hooks) ◄── 004
  SCHED-026 (FHIR sync n8n) ◄── 004
    │                       │
    ▼                       ▼
GROUP 3 ──────────────────────────────────────────────────────────────
  SCHED-017 (AvailabilityCalendar UI) ◄── 009
  SCHED-018 (AppointmentBookingForm UI) ◄── 009, 010
  SCHED-019 (AppointmentCard UI) ◄── 010
  SCHED-020 (WaitlistPanel UI) ◄── 015
  SCHED-021 (Reminder notifications n8n) ◄── 011
  SCHED-022 (Telehealth link gen n8n) ◄── 010
  SCHED-023 (Billing trigger n8n) ◄── 012
  SCHED-024 (Waitlist notification n8n) ◄── 013, 015
  SCHED-027 (Recurring series service) ◄── 004, 010
```

---

## Parallel Execution Groups

### Group 0 — Foundation DocTypes
> **Prerequisite:** None
> **Parallelism:** 3 stories, fully parallel

| Story | Title | Size |
|-------|-------|------|
| SCHED-001 | SM Appointment Type DocType | XS |
| SCHED-002 | SM Provider Schedule DocType | XS |
| SCHED-003 | SM Schedule Block DocType | XS |

---

### Group 1 — Dependent DocTypes + Basic Provider Endpoints
> **Prerequisite:** Group 0 complete
> **Parallelism:** 5 stories, fully parallel

| Story | Title | Size | Waits For |
|-------|-------|------|-----------|
| SCHED-004 | SM Appointment DocType with status lifecycle | S | SCHED-001 |
| SCHED-005 | SM Waitlist Entry DocType | XS | SCHED-001 |
| SCHED-006 | Provider listing and schedule read endpoints | XS | SCHED-002 |
| SCHED-007 | Provider schedule write endpoint | XS | SCHED-002 |
| SCHED-008 | Schedule block create and delete endpoints | XS | SCHED-003 |

---

### Group 2 — Core Endpoints + Schedule UI + Cross-Cutting
> **Prerequisite:** Group 1 complete
> **Parallelism:** 10 stories, fully parallel

| Story | Title | Size | Waits For |
|-------|-------|------|-----------|
| SCHED-009 | Slot availability query endpoint | S | 001, 002, 003, 004 |
| SCHED-010 | Appointment create and read endpoints | S | 004, 001 |
| SCHED-011 | Appointment confirm endpoint | XS | 004 |
| SCHED-012 | Appointment start and complete endpoints | XS | 004 |
| SCHED-013 | Appointment cancel endpoint | XS | 004 |
| SCHED-014 | Appointment no-show endpoint | XS | 004 |
| SCHED-015 | Waitlist join and remove endpoints | XS | 005 |
| SCHED-016 | ProviderScheduleEditor component | S | 006, 007, 008 |
| SCHED-025 | CRM timeline writes for appointment events | S | 004 |
| SCHED-026 | FHIR R4 Appointment sync to Medplum | S | 004 |

---

### Group 3 — Frontend Components + Integrations + Recurring
> **Prerequisite:** Group 2 complete (specific dependencies vary)
> **Parallelism:** 9 stories, fully parallel

| Story | Title | Size | Waits For |
|-------|-------|------|-----------|
| SCHED-017 | AvailabilityCalendar component | S | 009 |
| SCHED-018 | AppointmentBookingForm component | S | 009, 010 |
| SCHED-019 | AppointmentCard component | S | 010 |
| SCHED-020 | WaitlistPanel component | XS | 015 |
| SCHED-021 | Appointment reminder notifications workflow | S | 011 |
| SCHED-022 | Telehealth link generation workflow | XS | 010 |
| SCHED-023 | Billing trigger on completion workflow | XS | 012 |
| SCHED-024 | Waitlist slot-opening notification workflow | S | 013, 015 |
| SCHED-027 | Recurring appointment series service | S | 004, 010 |

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| Total stories | 27 |
| BACKEND | 15 |
| FRONTEND | 5 |
| INTEGRATION | 5 |
| GLUE | 1 |
| AI | 0 |
| CONFIG | 0 |
| Size XS | 14 |
| Size S | 13 |
| Max parallelism | 10 (Group 2) |
| Critical path length | 4 groups |
| Critical path | SCHED-001 → SCHED-004 → SCHED-010 → SCHED-018 |
```

---

## Notes on Decomposition Decisions

<details>
<summary><strong>Why CRM timeline is a single GLUE story (SCHED-025) and not per-endpoint</strong></summary>

CRM timeline writes are implemented as Frappe server-side hooks on `transition_state()`, not as logic inside each MAL endpoint. This means:
- One story, one file, one concern
- Hooks fire regardless of *which* endpoint triggered the state change
- Independently testable: create an SM Appointment, change its status directly, assert CRM timeline entries exist
- Avoids scattering CRM logic across 5+ endpoint stories

</details>

<details>
<summary><strong>Why SCHED-022 (Telehealth link generation) writes to a field but isn't a state violation</strong></summary>

Per the platform guardrail: "n8n NEVER modifies document state." The `telehealth_link` field is a data field, not a status/state field. Writing a URL to an appointment record is a data enrichment, not a state transition. This is consistent with the boundary: Frappe owns state machines, n8n owns cross-system data flows.

</details>

<details>
<summary><strong>Why the AppointmentCard component (SCHED-019) only depends on SCHED-010</strong></summary>

The card's action buttons call state transition endpoints (confirm, start, complete, cancel, no-show), but these follow a uniform pattern (`PUT /appointment/{id}/{action}`). The implementing agent can build all buttons from the API contract in this story's spec. The component is independently testable with mocked API responses. Adding dependencies on all 5 state transition stories would create an unnecessary bottleneck.

</details>