#!/usr/bin/env python3
"""
seed.py — Populate Shield Recovery with realistic Brazilian demo data.

Usage:
    python tools/seed.py              # 30 transactions (default)
    python tools/seed.py --count 80   # custom count
    python tools/seed.py --prod       # target production
    python tools/seed.py --reset      # clear before seeding

Creates a mix of payment_failed, payment_refused, and payment_expired events
with realistic Brazilian names, products, values and timing so the dashboard,
CRM, inbox, and calendar look alive.
"""

import argparse
import hashlib
import hmac
import json
import random
import sys
import time
import uuid
from datetime import datetime, timedelta, timezone

import requests

from config import WEBHOOK_SECRET, add_target_arg, base_url, get_target

# ── Brazilian realistic data ──

FIRST_NAMES = [
    "Ana", "Maria", "João", "Carlos", "Fernanda", "Ricardo", "Juliana",
    "Pedro", "Mariana", "Lucas", "Camila", "Rafael", "Beatriz", "Gustavo",
    "Larissa", "Thiago", "Isabela", "Bruno", "Amanda", "Diego", "Letícia",
    "Matheus", "Gabriela", "Felipe", "Natália", "André", "Vanessa", "Daniel",
    "Patrícia", "Eduardo", "Carolina", "Roberto", "Aline", "Marcelo",
    "Priscila", "Leonardo", "Renata", "Vinícius", "Tatiana", "Henrique",
]

LAST_NAMES = [
    "Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira",
    "Almeida", "Nascimento", "Lima", "Araújo", "Pereira", "Carvalho",
    "Gomes", "Costa", "Ribeiro", "Martins", "Barbosa", "Rocha", "Correia",
    "Dias", "Moura", "Nunes", "Vieira", "Mendes", "Cardoso", "Freitas",
    "Monteiro", "Pinto", "Ramos", "Lopes",
]

PRODUCTS = [
    ("Mentoria Avançada em Vendas", 1_997_00),
    ("Curso Tráfego Pago Completo", 497_00),
    ("Ebook Estratégias de Growth", 47_00),
    ("Assinatura PRO Mensal", 97_00),
    ("Workshop de Copywriting", 297_00),
    ("Consultoria Individual 1h", 397_00),
    ("Plano Anual Premium", 1_297_00),
    ("Kit Templates de Landing Page", 67_00),
    ("Masterclass Funil de Vendas", 197_00),
    ("Treinamento Equipe Comercial", 2_497_00),
    ("Acesso Vitalício Plataforma", 797_00),
    ("Coaching Executivo 4 sessões", 1_597_00),
    ("Pack Social Media Templates", 37_00),
    ("Curso Automação com IA", 347_00),
    ("Programa Aceleração 90 Dias", 3_997_00),
]

FAILURE_REASONS = [
    "insufficient_funds",
    "card_declined",
    "expired_card",
    "invalid_cvv",
    "processing_error",
    "bank_timeout",
    "anti_fraud_rejected",
    "limit_exceeded",
    "payment_expired",
    "acquirer_timeout",
]

PAYMENT_METHODS = ["credit_card", "pix", "boleto"]
EVENT_TYPES = ["payment_failed", "payment_refused", "payment_expired"]
AGENTS = ["Carla", "Bruno", "Mariana", None, None]  # some unassigned

DDD_CODES = ["11", "21", "31", "41", "51", "61", "71", "81", "85", "92", "27", "48"]


def random_phone() -> str:
    ddd = random.choice(DDD_CODES)
    return f"{ddd}9{random.randint(10000000, 99999999)}"


def random_email(first: str, last: str) -> str:
    domains = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com.br", "icloud.com"]
    clean = lambda s: s.lower().replace("á", "a").replace("ã", "a").replace("é", "e").replace("ê", "e").replace("í", "i").replace("ó", "o").replace("ú", "u").replace("ç", "c")
    return f"{clean(first)}.{clean(last)}{random.randint(1, 99)}@{random.choice(domains)}"


