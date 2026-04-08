"""
Tests for provisioning API routes.

Tests validation logic, template loading, and response models.
Docker exec and Frappe API calls are mocked since tests run without containers.
"""

import json
import os
import sys
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# Add parent dir to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient


TEST_ADMIN_KEY = "test-provisioning-key"


@pytest.fixture
def client():
    """Create a test client with mocked dependencies."""
    # Set env vars for test isolation
    os.environ["DEV_MODE"] = "true"
    os.environ["ADMIN_FRAPPE_URL"] = ""
    os.environ["MEDPLUM_BASE_URL"] = ""
    os.environ["N8N_BASE_URL"] = ""
    os.environ["ADMIN_SERVICE_KEY"] = TEST_ADMIN_KEY
    os.environ["PROVISIONING_TEMPLATE_DIR"] = os.path.join(
        os.path.dirname(__file__), "..", "provisioning", "templates"
    )

    # Update module-level variable so verify_admin_key picks it up
    import auth
    auth.ADMIN_SERVICE_KEY = TEST_ADMIN_KEY

    from main import app
    return TestClient(app, headers={"X-Admin-Key": TEST_ADMIN_KEY})


VALID_REQUEST = {
    "site_subdomain": "testsite",
    "site_type": "behavioral_health",
    "server_tier": "hipaa",
    "admin_password": "Test1234!",
    "display_name": "Test Practice",
    "timezone": "America/New_York",
}


def _mock_docker_exec_success(cmd, timeout=120):
    """Return a successful subprocess result with appropriate stdout."""
    result = MagicMock()
    result.returncode = 0
    result.stdout = ""
    result.stderr = ""
    # Provide realistic stdout for specific commands
    if "list-sites" in cmd:
        result.stdout = "testsite.sparkmojo.com\npoc-dev.sparkmojo.com\n"
    elif "list-apps" in cmd:
        result.stdout = "frappe\nerpnext\nhealthcare\nsm_widgets\n"
    elif "show-config" in cmd or "get-site-config" in cmd:
        result.stdout = '{"encryption_key": "abc123", "host_name": "https://testsite.app.sparkmojo.com"}'
    elif "setup_complete" in cmd:
        result.stdout = "1"
    elif "SM Task" in cmd:
        result.stdout = "[]"
    return result


class TestSiteCreateValidation:
    """Test pre-flight validation via Pydantic model."""

    def test_invalid_subdomain_special_chars(self, client):
        resp = client.post("/api/admin/sites/create", json={
            "site_subdomain": "bad site!",
            "site_type": "behavioral_health",
            "server_tier": "hipaa",
            "admin_password": "Test1234!",
            "display_name": "Test",
            "timezone": "America/New_York",
        })
        assert resp.status_code == 422

    def test_invalid_site_type(self, client):
        resp = client.post("/api/admin/sites/create", json={
            "site_subdomain": "test-valid",
            "site_type": "unknown_vertical",
            "server_tier": "hipaa",
            "admin_password": "Test1234!",
            "display_name": "Test",
            "timezone": "America/New_York",
        })
        assert resp.status_code == 422

    def test_invalid_server_tier(self, client):
        resp = client.post("/api/admin/sites/create", json={
            "site_subdomain": "test-valid",
            "site_type": "behavioral_health",
            "server_tier": "premium",
            "admin_password": "Test1234!",
            "display_name": "Test",
            "timezone": "America/New_York",
        })
        assert resp.status_code == 422

    def test_subdomain_too_long(self, client):
        resp = client.post("/api/admin/sites/create", json={
            "site_subdomain": "a" * 33,
            "site_type": "behavioral_health",
            "server_tier": "hipaa",
            "admin_password": "Test1234!",
            "display_name": "Test",
            "timezone": "America/New_York",
        })
        assert resp.status_code == 422

    def test_subdomain_starting_with_hyphen(self, client):
        resp = client.post("/api/admin/sites/create", json={
            "site_subdomain": "-invalid",
            "site_type": "behavioral_health",
            "server_tier": "hipaa",
            "admin_password": "Test1234!",
            "display_name": "Test",
            "timezone": "America/New_York",
        })
        assert resp.status_code == 422


