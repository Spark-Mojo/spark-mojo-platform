# PLAN-MEGA-006: ERPNext Stock + Manufacturing

**Story:** MEGA-006
**Module:** Stock (75 DocTypes) + Manufacturing (47 DocTypes) — 122 total
**App:** erpnext
**Capability:** Inventory / Manufacturing
**Expected Verdict Range:** DEFER or EXCLUDE for most; Item/Warehouse may be load-bearing

---

## Why This Module Matters (or Doesn't)

Behavioral health practices are service businesses — they don't hold physical inventory or manufacture goods. However, ERPNext's Stock module contains foundational DocTypes (Item, Price List, Warehouse, UOM) that other modules depend on. We need to determine which parts are load-bearing infrastructure vs. which are pure inventory/manufacturing noise.

---

## Behavioral Health Relevance Questions

1. **Does a therapy practice need Stock/Manufacturing?** — Almost certainly No for core inventory/manufacturing. But Item, Price List, and UOM may be required by Accounting (Sales Invoice line items reference Item).
2. **If yes, what specifically would they use it for?** — Only Item (service items like "60-Minute Therapy Session") and Price List (fee schedules).
3. **Does it conflict with anything we're building custom?** — No direct conflict. But if Item is load-bearing for billing, it's an implicit dependency.
4. **Does the data model fit, or does it need heavy customization?** — Item is designed for physical goods (has weight, shelf life, stock UOM). Service items are supported but feel bolted-on.
5. **Is the Frappe Desk UI acceptable?** — Item form is complex (100+ fields for a physical product). Therapy practices should never see most Stock UI.

---

## Key DocTypes to Investigate

### Stock — Primary (load-bearing infrastructure)
| DocType | Why Investigate |
|---------|----------------|
| **Item** | Core entity — Sales Invoice, BOM, Subscription all link to Item. Check if service items exist. |
| **Price List** | Fee schedules. MEGA-002 found Sales Invoices with therapy sessions — what Price List do they use? |
| **Item Price** | Per-item pricing. Check for therapy session pricing records. |
| **Warehouse** | Required for stock transactions. Do service items need a warehouse? |
| **UOM Conversion Detail** | Unit of measure. "Session", "Hour" — are these defined? |
| **Stock Settings** | Global config — check if stock validation can be disabled for service-only setup. |

### Stock — Secondary (likely defer/exclude)
| DocType | Why Investigate |
|---------|----------------|
| Serial No / Batch | Physical inventory tracking — likely exclude |
| Stock Entry / Stock Ledger Entry | Inventory movements — likely exclude |
| Delivery Note / Purchase Receipt | Goods receipt/dispatch — likely exclude |
| Material Request | Procurement trigger — likely exclude |
| Quality Inspection | QC for physical goods — likely exclude |
| Pick List / Packing Slip / Shipment | Warehouse ops — definitely exclude |

### Manufacturing — All likely EXCLUDE
| DocType | Why Investigate |
|---------|----------------|
| BOM (Bill of Materials) | Manufacturing recipe — no behavioral health use |
| Work Order | Production order — no behavioral health use |
| Workstation | Production equipment — no behavioral health use |
| Job Card | Shop floor tracking — no behavioral health use |
| Production Plan | MRP — no behavioral health use |

---

## API Endpoints to Test

```bash
# Item — check for existing service items
curl -s "https://poc-dev.sparkmojo.com/api/resource/Item?limit=10" -b /tmp/frappe-eval-cookies.txt

# Price List — check active price lists
curl -s "https://poc-dev.sparkmojo.com/api/resource/Price List?limit=10" -b /tmp/frappe-eval-cookies.txt

# Item Price — check therapy session pricing
curl -s "https://poc-dev.sparkmojo.com/api/resource/Item Price?limit=10" -b /tmp/frappe-eval-cookies.txt

# Warehouse — check what warehouses exist
curl -s "https://poc-dev.sparkmojo.com/api/resource/Warehouse?limit=10" -b /tmp/frappe-eval-cookies.txt

# Stock Entry count (should be 0 for service-only)
curl -s "https://poc-dev.sparkmojo.com/api/resource/Stock Entry?limit=1" -b /tmp/frappe-eval-cookies.txt

# BOM count (should be 0)
curl -s "https://poc-dev.sparkmojo.com/api/resource/BOM?limit=1" -b /tmp/frappe-eval-cookies.txt

# Work Order count (should be 0)
curl -s "https://poc-dev.sparkmojo.com/api/resource/Work Order?limit=1" -b /tmp/frappe-eval-cookies.txt
```

---

## Key Investigation Angles

1. **Item as infrastructure**: Confirm that Sales Invoice references Item. Check if "60-Minute Therapy Session" from MEGA-002 is an Item record. Determine if Item is required for billing or if Sales Invoice can work without it.

2. **Service Item configuration**: Check `is_stock_item`, `is_fixed_asset`, `has_serial_no`, `has_batch_no` flags on any existing items. Service items should have `is_stock_item=0`.

3. **Price List as fee schedule**: Check if Standard Selling price list exists and has therapy session prices. This is the fee schedule mechanism for behavioral health.

4. **Warehouse requirement**: Even service items may require a "virtual" warehouse for ERPNext's stock validation. Check if this is the case and how it's configured.

5. **Manufacturing module presence**: Confirm 0 records across all Manufacturing DocTypes. This should be a clean EXCLUDE.

6. **Stock Settings**: Check `stock_frozen_upto`, `auto_indent`, `allow_negative_stock` — understand defaults for a service-only deployment.

---

## Expected Outcome

- **Stock (infrastructure):** CONFIGURE-AND-SURFACE for Item + Price List (they're load-bearing for billing). The Mojo surface would be a simple "Services & Pricing" admin view, not a full inventory UI.
- **Stock (inventory):** DEFER — no physical inventory needs for behavioral health.
- **Manufacturing:** EXCLUDE — zero relevance to service businesses.
- Combined verdict for MEGA-006: likely **DEFER** with a note that Item/Price List are load-bearing dependencies managed through Billing Mojo, not a separate Stock Mojo.
