# Test 05: React JSX Implementation — Scores

**Scored by:** Claude Opus 4.6 (1M context)
**Date:** 2026-04-09

**IMPORTANT NOTE ON RUN C:** The Run C rubric specifies a ProviderSelector dropdown component, but the actual prompt given to all models (see `RUN-C/prompt.md`) was the ClaimStatusPill prompt (identical to Run B). All Run C outputs are therefore scored against the **Run B rubric** (ClaimStatusPill), since that is what was actually prompted.

---

## MODEL: model-alpha | TEST: 05 | RUN: A

Correctness: 4/5
Evidence: All 4 visual states rendered correctly. Fetch logic is sound. However, test file references `useSiteConfig` without importing it after the mock — `useSiteConfig` is not in scope in `beforeEach`, causing a ReferenceError that would fail all tests.
Failure classification: CORRECTABLE

Guardrail Compliance — Hard Violations: 5/5
Evidence: No TypeScript, no hardcoded hex colors (all `var(--sm-*)`), no Frappe imports.
Failure classification: N/A

Code Quality: 4/5
Evidence: Clean useState/useEffect pattern, proper dependency array. No cancellation cleanup on unmount — missing `return () => {}` in useEffect. Uses Tailwind classes for sizing instead of inline styles matching spec dimensions.
Failure classification: CORRECTABLE

Test Coverage: 3/5
Evidence: All 6 test cases present, but `useSiteConfig` is referenced without being imported in the test file (line 115: `useSiteConfig.mockReturnValue`). This would cause a ReferenceError, making all tests fail after the first.
Failure classification: CORRECTABLE

Spec Adherence: 4/5
Evidence: All props implemented; label formatting correct; all visual states present. Size prop uses Tailwind classes rather than the exact 11px/13px dimensions, which is a minor deviation.
Failure classification: CORRECTABLE

TOTAL: 20/25
Notable strength: Clean component structure with good state management pattern.
Notable failure: Test file has a scoping bug — `useSiteConfig` not imported before use in `beforeEach`.

---

## MODEL: model-beta | TEST: 05 | RUN: A

Correctness: 5/5
Evidence: All 4 states rendered correctly. Fetch logic includes cancellation flag. Loading state uses never-resolving promise in tests. All 6 tests are well-structured and would pass.
Failure classification: N/A

Guardrail Compliance — Hard Violations: 5/5
Evidence: No TypeScript, all colors use `var(--sm-*)` tokens, no Frappe imports.
Failure classification: N/A

Code Quality: 5/5
Evidence: Cancellation flag in useEffect cleanup. Clean lookup objects for size and status styles. `data-status` attribute for easy testing. `encodeURIComponent` for subdomain safety. Separated icon components.
Failure classification: N/A

Test Coverage: 5/5
Evidence: All 6 specified tests present. Loading test uses never-resolving promise (correct pattern). Tests use `data-status` attribute for reliable assertions. Proper mock isolation with `afterEach`.
Failure classification: N/A

Spec Adherence: 5/5
Evidence: All props implemented. Label formatting correct. All visual states match. Size dimensions specified in pixels (11px/13px). `data-testid` present. Uses `VITE_FRAPPE_URL` base which is consistent with platform patterns.
Failure classification: N/A

TOTAL: 25/25
Notable strength: Exemplary test quality — loading state test uses never-resolving promise, proper mock isolation.
Notable failure: None.

---

## MODEL: model-gamma | TEST: 05 | RUN: A

Correctness: 5/5
Evidence: All 4 states render correctly. Fetch uses AbortController for proper cleanup. Feature key checked with `=== true` and `=== false` explicitly (slightly over-strict but correct for the spec). All 6 tests would pass.
Failure classification: N/A

Guardrail Compliance — Hard Violations: 5/5
Evidence: No TypeScript, all colors use `var(--sm-*)` tokens, no Frappe imports.
Failure classification: N/A

Code Quality: 5/5
Evidence: AbortController for proper fetch cancellation. Clean STATUS enum pattern. Config-driven rendering reduces branching. Proper dependency arrays. `encodeURIComponent` used.
Failure classification: N/A

Test Coverage: 4/5
Evidence: All 6 tests present and correct. Mock pattern uses `vi.mock` then `vi.mocked()` which is valid. However, the mock setup for `useSiteConfig` is slightly unusual — mocks the module but doesn't set a default return value in beforeEach for all tests, relying on last test's `vi.mocked` pattern.
Failure classification: CORRECTABLE

Spec Adherence: 4/5
Evidence: All props implemented. Label formatting correct. Size uses `rem` units (`0.625rem`, `0.75rem`) instead of the spec-implied pixel values, and padding uses Tailwind classes instead of exact 2px 8px / 4px 12px from convention.
Failure classification: CORRECTABLE

