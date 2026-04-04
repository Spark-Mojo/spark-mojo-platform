# Session 20 Overnight Task Queue

## Stories

**BILL-001** — sm_billing Frappe app scaffold
Type: Frappe app structure
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/BILL-001-sm-billing-app-scaffold.md
Branch: story/bill-001-sm-billing-scaffold

**STORY-014** — Medplum Docker services
Type: Docker Compose config
Spec: /Users/jamesilsley/GitHub/sparkmojo-internal/platform/feature-library/stories/STORY-014-medplum-docker-service.md
Branch: story/story-014-medplum-docker

## Rules

- Both stories run in parallel via separate hats
- BILL-001 has zero dependencies on STORY-014 and vice versa
- Do not deploy to VPS in either story
- Do not modify existing Docker services
- Write BLOCKED-[STORY].md if any architectural ambiguity arises
