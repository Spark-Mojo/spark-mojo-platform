# Test 01: Story Decomposition — Scores

---

## MODEL: model-alpha | TEST: 01 | RUN: A
Atomicity: 4/5
Evidence: 31 stories, all S or XS. CRM-011 bundles list+detail for Organizations (2 endpoints, borderline). CRM-015 bundles GET activities + POST activities (2 endpoints). Backend/frontend cleanly separated.
Failure classification: CORRECTABLE

Completeness: 5/5
Evidence: All workflows mapped (contact CRUD, lead lifecycle, org management, global search, vocabulary, activity timeline, duplicate detection, consent, merge). AI features included. All major endpoints covered.
Failure classification: N/A

Spec Gate Compliance: 5/5
Evidence: All three gates answered for every story with substantive, specific workflow answers and correct CRM timeline reasoning (e.g., "N/A (read endpoint)" vs explicit write descriptions).
Failure classification: N/A

Guardrail Awareness: 5/5
Evidence: No React-to-Frappe calls. All cross-system workflows correctly identified as INTEGRATION (n8n). CRM timeline addressed per story. No TypeScript. Vocabulary mapping correctly handled.
Failure classification: N/A

Dependency Graph Quality: 5/5
Evidence: Valid DAG with 5 parallel groups clearly identified. Critical path documented. No circular dependencies. Backend before frontend before integration ordering correct.
Failure classification: N/A

TOTAL: 24/25
Notable strength: Exceptional completeness and clean backend/frontend separation with granular per-endpoint stories.
Notable failure: Minor over-scoping on CRM-011 (org list+detail in one story) and CRM-015 (activity GET+POST).

---

## MODEL: model-alpha | TEST: 01 | RUN: B
Atomicity: 4/5
Evidence: 26 stories, all S or XS. SCHED-011 bundles confirm+start (2 endpoints, 2 distinct workflows). SCHED-013 bundles cancel+no-show (2 endpoints). Each is a distinct status transition per rubric guidance.
Failure classification: CORRECTABLE

Completeness: 5/5
Evidence: All 5 DocTypes have creation stories. All 15 endpoints mapped. All 4 n8n integrations present. FHIR sync included (SCHED-025). Rescheduling addressed (SCHED-024). Recurring appointments addressed implicitly via series fields.
Failure classification: N/A

Spec Gate Compliance: 5/5
Evidence: All three gates answered for every story. CRM timeline correctly addressed for the 5 lifecycle events. Gates are substantive with workflow-specific answers.
Failure classification: N/A

Guardrail Awareness: 5/5
Evidence: Telehealth link generation correctly identified as n8n INTEGRATION. Billing trigger correctly as n8n INTEGRATION. SCHED-026 adds a dedicated telehealth-link-update endpoint for n8n to call back through MAL. No direct Frappe calls from React.
Failure classification: N/A

Dependency Graph Quality: 5/5
Evidence: Valid DAG with 12 phases. DocTypes before endpoints before frontend. Critical path clearly identified (SCHED-001 through SCHED-022). Parallel groups well-identified with frontend phases overlapping integration phases.
Failure classification: N/A

TOTAL: 24/25
Notable strength: Excellent separation of each status transition and dedicated telehealth link update endpoint showing deep guardrail understanding.
Notable failure: Confirm+start and cancel+no-show bundled despite rubric expecting separate stories per transition.

---

## MODEL: model-alpha | TEST: 01 | RUN: C
Atomicity: 4/5
Evidence: 20 stories, all S or XS. WIKI-008 bundles submit-for-review + publish (2 endpoints, 2 distinct workflow paths). WIKI-009 bundles reject + archive (2 endpoints). WIKI-006 bundles create + read. Each slightly over-scoped.
Failure classification: CORRECTABLE

Completeness: 5/5
Evidence: All 13 endpoints mapped to stories. All 3 DocTypes have creation stories. All 3 n8n integrations present plus the first-publish CRM activity log (WIKI-020). Version history correctly separated as distinct story set.
Failure classification: N/A

Spec Gate Compliance: 5/5
Evidence: All three gates answered for every story. CRM timeline correctly identified as N/A for most with the first-publish exception correctly noted in WIKI-020.
Failure classification: N/A

Guardrail Awareness: 5/5
Evidence: SOP Mojo notification correctly as n8n INTEGRATION with explicit one-way boundary note. Version restore correctly specified as creating new version (no history deletion). No TypeScript. No direct Frappe calls.
Failure classification: N/A

