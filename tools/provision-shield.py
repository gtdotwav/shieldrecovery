#!/usr/bin/env python3
"""
Provision Shield Gateway partner account.

Creates everything needed for Shield to integrate with PagRecovery:
  - Partner profile (partner_profiles)
  - Partner user / login credentials (partner_users)
  - Global API key for v1 endpoints (api_keys)
  - Seller admin control (seller_admin_controls)
  - Partner tenant link (partner_tenants)

Usage:
  python tools/provision-shield.py
  python tools/provision-shield.py --webhook-url https://api.shield.com/webhooks/pagrecovery
  python tools/provision-shield.py --dry-run
"""

import argparse
import hashlib
import json
import os
import secrets
import sys
import time
from pathlib import Path
from uuid import uuid4

# Add tools dir to path for config import
sys.path.insert(0, str(Path(__file__).resolve().parent))
from config import SUPABASE_URL, SUPABASE_KEY

# ── Supabase REST client ──

import ssl
import urllib.request
import urllib.error

# Fix SSL certificate verification on macOS Python
try:
    import certifi
    _ssl_context = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    _ssl_context = ssl.create_default_context()
    _ssl_context.check_hostname = False
    _ssl_context.verify_mode = ssl.CERT_NONE


class SupabaseAdmin:
    """Minimal Supabase PostgREST admin client."""

    def __init__(self, url: str, key: str):
        self.url = url.rstrip("/")
        self.key = key
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

    def _request(self, method: str, table: str, data=None, params=""):
        url = f"{self.url}/rest/v1/{table}"
        if params:
            url += f"?{params}"

        body = json.dumps(data).encode() if data else None
        req = urllib.request.Request(url, data=body, headers=self.headers, method=method)

        try:
            with urllib.request.urlopen(req, context=_ssl_context) as resp:
                raw = resp.read().decode()
                return json.loads(raw) if raw.strip() else None
        except urllib.error.HTTPError as e:
            error_body = e.read().decode() if e.fp else ""
            raise RuntimeError(f"Supabase {method} {table} failed ({e.code}): {error_body}")

    def select(self, table: str, params: str):
        return self._request("GET", table, params=params)

    def upsert(self, table: str, data: dict, on_conflict: str = "id"):
        headers_backup = dict(self.headers)
        self.headers["Prefer"] = f"return=representation,resolution=merge-duplicates"
        try:
            result = self._request("POST", table, data=data)
        finally:
            self.headers = headers_backup
        return result

    def insert(self, table: str, data: dict):
        return self._request("POST", table, data=data)


# ── Password hashing (matches src/server/auth/passwords.ts) ──

def hash_password_scrypt(password: str) -> str:
    """Hash password with scrypt + random salt (matches hashPlatformPassword)."""
    salt = secrets.token_bytes(32)
    # Node.js scryptSync(password, salt, 64) uses default params: N=16384, r=8, p=1
    key = hashlib.scrypt(
        password.encode(),
        salt=salt,
        n=16384,
        r=8,
        p=1,
        dklen=64,
    )
    return f"{salt.hex()}:{key.hex()}"


# ── API Key generation (matches src/server/auth/api-keys.ts) ──

def generate_api_key():
    """Generate an API key matching the sk_live_ format."""
    import base64
    body = base64.urlsafe_b64encode(secrets.token_bytes(32)).rstrip(b"=").decode()
    raw_key = f"sk_live_{body}"
    prefix = body[:12]
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    return raw_key, prefix, key_hash


# ── HMAC Secret for postback verification ──

def generate_postback_secret():
    """Generate a 32-byte hex secret for HMAC postback signing."""
    return secrets.token_hex(32)


# ── Main provisioning ──