class TestTemplateLoading:
    """Test vertical template loading."""

    def test_behavioral_health_template_exists(self):
        template_dir = os.path.join(
            os.path.dirname(__file__), "..", "provisioning", "templates"
        )
        assert os.path.exists(os.path.join(template_dir, "behavioral_health.yaml"))

    def test_general_smb_template_exists(self):
        template_dir = os.path.join(
            os.path.dirname(__file__), "..", "provisioning", "templates"
        )
        assert os.path.exists(os.path.join(template_dir, "general_smb.yaml"))

    def test_behavioral_health_template_content(self):
        import yaml
        template_dir = os.path.join(
            os.path.dirname(__file__), "..", "provisioning", "templates"
        )
        with open(os.path.join(template_dir, "behavioral_health.yaml")) as f:
            tmpl = yaml.safe_load(f)

        assert tmpl["bench_tier"] == "hipaa-health"
        assert "frappe" in tmpl["apps"]["core"]
        assert "erpnext" in tmpl["apps"]["core"]
        assert "healthcare" in tmpl["apps"]["default_on"]

    def test_general_smb_template_content(self):
        import yaml
        template_dir = os.path.join(
            os.path.dirname(__file__), "..", "provisioning", "templates"
        )
        with open(os.path.join(template_dir, "general_smb.yaml")) as f:
            tmpl = yaml.safe_load(f)

        assert tmpl["bench_tier"] == "standard-smb"
        assert "crm" in tmpl["apps"]["default_on"]


class TestListEndpoints:
    """Test GET endpoints return correct structure."""

    def test_list_sites_empty(self, client):
        resp = client.get("/api/admin/sites")
        assert resp.status_code == 200
        assert resp.json() == {"data": []}

    def test_list_benches_empty(self, client):
        resp = client.get("/api/admin/benches")
        assert resp.status_code == 200
        assert resp.json() == {"data": []}

    def test_get_site_not_configured(self, client):
        resp = client.get("/api/admin/sites/nonexistent")
        assert resp.status_code == 503


class TestProvisioningModels:
    """Test Pydantic models directly."""

    def test_valid_request(self):
        from routes.provisioning import SiteCreateRequest
        req = SiteCreateRequest(
            site_subdomain="willow",
            site_type="behavioral_health",
            server_tier="hipaa",
            admin_password="Test1234!",
            display_name="Willow Center",
            timezone="America/New_York",
        )
        assert req.site_subdomain == "willow"
        assert req.apps_override == []

    def test_subdomain_normalized_to_lowercase(self):
        from routes.provisioning import SiteCreateRequest
        req = SiteCreateRequest(
            site_subdomain="WILLOW",
            site_type="behavioral_health",
            server_tier="hipaa",
            admin_password="Test1234!",
            display_name="Willow Center",
            timezone="America/New_York",
        )
        assert req.site_subdomain == "willow"

    def test_response_model(self):
        from routes.provisioning import SiteCreateResponse
        resp = SiteCreateResponse(
            success=True,
            site_name="willow.sparkmojo.com",
            site_url="https://willow.app.sparkmojo.com",
            medplum_project_id="stub-abc12345",
            bench_name="hipaa-health-01",
            steps_completed=["preflight_validation"],
            steps_failed=[],
            warnings=["medplum_project_stub"],
            duration_seconds=1.5,
        )
        assert resp.success is True
        assert resp.bench_name == "hipaa-health-01"


class TestDockerExecHelper:
    """Test the _docker_exec helper."""

    @patch("routes.provisioning.subprocess.run")
    def test_docker_exec_success(self, mock_run):
        mock_run.return_value = MagicMock(returncode=0, stdout="ok", stderr="")
        from routes.provisioning import _docker_exec
        result = _docker_exec("bench list-sites")
        assert result.returncode == 0
        mock_run.assert_called_once()
        # Verify it wraps with docker exec
        call_args = mock_run.call_args
        assert "docker exec" in call_args[0][0]

    @patch("routes.provisioning.subprocess.run")
    def test_docker_exec_failure_logs(self, mock_run):
        mock_run.return_value = MagicMock(returncode=1, stdout="", stderr="error msg")
        from routes.provisioning import _docker_exec
        result = _docker_exec("bench bad-command")
        assert result.returncode == 1

    def test_admin_headers_with_keys(self):
        from routes.provisioning import _admin_headers
        with patch("routes.provisioning.ADMIN_API_KEY", "key1"), \
             patch("routes.provisioning.ADMIN_API_SECRET", "secret1"):
            headers = _admin_headers()
            assert headers["Authorization"] == "token key1:secret1"
            assert headers["Content-Type"] == "application/json"

    def test_admin_headers_without_keys(self):
        from routes.provisioning import _admin_headers
        with patch("routes.provisioning.ADMIN_API_KEY", ""), \
             patch("routes.provisioning.ADMIN_API_SECRET", ""):
            headers = _admin_headers()
            assert "Authorization" not in headers