TOTAL: 23/25
Notable strength: AbortController usage for proper fetch cleanup — most production-ready approach.
Notable failure: Font sizes in rem rather than explicit pixel values.

---

## MODEL: model-delta | TEST: 05 | RUN: A

Correctness: 5/5
Evidence: All 4 states rendered correctly. Fetch logic with cancellation flag. Clean state machine. All 6 tests use solid assertions (`dataset.status`, `textContent`).
Failure classification: N/A

Guardrail Compliance — Hard Violations: 5/5
Evidence: No TypeScript, all colors use `var(--sm-*)` tokens, no Frappe imports.
Failure classification: N/A

Code Quality: 5/5
Evidence: Cancellation flag in useEffect cleanup. Clean STYLES lookup object. Separated CheckIcon/DashIcon components. `encodeURIComponent` for URL safety. Proper `aria-label` attributes. `data-status` for testability.
Failure classification: N/A

Test Coverage: 5/5
Evidence: All 6 tests present. Loading test uses never-resolving promise. `makeFetchOk` and `makeFetchError` helpers are clean. Proper mock import ordering. Tests verify both URL and behavior.
Failure classification: N/A

Spec Adherence: 5/5
Evidence: All props implemented exactly. Size dimensions in pixels (11px/13px, 2px 8px / 4px 12px). Label formatting correct. `subdomain !== undefined` check is a thoughtful distinction. Uses `VITE_FRAPPE_URL` base.
Failure classification: N/A

TOTAL: 25/25
Notable strength: Exceptionally thorough implementation notes explaining every design decision.
Notable failure: None.

---

## MODEL: model-epsilon | TEST: 05 | RUN: A

Correctness: 4/5
Evidence: All 4 states render correctly. Fetch logic is sound with cancellation. However, test file uses `require('@/hooks/useSiteConfig')` — mixing ESM `import` with CommonJS `require` can fail in Vitest depending on config.
Failure classification: CORRECTABLE

Guardrail Compliance — Hard Violations: 5/5
Evidence: No TypeScript, all colors use `var(--sm-*)` tokens, no Frappe imports.
Failure classification: N/A

Code Quality: 4/5
Evidence: Good separation with `fetchFeatureFlags` utility function and `formatFeatureLabel`. Cancellation flag present. However, component accepts an undocumented `siteConfig` prop not in the spec, and has an unused `errorMessage` state variable.
Failure classification: CORRECTABLE

Test Coverage: 4/5
Evidence: All 6 specified tests present plus many bonus tests (label formatting, size prop, additional edge cases). However, the `require()` import after `vi.mock()` is a potential compatibility issue, and tests are wrapped in extra `describe` blocks that obscure the 6 specified tests.
Failure classification: CORRECTABLE

Spec Adherence: 4/5
Evidence: All props implemented. Added an undocumented `siteConfig` prop. Size uses Tailwind classes (`text-[10px]`, `text-xs`) instead of exact pixel values. Label formatting correct. The extra complexity (nested describes, 15+ tests) goes beyond "component and test file, nothing else."
Failure classification: CORRECTABLE

TOTAL: 21/25
Notable strength: Comprehensive bonus test coverage well beyond spec requirements.
Notable failure: Mixing `require()` with ESM imports in test file could cause runtime failures.

---

## MODEL: model-zeta | TEST: 05 | RUN: A

Correctness: 4/5
Evidence: All 4 states render correctly. Fetch logic uses async/await inside useEffect (defined as inner function, which is correct). However, imports `useSiteConfig` as default import but the mock uses `{ default: ... }` — this works but is fragile.
Failure classification: CORRECTABLE

Guardrail Compliance — Hard Violations: 3/5
Evidence: No TypeScript, no Frappe imports. However, line 87 has `color: 'white'` — this is a hardcoded color value, not a `var(--sm-*)` token. This is a guardrail violation (-2).
Failure classification: FUNDAMENTAL

Code Quality: 3/5
Evidence: Uses three separate state variables (`loading`, `isEnabled`, `hasError`) instead of a single status enum — more complex, harder to ensure mutual exclusivity. No cleanup/cancellation in useEffect. The test file lacks `data-testid`, making assertions fragile (relying on `parentElement`).
Failure classification: CORRECTABLE

Test Coverage: 4/5
Evidence: All 6 tests present and reasonably correct. The `getByText('billing mojo').parentElement` pattern for finding the badge is fragile but functional. Loading state test may have a race condition since fetch is mocked but resolves immediately in some cases.
Failure classification: CORRECTABLE

Spec Adherence: 3/5
Evidence: All props implemented. Label formatting correct. However, `color: 'white'` violates the token requirement. Size uses Tailwind classes instead of exact pixel values. Uses `var(--sm-primary)` for enabled (spec says green/success, not primary). Multiple deviations.
Failure classification: CORRECTABLE

