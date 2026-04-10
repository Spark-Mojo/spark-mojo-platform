# Test 01: Story Decomposition — Scoring Results

Scored by: Claude Opus 4.6 (1M context)
Date: 2026-04-09

---

## MODEL: model-alpha | TEST: 01 | RUN: A
Atomicity: 4/5
  Evidence: 31 stories, mostly XS/S. CRM-011 bundles Organization list+detail (2 endpoints). CRM-015 bundles GET+POST activities (2 endpoints). All backend/frontend properly separated. No story exceeds M.
Completeness: 5/5
  Evidence: All workflows covered: Contact/Lead/Org CRUD, Global Search, Activity Timeline, Vocabulary, Stages, Duplicate Detection+Merge, Consent, Healthcare custom fields, Lead conversion, Clinical/Billing/Scheduling event capture. 31 stories span the full research scope.
Spec Gate Compliance: 5/5
  Evidence: All three gates answered for every story with substantive answers. Workflow names specific workflow. CRM Timeline distinguishes read (N/A) vs write actions. Right Level distinguishes Universal/Vertical/Role.
Guardrail Awareness: 5/5
  Evidence: No React-to-Frappe direct calls. n8n workflows correctly categorized as INTEGRATION. CRM timeline write-back addressed. No TypeScript. Vocabulary abstraction identified.
Dependency Graph Quality: 5/5
  Evidence: Valid DAG with 5 parallel groups. Critical path articulated with multiple chains. No circular dependencies. Backend-before-frontend ordering respected.
TOTAL: 24/25
Notable strength: Exceptionally clean table format with all spec gates inline, making every story independently reviewable.
Notable failure: Minor — CRM-011 bundles two Organization endpoints.

---

## MODEL: model-beta | TEST: 01 | RUN: A
Atomicity: 5/5
  Evidence: 29 stories, all S or XS. Each story covers 1-2 endpoints max. Clean backend/frontend/integration separation. Contact reads and writes properly separated. AI stories appropriately isolated.
Completeness: 5/5
  Evidence: Full coverage including AI stories (summary, classification, duplicate scoring), GLUE story for server hooks, 6 integration workflows covering all cross-system event capture. Scheduling activity capture is a standout inclusion. 29 stories miss nothing from the research.
Spec Gate Compliance: 5/5
  Evidence: Every story has all three gates answered with specific, substantive answers. CRM Timeline answers are particularly strong — they name the exact activity text that would be written. Right Level correctly identifies vertical-conditional logic.
Guardrail Awareness: 5/5
  Evidence: Zero violations. React never calls Frappe. n8n correctly handles all cross-system workflows. CRM timeline is addressed comprehensively. GLUE story for server hooks shows deep platform awareness. No TypeScript.
Dependency Graph Quality: 5/5
  Evidence: 4-group DAG with visual ASCII art dependency map. Critical path clearly identified at 4 groups minimum. Excellent notes section explaining prioritization and soft external dependencies.
TOTAL: 25/25
Notable strength: Best-in-class dependency graph with visual ASCII art, lane summary table, and actionable notes on CRM-009 being the most depended-upon story.
Notable failure: None.

---

## MODEL: model-gamma | TEST: 01 | RUN: A
Atomicity: 4/5
  Evidence: 33 stories. Most properly sized XS/S. CRM-012 bundles "Cross-System Activity Capture" as a single M-sized story covering multiple n8n workflows for clinical, billing, scheduling, and task events — this should be 3-4 separate stories. Several M-sized frontend stories.
Completeness: 5/5
  Evidence: 33 stories cover all workflows including a Contact-to-Medplum sync (CRM-024) and Task Event activity capture (CRM-028) that other models missed. Healthcare custom fields, consent, duplicate detection, pipeline stages all present.
Spec Gate Compliance: 4/5
  Evidence: All three gates present for every story. However, Workflow answers are brief (e.g., "Contact lookup and management workflow") — less specific than the best models which name exact staff actions. CRM Timeline answers are adequate but sometimes terse.
Guardrail Awareness: 5/5
  Evidence: No guardrail violations. React calls MAL only. n8n handles all cross-system actions. CRM timeline addressed. No TypeScript. Roles and permissions story properly scoped.
Dependency Graph Quality: 3/5
  Evidence: No formal dependency graph was produced — only the story list with dependency fields per story. No parallel groups identified. No critical path analysis. No visual DAG. The dependency information exists in each story but is not synthesized into a build order.
