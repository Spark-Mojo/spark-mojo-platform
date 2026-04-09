model: model-epsilon
test: 01-story-decomposition
run: B
date: 2026-04-09

# Scheduling Mojo Story Decomposition

I'll decompose the Scheduling Mojo capability into atomic, independently testable stories following the Spark Mojo factory rules.

## Methodology Applied

1. **Split at boundaries**: DocTypes, endpoints, components, and n8n workflows are separated
2. **Size discipline**: XS (1 file/endpoint) and S (small component or small DocType) only
3. **Spec Gates enforced**: Every story answers Workflow, CRM Timeline, and Right Level
4. **Platform Guardrails applied**: React→MAL only, n8n for cross-system, SM prefixes, no TypeScript

---

## STORIES.md

```markdown
# Spark Mojo — Scheduling Mojo Stories
# Generated: 2026-04-09 | Capability: Scheduling Mojo | Vertical: Behavioral Health

---

## DocType Stories (Data Layer)

### SCHED-001: SM Appointment Type DocType
- **Category**: BACKEND
- **Size**: S
- **Description**: Create the `SM Appointment Type` DocType with fields for name, duration_minutes, is_telehealth, buffer_minutes_after, and default_location_type.
- **Dependencies**: None
- **Spec Gates**:
  - Workflow: N/A — configuration entity, not workflow-driven
  - CRM Timeline: N/A — configuration entity, no customer interaction
  - Right Level: Universal — appointment types apply across all verticals and clients

---

### SCHED-002: SM Provider Schedule DocType
- **Category**: BACKEND
- **Size**: S
- **Description**: Create the `SM Provider Schedule` DocType with fields for provider_id, day_of_week, start_time, end_time, and appointment_types_allowed (JSON).
- **Dependencies**: None
- **Spec Gates**:
  - Workflow: N/A — configuration entity, defines provider availability template
  - CRM Timeline: N/A — configuration entity, no customer interaction
  - Right Level: Universal — provider schedules apply across all verticals

---

### SCHED-003: SM Schedule Block DocType
- **Category**: BACKEND
- **Size**: S
- **Description**: Create the `SM Schedule Block` DocType with fields for provider_id, date, start_time, end_time, and reason (vacation, lunch, admin, etc.).
- **Dependencies**: SCHED-002
- **Spec Gates**:
  - Workflow: N/A — configuration entity, blocks individual time slots
  - CRM Timeline: N/A — configuration entity, no customer interaction
  - Right Level: Universal — schedule blocks apply across all verticals

---

### SCHED-004: SM Waitlist Entry DocType
- **Category**: BACKEND
- **Size**: S
- **Description**: Create the `SM Waitlist Entry` DocType with fields for patient_id, provider_id, appointment_type, requested_date_from, requested_date_to, and notified (boolean).
- **Dependencies**: None
- **Spec Gates**:
  - Workflow: Waitlist management — patients join waitlist when no slots available, removed when matched or expired
  - CRM Timeline: Waitlist joined — write entry to patient CRM timeline when patient joins waitlist
  - Right Level: Universal — waitlist applies across all verticals

---

### SCHED-005: SM Appointment DocType
- **Category**: BACKEND
- **Size**: S
- **Description**: Create the `SM Appointment` DocType with all appointment fields: provider_id, patient_id, appointment_type, start_datetime, end_datetime, status, location_type, telehealth_link, notes, cancellation_reason, series_id, recurring_parent_id. Include Frappe Workflow for status transitions (Requested→Confirmed→In Progress→Completed, plus terminal states Cancelled and No-Show).
- **Dependencies**: SCHED-001, SCHED-004
- **Spec Gates**:
  - Workflow: Appointment lifecycle management — tracks appointments from creation through completion or cancellation
  - CRM Timeline: Multiple — appointment created, confirmed, completed (with type/duration), cancelled (with reason), no-show
  - Right Level: Universal — appointments apply across all verticals and clients

---

## Backend API Stories (Abstraction Layer)

### SCHED-010: GET Available Slots Endpoint
- **Category**: BACKEND
- **Size**: S
- **Description**: Create MAL endpoint `GET /api/modules/scheduling/slots` that queries available appointment slots by provider_id, date_range, and appointment_type. Filters against SM Provider Schedule and SM Schedule Block.
- **Dependencies**: SCHED-002, SCHED-003, SCHED-005
- **Spec Gates**:
  - Workflow: Appointment Booking — enables receptionist/patient to find available slots
  - CRM Timeline: N/A — read-only query, no customer record created
  - Right Level: Universal — slot availability applies across all verticals

---

### SCHED-011: Create Appointment Endpoint
- **Category**: BACKEND
- **Size**: S
- **Description**: Create MAL endpoint `POST /api/modules/scheduling/appointment/create` that creates a new SM Appointment in Requested status. Validates against provider availability. Triggers n8n workflow for CRM timeline entry.
- **Dependencies**: SCHED-005, SCHED-010
- **Spec Gates**:
  - Workflow: Appointment Booking — creates new appointment in Requested state
  - CRM Timeline: Appointment Created — write to patient CRM timeline on creation
  - Right Level: Universal — appointment creation applies across all verticals

---

### SCHED-012: Get Appointment Endpoint
- **Category**: BACKEND
- **Size**: XS
- **Description**: Create MAL endpoint `GET /api/modules/scheduling/appointment/{id}` that retrieves appointment details including related provider and patient info.
- **Dependencies**: SCHED-005
- **Spec Gates**:
  - Workflow: N/A — read operation for displaying appointment details
  - CRM Timeline: N/A — read-only query
  - Right Level: Universal

---

### SCHED-013: Confirm Appointment Endpoint
- **Category**: BACKEND
- **Size**: XS
- **Description**: Create MAL endpoint `PUT /api/modules/scheduling/appointment/{id}/confirm` that transitions appointment from Requested to Confirmed. Triggers n8n workflow for CRM timeline and reminder notification queue.
- **Dependencies**: SCHED-005, SCHED-011
- **Spec Gates**:
  - Workflow: Appointment Confirmation — moves appointment to Confirmed state
  - CRM Timeline: Appointment Confirmed — write to patient CRM timeline
  - Right Level: Universal

---

### SCHED-014: Start Appointment Endpoint
- **Category**: BACKEND
- **Size**: XS
- **Description**: Create MAL endpoint `PUT /api/modules/scheduling/appointment/{id}/start` that transitions appointment from Confirmed to In Progress (day-of-session start).
- **Dependencies**: SCHED-005, SCHED-013
- **Spec Gates**:
  - Workflow: Appointment Execution — marks session as in progress on day of appointment
  - CRM Timeline: N/A — internal state transition, no customer-visible event
  - Right Level: Universal

---

### SCHED-015: Complete Appointment Endpoint
- **Category**: BACKEND
- **Size**: S
- **Description**: Create MAL endpoint `PUT /api/modules/scheduling/appointment/{id}/complete` that transitions appointment to Completed. Triggers n8n workflow for CRM timeline entry (with type/duration) and billing trigger workflow.
- **Dependencies**: SCHED-005, SCHED-014
- **Spec Gates**:
  - Workflow: Appointment Execution — marks session as completed, triggers billing
  - CRM Timeline: Appointment Completed — write to patient CRM timeline including appointment type and duration
  - Right Level: Universal — completion is universal; billing trigger connects to Healthcare Billing Mojo

---

### SCHED-016: Cancel Appointment Endpoint
- **Category**: BACKEND
- **Size**: XS
- **Description**: Create MAL endpoint `PUT /api/modules/scheduling/appointment/{id}/cancel` that transitions appointment to Cancelled (from Requested or Confirmed). Accepts cancellation_reason. Triggers n8n workflow for CRM timeline entry.
- **Dependencies**: SCHED-005, SCHED-011
- **Spec Gates**:
  - Workflow: Cancellation — patient or receptionist cancels with reason code
  - CRM Timeline: Appointment Cancelled — write to patient CRM timeline including cancellation reason
  - Right Level: Universal

---

### SCHED-017: No-Show Appointment Endpoint
- **Category**: BACKEND
- **Size**: XS
- **Description**: Create MAL endpoint `PUT /api/modules/scheduling/appointment/{id}/no-show` that transitions appointment to No-Show (from Confirmed only). Triggers n8n workflow for CRM timeline entry.
- **Dependencies**: SCHED-005, SCHED-013
- **Spec Gates**:
  - Workflow: No-Show tracking — clinician marks patient as no-show
  - CRM Timeline: No-Show — write to patient CRM timeline
  - Right Level: Universal

---

### SCHED-018: List Providers with Availability Endpoint
- **Category**: BACKEND
- **Size**: S
- **Description**: Create MAL endpoint `GET /api/modules/scheduling/providers` that lists all providers with their availability metadata (next available slot, appointment types offered).
- **Dependencies**: SCHED-002, SCHED-003
- **Spec Gates**:
  - Workflow: Appointment Booking — enables receptionist/patient to select provider
  - CRM Timeline: N/A — read-only query
  - Right Level: Universal

---

### SCHED-019: Get Provider Schedule Endpoint
- **Category**: BACKEND
- **Size**: XS
- **Description**: Create MAL endpoint `GET /api/modules/scheduling/provider/{id}/schedule` that retrieves provider's weekly schedule template and schedule blocks.
- **Dependencies**: SCHED-002, SCHED-003
- **Spec Gates**:
  - Workflow: Provider Setup — admin views provider availability
  - CRM Timeline: N/A — read-only configuration query
  - Right Level: Universal

---

### SCHED-020: Create/Update Provider Schedule Endpoint
- **Category**: BACKEND
- **Size**: S
- **Description**: Create MAL endpoint `POST /api/modules/scheduling/provider/{id}/schedule` that creates or updates provider weekly schedule template (day/time slots and allowed appointment types).
- **Dependencies**: SCHED-002
- **Spec Gates**:
  - Workflow: Provider Setup — admin configures provider availability
  - CRM Timeline: N/A — configuration update, no customer interaction
  - Right Level: Universal

---

### SCHED-021: Create Schedule Block Endpoint
- **Category**: BACKEND
- **Size**: XS
- **Description**: Create MAL endpoint `POST /api/modules/scheduling/provider/{id}/block` that creates a schedule block (vacation, lunch, admin time) for a specific date/time.
- **Dependencies**: SCHED-003
- **Spec Gates**:
  - Workflow: Provider Setup — admin blocks off time slots
  - CRM Timeline: N/A — configuration update
  - Right Level: Universal

---

### SCHED-022: Delete Schedule Block Endpoint
- **Category**: BACKEND
- **Size**: XS
- **Description**: Create MAL endpoint `DELETE /api/modules/scheduling/provider/{id}/block/{block_id}` that removes a schedule block.
- **Dependencies**: SCHED-003
- **Spec Gates**:
  - Workflow: Provider Setup — admin removes schedule block
  - CRM Timeline: N/A — configuration update
  - Right Level: Universal

---

### SCHED-023: Join Waitlist Endpoint
- **Category**: BACKEND
- **Size**: S
- **Description**: Create MAL endpoint `POST /api/modules/scheduling/waitlist/join` that adds patient to waitlist for provider+type combination within date range. Triggers CRM timeline entry.
- **Dependencies**: SCHED-004, SCHED-011
- **Spec Gates**:
  - Workflow: Waitlist — patient joins waitlist when no slots available
  - CRM Timeline: Waitlist Joined — write to patient CRM timeline
  - Right Level: Universal

---

### SCHED-024: Leave Waitlist Endpoint
- **Category**: BACKEND
- **Size**: XS
- **Description**: Create MAL endpoint `DELETE /api/modules/scheduling/waitlist/{id}` that removes patient from waitlist.
- **Dependencies**: SCHED-004, SCHED-023
- **Spec Gates**:
  - Workflow: Waitlist — patient leaves waitlist voluntarily
  - CRM Timeline: N/A — removal action, no customer-visible timeline entry required
  - Right Level: Universal

---

## Frontend Component Stories

### SCHED-030: AvailabilityCalendar Component
- **Category**: FRONTEND
- **Size**: S
- **Description**: Create React JSX component showing weekly view of provider availability with slot selection. Calls `GET /api/modules/scheduling/slots` and `GET /api/modules/scheduling/providers`.
- **Dependencies**: SCHED-010, SCHED-018
- **Spec Gates**:
  - Workflow: Appointment Booking — enables visual slot selection
  - CRM Timeline: N/A — UI component only, no direct customer interaction
  - Right Level: Universal

---

### SCHED-031: AppointmentBookingForm Component
- **Category**: FRONTEND
- **Size**: S
- **Description**: Create React JSX component with slot picker, patient search/select, appointment type picker, and confirmation step. Calls `POST /api/modules/scheduling/appointment/create`.
- **Dependencies**: SCHED-011, SCHED-030
- **Spec Gates**:
  - Workflow: Appointment Booking — collects booking details and submits
  - CRM Timeline: N/A — UI component, CRM write happens via backend endpoint
  - Right Level: Universal

---

### SCHED-032: AppointmentCard Component
- **Category**: FRONTEND
- **Size**: S
- **Description**: Create React JSX component displaying appointment details with status-aware action buttons (Confirm, Start, Complete, Cancel, No-Show). Calls appropriate appointment endpoints based on status.
- **Dependencies**: SCHED-012, SCHED-013, SCHED-014, SCHED-015, SCHED-016, SCHED-017
- **Spec Gates**:
  - Workflow: Appointment Management — displays appointment with context-appropriate actions
  - CRM Timeline: N/A — UI component, CRM writes happen via backend endpoints
  - Right Level: Universal

---

### SCHED-033: ProviderScheduleEditor Component
- **Category**: FRONTEND
- **Size**: S
- **Description**: Create React JSX component for admin to manage weekly schedule templates (day/time slots, allowed appointment types) and schedule blocks. Calls schedule management endpoints.
- **Dependencies**: SCHED-019, SCHED-020, SCHED-021, SCHED-022
- **Spec Gates**:
  - Workflow: Provider Setup — admin configures provider availability
  - CRM Timeline: N/A — UI component for configuration
  - Right Level: Universal

---

### SCHED-034: WaitlistPanel Component
- **Category**: FRONTEND
- **Size**: S
- **Description**: Create React JSX component for viewing and managing waitlist entries. Shows patient, provider, appointment type, date range, and notified status. Allows removal.
- **Dependencies**: SCHED-023, SCHED-024
- **Spec Gates**:
  - Workflow: Waitlist Management — admin views and manages waitlist
  - CRM Timeline: N/A — UI component
  - Right Level: Universal

---

## Integration Stories (n8n Workflows)

### SCHED-040: Appointment Reminder Notifications Workflow
- **Category**: INTEGRATION
- **Size**: S
- **Description**: Create n8n workflow that sends appointment reminders at 24h and 1h before appointment. Sends via both email and SMS. Triggered by SM Appointment status change (Confirmed).
- **Dependencies**: SCHED-013, SCHED-015
- **Spec Gates**:
  - Workflow: Appointment Confirmation — ensures patient receives timely reminders
  - CRM Timeline: N/A — notification dispatch is external action, not CRM write
  - Right Level: Universal — reminders apply across all verticals

---

### SCHED-041: Telehealth Link Generation Workflow
- **Category**: INTEGRATION
- **Size**: S
- **Description**: Create n8n workflow that generates telehealth video link when appointment is Confirmed and location_type is telehealth. Attaches link to SM Appointment telehealth_link field. Link surfaces in reminder notifications.
- **Dependencies**: SCHED-013
- **Spec Gates**:
  - Workflow: Appointment Confirmation — generates video link for telehealth appointments
  - CRM Timeline: N/A — system integration action
  - Right Level: Universal

---

### SCHED-042: Billing Trigger on Completion Workflow
- **Category**: INTEGRATION
- **Size**: S
- **Description**: Create n8n workflow that triggers Healthcare Billing Mojo workflow when SM Appointment transitions to Completed. Passes appointment type and duration to billing workflow.
- **Dependencies**: SCHED-015
- **Spec Gates**:
  - Workflow: Appointment Execution — triggers billing after session completion
  - CRM Timeline: N/A — cross-system trigger, billing Mojo handles its own CRM entries
  - Right Level: Universal — billing trigger connects to Healthcare Billing Mojo

---

### SCHED-043: Waitlist Notification Workflow
- **Category**: INTEGRATION
- **Size**: S
- **Description**: Create n8n workflow that monitors for schedule blocks being deleted or appointments being cancelled. When a slot opens matching waitlist entry criteria, sends notification to waitlisted patients and marks notified=true.
- **Dependencies**: SCHED-022, SCHED-016, SCHED-023
- **Spec Gates**:
  - Workflow: Waitlist — auto-notifies patients when matching slots open
  - CRM Timeline: N/A — notification dispatch
  - Right Level: Universal

---

## FHIR Integration Stories

### SCHED-050: FHIR Appointment Mapping
- **Category**: BACKEND
- **Size**: S
- **Description**: Implement FHIR R4 Appointment resource mapping for SM Appointment via Medplum. Map fields: appointmentId→id, patient→patient reference, practitioner→participant, start/end→start/end, status→status. Sync bidirectionally with Medplum.
- **Dependencies**: SCHED-005, SCHED-011
- **Spec Gates**:
  - Workflow: Appointment Execution — ensures clinical data is available in Medplum
  - CRM Timeline: N/A — clinical data lives in Medplum, not CRM
  - Right Level: Universal — FHIR mapping applies across all verticals with clinical data

---

## Glue Stories (Orchestration/Utilities)

### SCHED-060: Appointment Status State Machine
- **Category**: BACKEND
- **Size**: S
- **Description**: Implement centralized appointment status transition logic with validation. Enforces valid transitions: Requested→Confirmed, Confirmed→In Progress, Confirmed→Cancelled, Confirmed→No-Show, In Progress→Completed. Rejects invalid transitions.
- **Dependencies**: SCHED-005, SCHED-011, SCHED-013, SCHED-014, SCHED-015, SCHED-016, SCHED-017
- **Spec Gates**:
  - Workflow: Appointment Lifecycle — enforces valid state transitions
  - CRM Timeline: N/A — internal state machine
  - Right Level: Universal

---

### SCHED-061: Recurring Appointment Logic
- **Category**: BACKEND
- **Size**: S
- **Description**: Implement recurring appointment creation (weekly/biweekly series). Supports editing single instance or all future instances. Maintains series_id and recurring_parent_id linkage.
- **Dependencies**: SCHED-005, SCHED-011
- **Spec Gates**:
  - Workflow: Appointment Booking — supports recurring series creation
  - CRM Timeline: N/A — series instances written individually via SCHED-011
  - Right Level: Universal

---

### SCHED-062: Reschedule Logic
- **Category**: BACKEND
- **Size**: XS
- **Description**: Implement reschedule logic: cancel existing appointment, create new one, preserve link to original if part of recurring series. Chains SCHED-016 and SCHED-011.
- **Dependencies**: SCHED-016, SCHED-011
- **Spec Gates**:
  - Workflow: Appointment Rescheduling — cancel-and-recreate with series linkage
  - CRM Timeline: Appointment Cancelled (existing) + Appointment Created (new)
  - Right Level: Universal

---

## Summary Statistics

| Category | Count | Size Distribution |
|----------|-------|-------------------|
| BACKEND | 19 | XS: 10, S: 9 |
| FRONTEND | 5 | S: 5 |
| INTEGRATION | 4 | S: 4 |
| GLUE | 3 | XS: 1, S: 2 |
| **Total** | **31** | **XS: 11, S: 20** |

---

*Generated by Story Decomposer | Capability: Scheduling Mojo | Date: 2026-04-09*
```

