#!/usr/bin/env python3
"""
cli.py — Unified CLI for Shield Recovery operations.

Usage:
    python tools/cli.py status                          # all deployments
    python tools/cli.py health                          # healthcheck (local)
    python tools/cli.py health --target pagrecovery     # healthcheck (prod)
    python tools/cli.py report --target pagrecovery     # recovery report
    python tools/cli.py report --csv --out data/r.csv   # CSV export
    python tools/cli.py simulate --count 5 --full       # 5 events + process + analytics
    python tools/cli.py seed --count 30                 # seed 30 demo events
    python tools/cli.py worker                          # run worker once
    python tools/cli.py worker --loop                   # run worker continuously
"""

import sys


COMMANDS = {
    "status":    ("status",      "Deployment overview"),
    "health":    ("healthcheck", "Endpoint health check"),
    "report":    ("report",      "Recovery performance report"),
    "simulate":  ("simulate",    "Simulate payment events"),
    "seed":      ("seed",        "Seed demo data"),
    "worker":    ("worker",      "Run background worker"),
}


def print_help():
    print("\n  Shield Recovery CLI")
    print(f"  {'─' * 45}\n")
    for cmd, (_, desc) in COMMANDS.items():
        print(f"  {cmd:12s} {desc}")
    print(f"\n  Global flags: --target <local|pagrecovery|shield>  --prod")
    print(f"  Run 'python tools/cli.py <command> --help' for command-specific help\n")


def main():
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help", "help"):
        print_help()
        sys.exit(0)

    cmd = sys.argv[1]
    if cmd not in COMMANDS:
        print(f"\n  Unknown command: {cmd}")
        print_help()
        sys.exit(1)

    module_name = COMMANDS[cmd][0]

    # Remove the command name from argv so the sub-module sees clean args
    sys.argv = [sys.argv[0]] + sys.argv[2:]

    # Import and run the module's main()
    module = __import__(module_name)
    module.main()


if __name__ == "__main__":
    main()
