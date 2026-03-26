#!/usr/bin/env python3
"""
worker.py — Trigger and monitor the background job worker.

Usage:
    python tools/worker.py                   # run once (local)
    python tools/worker.py --loop            # run continuously every 10s
    python tools/worker.py --loop --interval 5
    python tools/worker.py --prod            # target production
"""

import argparse
import signal
import sys
import time
from datetime import datetime

from client import ShieldClient
from config import add_target_arg, get_target

_running = True


def signal_handler(sig, frame):
    global _running
    _running = False
    print("\n  Stopping...\n")


def run_once(client: ShieldClient, limit: int = 60, concurrency: int = 4) -> dict:
    """Run worker once and return result."""
    try:
        result = client.run_worker(limit=limit, concurrency=concurrency)
        ts = datetime.now().strftime("%H:%M:%S")
        processed = result.get("processed", 0)
        failed = result.get("failed", 0)
        claimed = result.get("claimed", 0)
        skipped = result.get("skipped", 0)

        if claimed > 0:
            print(f"  [{ts}] claimed={claimed} processed={processed} failed={failed} skipped={skipped}")
            for job in result.get("results", []):
                if job.get("status") == "failed":
                    print(f"           FAIL {job.get('queue')}/{job.get('type')}: {job.get('detail', '')[:80]}")
        else:
            print(f"  [{ts}] idle (no jobs)")

        return result
    except Exception as e:
        ts = datetime.now().strftime("%H:%M:%S")
        print(f"  [{ts}] ERROR: {e}")
        return {}


def main():
    parser = argparse.ArgumentParser(description="Worker runner")
    add_target_arg(parser)
    parser.add_argument("--loop", action="store_true", help="Run continuously")
    parser.add_argument("--interval", type=int, default=10, help="Loop interval in seconds")
    parser.add_argument("--limit", type=int, default=60, help="Max jobs per run")
    parser.add_argument("--concurrency", type=int, default=4, help="Parallel jobs")
    args = parser.parse_args()

    signal.signal(signal.SIGINT, signal_handler)

    target = get_target(args)
    client = ShieldClient(target)

    print(f"\n  Shield Recovery Worker")
    print(f"  Target: {client.url}")
    print(f"  Mode: {'loop ({args.interval}s)' if args.loop else 'single run'}\n")

    if args.loop:
        while _running:
            run_once(client, args.limit, args.concurrency)
            for _ in range(args.interval * 10):
                if not _running:
                    break
                time.sleep(0.1)
    else:
        run_once(client, args.limit, args.concurrency)

    print()


if __name__ == "__main__":
    main()