TOTAL: 17/25
Notable strength: Clean async/await pattern inside useEffect.
Notable failure: Hardcoded `color: 'white'` violates guardrails; `var(--sm-primary)` for enabled state misinterprets the spec.

---

## MODEL: model-alpha | TEST: 05 | RUN: B

Correctness: 5/5
Evidence: All 19 states mapped correctly. Strikethrough applied to written_off/voided/cancelled. Unknown state shows "Unknown" with neutral styling. Label formatting correct. All 7 tests would pass.
Failure classification: N/A

Guardrail Compliance — Hard Violations: 5/5
Evidence: No TypeScript, all colors use `var(--sm-*)` tokens, no Frappe imports, no hardcoded hex.
Failure classification: N/A

Code Quality: 5/5
Evidence: Clean lookup object pattern. `formatLabel` function is simple and correct. Icon as a small colored dot using `data-testid`. Inline styles only — no Tailwind dependency for colors.
Failure classification: N/A

Test Coverage: 5/5
Evidence: All 7 specified tests present and testing exactly the right behaviors. Strikethrough test checks `textDecoration`. Size test checks exact `fontSize` and `padding`. Icon test uses `queryByTestId`.
Failure classification: N/A

Spec Adherence: 5/5
Evidence: All 19 states mapped. Both size variants with exact pixel values. showIcon prop works. Label formatting exactly as specified ("Written off", not "Written Off"). Strikethrough on the three muted states.
Failure classification: N/A

TOTAL: 25/25
Notable strength: Perfect implementation — clean, minimal, spec-compliant.
Notable failure: None.

---

## MODEL: model-beta | TEST: 05 | RUN: B

Correctness: 5/5
Evidence: All 19 states mapped correctly. Strikethrough on muted states. Unknown handled gracefully. Label formatting correct. All 7 tests would pass.
Failure classification: N/A

Guardrail Compliance — Hard Violations: 5/5
Evidence: No TypeScript, all `var(--sm-*)` tokens, no Frappe imports, no hardcoded hex.
Failure classification: N/A

Code Quality: 5/5
Evidence: Clean lookup pattern. Lowercase normalization of state input (`state.toLowerCase()`) is a nice touch for robustness. Icon using `currentColor`. Minimal inline styles.
Failure classification: N/A

Test Coverage: 5/5
Evidence: All 7 specified tests present. Each tests the correct behavior. Strikethrough verifies `textDecoration`. Icon test uses `queryByTestId`. Size test checks exact values.
Failure classification: N/A

Spec Adherence: 5/5
Evidence: All 19 states mapped. Both size variants exact. showIcon works. Label formatting correct. The `state.toLowerCase()` normalization is beyond spec but harmless and helpful.
Failure classification: N/A

TOTAL: 25/25
Notable strength: State input normalization (`toLowerCase()`) adds robustness beyond spec.
Notable failure: None.

---

## MODEL: model-gamma | TEST: 05 | RUN: B

Correctness: 5/5
Evidence: All 19 states mapped correctly. Strikethrough on muted states. Unknown handled. Label formatting correct. All 7 tests would pass.
Failure classification: N/A

Guardrail Compliance — Hard Violations: 5/5
Evidence: No TypeScript, all `var(--sm-*)` tokens, no Frappe imports, no hardcoded hex.
Failure classification: N/A

Code Quality: 5/5
Evidence: Clean config object with `strike` boolean per state. `formatLabel` uses regex `replace(/^./, c => c.toUpperCase())`. Icon scales with size variant. Mixed Tailwind + inline styles (Tailwind for layout, inline for dynamic values) — acceptable.
Failure classification: N/A

Test Coverage: 5/5
Evidence: All 7 specified tests present. Plus bonus `it.each(ALL_19_STATES)` block testing all states render without throwing. Extra tests for default icon visibility, label formatting, sm size defaults, voided/cancelled strikethrough.
Failure classification: N/A

Spec Adherence: 5/5
Evidence: All 19 states mapped. Both size variants with exact pixel values and `borderRadius: '9999px'`. showIcon works. Label formatting correct. Icon scales with size.
Failure classification: N/A

TOTAL: 25/25
Notable strength: Bonus `it.each` coverage of all 19 states plus additional edge case tests.
Notable failure: None.

---

## MODEL: model-delta | TEST: 05 | RUN: B

Correctness: 5/5
Evidence: All 19 states mapped correctly. Strikethrough on muted states. Unknown handled. Label formatting correct. All 7 tests would pass.
Failure classification: N/A

Guardrail Compliance — Hard Violations: 5/5
Evidence: No TypeScript, all `var(--sm-*)` tokens, no Frappe imports, no hardcoded hex.
Failure classification: N/A

