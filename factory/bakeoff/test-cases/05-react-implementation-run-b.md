# Test 05: React JSX Implementation — Run B (ClaimStatusPill Component)

**Task type:** Frontend code implementation
**Evaluates:** Can the model write a pure display component with complex state-to-style mapping, no API calls, and all 7 tests?

**This is Run B. Run A builds an API-fetching badge. Run B is pure display. Run C is a controlled dropdown with fetching.**

---

## Input Files

Provide as context:
- `factory/guardrails/PLATFORM-GUARDRAILS.md`
- An existing component, e.g.: `platform/apps/mojo_frontend/src/library/MojoCard.jsx`

---

## Prompt (give this to the model, nothing else)
```
You are the Story Builder for the Spark Mojo build factory. Implement the following story spec exactly.
STORY: BILL-FRONTEND-001 TITLE: Claim status pill component CATEGORY: FRONTEND SIZE: XS
WHAT TO BUILD: A single React JSX component: ClaimStatusPill. Displays a small colored pill badge showing a claim's canonical state. Pure display component — no API calls.
ARCHITECTURE CONSTRAINTS:
* File: platform/apps/mojo_frontend/src/library/ClaimStatusPill.jsx (new)
* NO TypeScript. File extension must be .jsx.
* Use var(--sm-*) CSS variables for ALL colors. No hardcoded hex values.
* Pure display component. Accepts state as a prop. Does NOT fetch from any API.
* No frappe imports. No window.frappe.
DETAILED SPECIFICATION: Props:
* state: string (required) — the canonical_state value
* size: "sm" | "md" (optional, default "sm")
* showIcon: boolean (optional, default true)
State-to-color mapping (all using var(--sm-*) tokens):
* draft, ready_to_submit → var(--sm-neutral-bg) / var(--sm-neutral-text)
* submitted, pending_review, under_review, acknowledged → var(--sm-info-bg) / var(--sm-info-text)
* accepted → var(--sm-warning-bg) / var(--sm-warning-text)
* paid, partial_payment → var(--sm-success-bg) / var(--sm-success-text)
* rejected, denied → var(--sm-error-bg) / var(--sm-error-text)
* appeal_pending, appeal_submitted → var(--sm-warning-bg) / var(--sm-warning-text)
* adjudicated → var(--sm-neutral-bg) / var(--sm-neutral-text)
* written_off, voided, cancelled → var(--sm-muted-bg) / var(--sm-muted-text) with text-decoration: line-through
* error, failed → var(--sm-error-bg) / var(--sm-error-text)
* unknown state (not in list) → neutral gray with "Unknown" label
Label display: replace underscores with spaces, capitalize first word only. Example: "ready_to_submit" → "Ready to submit"
Size variants:
* sm: font-size 11px, padding 2px 8px, border-radius 9999px
* md: font-size 13px, padding 4px 12px, border-radius 9999px
TESTS (Vitest):
* renders "draft" with neutral styling
* renders "paid" with success styling
* renders "denied" with error styling
* renders "written_off" with strikethrough text style applied
* renders unknown state gracefully (shows "Unknown" label, neutral style, no crash)
* size="md" applies correct font-size and padding
* showIcon=false hides the icon element
ACCEPTANCE CRITERIA:
1. Component renders without errors for all 19 known states
2. State-to-color mapping matches the specification
3. No hardcoded hex colors anywhere in the file
4. .jsx extension only — no TypeScript
5. No frappe imports; no window.frappe references
6. Label formatting: underscores to spaces, first word capitalized
7. All 7 tests pass
Write the component and the test file. Nothing else.
```

---

## Scoring Rubric

### Category A: Correctness (0-5)
- 5: Component renders all states correctly; mapping logic correct; label formatting correct; unknown state handled gracefully; all 7 tests would pass
- 4: Mostly correct; 1 minor bug
- 3: Rendering mostly correct but mapping has errors
- 2: Fundamental rendering or mapping error
- 1: Does not render or is completely wrong

### Category B: Guardrail Compliance — Hard Violations (0-5)
Binary checks. Score starts at 5. Each violation -2 (minimum 0).
- No TypeScript (.tsx, import type, type annotation): -2 if violated
- No hardcoded hex colors: -2 if violated
- No frappe imports or window.frappe: -2 if violated

### Category C: Code Quality (0-5)
- 5: Clean mapping structure (lookup object, not a chain of if-else); size and showIcon props handled cleanly; no unnecessary complexity
- 4: Mostly clean; 1 minor issue
- 3: Works but has quality issues
- 2: Significant quality problems
- 1: Unacceptable quality

### Category D: Test Coverage (0-5)
- 5: All 7 specified tests present; each tests a distinct behavior; strikethrough test verifies the style property specifically
- 4: 6/7 present; all good
- 3: 5/7 present or tests are shallow
- 2: Tests miss key behaviors
- 1: No tests

### Category E: Spec Adherence (0-5)
- 5: All props implemented; all 19 states mapped; both size variants correct; showIcon prop works; label formatting exactly as specified
- 4: One minor deviation
- 3: 2-3 deviations
- 2: Significant deviations
- 1: Substantially different

**Maximum score: 25**
**Pass threshold: 18/25**
