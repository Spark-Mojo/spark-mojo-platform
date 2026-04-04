# PLAN-MEGA-002: ERPNext Accounting

**Story:** MEGA-002
**Module:** Accounts (ERPNext built-in)
**App:** erpnext
**Capability Library Link:** Billing & Payments (CORE)

---

## Key DocTypes to Investigate

### Primary (must evaluate thoroughly)

| DocType | Why |
|---------|-----|
| Sales Invoice | Core billing document — how Willow invoices clients/payers |
| Payment Entry | Payment receipt/recording — how payments are tracked |
| Account | Chart of Accounts — structure of financial accounts |
| Journal Entry | Manual accounting entries |
| Payment Request | Online payment requests — relevant to patient billing |
| POS Profile / POS Invoice | Point-of-sale — likely not relevant for therapy |
| Budget | Budget tracking — relevant to practice financial management |
| Cost Center | Cost tracking by department/location |
| Bank Account / Bank Transaction | Bank reconciliation pipeline |
| Payment Reconciliation | Matching payments to invoices |
| Subscription / Subscription Plan | Recurring billing — relevant if Willow has recurring session fees |
| Fiscal Year | Financial periods |
| Pricing Rule / Promotional Scheme | Pricing logic — could map to sliding scale fees |

### Secondary (quick check for relevance)

| DocType | Why |
|---------|-----|
| Dunning / Dunning Type | Debt collection letters — relevant to overdue patient balances |
| Tax Withholding Category | Tax handling |
| Invoice Discounting | Financial instrument — likely not relevant |
| Share Transfer / Shareholder | Equity management — likely EXCLUDE |
| Loyalty Program / Coupon Code | Retail loyalty — likely EXCLUDE |
| Exchange Rate Revaluation | Multi-currency — likely DEFER |

---

## Behavioral Health Relevance Questions to Answer

1. **Does a therapy practice need accounting?** — Almost certainly yes, but how much of ERPNext Accounting vs external (QuickBooks/Xero)?
2. **What would Willow use it for?** — Client invoicing, payment tracking, insurance claim billing, sliding scale fees, financial reporting
3. **Does it conflict with anything we're building custom?** — Check if SM Billing (sm_billing app) overlaps or wraps this
4. **Does the data model fit behavioral health billing?** — Insurance/superbill patterns, CPT codes, co-pay tracking, ERA/EOB processing
5. **Is the Frappe Desk UI acceptable?** — Accounting UIs are complex; Willow admin staff may need simplified Mojo views

---

## API Endpoints to Test

```bash
# Sales Invoice list
curl -s "https://poc-dev.sparkmojo.com/api/resource/Sales Invoice?limit=3" -b /tmp/frappe-eval-cookies.txt

# Payment Entry list
curl -s "https://poc-dev.sparkmojo.com/api/resource/Payment Entry?limit=3" -b /tmp/frappe-eval-cookies.txt

# Account (Chart of Accounts)
curl -s "https://poc-dev.sparkmojo.com/api/resource/Account?limit=10" -b /tmp/frappe-eval-cookies.txt

# Subscription
curl -s "https://poc-dev.sparkmojo.com/api/resource/Subscription?limit=3" -b /tmp/frappe-eval-cookies.txt

# Payment Request
curl -s "https://poc-dev.sparkmojo.com/api/resource/Payment Request?limit=3" -b /tmp/frappe-eval-cookies.txt

# Budget
curl -s "https://poc-dev.sparkmojo.com/api/resource/Budget?limit=3" -b /tmp/frappe-eval-cookies.txt
```

---

## Record Counts to Check

```python
for dt in ['Sales Invoice', 'Payment Entry', 'Journal Entry', 'Account',
           'Cost Center', 'Bank Account', 'Subscription', 'Payment Request',
           'Budget', 'POS Invoice', 'Bank Transaction']:
    print(f"{dt}: {frappe.db.count(dt)}")
```

---

## Fields Deep-Dive Priority

1. **Sales Invoice** — Check: customer link, items table, payment terms, outstanding amount, taxes, currency, naming series
2. **Payment Entry** — Check: payment type, party type/party, paid amount, references (which invoices it pays), mode of payment
3. **Account** — Check: account type, root type (Asset/Liability/Income/Expense), is_group, company
4. **Subscription** — Check: plans, invoicing interval, current invoice, status lifecycle
5. **Pricing Rule** — Check: conditions, discount type, applicable DocTypes — could this handle sliding scale?

---

## Notes

- ERPNext Accounting is one of the most mature ERPNext modules (200+ DocTypes)
- The module name in Frappe is "Accounts" not "Accounting"
- sm_billing custom app exists in frappe-apps/ — need to check if it wraps or replaces Accounts
- Key question: does Willow use ERPNext as the accounting system of record, or just for invoicing with QuickBooks/Xero as the ledger?