---

## DEPENDENCY-GRAPH.md

```markdown
# Spark Mojo — Scheduling Mojo Dependency Graph
# Build Order & Parallel Execution Groups

---

## Phase 1: Foundation (No Dependencies)

### Group 1.1 — DocType Setup (Parallel)
```
SCHED-001: SM Appointment Type DocType
SCHED-002: SM Provider Schedule DocType
SCHED-003: SM Schedule Block DocType ← depends on SCHED-002
SCHED-004: SM Waitlist Entry DocType
```
**Note**: SCHED-003 depends on SCHED-002 for reference patterns, but can be built in parallel with slight deferral.

---

## Phase 2: Core Appointment DocType

### Group 2.1 — Main Appointment Record
```
SCHED-005: SM Appointment DocType
  └─ Dependencies: SCHED-001, SCHED-004
```

---

## Phase 3: Backend API Layer (Parallel Groups)

### Group 3.1 — Read Operations
```
SCHED-012: GET Appointment Endpoint
  └─ Dependency: SCHED-005

SCHED-019: GET Provider Schedule Endpoint
  └─ Dependencies: SCHED-002, SCHED-003

SCHED-018: List Providers with Availability
  └─ Dependencies: SCHED-002, SCHED-003
```

### Group 3.2 — Provider Schedule Management
```
SCHED-020: Create/Update Provider Schedule Endpoint
  └─ Dependency: SCHED-002