Dependency Graph Quality: 5/5
Evidence: Valid DAG with 7 groups. Critical path identified. DocTypes before endpoints before frontend. Version history correctly depends on article CRUD. Parallel groups well-identified.
Failure classification: N/A

TOTAL: 24/25
Notable strength: Clean identification of all boundary rules (SOP connection, version restore non-destructiveness) and correct CRM timeline exception handling.
Notable failure: Minor bundling of submit+publish and reject+archive into combined stories.

---

## MODEL: model-alpha | TEST: 01 SUMMARY
Run A: 24 | Run B: 24 | Run C: 24
Mean: 24.0 | Range: 0 | Consistency: High

Consistency narrative: model-alpha delivered nearly identical quality across all three runs with different capability domains. The only consistent pattern was minor endpoint bundling (2 endpoints per story in a few cases) that was always correctable.
Dominant strength: Comprehensive coverage with clean architectural separation and excellent spec gate compliance.
Dominant weakness: Slight tendency to bundle 2 closely related endpoints into one story instead of splitting per the strict atomicity rules.
Prompt engineering note: Add explicit instruction "Each status transition endpoint MUST be its own story" to prevent bundling of related but distinct transitions.

---

## MODEL: model-beta | TEST: 01 | RUN: A
Atomicity: 4/5
Evidence: 29 stories. CRM-001 bundles list+detail read (2 endpoints). CRM-002 bundles create+update (2 endpoints). CRM-012 bundles vocabulary+stages (2 endpoints). All are paired reads or paired writes, making them borderline but slightly over-scoped.
Failure classification: CORRECTABLE

Completeness: 5/5
Evidence: All workflows mapped including AI features (summary, classification, duplicate scoring), all cross-system activity capture, duplicate detection, consent tracking, and merge. Comprehensive coverage of research.
Failure classification: N/A

Spec Gate Compliance: 5/5
Evidence: All three gates answered for every story with detailed, substantive answers. CRM timeline correctly identified per story with specific event descriptions. Right Level answers are precise (e.g., "Vertical (healthcare)" vs "Universal").
Failure classification: N/A

Guardrail Awareness: 5/5
Evidence: All n8n workflows correctly identified as INTEGRATION. No React-to-Frappe calls. GLUE story (CRM-026) correctly handles server-side hooks. AI features properly deferred with cost estimates. No TypeScript.
Failure classification: N/A

Dependency Graph Quality: 5/5
Evidence: Exceptional DAG with visual dependency map, 4 parallel groups, critical path analysis, and lane summary table. Full dependency reference table with bidirectional "depends on" / "unblocks" columns. Notes section identifies CRM-009 as most-depended story.
Failure classification: N/A

TOTAL: 24/25
Notable strength: Best-in-class dependency graph with visual map, bidirectional reference table, and strategic commissioning notes.
Notable failure: Minor endpoint bundling (list+detail, create+update, vocabulary+stages as paired stories).

---

## MODEL: model-beta | TEST: 01 | RUN: B
Atomicity: 5/5
Evidence: 27 stories. Each status transition is its own story (SCHED-011 confirm, SCHED-012 start+complete, SCHED-013 cancel, SCHED-014 no-show). DocTypes separated. Frontend components each separate. SCHED-012 bundles start+complete but these are sequential in the same workflow.
Failure classification: N/A

Completeness: 5/5
Evidence: All 5 DocTypes, all 15 endpoints, all 4 n8n integrations, FHIR sync (SCHED-026), CRM timeline writes as GLUE story (SCHED-025), recurring series (SCHED-027). Comprehensive.
Failure classification: N/A

Spec Gate Compliance: 5/5
Evidence: All three gates answered for every story. CRM timeline correctly centralized in SCHED-025 (GLUE) with explicit justification in decomposition notes. Right Level answers consistently "Universal" with appropriate explanation.
Failure classification: N/A

Guardrail Awareness: 5/5
Evidence: Telehealth link generation correctly as n8n INTEGRATION. Billing trigger correctly as n8n INTEGRATION. Explicit note that n8n never modifies document state. SCHED-022 field-write boundary correctly analyzed in decomposition notes.
Failure classification: N/A

Dependency Graph Quality: 5/5
Evidence: Valid DAG with 4 parallel groups. Visual dependency map. Critical path identified (SCHED-001 through SCHED-018). Max parallelism quantified (10 stories in Group 2).
Failure classification: N/A

