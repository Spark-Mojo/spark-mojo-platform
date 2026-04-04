# PLAN-MEGA-012: Frappe Payments

**Story:** MEGA-012
**Module:** Frappe Payments (payments app, v0.0.1, develop branch)
**Capability:** Billing & Payments (CORE)

---

## Overview

The `payments` app is a separate Frappe app (not part of ERPNext core) that provides payment gateway integrations. It acts as a bridge between ERPNext's Payment Request workflow and third-party payment processors.

The app has two modules:
- **Payments** — contains just `Payment Gateway` (1 DocType)
- **Payment Gateways** — contains 9 gateway-specific settings DocTypes (Stripe, Razorpay, PayPal, Braintree, GoCardless, Mpesa, Paymob, Paytm)

ERPNext's Accounts module provides the complementary DocTypes: `Payment Request`, `Payment Gateway Account`, `Payment Entry`.

---

## Key DocTypes to Investigate

### From payments app (module: Payments)
| DocType | Purpose | Initial Assessment |
|---------|---------|-------------------|
| Payment Gateway | Registry of configured gateways | 0 records — no gateways configured |

### From payments app (module: Payment Gateways)
| DocType | Purpose | Initial Assessment |
|---------|---------|-------------------|
| Stripe Settings | Stripe API keys + redirect URL | Key target — Stripe is primary for behavioral health |
| PayPal Settings | PayPal integration config | Secondary option |
| Razorpay Settings | Razorpay config | India-focused, likely irrelevant |
| Braintree Settings | Braintree config | PayPal-owned, secondary |
| GoCardless Settings | GoCardless direct debit config | UK/EU-focused |
| GoCardless Mandate | GoCardless mandate records | UK/EU-focused |
| Mpesa Settings | M-Pesa mobile payments | Africa-focused |
| Paymob Settings | Paymob config | MENA-focused |
| Paytm Settings | Paytm config | India-focused |

### From ERPNext (module: Accounts) — complementary
| DocType | Purpose | Initial Assessment |
|---------|---------|-------------------|
| Payment Request | Payment link generation with status workflow | 0 records, rich field model |
| Payment Gateway Account | Links gateway → Frappe account | 0 records |
| Payment Entry | Actual payment recording | Already covered in MEGA-002 |

---

## Research Steps

1. **Verify app is installed and accessible:**
   - `payments` app is confirmed installed (v0.0.1, develop branch)
   - Payment Gateway DocType accessible via bench

2. **Enumerate all DocTypes:**
   - Payments module: 1 DocType (Payment Gateway)
   - Payment Gateways module: 9 DocTypes (gateway settings)
   - Total: 10 DocTypes from the payments app

3. **Record counts:** All 0 — completely unconfigured

4. **Stripe Settings deep dive:**
   - Fields: gateway_name, publishable_key, secret_key (Password), header_img, redirect_url
   - Very minimal — just API keys + branding
   - Need to check: does it support webhooks? Subscription billing? Connect/platform accounts?

5. **Payment Request workflow:**
   - Status: Draft → Requested → Initiated → Partially Paid → Paid → Failed → Cancelled
   - Types: Inward (receive) / Outward (send)
   - Channels: Email, Phone, Other
   - Links to: Company, Mode of Payment, Bank Account, Payment Gateway Account
   - Has payment_url field — generates payment links
   - Reference DocType + name — can link to Sales Invoice, etc.

6. **Test REST API endpoints:**
   - `GET /api/resource/Payment Gateway?limit=3`
   - `GET /api/resource/Stripe Settings`
   - `GET /api/resource/Payment Request?limit=3`
   - `GET /api/resource/Payment Gateway Account?limit=3`

---

## Behavioral Health Relevance Questions

1. **Does a therapy practice need this?** — Yes, for client billing: copay collection, session payment links, recurring subscription billing
2. **What specifically would they use it for?** — Stripe integration for online payments, payment links sent to clients, possibly recurring billing for group programs
3. **Does it conflict with anything we're building custom?** — Need to check overlap with SM Billing (sm_billing app)
4. **Does the data model fit?** — Stripe Settings is very basic (just API keys). Payment Request is solid but may need custom fields for insurance vs self-pay tracking
5. **Is the Frappe Desk UI acceptable?** — Configuration (Stripe Settings) is fine in Desk. Payment collection workflow needs a Mojo for client-facing staff

---

## Expected Verdict

Likely **CONFIGURE-AND-SURFACE** — Stripe integration is essential for any billing workflow. The payments app provides the gateway plumbing, but staff need a React Mojo for managing payment requests and viewing payment status. The Stripe Settings config is a one-time admin task (fine in Desk).

Alternative: **DEFER** if sm_billing is intended to replace this entirely. Researcher should check.