SCHED-021: Create Schedule Block Endpoint
  └─ Dependency: SCHED-003

SCHED-022: Delete Schedule Block Endpoint
  └─ Dependency: SCHED-003
```

### Group 3.3 — Slot Availability Query
```
SCHED-010: GET Available Slots Endpoint
  └─ Dependencies: SCHED-002, SCHED-003, SCHED-005
```

### Group 3.4 — Appointment Lifecycle (Serial Chain)
```
SCHED-011: Create Appointment Endpoint
  └─ Dependencies: SCHED-005, SCHED-010

SCHED-013: Confirm Appointment Endpoint
  └─ Dependencies: SCHED-005, SCHED-011

SCHED-014: Start Appointment Endpoint
  └─ Dependencies: SCHED-005, SCHED-013

SCHED-015: Complete Appointment Endpoint
  └─ Dependencies: SCHED-005, SCHED-014

SCHED-016: Cancel Appointment Endpoint
  └─ Dependencies: SCHED-005, SCHED-011

SCHED-017: No-Show Appointment Endpoint
  └─ Dependencies: SCHED-005, SCHED-013
```

### Group 3.5 — Waitlist
```
SCHED-023: Join Waitlist Endpoint
  └─ Dependencies: SCHED-004, SCHED-011

SCHED-024: Leave Waitlist Endpoint
  └─ Dependencies: SCHED-004, SCHED-023
