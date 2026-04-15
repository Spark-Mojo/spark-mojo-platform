# Spark Mojo — Platform Guardrails

**Every agent reads this file. Every spec factory hat loads this file first.**
This document contains the platform's identity, immutable rules, locked decisions, and open questions.
It takes precedence over all research documents, feature specs, and story files.
If this document conflicts with any other document, this document wins.

---

## Section 1: The Three Legs of the Platform

Everything Spark Mojo builds rests on three legs. If a capability cannot answer
to all three, it is not ready to be built.

### Leg 1: Everything is a workflow.

**Everything is a workflow. Workflows generate trackable work items. A trackable work item is
either an action item (intervention required - human or AI) or an observable item (visibility
required - state that matters to the business). Both types flow through the unified workboard.
The workboard is the single operational surface for the business. It is not a task manager.
Mojo-specific views are focused lenses over the workboard. They share the same items.
They do not maintain parallel queues.**

This is not a metaphor. It is the literal architecture of every capability on this platform.

Billing is a workflow. The 19-state claim lifecycle IS the workflow. The clearinghouse is the
tool that enables one of those tasks. Scheduling is a workflow. Clinical documentation is a
workflow. Voicemail triage is a workflow. Onboarding a new client is a workflow. Even
provisioning a new tenant is a workflow.

**When designing any capability, answer these three questions in order:**

1. **What is the work to be done?** Define the workflow: the stages, the valid transitions
   between stages, and the divergences that can occur. This is always the first question.
   Not "what database schema do we need" or "which API do we call." What is the work,
   and what are its steps?

2. **What do we need to enable each step?** For each task in the workflow, determine the
   tool, integration, API, or service required to execute it. The clearinghouse enables the
   "submit claim" task. The EHR API enables the "fetch clinical note" task. The SMS service
   enables the "send reminder" task. These are spokes. The workflow is the hub.

3. **How do we store and surface the output?** Reporting, analytics, and storage exist to
   inform future workflow decisions. The denial rate report informs the billing workflow.
   The no-show rate informs the scheduling workflow. Data is not an end - it is feedback
   into the next workflow cycle.

A capability that skips question 1 and starts at question 2 is being built backwards.

**Workflow Configurator is a core early Mojo, not a deferred feature.** It is how every
business, regardless of vertical, defines and manages their work. It is the product.

### Leg 2: Everything about a customer lives in the CRM.

**The CRM is the complete lifelong record of every interaction between the business and
every person it has a relationship with. From first contact to last. Every channel.
Every system. Every event.**

First inquiry email - logged to CRM. Phone call from front desk - logged to CRM.
Appointment booked - logged to CRM. Insurance card uploaded - logged to CRM.
Session completed - logged to CRM. Claim submitted - logged to CRM.
Payment received - logged to CRM. Document signed - logged to CRM.
Text reminder sent - logged to CRM. No-show - logged to CRM.
Discharge - logged to CRM.

Every capability that touches a customer record has a **mandatory contract** to write
that event to the CRM activity timeline. This is not optional. This is not phased.
This is not a nice-to-have. The unified activity timeline is not a feature.
It is the definition of what CRM means on this platform.

### Leg 3: Universal first, vertical second, client third, role fourth.

**Build everything to work for any business. Configure for a vertical. Customize for a
client. Permission for a role.**

If you are about to build something vertical-specific, ask first whether it can be achieved
through configuration of a universal capability. If you are about to build something
client-specific, ask whether it should be a vertical configuration instead.

**The dental scheduling example:** An agent seeing "make appointments for a dentist" should
not build a new dental scheduling app. The correct answer is to find the universal Scheduling
Mojo and build a configuration layer for the dental vertical on top of it. Building a new
app for every new noun is the failure mode this leg prevents.

Every capability that ships must register its configurable options in the Configuration Mojo.
Configuration is enacted by Spark Mojo staff based on the client onboarding questionnaire.
Clients do not configure their own instances except for user management and role assignment.

---

## Section 2: Mandatory Spec Gates

Every capability spec must explicitly answer these three questions before it can be
commissioned for build. A spec that cannot answer all three does not pass Step 5 of
the Feature Development Lifecycle.

**Gate 1 - Workflow:** What is the workflow? If there is no workflow, explain why not.
No explanation = no commission.

**Gate 2 - CRM Timeline:** What does this capability write to the CRM timeline? If it
writes nothing, explain why not. No explanation = no commission.

**Gate 3 - Right Level:** Is this being built at the right level of specificity? Could
this be universal instead of vertical-specific? Could this be configuration instead of
code? Before building any new capability, confirm no existing capability can serve this
need through configuration. New capabilities require James approval.

---

## Section 3: Platform Identity (What Spark Mojo Is and Is Not)

- Spark Mojo IS a universal business OS for SMBs. Staff act once; every downstream system
  updates automatically. Staff are never the human API between systems.
- Spark Mojo IS the workflow engine. The clearinghouse, EHR, SMS provider, and analytics
  layer are spokes that support workflows. They are not the product.
