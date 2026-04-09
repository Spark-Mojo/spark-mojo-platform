model: model-zeta
test: 01-story-decomposition
run: B
date: 2026-04-09

```markdown
# STORIES.md

# Scheduling Mojo Build Stories
## Behavioral Health Vertical — First Instance

---

### SCHED-001: SM Appointment Type DocType
**Category:** CONFIG  
**Size:** XS  
**Description:** Create the SM Appointment Type DocType to store configurable appointment types with duration, telehealth flag, buffer time, and default location type.  
**Dependencies:** None  
**Spec Gates:**
1. **Workflow:** Provider Setup — admin configures appointment types available for booking.
2. **CRM Timeline:** N/A — configuration data, not a customer interaction.
3. **Right Level:** Universal — configured for Behavioral Health as first vertical instance.

---

### SCHED-002: SM Provider Schedule DocType
**Category:** CONFIG  
**Size:** XS  
**Description:** Create the SM Provider Schedule DocType for weekly availability templates storing provider_id, day_of_week, time ranges, and allowed appointment types.  
**Dependencies:** None  
**Spec Gates:**
1. **Workflow:** Provider Setup — admin configures recurring weekly availability.
2. **CRM Timeline:** N/A — configuration data.
3. **Right Level:** Universal — all service businesses use provider schedules.

---

### SCHED-003: SM Schedule Block DocType
**Category:** CONFIG  
**Size:** XS  
**Description:** Create the SM Schedule Block DocType for one-off time blocks (vacation, lunch, admin time) with provider_id, date, time range, and reason code.  
**Dependencies:** None  
**Spec Gates:**
1. **Workflow:** Provider Setup — admin blocks individual time slots.
2. **CRM Timeline:** N/A — internal schedule management.
3. **Right Level:** Universal — applicable to any scheduling vertical.

---

### SCHED-004: SM Appointment DocType
**Category:** CONFIG  
**Size:** XS  
**Description:** Create the SM Appointment DocType as the core appointment record with fields for provider, patient, type, timing, status workflow, location, telehealth_link, cancellation_reason, and recurring series linkage.  
**Dependencies:** SCHED-001 (SM Appointment Type), SCHED-002 (SM Provider Schedule)  
**Spec Gates:**
1. **Workflow:** Core appointment lifecycle — stores data for all workflows 1-9.
2. **CRM Timeline:** N/A — storage layer only; APIs write timeline entries.
3. **Right Level:** Universal — appointment pattern generic across verticals.

---

### SCHED-005: SM Waitlist Entry DocType
**Category:** CONFIG  
**Size:** XS  
**Description:** Create the SM Waitlist Entry DocType to store patient waitlist requests with provider_id, appointment_type, date range, and notification status.  
**Dependencies:** None  
**Spec Gates:**
1. **Workflow:** Waitlist — captures patient requests for unavailable slots.
2. **CRM Timeline:** N/A — waitlist entry is not a confirmed interaction event.
3. **Right Level:** Universal — waitlist pattern applicable to any booking scenario.

---

### SCHED-006: Provider Schedule Template API
**Category:** BACKEND  
**Size:** XS  
**Description:** Implement GET and POST `/api/modules/scheduling/provider/{id}/schedule` endpoints to retrieve and save weekly schedule templates for a provider.  
**Dependencies:** SCHED-002  
**Spec Gates:**
1. **Workflow:** Provider Setup — enables template persistence and retrieval.
2. **CRM Timeline:** N/A — admin configuration action.
3. **Right Level:** Universal — template structure works for any service provider.

---

### SCHED-007: Schedule Block Management API
**Category:** BACKEND  
**Size:** XS  
**Description:** Implement POST and DELETE `/api/modules/scheduling/provider/{id}/block` endpoints to create and remove individual time blocks for specific dates.  
**Dependencies:** SCHED-003  
**Spec Gates:**
1. **Workflow:** Provider Setup — manages one-off availability changes.
2. **CRM Timeline:** N/A — internal admin operation.
3. **Right Level:** Universal — blocking time is universal need.

---

### SCHED-008: Available Slots Query API
**Category:** BACKEND  
**Size:** S  
**Description:** Implement GET `/api/modules/scheduling/slots` endpoint that calculates available appointment slots by validating provider templates, schedule blocks, and existing appointments against requested date range and appointment type.  
**Dependencies:** SCHED-002, SCHED-003, SCHED-004  
**Spec Gates:**
1. **Workflow:** Appointment Booking — enables slot discovery for booking searches.
2. **CRM Timeline:** N/A — read-only query with no data mutation.
3. **Right Level:** Universal — slot calculation logic applies to any scheduling domain.

---

### SCHED-009: Appointment Create API
**Category:** BACKEND  
**Size:** S  
**Description:** Implement POST `/api/modules/scheduling/appointment/create` endpoint to create appointments in Requested state, validate against provider schedule, handle recurring series expansion, and trigger CRM timeline write.  
**Dependencies:** SCHED-001, SCHED-004  
**Spec Gates:**
1. **Workflow:** Appointment Booking — creates the initial appointment record.
2. **CRM Timeline:** Writes "Appointment created" entry to client timeline.
3. **Right Level:** Universal — appointment creation pattern consistent across verticals.

---

### SCHED-010: Appointment Read API
**Category:** BACKEND  
**Size:** XS  
**Description:** Implement GET `/api/modules/scheduling/appointment/{id}` endpoint to retrieve full appointment details including status, participants, and linked records.  
**Dependencies:** SCHED-004  
**Spec Gates:**
1. **Workflow:** All appointment workflows — supports detail view for any appointment operation.
2. **CRM Timeline:** N/A — read-only retrieval.
3. **Right Level:** Universal — standard CRUD operation.

---

### SCHED-011: Appointment Confirm API
**Category:** BACKEND  
**Size:** XS  
**Description:** Implement PUT `/api/modules/scheduling/appointment/{id}/confirm` endpoint to transition appointment from Requested to Confirmed state and write CRM timeline entry.  
**Dependencies:** SCHED-004  
**Spec Gates:**
1. **Workflow:** Appointment Confirmation — moves appointment to confirmed status.
2. **CRM Timeline:** Writes "Appointment confirmed" entry to client timeline.
3. **Right Level:** Universal — confirmation workflow generic across booking scenarios.

---

### SCHED-012: Appointment Start API
**Category:** BACKEND  
**Size:** XS  
**Description:** Implement PUT `/api/modules/scheduling/appointment/{id}/start` endpoint to transition appointment status to In Progress when session begins.  
**Dependencies:** SCHED-004  
**Spec Gates:**
1. **Workflow:** Appointment Execution — marks session start.
2. **CRM Timeline:** N/A — intermediate state change tracked internally per research (terminal states only required for CRM).
3. **Right Level:** Universal — session start pattern consistent.

---

### SCHED-013: Appointment Complete API
**Category:** BACKEND  
**Size:** XS  
**Description:** Implement PUT `/api/modules/scheduling/appointment/{id}/complete` endpoint to transition appointment to Completed state, capture actual duration, and write CRM timeline entry with type and duration.  
**Dependencies:** SCHED-004  
**Spec Gates:**
1. **Workflow:** Appointment Execution — terminal state for successful session.
2. **CRM Timeline:** Writes "Appointment completed" entry with type and duration to client timeline.
3. **Right Level:** Universal — completion workflow applies to all booked services.

---

### SCHED-014: Appointment Cancel API
**Category:** BACKEND  
**Size:** XS  
**Description:** Implement PUT `/api/modules/scheduling/appointment/{id}/cancel` endpoint to transition appointment to Cancelled state, capture cancellation_reason, preserve link for rescheduling, and write CRM timeline entry.  
**Dependencies:** SCHED-004  
**Spec Gates:**
1. **Workflow:** Cancellation and Rescheduling — handles cancellation with reason.
2. **CRM Timeline:** Writes "Appointment cancelled" entry with reason to client timeline.
3. **Right Level:** Universal — cancellation pattern universal to appointment systems.

---

### SCHED-015: Appointment No-Show API
**Category:** BACKEND  
**Size:** XS  
**Description:** Implement PUT `/api/modules/scheduling/appointment/{id}/no-show` endpoint to transition Confirmed appointment to No-Show terminal state and write CRM timeline entry.  
**Dependencies:** SCHED-004  
**Spec Gates:**
1. **Workflow:** Cancellation and No-Show — handles patient no-show marking.
2. **CRM Timeline:** Writes "No-show" entry to client timeline.
3. **Right Level:** Universal — no-show tracking applicable to any appointment-based business.

---

### SCHED-016: Provider List API
**Category:** BACKEND  
**Size:** XS  
**Description:** Implement GET `/api/modules/scheduling/providers` endpoint to list providers with availability metadata for appointment booking selection.  
**Dependencies:** SCHED-002  
**Spec Gates:**
1. **Workflow:** Appointment Booking — supports provider selection with availability context.
2. **CRM Timeline:** N/A — configuration lookup.
3. **Right Level:** Universal — provider listing generic across service verticals.

---

### SCHED-017: Waitlist Management API
**Category:** BACKEND  
**Size:** XS  
**Description:** Implement POST `/api/modules/scheduling/waitlist/join` and DELETE `/api/modules/scheduling/waitlist/{id}` endpoints to add and remove waitlist entries for patients seeking unavailable slots.  
**Dependencies:** SCHED-005  
**Spec Gates:**
1. **Workflow:** Waitlist — manages waitlist membership.
2. **CRM Timeline:** N/A — system-internal waitlist operations.
3. **Right Level:** Universal — waitlist pattern applicable to any constrained availability scenario.

---

### SCHED-018: AvailabilityCalendar Component
**Category:** FRONTEND  
**Size:** S  
**Description:** Build the AvailabilityCalendar React component as a weekly view of provider availability with clickable slot selection, blocked time visualization, and integration with slots query API.  
**Dependencies:** SCHED-008  
**Spec Gates:**
1. **Workflow:** Appointment Booking — visual slot selection interface.
2. **CRM Timeline:** N/A — frontend component does not write directly to timeline.
3. **Right Level:** Universal — calendar pattern works for any provider scheduling.

---

### SCHED-019: ProviderScheduleEditor Component
**Category:** FRONTEND  
**Size:** S  
**Description:** Build the ProviderScheduleEditor React component as a weekly template management interface supporting day-of-week configuration, time range selection, and appointment type restrictions.  
**Dependencies:** SCHED-006  
**Spec Gates:**
1. **Workflow:** Provider Setup — admin interface for template management.
2. **CRM Timeline:** N/A — configuration UI.
3. **Right Level:** Universal — schedule template editor generic across verticals.

---

### SCHED-020: AppointmentBookingForm Component
**Category:** FRONTEND  
**Size:** S  
**Description:** Build the AppointmentBookingForm React component as a multi-step form combining patient selection, appointment type picker, AvailabilityCalendar integration, and confirmation step before submission.  
**Dependencies:** SCHED-009, SCHED-018  
**Spec Gates:**
1. **Workflow:** Appointment Booking — end-to-end booking interface.
2. **CRM Timeline:** N/A — form submission triggers API which writes to timeline.
3. **Right Level:** Universal — booking form structure consistent across appointment types.

---

### SCHED-021: AppointmentCard Component
**Category:** FRONTEND  
**Size:** S  
**Description:** Build the AppointmentCard React component displaying appointment details with status-aware action buttons (Confirm, Start, Complete, Cancel, No-Show) appropriate to current state.  
**Dependencies:** SCHED-010, SCHED-011, SCHED-012, SCHED-013, SCHED-014, SCHED-015  
**Spec Gates:**
1. **Workflow:** Appointment Confirmation, Execution, Cancellation — enables status transitions via UI.
2. **CRM Timeline:** N/A — actions trigger APIs which write to timeline.
3. **Right Level:** Universal — status-aware card pattern applicable to any workflow state machine.

---

### SCHED-022: WaitlistPanel Component
**Category:** FRONTEND  
**Size:** S  
**Description:** Build the WaitlistPanel React component for viewing and managing waitlist entries with join date, requested date range, and notification status display.  
**Dependencies:** SCHED-017  
**Spec Gates:**
1. **Workflow:** Waitlist — waitlist management interface.
2. **CRM Timeline:** N/A — waitlist management does not directly write to timeline.
3. **Right Level:** Universal — waitlist management UI pattern generic.

---

### SCHED-023: Appointment Reminder Workflow
**Category:** INTEGRATION  
**Size:** S  
**Description:** Build n8n workflow triggered on appointment confirmation that schedules and sends 24-hour and 1-hour pre-appointment reminders via email and SMS, writing notification status to CRM timeline.  
**Dependencies:** SCHED-011  
**Spec Gates:**
1. **Workflow:** Appointment Confirmation — queues reminder notifications upon confirmation.
2. **CRM Timeline:** Writes "Appointment reminder sent" entries to client timeline.
3. **Right Level:** Universal — reminder pattern applicable to any booked appointment.

---

### SCHED-024: Telehealth Link Generation Workflow
**Category:** INTEGRATION  
**Size:** XS  
**Description:** Build n8n workflow triggered on telehealth appointment creation that generates secure video conference links via video provider API and attaches them to the appointment record for inclusion in notifications.  
**Dependencies:** SCHED-009  
**Spec Gates:**
1. **Workflow:** Telehealth appointments — generates video links for virtual sessions.
2. **CRM Timeline:** N/A — link generation is internal system action; link surface happens via reminder.
3. **Right Level:** Universal — telehealth link generation works for any virtual service.

---

### SCHED-025: Billing Trigger Workflow
**Category:** INTEGRATION  
**Size:** XS  
**Description:** Build n8n workflow triggered on appointment completion that initiates the billing workflow in Healthcare Billing Mojo for session-based claims generation.  
**Dependencies:** SCHED-013  
**Spec Gates:**
1. **Workflow:** Appointment Execution — triggers billing upon completion.
2. **CRM Timeline:** N/A — billing workflow writes its own entries; this is a trigger only.
3. **Right Level:** Universal — completion-trigger billing works for any service completion.

---

### SCHED-026: Waitlist Notification Workflow
**Category:** INTEGRATION  
**Size:** S  
**Description:** Build n8n workflow that detects slot availability changes (cancellations, block removals) and notifies waitlisted patients with matching provider/type preferences, marking entries as notified.  
**Dependencies:** SCHED-008, SCHED-014, SCHED-017  
**Spec Gates:**
1. **Workflow:** Waitlist — auto-notifies patients when matching slots open.
2. **CRM Timeline:** Writes "Waitlist notification sent" entry when patient is notified of available slot.
3. **Right Level:** Universal — slot-opening notification pattern generic.
```

