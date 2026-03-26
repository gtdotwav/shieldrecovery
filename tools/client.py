"""
Authenticated HTTP client for Shield Recovery API.
Creates session cookies directly via HMAC-SHA256 signing,
bypassing the Next.js Server Action login form.
"""

import base64
import hashlib
import hmac
import json
import time
from http.cookiejar import Cookie
from urllib.parse import urlparse

import requests

from config import AUTH_SECRET, WORKER_TOKEN, auth_credentials, base_url

SESSION_COOKIE_NAME = "pagrecovery_session"
SESSION_TTL_SECONDS = 60 * 60 * 24 * 7  # 7 days


def _to_base64url(data: bytes) -> str:
    """Base64url encode without padding (matches JS toBase64Url)."""
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _sign_value(value: str, secret: str) -> str:
    """HMAC-SHA256 sign, return base64url (matches JS signValue)."""
    sig = hmac.new(secret.encode(), value.encode(), hashlib.sha256).digest()
    return _to_base64url(sig)


def create_session_token(email: str, role: str = "admin") -> str:
    """Replicate createSessionToken from src/server/auth/core.ts."""
    if not AUTH_SECRET:
        raise RuntimeError("PLATFORM_AUTH_SECRET not set — cannot create session token")

    payload = {
        "sub": email.strip().lower(),
        "role": role,
        "exp": int(time.time() * 1000) + SESSION_TTL_SECONDS * 1000,  # JS Date.now() is ms
    }

    payload_b64 = _to_base64url(json.dumps(payload, separators=(",", ":")).encode())
    signature = _sign_value(payload_b64, AUTH_SECRET)
    return f"{payload_b64}.{signature}"


class ShieldClient:
    """HTTP client with automatic session management."""

    def __init__(self, target: str = "local"):
        self.target = target
        self.url = base_url(target)
        self.email, self.password = auth_credentials(target)
        self.session = requests.Session()
        self._logged_in = False

    def login(self) -> bool:
        """Create a session cookie directly via HMAC-SHA256 signing."""
        try:
            token = create_session_token(self.email, "admin")
        except RuntimeError as e:
            print(f"  Auth error: {e}")
            return False

        # Set the cookie on the session
        parsed = urlparse(self.url)
        self.session.cookies.set(
            SESSION_COOKIE_NAME,
            token,
            domain=parsed.hostname,
            path="/",
        )
        self._logged_in = True
        print(f"  Authenticated as {self.email} (direct token)")
        return True

    def _ensure_auth(self):
        if not self._logged_in:
            self.login()

    # ── Convenience methods ──

    def get(self, path: str, **kw) -> requests.Response:
        self._ensure_auth()
        return self.session.get(f"{self.url}{path}", **kw)

    def post(self, path: str, **kw) -> requests.Response:
        self._ensure_auth()
        return self.session.post(f"{self.url}{path}", **kw)

    def get_json(self, path: str, **kw):
        r = self.get(path, **kw)
        r.raise_for_status()
        return r.json()

    def post_json(self, path: str, payload: dict, **kw):
        r = self.post(path, json=payload, **kw)
        r.raise_for_status()
        return r.json()

    # ── API shortcuts ──

    def health(self) -> dict:
        return self.get_json("/api/health")

    def analytics(self) -> dict:
        return self.get_json("/api/analytics/recovery")

    def contacts(self) -> dict:
        return self.get_json("/api/followups/contacts")

    def settings(self) -> dict:
        return self.get_json("/api/settings/connections")

    def run_worker(self, limit: int = 60, concurrency: int = 4) -> dict:
        return self.get_json(
            "/api/worker/run",
            params={"limit": limit, "concurrency": concurrency},
            headers={"Authorization": f"Bearer {WORKER_TOKEN}"},
        )

    def send_webhook(self, payload: dict, seller_key: str | None = None) -> dict:
        """Send a raw webhook payload (no HMAC — for quick testing via API route)."""
        path = "/api/webhooks/shield-gateway"
        if seller_key:
            path += f"/{seller_key}"
        return self.post_json(path, payload)

    def import_payment(self, payload: dict) -> dict:
        return self.post_json("/api/import", payload)
