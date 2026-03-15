import type {
  CustomerRecord,
  NormalizedPaymentEvent,
  PaymentRecord,
  RecoveryLeadStatus,
  RecoveryLeadRecord,
} from "@/server/recovery/types";
import { getStorageService } from "@/server/recovery/services/storage";

export async function createOrUpdateShieldLead(input: {
  payment: PaymentRecord;
  customer: CustomerRecord;
  normalizedEvent: NormalizedPaymentEvent;
  status?: RecoveryLeadStatus;
}): Promise<RecoveryLeadRecord> {
  const storage = getStorageService();
  const assignedAgent = await storage.assignAgentRoundRobin();

  return storage.upsertLead({
    payment: input.payment,
    customer: input.customer,
    status: input.status ?? "NEW_RECOVERY",
    product: input.normalizedEvent.metadata.product,
    failureReason: input.normalizedEvent.payment.failure_code,
    assignedAgent,
  });
}

export function markShieldLeadRecovered(
  paymentId: string,
): Promise<RecoveryLeadRecord | undefined> {
  return getStorageService().markLeadRecovered(paymentId);
}

export function markShieldLeadLost(
  paymentId: string,
): Promise<RecoveryLeadRecord | undefined> {
  return getStorageService().markLeadLost(paymentId);
}
