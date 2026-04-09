# Test 05: React JSX Implementation

**Task type:** Frontend code implementation
**Evaluates:** Can the model write working, convention-compliant React JSX for
the Spark Mojo frontend?

---

## Input Files

Provide as context:
- `factory/guardrails/PLATFORM-GUARDRAILS.md`
- An existing component from the platform:
  `frontend/src/components/mojos/WorkboardMojo.jsx`
  (for pattern reference only)

---

## Prompt (give this to the model, nothing else)

```
You are the Story Builder for the Spark Mojo build factory.
Implement the following story spec exactly.
STORY: CRM-FRONTEND-001
TITLE: Feature flag status badge component
CATEGORY: FRONTEND
SIZE: XS
WHAT TO BUILD: A single React JSX component: FeatureFlagBadge. It displays a small badge showing whether a named feature is enabled or disabled for the current site. Used by the admin console to give operators a quick visual indicator when listing features.
ARCHITECTURE CONSTRAINTS:
* File: frontend/src/components/mojos/FeatureFlagBadge.jsx (new)
* NO TypeScript. File extension must be .jsx.
* Use var(--sm-*) CSS variables for ALL colors. No hardcoded hex values.
* The component calls GET /api/modules/admin/features/{subdomain} to check feature status. It does NOT call Frappe directly.
* Use the useSiteConfig hook from src/hooks/useSiteConfig.js to get the current subdomain if not provided as a prop.
DETAILED SPECIFICATION:
Props:
* featureKey: string (required) - the feature flag name e.g. "billing_mojo"
* subdomain: string (optional) - if not provided, use useSiteConfig().subdomain
* size: "sm" | "md" (optional, default "sm")
Visual states:
* Loading: a small neutral gray pill with "..." text
* Enabled: green pill with feature label text, checkmark icon
* Disabled: gray pill with feature label text, dash icon
* Error: red pill with "unavailable" text
The component fetches: GET /api/modules/admin/features/{subdomain}
Returns: { features: { billing_mojo: true, workboard: true, ... } }
Display the featureKey value directly as the label, replacing underscores with spaces. E.g. "billing_mojo" displays as "billing mojo".
TESTS (Vitest):
* renders loading state initially
* renders enabled state when feature is true in API response
* renders disabled state when feature is false in API response
* renders error state on API failure
* uses subdomain from prop when provided
* uses subdomain from useSiteConfig when prop is absent
ACCEPTANCE CRITERIA:
1. Component renders without errors
2. All 4 visual states render correctly based on API response
3. No hardcoded hex colors anywhere in the file
4. Component does not import from frappe or call window.frappe
5. File extension is .jsx, not .tsx or .ts
6. All 6 tests pass
Write the component and the test file. Nothing else.
```

---

## Scoring Rubric

### Category A: Correctness (0-5)
- 5: Component renders all 4 states correctly; fetch logic is sound; all 6 tests would pass
- 4: Component mostly correct; 1 minor bug
- 3: Rendering logic correct but fetch handling has an issue
- 2: Fundamental rendering or state management error
- 1: Does not render or is completely wrong

### Category B: Guardrail Compliance - Hard Violations (0-5)
These are binary checks. Each violation costs 2 points.
- No TypeScript (.tsx, import type, etc.): -2 if violated
- No hardcoded hex colors: -2 if violated
- No direct Frappe calls: -2 if violated
- Score starts at 5; deduct per violation; minimum 0

### Category C: Code Quality (0-5)
- 5: Clean hooks usage (useState, useEffect); proper dependency arrays; no memory leaks; loading/error/success states handled
- 4: Mostly clean; 1 minor issue (missing dependency, etc.)
- 3: Works but has noticeable quality issues
- 2: Significant quality problems; would fail code review
- 1: Unacceptable quality

### Category D: Test Coverage (0-5)
- 5: All 6 specified tests present and correctly testing the right behavior; proper mocking of fetch and useSiteConfig
- 4: 5/6 tests present; all good
- 3: 4/6 tests or tests are shallow
- 2: Tests present but don't test the right things
- 1: No tests or completely wrong tests

### Category E: Spec Adherence (0-5)
- 5: All props implemented; all visual states match spec; label formatting (underscore to space) correct; size prop handled
- 4: One minor deviation from spec
- 3: 2-3 deviations; close but not exact
- 2: Significant deviations; would require rework
- 1: Built something substantially different

**Maximum score: 25**
**Pass threshold: 18/25**

---

## Scoring Note

Run A was executed before this path correction was applied. Models received the wrong file path in the spec but were provided `frontend/src/components/mojos/WorkboardMojo.jsx` as context. Since all models received identical information, Run A cross-model comparisons remain valid.
