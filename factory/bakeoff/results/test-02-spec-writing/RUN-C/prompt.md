PROMPT
test: 02-spec-writing
run: C
date: 2026-04-09

```
You are the Spec Writer for the Spark Mojo build factory. Write a complete, self-contained story spec for the following story:
STORY ID: NOTIF-PREF-001 TITLE: User notification preferences GET and PUT endpoints CATEGORY: BACKEND SIZE: S DEPENDENCIES: None
CONTEXT: Spark Mojo platform stack: Frappe/ERPNext backend, FastAPI MAL at /api/modules/[capability]/[action], React JSX frontend. React never calls Frappe directly. All custom DocTypes are prefixed "SM ".
The notification preferences system controls which channels are used for which events, per user.
Events: task_assigned, task_due_soon, appointment_reminder, claim_denied, claim_paid, intake_submitted
Channels: email, sms, in_app
Three-tier cascade (user overrides site, site overrides platform):
1. Platform defaults: defined as a Python dict in the endpoint file
2. Site overrides: stored in SM Site Registry config_json under key "notification_preferences"
3. User overrides: stored in a new DocType SM User Notification Preferences (linked to Frappe User by email)
GET /api/modules/admin/notification-preferences/{user_email} Returns fully resolved preferences for that user (all three tiers merged) Also returns which tier each setting came from: "platform", "site", or "user" Returns 404 if user does not exist on the current site
PUT /api/modules/admin/notification-preferences/{user_email} Body: partial or full preferences object Creates or updates the SM User Notification Preferences Frappe document Returns the updated resolved preferences Returns 400 if any event key or channel key is invalid
Both endpoints use X-Frappe-Site-Name header to resolve the site.
Write the full story spec file. It must be self-contained.
```
