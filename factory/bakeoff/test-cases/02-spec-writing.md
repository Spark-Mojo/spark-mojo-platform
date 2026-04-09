# Test 02: Spec Writing

**Task type:** Specification writing
**Evaluates:** Can the model produce a self-contained, complete story spec that
meets the quality bar required for Ralph's build factory?

**Quality bar reference:** BILL-010-state-machine-controller.md in platform/feature-library/stories/
The evaluator reads this before scoring to calibrate expectations.

---

## Input Files

Provide as context:
- `factory/guardrails/PLATFORM-GUARDRAILS.md`
- `platform/research/crm-client-identity/CRM-CLIENT-IDENTITY-TECHNICAL-RESEARCH.md`

Do NOT provide BILL-010 or any existing story spec to the model.

---

## Prompt (give this to the model, nothing else)

```
You are the Spec Writer for the Spark Mojo build factory.
Write a complete, self-contained story spec for the following story:
STORY ID: CRM-003
TITLE: Contact create endpoint - abstraction layer
CATEGORY: BACKEND
SIZE: S
DEPENDENCIES: None (first backend story)
CONTEXT: CRM Client Identity is a new capability being built on the Spark Mojo platform. The platform stack is: Frappe/ERPNext backend, FastAPI abstraction layer (MAL) at /api/modules/[capability]/[action], React JSX frontend.
The abstraction layer is the ONLY surface React calls. React never calls Frappe directly. All custom DocTypes are prefixed "SM ". No TypeScript. No hardcoded hex colors (use var(--sm-*) CSS variables).
The Contact create endpoint should:
* Accept a POST to /api/modules/crm/contact/create
* Create a Frappe Contact document (native ERPNext DocType)
* Apply vocabulary resolution: the "person" concept resolves to the site's configured label (e.g., "Client" for behavioral health)
* Write a CRM timeline event on successful creation
* Return the created contact with its Frappe name (document ID)
Write the full story spec file. It must be self-contained: the implementing agent reads ONLY this file and the existing codebase.
```

---

## Scoring Rubric

### Category A: Completeness of Sections (0-5)
- 5: Has all required sections: What To Build, Architecture Constraints, Files To Create/Modify, Detailed Specification (API schema), Tests (unit + integration + edge cases), CRM Timeline Event, Acceptance Criteria
- 4: Missing one minor section
- 3: Missing 2 sections or key sections are thin
- 2: Major sections absent
- 1: Bare minimum; not usable as a build spec

### Category B: Test Specificity (0-5)
- 5: Unit tests specify function name, input, and expected output; integration tests specify endpoint, request body, and expected response; edge cases explicitly listed
- 4: Tests are mostly specific with 1-2 vague entries
- 3: Tests described at too high a level to implement directly
- 2: Tests are generic ("test that it works")
- 1: No meaningful tests

### Category C: API Specification Quality (0-5)
- 5: Request schema, response schema, and all error states fully specified; status codes correct; field types explicit
- 4: Mostly complete; 1-2 fields underspecified
- 3: Schema present but incomplete; implementer would need to guess
- 2: Vague API description only
- 1: No API specification

### Category D: Guardrail Compliance (0-5)
- 5: Architecture Constraints section explicitly states MAL-only rule; no direct Frappe calls in spec; CRM timeline event specified; SM prefix awareness shown
- 4: Guardrails present but one is missing from constraints section
- 3: Guardrails partially addressed
- 2: Key guardrails absent from spec
- 1: Spec violates guardrails (e.g., instructs direct Frappe call)

### Category E: Acceptance Criteria Quality (0-5)
- 5: Every criterion is independently verifiable by running a command or checking a file; no subjective criteria; covers happy path and error states
- 4: Mostly verifiable; 1-2 criteria are slightly subjective
- 3: Mix of verifiable and vague criteria
- 2: Criteria are too vague to verify without interpretation
- 1: Criteria absent or meaningless

**Maximum score: 25**
**Pass threshold: 18/25**