class TestPreflightStep:
    """Test step_01_preflight."""

    @pytest.mark.anyio
    async def test_preflight_no_admin_url(self):
        from routes.provisioning import step_01_preflight, SiteCreateRequest
        with patch("routes.provisioning.ADMIN_FRAPPE_URL", ""):
            req = SiteCreateRequest(**VALID_REQUEST)
            result = await step_01_preflight(req)
            assert result["site_name"] == "testsite.sparkmojo.com"
            assert result["site_url"] == "https://testsite.app.sparkmojo.com"

    @pytest.mark.anyio
    async def test_preflight_site_exists_returns_409(self):
        from routes.provisioning import step_01_preflight, SiteCreateRequest
        from fastapi import HTTPException

        mock_resp = AsyncMock()
        mock_resp.status_code = 200

        with patch("routes.provisioning.ADMIN_FRAPPE_URL", "http://admin:8080"), \
             patch("httpx.AsyncClient") as MockClient:
            instance = AsyncMock()
            instance.get.return_value = mock_resp
            instance.__aenter__ = AsyncMock(return_value=instance)
            instance.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = instance

            req = SiteCreateRequest(**VALID_REQUEST)
            with pytest.raises(HTTPException) as exc_info:
                await step_01_preflight(req)
            assert exc_info.value.status_code == 409

    @pytest.mark.anyio
    async def test_preflight_site_not_found_passes(self):
        from routes.provisioning import step_01_preflight, SiteCreateRequest

        mock_resp = AsyncMock()
        mock_resp.status_code = 404

        with patch("routes.provisioning.ADMIN_FRAPPE_URL", "http://admin:8080"), \
             patch("httpx.AsyncClient") as MockClient:
            instance = AsyncMock()
            instance.get.return_value = mock_resp
            instance.__aenter__ = AsyncMock(return_value=instance)
            instance.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = instance

            req = SiteCreateRequest(**VALID_REQUEST)
            result = await step_01_preflight(req)
            assert result["site_name"] == "testsite.sparkmojo.com"


class TestTemplateLoadingStep:
    """Test step_02_load_template."""

    def test_load_behavioral_health(self):
        from routes.provisioning import step_02_load_template, SiteCreateRequest
        req = SiteCreateRequest(**VALID_REQUEST)
        result = step_02_load_template(req)
        assert result["bench_tier"] == "hipaa-health"
        assert "frappe" in result["core_apps"]
        assert "healthcare" in result["final_apps"]

    def test_load_general_smb(self):
        from routes.provisioning import step_02_load_template, SiteCreateRequest
        req_data = {**VALID_REQUEST, "site_type": "general_smb", "server_tier": "standard"}
        req = SiteCreateRequest(**req_data)
        result = step_02_load_template(req)
        assert result["bench_tier"] == "standard-smb"
        assert "crm" in result["final_apps"]

    def test_load_invalid_template_raises(self):
        from routes.provisioning import step_02_load_template, SiteCreateRequest
        from fastapi import HTTPException
        # Temporarily override VALID_SITE_TYPES to allow test
        with patch("routes.provisioning.VALID_SITE_TYPES", {"behavioral_health", "general_smb", "nonexistent"}):
            req_data = {**VALID_REQUEST, "site_type": "nonexistent"}
            req = SiteCreateRequest(**req_data)
            with pytest.raises(HTTPException) as exc_info:
                step_02_load_template(req)
            assert exc_info.value.status_code == 400

    def test_apps_override_adds_optional(self):
        from routes.provisioning import step_02_load_template, SiteCreateRequest
        req_data = {**VALID_REQUEST, "apps_override": ["helpdesk"]}
        req = SiteCreateRequest(**req_data)
        result = step_02_load_template(req)
        assert "helpdesk" in result["final_apps"]

    def test_apps_override_ignores_unknown(self):
        from routes.provisioning import step_02_load_template, SiteCreateRequest
        req_data = {**VALID_REQUEST, "apps_override": ["nonexistent_app"]}
        req = SiteCreateRequest(**req_data)
        result = step_02_load_template(req)
        assert "nonexistent_app" not in result["final_apps"]