```markdown
# DEPENDENCY-GRAPH.md

# Scheduling Mojo Dependency Graph

## Build Execution Order

### Phase 1: Data Foundation (All Parallel)
**Start:** Immediate  
**Stories:**
- SCHED-001 (SM Appointment Type DocType)
- SCHED-002 (SM Provider Schedule DocType)
- SCHED-003 (SM Schedule Block DocType)
- SCHED-004 (SM Appointment DocType) — depends on 001, 002
- SCHED-005 (SM Waitlist Entry DocType)

**Phase 1 Exit Criteria:** All DocTypes created and migrated in Frappe.

---

### Phase 2: Core Backend APIs (All Parallel, depends on Phase 1)
**Start:** After Phase 1 complete  
**Stories:**
- SCHED-006 (Provider Schedule Template API) — depends on 002
- SCHED-007 (Schedule Block API) — depends on 003
- SCHED-008 (Available Slots Query API) — depends on 002, 003, 004
- SCHED-009 (Appointment Create API) — depends on 001, 004
- SCHED-010 (Appointment Read API) — depends on 004
- SCHED-011 (Appointment Confirm API) — depends on 004
- SCHED-012 (Appointment Start API) — depends on 004
- SCHED-013 (Appointment Complete API) — depends on 004
- SCHED-014 (Appointment Cancel API) — depends on 004
- SCHED-015 (Appointment No-Show API) — depends on 004
- SCHED-016 (Provider List API) — depends on 002
- SCHED-017 (Waitlist Management API) — depends on 005

**Phase 2 Exit Criteria:** All MAL endpoints respond correctly in isolation; CRUD operations verified on all DocTypes.

---

### Phase 3: Frontend Layer (All Parallel, depends on Phase 2)
**Start:** After Phase 2 complete  
**Stories:**
- SCHED-018 (AvailabilityCalendar Component) — depends on 008
- SCHED-019 (ProviderScheduleEditor Component) — depends on 006
- SCHED-022 (WaitlistPanel Component) — depends on 017

**Phase 3 Note:** SCHED-020 and SCHED-021 depend on other frontend components and will execute in Phase 4.

---

### Phase 4: Composite Frontend & Integration (Parallel Tracks)

#### Track A: Complex Frontend (depends on Phase 3 and Phase 2)
**Start:** After Phase 2 and Phase 3 (partial) complete  
**Stories:**
- SCHED-020 (AppointmentBookingForm Component) — depends on 009, 018
- SCHED-021 (AppointmentCard Component) — depends on 010, 011, 012, 013, 014, 015

#### Track B: n8n Integration Workflows (depends on Phase 2)
**Start:** After Phase 2 complete  
**Stories:**
- SCHED-023 (Appointment Reminder Workflow) — depends on 011
- SCHED-024 (Telehealth Link Generation) — depends on 009
- SCHED-025 (Billing Trigger Workflow) — depends on 013
- SCHED-026 (Waitlist Notification Workflow) — depends on 008, 014, 017

**Phase 4 Exit Criteria:** Full user journey testable: provider setup → booking → confirmation → reminders → completion → billing trigger.

---

## Visual Dependency Map

```
Phase 1: CONFIG
[SCHED-001] [SCHED-002] [SCHED-003] [SCHED-004] [SCHED-005]
      |          |          |            |            |
      v          v          v            v            v
