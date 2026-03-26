#!/usr/bin/env python3
"""
simulate.py — Simulate payment events with signed webhooks + process worker jobs.

Usage:
    python tools/simulate.py                        # 1 failed payment, local
    python tools/simulate.py --count 5              # 5 failed payments
    python tools/simulate.py --type payment_refused  # specific event type
    python tools/simulate.py --process              # also run worker after
    python tools/simulate.py --prod                 # target production
    python tools/simulate.py --full                 # send + process + show result

Simulates the full recovery flow: webhook -> lead creation -> worker processing.
"""

import argparse
import hashlib
import hmac
import json
import random
import sys
import time
import uuid

import requests

from client import ShieldClient
from config import WEBHOOK_SECRET, WORKER_TOKEN, add_target_arg, base_url, get_target

SAMPLE_CUSTOMERS = [
    {"name": "Carlos Mendes", "email": "carlos.mendes42@gmail.com", "phone": "11987654321"},
    {"name": "Ana Beatriz Silva", "email": "anabsilva@hotmail.com", "phone": "21976543210"},
    {"name": "Rodrigo Ferreira", "email": "rodrigo.f@outlook.com", "phone": "31965432109"},
    {"name": "Juliana Costa", "email": "ju.costa88@gmail.com", "phone": "41954321098"},
    {"name": "Thiago Oliveira", "email": "thiago.oliv@yahoo.com.br", "phone": "51943210987"},
]

SAMPLE_PRODUCTS = [
    ("Mentoria Premium", 1_997_00),
    ("Curso Completo", 497_00),
    ("Assinatura PRO", 97_00),
    ("Workshop Intensivo", 297_00),
    ("Consultoria 1:1", 597_00),
]


def build_event(event_type: str = "payment_failed") -> dict:
    customer = random.choice(SAMPLE_CUSTOMERS)
    product, amount = random.choice(SAMPLE_PRODUCTS)
    return {
        "event_id": f"evt_sim_{uuid.uuid4().hex[:12]}",
        "event_type": event_type,
        "timestamp": int(time.time()),
        "payment": {
            "id": f"pay_sim_{uuid.uuid4().hex[:10]}",
            "order_id": f"ord_sim_{uuid.uuid4().hex[:8]}",
            "amount": amount,
            "currency": "BRL",
            "method": random.choice(["credit_card", "pix", "boleto"]),
            "status": "failed",
            "failure_code": random.choice(["insufficient_funds", "card_declined", "expired_card"]),
        },
        "customer": {
            "id": f"cust_sim_{uuid.uuid4().hex[:8]}",
            **customer,
        },
        "metadata": {
            "product": product,
            "source": "simulation",
        },
    }


def send_signed_webhook(url: str, event: dict) -> requests.Response:
    body = json.dumps(event)
    ts = str(int(time.time()))
    payload = f"{ts}.{body}"
    sig = hmac.new(WEBHOOK_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()

    return requests.post(
        f"{url}/api/webhooks/shield-gateway",
        data=body,
        headers={
            "Content-Type": "application/json",
            "x-webhook-id": f"wh_sim_{uuid.uuid4().hex[:12]}",
            "x-signature": f"sha256={sig}",
            "x-timestamp": ts,
        },
        timeout=30,
    )


def main():
    parser = argparse.ArgumentParser(description="Simulate payment events")
    add_target_arg(parser)
    parser.add_argument("--count", type=int, default=1, help="Number of events")
    parser.add_argument("--type", default="payment_failed", choices=["payment_failed", "payment_refused", "payment_expired"])
    parser.add_argument("--process", action="store_true", help="Run worker after sending")
    parser.add_argument("--full", action="store_true", help="Send + process + show analytics")
    args = parser.parse_args()

    if args.full:
        args.process = True

    target = get_target(args)
    url = base_url(target)

    print(f"\n  Payment Event Simulator")
    print(f"  Target: {url}")
    print(f"  Events: {args.count} x {args.type}\n")

    if not WEBHOOK_SECRET:
        print("  ERROR: SHIELD_GATEWAY_WEBHOOK_SECRET not set")
        sys.exit(1)

    # ── Send events ──
    for i in range(args.count):
        event = build_event(args.type)
        name = event["customer"]["name"]
        amount = event["payment"]["amount"] / 100
        product = event["metadata"]["product"]

        try:
            r = send_signed_webhook(url, event)
            status = "OK" if r.status_code in (200, 201) else f"ERR {r.status_code}"
            detail = ""
            if r.status_code not in (200, 201):
                try:
                    detail = f"  {r.json()}"
                except Exception:
                    detail = f"  {r.text[:100]}"
        except Exception as e:
            status = "FAIL"
            detail = f"  {e}"

        print(f"  [{i+1}] {status:8s} {name:24s} R$ {amount:>8,.2f}  {product}{detail}")

    # ── Process worker ──
    if args.process:
        print(f"\n  Running worker...")
        client = ShieldClient(target)
        try:
            result = client.run_worker(limit=100, concurrency=8)
            print(f"  Worker: {result.get('processed', 0)} processed, {result.get('failed', 0)} failed")
        except Exception as e:
            print(f"  Worker error: {e}")

    # ── Show analytics ──
    if args.full:
        print(f"\n  Analytics after simulation:")
        client = ShieldClient(target)
        try:
            a = client.analytics()
            print(f"    Falhados:   {a.get('total_failed_payments', '?')}")
            print(f"    Recuperados: {a.get('recovered_payments', '?')}")
            print(f"    Taxa:        {a.get('recovery_rate', 0):.1f}%")
            print(f"    Receita:     R$ {a.get('recovered_revenue', 0):,.2f}")
            print(f"    Ativos:      {a.get('active_recoveries', '?')}")
        except Exception as e:
            print(f"    Error: {e}")

    print()


if __name__ == "__main__":
    main()
