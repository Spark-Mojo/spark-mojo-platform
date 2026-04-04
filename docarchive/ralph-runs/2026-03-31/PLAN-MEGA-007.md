# PLAN-MEGA-007: ERPNext Assets

**Story:** MEGA-007
**Module:** Assets (part of erpnext app)
**Capability:** Asset Management

---

## Module Overview

ERPNext Assets provides fixed asset lifecycle management: acquisition, depreciation, maintenance, movement, repair, and disposal. 26 DocTypes in the module.

---

## DocTypes to Investigate

### Primary (must evaluate thoroughly)
| DocType | Why |
|---------|-----|
| Asset | Core record — acquisition, depreciation, status lifecycle |
| Asset Category | Classification (furniture, IT equipment, clinical devices) |
| Asset Depreciation Schedule | Auto-depreciation rules — tax/accounting compliance |
| Asset Maintenance | Scheduled maintenance records (clinical equipment calibration?) |
| Asset Maintenance Task | Individual maintenance tasks |
| Asset Movement | Track asset location changes between sites/rooms |
| Asset Movement Item | Child table for bulk movement |
| Location | Physical locations for asset tracking |

### Secondary (check for relevance)
| DocType | Why |
|---------|-----|
| Asset Capitalization | Converting expenses to assets |
| Asset Value Adjustment | Revaluation |
| Asset Repair | Repair tracking with consumed items and purchase invoices |
| Asset Finance Book | Multi-book depreciation |
| Asset Shift Factor | Shift-based depreciation (manufacturing, likely irrelevant) |

---

## Behavioral Health Relevance Questions

1. **Does a therapy practice need this?** Optionally — small practices have minimal fixed assets (office furniture, computers, telehealth equipment). Larger behavioral health orgs with clinical devices (biofeedback, neurofeedback, EEG) would benefit.

2. **If yes, what specifically would they use it for?** Tracking office equipment, clinical devices, IT infrastructure. Depreciation for tax purposes. Maintenance scheduling for clinical equipment requiring calibration.

3. **Does it conflict with anything we're building custom?** No known conflicts. SM Task handles clinical tasks; Asset Maintenance Task is for physical equipment maintenance — different domain.

4. **Does the data model fit, or does it need heavy customization?** Likely fits as-is for basic asset tracking. May need custom fields for clinical equipment certifications/calibration dates.

5. **Is the Frappe Desk UI acceptable?** For admin/operations staff managing assets, Frappe Desk is likely sufficient. No need for a React Mojo unless asset tracking becomes a daily workflow for clinicians.

---

## API Endpoints to Test

```
GET /api/resource/Asset?limit=5
GET /api/resource/Asset Category?limit=5
GET /api/resource/Asset Maintenance?limit=5
GET /api/resource/Location?limit=5
GET /api/resource/Asset Movement?limit=5
GET /api/resource/Asset Depreciation Schedule?limit=5
```

---

## Key Investigation Points

- How many existing Asset records? (likely 0 on clean install)
- Are Asset Categories pre-seeded or empty?
- Does Location link to anything in Healthcare module (Service Unit, Medical Department)?
- Asset → Company link — does multi-company work cleanly?
- Asset Maintenance scheduling — cron/scheduler based or manual?
- Depreciation methods available (Straight Line, Written Down Value, Double Declining?)
- Asset Finance Book — is multi-book depreciation relevant for behavioral health accounting?

---

## Expected Verdict Range

**DEFER** — Most behavioral health practices don't need formal asset management. The module exists and works but isn't a priority for the platform MVP. Worth noting for larger organizations with significant equipment.

Possible upgrade to **USE-AS-IS** if Frappe Desk UI is clean enough for occasional admin use without a custom Mojo.
