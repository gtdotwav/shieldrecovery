import { ensureAuthenticatedRequest } from "@/server/auth/request";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import { mapStageLabel } from "@/lib/stage";
import type { FollowUpContact } from "@/server/recovery/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeCsvField(value: string): string {
  if (!value) return "";
  // Prevent CSV injection (formula injection)
  const formulaChars = ["=", "+", "-", "@", "\t", "\r"];
  let safeValue = value;
  if (formulaChars.some((c) => safeValue.startsWith(c))) {
    safeValue = "'" + safeValue;
  }
  if (safeValue.includes(",") || safeValue.includes('"') || safeValue.includes("\n")) {
    return `"${safeValue.replace(/"/g, '""')}"`;
  }
  return safeValue;
}

function formatCsvCurrency(cents: number): string {
  if (!Number.isFinite(cents)) return "0.00";
  return (cents / 100).toFixed(2);
}

function contactToCsvRow(contact: FollowUpContact): string {
  const fields = [
    escapeCsvField(contact.customer_name),
    escapeCsvField(contact.email),
    escapeCsvField(contact.phone),
    escapeCsvField(contact.product ?? ""),
    formatCsvCurrency(contact.payment_value),
    escapeCsvField(mapStageLabel(contact.lead_status)),
    escapeCsvField(contact.assigned_agent ?? ""),
    escapeCsvField(contact.updated_at),
  ];
  return fields.join(",");
}

export async function GET(request: Request) {
  const unauthorized = await ensureAuthenticatedRequest(request);
  if (unauthorized) {
    return unauthorized;
  }

  const service = getPaymentRecoveryService();
  const contacts = await service.getFollowUpContacts();

  const header = "nome,email,telefone,produto,valor,status,agente,atualizado";
  const rows = contacts.map(contactToCsvRow);
  const csv = [header, ...rows].join("\n");

  const now = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="contatos-${now}.csv"`,
    },
  });
}
