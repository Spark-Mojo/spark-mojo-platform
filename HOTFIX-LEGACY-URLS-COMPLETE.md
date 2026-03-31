# HOTFIX: Legacy URL Restoration — Complete

**Date:** 2026-03-31
**Status:** Fixed and verified
**Trigger:** INFRA-007 renamed Frappe site `frontend` → `poc-dev.sparkmojo.com`, breaking legacy URLs

---

## Symptoms

1. `poc.sparkmojo.com` → "poc.sparkmojo.com does not exist" (Frappe 404)
2. `app.poc.sparkmojo.com` → "no user found" (frontend loaded but API calls failed)
3. Abstraction layer `frappe_connected: false` on ALL domains (global breakage)

---

## Root Causes

### 1. Frappe site resolution uses directory names, not config

Frappe's WSGI app resolves `X-Frappe-Site-Name` by looking for a matching
directory in `sites/`. The `domains` field in `site_config.json` and the
`dns_multitenant` flag are only used by `bench setup nginx` — they do NOT
affect gunicorn's site resolution.

After the rename, `sites/frontend/` no longer existed, so ANY request with
`Host: frontend` (including all abstraction layer → Frappe calls) returned
"frontend does not exist".

### 2. Stale `common_site_config.json`

- `default_site: "frontend"` — pointed to non-existent site
- No `dns_multitenant` flag (needed for multi-site)

### 3. Traefik `api-modules` rule missing `app.poc.sparkmojo.com`

Already fixed in commit `ca814a4` before this session (explicit Host rules).

### 4. `extract_subdomain` returned wrong value for legacy URL

`extract_subdomain("app.poc.sparkmojo.com")` returned `"app"` (parts[0])
instead of `"poc"` (the actual site subdomain). The function only handled
the new `{subdomain}.app.sparkmojo.com` pattern, not the legacy
`app.{subdomain}.sparkmojo.com` pattern.

### 5. No "poc" entry in SM Site Registry

The SM Site Registry on admin.sparkmojo.com had entries for `poc-dev`,
`admin`, `internal`, `willow` — but not `poc` (the legacy subdomain).

### 6. Stale `.env.poc` SITE_REGISTRY

The fallback env var still mapped `"poc" → frappe_site: "frontend"`.

---

## Fixes Applied

### VPS — Frappe site symlinks (persistent in `frappe-poc_sites` volume)

```bash
# Map legacy domain to admin site
docker exec frappe-poc-backend-1 bash -c \
  "cd /home/frappe/frappe-bench/sites && ln -sf admin.sparkmojo.com poc.sparkmojo.com"

# Map Docker hostname to poc-dev site (restores abstraction layer connectivity)
docker exec frappe-poc-backend-1 bash -c \
  "cd /home/frappe/frappe-bench/sites && ln -sf poc-dev.sparkmojo.com frontend"
```

### VPS — Frappe common_site_config.json

```bash
bench set-config --global dns_multitenant true
bench set-config --global default_site admin.sparkmojo.com
```

### VPS — SM Site Registry

Added "poc" entry: `site_subdomain=poc`, `frappe_site=poc-dev.sparkmojo.com`,
`is_active=1`, `site_type=dev`.

### VPS — `.env.poc` SITE_REGISTRY

Fixed stale mapping: `"poc" → frappe_site: "poc-dev.sparkmojo.com"` (was `"frontend"`).

### Code — `abstraction-layer/main.py` (commit c852c26)

Fixed `extract_subdomain` to detect legacy `app.{subdomain}.sparkmojo.com`
pattern and return `parts[1]` instead of `parts[0]`.

---

## Verification

### Legacy URLs — all pass

| URL | Expected | Result |
|-----|----------|--------|
| `poc.sparkmojo.com` | Frappe ping | `{"message":"pong"}` |
| `app.poc.sparkmojo.com` | Frontend loads | `<div id="root">` present |
| `app.poc.sparkmojo.com/health` | Abstraction layer | `{"status":"ok","frappe_connected":true}` |
| `app.poc.sparkmojo.com/api/modules/tenant/public-config` | API routing | Returns tenant config data |

### Smoke test — 16/16 pass

All 4 sites (admin, poc-dev, internal, willow) pass all 4 checks
(HTTPS, abstraction layer, Frappe site, SM Site Registry).

---

## Lessons Learned

1. **Frappe site resolution is directory-based, not config-based.** The `domains`
   list in `site_config.json` and `dns_multitenant` in `common_site_config.json`
   only affect `bench setup nginx`. The WSGI app (`frappe/app.py`) resolves sites
   by checking `os.path.isdir("sites/{hostname}")`. Symlinks are the correct way
   to add domain aliases in a Docker multi-site setup.

2. **Renaming a Frappe site breaks all Docker-internal references.** The Docker
   service name `frontend` was used as the hostname in `FRAPPE_URL`, and Frappe
   resolved it as a site name via `X-Frappe-Site-Name: frontend`. After rename,
   a `frontend → poc-dev.sparkmojo.com` symlink in `sites/` restores this.

3. **Legacy URL patterns need explicit handling.** The `app.poc.sparkmojo.com`
   pattern (legacy) vs `poc-dev.app.sparkmojo.com` (new) have different subdomain
   positions. URL parsing code must handle both.
