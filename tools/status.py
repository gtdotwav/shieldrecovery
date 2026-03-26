#!/usr/bin/env python3
"""
status.py — Quick overview of all white-label deployments.

Usage:
    python tools/status.py
"""

from client import ShieldClient
from config import TARGETS


def main():
    print(f"\n  Shield Recovery — Deployment Status")
    print(f"  {'─' * 55}\n")

    for name, cfg in TARGETS.items():
        url = cfg["url"]
        email = cfg["email"]

        print(f"  {name.upper():14s} {url}")

        client = ShieldClient(name)
        try:
            client.login()
        except Exception as e:
            print(f"  {'':14s} AUTH: FAIL ({e})\n")
            continue

        # Health endpoint (no auth required for basic reachability)
        try:
            r = client.session.get(f"{url}/api/health", timeout=10)
            if r.status_code == 200:
                data = r.json()
                print(f"  {'':14s} HEALTH: OK  {data}")
            elif r.status_code == 401:
                print(f"  {'':14s} HEALTH: 401 (secret mismatch — deployment has different PLATFORM_AUTH_SECRET)")
            else:
                print(f"  {'':14s} HEALTH: {r.status_code}")
        except Exception as e:
            print(f"  {'':14s} HEALTH: UNREACHABLE ({e})")

        # Webhook health (no auth)
        try:
            r = client.session.get(f"{url}/api/webhooks/shield-gateway", timeout=10)
            if r.status_code == 200:
                print(f"  {'':14s} WEBHOOK: OK")
            else:
                print(f"  {'':14s} WEBHOOK: {r.status_code}")
        except Exception as e:
            print(f"  {'':14s} WEBHOOK: UNREACHABLE")

        print()

    print(f"  {'─' * 55}")
    print(f"  Tip: use --target <name> on any tool to target a specific deployment")
    print(f"  Targets: {', '.join(TARGETS.keys())}\n")


if __name__ == "__main__":
    main()