```

---

## Phase 4: State Machine & Glue

### Group 4.1 — Core Logic
```
SCHED-060: Appointment Status State Machine
  └─ Dependencies: SCHED-005, SCHED-011, SCHED-013, SCHED-014, SCHED-015, SCHED-016, SCHED-017

SCHED-061: Recurring Appointment Logic
  └─ Dependencies: SCHED-005, SCHED-011

SCHED-062: Reschedule Logic
  └─ Dependencies: SCHED-016, SCHED-011
```

---

## Phase 5: Frontend Components (After Backend APIs)

### Group 5.1 — Slot & Booking Components
```
SCHED-030: AvailabilityCalendar Component
  └─ Dependencies: SCHED-010, SCHED-018

SCHED-031: AppointmentBookingForm Component
  └─ Dependencies: SCHED-011, SCHED-030
```

### Group 5.2 — Appointment Management
```
SCHED-032: AppointmentCard Component
  └─ Dependencies: SCHED-012, SCHED-013, SCHED-014, SCHED-015, SCHED-016, SCHED-017
```

### Group 5.3 — Provider & Waitlist
```
SCHED-033: ProviderScheduleEditor Component
  └─ Dependencies: SCHED-019, SCHED-020, SCHED-021, SCHED-022

SCHED-034: WaitlistPanel Component
  └─ Dependencies: SCHED-023, SCHED-024