def provision(
    webhook_url: str = "",
    partner_email: str = "integracoes@shieldgateway.com",
    partner_password: str = "",
    seller_key: str = "shield",
    seller_name: str = "Shield Gateway",
    dry_run: bool = False,
):
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: SUPABASE_URL and SUPABASE_KEY must be set (via .env.local or env vars)")
        sys.exit(1)

    db = SupabaseAdmin(SUPABASE_URL, SUPABASE_KEY)

    # Generate all credentials
    if not partner_password:
        partner_password = f"Shield@{secrets.token_hex(4).upper()}!"

    password_hash = hash_password_scrypt(partner_password)
    api_key_raw, api_key_prefix, api_key_hash = generate_api_key()
    postback_secret = generate_postback_secret()
    partner_id = str(uuid4())
    tenant_id = str(uuid4())
    api_key_id = str(uuid4())
    user_id = str(uuid4())
    now = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())

    print("=" * 72)
    print("  PROVISIONING SHIELD GATEWAY — PAGRECOVERY PARTNER")
    print("=" * 72)
    print()

    # ── 1. Partner Profile ──
    partner_profile = {
        "id": partner_id,
        "name": seller_name,
        "slug": seller_key,
        "contact_email": partner_email,
        "contact_phone": "",
        "brand_accent": "#10b981",
        "brand_logo": "",
        "webhook_url": webhook_url,
        "active": True,
        "notes": f"Postback HMAC secret: {postback_secret}",
        "created_at": now,
        "updated_at": now,
    }
    print(f"  1. Partner Profile: {seller_name} ({seller_key})")
    print(f"     ID: {partner_id}")

    # ── 2. Partner User (portal login) ──
    partner_user = {
        "id": user_id,
        "partner_id": partner_id,
        "email": partner_email.lower(),
        "password_hash": password_hash,
        "display_name": seller_name,
        "active": True,
        "created_at": now,
        "updated_at": now,
    }
    print(f"  2. Partner User: {partner_email}")

    # ── 3. API Key (global, all sellers) ──
    api_key_record = {
        "id": api_key_id,
        "name": f"{seller_name} — API v1 (global)",
        "key_prefix": api_key_prefix,
        "key_hash": api_key_hash,
        "seller_key": None,  # Global access (all sellers)
        "role": "admin",
        "scopes": ["partner:ingest", "partner:v1:read", "partner:v1:write"],
        "rate_limit_per_minute": 120,
        "active": True,
        "expires_at": None,
        "last_used_at": None,
        "created_by_email": "system@pagrecovery.com",
        "created_at": now,
        "updated_at": now,
    }
    print(f"  3. API Key: sk_live_...{api_key_prefix[:6]}***")

    # ── 4. Seller Admin Controls ──
    seller_control = {
        "id": seller_key,
        "seller_key": seller_key,
        "seller_name": seller_name,
        "seller_email": partner_email,
        "active": True,
        "recovery_target_percent": 18,
        "max_assigned_leads": 100,
        "inbox_enabled": True,
        "automations_enabled": True,
        "autonomy_mode": "autonomous",
        "messaging_approach": "friendly",
        "gateway_slug": "partner",
        "notes": "Partner gateway — provisioned automatically",
        "updated_at": now,
    }
    print(f"  4. Seller Admin Controls: {seller_key}")

    # ── 5. Partner Tenant ──
    partner_tenant = {
        "id": tenant_id,
        "partner_id": partner_id,
        "tenant_key": seller_key,
        "tenant_name": seller_name,
        "tenant_email": partner_email,
        "gateway_slug": "partner",
        "active": True,
        "api_key_id": api_key_id,
        "metadata": json.dumps({"postback_secret": postback_secret}),
        "created_at": now,
        "updated_at": now,
    }
    print(f"  5. Partner Tenant: {seller_key} → {partner_id}")
    print()

    if dry_run:
        print("  [DRY RUN] No database changes made.")
        print()
    else:
        # Check for existing partner with same slug
        existing = db.select("partner_profiles", f"slug=eq.{seller_key}")
        if existing and len(existing) > 0:
            partner_id = existing[0]["id"]
            partner_profile["id"] = partner_id
            partner_user["partner_id"] = partner_id
            partner_tenant["partner_id"] = partner_id
            print(f"  ! Existing partner found (id={partner_id}), updating...")

        # Check for existing seller_admin_controls
        existing_control = db.select("seller_admin_controls", f"seller_key=eq.{seller_key}")
        if existing_control and len(existing_control) > 0:
            seller_control["id"] = existing_control[0]["id"]
            print(f"  ! Existing seller control found, updating...")

        # Check for existing user with same email
        existing_user = db.select("partner_users", f"email=eq.{partner_email.lower()}")
        if existing_user and len(existing_user) > 0:
            user_id = existing_user[0]["id"]
            partner_user["id"] = user_id
            print(f"  ! Existing user found (id={user_id}), updating...")

        print()
        print("  Writing to database...")

        db.upsert("partner_profiles", partner_profile, on_conflict="id")
        print("    ✓ partner_profiles")

        db.upsert("partner_users", partner_user, on_conflict="id")
        print("    ✓ partner_users")

        db.insert("api_keys", api_key_record)
        print("    ✓ api_keys")

        db.upsert("seller_admin_controls", seller_control, on_conflict="seller_key")
        print("    ✓ seller_admin_controls")

        db.upsert("partner_tenants", partner_tenant, on_conflict="id")
        print("    ✓ partner_tenants")

        print()
        print("  Database provisioned successfully.")

    # ── Output credentials ──
    print()
    print("=" * 72)
    print("  CREDENCIAIS SHIELD GATEWAY")
    print("=" * 72)
    print()
    print("  ┌─────────────────────────────────────────────────────────────────┐")
    print("  │  ACESSO AO PAINEL DO PARCEIRO                                  │")
    print("  ├─────────────────────────────────────────────────────────────────┤")
    print(f"  │  URL:    https://pagrecovery.com/partner/login                 │")
    print(f"  │  Email:  {partner_email:<52} │")
    print(f"  │  Senha:  {partner_password:<52} │")
    print("  └─────────────────────────────────────────────────────────────────┘")
    print()
    print("  ┌─────────────────────────────────────────────────────────────────┐")
    print("  │  API KEY (BEARER TOKEN)                                        │")
    print("  │  Usar em Authorization: Bearer <key>                           │")
    print("  ├─────────────────────────────────────────────────────────────────┤")
    print(f"  │  {api_key_raw}")
    print("  │                                                                 │")
    print("  │  Escopo: Global (todos os sellers)                              │")
    print("  │  Rate limit: 120 req/min                                        │")
    print("  │  Expiração: Sem expiração (revogar manualmente se necessário)   │")
    print("  │                                                                 │")
    print("  │  ⚠  ESTA CHAVE SÓ APARECE UMA VEZ. SALVE AGORA.               │")
    print("  └─────────────────────────────────────────────────────────────────┘")
    print()
    print("  ┌─────────────────────────────────────────────────────────────────┐")
    print("  │  POSTBACK HMAC SECRET                                          │")
    print("  │  Para verificar assinatura dos webhooks enviados pela           │")
    print("  │  PagRecovery → Shield                                          │")
    print("  ├─────────────────────────────────────────────────────────────────┤")
    print(f"  │  {postback_secret}")
    print("  │                                                                 │")
    print("  │  Header: X-PagRecovery-Signature                               │")
    print("  │  Algoritmo: HMAC-SHA256(body, secret).hex()                    │")
    print("  └─────────────────────────────────────────────────────────────────┘")
    print()
    print("  ┌─────────────────────────────────────────────────────────────────┐")
    print("  │  ENDPOINTS                                                      │")
    print("  ├─────────────────────────────────────────────────────────────────┤")
    print("  │                                                                 │")
    print("  │  INGEST (enviar pagamento falho):                               │")
    print("  │  POST https://pagrecovery.com/api/partner/ingest                │")
    print("  │                                                                 │")
    print("  │  API v1 (consultar dados):                                      │")
    print("  │  GET  /api/partner/v1/sellers                                   │")
    print("  │  GET  /api/partner/v1/sellers/{key}                             │")
    print("  │  GET  /api/partner/v1/sellers/{key}/leads                       │")
    print("  │  GET  /api/partner/v1/sellers/{key}/conversations               │")
    print("  │  GET  /api/partner/v1/sellers/{key}/conversations/{id}/messages │")
    print("  │  POST /api/partner/v1/sellers/{key}/conversations/{id}/reply    │")
    print("  │  GET  /api/partner/v1/sellers/{key}/qrcode                      │")
    print("  │                                                                 │")
    print("  │  POSTBACK (PagRecovery → Shield):                               │")
    if webhook_url:
        print(f"  │  URL: {webhook_url:<57} │")
    else:
        print("  │  URL: (não configurada — enviar para cadastro)              │")
    print("  │                                                                 │")
    print("  └─────────────────────────────────────────────────────────────────┘")
    print()
    print("  ┌─────────────────────────────────────────────────────────────────┐")
    print("  │  IDENTIFICADORES INTERNOS (CONTROLE PAGRECOVERY)               │")
    print("  ├─────────────────────────────────────────────────────────────────┤")
    print(f"  │  Partner ID:   {partner_id}            │")
    print(f"  │  Tenant ID:    {tenant_id}            │")
    print(f"  │  API Key ID:   {api_key_id}            │")
    print(f"  │  User ID:      {user_id}            │")
    print(f"  │  Seller Key:   {seller_key:<48} │")
    print(f"  │  Key Prefix:   {api_key_prefix:<48} │")
    print("  └─────────────────────────────────────────────────────────────────┘")
    print()

    # Save credentials to file for reference
    creds_file = Path(__file__).resolve().parent.parent / "docs" / "shield-credentials.json"
    creds = {
        "_warning": "CONFIDENTIAL — Do not commit to git",
        "_generated_at": now,
        "partner": {
            "id": partner_id,
            "name": seller_name,
            "slug": seller_key,
            "email": partner_email,
        },
        "portal_login": {
            "url": "https://pagrecovery.com/partner/login",
            "email": partner_email,
            "password": partner_password,
        },
        "api_key": {
            "id": api_key_id,
            "raw_key": api_key_raw,
            "prefix": api_key_prefix,
            "scopes": ["partner:ingest", "partner:v1:read", "partner:v1:write"],
            "rate_limit_per_minute": 120,
        },
        "postback": {
            "hmac_secret": postback_secret,
            "webhook_url": webhook_url or "(pending)",
            "algorithm": "HMAC-SHA256",
            "header": "X-PagRecovery-Signature",
        },
        "endpoints": {
            "base_url": "https://pagrecovery.com",
            "ingest": "POST /api/partner/ingest",
            "sellers": "GET /api/partner/v1/sellers",
            "seller_detail": "GET /api/partner/v1/sellers/{sellerKey}",
            "leads": "GET /api/partner/v1/sellers/{sellerKey}/leads",
            "conversations": "GET /api/partner/v1/sellers/{sellerKey}/conversations",
            "messages": "GET /api/partner/v1/sellers/{sellerKey}/conversations/{id}/messages",
            "reply": "POST /api/partner/v1/sellers/{sellerKey}/conversations/{id}/reply",
            "qrcode": "GET /api/partner/v1/sellers/{sellerKey}/qrcode",
        },
        "internal_ids": {
            "partner_id": partner_id,
            "tenant_id": tenant_id,
            "api_key_id": api_key_id,
            "user_id": user_id,
            "seller_key": seller_key,
        },
    }

    if not dry_run:
        creds_file.write_text(json.dumps(creds, indent=2, ensure_ascii=False))
        print(f"  Credenciais salvas em: {creds_file}")
        print()

    # Ensure credentials file is gitignored
    gitignore_path = Path(__file__).resolve().parent.parent / ".gitignore"
    if gitignore_path.exists():
        content = gitignore_path.read_text()
        if "shield-credentials.json" not in content:
            with open(gitignore_path, "a") as f:
                f.write("\n# Shield partner credentials (sensitive)\ndocs/shield-credentials.json\n")
            print("  Adicionado docs/shield-credentials.json ao .gitignore")
            print()

    print("=" * 72)
    print("  PROVISIONAMENTO CONCLUÍDO")
    print("=" * 72)
    print()
    print("  Próximos passos:")
    print("  1. Enviar docs/shield-api-completa.txt para a Shield")
    print("  2. Enviar API key e postback secret de forma segura")
    print("  3. Aguardar URL de postback da Shield para cadastrar")
    print("  4. Testar com: curl -H 'Authorization: Bearer <key>' \\")
    print("       https://pagrecovery.com/api/partner/v1/sellers")
    print()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Provision Shield Gateway partner account")
    parser.add_argument("--webhook-url", default="", help="Shield's postback URL (HTTPS)")
    parser.add_argument("--email", default="integracoes@shieldgateway.com", help="Partner email")
    parser.add_argument("--password", default="", help="Partner password (auto-generated if empty)")
    parser.add_argument("--seller-key", default="shield", help="Seller key (default: shield)")
    parser.add_argument("--seller-name", default="Shield Gateway", help="Display name")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing to DB")

    args = parser.parse_args()
    provision(
        webhook_url=args.webhook_url,
        partner_email=args.email,
        partner_password=args.password,
        seller_key=args.seller_key,
        seller_name=args.seller_name,
        dry_run=args.dry_run,
    )