TOTAL: 25/25
Notable strength: Innovative GLUE story (SCHED-025) centralizing all CRM timeline writes as server-side hooks, with clear architectural justification.
Notable failure: None.

---

## MODEL: model-beta | TEST: 01 | RUN: C
Atomicity: 4/5
Evidence: 21 stories. WIKI-004 bundles create+list categories (2 endpoints). WIKI-008 bundles submit-for-review+reject (2 endpoints with different workflow paths). Otherwise clean separation.
Failure classification: CORRECTABLE

Completeness: 5/5
Evidence: All 13 endpoints mapped. All 3 DocTypes have creation stories. All 3 n8n integrations present. GLUE story (WIKI-021) for client portal surface. Version history correctly as distinct story set.
Failure classification: N/A

Spec Gate Compliance: 5/5
Evidence: All three gates answered for every story using table format. CRM timeline correctly identified as N/A with the first-publish exception correctly noted in WIKI-009 (publish endpoint handles CRM write directly).
Failure classification: N/A

Guardrail Awareness: 5/5
Evidence: SOP Mojo notification correctly as n8n INTEGRATION with one-way event note. Version restore correctly specified (creates new version, no deletion). Client portal correctly identified as GLUE story.
Failure classification: N/A

Dependency Graph Quality: 5/5
Evidence: Valid DAG with 5 groups. Visual dependency tree. Critical path identified. Summary statistics table. Max parallelism quantified (10 stories in Group 3).
Failure classification: N/A

TOTAL: 24/25
Notable strength: Clean GLUE story for client portal Help section and correct CRM write handling in the publish endpoint itself.
Notable failure: Minor bundling of create+list categories and submit+reject into combined stories.

---

## MODEL: model-beta | TEST: 01 SUMMARY
Run A: 24 | Run B: 25 | Run C: 24
Mean: 24.3 | Range: 1 | Consistency: High

Consistency narrative: model-beta performed at the top of the range across all three runs. Run B achieved a perfect score with an innovative GLUE story pattern for CRM timeline writes. Runs A and C had minor endpoint bundling.
Dominant strength: Architectural sophistication with innovative patterns (GLUE for CRM writes, client portal surface), best-in-class dependency graphs, and clear decomposition rationale.
Dominant weakness: Occasional bundling of 2 related endpoints into one story (create+list, submit+reject).
Prompt engineering note: Add "Each endpoint path MUST be its own story — even if they share the same DocType" to prevent paired endpoint bundling.

---

## MODEL: model-gamma | TEST: 01 | RUN: A
Atomicity: 4/5
Evidence: 33 stories. Most are properly atomic with single endpoints. CRM-011 bundles lead conversion with multiple dependencies. Stories are generally well-scoped at XS/S level.
Failure classification: CORRECTABLE

Completeness: 4/5
Evidence: Good coverage of contact, lead, organization, activity, and search workflows. Missing vocabulary/config endpoint as a distinct story (CRM-018/019 are separate). Has task event capture (CRM-028) which is extra coverage. Consent tracking present.
Failure classification: CORRECTABLE

Spec Gate Compliance: 4/5
Evidence: All stories have all three gates. Answers are present but some are brief (e.g., "Contact lookup workflow" without specifying which actors or scenarios). Most are adequate.
Failure classification: CORRECTABLE

Guardrail Awareness: 4/5
Evidence: All n8n workflows correctly as INTEGRATION. No direct Frappe calls from frontend. CRM-033 (roles) is categorized as GLUE which is unusual but not a violation. CRM-019 mentions "Server script + n8n webhook" which blurs the boundary slightly.
Failure classification: CORRECTABLE

Dependency Graph Quality: 1/5
Evidence: No dependency graph section was produced. The output ends after the stories with no DEPENDENCY-GRAPH.md file.
Failure classification: FUNDAMENTAL

TOTAL: 17/25
Notable strength: Good endpoint-level atomicity with most stories covering single endpoints.
Notable failure: Complete absence of the dependency graph, which was explicitly required in the prompt.

---

## MODEL: model-gamma | TEST: 01 | RUN: B
Atomicity: 4/5
Evidence: 28 stories. Most properly atomic. SCHED-006 bundles GET+POST provider schedule (2 endpoints). SCHED-007 bundles POST+DELETE blocks (2 endpoints). SCHED-011 bundles start+complete (2 endpoints). SCHED-012 bundles cancel+no-show (2 endpoints).
Failure classification: CORRECTABLE