```

---

## Phase 6: Integrations (n8n Workflows)

### Group 6.1 — Triggered by Appointment Lifecycle
```
SCHED-040: Appointment Reminder Notifications Workflow
  └─ Dependencies: SCHED-013, SCHED-015

SCHED-041: Telehealth Link Generation Workflow
  └─ Dependency: SCHED-013

SCHED-042: Billing Trigger on Completion Workflow
  └─ Dependency: SCHED-015

SCHED-043: Waitlist Notification Workflow
  └─ Dependencies: SCHED-022, SCHED-016, SCHED-023
```

---

## Phase 7: FHIR Integration

```
SCHED-050: FHIR Appointment Mapping
  └─ Dependencies: SCHED-005, SCHED-011
```

---

## Visual Build Order

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: Foundation                                              │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                 │
│ │SCHED-001│ │SCHED-002│ │SCHED-004│ │SCHED-003│←(defer)          │
│ └────┬────┘ └────┬────┘ └─────────┘ └────┬────┘                 │
│      └────┬─────┘                       │                       │
│           │                             │                       │
├───────────┼─────────────────────────────┼───────────────────────┤
│ PHASE 2:  │                             │                       │
│ ┌─────────▼─────────┐                   │                       │
│ │    SCHED-005      │                   │                       │
│ │ SM Appointment    │                   │                       │
│ └─────────┬─────────┘                   │                       │
│           │                             │                       │
├───────────┼─────────────────────────────┼───────────────────────┤
│ PHASE 3:  │                             │                       │
│           │  ┌───────────────────────────┼───────────────────┐   │
│           │  │ GROUP 3.1: Read Ops      │                   │   │
│           │  │ SCHED-012, SCHED-018,    │                   │   │
│           │  │ SCHED-019                │                   │   │
│           │  └───────────────────────────┼───────────────────┘   │
│           │  ┌───────────────────────────┼───────────────────┐   │
│           │  │ GROUP 3.2: Schedule Mgmt  │                   │   │
│           │  │ SCHED-020, SCHED-021,    │                   │   │
│           │  │ SCHED-022                 │                   │   │
│           │  └───────────────────────────┼───────────────────┘   │
│           │  ┌───────────────────────────┼───────────────────┐   │
│           │  │ GROUP 3.3: Slot Query     │                   │   │
│           │  │ SCHED-010                 │                   │   │
│           │  └───────────────────────────┼───────────────────┘   │
│           │  ┌───────────────────────────┼───────────────────┐   │
│           │  │ GROUP 3.4: Lifecycle      │                   │   │
│           │  │ SCHED-011 → SCHED-013     │                   │   │
│           │  └─→ SCHED-014 → SCHED-015──┘                   │   │
│           │  SCHED-016, SCHED-017 (parallel branches)        │   │
│           │  ┌───────────────────────────┐                   │   │
│           │  │ GROUP 3.5: Waitlist       │                   │   │
│           │  │ SCHED-023 → SCHED-024     │                   │   │
│           │  └───────────────────────────┘                   │   │
│           │                             │                       │
├───────────┼─────────────────────────────┼───────────────────────┤
│ PHASE 4:  │                             │                       │
│ ┌─────────▼─────────┐                   │                       │
│ │    SCHED-060      │                   │                       │
│ │    SCHED-061      │                   │                       │
│ │    SCHED-062      │                   │                       │
│ └─────────┬─────────┘                   │                       │
│           │                             │                       │
├───────────┼─────────────────────────────┼───────────────────────┤
│ PHASE 5:  │                             │                       │
│           │  ┌───────────────────────────┴───────────────────┐   │
│           │  │ GROUP 5.1-5.3: All Frontend Components     │   │
│           │  │ SCHED-030, SCHED-031, SCHED-032,            │   │
│           │  │ SCHED-033, SCHED-034                        │   │
│           │  └─────────────────────────────────────────────┘   │
│           │                             │                       │
├───────────┼─────────────────────────────┼───────────────────────┤
│ PHASE 6:  │                             │                       │
│ ┌─────────▼─────────────────────────────▼───────────────┐       │
│ │    All n8n Integration Workflows                     │       │
│ │    SCHED-040, SCHED-041, SCHED-042, SCHED-043        │       │
│ └───────────────────────────────────────────────────────┘       │
│                                                               │
├─────────────────────────────────────────────────────────────────┤
│ PHASE 7:                                                     │
│ ┌─────────────────────────────────────────────────────────┐    │
│ │ SCHED-050: FHIR Appointment Mapping                      │    │
│ └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Parallel Execution Groups Summary

| Group | Stories | Can Run In Parallel With |
|-------|---------|-------------------------|
| **Group 1.1** | SCHED-001, SCHED-002, SCHED-004 | Everything in Phase 1 |
| **Group 3.1** | SCHED-012, SCHED-018, SCHED-019 | Groups 3.2, 3.3, 3.5 |
| **Group 3.2** | SCHED-020, SCHED-021, SCHED-022 | Groups 3.1, 3.3, 3.5 |
| **Group 3.3** | SCHED-010 | Groups 3.1, 3.2, 3.5 |
| **Group 3.4** | SCHED-011→SCHED-013→SCHED-014→SCHED-015 (chain) | Groups 3.5 (parallel) |
| **Group 3.4 alt** | SCHED-016, SCHED-017 (parallel with 3.4) | Groups 3.5 |
| **Group 3.5** | SCHED-023→SCHED-024 (chain) | Groups 3.1, 3.2, 3.3 |
| **Group 5.1** | SCHED-030, SCHED-031 | Groups 5.2, 5.3 |
| **Group 5.2** | SCHED-032 | Groups 5.1, 5.3 |
| **Group 5.3** | SCHED-033, SCHED-034 | Groups 5.1, 5.2 |
| **Group 6.1** | SCHED-040, SCHED-041, SCHED-042, SCHED-043 | Each other |

---

## Critical Path (Longest Chain)

```
SCHED-001 → SCHED-002 → SCHED-005 → SCHED-011 → SCHED-013 → SCHED-014 → SCHED-015 → SCHED-042
```

**Minimum stories before frontend can begin**: SCHED-011 (Create Appointment)
**Minimum stories before integrations can begin**: SCHED-013, SCHED-015, SCHED-016, SCHED-022, SCHED-023

---

*Generated by Story Decomposer | Capability: Scheduling Mojo | Date: 2026-04-09*
```

---

## Notes for Implementers

<details>
<summary><strong>Key Architecture Points</strong></summary>

1. **React → MAL Only**: All frontend components call MAL endpoints only. No direct Frappe calls.

2. **n8n Boundary**: Frappe handles internal state transitions; n8n handles external actions (notifications, billing triggers, telehealth links). Hard boundary — never crossed.

3. **CRM Timeline Contract**: Every customer-facing action writes to the CRM timeline. Stories explicitly note what they write.

4. **Size Discipline**: All stories are XS or S. Larger stories were split. Max 2 API endpoints per story.

5. **FHIR Storage**: SM Appointment syncs to Medplum as FHIR R4 Appointment resource. Clinical data lives in Medplum, business data in Frappe.
</details>