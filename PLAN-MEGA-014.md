# PLAN-MEGA-014: ERPNext Subcontracting

**Story:** MEGA-014
**Module:** Subcontracting (part of erpnext app)
**Capability:** Subcontracting / Outsourced Manufacturing
**Group:** C (ERPNext Supporting Modules)

---

## Module Overview

ERPNext Subcontracting manages outsourced manufacturing workflows — sending raw materials to external suppliers who manufacture finished goods and return them. This is a supply chain module.

13 DocTypes in the Subcontracting module, 0 records across all parent DocTypes — completely unused.

---

## Key DocTypes to Investigate

| DocType | Purpose | Priority |
|---------|---------|----------|
| Subcontracting Order | Main order to external supplier | HIGH |
| Subcontracting Receipt | Receiving finished goods back | HIGH |
| Subcontracting BOM | Bill of materials for subcontracted items | HIGH |
| Subcontracting Inward Order | Inward processing order | MEDIUM |
| Subcontracting Order Item | Line items on orders | LOW (child table) |
| Subcontracting Order Service Item | Service charges | LOW (child table) |
| Subcontracting Order Supplied Item | Raw materials sent out | LOW (child table) |
| Subcontracting Receipt Item | Received items | LOW (child table) |
| Subcontracting Receipt Supplied Item | Materials consumed | LOW (child table) |

---

## API Endpoints to Test

```
GET /api/resource/Subcontracting Order?limit=3
GET /api/resource/Subcontracting BOM?limit=3
GET /api/resource/Subcontracting Receipt?limit=3
GET /api/resource/Subcontracting Inward Order?limit=3
```

---

## Behavioral Health Relevance Questions

1. **Does a therapy practice need this?** — Almost certainly No. Subcontracting is manufacturing-specific.
2. **If yes, what specifically would they use it for?** — N/A
3. **Does it conflict with anything we're building custom?** — No conflict expected.
4. **Does the data model fit?** — Not relevant to behavioral health.
5. **Is the Frappe Desk UI acceptable?** — N/A if excluded.

---

## Expected Verdict

**EXCLUDE** — Subcontracting is a manufacturing/supply chain module with zero applicability to behavioral health practices. No therapy practice sends raw materials to external manufacturers.

---

## Investigation Checklist

- [ ] Confirm module is accessible on POC
- [ ] Enumerate all 13 DocTypes and key fields on parent DocTypes
- [ ] Verify 0 records across all DocTypes
- [ ] Test REST API connectivity for parent DocTypes
- [ ] Check for any links to HR/Healthcare modules (unlikely)
- [ ] Write classification entry to ERPNEXT_APP_EVALUATION.md
- [ ] Commit and push to sparkmojo-internal
