# BLOCKED — INFRA-007: Frappe Drive

**Error:** `bench get-app drive` failed during pip install.
`pycrdt` v0.12.26 (dependency of drive v0.3.0) requires Rust/maturin to build
a native extension, which is not available in the Frappe container.

**Impact:** Drive not installed on poc-dev.sparkmojo.com. Non-blocking for
three-site topology — evaluation app only.

**Fix:** Either install Rust toolchain in the Frappe container, or use a
pre-built wheel for `pycrdt`.
