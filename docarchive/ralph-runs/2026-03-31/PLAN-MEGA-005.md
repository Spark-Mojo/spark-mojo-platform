# PLAN-MEGA-005: ERPNext Buying + Selling

**Story:** MEGA-005
**App:** erpnext
**Modules:** Buying (20 DocTypes), Selling (18 DocTypes)
**Capability Library Link:** Purchasing / Sales operations

---

## Investigation Areas

### Buying Module (20 DocTypes)
Primary DocTypes to investigate:
- **Purchase Order** — core procurement document
- **Supplier** — vendor master data
- **Supplier Quotation** — vendor pricing
- **Request for Quotation** — RFQ workflow
- **Supplier Scorecard** — vendor performance tracking (+ Period, Standing, Criteria, Variable, Scoring*)
- **Buying Settings** — module configuration

### Selling Module (18 DocTypes)
Primary DocTypes to investigate:
- **Customer** — client master data (overlap with CRM Lead? with Healthcare Patient?)
- **Sales Order** — service/product sales
- **Quotation** — client-facing quotes
- **Product Bundle** — bundled service packages (therapy packages?)
- **Installation Note** — delivery/fulfillment tracking
- **Selling Settings** — module configuration
- **Sales Team** — team attribution
- **SMS Center** — outbound SMS (active?)

### Cross-Module Links
- Customer ↔ CRM Lead lifecycle (MEGA-001 found Lead data model)
- Customer ↔ Sales Invoice (MEGA-002 found existing invoices)
- Supplier ↔ Purchase Order ↔ Accounts integration
- Sales Order ↔ Project link (MEGA-004)

---

## Behavioral Health Relevance Questions

1. **Does a therapy practice need Buying/Selling?**
   - Buying: for office supplies, software subscriptions, equipment? Most small practices use credit cards directly.
   - Selling: Sales Order for therapy packages/bundles? Or is Sales Invoice (Accounts) sufficient?

2. **What specifically would they use it for?**
   - Investigate: are therapy session packages a "Product Bundle" use case?
   - Investigate: is Supplier relevant for insurance payers or referral sources?

3. **Does it conflict with anything custom?**
   - Customer DocType vs CRM Lead vs Healthcare Patient — identity model overlap
   - Check if Sales Order is needed when Sales Invoice already handles billing (MEGA-002)

4. **Does the data model fit?**
   - Check if Customer has healthcare-specific fields
   - Check if Product Bundle can represent "10-session therapy package" or similar

5. **Is Frappe Desk UI acceptable?**
   - Admin-only module — staff wouldn't use this directly
   - If used at all, Desk UI may be sufficient for occasional purchasing

---

## API Endpoints to Test

```
GET /api/resource/Customer?limit=5
GET /api/resource/Supplier?limit=5
GET /api/resource/Sales Order?limit=5
GET /api/resource/Purchase Order?limit=5
GET /api/resource/Quotation?limit=5
GET /api/resource/Product Bundle?limit=5
GET /api/resource/Buying Settings
GET /api/resource/Selling Settings
```

---

## Key Questions for Research

1. How many Customer records exist? Are they the same entities as CRM Leads or Healthcare Patients?
2. Are there any Sales Orders or Purchase Orders — or is all transaction data in Sales Invoices?
3. What fields does Customer have? Any healthcare links?
4. Is Product Bundle suitable for therapy session packages?
5. Is Supplier Scorecard overkill for a small practice?
6. What's the relationship between Selling module's Customer and Accounts module's Sales Invoice customer?
7. Is SMS Center functional or just a placeholder?

---

## Expected Verdict Range

Likely **DEFER** or **EXCLUDE** for most of this — small behavioral health practices rarely need formal procurement or sales order workflows. Sales Invoice (evaluated in MEGA-002) handles billing directly. But need to confirm Customer DocType isn't load-bearing for other modules.
