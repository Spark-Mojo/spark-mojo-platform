# PLAN-MEGA-015: ERPNext Regional

**Story:** MEGA-015
**Module:** Regional (part of erpnext app)
**Capability:** Tax/compliance modules
**Group:** C — ERPNext Supporting Modules

---

## Module Overview

The Regional module contains country-specific tax and compliance DocTypes. On the POC, it has 5 DocTypes — all focused on non-US regions (South Africa, UAE, India).

## DocTypes to Investigate (5 total)

| DocType | Purpose | Records |
|---------|---------|---------|
| South Africa VAT Settings | SA VAT configuration | 0 |
| UAE VAT Account | UAE VAT GL account mapping | 0 |
| UAE VAT Settings | UAE VAT configuration | 0 |
| Lower Deduction Certificate | India TDS lower deduction certs | 0 |
| Import Supplier Invoice | Import invoice processing | 0 |

## Investigation Plan

### Step 1: Confirm Module is Live
- Verify "Regional" module appears in installed modules
- Check if any Regional DocTypes have records

### Step 2: Enumerate Key DocTypes
For each of the 5 DocTypes:
- Check field structure (are any US-relevant?)
- Check for any existing records
- Check for link fields to other modules

### Step 3: Test REST API Connectivity
Test endpoints:
- `GET /api/resource/South Africa VAT Settings?limit=3`
- `GET /api/resource/UAE VAT Settings?limit=3`
- `GET /api/resource/Lower Deduction Certificate?limit=3`
- `GET /api/resource/Import Supplier Invoice?limit=3`

### Step 4: Behavioral Health Relevance Assessment

1. **Does a therapy practice need this?** — Almost certainly No. These are non-US regional tax modules.
2. **If yes, what specifically would they use it for?** — N/A for US behavioral health.
3. **Does it conflict with anything we're building custom?** — No, completely independent.
4. **Does the data model fit, or does it need heavy customization?** — N/A — wrong country.
5. **Is the Frappe Desk UI acceptable?** — N/A.

### Step 5: Write Classification Entry
- Expected verdict: **EXCLUDE** — All DocTypes are for non-US regions (South Africa, UAE, India)
- No US tax compliance DocTypes present
- Zero records, zero configuration
- Append entry to ERPNEXT_APP_EVALUATION.md

## Key Questions for Researcher
- Are there any US-specific regional DocTypes hidden elsewhere?
- Does the Import Supplier Invoice DocType have any generic (non-regional) utility?
- Are there any field structures worth noting for future US compliance work?
