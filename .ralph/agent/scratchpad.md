# ERPNext Mega Agent Run — Scratchpad

## 2026-03-31 — Health Check

All 5 health checks passed:
1. SM_POCDEV_SITE_PASSWORD: SET
2. poc-dev.sparkmojo.com: HTTP/2 200
3. Frappe login: Logged In (session cookie at /tmp/frappe-eval-cookies.txt)
4. Governance repo: writable
5. ERPNEXT_APP_EVALUATION.md: created and committed to sparkmojo-internal

Ready to begin evaluation queue starting with MEGA-001 (Frappe CRM).

## 2026-03-31 — MEGA-001 Research Complete

**Module:** Frappe CRM (crm app, v2.0.0-dev)
**Verdict:** CONFIGURE-AND-SURFACE

Key findings:
- 27 DocTypes in CRM module, all accessible via REST API (HTTP 200, clean JSON)
- 0 records on all DocTypes — clean install, no test data
- CRM v2 Vue frontend NOT deployed (/crm returns 404) — only Frappe Desk views available
- Lead/Opportunity/Contract data models are solid for behavioral health intake pipeline
- Appointment DocType is too basic for clinical scheduling (only 10 fields, no recurrence/rooms/telehealth)
- Lead→Patient boundary needs a design decision (CRM Lead = pre-intake, Healthcare Patient = post-intake)
- Sales Stages need replacement with intake-appropriate stages
- Entry written to /tmp/MEGA-001-entry.md, ready for Writer hat to append to ERPNEXT_APP_EVALUATION.md

## 2026-03-31 — MEGA-001 Writer Complete

- Appended MEGA-001 entry to ERPNEXT_APP_EVALUATION.md
- Updated summary table with verdict: CONFIGURE-AND-SURFACE
- Committed and pushed to sparkmojo-internal (effaccc)
- MEGA-001-COMPLETE marker written
- QUEUE-STATUS.md written (1/18 complete, 0 blocked)
- Ready for next module: MEGA-002 (ERPNext Accounting)

## 2026-03-31 — MEGA-002 Plan Written

**Module:** ERPNext Accounting (Accounts module, erpnext app)
**Capability:** Billing & Payments (CORE)

Plan written to PLAN-MEGA-002.md. Key investigation areas:
- 200+ DocTypes in Accounts module — massive module, most mature in ERPNext
- Primary focus: Sales Invoice, Payment Entry, Account (CoA), Subscription, Pricing Rule
- Behavioral health angle: client invoicing, insurance billing, sliding scale fees, co-pay tracking
- Need to check sm_billing custom app for overlap/wrapping
- Key architectural question: ERPNext as system of record vs invoicing-only with external ledger (QuickBooks/Xero)
- Secondary: Dunning (overdue balances), POS (likely exclude), Loyalty (likely exclude)

## 2026-03-31 — MEGA-002 Research Complete

**Module:** ERPNext Accounting (Accounts module, erpnext app v16.10.1)
**Verdict:** CONFIGURE-AND-SURFACE

Key findings:
- 186 DocTypes in Accounts module — the largest module in ERPNext
- 194 accounts in Chart of Accounts across 2 companies (SMPOC + WP)
- 2 existing test Sales Invoices ($175, $350 for "60-Minute Therapy Session") — proves model works
- Sales Invoice has healthcare-specific fields: patient, ref_practitioner, service_unit, total_insurance_coverage_amount, patient_payable_amount
- Payment Entry has treatment_counselling link — Healthcare integration is active
- Pricing Rules can handle sliding scale fees (customer-specific pricing with min/max)
- Subscription Plans support recurring session billing (Day/Week/Month/Year intervals)
- sm_billing custom app is empty placeholder (.gitkeep only) — no conflict
- Key gap: no ERA/EOB processing, no insurance claim submission, no payer management
- POS module (24 DocTypes) is irrelevant for behavioral health
- All REST API endpoints return clean JSON, no permission issues
- Entry written to /tmp/MEGA-002-entry.md, ready for Writer hat

## 2026-03-31 — MEGA-002 Writer Complete

- Appended MEGA-002 entry to ERPNEXT_APP_EVALUATION.md
- Updated summary table with verdict: CONFIGURE-AND-SURFACE
- Committed and pushed to sparkmojo-internal (be93e0e)
- MEGA-002-COMPLETE marker written
- QUEUE-STATUS.md updated (2/18 complete, 0 blocked)
- Ready for next module: MEGA-003 (Frappe HR / hrms)

## 2026-03-31 — MEGA-003 Plan Written

**Module:** Frappe HR (hrms app, v17.0.0-dev)
**Capability:** HR & Staff Management (CORE)

Plan written to PLAN-MEGA-003.md. Key investigation areas:
- 161 DocTypes across HR (118) and Payroll (43) modules — second-largest after Accounting
- Primary focus: Employee, Attendance, Leave, Shift Management, Salary Structure/Slip
- Behavioral health angle: therapist credential tracking, session coverage scheduling, per-session pay models
- Need to check overlap between HRMS Shift scheduling and Healthcare clinical scheduling
- Employee ↔ Healthcare Practitioner link is critical to understand
- Daily Work Summary could overlap with SM Task
- Payroll: does it support per-session/hourly pay or only monthly salary?
- Recruitment pipeline maturity: does a small practice need this?

## 2026-03-31 — MEGA-003 Research Complete

**Module:** Frappe HR (hrms app, v17.0.0-dev)
**Verdict:** CONFIGURE-AND-SURFACE

