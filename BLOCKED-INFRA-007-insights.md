# BLOCKED — INFRA-007: Frappe Insights

**Error:** `bench get-app insights` failed during pip install.
`mysqlclient` dependency resolution failed — `insights` v3.2.0.dev0 depends on
`ibis-framework[mysql]` v11.0.0 which requires `mysqlclient` v2.2.8 that could
not be built in the container environment.

**Impact:** Insights not installed on poc-dev.sparkmojo.com. Non-blocking for
three-site topology — evaluation app only.

**Fix:** Either install system-level MySQL dev headers in the Frappe container,
or pin a compatible `ibis-framework` version.