Code Quality: 5/5
Evidence: Clean STATE_MAP with `strike` boolean. Separated helper functions (`getPillStyle`, `getPillLabel`, `getIcon`) in tests. `aria-hidden` on icon. `data-state` attribute for debugging. Icon uses `opacity: 0.7` which is a subtle design choice.
Failure classification: N/A

Test Coverage: 5/5
Evidence: All 7 specified tests present. Plus bonus `it.each(ALL_19_STATES)` block, icon visibility test, label formatting test, sm size defaults, voided/cancelled strikethrough tests. Helper functions make tests readable.
Failure classification: N/A

Spec Adherence: 5/5
Evidence: All 19 states mapped. Both size variants exact. showIcon works. Label formatting exactly as specified. `formatLabel` handles null/non-string defensively.
Failure classification: N/A

TOTAL: 25/25
Notable strength: Test helper functions (`getPillStyle`, `getPillLabel`, `getIcon`) improve readability.
Notable failure: None.

---

## MODEL: model-epsilon | TEST: 05 | RUN: B

Correctness: 5/5
Evidence: All 19 states mapped correctly via category-based lookup. Strikethrough on muted states. Unknown handled. Label formatting correct. All 7 tests would pass.
Failure classification: N/A

Guardrail Compliance — Hard Violations: 5/5
Evidence: No TypeScript, all `var(--sm-*)` tokens, no Frappe imports, no hardcoded hex.
Failure classification: N/A

Code Quality: 4/5
Evidence: Uses a `getStateCategory` function with `.includes()` arrays instead of a direct lookup map — more verbose and O(n) per state resolution. The indirection (state -> category -> style) adds complexity. However, it works correctly and the separation is logically clean.
Failure classification: CORRECTABLE

Test Coverage: 5/5
Evidence: All 7 specified tests present, plus exhaustive bonus coverage: every individual state tested, label formatting for multiple states, size variants, icon visibility, all 19 states render check. Very thorough.
Failure classification: N/A

Spec Adherence: 5/5
Evidence: All 19 states mapped. Both size variants exact. showIcon works. Label formatting correct. The indirect mapping approach still produces correct results.
Failure classification: N/A

TOTAL: 24/25
Notable strength: Extremely thorough test coverage — 40+ individual test cases covering every state and behavior.
Notable failure: Category-based lookup adds unnecessary indirection compared to a flat map.

---

## MODEL: model-zeta | TEST: 05 | RUN: B

Correctness: 5/5
Evidence: All 19 states mapped correctly. Strikethrough on muted states. Unknown handled with "Unknown" label. Label formatting correct. All 7 tests would pass.
Failure classification: N/A

Guardrail Compliance — Hard Violations: 5/5
Evidence: No TypeScript, all `var(--sm-*)` tokens, no Frappe imports, no hardcoded hex.
Failure classification: N/A

Code Quality: 4/5
Evidence: Clean config object. Icon uses SVG circle instead of a styled span — works fine but slightly unusual. `formatLabel` explicitly lowercases subsequent words which is correct but overly defensive since the input is already lowercase. No `data-testid` on the root pill element — tests rely on `parentElement` traversal.
Failure classification: CORRECTABLE

Test Coverage: 4/5
Evidence: All 7 tests present. However, the icon test compares two separate renders (`withIcon` and `withoutIcon`) which is functional but unconventional. Tests rely on `screen.getByText().parentElement` instead of `data-testid`, which is fragile.
Failure classification: CORRECTABLE

Spec Adherence: 5/5
Evidence: All 19 states mapped. Both size variants exact. showIcon works. Label formatting correct. All visual behaviors match.
Failure classification: N/A

TOTAL: 23/25
Notable strength: SVG circle icon is a clean visual approach.
Notable failure: Tests use `parentElement` traversal instead of `data-testid` — fragile selector strategy.

---

## MODEL: model-alpha | TEST: 05 | RUN: C
*Note: Run C was given the ClaimStatusPill prompt (same as Run B). Scored against Run B rubric.*

Correctness: 5/5
Evidence: All 19 states mapped correctly. Strikethrough via separate `STRIKETHROUGH_STATES` array. Unknown handled. Label formatting correct. All 7 tests would pass.
Failure classification: N/A

Guardrail Compliance — Hard Violations: 5/5
Evidence: No TypeScript, all `var(--sm-*)` tokens, no Frappe imports, no hardcoded hex.
Failure classification: N/A

Code Quality: 5/5
Evidence: Clean separation: `STATE_COLORS` for color mapping, `STRIKETHROUGH_STATES` for strike behavior, `SIZE_STYLES` for dimensions. Icon uses `currentColor`. `data-testid` on both pill and icon.
Failure classification: N/A

Test Coverage: 5/5
Evidence: All 7 specified tests present and testing correct behaviors. Uses `data-testid` for reliable selectors. Strikethrough test checks `textDecoration`. Icon test uses `queryByTestId`.
Failure classification: N/A