Phase 2: BACKEND (all parallel from here down)
[SCHED-006] <- [SCHED-002]
[SCHED-007] <- [SCHED-003]
[SCHED-008] <- [SCHED-002] + [SCHED-003] + [SCHED-004]
[SCHED-009] <- [SCHED-001] + [SCHED-004]
[SCHED-010] <- [SCHED-004]
[SCHED-011] <- [SCHED-004]
[SCHED-012] <- [SCHED-004]
[SCHED-013] <- [SCHED-004]
[SCHED-014] <- [SCHED-004]
[SCHED-015] <- [SCHED-004]
[SCHED-016] <- [SCHED-002]
[SCHED-017] <- [SCHED-005]
      |
      v
Phase 3: FRONTEND Foundation
[SCHED-018] <- [SCHED-008]
[SCHED-019] <- [SCHED-006]
[SCHED-022] <- [SCHED-017]
      |
      v
Phase 4: Composite Components & Integration (parallel tracks)
Track A:
[SCHED-020] <- [SCHED-009] + [SCHED-018]
[SCHED-021] <- [SCHED-010] + [SCHED-011] + [SCHED-012] + [SCHED-013] + [SCHED-014] + [SCHED-015]

Track B:
[SCHED-023] <- [SCHED-011]
[SCHED-024] <- [SCHED-009]
[SCHED-025] <- [SCHED-013]
[SCHED-026] <- [SCHED-008] + [SCHED-014] + [SCHED-017]
```

## Critical Path

The longest dependency chain determines minimum build time:

**SCHED-002 → SCHED-008 → SCHED-018 → SCHED-020**  
*(Provider Schedule → Slots Query → Calendar → Booking Form)*

**SCHED-004 → SCHED-009 → SCHED-024**  
*(Appointment DocType → Create API → Telehealth Workflow)*

**SCHED-004 → SCHED-011 → SCHED-023**  
*(Appointment DocType → Confirm API → Reminder Workflow)*

**SCHED-004 → SCHED-013 → SCHED-025**  
*(Appointment DocType → Complete API → Billing Trigger)*

Parallel execution groups:
- Phase 1: 5 stories parallel
- Phase 2: 13 stories parallel (after Phase 1)
- Phase 3: 3 stories parallel (after Phase 2)
- Phase 4: Track A (2 stories, serial within track) + Track B (4 stories, parallel within track), both starting after Phase 2/3 complete.
```