class TestBenchSelection:
    """Test step_02_select_bench."""

    @pytest.mark.anyio
    async def test_bench_selection_dev_fallback(self):
        from routes.provisioning import step_02_select_bench
        with patch("routes.provisioning.ADMIN_FRAPPE_URL", ""):
            warnings = []
            result = await step_02_select_bench("hipaa-health", warnings)
            assert result["bench_name"] == "hipaa-health-01"
            assert len(warnings) == 0

    @pytest.mark.anyio
    async def test_bench_selection_no_bench_found(self):
        from routes.provisioning import step_02_select_bench
        from fastapi import HTTPException

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"data": []}

        with patch("routes.provisioning.ADMIN_FRAPPE_URL", "http://admin:8080"), \
             patch("httpx.AsyncClient") as MockClient:
            instance = AsyncMock()
            instance.get.return_value = mock_resp
            instance.__aenter__ = AsyncMock(return_value=instance)
            instance.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = instance

            with pytest.raises(HTTPException) as exc_info:
                await step_02_select_bench("hipaa-health", [])
            assert exc_info.value.status_code == 503

    @pytest.mark.anyio
    async def test_bench_selection_capacity_warning(self):
        from routes.provisioning import step_02_select_bench

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"data": [{
            "bench_name": "hipaa-health-01",
            "bench_host": "72.60.125.140",
            "active_site_count": 50,
            "capacity_threshold": 60,
        }]}

        with patch("routes.provisioning.ADMIN_FRAPPE_URL", "http://admin:8080"), \
             patch("httpx.AsyncClient") as MockClient:
            instance = AsyncMock()
            instance.get.return_value = mock_resp
            instance.__aenter__ = AsyncMock(return_value=instance)
            instance.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = instance

            warnings = []
            result = await step_02_select_bench("hipaa-health", warnings)
            assert result["bench_name"] == "hipaa-health-01"
            assert any("BENCH_CAPACITY_WARNING" in w for w in warnings)


class TestFrappeSiteSteps:
    """Test Docker exec-based provisioning steps."""

    @patch("routes.provisioning._docker_exec")
    def test_create_frappe_site_success(self, mock_exec):
        from routes.provisioning import step_03_create_frappe_site
        mock_exec.return_value = MagicMock(returncode=0, stderr="")
        step_03_create_frappe_site("test.sparkmojo.com", "Test1234!")
        mock_exec.assert_called_once()

    @patch("routes.provisioning._docker_exec")
    def test_create_frappe_site_failure(self, mock_exec):
        from routes.provisioning import step_03_create_frappe_site
        mock_exec.return_value = MagicMock(returncode=1, stderr="db error")
        with pytest.raises(RuntimeError, match="bench new-site failed"):
            step_03_create_frappe_site("test.sparkmojo.com", "Test1234!")

    @patch("routes.provisioning._docker_exec")
    def test_install_erpnext_success(self, mock_exec):
        from routes.provisioning import step_04_install_erpnext
        mock_exec.return_value = MagicMock(returncode=0, stderr="")
        step_04_install_erpnext("test.sparkmojo.com")

    @patch("routes.provisioning._docker_exec")
    def test_install_erpnext_failure(self, mock_exec):
        from routes.provisioning import step_04_install_erpnext
        mock_exec.return_value = MagicMock(returncode=1, stderr="app not found")
        with pytest.raises(RuntimeError, match="install erpnext failed"):
            step_04_install_erpnext("test.sparkmojo.com")

    @patch("routes.provisioning._docker_exec")
    def test_install_sm_apps_success(self, mock_exec):
        from routes.provisioning import step_05_install_sm_apps
        mock_exec.return_value = MagicMock(returncode=0, stderr="")
        step_05_install_sm_apps("test.sparkmojo.com")

    @patch("routes.provisioning._docker_exec")
    def test_install_sm_apps_failure(self, mock_exec):
        from routes.provisioning import step_05_install_sm_apps
        mock_exec.return_value = MagicMock(returncode=1, stderr="script not found")
        with pytest.raises(RuntimeError, match="register SM apps failed"):
            step_05_install_sm_apps("test.sparkmojo.com")

    @patch("routes.provisioning._docker_exec")
    def test_install_vertical_apps(self, mock_exec):
        from routes.provisioning import step_06_install_vertical_apps
        mock_exec.return_value = MagicMock(returncode=0, stderr="")
        step_06_install_vertical_apps(
            "test.sparkmojo.com",
            ["frappe", "erpnext", "healthcare", "sm_widgets"],
            ["frappe", "erpnext"],
        )
        # Should only install healthcare (skip core, erpnext, sm_ apps)
        assert mock_exec.call_count == 1

    @patch("routes.provisioning._docker_exec")
    def test_install_vertical_apps_failure(self, mock_exec):
        from routes.provisioning import step_06_install_vertical_apps
        mock_exec.return_value = MagicMock(returncode=1, stderr="install failed")
        with pytest.raises(RuntimeError, match="install healthcare failed"):
            step_06_install_vertical_apps(
                "test.sparkmojo.com",
                ["frappe", "erpnext", "healthcare"],
                ["frappe", "erpnext"],
            )