Spec Adherence: 5/5
Evidence: All 19 states mapped. Both size variants exact with `borderRadius: '9999px'`. showIcon works. Label formatting correct.
Failure classification: N/A

TOTAL: 25/25
Notable strength: Clean architectural separation of concerns (colors, strikethrough, sizing as distinct configs).
Notable failure: None.

---

## MODEL: model-beta | TEST: 05 | RUN: C
*Note: Run C was given the ClaimStatusPill prompt (same as Run B). Scored against Run B rubric.*

Correctness: 5/5
Evidence: All 19 states mapped correctly. Strikethrough on muted states via `strikethrough` flag. Unknown handled. Label formatting correct. All 7 tests would pass.
Failure classification: N/A

Guardrail Compliance — Hard Violations: 5/5
Evidence: No TypeScript, all `var(--sm-*)` tokens, no Frappe imports, no hardcoded hex.
Failure classification: N/A

Code Quality: 5/5
Evidence: Clean config with `getConfig()` helper. Icon scales with size (6px sm, 8px md). `data-testid` on pill, icon, and label. Inline styles only. Acceptance criteria checklist included.
Failure classification: N/A

Test Coverage: 5/5
Evidence: All 7 specified tests present. Each tests correct behavior with clear assertions. Strikethrough checks style and colors. Icon test confirms label still visible when hidden.
Failure classification: N/A

Spec Adherence: 5/5
Evidence: All 19 states mapped. Both size variants exact. showIcon works. Label formatting correct. Design notes explain architectural choices.
Failure classification: N/A

TOTAL: 25/25
Notable strength: Icon scales with size variant (6px sm, 8px md) — thoughtful detail.
Notable failure: None.

---

## MODEL: model-gamma | TEST: 05 | RUN: C
*Note: Run C was given the ClaimStatusPill prompt (same as Run B). Scored against Run B rubric.*

Correctness: 5/5
Evidence: All 19 states mapped correctly. Strikethrough on muted states. Unknown handled. Label formatting correct. All 7 tests would pass.
Failure classification: N/A

Guardrail Compliance — Hard Violations: 5/5
Evidence: No TypeScript, all `var(--sm-*)` tokens, no Frappe imports, no hardcoded hex.
Failure classification: N/A

Code Quality: 4/5
Evidence: Over-engineered icon system — created an `ICON_MAP` with 7 different SVG icons (circle, upload, clock, search, check, partial, x) when the spec just calls for a simple icon indicator. This is unnecessary complexity that goes well beyond what was asked.
Failure classification: CORRECTABLE

Test Coverage: 5/5
Evidence: All 7 tests present and correct. Tests use both `data-testid` and `.claim-status-pill` class selectors. SVG null check for showIcon=false test is correct.
Failure classification: N/A

Spec Adherence: 4/5
Evidence: All 19 states mapped. Both size variants correct. showIcon works. Label formatting correct. However, the per-state icon assignment (check, x, clock, etc.) is not in the spec — the spec doesn't specify different icons per state, just a generic icon indicator.
Failure classification: CORRECTABLE

TOTAL: 23/25
Notable strength: Creative icon system with contextually appropriate SVGs per state.
Notable failure: Over-engineered icon system adds complexity not requested by spec.

---

## MODEL: model-delta | TEST: 05 | RUN: C
*Note: Run C was given the ClaimStatusPill prompt (same as Run B). Scored against Run B rubric.*

Correctness: 5/5
Evidence: All 19 states mapped correctly. Strikethrough on muted states. Unknown handled with "Unknown" label and neutral styling. Label formatting correct. All 7 tests would pass.
Failure classification: N/A

Guardrail Compliance — Hard Violations: 5/5
Evidence: No TypeScript, all `var(--sm-*)` tokens, no Frappe imports, no hardcoded hex.
Failure classification: N/A

Code Quality: 5/5
Evidence: Clean STATE_MAP. Icon uses text characters (`●` for known, `?` for unknown) — simple and effective. Defensive `formatLabel` handles null/non-string. `data-testid` on pill, icon, and label elements.
Failure classification: N/A

Test Coverage: 5/5
Evidence: All 7 specified tests present. Clean assertions using `data-testid`. Implementation notes explain every design decision.
Failure classification: N/A

Spec Adherence: 5/5
Evidence: All 19 states mapped. Both size variants exact. showIcon works. Label formatting correct. Icon for unknown state shows `?` — creative but spec-compliant since spec doesn't specify icon content.
Failure classification: N/A

TOTAL: 25/25
Notable strength: Detailed implementation notes explaining every design decision.
Notable failure: None.

---

