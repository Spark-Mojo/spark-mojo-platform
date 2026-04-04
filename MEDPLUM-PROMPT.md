# Research Run — Medplum Implementation Design

## Purpose
Design the complete Medplum self-hosted implementation. DECISION-020 locked
Medplum as the FHIR clinical data layer. DECISION-028 locked Option B
multi-tenancy (shared instance, one Project per client). This run produces
the implementation spec and STORY-014/015/016 fully written for Ralph to build.

## Context Files — Read in This Order
1. /Users/jamesilsley/GitHub/sparkmojo-internal/platform/AGENT_CONTEXT.md
2. /Users/jamesilsley/GitHub/sparkmojo-internal/platform/decisions/DECISION-020-medplum-fhir-clinical-layer.md
3. /Users/jamesilsley/GitHub/sparkmojo-internal/platform/decisions/DECISION-028-medplum-multi-tenancy.md
4. /Users/jamesilsley/GitHub/sparkmojo-internal/platform/decisions/DECISION-026-client-provisioning-architecture.md
5. /Users/jamesilsley/GitHub/sparkmojo-internal/platform/decisions/DECISION-025-single-provider-hipaa-by-default.md
6. /Users/jamesilsley/GitHub/sparkmojo-internal/platform/decisions/DECISION-021-frappe-container-image-strategy.md
7. /Users/jamesilsley/GitHub/sparkmojo-internal/platform/decisions/DECISION-004-multi-tenancy.md
8. /Users/jamesilsley/GitHub/sparkmojo-internal/platform/AGENT_CONTEXT.md
9. /Users/jamesilsley/GitHub/sparkmojo-internal/JAMES_PROJECT_PLAN.md
10. /Users/jamesilsley/GitHub/spark-mojo-platform/docker-compose.poc.yml (read actual file)
11. /Users/jamesilsley/GitHub/spark-mojo-platform/CLAUDE.md

## Key Facts
- Medplum runs as internal Docker service only — no public subdomain ever
- All external access via abstraction layer — React never calls Medplum directly
- One Medplum Project per client, created by provisioning API (PROV-001)
- medplum_project_id stored in SM Site Registry
- Every abstraction layer Medplum call must include projectId — this is immutable
- VPS: DigitalOcean, current container stack is in docker-compose.poc.yml
- HIPAA: DO BAA in progress (J-003). No PHI until BAA is signed.

## Completion
When all outputs are committed: output LOOP_COMPLETE