Completeness: 5/5
Evidence: All 5 DocTypes, all 15 endpoints mapped, all 4 n8n integrations, FHIR sync (SCHED-027), recurring series (SCHED-016), telehealth link internal endpoint (SCHED-026), CONFIG story (SCHED-028). Comprehensive.
Failure classification: N/A

Spec Gate Compliance: 4/5
Evidence: All three gates answered for every story. Some answers are thin (e.g., "Universal" without explanation). CRM timeline gates correctly note that CRM writes are in endpoint stories rather than DocType stories.
Failure classification: CORRECTABLE

Guardrail Awareness: 5/5
Evidence: Telehealth link correctly routed through internal MAL endpoint (SCHED-026). Billing trigger as n8n INTEGRATION. Explicit guardrail reminders in dependency graph notes. n8n never modifies document state correctly enforced.
Failure classification: N/A

Dependency Graph Quality: 4/5
Evidence: Valid DAG with 4 parallel groups. Execution notes section. Groups 3 and 4 (frontend + integration) correctly identified as running in parallel. Critical path partially identified but described awkwardly.
Failure classification: CORRECTABLE

TOTAL: 22/25
Notable strength: Comprehensive completeness with CONFIG story for module registration and telehealth link internal endpoint pattern.
Notable failure: Several stories bundle 2 endpoints that should be separate per rubric (cancel+no-show, start+complete).

---

## MODEL: model-gamma | TEST: 01 | RUN: C
Atomicity: 4/5
Evidence: 22 stories. Most are atomic single-endpoint. WIKI-004 bundles create+read (2 endpoints). Some workflow endpoint stories are clean single-endpoint (WIKI-006 submit, WIKI-007 publish, WIKI-008 reject, WIKI-009 archive). Good separation overall.
Failure classification: CORRECTABLE

Completeness: 5/5
Evidence: All 13 endpoints mapped. All 3 DocTypes present. All 3 n8n integrations present. Version history correctly as distinct story set. CRM timeline exception (first publish) correctly handled in WIKI-007.
Failure classification: N/A

Spec Gate Compliance: 4/5
Evidence: All three gates answered for every story. Answers are present but some are thin (e.g., "Universal." as single word). CRM timeline correctly identified as N/A for most with first-publish exception in WIKI-007.
Failure classification: CORRECTABLE

Guardrail Awareness: 5/5
Evidence: SOP Mojo notification correctly as n8n INTEGRATION with explicit boundary note ("Wiki never calls SOP directly"). Version restore correctly specified. Frappe transition_state correctly referenced.
Failure classification: N/A

Dependency Graph Quality: 4/5
Evidence: Valid DAG with 5 groups (0-4). Parallel groups identified. Execution notes section with valid observations. Critical path not explicitly stated as a single chain. Some dependency relationships in Group 0 are questionable (WIKI-002 depends on WIKI-001 but listed in same group).
Failure classification: CORRECTABLE

TOTAL: 22/25
Notable strength: Clean per-endpoint separation for workflow transitions (submit, publish, reject, archive each separate).
Notable failure: Thin spec gate answers and minor dependency graph ordering issues.

---

## MODEL: model-gamma | TEST: 01 SUMMARY
Run A: 17 | Run B: 22 | Run C: 22
Mean: 20.3 | Range: 5 | Consistency: Low

Consistency narrative: Run A catastrophically missed the dependency graph entirely, dropping 4 points. Runs B and C were consistent at 22/25 with solid completeness but minor atomicity and spec gate thinness issues. The Run A failure suggests the model may not reliably produce all requested outputs.
Dominant strength: Good endpoint-level atomicity and comprehensive completeness when it produces the full output.
Dominant weakness: Inconsistent output completeness (missing dependency graph in Run A) and thin spec gate answers.
Prompt engineering note: Add "You MUST produce both STORIES.md AND DEPENDENCY-GRAPH.md — verify both are in your output before stopping" as a final instruction.

---

## MODEL: model-delta | TEST: 01 | RUN: A
Atomicity: 5/5
Evidence: 27 stories, 22 XS and 5 S. No story has both backend and frontend. Each endpoint is its own story. Clean separation of concerns. Note: required multiple attempts to produce output (per James note), but the final output quality is excellent.
Failure classification: N/A

Completeness: 5/5
Evidence: All workflows covered (contact CRUD, lead lifecycle, org management, search, vocabulary, activities, duplicate detection, consent, merge). AI features included. All endpoints mapped.
Failure classification: N/A

