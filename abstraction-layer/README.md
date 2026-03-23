# Mojo Abstraction Layer

The routing layer between the React frontend and backend systems. Every Mojo
calls this layer — it NEVER calls backends directly (DECISION-003).

## Architecture

```
React Frontend
    ↓ POST /api/modules/{capability}/{action}
Mojo Abstraction Layer (this app)
    ↓ reads SM Connector Config for tenant
    ↓ routes to correct connector
Frappe / SimplePractice / Valant / Plane
```

## How Routing Works

1. Frontend sends a request to `/api/modules/{capability}/{action}`
2. The layer validates the Frappe session cookie
3. It looks up `SM Connector Config` to find which connector handles this
   capability for the authenticated tenant
4. The request is forwarded to the correct connector
5. Default connector for all capabilities: `frappe_native`

## Canonical Capability Names

| Capability | SM DocTypes | Default Connector |
|------------|-------------|-------------------|
| `onboarding` | SM Client, SM Onboarding Item, SM Outreach Attempt | frappe_native |
| `appointments` | SM Appointment | frappe_native |
| `billing_ar` | SM Invoice, AR aging | frappe_native |
| `tasks` | SM Task (ERPNext Task extended) | frappe_native |
| `projects` | SM Project | plane (Phase 5+) |
| `documents` | SM Document | frappe_native |
| `employees` | SM Employee | frappe_native |
| `automations` | SM Automation Template, SM Client Automation | frappe_native |
| `desktop` | SM Mojo Definition, SM Desktop State, SM Tenant Config | frappe_native |
| `analytics` | reporting queries | frappe_native |

## How to Add a Connector

1. Create `connectors/your_connector.py`
2. Implement a class extending `BaseConnector` from `connectors/base.py`
3. Implement the `handle()` method
4. Register the connector name in `registry.py` → `CONNECTOR_MAP`
5. Configure `SM Connector Config` in Frappe to route a capability to your connector

## Running Locally

```bash
cd abstraction-layer
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # edit with your Frappe URL
uvicorn main:app --reload --port 8000
```

## Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | No | Health check + Frappe connectivity |
| GET | `/api/modules/tenant/public-config` | No | Tenant branding for login screen |
| GET | `/api/modules/desktop/mojos` | Yes | Mojo registry for current user |
| GET | `/api/modules/desktop/me` | Yes | Current user profile |
| GET | `/api/modules/automations/contextual` | Yes | Contextual automations for a Mojo |
| POST | `/api/modules/automations/run` | Yes | Execute an automation |
| GET/POST/PUT/DELETE | `/api/modules/{capability}/{action}` | Yes | Generic capability routing |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `FRAPPE_URL` | Base URL of the Frappe instance |
| `FRAPPE_API_KEY` | System-level Frappe API key for session validation |
| `FRONTEND_URL` | Frontend URL for CORS (default: http://localhost:5173) |
