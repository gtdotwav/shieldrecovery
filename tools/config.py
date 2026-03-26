"""
Shared configuration for all Shield Recovery tools.
Reads from .env.local or environment variables.

White-label aware: one codebase, multiple deployments.
Targets: "local", "pagrecovery", "shield", or any custom slug.
"""

import os
from pathlib import Path

# ── Load .env.local ──
_env_path = Path(__file__).resolve().parent.parent / ".env.local"
if _env_path.exists():
    for line in _env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'").rstrip("\\n")
        if key not in os.environ:
            os.environ[key] = value

# ── Shared secrets (same codebase) ──
AUTH_SECRET = os.getenv("PLATFORM_AUTH_SECRET", "")
WEBHOOK_SECRET = os.getenv("SHIELD_GATEWAY_WEBHOOK_SECRET", "shield_preview_secret")
WORKER_TOKEN = os.getenv("WORKER_AUTH_TOKEN", "")
CRON_SECRET = os.getenv("CRON_SECRET", "")
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# ── White-label deployment registry ──
# Each target maps to: (url, email, password)
# Env overrides: <SLUG>_URL, <SLUG>_AUTH_EMAIL, <SLUG>_AUTH_PASSWORD
TARGETS = {
    "local": {
        "url": os.getenv("LOCAL_URL", "http://localhost:3000"),
        "email": os.getenv("PLATFORM_AUTH_EMAIL", "admin@pagrecovery.local"),
        "password": os.getenv("PLATFORM_AUTH_PASSWORD", "pagrecoveryadmin"),
    },
    "pagrecovery": {
        "url": os.getenv("PAGRECOVERY_URL", "https://pagrecovery.vercel.app"),
        "email": os.getenv("PAGRECOVERY_AUTH_EMAIL", os.getenv("PLATFORM_AUTH_EMAIL", "admin@pagrecovery.local")),
        "password": os.getenv("PAGRECOVERY_AUTH_PASSWORD", os.getenv("PLATFORM_AUTH_PASSWORD", "pagrecoveryadmin")),
    },
    "shield": {
        "url": os.getenv("SHIELD_URL", "https://shield-recovery.vercel.app"),
        "email": os.getenv("SHIELD_AUTH_EMAIL", "admin@shieldrecovery.local"),
        "password": os.getenv("SHIELD_AUTH_PASSWORD", "ShieldAdmin@2026!"),
    },
}

DEFAULT_TARGET = "local"


def resolve_target(target: str | None = None) -> dict:
    """Get config for a target. Falls back to local."""
    t = target or DEFAULT_TARGET
    # Support "prod" as alias for "pagrecovery"
    if t == "prod":
        t = "pagrecovery"
    return TARGETS.get(t, TARGETS["local"])


def base_url(target: str | None = None) -> str:
    return resolve_target(target)["url"]


def auth_credentials(target: str | None = None) -> tuple[str, str]:
    cfg = resolve_target(target)
    return cfg["email"], cfg["password"]


def add_target_arg(parser) -> None:
    """Add --target and --prod flags to an argparse parser."""
    parser.add_argument(
        "--target", "-t",
        default="local",
        help="Deployment target: local, pagrecovery, shield (default: local)",
    )
    parser.add_argument(
        "--prod", action="store_true",
        help="Shortcut for --target pagrecovery",
    )


def get_target(args) -> str:
    """Resolve target from parsed args (--prod overrides --target)."""
    return "prod" if args.prod else args.target