Spec Gate Compliance: 5/5
Evidence: Exceptional gate answers. Every story has all three gates with detailed, multi-sentence answers that reference specific workflows and explain the reasoning. CRM timeline gates explicitly reference which OTHER story handles the write when this story does not.
Failure classification: N/A

Guardrail Awareness: 5/5
Evidence: Explicit pre-condition notes (RC-024 auth middleware, OQ-002 model names). CRM timeline correctly delegated to n8n (CRM-022) rather than being in backend endpoints. Consent validation as server hook. No TypeScript. No direct Frappe calls.
Failure classification: N/A

Dependency Graph Quality: 5/5
Evidence: Exceptional DAG with 5 waves, full dependency reference table with "Depends On" and "Unblocks" columns, critical path analysis, MVP milestone definition, and commissioning guidance. Visual ASCII art is excellent.
Failure classification: N/A

TOTAL: 25/25
Notable strength: Best-in-class spec gate answers and dependency graph with MVP milestone definition and commissioning guidance. Cross-references between stories are precise.
Notable failure: None (though the model required multiple attempts to produce output per James note — a usability concern not captured in the rubric).

---

## MODEL: model-delta | TEST: 01 | RUN: B
Atomicity: 5/5
Evidence: 27 stories. Each status transition is its own endpoint story (SCHED-012 confirm, SCHED-013 start, SCHED-014 complete, SCHED-015 cancel, SCHED-016 no-show). Waitlist split into join (SCHED-017) and remove (SCHED-018). Exemplary granularity.
Failure classification: N/A

Completeness: 5/5
Evidence: All 5 DocTypes, all 15 endpoints (each as its own story), all 4 n8n integrations. Note: output was truncated mid-dependency-graph (per James note about model failing to complete), but story coverage before truncation is comprehensive.
Failure classification: N/A

Spec Gate Compliance: 5/5
Evidence: Exceptional gate answers with multi-sentence explanations. CRM timeline correctly noted per endpoint. FLAGS section identifies ambiguous decisions (waitlist CRM entry, reminder CRM entry, telehealth link boundary, state log debt) for human review.
Failure classification: N/A

Guardrail Awareness: 5/5
Evidence: Explicit architecture flag on SCHED-020 (telehealth link write-back) with resolution options. FLAGS section shows deep guardrail awareness. Correctly identifies field update vs state transition boundary.
Failure classification: N/A

Dependency Graph Quality: 3/5
Evidence: Dependency graph starts with valid structure (Groups 1-4 visible) but output is truncated mid-Group 5. The visible portion shows correct ordering (DocTypes before endpoints) and parallel groups. Incomplete due to model output failure.
Failure classification: FUNDAMENTAL

TOTAL: 23/25
Notable strength: Exemplary atomicity with every single status transition as its own story, and FLAGS section showing sophisticated architectural reasoning.
Notable failure: Dependency graph truncated due to model output failure (required turning reasoning off per James note).

---

## MODEL: model-delta | TEST: 01 | RUN: C
Atomicity: 5/5
Evidence: 27 stories. Every single endpoint is its own story. Each status transition (submit, publish, reject, archive) is separate. Version history and restore are separate stories. Category create, update, and list are each separate. Exemplary granularity.
Failure classification: N/A

Completeness: 5/5
Evidence: All 13 endpoints mapped individually. All 3 DocTypes. CONFIG story for Frappe Workflow (WIKI-004). GLUE story for client portal (WIKI-023). All 3 n8n integrations plus dedicated CRM activity log story (WIKI-027). Comprehensive.
Failure classification: N/A

Spec Gate Compliance: 5/5
Evidence: Exceptional gate answers — the most detailed of any model. Each gate answer is multi-sentence with specific reasoning. CRM timeline correctly handled: only WIKI-027 writes, and the mechanism (is_first_publish flag) is precisely specified.
Failure classification: N/A

Guardrail Awareness: 5/5
Evidence: SOP Mojo notification correctly as n8n with explicit boundary rule statement. Version restore creates new version without deletion. WIKI-004 (CONFIG) correctly separates Frappe Workflow configuration from DocType creation. Transition_state() correctly referenced throughout.
Failure classification: N/A

Dependency Graph Quality: 5/5
Evidence: Valid DAG with 5 waves. Full dependency map table. Summary statistics. Critical path identified (WIKI-001 through WIKI-027). Longest parallel fan-out quantified (Wave 4, 10 stories).
Failure classification: N/A