def sign_webhook(timestamp: int, body: str) -> str:
    """Generate HMAC-SHA256 signature for webhook payload."""
    payload = f"{timestamp}.{body}"
    sig = hmac.new(WEBHOOK_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"sha256={sig}"


def generate_event(days_ago: int = 0) -> dict:
    """Generate a single realistic payment failure event."""
    first = random.choice(FIRST_NAMES)
    last = random.choice(LAST_NAMES)
    product, base_price = random.choice(PRODUCTS)
    # vary price slightly (+/- 10%)
    amount = int(base_price * random.uniform(0.9, 1.1))

    created = datetime.now(timezone.utc) - timedelta(
        days=days_ago,
        hours=random.randint(0, 23),
        minutes=random.randint(0, 59),
    )

    return {
        "event_id": f"evt_{uuid.uuid4().hex[:16]}",
        "event_type": random.choice(EVENT_TYPES),
        "timestamp": int(created.timestamp()),
        "payment": {
            "id": f"pay_{uuid.uuid4().hex[:12]}",
            "order_id": f"ord_{uuid.uuid4().hex[:10]}",
            "amount": amount,
            "currency": "BRL",
            "method": random.choice(PAYMENT_METHODS),
            "status": "failed",
            "failure_code": random.choice(FAILURE_REASONS),
            "installments": random.choice([1, 1, 1, 2, 3, 6, 12]) if "credit" in random.choice(PAYMENT_METHODS) else 1,
        },
        "customer": {
            "id": f"cust_{uuid.uuid4().hex[:10]}",
            "name": f"{first} {last}",
            "email": random_email(first, last),
            "phone": random_phone(),
            "document": f"{random.randint(100, 999)}.{random.randint(100, 999)}.{random.randint(100, 999)}-{random.randint(10, 99)}",
        },
        "metadata": {
            "product": product,
            "source": random.choice(["organic", "paid_ads", "email_campaign", "referral", "social"]),
        },
    }


def send_event(url: str, event: dict) -> dict:
    """Send a webhook event with proper HMAC signature."""
    body = json.dumps(event)
    ts = int(time.time())
    sig = sign_webhook(ts, body)

    r = requests.post(
        f"{url}/api/webhooks/shield-gateway",
        data=body,
        headers={
            "Content-Type": "application/json",
            "x-webhook-id": f"wh_{uuid.uuid4().hex[:16]}",
            "x-signature": sig,
            "x-timestamp": str(ts),
        },
        timeout=30,
    )
    return {"status": r.status_code, "body": r.json() if r.headers.get("content-type", "").startswith("application/json") else r.text}


def main():
    parser = argparse.ArgumentParser(description="Seed Shield Recovery with demo data")
    add_target_arg(parser)
    parser.add_argument("--count", type=int, default=30, help="Number of transactions to create")
    parser.add_argument("--spread", type=int, default=30, help="Spread events over N days (default: 30)")
    args = parser.parse_args()

    target = get_target(args)
    url = base_url(target)

    print(f"\n  Shield Recovery Seeder")
    print(f"  Target: {url}")
    print(f"  Events: {args.count}")
    print(f"  Spread: {args.spread} days\n")

    if not WEBHOOK_SECRET:
        print("  ERROR: SHIELD_GATEWAY_WEBHOOK_SECRET not set")
        sys.exit(1)

    success = 0
    errors = 0

    for i in range(args.count):
        days_ago = random.randint(0, args.spread)
        event = generate_event(days_ago)
        customer = event["customer"]["name"]
        product = event["metadata"]["product"]
        amount = event["payment"]["amount"] / 100

        try:
            result = send_event(url, event)
            if result["status"] in (200, 201):
                success += 1
                status = "OK"
            else:
                errors += 1
                status = f"ERR {result['status']}"
        except Exception as e:
            errors += 1
            status = f"FAIL: {e}"

        print(f"  [{i+1:3d}/{args.count}] {status:8s} {customer:22s} R$ {amount:>10,.2f}  {product}")

    print(f"\n  Done: {success} created, {errors} errors\n")


if __name__ == "__main__":
    main()
