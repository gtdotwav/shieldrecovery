import type { FollowUpContact } from "@/server/recovery/types";
import { hasPhone } from "./contact";

export function mapStageLabel(stage: string) {
  if (stage === "NEW_RECOVERY") return "Entrada";
  if (stage === "CONTACTING") return "Em contato";
  if (stage === "WAITING_CUSTOMER") return "Esperando retorno";
  if (stage === "RECOVERED") return "Recuperado";
  if (stage === "LOST") return "Perdido";
  return stage;
}

export function mapPaymentStatus(status: string) {
  const map: Record<string, string> = {
    failed: "falhou",
    refused: "recusado",
    expired: "expirado",
    pending: "pendente",
    waiting_payment: "aguardando",
    succeeded: "pago",
  };
  return map[status] ?? status.replace(/_/g, " ");
}

export function mapPaymentMethod(method: string) {
  const map: Record<string, string> = {
    credit_card: "cartão",
    pix: "pix",
    boleto: "boleto",
    bank_transfer: "transferência",
  };
  return map[method] ?? method.replace(/_/g, " ");
}

export function recommendedNextAction(contact: FollowUpContact) {
  if (contact.lead_status === "NEW_RECOVERY") {
    return hasPhone(contact.phone)
      ? "Abrir primeiro contato via WhatsApp."
      : "Validar canal antes de iniciar tratativa.";
  }
  if (contact.lead_status === "CONTACTING") {
    return "Registrar andamento e aguardar retorno.";
  }
  if (contact.lead_status === "WAITING_CUSTOMER") {
    return "Retomar com contexto claro de follow-up.";
  }
  if (contact.lead_status === "RECOVERED") {
    return "Caso recuperado. Nenhuma ação necessária.";
  }
  if (contact.lead_status === "LOST") {
    return "Caso encerrado como perdido.";
  }
  return "Revisar o caso.";
}

export function scorePriority(contact: FollowUpContact) {
  let score = contact.payment_value;
  if (contact.lead_status === "NEW_RECOVERY") score += 1200;
  if (contact.lead_status === "CONTACTING") score += 600;
  if (contact.lead_status === "WAITING_CUSTOMER") score += 250;
  if (hasPhone(contact.phone)) score += 450;
  const updatedHoursAgo =
    (Date.now() - new Date(contact.updated_at).getTime()) / 1000 / 60 / 60;
  score += Math.max(0, 48 - updatedHoursAgo) * 10;
  return score;
}

export const STAGE_STYLES: Record<string, string> = {
  NEW_RECOVERY:
    "border-sky-200 bg-sky-50 text-sky-600",
  CONTACTING:
    "border-blue-200 bg-blue-50 text-blue-600",
  WAITING_CUSTOMER:
    "border-amber-200 bg-amber-50 text-amber-600",
  RECOVERED:
    "border-green-200 bg-green-50 text-green-600",
  LOST:
    "border-red-200 bg-red-50 text-red-600",
};
