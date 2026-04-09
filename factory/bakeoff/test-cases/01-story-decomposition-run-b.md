# Test 01: Story Decomposition — Run B (Scheduling Mojo)

**Task type:** Architectural reasoning
**Evaluates:** Can the model break a complex appointment scheduling capability into atomic, independently testable stories following Spark Mojo's factory rules?

**This is Run B. Run A uses CRM Client Identity. Run C uses Knowledge Base Wiki.**

---

## Input Files

Provide as context (rules reference only):
- `factory/guardrails/PLATFORM-GUARDRAILS.md`

The research context is embedded in the prompt below. No additional files needed.

---

## Prompt (give this to the model, nothing else)
```
You are the Story Decomposer for the Spark Mojo build factory. Read the Scheduling Mojo research summary below. Break this capability into atomic, independently testable stories for the build factory.
--- SCHEDULING MOJO RESEARCH SUMMARY ---
CAPABILITY: Scheduling Mojo VERTICAL: Behavioral Health (first instance) CORE PURPOSE: Allows practices to manage provider availability, book appointments, and track the full appointment lifecycle from request through completion or cancellation.
WORKFLOWS:
1. Provider Setup: Admin configures provider weekly schedule templates (days available, hours, appointment types allowed). Admin blocks off individual time slots (vacation, lunch, admin time).
2. Appointment Booking: Receptionist or patient searches available slots by provider, date range, and appointment type. System validates against provider schedule and existing bookings. Appointment created in Requested state.
3. Appointment Confirmation: Provider or admin confirms a Requested appointment. Status moves to Confirmed. Reminder notification queued.
4. Appointment Execution: On the day, appointment moves to In Progress when session starts. Moves to Completed when clinician marks it done. Completion triggers billing workflow (session completion is the billing trigger per platform vocabulary).
5. Cancellation and No-Show: Receptionist or patient cancels with reason code. Clinician marks no-show. Each has distinct state transitions and requires CRM timeline entries.
6. Rescheduling: Cancel existing appointment, create new one, preserve link to original if part of a recurring series.
7. Recurring Appointments: Weekly or biweekly series. User chooses to edit one instance or all future instances.
8. Telehealth Link Generation: For telehealth appointment types, a video link is generated and attached to the appointment. Link surfaces in patient reminder notifications.
9. Waitlist: If no slots available, patient joins a waitlist for a provider+type combination. Auto-notified when a matching slot opens.
APPOINTMENT STATUS LIFECYCLE: Requested → Confirmed → In Progress → Completed Requested → Cancelled Confirmed → Cancelled Confirmed → No-Show Completed, Cancelled, and No-Show are terminal states.
DOCTYPE REQUIREMENTS:
* SM Appointment: main record (provider_id, patient_id, appointment_type, start_datetime, end_datetime, status, location_type, telehealth_link, notes, cancellation_reason, series_id, recurring_parent_id)
* SM Provider Schedule: weekly template (provider_id, day_of_week, start_time, end_time, appointment_types_allowed)
* SM Schedule Block: individual blocked time (provider_id, date, start_time, end_time, reason)
* SM Appointment Type: configurable types (name, duration_minutes, is_telehealth, buffer_minutes_after, default_location_type)
* SM Waitlist Entry: patient_id, provider_id, appointment_type, requested_date_from, requested_date_to, notified
ABSTRACTION LAYER ENDPOINTS NEEDED:
* GET /api/modules/scheduling/slots (query available slots by provider, date range, appointment type)
* POST /api/modules/scheduling/appointment/create
* GET /api/modules/scheduling/appointment/{id}
* PUT /api/modules/scheduling/appointment/{id}/confirm
* PUT /api/modules/scheduling/appointment/{id}/start
* PUT /api/modules/scheduling/appointment/{id}/complete
* PUT /api/modules/scheduling/appointment/{id}/cancel
* PUT /api/modules/scheduling/appointment/{id}/no-show
* GET /api/modules/scheduling/providers (list with availability metadata)
* GET /api/modules/scheduling/provider/{id}/schedule
* POST /api/modules/scheduling/provider/{id}/schedule
* POST /api/modules/scheduling/provider/{id}/block
* DELETE /api/modules/scheduling/provider/{id}/block/{block_id}
* POST /api/modules/scheduling/waitlist/join
* DELETE /api/modules/scheduling/waitlist/{id}
FRONTEND COMPONENTS NEEDED:
* AvailabilityCalendar: weekly view of provider availability with slot selection
* AppointmentBookingForm: slot + patient + type picker with confirmation step
* AppointmentCard: appointment detail display with status-aware action buttons
* ProviderScheduleEditor: weekly template management interface
* WaitlistPanel: view and manage waitlist entries
INTEGRATIONS (all via n8n — Frappe never calls these directly):
* Appointment reminder notifications (24h and 1h before, email + SMS)
* Telehealth link generation (via video provider API)
* Billing trigger on completion (kicks off billing workflow in Healthcare Billing Mojo)
* Waitlist slot-opening notification (when a slot opens, notify waitlisted patients)
FHIR: SM Appointment maps to FHIR R4 Appointment resource via Medplum
CRM TIMELINE REQUIREMENTS:
* Appointment created: write to client CRM timeline
* Appointment confirmed: write to client CRM timeline
* Appointment completed: write to client CRM timeline (include type and duration)
* Appointment cancelled: write to client CRM timeline (include reason)
* No-show: write to client CRM timeline
--- END RESEARCH SUMMARY ---
ATOMIC means:
* ONE endpoint, OR one React component, OR one n8n workflow, OR one DocType. Never multiple.
* Completable in 3-8 build iterations.
* Independently testable. Tests can run without other stories being complete.
* Self-contained spec. The implementing agent needs only this story's file.
SPLIT rules:
* More than 3 files to create: split it.
* More than 2 API endpoints: split it.
* Both backend AND frontend work: split into two stories.
* Both a DocType change AND an n8n workflow: split it.
CATEGORIES: BACKEND, FRONTEND, INTEGRATION, AI, CONFIG, GLUE
Every story must answer these three Spec Gates:
1. Workflow: What workflow does this story serve?
2. CRM Timeline: What does this story write to the CRM timeline? (N/A is valid with explanation)
3. Right Level: Universal, vertical, client, or role level?
Output a STORIES.md file with:
* Story ID (SCHED-001, SCHED-002, etc.), title, category, size (S or XS only)
* One-sentence description
* Dependencies (IDs or None)
* Spec Gate answers (one line each)
Then output a DEPENDENCY-GRAPH.md showing build order and parallel execution groups.
```