TOTAL: 25/25
Notable strength: Best-in-class granularity (every endpoint its own story) and most detailed spec gate answers of any model across all runs.
Notable failure: None (though model required multiple attempts per James note).

---

## MODEL: model-delta | TEST: 01 SUMMARY
Run A: 25 | Run B: 23 | Run C: 25
Mean: 24.3 | Range: 2 | Consistency: Medium

Consistency narrative: model-delta produces the highest-quality output when it completes, but has reliability issues requiring multiple attempts (noted by James in both Runs A and C, and output truncation in Run B). The 2-point drop in Run B is entirely due to dependency graph truncation from model output failure.
Dominant strength: Best-in-class atomicity (every endpoint its own story), most detailed spec gate answers, and sophisticated architectural reasoning (FLAGS, cross-references, MVP milestones).
Dominant weakness: Reliability — model repeatedly failed to produce complete output, requiring multiple retries and workarounds (turning reasoning off).
Prompt engineering note: Reduce prompt length or break into two calls (stories first, dependency graph second) to avoid output truncation. Consider adding "Output your response incrementally — do not attempt to plan the entire output before writing."

---

## MODEL: model-epsilon | TEST: 01 | RUN: A
Atomicity: 2/5
Evidence: 21 stories. CRM-001 bundles Contact list+detail+create+update (4 endpoints). CRM-004 bundles Organization list+detail+create+search+vocabulary+stages (6+ endpoints). CRM-012 bundles all cross-system activity capture into one story. Multiple stories sized M (not S or XS). Violates "more than 2 endpoints: split it" rule repeatedly.
Failure classification: FUNDAMENTAL

Completeness: 4/5
Evidence: Core workflows covered but at too-high granularity. Missing explicit duplicate detection endpoint story. AI features included but deferred. Activity capture bundled into one mega-story instead of per-system stories.
Failure classification: CORRECTABLE

Spec Gate Compliance: 4/5
Evidence: All three gates answered for every story. Answers are substantive. CRM timeline correctly identified. However, gates for over-scoped stories (CRM-004, CRM-012) are necessarily vague because they cover too many workflows.
Failure classification: CORRECTABLE

Guardrail Awareness: 4/5
Evidence: No direct Frappe calls from React. n8n workflows correctly identified. However, CRM-019 "Server script + n8n webhook" blurs the Frappe/n8n boundary. Uses M-sized stories which violates the "S or XS only" instruction.
Failure classification: CORRECTABLE

Dependency Graph Quality: 4/5
Evidence: Valid DAG with 6 parallel groups (A through F). Visual graph included. Build sequence summary with critical path. However, the dependency structure is simpler than it should be because stories are too coarse-grained.
Failure classification: CORRECTABLE

TOTAL: 18/25
Notable strength: Good understanding of platform architecture and AI feature phasing with explicit deferral reasoning.
Notable failure: Fundamental atomicity violations — multiple stories bundle 4-6 endpoints, and M-sized stories violate the "S or XS only" constraint.

---

## MODEL: model-epsilon | TEST: 01 | RUN: B
Atomicity: 3/5
Evidence: 31 stories. Mostly S-sized. SCHED-060 depends on 7 other stories and is a state machine that should be part of the DocType (SCHED-005). SCHED-005 already includes the Frappe Workflow state machine, making SCHED-060 redundant/conflicting. Some stories correctly split (each transition endpoint separate). DocTypes sized S (could be XS).
Failure classification: CORRECTABLE

Completeness: 5/5
Evidence: All 5 DocTypes, all 15 endpoints, all 4 n8n integrations, FHIR mapping, recurring logic, reschedule logic. Very comprehensive with 31 stories.
Failure classification: N/A

Spec Gate Compliance: 4/5
Evidence: All three gates answered. Some gates are thin (e.g., "N/A — internal state transition, no customer-visible event"). CRM timeline correctly identified for appointment lifecycle events. Several "N/A" answers without explanation for notification workflows.
Failure classification: CORRECTABLE

Guardrail Awareness: 4/5
Evidence: n8n workflows correctly as INTEGRATION. React calls MAL only. However, SCHED-041 (telehealth link generation) writes link back to appointment record without specifying the MAL intermediary pattern that other models correctly identified. SCHED-060 creates a redundant state machine layer.
Failure classification: CORRECTABLE