Key findings:
- 112 HR DocTypes + 43 Payroll DocTypes = 155 total (second-largest module set)
- 0 Employee records — clean install with seed data only (5 Leave Types, 8 Employment Types, 31 Designations, 27 Departments, 4 Salary Components)
- Employee DocType is highly extensible — can add custom fields for clinical credentials (license, NPI, specialties)
- **Per-session pay is native**: Salary Structure has `salary_slip_based_on_timesheet` + `hour_rate` — handles contract therapist pay without customization
- **Employee ↔ Healthcare Practitioner link confirmed**: Healthcare Practitioner has `employee` Link field — bridge between HR and clinical data already exists
- Shift Type/Schedule/Assignment provides staff availability scheduling — complements (doesn't conflict with) clinical appointment scheduling
- Daily Work Summary is trivial (3 fields, email-based) — zero overlap with SM Task
- Payroll supports Daily/Weekly/Fortnightly/Bimonthly/Monthly frequencies
- All REST API endpoints return clean JSON, no permission issues
- Designations need behavioral health vocabulary additions (Therapist, Clinical Supervisor, etc.)
- Recruitment pipeline is mature (Job Opening → Job Applicant → Interview → Job Offer) but optional for small practices
- Entry written to /tmp/MEGA-003-entry.md, ready for Writer hat

## 2026-03-31 — MEGA-003 Writer Complete

- Appended MEGA-003 entry to ERPNEXT_APP_EVALUATION.md
- Updated summary table with verdict: CONFIGURE-AND-SURFACE
- Committed and pushed to sparkmojo-internal (6207e7f)
- MEGA-003-COMPLETE marker written
- QUEUE-STATUS.md updated (3/18 complete, 0 blocked)
- Ready for next module: MEGA-004 (ERPNext Projects)

## 2026-03-31 — MEGA-004 Plan Written

**Module:** ERPNext Projects (Projects module, erpnext app)
**Capability:** Task & Workboard / Project Management

Plan written to PLAN-MEGA-004.md. Key investigation areas:
- 15 DocTypes in Projects module — small, focused module
- Primary focus: Project, Task, Timesheet, Timesheet Detail
- CRITICAL: ERPNext Task vs SM Task boundary (DECISION-014 says SM Task is custom DocType)
- Timesheet is the bridge between Projects and Payroll (per-session pay found in MEGA-003)
- Activity Type/Cost for behavioral health time categories
- Gantt chart in Frappe Desk — is it good enough for admin project tracking?
- Key question: can ERPNext Projects coexist with SM Task without user confusion?

## 2026-03-31 — MEGA-004 Research Complete

**Module:** ERPNext Projects (Projects module, erpnext app)
**Verdict:** CONFIGURE-AND-SURFACE

Key findings:
- 14 DocTypes in Projects module — small, focused module
- 1 existing Project: "Onboarding - Test Client 001" (PROJ-0001) with 5 instantiated tasks (all Overdue)
- 5 template tasks from "Client Onboarding Template" — proves behavioral health onboarding use case
- 10 total Tasks: 5 templates + 5 instantiated in PROJ-0001
- **Custom `sm_linked_doctype`/`sm_linked_docname` fields already exist on Task** — linking TASK-2026-00006 to `SM Client / Test Client 001`
- ERPNext Task vs SM Task boundary is CLEAN: Task has no Healthcare Link fields (no patient/practitioner/appointment)
- Task statuses: Open/Working/Pending Review/Overdue/Template/Completed/Cancelled
- **Timesheet is the critical bridge**: links to Employee, Project, Task, Activity Type, Salary Slip, AND Sales Invoice
- Timesheet Detail has `is_billable`, `billing_rate`, `billing_amount` — full billing pipeline
- Activity Cost enables per-employee (per-therapist) rate differentiation
- 5 seed Activity Types (generic business), need behavioral health additions
- 0 Timesheets — no time logging data yet
- All REST API endpoints return clean JSON, no permission issues
- Entry written to /tmp/MEGA-004-entry.md, ready for Writer hat

## 2026-03-31 — MEGA-004 Writer Complete

- Appended MEGA-004 entry to ERPNEXT_APP_EVALUATION.md
- Updated summary table with verdict: CONFIGURE-AND-SURFACE
- Committed and pushed to sparkmojo-internal (700d0f0)
- MEGA-004-COMPLETE marker written
- QUEUE-STATUS.md updated (4/18 complete, 0 blocked)
- Ready for next module: MEGA-005 (ERPNext Buying + Selling)

## 2026-03-31 — MEGA-005 Plan Written

**Module:** ERPNext Buying + Selling (Buying: 20 DocTypes, Selling: 18 DocTypes, erpnext app)
**Capability:** Purchasing / Sales operations

Plan written to PLAN-MEGA-005.md. Key investigation areas:
- Buying: Purchase Order, Supplier, RFQ, Supplier Scorecard — formal procurement workflow
- Selling: Customer, Sales Order, Quotation, Product Bundle — sales pipeline
- Critical overlap question: Customer DocType vs CRM Lead vs Healthcare Patient identity model
- Product Bundle potential for therapy session packages
- Likely DEFER/EXCLUDE for most — small practices don't need formal procurement
- But Customer DocType may be load-bearing for Sales Invoice (MEGA-002) and other modules
- SMS Center worth checking for client communication capability

## 2026-03-31 — MEGA-005 Research Complete

**Module:** ERPNext Buying + Selling (Buying: 20 DocTypes, Selling: 18 DocTypes, erpnext app)
**Verdict:** DEFER

Key findings:
- 20 Buying DocTypes + 18 Selling DocTypes = 38 total
- **Customer DocType is load-bearing** — 1 record ("Willow Center Test Patient"), links to Sales Invoice
- Customer has `lead_name` (Link→Lead), `opportunity_name` (Link→Opportunity) — CRM→Customer lifecycle is native
- **"Insurance Payor" Customer Group exists** — Customer can represent both patients and insurance companies
- Customer identity chain: Lead (CRM) → Customer (financial) → Patient (clinical) — clean three-entity model
- Sales Order, Purchase Order, Quotation, Supplier: all 0 records — unused
- Product Bundle is stock-centric (item bundling), NOT suitable for therapy session packages — use Subscription Plans instead
- Selling Settings: `so_required: No` — Sales Invoices work without Sales Orders (confirms direct-invoice workflow)
- SMS Center exists but dormant — requires SMS gateway, n8n is probably better for notifications
- All REST API endpoints return clean JSON, no permission issues
- Buying module (PO, Supplier, RFQ, Scorecard) entirely unnecessary for behavioral health
- Selling module workflows (SO, Quotation) unnecessary — Sales Invoice handles billing directly
- But Customer DocType must be managed through CRM and Billing Mojos
- Entry written to /tmp/MEGA-005-entry.md, ready for Writer hat

## 2026-03-31 — MEGA-005 Writer Complete

- Appended MEGA-005 entry to ERPNEXT_APP_EVALUATION.md
- Updated summary table with verdict: DEFER
- Committed and pushed to sparkmojo-internal (1bd5641)
- MEGA-005-COMPLETE marker written
- QUEUE-STATUS.md updated (5/18 complete, 0 blocked)
- Ready for next module: MEGA-006 (ERPNext Stock + Manufacturing)

## 2026-03-31 — MEGA-006 Plan Written

**Module:** ERPNext Stock + Manufacturing (Stock: 75 DocTypes, Manufacturing: 47 DocTypes, erpnext app)
**Capability:** Inventory / Manufacturing

Plan written to PLAN-MEGA-006.md. Key investigation areas:
- 75 Stock DocTypes + 47 Manufacturing DocTypes = 122 total — third-largest module set
- Primary focus: Item, Price List, Item Price, Warehouse, UOM (load-bearing infrastructure for billing)
- MEGA-002 found Sales Invoices referencing "60-Minute Therapy Session" — need to confirm this is an Item record
- Item is likely load-bearing for Sales Invoice line items — critical dependency to verify
- Manufacturing module should be 0 records across all DocTypes — clean EXCLUDE expected
- Stock inventory features (Serial No, Batch, Stock Entry, Delivery Note) all likely DEFER
- Key question: can Item/Price List be managed through Billing Mojo or does Stock need its own surface?
- Service Item configuration: is_stock_item=0 flag, virtual warehouse requirements

## 2026-03-31 — MEGA-006 Research Complete

**Module:** ERPNext Stock + Manufacturing (Stock: 75 DocTypes, Manufacturing: 47 DocTypes, erpnext app)
**Verdict:** DEFER

Key findings:
- 75 Stock DocTypes + 47 Manufacturing DocTypes = 122 total
- **1 Item record: "THERAPY-SESSION-60"** — confirms Item is load-bearing for Sales Invoice
  - `is_stock_item=0`, `is_sales_item=1`, `item_group=Services`, `stock_uom=Nos`
  - `standard_rate=0` — pricing not set on Item, set directly on Sales Invoice line items
- **0 Item Price records** — Price List mechanism (fee schedules) not yet utilized
- 2 Price Lists: Standard Buying, Standard Selling (both enabled)
- 10 Warehouses across 2 companies (auto-created during setup, unused)
- 239 UOMs (massive seed data); "Hour" and "Nos" exist but no "Session"
- 8 Item Groups including "Services", "Drug", "Laboratory" (Healthcare seed data)
- **All inventory DocTypes: 0 records** — Stock Entry, Stock Ledger Entry, Serial No, Batch, Delivery Note, Purchase Receipt, Material Request
- **All Manufacturing DocTypes: 0 records** — BOM, Work Order, Job Card, Production Plan, Workstation (only 1 seed Operation "Assembly")
- Item has 23 Link/Table fields — complex form with 100+ fields designed for physical goods
- Stock Settings defaults to FIFO valuation, Stores warehouse, auto_indent=1
- Manufacturing Settings minimal (backflush from BOM, 30-day capacity planning)
- All REST API endpoints return clean JSON, no permission issues
- Entry written to /tmp/MEGA-006-entry.md, ready for Writer hat

## 2026-03-31 — MEGA-006 Writer Complete

- Appended MEGA-006 entry to ERPNEXT_APP_EVALUATION.md
- Updated summary table with verdict: DEFER
- Committed and pushed to sparkmojo-internal (6f10789)
- MEGA-006-COMPLETE marker written
- QUEUE-STATUS.md updated (6/18 complete, 0 blocked)
- Ready for next module: MEGA-007 (ERPNext Assets)

## 2026-03-31 — MEGA-007 Plan Written

**Module:** ERPNext Assets (Assets module, erpnext app)
**Capability:** Asset Management

Plan written to PLAN-MEGA-007.md. Key investigation areas:
- 26 DocTypes in Assets module — small, focused module
- Primary focus: Asset, Asset Category, Asset Depreciation Schedule, Asset Maintenance, Location
- Behavioral health angle: clinical equipment tracking (biofeedback, neurofeedback, EEG), office equipment, IT assets
- Check if Location links to Healthcare Service Unit
- Asset Maintenance scheduling — relevant for clinical equipment calibration
- Depreciation methods for tax compliance
- Expected verdict: DEFER (most small practices don't need formal asset management)
- Possible USE-AS-IS if Frappe Desk UI is clean enough for occasional admin use

## 2026-03-31 — MEGA-007 Research Complete

**Module:** ERPNext Assets (Assets module, erpnext app)
**Verdict:** DEFER

Key findings:
- 25 DocTypes in Assets module (plan said 26, actual count is 25)
- 0 records across ALL 14 tested DocTypes — completely clean install, no seed data at all
- Asset DocType has 76 fields — comprehensive lifecycle management (Draft → Submitted → Partially/Fully Depreciated → Sold/Scrapped)
- 3 depreciation methods: Straight Line, Double Declining Balance, Written Down Value (plus Manual)
- Asset has insurance tracking fields (policy_number, insurer, insured_value, date range)
- Asset Maintenance Task has native `maintenance_type: Calibration` with periodicity scheduling — excellent fit for clinical equipment regulatory compliance
- Location is a hierarchical tree with geolocation (lat/lng) — independent from Healthcare Service Unit (no link between them)
- Asset links to Employee (custodian), Company, Item, and accounting via Finance Books
- Asset Repair tracks costs, consumed stock items, and can capitalize repair costs
- All REST API endpoints return clean JSON, HTTP 200, no permission issues
- Entry written to /tmp/MEGA-007-entry.md, ready for Writer hat

## 2026-03-31 — MEGA-007 Writer Complete

- Appended MEGA-007 entry to ERPNEXT_APP_EVALUATION.md
- Updated summary table with verdict: DEFER
- Committed and pushed to sparkmojo-internal (4de8202)
- MEGA-007-COMPLETE marker written
- QUEUE-STATUS.md updated (7/18 complete, 0 blocked)
- Ready for next module: MEGA-008 (ERPNext Quality)

## 2026-03-31 — MEGA-008 Plan Written

**Module:** ERPNext Quality Management (Quality Management module, erpnext app)
**Capability:** Quality Management

Plan written to PLAN-MEGA-008.md. Key investigation areas:
- 16 DocTypes in Quality Management module — small, focused ISO 9001-style QMS
- 0 records across ALL DocTypes — completely unused on POC
- Primary focus: Quality Goal, Quality Action, Non Conformance, Quality Feedback, Quality Procedure
- Behavioral health angle: CARF/Joint Commission accreditation, clinical incident reporting, patient satisfaction, SOP documentation
- Non Conformance could map to clinical incident reports
- Quality Procedure could serve as clinical SOP documentation
- Quality Feedback could overlap with patient satisfaction surveys
- Expected verdict: DEFER or EXCLUDE — most small practices don't need formal QMS

## 2026-03-31 — MEGA-008 Research Complete

**Module:** ERPNext Quality Management (Quality Management module, erpnext app)
**Verdict:** DEFER

Key findings:
- 16 DocTypes in Quality Management module — lightweight ISO 9001-style QMS
- 0 records across ALL 8 parent DocTypes — completely unused on POC
- Quality Goal: measurable objectives with monitoring frequency (Daily/Weekly/Monthly/Quarterly), links to Quality Procedure, child table for objectives with UOM targets
- Quality Procedure: tree structure (nested set with lft/rgt) for hierarchical SOP documentation, process owner (Link→User)
- Non Conformance: 10 fields — simple incident report form (subject, details, corrective/preventive action, status)
- Quality Action: CAPA tracking linked to Review, Feedback, Goal, and Procedure
- Quality Feedback: generic feedback collection with Dynamic Link (User or Customer), template-based parameters
- Quality Review: periodic reviews against Quality Goals with pass/fail status
- Quality Meeting: simple meeting minutes with agenda/minutes child tables
- **No Healthcare module links** — no patient, practitioner, or appointment fields on any DocType
- All 5 tested REST API endpoints return HTTP 200, clean JSON, no permission issues
- Non Conformance is the most clinically relevant DocType (could serve as incident reports with custom field additions)
- Quality Procedure's tree structure is well-suited for clinical SOP documentation
- Entry written to /tmp/MEGA-008-entry.md, ready for Writer hat

## 2026-03-31 — MEGA-008 Writer Complete

- Appended MEGA-008 entry to ERPNEXT_APP_EVALUATION.md
- Updated summary table with verdict: DEFER
- Committed and pushed to sparkmojo-internal (80cdcc2)
- MEGA-008-COMPLETE marker written
- QUEUE-STATUS.md updated (8/18 complete, 0 blocked)
- Group A complete! Ready for Group B: MEGA-009 (Frappe Wiki)

## 2026-03-31 — MEGA-009 Plan Written

**Module:** Frappe Wiki (wiki app, v2.0.0)
**Capability:** Knowledge Base (CORE)

Plan written to PLAN-MEGA-009.md. Key investigation areas:
- 11 DocTypes in Wiki module — small, content-focused module
- 1 Wiki Space exists ("Wiki", route: /docs, published) but 0 Wiki Pages — empty knowledge base
- Wiki Page is simple: title, route, Markdown content, published flag, allow_guest, meta fields
- Wiki Space supports multi-space architecture with branding, sidebars, app switcher
- Wiki Page Revision provides built-in version history
- Wiki Feedback enables per-page rating and feedback collection
- **tabWiki Settings table missing** — possible incomplete migration, needs investigation
- Wiki has its own web frontend (not Frappe Desk) — need to evaluate that UI
- Key overlap questions: vs Quality Procedure (MEGA-008) for SOPs, vs LMS (MEGA-010) for training
- Behavioral health angle: HIPAA policies, clinical SOPs, employee handbook, insurance billing guides

## 2026-03-31 — Recovery: MEGA-009 Dispatch

Previous iteration wrote MEGA-009 plan but did not emit an event. Recovering by dispatching Researcher for MEGA-009 (Frappe Wiki).

State: Group A (MEGA-001 through MEGA-008) all complete. Group B starting with MEGA-009.
Next: Emit plan.ready to trigger Researcher hat for MEGA-009.

## 2026-03-31 — MEGA-009 Research Complete

**Module:** Frappe Wiki (wiki app, v2.0.0, develop branch)
**Verdict:** CONFIGURE-AND-SURFACE

Key findings:
- 11 DocTypes in Wiki module + 6 additional tables in DB (17 total) — TWO data model generations
- **Legacy model (Wiki Page):** simple Markdown pages, flat structure, basic review via Wiki Page Patch
- **Current model (Wiki Document):** hierarchical tree (nested set lft/rgt), git-like revision system with Wiki Revision + Wiki Content Blob, PR-style review via Wiki Change Request
- Wiki Change Request has full workflow: Draft → Open → In Review → Changes Requested → Approved → Merged → Archived, with reviewers + participants tables
- 1 Wiki Space exists ("Wiki", route: /docs, published)
- 2 Wiki Documents: root group + "Welcome to Frappe Wiki" — both **unpublished** → `/docs` returns **404**
- 0 Wiki Pages, 0 Revisions, 0 Change Requests, 0 Feedback records — completely empty content
- Permission model: System Manager + Wiki Approver roles only
- All REST API endpoints return clean JSON, HTTP 200, no permission issues
- **PR-style change request workflow is standout feature** for compliance documentation (HIPAA policy review)
- Wiki has its own dedicated web frontend at /docs — not Frappe Desk
- Wiki vs Quality Procedure: recommend Wiki for knowledge base, deprecate Quality Procedure for SOPs
- Entry written to /tmp/MEGA-009-entry.md, ready for Writer hat

## 2026-03-31 — MEGA-009 Writer Complete

- Appended MEGA-009 entry to ERPNEXT_APP_EVALUATION.md
- Updated summary table with verdict: CONFIGURE-AND-SURFACE
- Committed and pushed to sparkmojo-internal (398cc04)
- MEGA-009-COMPLETE marker written
- QUEUE-STATUS.md updated (9/18 complete, 0 blocked)
- Ready for next module: MEGA-010 (Frappe Learning / LMS)

## 2026-03-31 — MEGA-010 Plan Written

**Module:** Frappe Learning / LMS (lms app, v2.45.2, develop branch)
**Capability:** Training / LMS (CORE)

Plan written to PLAN-MEGA-010.md. Key investigation areas:
- 66 DocTypes in LMS module — large, feature-rich learning management system
- 0 records across LMS Course, LMS Batch, LMS Quiz — completely unused on POC
- **tabLMS Settings table MISSING** — possible incomplete migration, Researcher should investigate
- Full content model: Course → Chapter → Lesson, Quiz/Assessment/Assignment
- Enrollment + Progress tracking, Batch (cohort) delivery, Program (multi-course) grouping
- Certificate + Badge system for gamification/compliance
- Live Class with Zoom/Google Meet integration hooks
- LMS has its own web frontend (not Frappe Desk) — needs UI evaluation
- Behavioral health angle: HIPAA training, CEU tracking, supervision documentation, onboarding
- Key overlap: Wiki (MEGA-009) for reference docs vs LMS for structured training paths

## 2026-03-31 — MEGA-010 Research Complete

**Module:** Frappe Learning / LMS (lms app, v2.45.2, develop branch, 66 DocTypes)
**Verdict:** CONFIGURE-AND-SURFACE

Key findings:
- 66 DocTypes in LMS module — comprehensive learning management system
- 0 records across ALL parent DocTypes except LMS Category (7 seed records: Web Development, Business, Design, Personal Development, Finance, Frontend, Framework)
- **tabLMS Settings TABLE MISSING** — same migration gap pattern as Wiki Settings (MEGA-009). `bench migrate` needed.
- LMS web frontend at `/lms/courses` returns 404 — expected when Settings missing and no content exists
- Content hierarchy: LMS Course → Course Chapter → Course Lesson (Markdown + YouTube + SCORM + File attachments)
- Assessment engine: LMS Quiz with questions, max_attempts, passing_percentage, duration, negative marking, shuffle
- Batch (cohort) delivery with timetables, seat counts, Online/Offline modes, Zoom/Google Meet integration
- LMS Program groups multiple courses with `enforce_course_order` — perfect for structured onboarding paths
- LMS Certificate has `issue_date` + `expiry_date` — built-in annual recertification tracking
- LMS Certificate Request has evaluator review workflow (Upcoming/Completed/Cancelled)
- LMS Enrollment tracks member_type (Student/Mentor/Staff) and role (Member/Admin) — but links to User, NOT Employee
- LMS Badge gamification system with event-based triggers (New/Value Change/Manual Assignment)
- LMS Live Class has full Zoom + Google Meet integration with meeting_id, join_url, auto_recording
- No Healthcare module links — no patient/practitioner/appointment fields
- All REST API endpoints return HTTP 200 except LMS Settings (table missing)
- Behavioral health fit: HIPAA training, CEU tracking, clinical supervision, new hire onboarding
- Custom fields needed: CEU credit hours on Course, license type requirements, Employee link on Enrollment
- Entry written to /tmp/MEGA-010-entry.md, ready for Writer hat

## 2026-03-31 — MEGA-010 Writer Complete

- Appended MEGA-010 entry to ERPNEXT_APP_EVALUATION.md
- Updated summary table with verdict: CONFIGURE-AND-SURFACE
- Committed and pushed to sparkmojo-internal (e91030f)
- MEGA-010-COMPLETE marker written
- QUEUE-STATUS.md updated (10/18 complete, 0 blocked)
- Group B progress: 2/5 complete (MEGA-009, MEGA-010). Next: MEGA-011 (Frappe Helpdesk)

## 2026-03-31 — MEGA-011 Plan Written

**Module:** Frappe Helpdesk (helpdesk app, v1.21.3, develop branch)
**Capability:** Support / Helpdesk (CORE)

Plan written to PLAN-MEGA-011.md. Key investigation areas:
- 40 DocTypes in Helpdesk module — medium-sized, full-featured ticketing system
- Some seed data exists: 1 ticket, 2 teams, 4 statuses, 4 priorities, 4 types, 1 SLA, 1 article
- 0 agents, 0 customers, 0 organizations — no real usage yet
- Has its own web frontend at /helpdesk — separate from Frappe Desk
- Key overlap question: HD Ticket vs SM Task — complementary or redundant?
- HD Customer vs Frappe Customer (CRM) — potential identity duplication
- SLA engine with escalation rules — may be overkill for small practices
- Built-in knowledge base (HD Article) — overlap with Wiki (MEGA-009)
- Portal signup capability for self-service customer access

## 2026-03-31 — MEGA-011 Research Complete

**Module:** Frappe Helpdesk (helpdesk app, v1.21.3, develop branch, 40 DocTypes)
**Verdict:** DEFER

Key findings:
- 40 DocTypes in Helpdesk module, all prefixed "HD"
- 1 HD Ticket (welcome/sample), 2 HD Teams (Billing, Product Experts), 4 statuses, 4 priorities, 4 types, 1 SLA, 1 article, 1 template — all seed data
- 0 HD Agents, 0 HD Customers, 0 HD Organizations — no real usage
- **HD Settings table MISSING** — same migration gap as Wiki/LMS Settings. `/helpdesk` portal returns 404.
- HD Ticket has rich field model: SLA tracking (response_by/resolution_by with agreement_status), feedback rating, merge/split support, customer portal flag
- HD Agent is extremely lightweight: just user (Link→User), agent_name, image, is_active
- HD Customer is **completely independent from Frappe Customer/CRM** — potential identity duplication
- HD SLA engine: priority-based response/resolution times with business hours (Mon-Fri 10-18), per-priority tiers (Urgent: 30min response/2hr resolution → Low: 24hr/72hr)
- HD Escalation Rule: condition-based routing (match priority/team/type → escalate to agent/team/priority/type)
- HD Article: simple knowledge base with Published/Draft/Archived workflow, views counter, slug-based routing
- HD Saved Reply: canned responses with Global/Team/Personal scoping
- HD Ticket Comment: comments with reactions and pin support
- HD Notification: in-app notifications for Assignment/Mention/Reaction
- All 9 REST API endpoints return HTTP 200 except HD Settings (500, table missing)
- Helpdesk has its own Vue.js SPA portal at /helpdesk — not Frappe Desk
- Partial overlap with SM Task/Workboard but clear boundary: SM Task = clinical/operational work, HD Ticket = support requests with SLA
- Entry written to /tmp/MEGA-011-entry.md, ready for Writer hat

## 2026-03-31 — Recovery: MEGA-011 Dispatch to Writer

Previous iteration completed MEGA-011 research but did not emit an event. Recovering by emitting `research.ready` to trigger Writer hat for MEGA-011 (Frappe Helpdesk).

State: MEGA-001 through MEGA-010 all complete. MEGA-011 research complete, entry at /tmp/MEGA-011-entry.md.
Next: Emit research.ready to trigger Writer hat for MEGA-011.

## 2026-03-31 — MEGA-011 Writer Complete

- Appended MEGA-011 entry to ERPNEXT_APP_EVALUATION.md
- Updated summary table with verdict: DEFER
- Committed and pushed to sparkmojo-internal (2cee7a5)
- MEGA-011-COMPLETE marker written
- QUEUE-STATUS.md updated (11/18 complete, 0 blocked)
- Group B progress: 3/5 complete (MEGA-009, MEGA-010, MEGA-011). Next: MEGA-012 (Frappe Payments)

## 2026-03-31 — MEGA-012 Plan Written

**Module:** Frappe Payments (payments app, v0.0.1, develop branch)
**Capability:** Billing & Payments (CORE)

Plan written to PLAN-MEGA-012.md. Key investigation areas:
- payments app has 2 modules: Payments (1 DocType) + Payment Gateways (9 DocTypes) = 10 total
- 0 records across ALL DocTypes — completely unconfigured
- Stripe Settings is minimal: gateway_name, publishable_key, secret_key, header_img, redirect_url
- 9 gateway integrations: Stripe, PayPal, Razorpay, Braintree, GoCardless, Mpesa, Paymob, Paytm + GoCardless Mandate
- Payment Request (ERPNext Accounts) has rich workflow: Draft → Requested → Initiated → Partially Paid → Paid → Failed → Cancelled
- Payment Request supports Inward/Outward types, Email/Phone/Other channels, payment_url generation
- Need to check: Stripe webhook support, subscription billing, overlap with sm_billing
- Expected verdict: CONFIGURE-AND-SURFACE (Stripe is essential for billing, needs Mojo for staff)

## 2026-03-31 — MEGA-012 Research Complete

**Module:** Frappe Payments (payments app, v0.0.1, develop branch)
**Verdict:** CONFIGURE-AND-SURFACE

Key findings:
- 10 DocTypes total: 1 in Payments module (Payment Gateway) + 9 in Payment Gateways module (gateway settings)
- 0 records across ALL DocTypes — completely unconfigured, no payment processing has occurred
- Stripe Settings is extremely minimal: just 5 fields (gateway_name, publishable_key, secret_key, header_img, redirect_url)
- Payment Request (from Accounts/ERPNext, not payments app) is the rich workflow DocType: 30+ fields, status workflow (Draft → Paid/Failed/Cancelled), payment_url generation, Jinja-templated email messages, is_a_subscription + subscription_plans support
- Payment Gateway Account links gateways to Company + GL Account
- **4 gateway tables MISSING**: PayPal Settings, Razorpay Settings, Paymob Settings, Paytm Settings — same migration gap as Wiki/LMS/Helpdesk
- **5 gateway tables EXIST** (all 0 records): Stripe Settings, Braintree Settings, GoCardless Settings, GoCardless Mandate, Mpesa Settings
- sm_billing app directory exists but is empty (no code) — no conflict
- All relevant REST API endpoints return HTTP 200, clean JSON, no permission issues
- Stripe is the right gateway for US behavioral health
- Payment Request needs custom fields for insurance/self-pay classification when sm_billing is built
- Entry written to /tmp/MEGA-012-entry.md, ready for Writer hat

## 2026-03-31 — MEGA-012 Writer Complete

- Appended MEGA-012 entry to ERPNEXT_APP_EVALUATION.md
- Updated summary table with verdict: CONFIGURE-AND-SURFACE
- Committed and pushed to sparkmojo-internal (4ab32e8)
- MEGA-012-COMPLETE marker written
- QUEUE-STATUS.md updated (12/18 complete, 0 blocked)
- Group B progress: 4/5 complete (MEGA-009, MEGA-010, MEGA-011, MEGA-012). Next: MEGA-013 (Marley Health)

## 2026-03-31 — MEGA-013 Plan Written

**Module:** Marley Health / Healthcare (healthcare app, v16.0.7, version-16 branch)
**Capability:** Clinical Documentation / Healthcare (INDUSTRY)

Plan written to PLAN-MEGA-013.md. Key investigation areas:
- 120 DocTypes in Healthcare module — by far the largest module on the POC
- 0 records across ALL key DocTypes (Patient, Practitioner, Appointment, Encounter, Therapy Session, Clinical Note, Vital Signs)
- **tabHealthcare Settings TABLE MISSING** — same migration gap pattern as Wiki/LMS/Helpdesk
- Completely unconfigured and unused
- Core clinical DocTypes: Patient, Healthcare Practitioner, Patient Appointment, Patient Encounter, Clinical Note
- Therapy-specific: Therapy Session, Therapy Type, Therapy Plan — appear exercise/rehab-focused, need investigation for behavioral health fit
- Assessment engine: Patient Assessment with templates — could serve PHQ-9, GAD-7, etc.
- Insurance model: Insurance Payor, Insurance Claim, Patient Insurance Policy — basic structure, likely insufficient for US 835/837 EDI
- Inpatient module likely irrelevant for outpatient behavioral health
- This is THE industry module — expected verdict: CONFIGURE-AND-SURFACE

## 2026-03-31 — MEGA-013 Research Complete

**Module:** Marley Health / Healthcare (healthcare app, v16.0.7, version-16 branch, 120 DocTypes)
**Verdict:** CONFIGURE-AND-SURFACE

Key findings:
- 120 DocTypes in Healthcare module — the largest module on the POC by far
- 0 records across ALL key clinical DocTypes (Patient, Practitioner, Appointment, Encounter, Therapy Session, Clinical Note, Vital Signs, Insurance Claim, Assessment)
- Only seed data: 23 Medical Departments (all hospital-oriented, no behavioral health) and 2 Healthcare Service Units
- **Healthcare Settings singleton WORKS** — table exists, accessible via direct resource path. HTTP 500 on list endpoint is expected singleton behavior. 14 configured values including SMS templates and patient naming.
- **Patient (60 fields):** solid demographics with contacts, insurance, social/substance history, Link→Customer. Good foundation.
- **Healthcare Practitioner (50 fields):** Link→Employee, Link→User, scheduling, consulting charges, Google Calendar, portal. Good foundation.
- **Patient Appointment (65 fields):** rich scheduling with insurance verification, video conferencing (Google Meet), reminders, queue position, referral tracking. Very good fit.
- **Patient Encounter (57 fields):** clinical documentation with symptoms/diagnosis (Table MultiSelect), medical codes (codification table), drug/lab/procedure/therapy prescriptions. Designed for medical encounters, needs behavioral health customization (DAP/SOAP/BIRP note types, treatment goals, risk assessment).
- **Therapy Session/Type: PHYSICAL THERAPY FOCUSED** — exercises, body parts, nursing checklists. NOT suitable for behavioral health talk therapy. Use Patient Encounter instead.
- **Patient Assessment Template:** simple scored template system (scale_min/max + parameters). Good architecture for PHQ-9, GAD-7, PCL-5 but templates need creation.
- **Insurance Claim (37 fields):** basic claim TRACKING (amounts: claim/approved/rejected/outstanding/paid). NOT a claims ENGINE — no EDI 837/835, no CPT validation, no clearinghouse integration.
- **Clinical Note (14 fields):** lightweight free-text note with practitioner link and reference doc. Adequate for simple notes.
- All 7 tested REST API endpoints return HTTP 200 (Healthcare Settings returns 500 on list but 200 on direct access)
- Entry written to /tmp/MEGA-013-entry.md, ready for Writer hat

## 2026-03-31 — MEGA-013 Writer Complete

- Appended MEGA-013 entry to ERPNEXT_APP_EVALUATION.md
- Updated summary table with verdict: CONFIGURE-AND-SURFACE
- Committed and pushed to sparkmojo-internal (8e50874)
- MEGA-013-COMPLETE marker written
- QUEUE-STATUS.md updated (13/18 complete, 0 blocked)
- Group B progress: 5/5 complete (MEGA-009 through MEGA-013). Group C starting next: MEGA-014 (ERPNext Subcontracting)

## 2026-03-31 — MEGA-014 Plan Written

**Module:** ERPNext Subcontracting (erpnext app, Subcontracting module)
**Capability:** Subcontracting / Outsourced Manufacturing

Plan written to PLAN-MEGA-014.md. Key investigation areas:
- 13 DocTypes in Subcontracting module — manufacturing/supply chain focused
- 0 records across ALL parent DocTypes — completely unused on POC
- Main workflow: Subcontracting Order → send materials to supplier → Subcontracting Receipt
- Subcontracting BOM defines bill of materials for outsourced items
- Subcontracting Inward Order for inward processing
- Zero relevance to behavioral health — expected verdict: EXCLUDE
- Group C progress: starting 1/5 (MEGA-014). Groups A+B complete (13/13).

## 2026-03-31 — MEGA-014 Research Complete

**Module:** ERPNext Subcontracting (erpnext app, Subcontracting module, 13 DocTypes)
**Verdict:** EXCLUDE

Key findings:
- 13 DocTypes in Subcontracting module, all manufacturing/supply-chain focused
- 0 records across ALL 4 parent DocTypes (Subcontracting Order, BOM, Receipt, Inward Order)
- Subcontracting Order: links to Supplier, Purchase Order, Warehouse, Item — full manufacturing workflow
- Subcontracting Receipt: receiving finished goods with return support, rejected warehouse, bill tracking
- Subcontracting BOM: finished_good → service_item mapping with quantities and UOM
- No links to Employee, Patient, Healthcare Practitioner, or any HR/Healthcare module
- All 4 REST API endpoints return HTTP 200, clean JSON, no permission issues
- Zero behavioral health relevance — pure manufacturing module
- Entry written to /tmp/MEGA-014-entry.md, ready for Writer hat

## 2026-03-31 — MEGA-014 Writer Complete

- Appended MEGA-014 entry to ERPNEXT_APP_EVALUATION.md
- Updated summary table with verdict: EXCLUDE
- Committed and pushed to sparkmojo-internal (31e8a0a)
- MEGA-014-COMPLETE marker written
- QUEUE-STATUS.md updated (14/18 complete, 0 blocked)
- Group C progress: 1/5 complete (MEGA-014). Next: MEGA-015 (ERPNext Regional)

## 2026-03-31 — MEGA-015 Plan Written

**Module:** ERPNext Regional (erpnext app, Regional module)
**Capability:** Tax/compliance modules

Plan written to PLAN-MEGA-015.md. Key investigation areas:
- Only 5 DocTypes in Regional module — very small
- All DocTypes are non-US focused: South Africa VAT Settings, UAE VAT Account, UAE VAT Settings, Lower Deduction Certificate, Import Supplier Invoice
- 0 records across all DocTypes — completely unused
- Zero relevance to US behavioral health — expected verdict: EXCLUDE
- Group C progress: 2/5 in progress (MEGA-014 complete, MEGA-015 planned)

## 2026-03-31 — MEGA-015 Research Complete

**Module:** ERPNext Regional (erpnext app, Regional module, 5 DocTypes)
**Verdict:** EXCLUDE

Key findings:
- 5 DocTypes confirmed in Regional module: South Africa VAT Settings, UAE VAT Settings, UAE VAT Account, Lower Deduction Certificate, Import Supplier Invoice
- 0 records across ALL 5 DocTypes — completely unused
- All DocTypes are for non-US jurisdictions (South Africa, UAE, India)
- South Africa VAT Settings: just company + vat_accounts child table — SA-specific
- UAE VAT Settings: just company + uae_vat_accounts child table — UAE-specific
- UAE VAT Account: child table with single account (Link→Account) field
- Lower Deduction Certificate: India TDS tax withholding — 10 fields including PAN, supplier, rate, certificate limits
- Import Supplier Invoice: bulk zip import tool — company, item_code, supplier_group, tax_account, zip_file
- All 5 REST API endpoints return HTTP 200, clean JSON, 0 records, no permission issues
- Zero relevance to US behavioral health — no US tax compliance features anywhere in module
- Entry written to /tmp/MEGA-015-entry.md, ready for Writer hat

## 2026-03-31 — MEGA-015 Writer Complete

- Appended MEGA-015 entry to ERPNEXT_APP_EVALUATION.md
- Updated summary table with verdict: EXCLUDE
- Committed and pushed to sparkmojo-internal (17c3a5b)
- MEGA-015-COMPLETE marker written
- QUEUE-STATUS.md updated (15/18 complete, 0 blocked)
- Group C progress: 2/5 complete (MEGA-014, MEGA-015). Next: MEGA-016 (ERPNext Integrations)

## 2026-03-31 — MEGA-016 Plan Written

**Module:** ERPNext Integrations (frappe core Integrations + ERPNext Integrations modules)
**Capability:** Third-party integration hooks

Plan written to PLAN-MEGA-016.md. Key investigation areas:
- Two modules: Frappe Integrations (24 DocTypes) + ERPNext Integrations (1 DocType: Plaid Settings) = 25 total
- 1 Social Login Key record exists; all other DocTypes have 0 records
- OAuth Settings table MISSING — same migration gap pattern
- Plaid Settings table MISSING — same pattern
- OAuth infrastructure: Client, Bearer Token, Auth Code, Provider Settings, Scope, Client Role
- Webhook system: Webhook, Data, Header, Request Log, Query Parameters
- Connected Apps: Google Calendar/Contacts/Settings, Social Login Key, Slack Webhook URL
- Infrastructure: Integration Request, LDAP Settings/Group Mapping, Geolocation, Push Notification, Token Cache
- Expected verdict: USE-AS-IS — admin/infrastructure DocTypes, no React Mojo needed
- Group C progress: 3/5 in progress (MEGA-014, MEGA-015 complete, MEGA-016 planned)

## 2026-03-31 — MEGA-016 Research Complete

**Module:** ERPNext Integrations / Frappe Integrations (frappe core + erpnext, 25 DocTypes total)
**Verdict:** USE-AS-IS

Key findings:
- 24 DocTypes in Frappe Integrations module + 1 in ERPNext Integrations (Plaid Settings) = 25 total
- 1 Social Login Key record (Google, enabled with client_id configured) — only configured record across both modules
- All other DocTypes: 0 records — no webhooks, no OAuth clients, no Connected Apps, no integration requests
- **No missing tables** — earlier plan flagged OAuth Settings and Plaid Settings as TABLE MISSING but both return HTTP 200 on direct singleton access. The HTTP 500 on list endpoints is standard singleton behavior (same as Google Settings, LDAP Settings, etc.)
- 6 singleton DocTypes return HTTP 500 on list but HTTP 200 on direct access: Google Settings, LDAP Settings, Push Notification Settings, Geolocation Settings, OAuth Provider Settings, OAuth Settings
- Webhook system is well-designed: Jinja-templated JSON bodies, condition filters, multiple HTTP methods, security via webhook_secret — perfect bridge to n8n
- OAuth Client supports full OAuth2 flows (Authorization Code, Implicit) with role-based access control
- Connected App provides OAuth2 client for external services (Google, Microsoft, etc.)
- Google Calendar sync is bidirectional with per-user configuration — high-value for practitioner scheduling
- Google SSO partially configured (Social Login Key exists with client_id)
- Plaid integration available for bank reconciliation when sm_billing is built
- All infrastructure/admin DocTypes — staff never interact directly, Frappe Desk UI fully acceptable
- Entry written to /tmp/MEGA-016-entry.md, ready for Writer hat

## 2026-03-31 — MEGA-016 Writer Complete

- Appended MEGA-016 entry to ERPNEXT_APP_EVALUATION.md
- Updated summary table with verdict: USE-AS-IS
- Committed and pushed to sparkmojo-internal (a574380)
- MEGA-016-COMPLETE marker written
- QUEUE-STATUS.md updated (16/18 complete, 0 blocked)
- Group C progress: 3/5 complete (MEGA-014, MEGA-015, MEGA-016). Next: MEGA-017 (ERPNext Website)

## 2026-03-31 — MEGA-017 Plan Written

**Module:** ERPNext Website (frappe core, Website module)
**Capability:** Web presence tools

Plan written to PLAN-MEGA-017.md. Key investigation areas:
- 37 DocTypes in Website module — Frappe's built-in CMS/website builder
- 15 Web Form records exist — need to check what they create
- 28 Web Template records — likely built-in Jinja templates
- 10 UTM Source records — some analytics tracking configured
- 1 Website Theme record — probably default theme
- 4 singleton tables MISSING: Website Settings, Portal Settings, About Us Settings, Contact Us Settings
- Website Script table also MISSING
- Most parent DocTypes have 0 records — largely unused CMS
- Help Article/Category overlap with Wiki module (MEGA-009, verdict: DEFER)
- Expected verdict: DEFER — React frontend is the web presence, not Frappe CMS
- Group C progress: 4/5 in progress (MEGA-014, MEGA-015, MEGA-016 complete, MEGA-017 planned). Next after: MEGA-018 (ERPNext Workflow Engine)

## 2026-03-31 — MEGA-017 Research Complete

**Module:** ERPNext Website (frappe core, Website module, 37 DocTypes)
**Verdict:** DEFER

Key findings:
- 37 DocTypes in Website module — Frappe's built-in CMS/website builder
- 15 Web Form records — all standard, all published except tickets (HD Ticket). Notable: 4 healthcare forms (patient-appointments, patient-registration, personal-details, prescription) linked to Patient/Appointment/Encounter DocTypes
- 28 Web Template records — all built-in Jinja templates (Hero, Section with Cards, etc.)
- 1 Website Theme record — "Standard" (default)
- 10 UTM Source records — seed data (Existing Customer, Reference, Advertisement, etc.)
- 0 records for all other DocTypes: Web Page, Help Article, Discussion Topic, Web Page View, etc.
- **No missing tables** — all 5 singletons (Website Settings, Portal Settings, About Us Settings, Contact Us Settings, Website Script) accessible via direct resource path (HTTP 200)
- Website Settings: disable_signup=1, google_analytics_anonymize_ip=1, auto_account_deletion=72 hours
- Portal Settings: default_role=Patient, 14 menu items configured including Patient Portal
- GDPR compliance infrastructure: Personal Data Deletion/Download Request DocTypes with auto-processing
- CMS entirely superseded by React frontend — no Mojo needed
- Web Forms and Portal potentially useful for patient self-service in future, but likely replaced by React-based intake
- Entry written to /tmp/MEGA-017-entry.md, ready for Writer hat

## 2026-03-31 — MEGA-017 Writer Complete

- Appended MEGA-017 entry to ERPNEXT_APP_EVALUATION.md
- Updated summary table with verdict: DEFER
- Committed and pushed to sparkmojo-internal (84d6c23)
- MEGA-017-COMPLETE marker written
- QUEUE-STATUS.md updated (17/18 complete, 0 blocked)
- Group C progress: 4/5 complete (MEGA-014, MEGA-015, MEGA-016, MEGA-017). Next: MEGA-018 (ERPNext Workflow Engine) — the FINAL module

## 2026-03-31 — MEGA-018 Plan Written

**Module:** ERPNext Workflow Engine (frappe core, Workflow module)
**Capability:** Native workflow system — critical for WorkflowMojo design

Plan written to PLAN-MEGA-018.md. Key investigation areas:
- 9 DocTypes in Workflow module — Frappe's generic state machine system
- 0 active workflows configured — completely unused on POC
- 3 seed Workflow States: Pending, Approved, Rejected
- 3 seed Workflow Action Masters: Approve, Reject, Review
- Workflow is generic — applies to ANY DocType via document_type Link field
- Workflow Document State child table defines states with role-based editing, email alerts, doc_status control
- Workflow Transition child table defines state→action→next_state with Python conditions and role restrictions
- Workflow Action is a runtime queue tracking pending approval actions per user
- High behavioral health relevance: treatment plan approvals, clinical note sign-off, insurance pre-auth workflows
- Does NOT conflict with SM Task — complementary (Workflow operates on DocType state transitions, SM Task is standalone work items)
- Expected verdict: CONFIGURE-AND-SURFACE — engine is USE-AS-IS for admin, but React Mojo needed for staff workflow visibility
- This is the FINAL module (18 of 18). After MEGA-018 research + write, the entire evaluation is complete.
- Group C progress: 5/5 in progress (MEGA-014, MEGA-015, MEGA-016, MEGA-017 complete, MEGA-018 planned)

## 2026-03-31 — MEGA-018 Research Complete

**Module:** ERPNext Workflow Engine (frappe core, Workflow module, 9 DocTypes)
**Verdict:** CONFIGURE-AND-SURFACE

Key findings:
- 9 DocTypes in Workflow module — Frappe's generic state machine system
- 0 active workflows configured — completely unused on POC
- 3 seed Workflow States: Pending (no style, question-sign), Approved (Success, ok-sign), Rejected (Danger, remove)
- 3 seed Workflow Action Masters: Approve, Reject, Review
- 0 Workflow Actions (runtime queue empty — no workflows active means no pending approvals)
- 0 Workflow Transition Tasks defined
- **Workflow (10 fields):** generic state machine binding — document_type (Link→DocType), is_active, override_status, send_email_alert, enable_action_confirmation, states (Table→Workflow Document State), transitions (Table→Workflow Transition), workflow_state_field, workflow_data (JSON)
- **Workflow Document State (12 fields):** state (Link→Workflow State), doc_status (0/1/2), update_field/value, evaluate_as_expression, is_optional_state, avoid_status_override, next_action_email_template (Link→Email Template), allow_edit (Link→Role), send_email, message
- **Workflow Transition (10 fields):** state→action→next_state pattern, allowed (Link→Role), allow_self_approval, send_email_to_creator, transition_tasks (Link→Workflow Transition Tasks), condition (Python code with frappe.db/session/utils access)
- **Workflow Action (8 fields):** runtime approval queue — status (Open/Completed), reference_doctype/name (Dynamic Link), workflow_state, user/completed_by (Link→User), permitted_roles (Table MultiSelect)
- Rich Python API: get_transitions, apply_workflow, bulk_workflow_approval, has_approval_access, validate_workflow, get_workflow_state_field, send_email_alert
- Condition sandbox exposes only `frappe` global (frappe.db, frappe.session, frappe.utils) — sufficient for compliance rules
- Workflow Builder UI confirmed active (workflow_builder_id fields present)
- All 5 REST API endpoints return HTTP 200
- **THIS IS THE FINAL MODULE (18 of 18).** All research complete.
- Entry written to /tmp/MEGA-018-entry.md, ready for Writer hat

## 2026-03-31 — MEGA-018 Writer Complete

- Appended MEGA-018 entry to ERPNEXT_APP_EVALUATION.md
- Updated summary table with verdict: CONFIGURE-AND-SURFACE
- Added "Evaluation Complete" section with verdict distribution, top 3 findings, and recommended design session order
- Updated document status from "In Progress" to "Complete"
- Committed and pushed to sparkmojo-internal (62af7e4)
- MEGA-018-COMPLETE marker written
- MEGA-RUN-COMPLETE marker written
- QUEUE-STATUS.md updated (18/18 complete, 0 blocked)

## 2026-03-31 — EVALUATION COMPLETE

**All 18 modules evaluated.** Final verdict distribution:
- CONFIGURE-AND-SURFACE: 9 (CRM, Accounting, HR, Projects, Wiki, LMS, Payments, Healthcare, Workflow Engine)
- DEFER: 5 (Buying+Selling, Stock+Mfg, Assets, Helpdesk, Website)
- EXCLUDE: 2 (Subcontracting, Regional)
- USE-AS-IS: 2 (Quality Management, Integrations)

Top 3 recommended design sessions: Healthcare → Workflow Engine → CRM

## 2026-03-31 — Queue Complete (Final Iteration)

Story Planner confirmed all 18 MEGA-NNN-COMPLETE markers present + MEGA-RUN-COMPLETE exists.
ERPNEXT_APP_EVALUATION.md verified complete: summary table (18 rows), all 18 module entries, Evaluation Complete section with verdict distribution and recommended design session order.
Emitting queue.complete event. LOOP_COMPLETE.
