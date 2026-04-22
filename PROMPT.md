# ACCT-BUILD-001 — SM Account Billing Overnight Build
# Generated: April 22, 2026

## How to Use This File
Work stories in order. Each story gets its own branch.
For each story:
1. Check for COMPLETE marker. If exists, skip.
2. Check for BLOCKED marker. If exists, skip.
3. Check dependencies - all dependency COMPLETE markers must exist.
4. Read full story spec from the path listed below.
5. Read CLAUDE.md for conventions.
6. Build exactly what the spec says - nothing more.
7. Run all quality gates per CLAUDE.md Definition of Done.
8. If architectural ambiguity: write BLOCKED-[ID].md and move on.

## Retry Policy
After 5 consecutive failures on any story, write BLOCKED-[ID].md and move on.

## Story Queue

### ACCT-001 - `story/ACCT-001-item-master-custom-fields`
Add SM custom fields to ERPNext Item master.
Type: Frappe DocType
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/ACCT-001-item-master-custom-fields.md
Dependencies: None

### ACCT-002 - `story/ACCT-002-fixture-loader-script`
Billable Action Registry fixture loader script.
Type: Python API
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/ACCT-002-fixture-loader-script.md
Dependencies: ACCT-001

### ACCT-003 - `story/ACCT-003-fixture-verification-script`
Ralph billing fixture verification script.
Type: VPS Infra
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/ACCT-003-fixture-verification-script.md
Dependencies: ACCT-002

### ACCT-004 - `story/ACCT-004-subscription-custom-fields`
Add SM custom fields to ERPNext Subscription.
Type: Frappe DocType
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/ACCT-004-subscription-custom-fields.md
Dependencies: ACCT-001

### ACCT-005 - `story/ACCT-005-professional-services-child-table`
SM Professional Services Line child table on ERPNext Subscription.
Type: Frappe DocType
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/ACCT-005-professional-services-child-table.md
Dependencies: ACCT-004

### ACCT-006 - `story/ACCT-006-stripe-products-prices-meters-setup`
Stripe Products, Prices, and Meters setup script.
Type: Python API
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/ACCT-006-stripe-products-prices-meters-setup.md
Dependencies: ACCT-001

### ACCT-007 - `story/ACCT-007-site-registry-billing-fields`
Add billing_motion and Stripe fields to SM Site Registry.
Type: Frappe DocType
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/ACCT-007-site-registry-billing-fields.md
Dependencies: None

### ACCT-008a - `story/ACCT-008a-stripe-customer-creation`
Stripe Customer creation in provisioning workflow.
Type: Python API
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/ACCT-008a-stripe-customer-creation.md
Dependencies: ACCT-004, ACCT-007

### ACCT-008b - `story/ACCT-008b-stripe-subscription-creation`
Stripe Subscription creation in provisioning workflow.
Type: Python API
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/ACCT-008b-stripe-subscription-creation.md
Dependencies: ACCT-008a, ACCT-006

### ACCT-009 - `story/ACCT-009-stripe-webhook-handler`
Stripe webhook handler with signature verification and idempotency.
Type: Python API
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/ACCT-009-stripe-webhook-handler.md
Dependencies: ACCT-007

### ACCT-010 - `story/ACCT-010-sm-subscription-sync`
SM Subscription sync from Stripe webhooks.
Type: Python API
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/ACCT-010-sm-subscription-sync.md
Dependencies: ACCT-009

### ACCT-011 - `story/ACCT-011-sm-invoice-sync`
SM Invoice sync from Stripe webhooks.
Type: Python API
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/ACCT-011-sm-invoice-sync.md
Dependencies: ACCT-009

### ACCT-012 - `story/ACCT-012-stripe-customer-portal-session`
Stripe Customer Portal session endpoint.
Type: Python API
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/ACCT-012-stripe-customer-portal-session.md
Dependencies: ACCT-008a

### ACCT-013 - `story/ACCT-013-erpnext-revenue-recording`
ERPNext admin-site Sales Invoice creation on Stripe invoice.paid.
Type: Python API
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/ACCT-013-erpnext-revenue-recording.md
Dependencies: ACCT-009, ACCT-011

### ACCT-014a - `story/ACCT-014a-sm-client-billable-action-doctype`
SM Client Billable Action DocType.
Type: Frappe DocType
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/ACCT-014a-sm-client-billable-action-doctype.md
Dependencies: ACCT-001

### ACCT-014b - `story/ACCT-014b-pricing-rule-auto-generator`
Pricing Rule auto-generator from SM Client Billable Action.
Type: Python API
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/ACCT-014b-pricing-rule-auto-generator.md
Dependencies: ACCT-014a

### ACCT-015 - `story/ACCT-015-sales-invoice-item-hook`
Sales Invoice Item before_insert hook for rack rate and discount.
Type: Frappe DocType
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/ACCT-015-sales-invoice-item-hook.md
Dependencies: ACCT-014a