class TestConfigureAndVerify:
    """Test site configuration and verification steps."""

    @patch("routes.provisioning._docker_exec")
    def test_configure_site_hipaa(self, mock_exec):
        from routes.provisioning import step_07_configure_site
        mock_exec.return_value = MagicMock(returncode=0, stdout="", stderr="")
        step_07_configure_site("test.sparkmojo.com", "test", "behavioral_health", "hipaa")
        # Should call: set encryption_key, set developer_mode, set host_name, suppress setup wizard
        assert mock_exec.call_count == 4

    @patch("routes.provisioning._docker_exec")
    def test_configure_site_standard(self, mock_exec):
        from routes.provisioning import step_07_configure_site
        mock_exec.return_value = MagicMock(returncode=0, stdout="", stderr="")
        step_07_configure_site("test.sparkmojo.com", "test", "general_smb", "standard")
        # No encryption key for standard — 3 calls
        assert mock_exec.call_count == 3

    @patch("routes.provisioning._docker_exec")
    def test_configure_site_encryption_fails(self, mock_exec):
        from routes.provisioning import step_07_configure_site
        mock_exec.return_value = MagicMock(returncode=1, stderr="permission denied")
        with pytest.raises(RuntimeError, match="set encryption_key failed"):
            step_07_configure_site("test.sparkmojo.com", "test", "behavioral_health", "hipaa")

    @patch("routes.provisioning._docker_exec")
    def test_bench_migrate(self, mock_exec):
        from routes.provisioning import step_12_bench_migrate
        mock_exec.return_value = MagicMock(returncode=0, stderr="")
        step_12_bench_migrate("test.sparkmojo.com")

    @patch("routes.provisioning._docker_exec")
    def test_bench_migrate_failure(self, mock_exec):
        from routes.provisioning import step_12_bench_migrate
        mock_exec.return_value = MagicMock(returncode=1, stderr="migration error")
        with pytest.raises(RuntimeError, match="bench migrate failed"):
            step_12_bench_migrate("test.sparkmojo.com")

    def test_log_traefik(self):
        from routes.provisioning import step_11_log_traefik
        warnings = []
        step_11_log_traefik("testsite", warnings)
        assert len(warnings) == 2
        assert any("TRAEFIK" in w for w in warnings)
        assert "traefik_manual_step_required" in warnings

    @patch("routes.provisioning._docker_exec")
    def test_hipaa_verification_standard_skips(self, mock_exec):
        from routes.provisioning import step_13_hipaa_verification
        result = step_13_hipaa_verification("test.sparkmojo.com", "test", "standard", [], [])
        assert result is True
        mock_exec.assert_not_called()

    @patch("routes.provisioning._docker_exec")
    def test_hipaa_verification_checks_encryption(self, mock_exec):
        from routes.provisioning import step_13_hipaa_verification
        mock_exec.return_value = MagicMock(
            returncode=0, stdout='{"encryption_key": "abc123"}', stderr=""
        )
        steps_failed = []
        warnings = []
        result = step_13_hipaa_verification(
            "test.sparkmojo.com", "test", "hipaa", steps_failed, warnings
        )
        assert result is True
        assert len(warnings) == 2  # TLS check + manual checks

    @patch("routes.provisioning._docker_exec")
    def test_hipaa_verification_missing_encryption(self, mock_exec):
        from routes.provisioning import step_13_hipaa_verification
        mock_exec.return_value = MagicMock(returncode=0, stdout='{}', stderr="")
        steps_failed = []
        warnings = []
        result = step_13_hipaa_verification(
            "test.sparkmojo.com", "test", "hipaa", steps_failed, warnings
        )
        assert result is False
        assert any("encryption" in f for f in steps_failed)

    @patch("routes.provisioning._docker_exec")
    def test_smoke_test_all_pass(self, mock_exec):
        from routes.provisioning import step_14_smoke_test
        mock_exec.side_effect = _mock_docker_exec_success
        passed, failures = step_14_smoke_test("testsite.sparkmojo.com", "testsite")
        assert passed is True
        assert len(failures) == 0

    @patch("routes.provisioning._docker_exec")
    def test_smoke_test_site_missing(self, mock_exec):
        from routes.provisioning import step_14_smoke_test
        mock_exec.return_value = MagicMock(returncode=0, stdout="other.sparkmojo.com\n", stderr="")
        passed, failures = step_14_smoke_test("testsite.sparkmojo.com", "testsite")
        assert passed is False
        assert any("not found in bench list-sites" in f for f in failures)


