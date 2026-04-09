model: model-gamma
test: 01-story-decomposition
run: B
date: 2026-04-09

# STORIES.md

```markdown
# Scheduling Mojo — Atomic Stories

## SCHED-001 | SM Appointment Type DocType
- **ID:** SCHED-001
- **Title:** SM Appointment Type DocType
- **Category:** BACKEND
- **Size:** XS
- **Description:** Define the `SM Appointment Type` DocType (name, duration_minutes, is_telehealth, buffer_minutes_after, default_location_type) as a configurable type registry for the scheduling system.
- **Dependencies:** None
- **Spec Gates:**
  - **Workflow:** Defines appointment types that gate availability calculations, slot validation, and booking rules in the Appointment Booking and Provider Setup workflows.
  - **CRM Timeline:** N/A — configuration entity, not a customer-facing event.
  - **Right Level:** Universal — appointment types are a scheduling concept applicable to any business; behavioral health provides the first set of types via configuration.

## SCHED-002 | SM Provider Schedule DocType
- **ID:** SCHED-002
- **Title:** SM Provider Schedule DocType
- **Category:** BACKEND
- **Size:** XS
- **Description:** Define the `SM Provider Schedule` DocType (provider_id, day_of_week, start_time, end_time, appointment_types_allowed) for weekly template storage.
- **Dependencies:** None
- **Spec Gates:**
  - **Workflow:** Provider Setup — foundational data structure for weekly provider availability templates.
  - **CRM Timeline:** N/A — provider configuration record, no customer interaction.
  - **Right Level:** Universal — schedule templates are a scheduling concept; provider identity is resolved through platform user model.

## SCHED-003 | SM Schedule Block DocType
- **ID:** SCHED-003
- **Title:** SM Schedule Block DocType
- **Category:** BACKEND
- **Size:** XS
- **Description:** Define the `SM Schedule Block` DocType (provider_id, date, start_time, end_time, reason) for individual time overrides (vacation, lunch, admin).
- **Dependencies:** None
- **Spec Gates:**
  - **Workflow:** Provider Setup — individual date overrides to the weekly template.
  - **CRM Timeline:** N/A — provider configuration record.
  - **Right Level:** Universal.

## SCHED-004 | SM Appointment DocType with State Machine
- **ID:** SCHED-004
- **Title:** SM Appointment DocType with State Machine
- **Category:** BACKEND
- **Size:** S
- **Description:** Define the `SM Appointment` DocType (provider_id, patient_id, appointment_type, start_datetime, end_datetime, status, location_type, telehealth_link, notes, cancellation_reason, series_id, recurring_parent_id) with Frappe Workflow state machine covering the full lifecycle.
- **Dependencies:** SCHED-001, SCHED-002
- **Spec Gates:**
  - **Workflow:** Full Appointment Lifecycle — defines the complete state machine: `Requested → Confirmed → In Progress → Completed` and terminal transitions to `Cancelled` and `No-Show`.
  - **CRM Timeline:** N/A — DocType definition only; CRM timeline writes are handled in the API endpoint stories that trigger state transitions.
  - **Right Level:** Universal.

## SCHED-005 | SM Waitlist Entry DocType
- **ID:** SCHED-005
- **Title:** SM Waitlist Entry DocType
- **Category:** BACKEND
- **Size:** XS
- **Description:** Define the `SM Waitlist Entry` DocType (patient_id, provider_id, appointment_type, requested_date_from, requested_date_to, notified) for managing waitlist queues.
- **Dependencies:** None
- **Spec Gates:**
  - **Workflow:** Waitlist — enables patient enrollment and auto-notification when matching slots open.
  - **CRM Timeline:** N/A — waitlist entries are queue management records, not CRM timeline events per research requirements.
  - **Right Level:** Universal.

## SCHED-006 | Provider Schedule Template Management API
- **ID:** SCHED-006
- **Title:** Provider Schedule Template Management API
- **Category:** BACKEND
- **Size:** S
- **Description:** Implement `POST /api/modules/scheduling/provider/{id}/schedule` and `GET /api/modules/scheduling/provider/{id}/schedule` for creating, reading, and updating provider weekly templates. This story also establishes the `/api/modules/scheduling/` route namespace in the MAL.
- **Dependencies:** SCHED-002, SCHED-003
- **Spec Gates:**
  - **Workflow:** Provider Setup — enables admin to configure and retrieve weekly provider schedule templates.
  - **CRM Timeline:** N/A — administrative configuration, not customer-facing.
  - **Right Level:** Universal.

## SCHED-007 | Schedule Block Management API
- **ID:** SCHED-007
- **Title:** Schedule Block Management API
- **Category:** BACKEND
- **Size:** S
- **Description:** Implement `POST /api/modules/scheduling/provider/{id}/block` and `DELETE /api/modules/scheduling/provider/{id}/block/{block_id}` for adding and removing individual blocked time slots. Emits a webhook to n8n for waitlist re-evaluation on block deletion.
- **Dependencies:** SCHED-002, SCHED-003
- **Spec Gates:**
  - **Workflow:** Provider Setup — allows admins to block off (and unblock) individual dates for vacation, lunch, or admin time.
  - **CRM Timeline:** N/A — administrative state change; block events do not write to customer CRM timeline.
  - **Right Level:** Universal.

## SCHED-008 | Slot Availability Query API
- **ID:** SCHED-008
- **Title:** Slot Availability Query API
- **Category:** BACKEND
- **Size:** S
- **Description:** Implement `GET /api/modules/scheduling/slots` with query parameters (provider_id, date_from, date_to, appointment_type) that computes available slots by intersecting weekly templates, schedule blocks, and existing bookings.
- **Dependencies:** SCHED-002, SCHED-003, SCHED-004
- **Spec Gates:**
  - **Workflow:** Appointment Booking — the slot search engine that drives the booking flow.
  - **CRM Timeline:** N/A — read-only query; no state mutation.
  - **Right Level:** Universal.

## SCHED-009 | Single Appointment Creation API
- **ID:** SCHED-009
- **Title:** Single Appointment Creation API
- **Category:** BACKEND
- **Size:** S
- **Description:** Implement `POST /api/modules/scheduling/appointment/create` to validate slot availability, create an `SM Appointment` in `Requested` state, trigger n8n workflows via webhook, and write the creation event to the CRM timeline.
- **Dependencies:** SCHED-001, SCHED-004
- **Spec Gates:**
  - **Workflow:** Appointment Booking — initiates the appointment lifecycle by creating a new request.
  - **CRM Timeline:** Writes "Appointment created" event (includes provider, patient, type, and scheduled datetime).
  - **Right Level:** Universal.

## SCHED-010 | Appointment Confirmation API
- **ID:** SCHED-010
- **Title:** Appointment Confirmation API
- **Category:** BACKEND
- **Size:** S
- **Description:** Implement `PUT /api/modules/scheduling/appointment/{id}/confirm` to transition the appointment from `Requested` to `Confirmed`, emit n8n webhook for reminder scheduling, and write confirmation to CRM.
- **Dependencies:** SCHED-004
- **Spec Gates:**
  - **Workflow:** Appointment Confirmation — moves an appointment to the confirmed stage and queues reminder notifications.
  - **CRM Timeline:** Writes "Appointment confirmed" event.
  - **Right Level:** Universal.

## SCHED-011 | Appointment Start and Complete API
- **ID:** SCHED-011
- **Title:** Appointment Start and Complete API
- **Category:** BACKEND
- **Size:** S
- **Description:** Implement `PUT /api/modules/scheduling/appointment/{id}/start` (Requested→In Progress internal transition) and `PUT /api/modules/scheduling/appointment/{id}/complete` (In Progress→Completed with n8n billing trigger and CRM write).
- **Dependencies:** SCHED-004
- **Spec Gates:**
  - **Workflow:** Appointment Execution — marks session start and completion; completion triggers billing and terminates the appointment.
  - **CRM Timeline:** Start transition is N/A (internal state change); Complete endpoint writes "Appointment completed" event including appointment type and duration.
  - **Right Level:** Universal.

## SCHED-012 | Appointment Cancellation and No-Show API
- **ID:** SCHED-012
- **Title:** Appointment Cancellation and No-Show API
- **Category:** BACKEND
- **Size:** S
- **Description:** Implement `PUT /api/modules/scheduling/appointment/{id}/cancel` (transition to Cancelled with reason code) and `PUT /api/modules/scheduling/appointment/{id}/no-show` (transition to No-Show), both writing to CRM and emitting n8n webhooks for waitlist re-evaluation.
- **Dependencies:** SCHED-004
- **Spec Gates:**
  - **Workflow:** Cancellation and No-Show — terminates appointments with distinct state transitions and reason codes.
  - **CRM Timeline:** Cancel endpoint writes "Appointment cancelled" event (includes reason code); No-Show endpoint writes "No-show" event.
  - **Right Level:** Universal.

## SCHED-013 | Appointment Read API
- **ID:** SCHED-013
- **Title:** Appointment Read API
- **Category:** BACKEND
- **Size:** XS
- **Description:** Implement `GET /api/modules/scheduling/appointment/{id}` to return full appointment details including status, linked series info, and telehealth link if present.
- **Dependencies:** SCHED-004
- **Spec Gates:**
  - **Workflow:** All appointment workflows — provides the single source of truth for appointment display and decision-making across all UI components.
  - **CRM Timeline:** N/A — read-only endpoint, no state mutation.
  - **Right Level:** Universal.

## SCHED-014 | Provider List with Availability API
- **ID:** SCHED-014
- **Title:** Provider List with Availability API
- **Category:** BACKEND
- **Size:** S
- **Description:** Implement `GET /api/modules/scheduling/providers` to return a list of active providers enriched with next-available-slot metadata and accepted appointment types.
- **Dependencies:** SCHED-002, SCHED-004
- **Spec Gates:**
  - **Workflow:** Appointment Booking — surfaces provider options at the top of the booking funnel.
  - **CRM Timeline:** N/A — read-only provider listing.
  - **Right Level:** Universal.

## SCHED-015 | Waitlist Management API
- **ID:** SCHED-015
- **Title:** Waitlist Management API
- **Category:** BACKEND
- **Size:** S
- **Description:** Implement `POST /api/modules/scheduling/waitlist/join` and `DELETE /api/modules/scheduling/waitlist/{id}` for enrolling and removing patients from waitlist queues by provider+type combination.
- **Dependencies:** SCHED-001, SCHED-004, SCHED-005
- **Spec Gates:**
  - **Workflow:** Waitlist — manages patient queue when no slots are available; entries are consumed by the slot-opening notification workflow.
  - **CRM Timeline:** N/A — waitlist joins/removals are queue management operations, not listed as CRM timeline events.
  - **Right Level:** Universal.

## SCHED-016 | Recurring Appointment Series Logic
- **ID:** SCHED-016
- **Title:** Recurring Appointment Series Logic
- **Category:** BACKEND
- **Size:** S
- **Description:** Implement the series creation service called by SCHED-009 for weekly/biweekly recurring schedules: generates linked `SM Appointment` records with shared `series_id`, supports "edit one instance" (breaks link) vs "edit all future" (bulk updates), and handles rescheduling by creating a replacement appointment with preserved series linkage.
- **Dependencies:** SCHED-004
- **Spec Gates:**
  - **Workflow:** Recurring Appointments — manages linked appointment series for ongoing treatment plans; handles edit-one vs edit-all-future and rescheduling flows.
  - **CRM Timeline:** N/A — individual appointment creation, cancellation, and completion events are already written by their respective endpoint stories; this story manages series linkage only.
  - **Right Level:** Universal.

## SCHED-017 | ProviderScheduleEditor Component
- **ID:** SCHED-017
- **Title:** ProviderScheduleEditor Component
- **Category:** FRONTEND
- **Size:** XS
- **Description:** React JSX component for managing provider weekly schedule templates and ad-hoc schedule blocks via the SCHED-006 and SCHED-007 APIs; includes weekly template grid UI and block-off date picker.
- **Dependencies:** SCHED-006, SCHED-007
- **Spec Gates:**
  - **Workflow:** Provider Setup — the UI surface for admin to configure provider availability.
  - **CRM Timeline:** N/A — frontend component; CRM writes handled by backend API stories.
  - **Right Level:** Universal.

## SCHED-018 | AvailabilityCalendar Component
- **ID:** SCHED-018
- **Title:** AvailabilityCalendar Component
- **Category:** FRONTEND
- **Size:** XS
- **Description:** React JSX component rendering a weekly availability calendar view with selectable slots, calling the SCHED-008 API and supporting multi-provider comparison.
- **Dependencies:** SCHED-008
- **Spec Gates:**
  - **Workflow:** Appointment Booking — visual slot selection interface for receptionists and patients.
  - **CRM Timeline:** N/A — frontend component.
  - **Right Level:** Universal.

## SCHED-019 | AppointmentBookingForm Component
- **ID:** SCHED-019
- **Title:** AppointmentBookingForm Component
- **Category:** FRONTEND
- **Size:** S
- **Description:** Multi-step React JSX component with slot picker, patient selector, appointment type selector, and confirmation review step; submits to SCHED-009 and handles recurring appointment parameters.
- **Dependencies:** SCHED-008, SCHED-009, SCHED-016
- **Spec Gates:**
  - **Workflow:** Appointment Booking — captures all booking inputs and submits the appointment request.
  - **CRM Timeline:** N/A — frontend component; "Appointment created" written by SCHED-009.
  - **Right Level:** Universal.

## SCHED-020 | AppointmentCard Component
- **ID:** SCHED-020
- **Title:** AppointmentCard Component
- **Category:** FRONTEND
- **Size:** S
- **Description:** React JSX component displaying a single appointment's details with status-aware action buttons (Confirm, Start, Complete, Cancel, No-Show) that call the appropriate SCHED-010, SCHED-011, and SCHED-012 APIs.
- **Dependencies:** SCHED-013, SCHED-010, SCHED-011, SCHED-012
- **Spec Gates:**
  - **Workflow:** All appointment workflows — the primary appointment display and action component used across scheduling views.
  - **CRM Timeline:** N/A — frontend component; CRM writes handled by backend API stories.
  - **Right Level:** Universal.

## SCHED-021 | WaitlistPanel Component
- **ID:** SCHED-021
- **Title:** WaitlistPanel Component
- **Category:** FRONTEND
- **Size:** XS
- **Description:** React JSX component for viewing, filtering, and managing waitlist entries via the SCHED-015 API, with indicators for notified vs pending entries.
- **Dependencies:** SCHED-015
- **Spec Gates:**
  - **Workflow:** Waitlist — UI for staff to monitor and administer waitlist queues.
  - **CRM Timeline:** N/A — frontend component.
  - **Right Level:** Universal.

## SCHED-022 | Appointment Reminder Notification Workflow
- **ID:** SCHED-022
- **Title:** Appointment Reminder Notification Workflow
- **Category:** INTEGRATION
- **Size:** S
- **Description:** n8n workflow triggered on appointment confirmation (`SCHED-010` webhook) that schedules and delivers email + SMS reminders 24h and 1h before the appointment, including the telehealth link for telehealth appointments.
- **Dependencies:** SCHED-010, SCHED-026
- **Spec Gates:**
  - **Workflow:** Appointment Confirmation — ensures patients and providers are notified ahead of scheduled sessions.
  - **CRM Timeline:** N/A — reminder delivery is not listed as a CRM timeline event; the confirmation event is already written by SCHED-010.
  - **Right Level:** Universal — reminder scheduling is a delivery mechanism, not vertical-specific logic.

## SCHED-023 | Telehealth Link Generation Workflow
- **ID:** SCHED-023
- **Title:** Telehealth Link Generation Workflow
- **Category:** INTEGRATION
- **Size:** S
- **Description:** n8n workflow triggered on appointment creation (`SCHED-009` webhook) for appointments where `is_telehealth = true`; calls the video provider API, then writes the generated link back via the internal MAL endpoint (SCHED-026).
- **Dependencies:** SCHED-009, SCHED-026
- **Spec Gates:**
  - **Workflow:** Appointment Booking — produces the video session link and attaches it to the appointment so it surfaces in confirmations and reminders.
  - **CRM Timeline:** N/A — link generation is an internal system action; the appointment creation event is already logged by SCHED-009.
  - **Right Level:** Universal.

## SCHED-024 | Billing Trigger on Completion Workflow
- **ID:** SCHED-024
- **Title:** Billing Trigger on Completion Workflow
- **Category:** INTEGRATION
- **Size:** S
- **Description:** n8n workflow triggered on appointment completion (`SCHED-011` webhook) that initiates the billing workflow in Healthcare Billing Mojo, passing provider, patient, appointment type, duration, and completed datetime.
- **Dependencies:** SCHED-011
- **Spec Gates:**
  - **Workflow:** Appointment Execution — session completion is the billing trigger; this workflow bridges scheduling to the billing system.
  - **CRM Timeline:** N/A — completion event is already written by SCHED-011; billing trigger is an internal handoff.
  - **Right Level:** Universal — the trigger mechanism is platform-level; the downstream billing workflow lives in Healthcare Billing Mojo.

## SCHED-025 | Waitlist Slot-Opening Notification Workflow
- **ID:** SCHED-025
- **Title:** Waitlist Slot-Opening Notification Workflow
- **Category:** INTEGRATION
- **Size:** S
- **Description:** n8n workflow triggered on schedule block deletion (`SCHED-007` webhook) or appointment cancellation (`SCHED-012` webhook) that queries newly opened slots, matches them against waitlist entries (`SM Waitlist Entry`), and sends notifications to eligible patients.
- **Dependencies:** SCHED-004, SCHED-005, SCHED-007, SCHED-012
- **Spec Gates:**
  - **Workflow:** Waitlist — auto-notifies patients when a slot matching their provider+type criteria becomes available.
  - **CRM Timeline:** N/A — notification delivery is not listed as a CRM timeline event per research requirements.
  - **Right Level:** Universal.

## SCHED-026 | Telehealth Link Attachment API (Internal)
- **ID:** SCHED-026
- **Title:** Telehealth Link Attachment API
- **Category:** BACKEND
- **Size:** XS
- **Description:** Internal MAL endpoint (not UI-facing) that receives a generated telehealth link from the n8n SCHED-023 workflow and updates the `telehealth_link` field on the `SM Appointment` DocType. This endpoint exists because n8n never modifies document state per platform guardrails.
- **Dependencies:** SCHED-004
- **Spec Gates:**
  - **Workflow:** Appointment Booking — bridges the n8n link generation workflow back to the appointment record.
  - **CRM Timeline:** N/A — internal field update; no customer-facing event.
  - **Right Level:** Universal.

## SCHED-027 | FHIR Appointment Sync Workflow
- **ID:** SCHED-027
- **Title:** FHIR Appointment Sync Workflow
- **Category:** INTEGRATION
- **Size:** S
- **Description:** n8n workflow triggered on any `SM Appointment` state change that maps the appointment to a FHIR R4 `Appointment` resource and creates/updates it in Medplum via the Medplum API. Handles create, update (state changes), and deletes (cancellations).
- **Dependencies:** SCHED-004
- **Spec Gates:**
  - **Workflow:** Full Appointment Lifecycle — maintains clinical data parity between Spark Mojo scheduling and the Medplum EHR layer.
  - **CRM Timeline:** N/A — FHIR sync is a cross-system action; all customer-facing appointment events are logged via the backend API stories.
  - **Right Level:** Universal — FHIR is a universal clinical data standard; Medplum is the platform's locked clinical data layer.

## SCHED-028 | Scheduling Mojo Configuration Registration
- **ID:** SCHED-028
- **Title:** Scheduling Mojo Configuration Registration
- **Category:** CONFIG
- **Size:** XS
- **Description:** Register all Scheduling Mojo configurable options (appointment types, default durations, telehealth providers, reminder timing, waitlist behavior) in the Configuration Mojo so Spark Mojo staff can configure the module per vertical, client, and role during onboarding.
- **Dependencies:** SCHED-001
- **Spec Gates:**
  - **Workflow:** Cross-cutting — enables the Scheduling Mojo to adapt to any vertical through Configuration Mojo rather than code changes.
  - **CRM Timeline:** N/A — platform-level registration, no customer interaction.
  - **Right Level:** Universal — configuration registration is a platform-level concern; per guardrails, clients do not self-configure except for user management.
```