## MODEL: model-epsilon | TEST: 05 | RUN: C
*Note: Run C was given the ClaimStatusPill prompt (same as Run B). Scored against Run B rubric.*

Correctness: 5/5
Evidence: All 19 states mapped correctly. Strikethrough on muted states. Unknown handled. Label formatting correct. All 7 tests would pass.
Failure classification: N/A

Guardrail Compliance — Hard Violations: 5/5
Evidence: No TypeScript, all `var(--sm-*)` tokens, no Frappe imports, no hardcoded hex.
Failure classification: N/A

Code Quality: 4/5
Evidence: Uses individual `paddingTop/paddingBottom/paddingLeft/paddingRight` instead of shorthand `padding` — works but unnecessarily verbose. Tests use `toHaveStyle` with the longhand properties, which may not match if JSDOM normalizes. Also, the label logic `stateStyle === DEFAULT_STYLE && state` is an indirect way to check unknown — comparing object references.
Failure classification: CORRECTABLE

Test Coverage: 5/5
Evidence: All 7 specified tests present, plus extensive bonus coverage (all 19 states individually, label formatting, size defaults, icon visibility, edge cases). Very thorough.
Failure classification: N/A

Spec Adherence: 4/5
Evidence: All 19 states mapped. showIcon works. Label formatting correct. However, padding uses longhand properties instead of shorthand `padding: '2px 8px'` / `padding: '4px 12px'` as specified. Tests assert on longhand properties, which may not match the spec's expectations.
Failure classification: CORRECTABLE

TOTAL: 23/25
Notable strength: Exhaustive test coverage with 30+ test cases.
Notable failure: Padding longhand vs shorthand mismatch with spec dimensions.

---

## MODEL: model-zeta | TEST: 05 | RUN: C
*Note: Run C was given the ClaimStatusPill prompt (same as Run B). Scored against Run B rubric.*

Correctness: 5/5
Evidence: All 19 states mapped correctly. Strikethrough on muted states. Unknown handled. Label formatting correct. All 7 tests would pass.
Failure classification: N/A

Guardrail Compliance — Hard Violations: 5/5
Evidence: No TypeScript, all `var(--sm-*)` tokens, no Frappe imports, no hardcoded hex.
Failure classification: N/A

Code Quality: 5/5
Evidence: Clean config object. `formatLabel` applies `toLowerCase()` to rest of string — defensive but correct. Icon as styled span with `data-testid`. Gap scales with size. Clean separation of concerns.
Failure classification: N/A

Test Coverage: 5/5
Evidence: All 7 tests present. Uses `data-testid` for pill. Strikethrough test checks both `textDecoration` and colors. Unknown test verifies text content and styling. Icon test uses `queryByTestId`.
Failure classification: N/A

Spec Adherence: 5/5
Evidence: All 19 states mapped. Both size variants exact. showIcon works. Label formatting correct. Clean and minimal.
Failure classification: N/A

TOTAL: 25/25
Notable strength: Clean, minimal implementation that closely follows spec without over-engineering.
Notable failure: None.

---

# SUMMARIES

---

## MODEL: model-alpha | TEST: 05 SUMMARY
Run A: 20 | Run B: 25 | Run C: 25
Mean: 23.3 | Range: 5 | Consistency: Low

Consistency narrative: Run A had a significant test file bug (useSiteConfig not imported before use in beforeEach). Runs B and C were perfect — the simpler pure-display component played to this model's strengths.
Dominant strength: Clean component architecture with good separation of concerns.
Dominant weakness: Test file scoping errors in complex async scenarios (Run A).
Prompt engineering note: When the component requires mocking hooks, add an explicit instruction: "Import the mocked module after vi.mock() to get the mock reference."

---

## MODEL: model-beta | TEST: 05 SUMMARY
Run A: 25 | Run B: 25 | Run C: 25
Mean: 25.0 | Range: 0 | Consistency: High

Consistency narrative: Perfect scores across all three runs. Consistently produced clean components with correct mapping, proper test isolation, and spec-compliant output regardless of component complexity.
Dominant strength: Flawless guardrail compliance and test quality across all prompt variants.
Dominant weakness: None observed across three runs.
Prompt engineering note: No compensation needed — this model reliably produces spec-compliant React JSX.

---

## MODEL: model-gamma | TEST: 05 SUMMARY
Run A: 23 | Run B: 25 | Run C: 23
Mean: 23.7 | Range: 2 | Consistency: Medium

Consistency narrative: Run B was perfect. Run A lost points on rem-based sizing and test mock patterns. Run C over-engineered the icon system with 7 distinct SVGs not requested by spec.
Dominant strength: Thorough state mapping and bonus test coverage (it.each patterns).
Dominant weakness: Tendency to over-engineer beyond spec requirements (custom icons, non-standard units).
Prompt engineering note: Add "Use exact pixel values for sizing — do not convert to rem. Implement only what is specified — no embellishments."

