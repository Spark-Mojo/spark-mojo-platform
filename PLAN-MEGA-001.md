# PLAN-MEGA-001 — Frappe CRM

**Story:** MEGA-001
**Module:** CRM
**App:** `crm` (separate app, v2.0.0-dev on develop branch)
**Capability Library Link:** CRM / Client Identity (KERNEL)

---

## DocTypes to Investigate

These DocTypes belong to the CRM module on poc-dev.sparkmojo.com:

### Primary DocTypes (investigate in depth)
| DocType | Priority | Why |
|---------|----------|-----|
| Lead | High | Core CRM entity — intake funnel for new clients |
| Opportunity | High | Sales pipeline tracking |
| Prospect | High | Qualified lead / organization |
| Contract | High | Agreement management — relevant for payer contracts |
| Appointment | High | Scheduling — critical overlap with therapy scheduling |
| Campaign | Medium | Marketing campaigns |
| Email Campaign | Medium | Email marketing automation |
| CRM Settings | Medium | Module configuration |
| Competitor | Low | Competitive tracking |

### Child / Supporting DocTypes (quick scan)
- CRM Note, Prospect Opportunity, Prospect Lead
- Opportunity Item, Opportunity Lost Reason, Opportunity Lost Reason Detail, Lost Reason Detail
- Campaign Email Schedule
- Appointment Booking Slots, Appointment Booking Settings, Availability Of Slots
- Contract Fulfilment Checklist, Contract Template, Contract Template Fulfilment Terms
- Competitor Detail
- Sales Stage, Market Segment, Opportunity Type

---

## API Endpoints to Test

```bash
# Lead list
curl -s "https://poc-dev.sparkmojo.com/api/resource/Lead?limit=3" -b /tmp/frappe-cookies.txt

# Opportunity list
curl -s "https://poc-dev.sparkmojo.com/api/resource/Opportunity?limit=3" -b /tmp/frappe-cookies.txt

# Contract list
curl -s "https://poc-dev.sparkmojo.com/api/resource/Contract?limit=3" -b /tmp/frappe-cookies.txt

# Appointment list
curl -s "https://poc-dev.sparkmojo.com/api/resource/Appointment?limit=3" -b /tmp/frappe-cookies.txt

# CRM Settings (single)
curl -s "https://poc-dev.sparkmojo.com/api/resource/CRM Settings" -b /tmp/frappe-cookies.txt
```

---

## Behavioral Health Relevance Questions to Answer

1. **Does a therapy practice need CRM?**
   Consider: patient intake funnel, referral tracking, payer relationship management, marketing to referral sources.

2. **If yes, what specifically would they use it for?**
   Map Lead → Patient referral, Opportunity → Intake pipeline, Contract → Payer agreements, Appointment → scheduling overlap.

3. **Does it conflict with anything we're building custom?**
   Check: Does CRM Lead conflict with SM Task intake workflows? Does Appointment conflict with planned scheduling Mojo? Does the CRM data model duplicate what Marley Health (healthcare app) provides for patient records?

4. **Does the data model fit, or does it need heavy customization?**
   Evaluate: Are Lead/Opportunity fields oriented toward sales or can they map to clinical intake? Is the pipeline model (Lead → Opportunity → Customer) appropriate for referral → intake → active patient?

5. **Is the Frappe Desk UI acceptable for Willow's staff, or must we build a React Mojo?**
   Consider: CRM app has its own modern UI (v2.0.0-dev) — is it usable standalone or does it need to be surfaced through a Mojo?

---

## Investigation Steps

1. Confirm CRM module is live and accessible via desktop icons / module list
2. For each primary DocType: get field list, check link fields, count records
3. Test all API endpoints above — note permissions, default fields returned
4. Check if CRM app has its own frontend views (it's a separate app with modern UI)
5. Answer all 5 behavioral health questions with evidence
6. Write classification entry to ERPNEXT_APP_EVALUATION.md
7. Create MEGA-001-COMPLETE marker
