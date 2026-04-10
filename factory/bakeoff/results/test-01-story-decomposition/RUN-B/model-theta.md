model: model-theta
test: 01-story-decomposition
run: B
date: 2026-04-09

# STORIES.md

## Scheduling Mojo Atomic Stories

### BACKEND Stories

**SCHED-001: SM Appointment DocType**
- **Category**: BACKEND
- **Size**: XS
- **Description**: Create the SM Appointment DocType with all required fields to track appointment lifecycle.
- **Dependencies**: None
- **Spec Gates**:
  1. **Workflow**: Serves the core appointment lifecycle workflow (Requested → Confirmed → In Progress → Completed/Cancelled/No-Show).
  2. **CRM Timeline**: N/A (DocType creation doesn't write to timeline; actual appointment events will write via state changes).
  3. **Right Level**: Universal (appointment tracking is generic across all businesses).

**SCHED-002: SM Provider Schedule DocType**
- **Category**: BACKEND
- **Size**: XS
- **Description**: Create the SM Provider Schedule DocType for weekly template configuration (days available, hours, appointment types allowed).
- **Dependencies**: None
- **Spec Gates**:
  1. **Workflow**: Enables provider setup workflow for configuring availability templates.
  2. **CRM Timeline**: N/A (configuration DocType).
  3. **Right Level**: Universal (provider scheduling templates are generic).

**SCHED-003: SM Schedule Block DocType**
- **Category**: BACKEND
- **Size**: XS
- **Description**: Create the SM Schedule Block DocType for individual blocked time slots (vacation, lunch, admin time).
- **Dependencies**: None
- **Spec Gates**:
  1. **Workflow**: Enables provider setup workflow for blocking off individual time slots.
  2. **CRM Timeline**: N/A (configuration DocType).
  3. **Right Level**: Universal (time blocking is generic).

**SCHED-004: SM Appointment Type DocType**
- **Category**: BACKEND
- **Size**: XS
- **Description**: Create the SM Appointment Type DocType for configurable appointment types (duration, telehealth flag, buffer minutes, location type).
- **Dependencies**: None
- **Spec Gates**:
  1. **Workflow**: Provides configuration for appointment booking workflow to validate against allowed types.
  2. **CRM Timeline**: N/A (configuration DocType).
  3. **Right Level**: Universal (appointment type configuration is generic; telehealth flag makes it vertical-configurable for behavioral health).

**SCHED-005: SM Waitlist Entry DocType**
- **Category**: BACKEND
- **Size**: XS
- **Description**: Create the SM Waitlist Entry DocType to track patients waiting for available appointment slots.
- **Dependencies**: None
- **Spec Gates**:
  1. **Workflow**: Enables waitlist workflow for patients when no slots are available.
  2. **CRM Timeline**: N/A (waitlist entry creation/deletion will write via separate endpoints).
  3. **Right Level**: Universal (waitlist functionality is generic).

**SCHED-006: Appointment Slot Availability API**
- **Category**: BACKEND
- **Size**: S
- **Description**: Implement GET `/api/modules/scheduling/slots` endpoint to query available slots by provider, date range, and appointment type.
- **Dependencies**: SCHED-001, SCHED-002, SCHED-003, SCHED-004
- **Spec Gates**:
  1. **Workflow**: Serves appointment booking workflow by providing available slots for selection.
  2. **CRM Timeline**: N/A (query endpoint doesn't write).
  3. **Right Level**: Universal (slot availability calculation is generic).

**SCHED-007: Appointment Creation API**
- **Category**: BACKEND
- **Size**: S
- **Description**: Implement POST `/api/modules/scheduling/appointment/create` endpoint to create appointments in Requested state.
- **Dependencies**: SCHED-001, SCHED-006
- **Spec Gates**:
  1. **Workflow**: Enables appointment booking workflow by creating new appointments.
  2. **CRM Timeline**: Writes "Appointment created" event to client CRM timeline.
  3. **Right Level**: Universal (appointment creation is generic).

**SCHED-008: Appointment State Transition APIs (Confirm/Start/Complete)**
- **Category**: BACKEND
- **Size**: S
- **Description**: Implement PUT endpoints for `/confirm`, `/start`, and `/complete` appointment state transitions.
- **Dependencies**: SCHED-001, SCHED-007
- **Spec Gates**:
  1. **Workflow**: Enables appointment confirmation, execution, and completion workflow steps.
  2. **CRM Timeline**: Writes "Appointment confirmed" and "Appointment completed" events to CRM timeline.
  3. **Right Level**: Universal (state transitions are generic).

**SCHED-009: Appointment State Transition APIs (Cancel/No-Show)**
- **Category**: BACKEND
- **Size**: S
- **Description**: Implement PUT endpoints for `/cancel` and `/no-show` appointment state transitions with reason codes.
- **Dependencies**: SCHED-001, SCHED-007
- **Spec Gates**:
  1. **Workflow**: Enables cancellation and no-show workflow steps.
  2. **CRM Timeline**: Writes "Appointment cancelled" and "No-show" events to CRM timeline with reasons.
  3. **Right Level**: Universal (cancellation handling is generic).

**SCHED-010: Appointment Retrieval API**
- **Category**: BACKEND
- **Size**: XS
- **Description**: Implement GET `/api/modules/scheduling/appointment/{id}` endpoint to fetch appointment details.
- **Dependencies**: SCHED-001
- **Spec Gates**:
  1. **Workflow**: Supports all appointment workflows by providing appointment data to UI.
  2. **CRM Timeline**: N/A (read-only endpoint).
  3. **Right Level**: Universal (data retrieval is generic).

**SCHED-011: Provider List and Schedule APIs**
- **Category**: BACKEND
- **Size**: S
- **Description**: Implement GET `/api/modules/scheduling/providers` and GET `/api/modules/scheduling/provider/{id}/schedule` endpoints.
- **Dependencies**: SCHED-002, SCHED-003
- **Spec Gates**:
  1. **Workflow**: Supports provider selection in booking workflow and schedule viewing.
  2. **CRM Timeline**: N/A (read-only endpoints).
  3. **Right Level**: Universal (provider listing is generic).

**SCHED-012: Provider Schedule Management APIs**
- **Category**: BACKEND
- **Size**: S
- **Description**: Implement POST `/api/modules/scheduling/provider/{id}/schedule`, POST `/api/modules/scheduling/provider/{id}/block`, and DELETE `/api/modules/scheduling/provider/{id}/block/{block_id}` endpoints.
- **Dependencies**: SCHED-002, SCHED-003
- **Spec Gates**:
  1. **Workflow**: Enables provider setup workflow for configuring weekly templates and blocking time.
  2. **CRM Timeline**: N/A (configuration endpoints; schedule changes don't write to patient timeline).
  3. **Right Level**: Universal (schedule management is generic).

**SCHED-013: Waitlist Management APIs**
- **Category**: BACKEND
- **Size**: S
- **Description**: Implement POST `/api/modules/scheduling/waitlist/join` and DELETE `/api/modules/scheduling/waitlist/{id}` endpoints.
- **Dependencies**: SCHED-005
- **Spec Gates**:
  1. **Workflow**: Enables waitlist workflow for joining and removing from waitlist.
  2. **CRM Timeline**: Writes "Added to waitlist" and "Removed from waitlist" events to CRM timeline.
  3. **Right Level**: Universal (waitlist management is generic).

### FRONTEND Stories

**SCHED-014: AvailabilityCalendar Component**
- **Category**: FRONTEND
- **Size**: S
- **Description**: Build React component showing weekly view of provider availability with slot selection.
- **Dependencies**: SCHED-006, SCHED-011
- **Spec Gates**:
  1. **Workflow**: Serves appointment booking workflow by visualizing available slots.
  2. **CRM Timeline**: N/A (component doesn't write; API calls it uses will write).
  3. **Right Level**: Universal (calendar UI is generic).

**SCHED-015: AppointmentBookingForm Component**
- **Category**: FRONTEND
- **Size**: S
- **Description**: Build React component for slot + patient + type selection with confirmation step.
- **Dependencies**: SCHED-006, SCHED-007, SCHED-011, SCHED-014
- **Spec Gates**:
  1. **Workflow**: Enables appointment booking workflow through UI form.
  2. **CRM Timeline**: N/A (component doesn't write; API calls it uses will write).
  3. **Right Level**: Universal (booking form is generic).

**SCHED-016: AppointmentCard Component**
- **Category**: FRONTEND
- **Size**: S
- **Description**: Build React component displaying appointment details with status-aware action buttons.
- **Dependencies**: SCHED-008, SCHED-009, SCHED-010
- **Spec Gates**:
  1. **Workflow**: Supports appointment confirmation, execution, and cancellation workflows through action buttons.
  2. **CRM Timeline**: N/A (component doesn't write; API calls it uses will write).
  3. **Right Level**: Universal (appointment card UI is generic).

**SCHED-017: ProviderScheduleEditor Component**
- **Category**: FRONTEND
- **Size**: S
- **Description**: Build React component for weekly template management interface.
- **Dependencies**: SCHED-011, SCHED-012
- **Spec Gates**:
  1. **Workflow**: Enables provider setup workflow through UI interface.
  2. **CRM Timeline**: N/A (component doesn't write; configuration doesn't go to patient timeline).
  3. **Right Level**: Universal (schedule editor UI is generic).

**SCHED-018: WaitlistPanel Component**
- **Category**: FRONTEND
- **Size**: S
- **Description**: Build React component to view and manage waitlist entries.
- **Dependencies**: SCHED-013
- **Spec Gates**:
  1. **Workflow**: Enables waitlist management workflow through UI.
  2. **CRM Timeline**: N/A (component doesn't write; API calls it uses will write).
  3. **Right Level**: Universal (waitlist UI is generic).

### INTEGRATION Stories

**SCHED-019: Appointment Reminder Notifications Workflow**
- **Category**: INTEGRATION
- **Size**: S
- **Description**: Build n8n workflow to send appointment reminders (24h and 1h before) via email and SMS.
- **Dependencies**: SCHED-001
- **Spec Gates**:
  1. **Workflow**: Supports appointment confirmation workflow by sending reminders.
  2. **CRM Timeline**: Writes "Appointment reminder sent" event to CRM timeline.
  3. **Right Level**: Universal (reminder notifications are generic; channel selection is configurable).

**SCHED-020: Telehealth Link Generation Workflow**
- **Category**: INTEGRATION
- **Size**: S
- **Description**: Build n8n workflow to generate video links for telehealth appointments via video provider API.
- **Dependencies**: SCHED-001, SCHED-004
- **Spec Gates**:
  1. **Workflow**: Enables telehealth appointment execution workflow by providing video links.
  2. **CRM Timeline**: Writes "Telehealth link generated" event to CRM timeline.
  3. **Right Level**: Universal (link generation is generic; specific video provider is configurable for vertical).

**SCHED-021: Billing Trigger on Completion Workflow**
- **Category**: INTEGRATION
- **Size**: S
- **Description**: Build n8n workflow to trigger billing workflow when appointments are marked completed.
- **Dependencies**: SCHED-001, SCHED-008
- **Spec Gates**:
  1. **Workflow**: Connects appointment completion workflow to billing workflow.
  2. **CRM Timeline**: Writes "Billing triggered" event to CRM timeline.
  3. **Right Level**: Universal (workflow triggering is generic; specific billing system integration is configurable).

**SCHED-022: Waitlist Slot-Opening Notification Workflow**
- **Category**: INTEGRATION
- **Size**: S
- **Description**: Build n8n workflow to notify waitlisted patients when matching slots open.
- **Dependencies**: SCHED-001, SCHED-005, SCHED-009
- **Spec Gates**:
  1. **Workflow**: Supports waitlist workflow by auto-notifying patients of available slots.
  2. **CRM Timeline**: Writes "Waitlist notification sent" event to CRM timeline.
  3. **Right Level**: Universal (notification workflow is generic).

### GLUE Stories

**SCHED-023: CRM Timeline Integration for Appointment Events**
- **Category**: GLUE
- **Size**: S
- **Description**: Implement Frappe server scripts to write to CRM timeline on appointment state changes (created, confirmed, completed, cancelled, no-show).
- **Dependencies**: SCHED-001, SCHED-007, SCHED-008, SCHED-009
- **Spec Gates**:
  1. **Workflow**: Ensures all appointment workflow steps are recorded in CRM per platform mandate.
  2. **CRM Timeline**: Writes all appointment events to CRM timeline as specified in research.
  3. **Right Level**: Universal (CRM integration pattern is generic).

**SCHED-024: FHIR Mapping for SM Appointment**
- **Category**: GLUE
- **Size**: S
- **Description**: Implement mapping between SM Appointment DocType and FHIR R4 Appointment resource via Medplum.
- **Dependencies**: SCHED-001
- **Spec Gates**:
  1. **Workflow**: Enables clinical data interoperability workflow by syncing appointments to FHIR.
  2. **CRM Timeline**: N/A (FHIR mapping doesn't write to CRM timeline).
  3. **Right Level**: Universal (FHIR mapping is generic; specific resource mapping is standardized).

**SCHED-025: Recurring Appointment Series Logic**
- **Category**: GLUE
- **Size**: S
- **Description**: Implement server-side logic for handling recurring appointments (weekly/biweekly series) with edit-one vs edit-all functionality.
- **Dependencies**: SCHED-001, SCHED-007, SCHED-009
- **Spec Gates**:
  1. **Workflow**: Enables recurring appointment booking and management workflow.
  2. **CRM Timeline**: Writes series creation and instance modification events to CRM timeline.
  3. **Right Level**: Universal (recurring logic is generic).

**SCHED-026: Rescheduling Logic**
- **Category**: GLUE
- **Size**: S
- **Description**: Implement server-side logic for rescheduling appointments (cancel existing, create new, preserve link to original).
- **Dependencies**: SCHED-001, SCHED-007, SCHED-009
- **Spec Gates**:
  1. **Workflow**: Enables appointment rescheduling workflow.
  2. **CRM Timeline**: Writes "Appointment rescheduled" event linking old and new appointments.
  3. **Right Level**: Universal (rescheduling logic is generic).

---

Now I need to create the DEPENDENCY-GRAPH.md showing build order and parallel execution groups. Let me analyze the dependencies and create groups that can be built in parallel.

Looking at dependencies:
1. DocTypes (001-005) have no dependencies → Group 1
2. Core APIs depend on DocTypes → Group 2 after Group 1
3. Frontend depends on APIs → Group 3 after Group 2  
4. Integrations depend on DocTypes and state changes → Can run parallel with Group 3
5. Glue stories depend on multiple components → Group 4 after Groups 2-3

Let me create the dependency graph.# DEPENDENCY-GRAPH.md

## Scheduling Mojo Build Order

### Group 1: Foundation (Parallel)
**All stories can be built in parallel - no dependencies**
- **SCHED-001**: SM Appointment DocType
- **SCHED-002**: SM Provider Schedule DocType  
- **SCHED-003**: SM Schedule Block DocType
- **SCHED-004**: SM Appointment Type DocType
- **SCHED-005**: SM Waitlist Entry DocType

**Completion of Group 1 unblocks Group 2**

### Group 2: Core Backend APIs (Parallel within group)
**All stories depend on Group 1 DocTypes**
- **SCHED-006**: Appointment Slot Availability API *(depends on 001, 002, 003, 004)*
- **SCHED-007**: Appointment Creation API *(depends on 001, 006)*
- **SCHED-010**: Appointment Retrieval API *(depends on 001)*
- **SCHED-011**: Provider List and Schedule APIs *(depends on 002, 003)*
- **SCHED-012**: Provider Schedule Management APIs *(depends on 002, 003)*
- **SCHED-013**: Waitlist Management APIs *(depends on 005)*

**Note**: SCHED-007 depends on SCHED-006 for slot validation

### Group 3: State Management APIs (Parallel)
**Depend on appointment creation (007)**
- **SCHED-008**: Appointment State Transition APIs (Confirm/Start/Complete) *(depends on 001, 007)*
- **SCHED-009**: Appointment State Transition APIs (Cancel/No-Show) *(depends on 001, 007)*

**Completion of Groups 2-3 unblocks Groups 4, 5, and 6**

### Group 4: Frontend Components (Parallel)
**Depend on relevant APIs from Groups 2-3**
- **SCHED-014**: AvailabilityCalendar Component *(depends on 006, 011)*
- **SCHED-015**: AppointmentBookingForm Component *(depends on 006, 007, 011, 014)*
- **SCHED-016**: AppointmentCard Component *(depends on 008, 009, 010)*
- **SCHED-017**: ProviderScheduleEditor Component *(depends on 011, 012)*
- **SCHED-018**: WaitlistPanel Component *(depends on 013)*

### Group 5: Integration Workflows (Parallel)
**Depend on DocTypes and state transitions**
- **SCHED-019**: Appointment Reminder Notifications Workflow *(depends on 001)*
- **SCHED-020**: Telehealth Link Generation Workflow *(depends on 001, 004)*
- **SCHED-021**: Billing Trigger on Completion Workflow *(depends on 001, 008)*
- **SCHED-022**: Waitlist Slot-Opening Notification Workflow *(depends on 001, 005, 009)*

### Group 6: Glue and Advanced Logic (Parallel)
**Depend on multiple core components**
- **SCHED-023**: CRM Timeline Integration for Appointment Events *(depends on 001, 007, 008, 009)*
- **SCHED-024**: FHIR Mapping for SM Appointment *(depends on 001)*
- **SCHED-025**: Recurring Appointment Series Logic *(depends on 001, 007, 009)*
- **SCHED-026**: Rescheduling Logic *(depends on 001, 007, 009)*

## Dependency Visualization

```
Group 1 (Foundation)
├── SCHED-001 ─┐
├── SCHED-002 ─┤
├── SCHED-003 ─┤
├── SCHED-004 ─┤
└── SCHED-005 ─┘
    ↓
Group 2 (Core APIs)
├── SCHED-006 ─┐
├── SCHED-007 ─┤
├── SCHED-010 ─┤
├── SCHED-011 ─┤
├── SCHED-012 ─┤
└── SCHED-013 ─┘
    ↓
Group 3 (State APIs)
├── SCHED-008
└── SCHED-009
    ↓
    ┌─────────────────────────────────────────────────────────────┐
    ↓                               ↓                             ↓
Group 4 (Frontend)           Group 5 (Integrations)        Group 6 (Glue)
├── SCHED-014                ├── SCHED-019                  ├── SCHED-023
├── SCHED-015                ├── SCHED-020                  ├── SCHED-024
├── SCHED-016                ├── SCHED-021                  ├── SCHED-025
├── SCHED-017                └── SCHED-022                  └── SCHED-026
└── SCHED-018
```

## Parallel Execution Strategy

1. **Phase 1**: Start all Group 1 stories simultaneously (5 parallel builds)
2. **Phase 2**: Once Group 1 completes, start all Group 2 stories (6 parallel builds)
3. **Phase 3**: Once SCHED-007 completes, start Group 3 stories (2 parallel builds)
4. **Phase 4**: Once Groups 2-3 complete, start Groups 4, 5, and 6 simultaneously:
   - Group 4: 5 frontend builds in parallel
   - Group 5: 4 integration builds in parallel  
   - Group 6: 4 glue/builds in parallel

## Critical Path
The longest dependency chain determines minimum timeline:
**SCHED-001 → SCHED-006 → SCHED-007 → SCHED-008/SCHED-009 → SCHED-023**

This critical path includes:
1. Appointment DocType creation
2. Slot availability API
3. Appointment creation API  
4. State transition APIs
5. CRM timeline integration

## Build Factory Recommendations

1. **Assign multiple agents** to work on parallel groups simultaneously
2. **Group 1** (DocTypes) can be built by 5 different backend agents
3. **Group 2** (APIs) can be distributed across 6 backend agents
4. **Frontend agents** can start on Group 4 once APIs are ready
5. **Integration specialists** can work on Group 5 independently
6. **Senior agents** should handle Group 6 (glue logic) which requires understanding of multiple components

## Testing Strategy
- Group 1: Each DocType can be tested independently
- Group 2: API endpoints can be tested with mock data
- Group 3: State transitions require appointment creation first
- Groups 4-6: Require completion of prerequisite groups for full integration testing

This decomposition allows for maximum parallelization while maintaining logical dependency order. Each story is independently testable and can be assigned to different build factory agents.