Dependency Graph Quality: 3/5
Evidence: DAG exists with 7 phases. However, the serial chain in Group 3.4 (SCHED-011 through SCHED-015) creates unnecessary sequential dependencies — confirm, start, and complete don't need to be built sequentially. Critical path is overly long due to artificial serialization.
Failure classification: CORRECTABLE

TOTAL: 19/25
Notable strength: Comprehensive completeness with 31 stories covering every feature including reschedule logic.
Notable failure: Redundant state machine story (SCHED-060) that conflicts with the DocType's built-in Frappe Workflow, and artificial serialization in the dependency graph.

---

## MODEL: model-epsilon | TEST: 01 | RUN: C
Atomicity: 2/5
Evidence: 13 stories only. WIKI-001 bundles all 3 DocTypes into one story. WIKI-002 bundles create+read+update+list/search (4 endpoints). WIKI-003 bundles submit+publish+reject+archive (4 endpoints). Stories are feature-sized, not work-item-sized. Only 13 stories for a capability that should produce 20-35.
Failure classification: FUNDAMENTAL

Completeness: 3/5
Evidence: All major workflows are represented but at too-high granularity. Version history is bundled into WIKI-004 (2 endpoints). Category management is one story (3 endpoints). The first-publish CRM activity log is "embedded in WIKI-003 backend logic, not a separate story" which loses the n8n boundary.
Failure classification: CORRECTABLE

Spec Gate Compliance: 4/5
Evidence: All three gates answered for every story. CRM timeline correctly identified with the first-publish exception. Right Level consistently "Universal." Answers are adequate but reflect the coarse granularity.
Failure classification: CORRECTABLE

Guardrail Awareness: 3/5
Evidence: SOP Mojo notification correctly as n8n. However, embedding the CRM activity log in backend code (WIKI-003) rather than routing through n8n violates the cross-system boundary principle. No client portal GLUE story identified.
Failure classification: CORRECTABLE

Dependency Graph Quality: 4/5
Evidence: Valid DAG with clear parallel groups (1 through 4). Build order summary table. Testability notes section is a nice addition. However, the graph is simpler than it should be because stories are too coarse-grained.
Failure classification: CORRECTABLE

TOTAL: 16/25
Notable strength: Clear methodology explanation and testability notes showing good engineering thinking.
Notable failure: Fundamental under-decomposition — only 13 stories with multiple 4-endpoint bundles, well below the 20-35 expected range.

---

## MODEL: model-epsilon | TEST: 01 SUMMARY
Run A: 18 | Run B: 19 | Run C: 16
Mean: 17.7 | Range: 3 | Consistency: Low

Consistency narrative: model-epsilon consistently under-decomposes, producing fewer and larger stories than required. Run C was the worst with only 13 stories. Run B was the best, likely because the embedded research summary made endpoint enumeration clearer. The model understands the architecture but does not apply the SPLIT rules rigorously.
Dominant strength: Good architectural understanding and comprehensive workflow coverage at the conceptual level.
Dominant weakness: Fundamental atomicity failures — bundles 4-6 endpoints per story, uses M-sized stories, and produces too few stories overall.
Prompt engineering note: Add "Count your endpoints. If any story has more than 2 endpoints, you MUST split it before proceeding. Your target is 25-40 stories, not 13-22."

---

## MODEL: model-zeta | TEST: 01 | RUN: A
Atomicity: 5/5
Evidence: 39 stories. Each endpoint is its own story. Backend/frontend cleanly separated (19 backend, 10 frontend, 4 integration, 4 config, 2 AI). All sized S or XS. No story mixes categories.
Failure classification: N/A

Completeness: 5/5
Evidence: Most comprehensive output across all models. Every endpoint individually mapped. Lead list + Lead Kanban + Lead intake form as separate frontend stories. Organization list + detail as separate stories. AI features included.
Failure classification: N/A

Spec Gate Compliance: 4/5
Evidence: All three gates answered for every story. Table format is consistent. However, some answers are brief (e.g., "N/A — configuration lookup"). Most are adequate with workflow identification and right level classification.
Failure classification: CORRECTABLE

Guardrail Awareness: 5/5
Evidence: All n8n workflows correctly as INTEGRATION. No direct Frappe calls from React. AI features as separate category. Vocabulary endpoint correctly identified. Healthcare custom fields correctly as CONFIG.
Failure classification: N/A

Dependency Graph Quality: 5/5
Evidence: Valid DAG with 7 phases. Parallel groups clearly defined (A through M). Summary statistics table with estimated Ralph nights per phase. Critical path identified. Maximum parallel execution quantified.
Failure classification: N/A