### ACCT-016 - `story/ACCT-016-mojo-grouped-invoice-print-format`
SM Mojo-Grouped Sales Invoice Print Format.
Type: Frappe DocType
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/ACCT-016-mojo-grouped-invoice-print-format.md
Dependencies: ACCT-014a, ACCT-015

### ACCT-017 - `story/ACCT-017-frappe-workflow-invoice-approval`
Frappe Workflow for Sales Invoice approval.
Type: Frappe DocType
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/ACCT-017-frappe-workflow-invoice-approval.md
Dependencies: ACCT-016

### ACCT-018 - `story/ACCT-018-dunning-types-and-escalation`
Dunning Types fixture and WorkboardMojo escalation at day 30/60.
Type: Frappe DocType
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/ACCT-018-dunning-types-and-escalation.md
Dependencies: ACCT-017

### ACCT-019 - `story/ACCT-019-subscription-auto-invoice-pull`
ERPNext Subscription auto-pull of professional services and overages.
Type: Python API
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/ACCT-019-subscription-auto-invoice-pull.md
Dependencies: ACCT-014a, ACCT-005

### ACCT-020 - `story/ACCT-020-ai-token-meter-service`
AI Token meter service in abstraction layer - provider-agnostic.
Type: Python API
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/ACCT-020-ai-token-meter-service.md
Dependencies: ACCT-007

### ACCT-021 - `story/ACCT-021-claims-meter-hook`
Claims processed meter hook.
Type: Python API
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/ACCT-021-claims-meter-hook.md
Dependencies: ACCT-020

### ACCT-022 - `story/ACCT-022-storage-meter-workflow`
Storage calculator n8n workflow.
Type: VPS Infra
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/ACCT-022-storage-meter-workflow.md
Dependencies: ACCT-020

### ACCT-023 - `story/ACCT-023-staff-seat-meter-hook`
Staff seat meter hook on Frappe User.
Type: Python API
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/ACCT-023-staff-seat-meter-hook.md
Dependencies: ACCT-020

### ACCT-024 - `story/ACCT-024-portal-seat-meter-hook`
Portal seat meter hook on CRM Contact.
Type: Python API
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/ACCT-024-portal-seat-meter-hook.md
Dependencies: ACCT-020

### ACCT-025 - `story/ACCT-025-account-subscription-endpoint`
/api/modules/account/subscription unified endpoint.
Type: Python API
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/ACCT-025-account-subscription-endpoint.md
Dependencies: ACCT-010, ACCT-014b

### ACCT-026 - `story/ACCT-026-account-usage-endpoint`
/api/modules/account/usage endpoint.
Type: Python API
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/ACCT-026-account-usage-endpoint.md
Dependencies: ACCT-020

### ACCT-027a - `story/ACCT-027a-account-invoices-list-endpoint`
GET /api/modules/account/invoices list endpoint.
Type: Python API
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/ACCT-027a-account-invoices-list-endpoint.md
Dependencies: ACCT-011

### ACCT-027b - `story/ACCT-027b-account-invoices-detail-pdf-endpoint`
GET /api/modules/account/invoices/{id} detail and PDF endpoint.
Type: Python API
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/ACCT-027b-account-invoices-detail-pdf-endpoint.md
Dependencies: ACCT-027a

### ACCT-028 - `story/ACCT-028-account-settings-endpoint`
/api/modules/account/subscription/settings endpoint.
Type: Python API
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/ACCT-028-account-settings-endpoint.md
Dependencies: ACCT-025

### ACCT-029a - `story/ACCT-029a-sm-platform-billing-doctype`
SM Platform Billing DocType.
Type: Frappe DocType
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/ACCT-029a-sm-platform-billing-doctype.md
Dependencies: ACCT-007

### ACCT-029b - `story/ACCT-029b-hourly-fleet-aggregation`
Hourly fleet aggregation scheduled job.
Type: Python API
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/ACCT-029b-hourly-fleet-aggregation.md
Dependencies: ACCT-029a, ACCT-010

### ACCT-030 - `story/ACCT-030-platform-billing-mrr-endpoint`
Platform Billing MRR/ARR dashboard endpoint.
Type: Python API
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/ACCT-030-platform-billing-mrr-endpoint.md
Dependencies: ACCT-029a, ACCT-029b

### ACCT-031 - `story/ACCT-031-unified-dunning-queue-endpoint`
Unified dunning queue endpoint.
Type: Python API
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/ACCT-031-unified-dunning-queue-endpoint.md
Dependencies: ACCT-029a, ACCT-018

## Completion
When all stories are COMPLETE or BLOCKED:
1. Write QUEUE-COMPLETE.md with full results summary.
2. Output: LOOP_COMPLETE
