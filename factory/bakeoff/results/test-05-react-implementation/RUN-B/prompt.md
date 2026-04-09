PROMPT
test: 05-react-implementation
run: B
date: 2026-04-09

```
You are the Story Builder for the Spark Mojo build factory. Implement the following story spec exactly.
STORY: BILL-FRONTEND-001 TITLE: Claim status pill component CATEGORY: FRONTEND SIZE: XS
WHAT TO BUILD: A single React JSX component: ClaimStatusPill. Displays a small colored pill badge showing a claim's canonical state. Pure display component — no API calls.
ARCHITECTURE CONSTRAINTS:
* File: frontend/src/components/mojos/ClaimStatusPill.jsx (new)
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