---

## MODEL: model-delta | TEST: 05 SUMMARY
Run A: 25 | Run B: 25 | Run C: 25
Mean: 25.0 | Range: 0 | Consistency: High

Consistency narrative: Perfect scores across all three runs. Consistently thorough with implementation notes, clean architecture, and bonus test coverage. The most reliable model for this test type.
Dominant strength: Precision spec adherence combined with thorough design documentation.
Dominant weakness: None observed across three runs.
Prompt engineering note: No compensation needed — this model reliably produces high-quality, spec-compliant React JSX with excellent test coverage.

---

## MODEL: model-epsilon | TEST: 05 SUMMARY
Run A: 21 | Run B: 24 | Run C: 23
Mean: 22.7 | Range: 3 | Consistency: Low

Consistency narrative: Scores vary due to different issues each run: Run A had require/import mixing; Run B used indirect category mapping; Run C used padding longhand properties. The model consistently over-builds — 30-50 tests where 6-7 are requested.
Dominant strength: Exhaustive test coverage far beyond spec requirements.
Dominant weakness: Over-engineering and non-standard patterns (require/import mixing, padding longhand, indirect lookups).
Prompt engineering note: Add "Write exactly the specified number of tests. Use standard ESM imports only. Use CSS shorthand properties."

---

## MODEL: model-zeta | TEST: 05 SUMMARY
Run A: 17 | Run B: 23 | Run C: 25
Mean: 21.7 | Range: 8 | Consistency: Low

Consistency narrative: Dramatic improvement across runs. Run A had a hard guardrail violation (hardcoded 'white' color) and used three separate state variables. Run B improved but lacked data-testid. Run C was perfect.
Dominant strength: Improved significantly with simpler component requirements (pure display vs async fetching).
Dominant weakness: Guardrail compliance failures under complexity (hardcoded colors, fragile selectors).
Prompt engineering note: Add "CRITICAL: Every color must use var(--sm-*) tokens. The word 'white' is not allowed as a color value. Always add data-testid attributes to the root element."

---

## MODEL: model-theta | TEST: 05 | RUN: A

Correctness: 4/5
Evidence: All 4 visual states rendered correctly. Fetch logic is sound with cancellation flag. However, the markdown output contains malformed JSX — multiple `<span` and `<svg` opening tags are missing the `<` character (lines 108, 125, 157, 180). In the test file, multiple `render(` calls are missing the `<` before the component name (lines 277, 293, 332, 347). These are rendering artifacts that would cause syntax errors if used as-is. The logic itself is correct, so this is treated as a presentation issue.
Failure classification: CORRECTABLE

Guardrail Compliance — Hard Violations: 5/5
Evidence: No TypeScript, all colors use `var(--sm-*)` tokens, no Frappe imports, no hardcoded hex.
Failure classification: N/A

Code Quality: 5/5
Evidence: Cancellation flag in useEffect cleanup. Clean baseStyle object spread. `encodeURIComponent` for subdomain safety. Proper dependency array `[subdomain, featureKey]`. `data-testid` and `data-state` attributes for testability. PropTypes defined.
Failure classification: N/A

Test Coverage: 4/5
Evidence: 8 test cases present (6 specified plus size and label formatting bonus tests). All 6 required tests are accounted for. The mock pattern for `useSiteConfig` is correct. However, test 6 ("uses subdomain from useSiteConfig when prop is absent") does a dynamic `import()` then `mockReturnValueOnce` — this is fragile and may not work reliably with Vitest's hoisted mocks. The missing `<` in render calls would cause test failures if copied directly.
Failure classification: CORRECTABLE

Spec Adherence: 5/5
Evidence: All props implemented (featureKey, subdomain, size). Label formatting replaces underscores with spaces. All 4 visual states present with correct colors. Size uses Tailwind utility classes (text-xs/text-sm with px/py) which is consistent with platform patterns. `data-testid` present.
Failure classification: N/A

TOTAL: 23/25
Notable strength: Clean component structure with proper cancellation, PropTypes, and data attributes.
Notable failure: Malformed JSX in markdown output — missing `<` on multiple tags — would require manual correction before use.

---

## MODEL: model-theta | TEST: 05 | RUN: B

Correctness: 5/5
Evidence: All 19 states mapped correctly. Strikethrough applied to written_off/voided/cancelled. Unknown state shows "Unknown" with neutral styling. Label formatting correct ("Ready to submit", not "Ready To Submit"). All 7 specified tests would pass.
Failure classification: N/A

Guardrail Compliance — Hard Violations: 5/5
Evidence: No TypeScript, all colors use `var(--sm-*)` tokens, no Frappe imports, no hardcoded hex.
Failure classification: N/A