- Spark Mojo CAN be the EHR. Behavioral health is the first vertical, not the platform's
  identity. The platform is not defined by or limited to consuming third-party EHRs.
  Medplum is a headless EHR - it is up to Spark Mojo to give it a head.
- Spark Mojo's preferred path for any client is Spark Mojo AS the system of record.
  Third-party system connectors are a concession to client reality, not the architectural
  target. The connector/ingestion capability and the migration capability are the same
  workflow running at different frequencies.
- Spark Mojo IS NOT defined by behavioral health. That is the first vertical.
- Spark Mojo IS NOT a feature factory. Every capability must answer the three workflow
  questions before a story is written.
- The Data Ingestion and Migration engine must support file-based ingestion (CSV, XLS,
  database exports) as a first-class method alongside API polling. Third-party systems
  frequently have no outgoing API by design. File-based ingestion is not a fallback.
  It is a primary path.

---

## Section 4: Architecture Immutables

These rules are locked. No research, spec, or story may contradict them.
If a spec requires violating one of these rules, stop and write a BLOCKED-[TOPIC].md file.

1. React NEVER calls Frappe directly. All React calls go through
   `/api/modules/[capability]/[action]` on the Mojo Abstraction Layer.
2. Never modify core Frappe/ERPNext. All custom logic lives in SM custom apps
   (sm_widgets, sm_connectors, sm_billing).
3. SM DocTypes are prefixed `SM`. No exceptions.
4. No TypeScript. All frontend files are `.jsx`.
5. No hardcoded hex colors. Use `var(--sm-*)` semantic tokens only.
6. n8n handles ALL cross-system operations. n8n is never in the hot path of UI requests.
7. **Frappe Workflow / transition_state() manages internal document state.
   n8n manages cross-system actions triggered by state changes.
   The workflow engine NEVER calls external systems.
   n8n NEVER modifies document state.
   This boundary is the most locked rule in the platform. No exceptions.**
8. Architecture decisions in `platform/decisions/` are locked. Do not re-litigate.
9. If two documents conflict, stop and write BLOCKED-[TOPIC].md. Never resolve unilaterally.
10. Archive, don't delete. Stale docs go to `platform/archive/`.
11. If you add a document, add it to `platform/README.md`.
12. **Evaluation order for all backend capabilities, business logic, and system
    integrations:** (1) Native Frappe/ERPNext functionality, (2) Open-source Frappe
    community app, (3) Third-party integration, (4) Custom build. Each research
    document must explicitly address all four levels. Skipping a level requires
    documented justification. This is equivalent in weight to the MAL rule.
    SCOPE LIMIT: This rule applies to backend capabilities only. Frappe's frontend
    layer (Desk UI, Frappe Builder, portal pages, Whitelabel app) is NEVER evaluated
    as a candidate for any client-facing surface. Spark Mojo owns the React frontend
    and the abstraction layer. No Frappe frontend component is a valid client-facing
    solution under any circumstances.
    Scope clarification (RC-030): This evaluation order applies to backend capabilities,
    business logic, and system integrations only. The Frappe frontend layer is never
    evaluated as a client-facing candidate under any circumstances. React/MAL is the
    only client-facing frontend.
13. Admin API credentials are NEVER stored or displayed in any Mojo. Only vault reference
    strings (e.g., `vault:willow/stedi`) are managed. Never actual secrets.
14. All work items generated by any Mojo - whether requiring action or requiring visibility
    only - are created as WorkboardMojo Tasks via POST /api/modules/tasks/create. No Mojo
    maintains a parallel task queue. Mojo-specific focused views are filtered lenses over
    WorkboardMojo tasks enriched with Mojo-specific data. See DECISION-029.

---

## Section 5: Technology Stack (Locked Choices)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Backend | Frappe / ERPNext | Custom apps only, never modify core |
| Abstraction Layer | FastAPI (Mojo Abstraction Layer) | Single routing point for all React calls |
| Frontend | React JSX | No TypeScript, no .tsx files |
| Clinical Data | Medplum (self-hosted, internal Docker only) | No public subdomain, headless only |
| Cross-system Automation | n8n (self-hosted, automation.sparkmojo.com) | All external integrations go here |
| HIPAA AI | AWS Bedrock | BAA covers all models, pay-per-token |
| Clearinghouse | Stedi | All clients switch to Stedi on onboarding |
| Cloud Host | DigitalOcean | Post-BAA. Hostinger is current/temporary. |
| Tenant Subdomain | `[clientname].sparkmojo.com` | NOT app.sparkmojo.com. Reserve: www, app, api, admin, automation, docs |

---

## Section 6: Data Isolation Model (Locked)

- Multi-tenancy = Frappe multi-site (one Frappe site per client, database-per-tenant)
- Clinical data = Medplum shared instance, one Project per client (row-level projectId isolation)
- This is NOT a shared database model. Each client has an isolated Frappe site.
- DECISION-028 (Medplum multi-tenancy) is locked.
- Storage routing is capability-determined, not platform-mandated. Structured clinical data
  belongs in Medplum (Coverage, Patient, Encounter, etc. as FHIR resources). Structured
  business data belongs in Frappe. Unstructured file attachments belong in Frappe Drive
  backed by DO Spaces. Each capability determines correct storage during feature design.
  See `platform/architecture/FHIR-RESOURCE-MAP.md` for clinical data routing reference.