TOTAL: 21/25
Notable strength: Most stories of any model (33), catching edge-case workflows like Contact-to-Medplum sync and Task event capture.
Notable failure: No dependency graph document produced — missing parallel groups, critical path, and build order analysis.

---

## MODEL: model-delta | TEST: 01 | RUN: A
Atomicity: 5/5
  Evidence: 27 stories, dominated by XS (22 stories). No story exceeds S. Each endpoint is its own story. Frontend stories are properly separated. The most aggressively atomic decomposition across all models.
Completeness: 5/5
  Evidence: All core workflows covered. Consent validation server hook (CRM-014) is a standout — correctly identified as a separate backend story. Healthcare custom fields, pipeline stages, duplicate detection, merge, activity timeline all present. AI stories included with appropriate OQ flags.
Spec Gate Compliance: 5/5
  Evidence: Exemplary gate answers. Every story has detailed, multi-sentence gate responses. CRM Timeline answers explain not just whether a write occurs but WHY (e.g., "the timeline activity for contact creation is written by CRM-022 (n8n), not this endpoint"). Right Level answers explain the mechanism.
Guardrail Awareness: 5/5
  Evidence: Zero violations. Includes explicit pre-condition notes about auth middleware (RC-024) and OQ flags on AI model names. CRM activity timeline correctly identified as mandatory infrastructure. Frappe/n8n boundary meticulously respected.
Dependency Graph Quality: 5/5
  Evidence: 5-wave DAG with ASCII box art. Full dependency reference table with both "depends on" and "unblocks" columns. Critical path clearly identified. MVP milestone definition included. Commissioning guidance with timing recommendations.
