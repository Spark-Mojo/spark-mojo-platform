# PLAN-MEGA-017: ERPNext Website Module

**Story:** MEGA-017
**Module:** Website (frappe core app)
**Capability:** Web presence tools

---

## Module Overview

The Website module is part of Frappe core (not ERPNext). It provides a built-in CMS/website builder with pages, forms, themes, discussions, help articles, and analytics tracking. 37 DocTypes total.

## Key Investigation Areas

### Record Counts (from initial scan)
- Web Page: 0 records
- Web Form: 15 records (notable — likely system-generated forms)
- Help Article: 0 records
- Help Category: 0 records
- Website Theme: 1 record
- Discussion Topic: 0 records
- Web Template: 28 records (built-in templates)
- Website Slideshow: 0 records
- Website Route Redirect: 0 records
- Personal Data Deletion Request: 0 records
- UTM Source: 10 records (tracking data exists)
- UTM Campaign: 0 records
- Web Page View: 0 records
- Website Script: TABLE MISSING
- Portal Settings: TABLE MISSING (singleton)
- About Us Settings: TABLE MISSING (singleton)
- Contact Us Settings: TABLE MISSING (singleton)
- Website Settings: TABLE MISSING (singleton)

### DocTypes to Investigate in Detail

1. **Web Page** — CMS page builder. Fields, blocks, dynamic templates
2. **Web Form** — Public-facing forms that create DocType records. 15 exist — check what they link to
3. **Website Theme** — CSS theming. 1 exists — check if it's a default
4. **Web Template** — Jinja/HTML templates for page sections. 28 exist
5. **Portal Settings** — Portal configuration (TABLE MISSING — singleton pattern)
6. **Website Settings** — Global website settings (TABLE MISSING — singleton pattern)
7. **UTM Source** — 10 records of analytics tracking data
8. **Discussion Topic/Reply** — Forum/comment system
9. **Help Article/Category** — Knowledge base (overlap with Frappe Wiki?)
10. **Personal Data Deletion Request/Download** — GDPR compliance

### Behavioral Health Relevance Questions

1. Does a therapy practice need a website/CMS? → Optionally, but most use Squarespace/WordPress
2. What specifically would they use it for? → Patient portal, intake forms (Web Form), help articles
3. Does it conflict with anything we're building custom? → Web Forms could overlap with intake flow
4. Does the data model fit? → CMS is generic, would need behavioral health content
5. Is Frappe Desk UI acceptable? → Admin-only CMS management is fine in Desk

### API Endpoints to Test

- `GET /api/resource/Web Page?limit=3`
- `GET /api/resource/Web Form?limit=3`
- `GET /api/resource/Web Template?limit=3`
- `GET /api/resource/Website Theme?limit=3`
- `GET /api/resource/UTM Source?limit=3`
- `GET /api/resource/Portal Settings/Portal Settings` (singleton)
- `GET /api/resource/Website Settings/Website Settings` (singleton)

### Expected Verdict

**DEFER** — Frappe's built-in website/CMS is not needed for the Spark Mojo platform. The React frontend IS the web presence. Web Forms might be useful for public intake forms later, but that's a future consideration. The UTM tracking could be useful but is low priority.

---

## Checklist

- [ ] Confirm module is live and accessible
- [ ] Enumerate all 37 DocTypes and categorize
- [ ] Inspect Web Form records (15) — what are they?
- [ ] Inspect Web Template records (28) — built-in or custom?
- [ ] Inspect UTM Source records (10) — what's being tracked?
- [ ] Check singleton DocTypes via direct resource path
- [ ] Test REST API connectivity for key DocTypes
- [ ] Assess behavioral health relevance
- [ ] Write classification entry to ERPNEXT_APP_EVALUATION.md