class TestMedplumAndN8n:
    """Test Medplum and n8n stub/integration steps."""

    @pytest.mark.anyio
    async def test_medplum_stub_mode(self):
        """When MedplumClient is not configured, returns stub ID."""
        from routes.provisioning import step_08_create_medplum_project
        mock_client = MagicMock()
        mock_client.is_configured = False
        with patch("routes.provisioning.medplum_client", mock_client):
            warnings = []
            steps_completed = []
            steps_failed = []
            result = await step_08_create_medplum_project(
                "testsite", warnings, steps_completed, steps_failed
            )
            assert result.startswith("stub-")
            assert any("medplum_project_stub" in w for w in warnings)
            assert "create_medplum_project" not in steps_completed

    @pytest.mark.anyio
    async def test_medplum_real_call(self):
        """When MedplumClient is configured, calls create_project and returns real ID."""
        from routes.provisioning import step_08_create_medplum_project
        mock_client = MagicMock()
        mock_client.is_configured = True
        mock_client.create_project = AsyncMock(return_value={"id": "real-uuid-12345"})
        with patch("routes.provisioning.medplum_client", mock_client):
            warnings = []
            steps_completed = []
            steps_failed = []
            result = await step_08_create_medplum_project(
                "testsite", warnings, steps_completed, steps_failed
            )
            assert result == "real-uuid-12345"
            assert not result.startswith("stub-")
            assert "create_medplum_project" in steps_completed
            mock_client.create_project.assert_called_once_with("testsite")

    @pytest.mark.anyio
    async def test_medplum_configured_but_fails(self):
        """When MedplumClient is configured but create_project fails, falls back to stub."""
        from routes.provisioning import step_08_create_medplum_project
        mock_client = MagicMock()
        mock_client.is_configured = True
        mock_client.create_project = AsyncMock(side_effect=Exception("Connection refused"))
        with patch("routes.provisioning.medplum_client", mock_client):
            warnings = []
            steps_completed = []
            steps_failed = []
            result = await step_08_create_medplum_project(
                "testsite", warnings, steps_completed, steps_failed
            )
            assert result.startswith("stub-")
            assert "create_medplum_project" not in steps_completed
            assert any("create_medplum_project" in f for f in steps_failed)
            assert any("medplum_project_creation_failed" in w for w in warnings)

    @pytest.mark.anyio
    async def test_n8n_not_configured(self):
        from routes.provisioning import step_09_seed_n8n
        with patch("routes.provisioning.N8N_BASE_URL", ""):
            warnings = []
            result = await step_09_seed_n8n("testsite", "behavioral_health", warnings)
            assert result is None
            assert any("n8n_not_configured" in w for w in warnings)

    @pytest.mark.anyio
    async def test_n8n_workspace_created(self):
        from routes.provisioning import step_09_seed_n8n

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"id": "wf-123"}

        with patch("routes.provisioning.N8N_BASE_URL", "http://n8n:5678"), \
             patch("httpx.AsyncClient") as MockClient:
            instance = AsyncMock()
            instance.post.return_value = mock_resp
            instance.__aenter__ = AsyncMock(return_value=instance)
            instance.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = instance

            warnings = []
            result = await step_09_seed_n8n("testsite", "behavioral_health", warnings)
            assert result == "wf-123"

    @pytest.mark.anyio
    async def test_n8n_failure_adds_warning(self):
        from routes.provisioning import step_09_seed_n8n

        with patch("routes.provisioning.N8N_BASE_URL", "http://n8n:5678"), \
             patch("httpx.AsyncClient") as MockClient:
            instance = AsyncMock()
            instance.post.side_effect = Exception("connection refused")
            instance.__aenter__ = AsyncMock(return_value=instance)
            instance.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = instance

            warnings = []
            result = await step_09_seed_n8n("testsite", "behavioral_health", warnings)
            assert result is None
            assert any("n8n_workspace_failed" in w for w in warnings)

    @pytest.mark.anyio
    async def test_client_app_creation_success(self):
        """Step 8b: ClientApplication created successfully."""
        from routes.provisioning import step_08b_create_client_application
        mock_client = MagicMock()
        mock_client.is_configured = True
        mock_client.create_client_application = AsyncMock(
            return_value={"id": "app-uuid", "secret": "secret-value", "clientId": "app-uuid"}
        )
        with patch("routes.provisioning.medplum_client", mock_client):
            warnings = []
            steps_completed = []
            steps_failed = []
            result = await step_08b_create_client_application(
                "real-project-id", "testsite", warnings, steps_completed, steps_failed
            )
            assert result == "app-uuid"
            assert "create_client_application" in steps_completed
            assert len(steps_failed) == 0
            mock_client.create_client_application.assert_called_once_with(
                "real-project-id", "testsite-abstraction-layer"
            )

    @pytest.mark.anyio
    async def test_client_app_creation_failure(self):
        """Step 8b: ClientApplication creation fails, provisioning continues."""
        from routes.provisioning import step_08b_create_client_application
        mock_client = MagicMock()
        mock_client.is_configured = True
        mock_client.create_client_application = AsyncMock(side_effect=Exception("API error"))
        with patch("routes.provisioning.medplum_client", mock_client):
            warnings = []
            steps_completed = []
            steps_failed = []
            result = await step_08b_create_client_application(
                "real-project-id", "testsite", warnings, steps_completed, steps_failed
            )
            assert result is None
            assert "create_client_application" not in steps_completed
            assert any("create_client_application" in f for f in steps_failed)
            assert any("medplum_client_app_failed" in w for w in warnings)

    @pytest.mark.anyio
    async def test_client_app_skipped_stub_project(self):
        """Step 8b: Skipped when project is a stub."""
        from routes.provisioning import step_08b_create_client_application
        warnings = []
        steps_completed = []
        steps_failed = []
        result = await step_08b_create_client_application(
            "stub-abc12345", "testsite", warnings, steps_completed, steps_failed
        )
        assert result is None
        assert any("medplum_client_app_skipped" in w for w in warnings)
        assert len(steps_completed) == 0
        assert len(steps_failed) == 0

    @pytest.mark.anyio
    async def test_client_app_skipped_not_configured(self):
        """Step 8b: Skipped when Medplum is not configured."""
        from routes.provisioning import step_08b_create_client_application
        mock_client = MagicMock()
        mock_client.is_configured = False
        with patch("routes.provisioning.medplum_client", mock_client):
            warnings = []
            steps_completed = []
            steps_failed = []
            result = await step_08b_create_client_application(
                "real-project-id", "testsite", warnings, steps_completed, steps_failed
            )
            assert result is None


