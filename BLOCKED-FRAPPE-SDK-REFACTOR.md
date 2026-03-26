# BLOCKED: frappe-react-sdk Refactor

**Date:** March 25, 2026
**Blocked by:** DECISION-003 (Mojo Abstraction Layer — locked and immutable)

---

## What Was Completed

- **Step 1:** `frappe-react-sdk` installed. `frappe-types` installed on VPS via `bench get-app` (it's a bench app, not npm package — original story spec error).
- **Step 2:** `FrappeProvider` added to `App.jsx`, wrapping the app. Session context available to all components.
- **Step 5 (resolved):** TypeScript interfaces generated for all 4 SM DocTypes (SM Client, SM Onboarding Item, SM Outreach Attempt, SM Invoice) in `frontend/src/types/`. frappe-types cannot auto-generate for custom DocTypes (only app-bundled), so interfaces were generated from live schema metadata via `bench execute`. When SM DocTypes move into the `sm_connectors` app, frappe-types can auto-generate via `bench generate-types-for-doctype`.

## What Is Blocked and Why

### Step 3: `useFrappeAuth` cannot replace `FrappeAuth`

The SDK's `useFrappeAuth` hook calls Frappe's native endpoint:
```
GET /api/method/frappe.auth.get_logged_user
```

Our custom `FrappeAuth.me()` calls the abstraction layer:
```
GET /api/modules/desktop/me
```

This abstraction layer endpoint returns **enriched** user data that Frappe's native endpoint does not provide:
- `tenant_id` (which tenant/site this user belongs to)
- `roles` (mapped to SM platform roles, not raw Frappe roles)
- `initials` (computed from full_name)

Replacing `FrappeAuth.me()` with `useFrappeAuth().currentUser` would:
1. Bypass the abstraction layer (violates DECISION-003)
2. Lose tenant context (breaks multi-tenancy)
3. Return raw Frappe role names instead of SM-mapped roles

The SDK's `login()` and `logout()` call `/api/method/login` and `/api/method/logout` respectively. Our custom code calls the same endpoints. However, `useFrappeAuth` is a hook that manages its own internal state — it can't be partially adopted (use SDK login but custom me()) without fighting the SDK's state management.

### Step 4: `useFrappeGetDocList` etc. cannot replace `FrappeEntities`

The SDK's CRUD hooks call Frappe's REST API directly:
```
GET /api/resource/SM Client?fields=["name","client_name"]&filters=[...]
```

Our `FrappeEntities` proxy routes ALL entity operations through the abstraction layer:
```
GET /api/modules/Client/list?sort=...&limit=...
```

**This is DECISION-003 in action.** The abstraction layer:
1. Routes requests to the correct backend connector per tenant config
2. Computes derived fields (urgency_level, completion_pct)
3. Normalizes data across different EHR backends (SimplePractice, Valant)
4. Enforces tenant isolation
5. Validates permissions beyond Frappe's native RBAC

**There are zero direct `/api/resource/` calls in the frontend.** Every entity operation already goes through `/api/modules/[capability]/[action]`. The task instruction "only replace direct Frappe DocType CRUD calls" results in zero replacements because there are none to replace.

### Step 5: `frappe-types` requires VPS bench access

`frappe-types` is a Frappe bench app, not an npm package. To generate types:
1. Install on VPS: `bench get-app frappe_types`
2. Run: `bench --site frontend generate-types --app sm_connectors`
3. Copy generated `.ts` files to `frontend/src/types/`

This requires VPS access and cannot be done from the frontend repo alone. Additionally, the frontend is a JavaScript project (not TypeScript), so generated `.ts` interfaces would only serve as JSDoc references unless we add TypeScript to the build chain.

### Step 6: `frappe-client.js` cannot be deleted

`frappe-client.js` is not a "custom Frappe client" — it IS the abstraction layer client. It implements:
- `frappeRequest()` — universal HTTP helper with session cookie auth and 401 handling
- `FrappeAuth` — calls the abstraction layer for enriched user info
- `FrappeEntities` — Proxy-based routing to `/api/modules/[entity]/[action]`

Deleting it would remove the abstraction layer enforcement that DECISION-003 requires. The SDK provides no equivalent for routing to custom abstraction layer endpoints.

---

## Architectural Analysis

The `frappe-react-sdk` is designed for applications where:
- The React frontend talks **directly** to a single Frappe instance
- All CRUD operations use Frappe's native REST API (`/api/resource/`)
- Auth uses Frappe's native session management
- There is no intermediate routing/normalization layer

The Spark Mojo architecture is fundamentally different:
- The React frontend talks to the **Mojo Abstraction Layer** (FastAPI)
- The abstraction layer routes to the correct backend per tenant
- Multiple backends exist per capability (Frappe native, SimplePractice, Valant, Plane)
- Auth is enriched with tenant context

These are incompatible patterns. The SDK assumes direct access; our architecture mandates indirect access through a routing layer.

---

## What CAN Be Used from frappe-react-sdk

1. **`FrappeProvider`** (already added) — Establishes the Frappe context. Required for any future SDK hook usage.

2. **`useFrappePostCall`** — For calling specific Frappe whitelisted methods (e.g., `frappe.client.get_list` with custom parameters). This could be useful for operations that don't need abstraction layer routing.

3. **Socket/realtime features** — `useFrappeEventListener`, `useFrappeDocTypeEventListener` for live updates. These don't conflict with DECISION-003 because realtime subscriptions are a different pattern from request/response CRUD.

4. **File upload** — `useFrappeFileUpload` if direct-to-Frappe file uploads are acceptable (this may need architectural review).

---

## Recommended Path Forward

Instead of replacing the custom client with frappe-react-sdk, consider:

1. **Keep `frappe-client.js` as the abstraction layer client** — it correctly enforces DECISION-003
2. **Use frappe-react-sdk for realtime/socket features** — these add value without breaking the architecture
3. **Generate TypeScript types via bench** — but as a separate VPS task, not an npm install
4. **If SDK adoption is desired**, the abstraction layer would need to implement Frappe-compatible REST API routes (`/api/resource/{DocType}`) so the SDK's hooks work transparently through the proxy. This is a significant backend change and should be evaluated as a separate architectural decision.

---

*This document should be reviewed and either (a) the refactor scope adjusted to what's compatible, or (b) DECISION-003 amended to allow selective direct Frappe access for specific operations.*