---

# DEPENDENCY-GRAPH.md

```markdown
# Scheduling Mojo — Dependency Graph & Build Order

## Build Strategy

The Scheduling Mojo decomposes into **28 atomic stories** across four categories.
Build proceeds in parallelizable groups. Within each group, all stories can be
developed concurrently. A group cannot begin until all its dependencies (prior groups)
are merged.

---

## Parallel Group 1 — Foundation (No Dependencies)

_All stories in this group can start immediately._

| Story | Title | Category | Produces |
|-------|-------|----------|----------|
| SCHED-001 | SM Appointment Type DocType | BACKEND | `SM Appointment Type` |
| SCHED-002 | SM Provider Schedule DocType | BACKEND | `SM Provider Schedule` |
| SCHED-003 | SM Schedule Block DocType | BACKEND | `SM Schedule Block` |
| SCHED-004 | SM Appointment DocType with State Machine | BACKEND | `SM Appointment` + workflow states |
| SCHED-005 | SM Waitlist Entry DocType | BACKEND | `SM Waitlist Entry` |
| SCHED-028 | Configuration Registration | CONFIG | Config entries for Scheduling Mojo |

> **Note:** SCHED-004 establishes the Frappe Workflow state machine for the appointment lifecycle.
> SCHED-028 should build after SCHED-001 so appointment types can be registered as configurable.

---

## Parallel Group 2 — Backend APIs

_Depends on Group 1. All stories can build in parallel once DocTypes exist._

| Story | Title | Depends On | Notes |
|-------|-------|-----------|-------|
| SCHED-006 | Provider Schedule Template Management API | SCHED-002, SCHED-003 | **Also creates the `/api/modules/scheduling/` MAL route namespace** |
| SCHED-007 | Schedule Block Management API | SCHED-002, SCHED-003 | Emits n8n webhook on block delete |
| SCHED-008 | Slot Availability Query API | SCHED-002, SCHED-003, SCHED-004 | Most complex availability algorithm |
| SCHED-009 | Single Appointment Creation API | SCHED-001, SCHED-004 | CRM write; emits creation webhook |
| SCHED-010 | Appointment Confirmation API | SCHED-004 | CRM write; emits reminder webhook |
| SCHED-011 | Appointment Start and Complete API | SCHED-004 | CRM write on complete; emits billing webhook |
| SCHED-012 | Appointment Cancellation and No-Show API | SCHED-004 | CRM writes; emits waitlist-recheck webhooks |
| SCHED-013 | Appointment Read API | SCHED-004 | Simple single-record fetch |
| SCHED-014 | Provider List with Availability API | SCHED-002, SCHED-004 | Provider listing + next-available metadata |
| SCHED-015 | Waitlist Management API | SCHED-001, SCHED-004, SCHED-005 | Join/remove queue entries |
| SCHED-016 | Recurring Appointment Series Logic | SCHED-004 | Series generation, edit-one vs edit-all-future |
| SCHED-026 | Telehealth Link Attachment API (Internal) | SCHED-004 | Internal endpoint called by n8n |

> **Critical path:** SCHED-006 must be built first *within this group* if other stories share
> the MAL routing module. In practice, the first developer to touch `/api/modules/scheduling/__init__.py`
> should create the router namespace.

---

## Parallel Group 3 — Frontend Components

_Depends on Group 2. All frontend stories can build in parallel once their API contracts are defined._

| Story | Title | Depends On | Calls APIs From |
|-------|-------|-----------|-----------------|
| SCHED-017 | ProviderScheduleEditor | SCHED-006, SCHED-007 | Schedule + Block management |
| SCHED-018 | AvailabilityCalendar | SCHED-008 | Slot availability query |
| SCHED-019 | AppointmentBookingForm | SCHED-008, SCHED-009, SCHED-016 | Slots, create, recurring |
| SCHED-020 | AppointmentCard | SCHED-010, SCHED-011, SCHED-012, SCHED-013 | Read + all state transitions |
| SCHED-021 | WaitlistPanel | SCHED-015 | Waitlist management |

> **Note:** No frontend story calls Frappe directly (platform guardrail). All API contracts
> should be documented as OpenAPI specs before frontend work begins, enabling frontend
> Group 3 to work against mock data while Group 2 finalizes implementations.

---

## Parallel Group 4 — Integration (n8n Workflows)

_Depends on Group 2. All integration stories can build in parallel once the webhook-emitting
API stories exist._

| Story | Title | Depends On | Triggered By |
|-------|-------|-----------|-------------|
| SCHED-022 | Reminder Notification Workflow | SCHED-010, SCHED-026 | Appointment confirmed |
| SCHED-023 | Telehealth Link Generation Workflow | SCHED-009, SCHED-026 | Telehealth appointment created |
| SCHED-024 | Billing Trigger on Completion Workflow | SCHED-011 | Appointment completed |
| SCHED-025 | Waitlist Slot-Opening Notification Workflow | SCHED-004, SCHED-005, SCHED-007, SCHED-012 | Block deleted or appointment cancelled |
| SCHED-027 | FHIR Appointment Sync Workflow | SCHED-004 | Any appointment state change |

> **Guardrail reminder:** n8n NEVER modifies document state (locked rule #7). n8n workflows
> that need to update the appointment record (SCHED-023) must call the internal MAL
> endpoint SCHED-026.

---

## Sequential Dependencies Summary

```
Group 1 (Foundation)
    ├── SCHED-001 ─────────────────┬
    ├── SCHED-002 ─────────────────┼
    ├── SCHED-003 ─────────────────┼
    ├── SCHED-004 ─────────────────┼──────── Group 2 (Backend APIs)
    ├── SCHED-005 ─────────────────┼              ├── SCHED-006 ───────┬
    └── SCHED-028 ─────────────────┘              ├── SCHED-007 ───────┤
                                                 ├── SCHED-008 ───────┼
                                                 ├── SCHED-009 ───────┼
                                                 ├── SCHED-010 ───────┼
                                                 ├── SCHED-011 ───────┼
                                                 ├── SCHED-012 ───────┼─── Group 3 (Frontend)
                                                 ├── SCHED-013 ───────┼      SCHED-017 ← 006,007
                                                 ├── SCHED-014 ───────┤      SCHED-018 ← 008
                                                 ├── SCHED-015 ───────┤      SCHED-019 ← 008,009,016
                                                 ├── SCHED-016 ───────┤      SCHED-020 ← 010,011,012
                                                 └── SCHED-026 ───────┘      SCHED-021 ← 015
                                                            │
                                                            └─── Group 4 (Integration)
                                                                   SCHED-022 ← 010,026
                                                                   SCHED-023 ← 009,026
                                                                   SCHED-024 ← 011
                                                                   SCHED-025 ← 004,005,007,012
                                                                   SCHED-027 ← 004
```

## Parallelization Opportunities

| Phase | Concurrent Stories | Max Parallelism |
|-------|-------------------|-----------------|
| Phase 1 | 6 stories (Group 1) | 6 agents |
| Phase 2 | 12 stories (Group 2) | 12 agents |
| Phase 3 + 4 | 10 stories (Groups 3 & 4) | 10 agents |
| **Total** | **28 stories** | **12 agents at peak** |

Groups 3 and 4 can run simultaneously since they have no cross-dependencies.
The critical path runs through **Group 1 → SCHED-009 → SCHED-023 → SCHED-026 → SCHED-022**,
which represents the end-to-end appointment creation through telehealth link attachment
to reminder scheduling flow.
```