class TestSiteRegistration:
    """Test step_10_register_site."""

    @pytest.mark.anyio
    async def test_register_site_no_admin_url(self):
        from routes.provisioning import step_10_register_site, SiteCreateRequest
        with patch("routes.provisioning.ADMIN_FRAPPE_URL", ""):
            req = SiteCreateRequest(**VALID_REQUEST)
            # Should not raise — just skips
            await step_10_register_site(
                req, "test.sparkmojo.com", "https://test.app.sparkmojo.com",
                "hipaa-health-01", "72.60.125.140", "stub-123", None,
                ["frappe", "erpnext"], [],
            )

    @pytest.mark.anyio
    async def test_register_site_duplicate_409(self):
        from routes.provisioning import step_10_register_site, SiteCreateRequest
        from fastapi import HTTPException

        mock_resp = AsyncMock()
        mock_resp.status_code = 409
        mock_resp.raise_for_status = MagicMock()

        with patch("routes.provisioning.ADMIN_FRAPPE_URL", "http://admin:8080"), \
             patch("httpx.AsyncClient") as MockClient:
            instance = AsyncMock()
            instance.post.return_value = mock_resp
            instance.__aenter__ = AsyncMock(return_value=instance)
            instance.__aexit__ = AsyncMock(return_value=False)
            MockClient.return_value = instance

            req = SiteCreateRequest(**VALID_REQUEST)
            with pytest.raises(HTTPException) as exc_info:
                await step_10_register_site(
                    req, "test.sparkmojo.com", "https://test.app.sparkmojo.com",
                    "hipaa-health-01", "72.60.125.140", "stub-123", None,
                    ["frappe", "erpnext"], [],
                )
            assert exc_info.value.status_code == 409


