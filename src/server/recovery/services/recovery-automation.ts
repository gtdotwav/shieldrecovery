import { getStorageService } from "@/server/recovery/services/storage";
import {
  buildRecoveryWorkflowJobs,
  buildRetryJobs,
  buildWebhookProcessingJobs,
} from "@/server/recovery/queues/recovery-queues";
import type {
  NormalizedPaymentEvent,
  PaymentAttemptRecord,
  PaymentRecord,
  RecoveryLeadRecord,
} from "@/server/recovery/types";

export class RecoveryAutomationService {
  private readonly storage = getStorageService();

  async scheduleRecovery(input: {
    lead: RecoveryLeadRecord;
    payment: PaymentRecord;
    event: NormalizedPaymentEvent;
  }) {
    const jobs = buildRecoveryWorkflowJobs(input);
    return this.storage.createQueueJobs(jobs);
  }

  async scheduleWebhookProcessing(input: {
    webhookId: string;
    timestamp: number;
    sellerKey?: string;
  }) {
    const jobs = buildWebhookProcessingJobs(input);
    return this.storage.createQueueJobs(jobs);
  }

  async scheduleRetry(input: { payment: PaymentRecord; attempt: PaymentAttemptRecord }) {
    const jobs = buildRetryJobs(input);
    return this.storage.createQueueJobs(jobs);
  }
}
