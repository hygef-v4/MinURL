from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# ──────────────────────────────────────────────────────────────
# Mock Supabase Chained Query Builder Helper
# ──────────────────────────────────────────────────────────────
class MockSupabaseQuery:
    def __init__(self):
        self._select_data = []
        self._insert_data = []
        self._update_data = []
        self._delete_data = []
        self._last_op = None

    def select(self, *args, **kwargs):
        self._last_op = "select"
        return self

    def insert(self, *args, **kwargs):
        self._last_op = "insert"
        return self

    def update(self, *args, **kwargs):
        self._last_op = "update"
        return self

    def delete(self, *args, **kwargs):
        self._last_op = "delete"
        return self

    def eq(self, *args, **kwargs):
        return self

    def order(self, *args, **kwargs):
        return self

    def limit(self, *args, **kwargs):
        return self

    def execute(self):
        mock_res = MagicMock()
        if self._last_op == "select":
            mock_res.data = self._select_data
        elif self._last_op == "insert":
            mock_res.data = self._insert_data
        elif self._last_op == "update":
            mock_res.data = self._update_data
        elif self._last_op == "delete":
            mock_res.data = self._delete_data
        else:
            mock_res.data = []
        return mock_res


# ──────────────────────────────────────────────────────────────
# 1. Health Check Test
# ──────────────────────────────────────────────────────────────
def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "message": "API is healthy"}


# ──────────────────────────────────────────────────────────────
# 2. Shorten URL Tests
# ──────────────────────────────────────────────────────────────
@patch("app.routes.supabase")
@patch("app.routes.check_url_safety")
def test_shorten_url_success(mock_safety, mock_supabase):
    # Mock URL safety check
    mock_safety.return_value = True

    # Setup database query mock
    query = MockSupabaseQuery()
    query._insert_data = [{"id": 12345, "long_url": "https://google.com"}]
    query._update_data = [{"id": 12345, "short_code": "dnh", "long_url": "https://google.com"}]
    mock_supabase.table.return_value = query

    response = client.post(
        "/api/v1/shorten",
        json={"long_url": "https://google.com"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "short_code" in data
    assert "short_url" in data
    assert "qr_code_url" in data
    assert data["long_url"] == "https://google.com/"


@patch("app.routes.supabase")
@patch("app.routes.check_url_safety")
def test_shorten_url_custom_alias_success(mock_safety, mock_supabase):
    mock_safety.return_value = True

    # Setup database query mock
    query = MockSupabaseQuery()
    query._select_data = []  # No conflict
    query._insert_data = [{"id": 100, "short_code": "my-custom-link", "long_url": "https://google.com"}]
    mock_supabase.table.return_value = query

    response = client.post(
        "/api/v1/shorten",
        json={"long_url": "https://google.com", "custom_alias": "my-custom-link"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["short_code"] == "my-custom-link"
    assert data["long_url"] == "https://google.com/"


@patch("app.routes.supabase")
@patch("app.routes.check_url_safety")
def test_shorten_url_custom_alias_conflict(mock_safety, mock_supabase):
    mock_safety.return_value = True

    # Setup database query mock
    query = MockSupabaseQuery()
    query._select_data = [{"id": 100}]  # Conflict exists
    mock_supabase.table.return_value = query

    response = client.post(
        "/api/v1/shorten",
        json={"long_url": "https://google.com", "custom_alias": "my-custom-link"}
    )

    assert response.status_code == 409
    assert "already in use" in response.json()["detail"]


@patch("app.routes.check_url_safety")
def test_shorten_url_custom_alias_invalid(mock_safety):
    mock_safety.return_value = True

    response = client.post(
        "/api/v1/shorten",
        json={"long_url": "https://google.com", "custom_alias": "invalid alias!"}
    )
    assert response.status_code == 400
    assert "Alias can only contain" in response.json()["detail"]


@patch("app.routes.check_url_safety")
def test_shorten_url_unsafe(mock_safety):
    # Mock URL safety check as unsafe (False)
    mock_safety.return_value = False

    response = client.post(
        "/api/v1/shorten",
        json={"long_url": "https://malicious.com"}
    )
    assert response.status_code == 400
    assert "unsafe" in response.json()["detail"]


# ──────────────────────────────────────────────────────────────
# 3. Redirect Tests
# ──────────────────────────────────────────────────────────────
@patch("app.routes.supabase")
@patch("app.routes._log_click")
def test_redirect_url_success(mock_log_click, mock_supabase):
    query = MockSupabaseQuery()
    query._select_data = [{"id": 12345, "long_url": "https://example.com"}]
    mock_supabase.table.return_value = query

    # We use follow_redirects=False to inspect the 301 status code and Location header
    response = client.get("/dnh", follow_redirects=False)
    assert response.status_code == 301
    assert response.headers["location"] == "https://example.com"


@patch("app.routes.supabase")
def test_redirect_url_not_found(mock_supabase):
    query = MockSupabaseQuery()
    query._select_data = []  # Empty results
    mock_supabase.table.return_value = query

    response = client.get("/notfound", follow_redirects=False)
    assert response.status_code == 404


# ──────────────────────────────────────────────────────────────
# 4. QR Code Generator Test
# ──────────────────────────────────────────────────────────────
@patch("app.routes.supabase")
def test_qrcode_generation_success(mock_supabase):
    query = MockSupabaseQuery()
    query._select_data = [{"id": 12345}]
    mock_supabase.table.return_value = query

    response = client.get("/api/v1/qrcode/dnh")
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    # Basic check to see if PNG binary is returned
    assert response.content.startswith(b"\x89PNG")


# ──────────────────────────────────────────────────────────────
# 5. Developer API Keys Tests
# ──────────────────────────────────────────────────────────────
@patch("app.routes.supabase")
@patch("app.auth.supabase")
def test_api_key_endpoints(mock_auth_supabase, mock_routes_supabase):
    # Mock user session verification in auth
    mock_user = MagicMock()
    mock_user.user.id = "user-uuid-123"
    mock_auth_supabase.auth.get_user.return_value = mock_user

    # Setup database query mock for routes
    query = MockSupabaseQuery()
    query._insert_data = [{
        "id": 1,
        "key_value": "minurl_testkey123",
        "name": "My App Key",
        "is_active": True,
        "created_at": "2026-06-12T12:00:00Z"
    }]
    query._select_data = [{
        "id": 1,
        "key_value": "minurl_testkey123",
        "name": "My App Key",
        "is_active": True,
        "created_at": "2026-06-12T12:00:00Z"
    }]
    mock_routes_supabase.table.return_value = query

    # 1. Test POST /api/v1/api-keys
    headers = {"Authorization": "Bearer fake_token"}
    response = client.post(
        "/api/v1/api-keys",
        json={"name": "My App Key"},
        headers=headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["key_value"].startswith("minurl_")
    assert data["name"] == "My App Key"

    # 2. Test GET /api/v1/api-keys
    response = client.get("/api/v1/api-keys", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "My App Key"