Code Quality: 4/5
Evidence: Clean switch statement for state mapping. `formatLabel` with explicit known-states list for unknown detection. `data-testid` on pill and icon. However, the output includes extensive "thinking out loud" text between the first code block and the final code block — the model produced the component code twice (once as stream-of-consciousness, once as final output). The `getStateStyle` function recreates the style object on every render call (no memoization), and the `formatLabel` duplicates the known-states list that already exists in the switch. Minor redundancy.
Failure classification: CORRECTABLE

Test Coverage: 5/5
Evidence: All 7 specified tests present. Plus 3 bonus tests: all 19 states render without errors, label formatting for multiple states, and color mapping for all state groups. Uses `data-testid` for reliable selectors. Strikethrough test checks `textDecoration: 'line-through'`. Icon test uses `queryByTestId`. The `render()` calls in the first code block have missing `<` but the final test file block is also missing `<` on some calls (lines 541, 551, 601) — same markdown artifact as Run A.
Failure classification: CORRECTABLE

Spec Adherence: 5/5
Evidence: All 19 states mapped. Both size variants with exact pixel values (11px/2px 8px, 13px/4px 12px) and `borderRadius: '9999px'`. showIcon works. Label formatting correct. State normalization via `toLowerCase()` adds robustness.
Failure classification: N/A

TOTAL: 24/25
Notable strength: Comprehensive test coverage with 10 test cases including exhaustive state-group color verification.
Notable failure: Duplicate output (component code appears twice with thinking-aloud commentary between them) — messy presentation.

---

## MODEL: model-theta | TEST: 05 | RUN: C
*Note: Run C was given the ClaimStatusPill prompt (same as Run B). Scored against Run B rubric.*

Correctness: 0/5
Evidence: Model built a **ProviderSelector** dropdown component instead of the requested **ClaimStatusPill**. The prompt explicitly says "ClaimStatusPill" with 19 canonical states, pure display, no API calls. The model produced a completely different component (a fetching select dropdown for scheduling providers). None of the 19 states are mapped. None of the 7 specified tests are present. The component makes API calls (`GET /api/modules/scheduling/providers`) when the spec explicitly says "Pure display component — no API calls."
Failure classification: FUNDAMENTAL

Guardrail Compliance — Hard Violations: 5/5
Evidence: No TypeScript (`.jsx`), all colors use `var(--sm-*)` tokens, no Frappe imports, no hardcoded hex. The guardrails are met even though the wrong component was built.
Failure classification: N/A

Code Quality: 4/5
Evidence: The ProviderSelector code itself is well-written: proper cancellation flag in useEffect, clean visual states (loading/error/empty/loaded), controlled component pattern, `encodeURIComponent` for query params. However, this is the wrong component, so quality is moot for scoring purposes. Deducting 1 for the fact that this is clearly a hallucinated/confused response — the model ignored the prompt entirely.
Failure classification: FUNDAMENTAL

Test Coverage: 0/5
Evidence: None of the 7 specified tests are present. The test file tests ProviderSelector behavior (loading, options, onChange, refetch, empty, error, disabled) — none of which correspond to the ClaimStatusPill spec (draft/neutral, paid/success, denied/error, written_off/strikethrough, unknown/graceful, size=md, showIcon=false).
Failure classification: FUNDAMENTAL

Spec Adherence: 0/5
Evidence: Wrong component entirely. No state-to-color mapping. No 19 canonical states. No label formatting. No size variants matching spec. No showIcon prop. No strikethrough behavior. The model built ProviderSelector instead of ClaimStatusPill.
Failure classification: FUNDAMENTAL

TOTAL: 9/25
Notable strength: The ProviderSelector code itself is well-structured with proper patterns (if it had been the right component).
Notable failure: Built the completely wrong component. The prompt says "ClaimStatusPill" and lists 19 states — the model produced "ProviderSelector" with API fetching. This is a fundamental comprehension failure.

---

## MODEL: model-theta | TEST: 05 SUMMARY
Run A: 23 | Run B: 24 | Run C: 9
Mean: 18.7 | Range: 15 | Consistency: Very Low

Consistency narrative: Runs A and B were solid — competent implementations with minor presentation issues (malformed JSX tags in markdown, duplicate output). Run C was a catastrophic failure: the model built an entirely different component (ProviderSelector) instead of the requested ClaimStatusPill, despite receiving the identical prompt to Run B. This suggests the model either hallucinated a different spec or confused the prompt with training data.
Dominant strength: When on-target, produces clean components with good test coverage and proper guardrail compliance.
Dominant weakness: Catastrophic prompt comprehension failure in Run C — built the wrong component entirely. Also, markdown output formatting issues (missing `<` characters) across all runs.
Prompt engineering note: Add "CRITICAL: The component name is {NAME}. Do not build any other component. Repeat the component name in your first line of output before writing code."
