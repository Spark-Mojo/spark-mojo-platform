#!/usr/bin/env bash
set -euo pipefail
STORY_ID="${1:?Usage: verify-billing-fixture.sh STORY-NNN}"
FIXTURE="platform/feature-library/stories/${STORY_ID}/billing-fixture.json"

test -f "$FIXTURE" || { echo "FAIL: missing $FIXTURE"; exit 1; }

jq -e '.' "$FIXTURE" >/dev/null 2>&1 || { echo "FAIL: invalid JSON $FIXTURE"; exit 1; }

jq -e 'length >= 1' "$FIXTURE" >/dev/null || { echo "FAIL: fixture empty"; exit 1; }

jq -e '.[] | select(.sm_action_id == "mojo_access")' "$FIXTURE" >/dev/null \
  || { echo "FAIL: no mojo_access record in $FIXTURE"; exit 1; }

jq -e '.[] | select((.sm_mojo_id == null) or (.sm_billing_type == null) or (.sm_invoice_line_label == null))' \
  "$FIXTURE" >/dev/null 2>&1 \
  && { echo "FAIL: one or more records missing required fields (sm_mojo_id, sm_billing_type, sm_invoice_line_label) in $FIXTURE"; exit 1; }

VALID_TYPES='["flat_monthly","always_billed","metered_overage","included","one_time_implementation","one_time_enhancement"]'
jq -e --argjson valid "$VALID_TYPES" '[.[] | .sm_billing_type] | all(. as $t | $valid | index($t))' \
  "$FIXTURE" >/dev/null \
  || { echo "FAIL: unknown sm_billing_type value in $FIXTURE"; exit 1; }

echo "PASS: $FIXTURE"
