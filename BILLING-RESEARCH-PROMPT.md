# Research Run — DECISION-027: Billing Architecture

## Purpose
Comprehensive billing research. Produces workflow analysis, integration
architecture, AI tier model, payment processing analysis, credentialing
automation analysis, DECISION-027 draft, BILL-001 through BILL-004 story specs,
and an internal review PPT deck.

## Context Files — Read in This Order
1. /Users/jamesilsley/GitHub/sparkmojo-internal/platform/AGENT_CONTEXT.md
2. /Users/jamesilsley/GitHub/sparkmojo-internal/platform/decisions/DECISION-011-stedi-clearinghouse-connector.md
3. /Users/jamesilsley/GitHub/sparkmojo-internal/platform/decisions/DECISION-020-medplum-fhir-clinical-layer.md
4. /Users/jamesilsley/GitHub/sparkmojo-internal/platform/decisions/DECISION-026-client-provisioning-architecture.md
5. /Users/jamesilsley/GitHub/sparkmojo-internal/JAMES_PROJECT_PLAN.md
6. /Users/jamesilsley/GitHub/sparkmojo-internal/platform/prd/pilot-mental-health/PILOT_REQUIREMENTS.md

## Key Facts
- Clearinghouse: Stedi (signed, non-negotiable)
- AI platform: AWS Bedrock (BAA covers all models, pay-per-token, multi-tier model wanted)
- Pilot client 1 (Willow Center): ~30 clinicians, ~3,000 sessions/month, on billing company
- Pilot client 2 (Artemis Counseling): ~25% of Willow volume, in-house billing, higher per-claim reimbursement
- Value prop varies: cost savings (billing company clients) vs staff repurposing (in-house billing clients)
- Credentialing: previously assumed human-only — challenge this assumption thoroughly
- Sizing charts must be GENERIC across practice sizes, not client-specific

## Completion
When all outputs are committed: output LOOP_COMPLETE
