# PLAN-MEGA-016: ERPNext Integrations

**Story:** MEGA-016
**Module:** Frappe Integrations (frappe core) + ERPNext Integrations (erpnext app)
**App:** frappe (core) + erpnext
**Capability:** Third-party integration hooks

---

## Scope

Two modules to evaluate:
1. **Frappe Integrations** (frappe core) — 24 DocTypes: OAuth, webhooks, Connected Apps, Google Calendar/Contacts, LDAP, social login
2. **ERPNext Integrations** — 1 DocType: Plaid Settings (bank account integration)

Total: 25 DocTypes

---

## Known State

- 24 DocTypes in Frappe Integrations module
- 1 DocType in ERPNext Integrations module (Plaid Settings)
- 1 Social Login Key record exists; all other DocTypes have 0 records
- **OAuth Settings table MISSING** — same migration gap as Wiki/LMS/Helpdesk/Healthcare
- **Plaid Settings table MISSING** — same pattern
- Completely unconfigured — no OAuth apps, no webhooks, no Google integrations

---

## DocTypes to Investigate

### Frappe Integrations (24 DocTypes)

**OAuth Infrastructure:**
- OAuth Client — registered OAuth2 clients
- OAuth Bearer Token — issued tokens
- OAuth Authorization Code — auth codes
- OAuth Provider Settings — OAuth server config
- OAuth Settings — OAuth configuration (TABLE MISSING)
- OAuth Client Role — role mapping
- OAuth Scope — permission scopes

**Webhook System:**
- Webhook — event-triggered HTTP callbacks
- Webhook Data — payload field mapping
- Webhook Header — custom headers
- Webhook Request Log — execution history
- Query Parameters — URL parameters

**Connected Apps / Third-Party:**
- Connected App — OAuth2 client credentials for external services
- Google Calendar — Google Calendar sync config
- Google Contacts — Google Contacts sync config
- Google Settings — Google API credentials
- Social Login Key — social auth providers (Google, GitHub, etc.)
- Slack Webhook URL — Slack integration

**Infrastructure:**
- Integration Request — generic integration request log
- LDAP Settings — LDAP/AD authentication
- LDAP Group Mapping — LDAP group to Frappe role mapping
- Geolocation Settings — IP geolocation config
- Push Notification Settings — push notification config
- Token Cache — token storage

### ERPNext Integrations (1 DocType)
- Plaid Settings — Plaid bank account linking (TABLE MISSING)

---

## Behavioral Health Relevance Questions

1. **Does a therapy practice need this?** — Optionally. OAuth/SSO for staff login, webhooks for n8n automation, Google Calendar for appointment sync.
2. **If yes, what specifically would they use it for?** — SSO via Google/Microsoft for staff, webhooks to trigger n8n workflows, Google Calendar sync for practitioner schedules.
3. **Does it conflict with anything we're building custom?** — No direct conflict. n8n is our automation layer but webhooks feed into it. OAuth is infrastructure.
4. **Does the data model fit?** — These are infrastructure DocTypes, not business logic. They work as-is.
5. **Is the Frappe Desk UI acceptable?** — Yes for admin configuration. Staff never interact with these directly.

---

## API Endpoints to Test

```bash
# Frappe Integrations
curl -s "https://poc-dev.sparkmojo.com/api/resource/Connected App?limit=3" -b /tmp/frappe-cookies.txt
curl -s "https://poc-dev.sparkmojo.com/api/resource/Webhook?limit=3" -b /tmp/frappe-cookies.txt
curl -s "https://poc-dev.sparkmojo.com/api/resource/Integration Request?limit=3" -b /tmp/frappe-cookies.txt
curl -s "https://poc-dev.sparkmojo.com/api/resource/Social Login Key?limit=3" -b /tmp/frappe-cookies.txt
curl -s "https://poc-dev.sparkmojo.com/api/resource/Google Settings" -b /tmp/frappe-cookies.txt
curl -s "https://poc-dev.sparkmojo.com/api/resource/OAuth Client?limit=3" -b /tmp/frappe-cookies.txt

# ERPNext Integrations
curl -s "https://poc-dev.sparkmojo.com/api/resource/Plaid Settings" -b /tmp/frappe-cookies.txt
```

---

## Expected Verdict

**USE-AS-IS** — These are infrastructure/plumbing DocTypes configured by admins via Frappe Desk. No React Mojo needed. Configure OAuth and webhooks when needed for n8n/SSO integration.
