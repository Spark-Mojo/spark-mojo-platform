# Test 05: React JSX Implementation — Run C (ProviderSelector Dropdown)

**Task type:** Frontend code implementation
**Evaluates:** Can the model write a controlled dropdown component with async data fetching, all four visual states, and prop-driven refetching?

**This is Run C. Run A builds a status badge with async fetching. Run B is a pure display component. Run C is a controlled dropdown.**

---

## Input Files

Provide as context:
- `factory/guardrails/PLATFORM-GUARDRAILS.md`
- An existing component: `frontend/src/components/mojos/WorkboardMojo.jsx`

---

## Prompt (give this to the model, nothing else)
```
You are the Story Builder for the Spark Mojo build factory. Implement the following story spec exactly.
STORY: SCHEDULING-FRONTEND-001 TITLE: ProviderSelector dropdown component CATEGORY: FRONTEND SIZE: S
WHAT TO BUILD: A single React JSX component: ProviderSelector. A searchable dropdown that fetches available providers and lets the user select one for appointment booking.
ARCHITECTURE CONSTRAINTS:
* File: frontend/src/components/mojos/ProviderSelector.jsx (new)
* NO TypeScript. .jsx only.
* Use var(--sm-*) CSS variables for ALL colors. No hardcoded hex values.
* Fetches from /api/modules/scheduling/providers — the abstraction layer only. Do NOT call Frappe directly.
* Controlled component: value and onChange are props. The parent manages selection state.
DETAILED SPECIFICATION: Props:
* value: string | null (required) — selected provider_id, or null
* onChange: function — called with provider_id (string) on selection, or null when placeholder selected
* appointmentType: string (optional) — if provided, passed as ?appointment_type={value} query param
* placeholder: string (optional, default "Select a provider")
* disabled: boolean (optional, default false)
API call: GET /api/modules/scheduling/providers?appointment_type={appointmentType} Response: { "providers": [{ "id": "string", "name": "string", "title": "string" }] }
Visual states:
* Loading: dropdown shows "Loading providers..." text, is disabled
* Loaded with options: select element with provider names as options, functional
* Empty (API returns empty array): shows "No providers available", disabled
* Error (fetch fails): shows "Could not load providers", disabled
Selecting the blank/placeholder option calls onChange(null). Refetch when appointmentType prop changes.
TESTS (Vitest):
* renders loading state while fetching
* renders provider options after successful fetch
* calls onChange with provider_id when option selected
* calls onChange with null when placeholder option selected
* refetches when appointmentType prop changes
* renders empty state when providers array is empty
* renders error state on fetch failure
* renders as disabled when disabled prop is true
ACCEPTANCE CRITERIA:
1. Component renders in all 4 visual states correctly
2. No hardcoded hex colors
3. No TypeScript
4. Does not call Frappe directly
5. Controlled component — does not manage its own selection state
6. Refetches when appointmentType prop changes
7. All 8 tests pass
Write the component and the test file. Nothing else.
```

---

## Scoring Rubric

### Category A: Correctness (0-5)
- 5: All 4 visual states correct; fetch logic sound; refetch on appointmentType change implemented; all 8 tests would pass
- 4: Mostly correct; 1 minor bug
- 3: Rendering correct but fetch or prop handling has an issue
- 2: Fundamental error in state management or fetch
- 1: Does not render or is completely wrong

### Category B: Guardrail Compliance — Hard Violations (0-5)
Binary checks. Score starts at 5. Each violation -2 (minimum 0).
- No TypeScript: -2 if violated
- No hardcoded hex colors: -2 if violated
- No direct Frappe calls: -2 if violated

### Category C: Code Quality (0-5)
- 5: Clean hooks usage with correct dependency arrays; controlled component pattern correct; loading/error/empty/success states handled without duplication
- 4: Mostly clean; 1 minor issue
- 3: Works but has quality issues
- 2: Significant quality problems
- 1: Unacceptable

### Category D: Test Coverage (0-5)
- 5: All 8 specified tests present; fetch properly mocked; appointmentType change test verifies a second fetch call; onChange(null) test present
- 4: 7/8 present; all good
- 3: 6/8 or shallow
- 2: Tests miss key behaviors
- 1: No tests

### Category E: Spec Adherence (0-5)
- 5: All props implemented; all 4 visual states match spec; controlled pattern correct; appointmentType filtering implemented; placeholder calls onChange(null)
- 4: One minor deviation
- 3: 2-3 deviations
- 2: Significant deviations
- 1: Substantially different

**Maximum score: 25**
**Pass threshold: 18/25**
