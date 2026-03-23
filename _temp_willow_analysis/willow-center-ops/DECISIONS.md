# Willow Center Ops — Decision Log

A running record of decisions made, context behind them, alternatives considered,
and open questions. Maintained for internal reference and as the basis for
client-facing documentation.

---

## 2026-03-12

---

### D-001 · Product vision: modular operations platform

**Decision:** Build a modular web application ("Willow Ops") where each operational
area is a separate module sharing a common design language, notification layer, and
executive reporting view. Initial module is Onboarding. Subsequent modules are
Revenue Cycle, Voicemail Triage, and Command Center.

**Context:** Willow Center currently runs all operations out of spreadsheets — one
per workflow, each an island. The 24s/24c spreadsheet alone has 10,000+ rows across
5 years. Staff coordinate by scanning rows. No task assignment, no urgency flagging,
no aggregate visibility.

**Alternatives considered:**
- Enhance the existing spreadsheet with more structure — rejected, doesn't solve the
  visibility or task management problem
- Off-the-shelf practice management add-on — rejected, nothing fits the specific
  operational workflows and Willow is mid-transition on EHR anyway

**Outcome:** Willow Ops. Onboarding module first. Extensible to other workflows.

---

### D-002 · Onboarding definition

**Decision:** Onboarding = first contact through moment of first appointment.

**Context:** Needed a shared definition before mapping the process. This covers:
scheduling, paperwork collection, insurance verification, and SP record completion.
Post-appointment (notes, claims, billing) is out of scope for this module.

---

### D-003 · Data source: Google Sheets as PHI-safe backend

**Decision:** Use the existing 24s/24c Google Sheet as the live data layer for the
Onboarding module. The app reads and writes directly to the sheet via Google Sheets
API. PHI stays in Google Sheets — it does not move into the app's hosting
environment.

**Context:** Willow already has a Google Workspace BAA. The 24s spreadsheet already
lives in Google Sheets. The data model is fully defined by the existing columns.
This means no migration, no new HIPAA agreements, and no rebuild of the data
structure — just a UI layer on top of what already exists.

**Alternatives considered:**
- Provision a new HIPAA-compliant database (Supabase, Airtable with BAA) — rejected
  for MVP, adds complexity and cost when Google Sheets already works
- Use SimplePractice as data source — blocked, SP API access is not available;
  nightly data dump to data lake is the long-term answer but not yet in place

**HIPAA posture:** Google Workspace BAA covers Sheets. PHI is retained in Google.
The static app host (see D-005) serves files only and does not store or process PHI.

---

### D-004 · Auth: Google OAuth via Workspace

**Decision:** Authentication is Google OAuth using the existing Workspace account.
Staff sign in with their @willowcenter.com Google account. No separate user database
or password system.

**Context:** Since the data layer is Google Sheets and the org has Workspace, OAuth
is essentially free — it requires no new vendor relationship. Staff are already
authenticated with Google all day. Offboarding is handled in Google Admin, which
means instant access revocation.

**Role-based access:** Controlled via a permissions tab in the Google Sheet, mapping
Google account to role (intake staff, coordinator, clinical director, owner). This
is checked at login.

---

### D-005 · Hosting: Vercel (temporary) → Willow VPS → Spark Mojo platform

**Decision:** Three-phase hosting migration:

1. **Now:** Vercel free tier. Static files only. PHI does not touch Vercel.
   Defensible HIPAA posture: Vercel is not a business associate because it has no
   access to PHI. Documented as intentional temporary bridge.
2. **Soon:** Willow's own HIPAA-compliant VPS (in setup now). App files move to VPS.
   Data layer (Google Sheets) does not change. Migration estimated at under 1 hour.
3. **Future:** Spark Mojo platform. Willow Ops becomes a client instance of the
   Spark Mojo modular operations platform. Same codebase, different host.

**Documentation note:** A short internal memo should be drafted stating that Vercel
is used as a static host during transition period, with PHI exclusively retained in
Google Workspace under BAA. This creates a paper trail showing intent.

**Alternatives considered:**
- Firebase Hosting (under Google BAA) — cleaner compliance story, but adds Google
  Cloud setup overhead; rejected given the short window before VPS migration
- Google Apps Script web app — fully inside Workspace BAA, but too constrained for
  the UI complexity we need

---

### D-006 · Task engine: n8n + new Google Sheets tabs

**Decision:** Tasks are stored in a new `Tasks` tab added to the existing Google
Sheet. n8n watches for triggers (new client row, date passing with checklist
incomplete, approaching appointment, etc.) and writes task rows. The app reads the
Tasks tab and renders them as the task queue.

**Context:** Google Sheets alone has no event/trigger system. n8n is the bridge —
it's already running (on James's instance as a bridge until Willow stands up their
own). This gives us task auto-generation without a separate database.

**Schema — Tasks tab:**
```
task_id | client_id | task_type | assigned_to | due_date | priority | status | created_at | completed_at | notes
```

**Schema — Audit Log tab:**
```
timestamp | staff | action | client_id | detail
```

**n8n instance:** James's instance temporarily. Migrates to Willow's own n8n when
their VPS is live.

---

### D-007 · Future data source: SimplePractice nightly dump

**Decision:** Long-term, a nightly data dump from SimplePractice into a data lake
will serve as the authoritative data source, replacing the parallel Google Sheets
tracker entirely.

**Context:** SimplePractice walls off their API. The nightly dump approach goes
around this — SP exports are scheduled, land in the data lake, and Willow Ops reads
from there instead of Google Sheets. The app UI does not change when this transition
happens; only the data source is swapped.

**Status:** Infrastructure planning in progress. Not blocking MVP.

---

### D-008 · Spark Mojo platform relationship

**Decision:** Willow Ops is built as a client instance of the future Spark Mojo
modular operations platform. The architecture decisions made here (modular design,
Google Sheets backend, n8n automation layer) are intentionally consistent with the
Spark Mojo platform vision.

**Context:** James owns Spark Mojo, a platform designed to deliver exactly these
kinds of operational modules to professional services clients. Willow Center is the
first real-world client. The code written here becomes a reference implementation.

**Migration path:** When Spark Mojo platform is ready, Willow migrates from their
VPS to the platform. Two total migrations: Vercel → VPS → Spark Mojo.

---

## Open Questions

- [ ] Confirm Google Workspace BAA covers all relevant services (Sheets, Drive,
      Gmail) — get doc reference from Erin
- [ ] What Google Voice setup does Willow use? Determines feasibility of voicemail
      module integration
- [ ] Julia (external biller) termination timeline — affects what we build into
      Revenue Cycle module and who gets access
- [ ] SimplePractice nightly dump — who owns standing this up and what is the
      timeline?
- [ ] n8n migration from James's instance to Willow's VPS — needs handoff plan
      once VPS is live
- [ ] Spark Mojo platform timeline — affects how tightly we architect Willow Ops
      for portability vs. speed

---

## Upcoming Decisions Needed

- Core feature functions for Onboarding module (naming and scoping)
- Revenue Cycle module data model (sourced from outstanding billing spreadsheet)
- Voicemail module architecture (Google Voice integration approach)
- Role definitions and permissions matrix
- Diagnostic HTML refinement and task extraction approach
