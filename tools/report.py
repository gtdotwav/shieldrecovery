#!/usr/bin/env python3
"""
report.py — Generate recovery performance reports.

Usage:
    python tools/report.py                  # summary to terminal
    python tools/report.py --csv            # export contacts as CSV
    python tools/report.py --csv --out data/report.csv
    python tools/report.py --prod           # from production
"""

import argparse
import csv
import sys
from datetime import datetime
from io import StringIO

from client import ShieldClient
from config import add_target_arg, get_target


def print_summary(client: ShieldClient):
    """Print a formatted recovery summary."""
    a = client.analytics()
    c = client.contacts()
    contacts = c.get("contacts", c) if isinstance(c, dict) else c
    contact_list = contacts if isinstance(contacts, list) else []

    # Stage breakdown
    stages = {}
    total_value = 0
    for contact in contact_list:
        stage = contact.get("lead_status", "UNKNOWN")
        stages[stage] = stages.get(stage, 0) + 1
        if stage not in ("RECOVERED", "LOST"):
            total_value += contact.get("payment_value", 0)

    total = a.get("total_failed_payments", 0)
    recovered = a.get("recovered_payments", 0)
    rate = a.get("recovery_rate", 0)
    revenue = a.get("recovered_revenue", 0)
    avg_time = a.get("average_recovery_time_hours", 0)
    active = a.get("active_recoveries", 0)

    print(f"\n  {'═' * 52}")
    print(f"  SHIELD RECOVERY — RELATORIO DE PERFORMANCE")
    print(f"  Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M')}")
    print(f"  {'═' * 52}\n")

    print(f"  KPIs PRINCIPAIS")
    print(f"  {'─' * 40}")
    print(f"  Pagamentos falhados:      {total:>8,}")
    print(f"  Recuperados:              {recovered:>8,}")
    print(f"  Taxa de recuperacao:      {rate:>7.1f}%")
    print(f"  Receita recuperada:       R$ {revenue:>12,.2f}")
    print(f"  Tempo medio:              {format_hours(avg_time):>8}")
    print(f"  Recuperacoes ativas:      {active:>8,}")
    print(f"  Receita em risco:         R$ {total_value:>12,.2f}")

    print(f"\n  DISTRIBUICAO POR ESTAGIO")
    print(f"  {'─' * 40}")
    stage_labels = {
        "NEW_RECOVERY": "Novo",
        "CONTACTING": "Contatando",
        "WAITING_CUSTOMER": "Aguardando cliente",
        "RECOVERED": "Recuperado",
        "LOST": "Perdido",
    }
    for stage, count in sorted(stages.items(), key=lambda x: -x[1]):
        label = stage_labels.get(stage, stage)
        pct = (count / len(contact_list) * 100) if contact_list else 0
        bar = "█" * int(pct / 2)
        print(f"  {label:22s} {count:>5,}  ({pct:5.1f}%)  {bar}")

    # Agent breakdown
    agents = {}
    for contact in contact_list:
        agent = contact.get("assigned_agent") or "Sem responsavel"
        agents[agent] = agents.get(agent, 0) + 1

    if agents:
        print(f"\n  LEADS POR RESPONSAVEL")
        print(f"  {'─' * 40}")
        for agent, count in sorted(agents.items(), key=lambda x: -x[1]):
            print(f"  {agent:22s} {count:>5,}")

    print(f"\n  Total de contatos: {len(contact_list)}")
    print()


def export_csv(client: ShieldClient, output_path: str | None):
    """Export contacts as CSV."""
    c = client.contacts()
    contacts = c.get("contacts", c) if isinstance(c, dict) else c
    contact_list = contacts if isinstance(contacts, list) else []

    if not contact_list:
        print("  No contacts to export.")
        return

    fields = [
        "lead_id", "customer_name", "email", "phone", "product",
        "payment_value", "payment_status", "payment_method",
        "lead_status", "assigned_agent", "created_at", "updated_at",
    ]

    buf = StringIO() if not output_path else None
    f = open(output_path, "w", newline="", encoding="utf-8") if output_path else buf

    writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
    writer.writeheader()
    for contact in contact_list:
        writer.writerow(contact)

    if output_path:
        f.close()
        print(f"  Exported {len(contact_list)} contacts to {output_path}")
    else:
        print(buf.getvalue())


def format_hours(hours: float) -> str:
    if hours <= 0 or hours != hours:  # NaN check
        return "n/d"
    if hours < 1:
        return "< 1h"
    if hours < 24:
        return f"{hours:.0f}h"
    return f"{hours / 24:.1f}d"


def main():
    parser = argparse.ArgumentParser(description="Recovery performance report")
    add_target_arg(parser)
    parser.add_argument("--csv", action="store_true", help="Export contacts as CSV")
    parser.add_argument("--out", type=str, help="CSV output file path")
    args = parser.parse_args()

    target = get_target(args)
    client = ShieldClient(target)

    if args.csv:
        export_csv(client, args.out)
    else:
        print_summary(client)


if __name__ == "__main__":
    main()