TOTAL: 25/25
Notable strength: Most detailed spec gate answers of any model — each gate response reads like a mini-specification. The "unblocks" column in the dependency table is uniquely valuable.
Notable failure: None (though the model required multiple retries to produce output per James's note).

---

## MODEL: model-epsilon | TEST: 01 | RUN: A
Atomicity: 3/5
  Evidence: 22 stories (21 commissionable). CRM-001 bundles Contact list+detail+create+update (4 endpoints) into one S-sized story. CRM-004 bundles Organization list+detail+create+search+vocabulary+stages (6+ endpoints). CRM-012 is M-sized covering multiple n8n workflows. Several M-sized frontend stories. Too many stories are too large.
Completeness: 4/5
  Evidence: Core workflows covered but only 22 stories for a capability that other models decompose into 27-33. Organization update is missing. Scheduling event capture not separated. The coarser granularity means some workflows are bundled rather than individually addressable.
Spec Gate Compliance: 5/5
  Evidence: All three gates answered for every story with good detail. Spec gates are well-written with clear workflow identification, CRM timeline specifics, and right-level reasoning. AI stories correctly flagged as deferred with OQ reference.
Guardrail Awareness: 5/5
  Evidence: No violations. React calls MAL only. n8n handles cross-system work. CRM timeline addressed. No TypeScript. AI safety review referenced. Platform boundary rules respected.
Dependency Graph Quality: 4/5
  Evidence: Lane-based build order with 8 lanes and 6 groups. Visual graph attempted but formatting is somewhat confused. Critical path identified. "What Can Ship Independently" table is a unique and valuable addition. However, some dependency chains seem questionable (CRM-010 depends on CRM-011 but CRM-011 depends on CRM-002 — circular potential in the UI).
TOTAL: 21/25
Notable strength: "What Can Ship Independently" table showing incremental delivery milestones — uniquely practical for Ralph orchestration.
Notable failure: CRM-001 and CRM-004 are too large — bundling 4-6 endpoints violates the "no more than 2 endpoints" rule.

---

## MODEL: model-zeta | TEST: 01 | RUN: A
Atomicity: 4/5
  Evidence: 39 stories — the most of any model. Very granular, mostly S and XS. However, the sheer count (39) suggests over-decomposition: 10 frontend stories where most models have 3-4 is excessive. Some stories are trivially small (CRM-030 Organization List is XS, CRM-031 Organization Detail is XS — could be one story).
Completeness: 5/5
  Evidence: Extremely thorough. 39 stories cover every conceivable surface: separate Lead List and Lead Kanban components, separate Lead Intake Form, separate Global Search component, Organization List and Detail separately. AI stories included. Every endpoint from the research maps to a story.
Spec Gate Compliance: 5/5
  Evidence: All three gates answered for every story in consistent table format. Answers are substantive and specific. Workflow names exact workflows. CRM Timeline correctly identifies which stories write and what they write.
Guardrail Awareness: 5/5
  Evidence: No violations. All frontend calls go through MAL. n8n handles integrations. CRM timeline addressed throughout. No TypeScript. Design tokens referenced for all frontend stories.
Dependency Graph Quality: 4/5
  Evidence: 7-phase build order with parallel groups within each phase. Critical path identified. However, having 12 phases makes the build order overly sequential in places — Phase 5 (frontend) waits for Phase 3 (config) unnecessarily in some cases. Some frontend stories could start earlier.
TOTAL: 23/25
Notable strength: Most comprehensive frontend decomposition — separate components for every UI surface including Lead Intake Form and Global Search that other models bundle.
Notable failure: Over-decomposition — 39 stories creates orchestration overhead; some trivially small stories should be combined.

---

## MODEL: model-alpha | TEST: 01 | RUN: B
Atomicity: 4/5
  Evidence: 26 stories, all S or XS. Clean separation of DocTypes, APIs, frontend, and integration. SCHED-011 bundles Confirm+Start (2 endpoints). SCHED-013 bundles Cancel+No-Show (2 endpoints). Both are borderline acceptable at 2 endpoints each.
Completeness: 5/5
  Evidence: All 5 DocTypes present. All 15 endpoints covered. All 4 n8n integrations present (reminders, telehealth, billing, waitlist). FHIR sync included. Rescheduling orchestration as a GLUE story. Telehealth link update as a separate endpoint. Comprehensive.
Spec Gate Compliance: 5/5
  Evidence: All three gates answered for every story with substantive answers. CRM Timeline correctly identifies which endpoints write ("Appointment created", "Appointment confirmed", etc.) and which are N/A.
Guardrail Awareness: 5/5
  Evidence: No violations. CRM timeline writes handled at endpoint level. n8n handles cross-system actions. No React-to-Frappe calls. FHIR mapping correctly as INTEGRATION story.
Dependency Graph Quality: 4/5
  Evidence: 12-phase build order is overly sequential — too many phases where stories could be parallelized more aggressively. Critical path correctly identified. Frontend phases 7-10 are noted as overlappable but structured sequentially.
TOTAL: 23/25
Notable strength: FHIR sync and rescheduling orchestration both present as distinct stories — shows understanding of the full scheduling domain.
Notable failure: 12 phases is too granular — reduces parallelism opportunities.

---

## MODEL: model-beta | TEST: 01 | RUN: B
Atomicity: 5/5
  Evidence: 27 stories. Each state transition endpoint is its own story (Confirm, Start+Complete, Cancel, No-Show). DocTypes properly separated. CRM timeline writes centralized in a single GLUE story (SCHED-025) rather than scattered — clean design choice well-justified in notes.
Completeness: 5/5
  Evidence: All 5 DocTypes, all endpoints, all 4 n8n integrations, FHIR sync, recurring appointment series, and CRM timeline hooks. Recurring series (SCHED-027) is a standout inclusion that some models miss. 27 stories cover the full scope.
Spec Gate Compliance: 5/5
  Evidence: Exemplary. Every story has all three gates with detailed answers. The detailed notes section explaining design decisions (why CRM is a GLUE story, why telehealth link write is not a state violation) shows deep understanding.
Guardrail Awareness: 5/5
  Evidence: Explicit guardrail callouts in notes section. n8n boundary rule clearly stated. CRM timeline centralized via server hooks rather than per-endpoint — architecturally superior approach. No violations.
Dependency Graph Quality: 5/5
  Evidence: 4-group DAG with clear visual map. Maximum parallelism of 10 stories in Group 2. Critical path correctly identified. Summary statistics table included. Design decision notes add significant value.
TOTAL: 25/25
Notable strength: CRM timeline as a single GLUE story with server hooks is the most architecturally sound approach — fires regardless of which endpoint triggers the state change. Design decision notes are best-in-class.
Notable failure: None.

---

## MODEL: model-gamma | TEST: 01 | RUN: B
Atomicity: 4/5
  Evidence: 28 stories. Most properly sized. SCHED-006 bundles Provider Schedule GET+POST plus creates the MAL route namespace. SCHED-025 (Waitlist Slot-Opening) has 4 dependencies suggesting complexity. Most stories are well-scoped.
Completeness: 5/5
  Evidence: 28 stories covering all DocTypes, endpoints, frontend components, integrations, FHIR sync, recurring series, telehealth link attachment API, and a CONFIG story for scheduling registration. The CONFIG registration story (SCHED-028) is a unique and thoughtful addition.
Spec Gate Compliance: 5/5
  Evidence: All three gates answered for every story. Answers are specific and workflow-aware. CRM Timeline correctly distributed — some endpoint stories write directly, FHIR sync correctly identified as N/A.
Guardrail Awareness: 5/5
  Evidence: Explicit guardrail reminder in Group 4 about n8n never modifying document state. Telehealth link attachment handled via internal MAL endpoint (SCHED-026). No violations.
Dependency Graph Quality: 4/5
  Evidence: 4-group parallel execution model. Visual dependency map included. Groups 3 and 4 correctly identified as runnable simultaneously. Critical path stated but includes a questionable chain (SCHED-009 -> SCHED-023 -> SCHED-026 -> SCHED-022 has direction issues).
TOTAL: 23/25
Notable strength: Configuration Registration story (SCHED-028) shows awareness of the Configuration Mojo integration pattern that no other model includes.
Notable failure: SCHED-004 placed in Group 1 (Foundation) alongside stories with no dependencies, but SCHED-004 depends on SCHED-001 and SCHED-002 — inconsistency in the graph.

---

## MODEL: model-delta | TEST: 01 | RUN: B
Atomicity: 5/5
  Evidence: 27 stories. Individual endpoints for each state transition (Confirm, Start, Complete, Cancel, No-Show each separate). Waitlist Join and Remove are separate stories. The most granular per-endpoint decomposition. All XS or S.
Completeness: 4/5
  Evidence: All core functionality covered. However, recurring appointment series logic is missing entirely — no story addresses weekly/biweekly recurring appointments, edit-one-vs-all-future, or series_id linkage. This is a significant gap given the research identified recurring appointments as a key workflow. FHIR sync also missing.
Spec Gate Compliance: 5/5
  Evidence: Exemplary detail in every gate answer. Multi-sentence explanations. Architecture flags (FLAG-SCHED-A through D) show exceptional judgment — flagging ambiguities for James rather than guessing. The CRM timeline flag on waitlist join is particularly thoughtful.
Guardrail Awareness: 5/5
  Evidence: Architecture flags demonstrate the highest guardrail awareness of any model. FLAG-SCHED-A explicitly questions whether n8n writing telehealth_link is a state violation. FLAG-SCHED-D asks about state log debt. No violations committed.
Dependency Graph Quality: 3/5
  Evidence: Graph output was truncated (model struggled to produce output — required reasoning mode off). Groups 1-4 visible, Group 5 cut off. What exists is well-structured with clear dependency chains. However, incomplete output means the full DAG cannot be evaluated.
TOTAL: 22/25
Notable strength: Architecture flags (FLAG-SCHED-A through D) are the best risk identification of any model — actively surfacing ambiguities rather than making assumptions.
Notable failure: Missing recurring appointment series logic and FHIR sync. Output truncated due to model generation issues.

---

## MODEL: model-epsilon | TEST: 01 | RUN: B
Atomicity: 3/5
  Evidence: 31 stories but with problematic sizing. SCHED-060 (State Machine) depends on 7 other stories and duplicates logic that should be in the Frappe Workflow configuration. SCHED-005 (SM Appointment DocType) is S but includes full Frappe Workflow setup. Serial dependency chain in Group 3.4 (SCHED-011->013->014->015) is too linear — these endpoints can be built in parallel.
Completeness: 5/5
  Evidence: 31 stories covering DocTypes, all endpoints, all frontend components, all n8n integrations, FHIR mapping (SCHED-050), recurring logic (SCHED-061), and reschedule logic (SCHED-062). No gaps. Numbering gaps (050, 060) suggest domain grouping was attempted.
Spec Gate Compliance: 4/5
  Evidence: All three gates present. However, some Workflow answers are weak (SCHED-001: "N/A — configuration entity, not workflow-driven" — this is wrong, it serves Provider Setup). CRM Timeline answers are adequate but inconsistent — some endpoint stories say "write to CRM" while others say "N/A — notification dispatch."
Guardrail Awareness: 4/5
  Evidence: Generally good. However, SCHED-060 (State Machine) as a separate story after all endpoint stories are built is architecturally backwards — the state machine should be part of SCHED-005 (DocType), not a post-hoc overlay. This suggests confusion about when Frappe Workflow configuration happens.
Dependency Graph Quality: 3/5
  Evidence: 7-phase structure but overly sequential. Serial chain SCHED-011->013->014->015 artificially constrains parallelism. These are independent endpoints sharing only the Appointment DocType dependency. Critical path is the longest of any model due to unnecessary serialization.
TOTAL: 19/25
Notable strength: Most complete coverage including FHIR mapping, recurring logic, and reschedule as separate stories with distinct IDs.
Notable failure: SCHED-060 (State Machine) as a post-hoc story after endpoints are built is architecturally inverted — the state machine must exist before endpoints can call transition_state().

---

## MODEL: model-zeta | TEST: 01 | RUN: B
Atomicity: 5/5
  Evidence: 26 stories, all XS or S. DocTypes categorized as CONFIG (debatable but defensible). Each state transition is its own endpoint story. Clean separation between backend, frontend, and integration layers.
Completeness: 4/5
  Evidence: All core functionality present. However, recurring appointment series logic is missing — no story addresses series_id, recurring_parent_id, or edit-one-vs-all-future semantics despite the SM Appointment DocType including those fields. FHIR sync also missing from integration stories.
Spec Gate Compliance: 5/5
  Evidence: All three gates answered for every story with clear, concise answers. CRM Timeline correctly identifies which endpoints write and what they write. Right Level consistently Universal with good justification.
Guardrail Awareness: 5/5
  Evidence: No violations. CRM writes handled at endpoint level. n8n handles cross-system actions. Frontend stories explicitly note they don't write to CRM. Waitlist notification correctly depends on cancel API and waitlist API.
Dependency Graph Quality: 4/5
  Evidence: 4-phase structure with clear visual map. Critical path correctly identified with multiple chains. Parallel execution noted. However, Phase 1 includes SCHED-004 which depends on SCHED-001 and SCHED-002 — it should be in Phase 2. Minor inconsistency.
TOTAL: 23/25
Notable strength: Cleanest per-endpoint decomposition with consistent sizing. Every state transition is independently buildable and testable.
Notable failure: Missing recurring appointment series logic despite fields being defined in the DocType.

---

## MODEL: model-alpha | TEST: 01 | RUN: C
Atomicity: 4/5
  Evidence: 20 stories, all XS or S. WIKI-013 (ArticleEditor) depends on 6 other stories — suggesting it bundles too much functionality. WIKI-008 bundles submit-for-review AND publish (2 state transitions). WIKI-009 bundles reject AND archive (2 state transitions). These could be split further.
Completeness: 5/5
  Evidence: All 3 DocTypes, all 13 endpoints, all 5 frontend components, all 3 n8n integrations, and the practice-level CRM activity log. SOP Mojo notification correctly handled via n8n. Version history as distinct stories. 20 stories cover the full scope.
Spec Gate Compliance: 5/5
  Evidence: All three gates answered for every story. CRM Timeline correctly identifies the single CRM write (WIKI-020, practice-level activity log on first publish). SOP notification correctly identified as n8n integration, not direct call.
Guardrail Awareness: 5/5
  Evidence: No violations. SOP Mojo notification explicitly via n8n webhook ("Wiki never calls SOP Mojo directly"). CRM activity log correctly scoped as practice-level, not client-specific. No TypeScript. All frontend calls through MAL.
Dependency Graph Quality: 4/5
  Evidence: 7-group build order with dependency chain summary table. Critical path identified. However, WIKI-009 (Article Reject/Archive) is placed in Group 5 despite depending only on WIKI-002 — it could be in Group 3 or 4 for better parallelism.
TOTAL: 23/25
Notable strength: SOP Mojo notification boundary rule explicitly stated and correctly implemented as n8n integration — shows strong guardrail awareness.
Notable failure: WIKI-008 and WIKI-009 bundle two state transitions each, reducing atomicity.

---

## MODEL: model-beta | TEST: 01 | RUN: C
Atomicity: 5/5
  Evidence: 21 stories, all XS or S. Submit-for-review and Reject properly separated (WIKI-008). Publish is its own story (WIKI-009). Archive is its own story (WIKI-010). GLUE story for Client Portal Help Section (WIKI-021) is a smart addition. Clean separation throughout.
Completeness: 5/5
  Evidence: All DocTypes, all endpoints, all frontend components, all n8n integrations, and a GLUE story for client portal wiring. Version history as distinct story set (WIKI-011). CRM activity log handled within publish endpoint (WIKI-009). 21 stories cover everything.
Spec Gate Compliance: 5/5
  Evidence: Table format for every story with all three gates. Answers are specific. CRM Timeline correctly identifies WIKI-009 as the only CRM write point ("First-time client-facing publish writes a practice-level activity log entry"). SOP notification correctly via n8n.
Guardrail Awareness: 5/5
  Evidence: No violations. SOP notification explicitly a one-way event notification only. CRM activity log correctly scoped. No TypeScript. All API calls through MAL. GLUE story shows understanding of integration patterns.
Dependency Graph Quality: 5/5
  Evidence: 5-group build order with visual tree dependency graph. Critical path clearly identified. Max parallelism of 10 stories in Group 3. Summary statistics table. Clean and actionable.
TOTAL: 25/25
Notable strength: GLUE story for Client Portal Help Section (WIKI-021) — uniquely identifies the wiring needed to surface wiki content in the patient portal as a distinct deliverable.
Notable failure: None.

---

## MODEL: model-gamma | TEST: 01 | RUN: C
Atomicity: 4/5
  Evidence: 22 stories. Generally well-sized. WIKI-005 (Article Update with Version Creation) has 4 dependencies. WIKI-022 (SOP Mojo Flag) depends on 4 stories including an external SOP-MOJO-webhook. Most stories are properly scoped XS or S.
Completeness: 4/5
  Evidence: All DocTypes, most endpoints, frontend components, and n8n integrations present. However, the practice-level CRM activity log on first publish is handled within WIKI-007 (publish endpoint) rather than as a separate n8n integration story — this means the CRM write is embedded in the endpoint rather than going through n8n. Missing a distinct GLUE/client-portal surface story.
Spec Gate Compliance: 4/5
  Evidence: All three gates present in table format for every story. However, answers tend toward the brief side. Some Workflow answers are generic ("Article lifecycle workflow"). CRM Timeline answers are adequate but could be more specific about the practice-level vs client-level distinction.
Guardrail Awareness: 5/5
  Evidence: SOP Mojo correctly handled via n8n. Explicit note that n8n polls/listens for DocType state changes rather than endpoints calling n8n directly. No TypeScript. No React-to-Frappe calls.
Dependency Graph Quality: 4/5
  Evidence: 5-group structure with execution notes. Groups 3 and 4 correctly identified as parallelizable. However, Group 0 lists WIKI-002 depending on WIKI-001 in the same group — they cannot truly be parallel. Execution notes are helpful.
TOTAL: 21/25
Notable strength: Execution notes in dependency graph explaining why specific ordering decisions were made — good commissioning guidance.
Notable failure: CRM activity log embedded in publish endpoint rather than n8n integration, and Group 0 dependency inconsistency.

---

## MODEL: model-delta | TEST: 01 | RUN: C
Atomicity: 5/5
  Evidence: 27 stories, mostly XS. Each endpoint is its own story. Frappe Workflow Configuration as a separate CONFIG story (WIKI-004). Client Portal Help Section as a GLUE story (WIKI-023). CRM activity log as a separate n8n integration (WIKI-027). Maximum decomposition.
Completeness: 5/5
  Evidence: 27 stories covering every endpoint, every DocType, every component, all 4 n8n integrations (author notification, admin notification, SOP notification, CRM activity log), a CONFIG story for Frappe Workflow, and a GLUE story for portal wiring. Most complete decomposition of any model for Run C.
Spec Gate Compliance: 5/5
  Evidence: Exemplary multi-paragraph gate answers for every story. Each gate response reads like a specification. The CRM Timeline answer for WIKI-027 is the most detailed of any model — explains practice-level scope, single-write contract, and the detection mechanism (is_first_publish flag).
Guardrail Awareness: 5/5
  Evidence: Zero violations. SOP Mojo boundary rule explicitly enforced. CRM activity log correctly delegated to n8n (WIKI-027) rather than embedded in the publish endpoint. Frappe Workflow configuration as a separate story shows understanding of the state machine ownership pattern.
Dependency Graph Quality: 5/5
  Evidence: 5-wave DAG with full dependency map table. Critical path clearly identified. Wave 4 has 10 parallel stories showing maximum parallelism. Summary table with blocker identification per wave. Note about WIKI-021 starting early within Wave 3.
TOTAL: 25/25
Notable strength: CRM activity log as a separate n8n integration story (WIKI-027) with is_first_publish detection mechanism — the most architecturally correct approach to the single CRM write requirement.
Notable failure: None (though model again required multiple retries per James's note).

---

## MODEL: model-epsilon | TEST: 01 | RUN: C
Atomicity: 2/5
  Evidence: Only 13 stories — far below the expected 20-35. WIKI-001 bundles all 3 DocTypes into one story. WIKI-002 bundles article create+get+update+list/search (4+ endpoints). WIKI-003 bundles submit-for-review+publish+reject+archive (4 state transitions). These are monolithic by the rubric standard.
Completeness: 4/5
  Evidence: All major workflows are addressed conceptually within the 13 stories, but the coarse granularity means individual endpoints are not independently addressable. CRM activity log handled within WIKI-003 rather than as separate n8n story. Missing a client portal surface story.
Spec Gate Compliance: 4/5
  Evidence: All three gates present for every story. Answers are adequate but less detailed than the best models. CRM Timeline for WIKI-003 correctly identifies first-publish-only write but lacks the detection mechanism detail.
Guardrail Awareness: 5/5
  Evidence: No violations. SOP notification correctly via n8n. n8n boundary respected. No TypeScript. CRM activity log correctly practice-level. Frontend calls MAL only.
Dependency Graph Quality: 4/5
  Evidence: Clean 4-group structure. Groups 3A/3B/3C show good parallelism. However, the coarse story granularity means the graph has limited value — with only 13 stories, there are fewer dependencies to track.
TOTAL: 19/25
Notable strength: Clean testability notes table showing mock strategy for each story — uniquely practical for implementing agents.
Notable failure: Severe under-decomposition — 13 stories for a capability that needs 20-27. Three DocTypes in one story and 4 state transitions in one story are not atomic.

---

## MODEL: model-zeta | TEST: 01 | RUN: C
Atomicity: 5/5
  Evidence: 21 stories, all XS or S. Each state transition is its own endpoint. DocTypes properly separated. Article Update with version creation is its own story. Clean separation throughout. Sizes are consistent and appropriate.
Completeness: 5/5
  Evidence: All 3 DocTypes, all 13 endpoints, all 5 frontend components, all 3 n8n integrations. CRM activity log not explicitly separated as a distinct story but the publish endpoint (WIKI-009) handles it with clear spec gate documentation. No gaps.
Spec Gate Compliance: 5/5
  Evidence: Every story has all three gates with detailed answers. CRM Timeline for WIKI-009 explicitly states "Practice-level activity log entry ONLY if first-time publish of a client-facing article." SOP notification correctly scoped with boundary rule compliance.
Guardrail Awareness: 5/5
  Evidence: No violations. SOP Mojo notification via n8n with boundary rule explicitly stated. CRM writes at endpoint level. No TypeScript. All frontend through MAL. Waitlist notification depends on cancel and waitlist APIs correctly.
Dependency Graph Quality: 4/5
  Evidence: 6-phase build order with parallel groups within each phase. Critical path identified. However, Phase 1 is sequential (3 DocTypes in series) when WIKI-001 and others could partially overlap. Execution summary table is clear.
TOTAL: 24/25
Notable strength: Consistent quality across all categories — no weak spots. Phase structure with clear entry/exit gates shows deployment discipline.
Notable failure: Phase 1 DocTypes forced into sequential order when WIKI-001 (Category) has no dependency on WIKI-002 order.

---
---

# Per-Model Summaries

---

## MODEL: model-alpha | TEST: 01 SUMMARY
Run A: 24 | Run B: 23 | Run C: 23
Mean: 23.3 | Range: 1 | Consistency: High
Consistency narrative: Model-alpha produces consistently strong results across all three runs with minimal variance. Slight deductions for endpoint bundling (2 endpoints per story) and overly sequential dependency graphs.
Dominant strength: Comprehensive coverage — never misses a workflow or endpoint from the research.
Dominant weakness: Occasional endpoint bundling (2 per story) and dependency graphs that are slightly too sequential.
Prompt engineering note: Add explicit instruction: "Each story should contain at most 1 endpoint. Dependency graphs should maximize parallel execution groups."

---

## MODEL: model-beta | TEST: 01 SUMMARY
Run A: 25 | Run B: 25 | Run C: 25
Mean: 25.0 | Range: 0 | Consistency: High
Consistency narrative: Model-beta achieves perfect scores across all three runs — the only model to do so. Consistently produces the right granularity, the best dependency graphs, and the most thoughtful design decisions.
Dominant strength: Architectural judgment — design decisions (CRM as GLUE story, FHIR sync approach, client portal as GLUE) are consistently the most sound.
Dominant weakness: None identified across 3 runs.
Prompt engineering note: None needed — this model performs optimally on the story decomposition task as-is.

---

## MODEL: model-gamma | TEST: 01 SUMMARY
Run A: 21 | Run B: 23 | Run C: 21
Mean: 21.7 | Range: 2 | Consistency: Medium
Consistency narrative: Model-gamma's scores cluster in the 21-23 range. Run A lost points for missing the dependency graph entirely; Run C lost points for embedded CRM logic and brief spec gate answers. Run B was stronger.
Dominant strength: Thoroughness in story count — catches edge-case workflows that other models miss (Contact-to-Medplum sync, Config Registration).
Dominant weakness: Dependency graph quality and spec gate answer depth are inconsistent. Tendency to embed cross-system actions in endpoints rather than delegating to n8n.
Prompt engineering note: Add: "Always produce a separate DEPENDENCY-GRAPH.md with parallel execution groups. CRM timeline writes and cross-system notifications must always go through n8n integration stories, never embedded in endpoint stories."

---

## MODEL: model-delta | TEST: 01 SUMMARY
Run A: 25 | Run B: 22 | Run C: 25
Mean: 24.0 | Range: 3 | Consistency: Medium
Consistency narrative: Model-delta produces excellent output when it completes — perfect scores on Runs A and C. Run B suffered from generation issues (model required reasoning mode off, output truncated, missing recurring series and FHIR sync).
Dominant strength: Spec gate answer quality is best-in-class — every gate response reads like a mini-specification. Architecture flags surface ambiguities proactively.
Dominant weakness: Reliability — required multiple retries across all runs. When it struggles, completeness and graph quality suffer (Run B).
Prompt engineering note: Add: "You MUST produce complete output including STORIES.md and DEPENDENCY-GRAPH.md. If you reach a length limit, prioritize completing the dependency graph over adding detail to individual stories. Include recurring/series logic and FHIR mapping if the research identifies them."

---

## MODEL: model-epsilon | TEST: 01 SUMMARY
Run A: 21 | Run B: 19 | Run C: 19
Mean: 19.7 | Range: 2 | Consistency: Medium
Consistency narrative: Model-epsilon consistently under-decomposes, producing fewer and larger stories than the rubric expects. Run A was best at 22 stories; Run B had architectural inversions; Run C had only 13 stories.
Dominant strength: Practical delivery artifacts — "What Can Ship Independently" tables (Run A) and testability notes (Run C) are uniquely useful for implementation.
Dominant weakness: Atomicity — consistently bundles too many endpoints or state transitions into single stories. Does not respect the "max 2 endpoints per story" constraint.
Prompt engineering note: Add: "Each story MUST contain at most 2 API endpoints. Each DocType MUST be its own story. Each state transition endpoint MUST be its own story. Target 20-35 stories for a KERNEL capability, never fewer than 15."

---

## MODEL: model-zeta | TEST: 01 SUMMARY
Run A: 23 | Run B: 23 | Run C: 24
Mean: 23.3 | Range: 1 | Consistency: High
Consistency narrative: Model-zeta produces highly consistent results across all three runs. Never scores below 23. Slight over-decomposition in Run A (39 stories) balanced by excellent granularity in Runs B and C.
Dominant strength: Consistent per-endpoint decomposition with appropriate sizing — every state transition gets its own story, every component is independently testable.
Dominant weakness: Occasional over-decomposition (Run A: 39 stories) and missing advanced features (recurring appointments in Run B). Dependency graphs sometimes have minor Phase 1 ordering issues.
Prompt engineering note: Add: "For KERNEL capabilities, target 25-35 stories. If your count exceeds 35, merge trivially small stories that share the same DocType and test boundary. Always include recurring/series logic if the research identifies it."
