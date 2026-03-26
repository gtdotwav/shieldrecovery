#!/usr/bin/env python3
"""
healthcheck.py — Validate all Shield Recovery endpoints and integrations.

Usage:
    python tools/healthcheck.py          # check local
    python tools/healthcheck.py --prod   # check production
"""

import argparse
import sys
import time

from client import ShieldClient
from config import add_target_arg, get_target


def check(label: str, fn, critical: bool = False) -> bool:
    """Run a check and print result."""
    try:
        result = fn()
        ok = result if isinstance(result, bool) else True
        symbol = "PASS" if ok else "WARN"
        detail = ""
        if isinstance(result, dict):
            detail = f"  {result}" if len(str(result)) < 120 else ""
        elif isinstance(result, str):
            detail = f"  {result}"
        print(f"  {'PASS' if ok else 'WARN':5s} {label}{detail}")
        return ok
    except Exception as e:
        symbol = "FAIL" if critical else "WARN"
        print(f"  {symbol:5s} {label}  ({e})")
        return False


def main():
    parser = argparse.ArgumentParser(description="Health check for Shield Recovery")
    add_target_arg(parser)
    args = parser.parse_args()

    target = get_target(args)
    client = ShieldClient(target)

    print(f"\n  Shield Recovery Health Check")
    print(f"  Target: {client.url}")
    print(f"  {'─' * 50}\n")

    results = []
    start = time.time()

    # ── Auth ──
    print("  AUTH")
    results.append(check("Login", lambda: client.login(), critical=True))

    # ── Core endpoints ──
    print("\n  ENDPOINTS")
    results.append(check("GET /api/health", lambda: client.health(), critical=True))
    results.append(check("GET /api/analytics/recovery", lambda: client.analytics()))
    results.append(check("GET /api/followups/contacts", lambda: client.contacts()))
    results.append(check("GET /api/settings/connections", lambda: client.settings()))

    # ── Webhooks (GET = health check) ──
    print("\n  WEBHOOKS")
    results.append(check("GET /api/webhooks/shield-gateway", lambda: client.session.get(f"{client.url}/api/webhooks/shield-gateway").json()))
    results.append(check("GET /api/webhooks/pagouai", lambda: client.session.get(f"{client.url}/api/webhooks/pagouai").json()))

    # ── Analytics deep check ──
    print("\n  DATA")
    try:
        a = client.analytics()
        c = client.contacts()
        contacts_list = c.get("contacts", c) if isinstance(c, dict) else c
        total_contacts = len(contacts_list) if isinstance(contacts_list, list) else c.get("total", "?")
        print(f"  INFO  Pagamentos falhados: {a.get('total_failed_payments', '?')}")
        print(f"  INFO  Recuperados: {a.get('recovered_payments', '?')}")
        print(f"  INFO  Taxa: {a.get('recovery_rate', 0):.1f}%")
        print(f"  INFO  Receita recuperada: R$ {a.get('recovered_revenue', 0):,.2f}")
        print(f"  INFO  Contatos: {total_contacts}")
        print(f"  INFO  Recuperacoes ativas: {a.get('active_recoveries', '?')}")
    except Exception as e:
        print(f"  WARN  Could not read analytics: {e}")

    # ── Integrations ──
    print("\n  INTEGRATIONS")
    try:
        s = client.settings()
        integrations = [
            ("Database", s.get("databaseConfigured", False)),
            ("WhatsApp", s.get("whatsappConfigured", False)),
            ("Email", s.get("emailConfigured", False)),
            ("CRM", s.get("crmConfigured", False)),
            ("AI", s.get("aiConfigured", False)),
            ("Worker", s.get("workerConfigured", False)),
        ]
        for name, configured in integrations:
            status = "ON " if configured else "OFF"
            print(f"  {status:5s} {name}")
    except Exception as e:
        print(f"  WARN  Could not read settings: {e}")

    # ── Summary ──
    elapsed = time.time() - start
    passed = sum(results)
    total = len(results)
    failed = total - passed

    print(f"\n  {'─' * 50}")
    print(f"  {passed}/{total} passed, {failed} failed  ({elapsed:.1f}s)")

    if failed > 0:
        print(f"  STATUS: DEGRADED\n")
        sys.exit(1)
    else:
        print(f"  STATUS: HEALTHY\n")


if __name__ == "__main__":
    main()
