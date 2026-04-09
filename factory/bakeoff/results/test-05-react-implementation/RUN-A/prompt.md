PROMPT
test: 05-react-implementation
run: A
date: 2026-04-09

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