class TestCreateSiteEndpoint:
    """Test the full POST /api/admin/sites/create endpoint with mocks."""

    @patch("routes.provisioning.step_14_smoke_test")
    @patch("routes.provisioning.step_13_hipaa_verification")
    @patch("routes.provisioning.step_12_bench_migrate")
    @patch("routes.provisioning.step_11_log_traefik")
    @patch("routes.provisioning.step_10_register_site", new_callable=AsyncMock)
    @patch("routes.provisioning.step_09_seed_n8n", new_callable=AsyncMock)
    @patch("routes.provisioning.step_08b_create_client_application", new_callable=AsyncMock)
    @patch("routes.provisioning.step_08_create_medplum_project", new_callable=AsyncMock)
    @patch("routes.provisioning.step_07_configure_site")
    @patch("routes.provisioning.step_06_install_vertical_apps")
    @patch("routes.provisioning.step_05_install_sm_apps")
    @patch("routes.provisioning.step_04_install_erpnext")
    @patch("routes.provisioning.step_03_create_frappe_site")
    @patch("routes.provisioning.step_02_select_bench", new_callable=AsyncMock)
    def test_full_provision_success(
        self, mock_bench, mock_create, mock_erp, mock_sm, mock_vert,
        mock_config, mock_medplum, mock_client_app, mock_n8n, mock_registry,
        mock_traefik, mock_migrate, mock_hipaa, mock_smoke, client,
    ):
        mock_bench.return_value = {"bench_name": "hipaa-health-01", "bench_host": "72.60.125.140"}
        mock_medplum.return_value = "stub-12345678"
        mock_client_app.return_value = None
        mock_n8n.return_value = None
        mock_hipaa.return_value = True
        mock_smoke.return_value = (True, [])

        resp = client.post("/api/admin/sites/create", json=VALID_REQUEST)
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["site_name"] == "testsite.sparkmojo.com"
        assert data["site_url"] == "https://testsite.app.sparkmojo.com"
        assert "preflight_validation" in data["steps_completed"]
        assert "load_template" in data["steps_completed"]

    @patch("routes.provisioning.step_14_smoke_test")
    @patch("routes.provisioning.step_13_hipaa_verification")
    @patch("routes.provisioning.step_12_bench_migrate")
    @patch("routes.provisioning.step_11_log_traefik")
    @patch("routes.provisioning.step_10_register_site", new_callable=AsyncMock)
    @patch("routes.provisioning.step_09_seed_n8n", new_callable=AsyncMock)
    @patch("routes.provisioning.step_08b_create_client_application", new_callable=AsyncMock)
    @patch("routes.provisioning.step_08_create_medplum_project", new_callable=AsyncMock)
    @patch("routes.provisioning.step_07_configure_site")
    @patch("routes.provisioning.step_06_install_vertical_apps")
    @patch("routes.provisioning.step_05_install_sm_apps")
    @patch("routes.provisioning.step_04_install_erpnext")
    @patch("routes.provisioning.step_03_create_frappe_site")
    @patch("routes.provisioning.step_02_select_bench", new_callable=AsyncMock)
    def test_provision_with_step_failures(
        self, mock_bench, mock_create, mock_erp, mock_sm, mock_vert,
        mock_config, mock_medplum, mock_client_app, mock_n8n, mock_registry,
        mock_traefik, mock_migrate, mock_hipaa, mock_smoke, client,
    ):
        mock_bench.return_value = {"bench_name": "hipaa-health-01", "bench_host": "72.60.125.140"}
        mock_erp.side_effect = RuntimeError("erpnext install failed")
        mock_medplum.return_value = "stub-12345678"
        mock_client_app.return_value = None
        mock_n8n.return_value = None
        mock_hipaa.return_value = True
        mock_smoke.return_value = (True, [])

        resp = client.post("/api/admin/sites/create", json=VALID_REQUEST)
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is False
        assert any("install_erpnext" in f for f in data["steps_failed"])