TOTAL: 24/25
Notable strength: Most granular decomposition (39 stories) with every endpoint and component individually scoped. Best parallelism opportunity.
Notable failure: Slightly thin spec gate answers in table format compared to narrative-style answers.

---

## MODEL: model-zeta | TEST: 01 | RUN: B
Atomicity: 5/5
Evidence: 26 stories. Each status transition endpoint is its own story (confirm, start, complete, cancel, no-show each separate). DocTypes categorized as CONFIG (unconventional but not wrong). All S or XS. Clean backend/frontend separation.
Failure classification: N/A

Completeness: 5/5
Evidence: All 5 DocTypes, all 15 endpoints, all 4 n8n integrations. Each status transition separate. FHIR sync not present as explicit story but appointment DocType references it. Missing recurring appointment series logic as explicit story.
Failure classification: N/A

Spec Gate Compliance: 4/5
Evidence: All three gates answered for every story. Answers are adequate but some are brief (e.g., "N/A — configuration data"). CRM timeline correctly identified for lifecycle events. "Appointment reminder sent" as CRM entry in SCHED-023 is a reasonable addition.
Failure classification: CORRECTABLE

Guardrail Awareness: 5/5
Evidence: Telehealth link generation correctly as n8n INTEGRATION. Billing trigger correctly as n8n INTEGRATION. No direct Frappe calls from frontend. All cross-system actions through n8n.
Failure classification: N/A

Dependency Graph Quality: 5/5
Evidence: Valid DAG with 4 phases. Visual dependency map with clear arrow notation. Critical path documented with multiple chains. Parallel execution summary. Phase 4 correctly shows parallel Track A (frontend) and Track B (integration).
Failure classification: N/A

TOTAL: 24/25
Notable strength: Clean separation with each status transition as its own story. Good visual dependency map.
Notable failure: Slightly thin spec gate answers and DocTypes categorized as CONFIG instead of BACKEND (unconventional but defensible).

---

## MODEL: model-zeta | TEST: 01 | RUN: C
Atomicity: 4/5
Evidence: 21 stories. WIKI-005 bundles category update+list (2 endpoints). Most other stories are properly single-endpoint. All S or XS. Clean backend/frontend separation.
Failure classification: CORRECTABLE

Completeness: 5/5
Evidence: All 13 endpoints mapped. All 3 DocTypes. All 3 n8n integrations. Version history and restore as separate endpoint stories (WIKI-012 + WIKI-007). First-publish CRM handled in WIKI-009 publish endpoint.
Failure classification: N/A

Spec Gate Compliance: 4/5
Evidence: All three gates answered for every story. Answers are adequate. CRM timeline correctly identified as N/A with the first-publish exception in WIKI-009. Some answers are brief but accurate.
Failure classification: CORRECTABLE

Guardrail Awareness: 5/5
Evidence: SOP Mojo notification correctly as n8n INTEGRATION with explicit boundary rule. Version restore correctly specified (creates new version). No TypeScript. No direct Frappe calls.
Failure classification: N/A

Dependency Graph Quality: 4/5
Evidence: Valid DAG with 6 phases. Phase 1 is sequential (DocTypes in order) which is stricter than necessary but not wrong. Execution summary table. Critical path identified. Phase parallelization clearly stated.
Failure classification: CORRECTABLE

TOTAL: 22/25
Notable strength: Clean identification of all workflow transitions as separate endpoint stories and correct boundary rule compliance.
Notable failure: Minor bundling of category update+list. Sequential DocType ordering is stricter than needed.

---

## MODEL: model-zeta | TEST: 01 SUMMARY
Run A: 24 | Run B: 24 | Run C: 22
Mean: 23.3 | Range: 2 | Consistency: Medium

Consistency narrative: model-zeta performed strongly across all three runs with scores of 24, 24, and 22. The Run C dip was due to minor bundling and slightly thin spec gates. Runs A and B showed excellent granularity. The model reliably produces complete, well-structured output without the reliability issues seen in model-delta.
Dominant strength: Highly granular decomposition with clean endpoint separation and reliable output completion. Run A produced the most stories (39) of any model.
Dominant weakness: Spec gate answers tend toward brevity in table format. Minor endpoint bundling in Run C.
Prompt engineering note: Add "Spec gate answers must be at least 2 sentences each — explain the WHY, not just the WHAT" to encourage richer gate responses.
