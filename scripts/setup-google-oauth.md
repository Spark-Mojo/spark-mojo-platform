# Google OAuth Setup for Willow Center POC

## What's Needed

Willow Center uses Google Workspace. Staff authenticate with their Google accounts.

## Step 1: Google Cloud Console

1. Go to https://console.cloud.google.com
2. Find the existing Willow Center / Spark Mojo project (check `willow-center-ops` repo for existing config)
3. Navigate to **APIs & Services > Credentials**
4. Create or update an OAuth 2.0 Client ID:
   - Application type: **Web application**
   - Name: `Frappe POC`
   - Authorized redirect URIs — add:
     ```
     https://poc.sparkmojo.com/api/method/frappe.integrations.oauth2_logins.login_via_google
     ```
5. Note the **Client ID** and **Client Secret**

## Step 2: Configure Frappe Social Login

1. Log into Frappe Desk at `https://poc.sparkmojo.com`
2. Go to **Home > Integrations > Social Login Key**
3. Click **+ Add Social Login Key**
4. Fill in:
   - **Provider**: Google
   - **Client ID**: (from Step 1)
   - **Client Secret**: (from Step 1)
   - **Base URL**: `https://accounts.google.com`
   - **Redirect URL**: `https://poc.sparkmojo.com/api/method/frappe.integrations.oauth2_logins.login_via_google`
   - **Enable Social Login**: Checked
5. Save

## Step 3: Create Frappe Users for Staff

Each Willow Center staff member needs a Frappe User record with their Google email:

```
bench --site frontend console
```

```python
import frappe

staff = [
    {"email": "erin@willowcenter.com", "first_name": "Erin", "role": "System Manager"},
    # Add other staff...
]

for s in staff:
    if not frappe.db.exists("User", s["email"]):
        user = frappe.get_doc({
            "doctype": "User",
            "email": s["email"],
            "first_name": s["first_name"],
            "enabled": 1,
            "new_password": frappe.generate_hash(),  # Random — they'll use Google
            "send_welcome_email": 0,
        })
        user.insert(ignore_permissions=True)
        user.add_roles(s["role"])
        print(f"Created: {s['email']}")

frappe.db.commit()
```

## Step 4: Verify

1. Visit `https://app.poc.sparkmojo.com`
2. Click **Sign in with Google**
3. Authenticate with a Willow Center Google account
4. Should redirect back to the app with the Onboarding Mojo loaded

## If Google Credentials Are Not Yet Available

The frontend works with dev fallback:
- In development mode (`VITE_ENVIRONMENT=development`), the app auto-authenticates with a dev user
- The "Sign in with Google" button is still visible but also shows an email/password fallback form
- In production mode, only the Google button is shown