---

## Scoring Rubric

### Category A: Atomicity (0-5)
- 5: All stories are size S or XS or M, no story has both backend and frontend, no story has more than 2 endpoints
- 4: 2-3 stories are slightly over-scoped but splittable
- 3: Several stories are too large; would cause build failures
- 2: Stories are feature-sized, not work-item-sized
- 1: Monolithic decomposition; not usable

### Category B: Completeness (0-5)
- 5: All 15 endpoints map to stories; all 5 DocTypes have creation stories; all 4 n8n integrations have INTEGRATION stories
- 4: 1-2 endpoints or integrations missing
- 3: Noticeable gaps; significant workflows not represented
- 2: Major sections of the research unaddressed
- 1: Incomplete; more than half of the capability missing

### Category C: Spec Gate Compliance (0-5)
- 5: All three gates answered for every story; CRM timeline entries explicitly addressed for the 5 lifecycle events listed in the research
- 4: All stories have all three gates; 2-3 answers are thin
- 3: Spec gates present but several are placeholder answers
- 2: Spec gates inconsistently applied
- 1: Spec gates absent or ignored

### Category D: Guardrail Awareness (0-5)
- 5: No story routes external calls through Frappe (all via n8n); telehealth link generation correctly identified as n8n INTEGRATION story; billing trigger correctly identified as n8n INTEGRATION story; no TypeScript
- 4: One minor guardrail miss
- 3: 1-2 guardrail violations embedded in stories
- 2: Multiple guardrail violations
- 1: Fundamental guardrail violations throughout

### Category E: Dependency Graph Quality (0-5)
- 5: Valid DAG; DocTypes before endpoints before frontend; n8n integration stories correctly depend on endpoint stories; parallel groups identified
- 4: Valid DAG but parallel groups not well identified
- 3: Mostly valid but some ordering issues
- 2: DAG has circular dependencies or logical ordering errors
- 1: No dependency graph or completely wrong

**Maximum score: 25**
**Pass threshold: 18/25**

---

## What Good Looks Like

A passing submission will produce 30-50 atomic stories for Scheduling Mojo.
It will separate each status transition into its own BACKEND story (confirm, start, complete, cancel, no-show are each distinct endpoints and distinct stories).
It will identify the 4 n8n INTEGRATION stories (reminders, telehealth link, billing trigger, waitlist notification) as distinct from BACKEND and FRONTEND stories.
It will correctly identify the FHIR mapping as a GLUE story that connects SM Appointment creation to Medplum.
The dependency graph will show: DocTypes first, then BACKEND endpoints, then FRONTEND components, then GLUE stories.