---

## Section 7: Locked Decisions (Summary)

One line per decision. Rationale is in `platform/decisions/`. Do not re-litigate.

| Decision | Answer |
|---------|--------|
| Frontend-to-backend contract | React calls MAL only. Never Frappe directly. |
| Custom app strategy | sm_widgets, sm_connectors, sm_billing. Custom Frappe image. |
| Multi-tenancy model | Frappe multi-site, database-per-tenant. |
| Clinical data layer | Medplum, self-hosted, internal Docker, one Project per client. |
| State machine approach | Hybrid: transition_state() for programmatic, Frappe Workflow for simple approvals. |
| Claim lifecycle | 19-state model including written_off. |
| Clearinghouse | Stedi-native. All clients use Stedi. |
| AI platform | AWS Bedrock. BAA covers all models. |
| Cloud provider | DigitalOcean (post-BAA). |
| Bench topology | Two-tier model with capacity thresholds. |
| Site provisioning | Three-site topology (poc-dev, willow, internal). |
| Admin Console | Dedicated admin architecture. |
| Workflow/n8n boundary | Frappe = internal state. n8n = external actions. Hard line. |
| Tenant subdomain | `[clientname].sparkmojo.com`. Wildcard cert `*.sparkmojo.com`. |
| CRM | The complete lifelong record of every customer interaction. Activity timeline is mandatory for all capabilities. |
| EHR strategy | Two paths: (A) connector for clients retaining existing EHR, (B) Spark Mojo as EHR via Medplum (preferred). |
| Configuration model | SM staff configure client instances via Configuration Mojo based on onboarding questionnaire. Clients do not self-configure except user management and role assignment. |
| Unified workboard contract | All Mojos create WorkboardMojo Tasks via POST /api/modules/tasks/create. No parallel queues. Mojo views are lenses. See DECISION-029. |

---

## Section 8: Open Questions

Things that are NOT yet decided. An agent encountering one of these must flag it, not infer.

| # | Question | Context |
|---|---------|--------|
| OQ-001 | Pricing and metering model | Every capability has invented pricing independently. Not locked. Requires dedicated session before spec factory runs on any revenue-sensitive capability. |
| OQ-002 | AI model names at build time | Bedrock model availability changes rapidly. Model names in research docs are directional. Verify against current Bedrock catalog at implementation. |
| OQ-003 | canonical_state field type for Workflow Engine | Select (Frappe Desk friendly, requires bench migrate on change) vs. Data (no migrate, supports client-facing configurator). Pending workflow configurator priority decision. |
| OQ-004 | Generic SM State Log migration | Build generic SM State Log now and migrate SM Claim State Log, or accept per-DocType State Log debt temporarily. |
| OQ-005 | Canonical phase/release definitions | Not resolved until NORTH_STAR.md session (J-020). All phase references in all research docs are directional only. |
| OQ-006 | Session note sync timing relative to billing AI | Does session note sync need to precede or accompany billing AI claim coding features? Unphased. Requires NORTH_STAR.md. |
| OQ-007 | Clinical AI legal review | All clinical AI features (diagnosis code suggestion, treatment plan drafting, clinical decision support) require James legal go/no-go before spec factory commission. This is not a technical question. It is a liability question. |
| OQ-008 | Pricing and packaging strategy blocks final Mojo completion | Every capability requires pricing mechanics to be considered complete. The commercial model is unresolved: metered vs. base + usage vs. all-inclusive vs. all-inclusive with limits. Which capabilities are base, which are add-ons, which are usage-billed, where seat limits sit, annual vs. monthly differential - none decided. The choice is whether to continue building capabilities and add pricing mechanics later (J-NEW-001), or solve pricing structure first. Either way, no Mojo ships as complete without it. Platform-level constraint affecting every capability in the library. |

---

## Section 9: Corrections to Research Documents

The research in `platform/research/` is high quality but contains errors that must not
propagate into spec factory outputs. The full corrections list is in
`platform/research/RESEARCH-CORRECTIONS.md`.

**Before any spec factory hat reads a capability research document, it must also read
`platform/research/RESEARCH-CORRECTIONS.md` and apply any corrections for that capability.**

**James does a final review of all capability research before spec factory runs on that
capability.** This is a mandatory process gate, not optional.

**URGENT - RC-024:** Admin API routes (`/api/admin/*`) currently have zero authentication.
ADMIN-001 (admin authentication middleware) must be built immediately as the next priority
story. This is a live security gap.

---

*Authored: Session 30, April 7, 2026. Updated: Session 32, April 8, 2026. Section 10 (process documentation) removed - see platform/FACTORY-DESIGN.md.*
*Updated: Session 39, April 10, 2026. Leg 1 language updated to "trackable work items" (action or observable). Rule 14 added (unified workboard mandate). DECISION-029 locked.*
*James Ilsley verbal confirmation on record in session transcripts.*
*Maintained by: Claude Chat (strategy). Updated via CoWork at end of session.*
*This document is the highest-authority governance document on the platform.*
