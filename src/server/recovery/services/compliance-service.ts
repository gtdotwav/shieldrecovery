import { createHash } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { appEnv } from "@/server/recovery/config";

/* ── Types ── */

export type ConsentChannel = "whatsapp" | "email" | "sms" | "voice";
export type ConsentType = "recovery_contact" | "marketing" | "data_processing";
export type ConsentSource =
  | "webhook_implicit"
  | "explicit_opt_in"
  | "partner_provided"
  | "user_request";

export interface ConsentRecord {
  id: string;
  customerId: string;
  contactValue: string;
  channel: ConsentChannel;
  consentType: ConsentType;
  granted: boolean;
  source: ConsentSource;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
  grantedAt: string;
  revokedAt: string | null;
  createdAt: string;
}

export type DeletionStatus = "pending" | "processing" | "completed" | "denied";

export interface DeletionRequest {
  id: string;
  requesterEmail: string;
  requesterPhone: string | null;
  customerId: string | null;
  status: DeletionStatus;
  reason: string | null;
  denialReason: string | null;
  tablesAffected: string[];
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DataAccessLogEntry {
  id: string;
  userEmail: string;
  userRole: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface RetentionPolicy {
  id: string;
  resourceType: string;
  retentionDays: number;
  autoDelete: boolean;
  description: string | null;
  updatedAt: string;
}

export interface CustomerDataExport {
  customer: Record<string, unknown> | null;
  payments: Record<string, unknown>[];
  leads: Record<string, unknown>[];
  conversations: Record<string, unknown>[];
  messages: Record<string, unknown>[];
  consents: ConsentRecord[];
}

/* ── Row mappers ── */

function mapConsentRow(row: Record<string, unknown>): ConsentRecord {
  return {
    id: row.id as string,
    customerId: row.customer_id as string,
    contactValue: row.contact_value as string,
    channel: row.channel as ConsentChannel,
    consentType: row.consent_type as ConsentType,
    granted: row.granted as boolean,
    source: row.source as ConsentSource,
    ipAddress: (row.ip_address as string) ?? null,
    userAgent: (row.user_agent as string) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    grantedAt: row.granted_at as string,
    revokedAt: (row.revoked_at as string) ?? null,
    createdAt: row.created_at as string,
  };
}

function mapDeletionRow(row: Record<string, unknown>): DeletionRequest {
  return {
    id: row.id as string,
    requesterEmail: row.requester_email as string,
    requesterPhone: (row.requester_phone as string) ?? null,
    customerId: (row.customer_id as string) ?? null,
    status: row.status as DeletionStatus,
    reason: (row.reason as string) ?? null,
    denialReason: (row.denial_reason as string) ?? null,
    tablesAffected: (row.tables_affected as string[]) ?? [],
    completedAt: (row.completed_at as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapRetentionRow(row: Record<string, unknown>): RetentionPolicy {
  return {
    id: row.id as string,
    resourceType: row.resource_type as string,
    retentionDays: row.retention_days as number,
    autoDelete: row.auto_delete as boolean,
    description: (row.description as string) ?? null,
    updatedAt: row.updated_at as string,
  };
}

function mapAccessLogRow(row: Record<string, unknown>): DataAccessLogEntry {
  return {
    id: row.id as string,
    userEmail: row.user_email as string,
    userRole: row.user_role as string,
    action: row.action as string,
    resourceType: row.resource_type as string,
    resourceId: (row.resource_id as string) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.created_at as string,
  };
}

/* ── Helpers ── */

function hashPii(value: string): string {
  return createHash("sha256").update(value.toLowerCase().trim()).digest("hex").slice(0, 16);
}

/* ── Retention table mapping ── */

const RETENTION_TABLE_MAP: Record<string, string> = {
  recovery_leads: "recovery_leads",
  conversations: "conversations",
  messages: "messages",
  system_logs: "system_logs",
  webhook_events: "webhook_events",
  queue_jobs: "queue_jobs",
};

/* ── Service ── */

export class ComplianceService {
  private readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(appEnv.supabaseUrl, appEnv.supabaseServiceRoleKey);
  }

  /* ── Consent management ── */

  async recordConsent(
    customerId: string,
    contactValue: string,
    channel: ConsentChannel,
    consentType: ConsentType,
    source: ConsentSource,
    metadata?: Record<string, unknown>,
  ): Promise<ConsentRecord> {
    const { data, error } = await this.supabase
      .from("consent_records")
      .insert({
        customer_id: customerId,
        contact_value: contactValue,
        channel,
        consent_type: consentType,
        granted: true,
        source,
        metadata: metadata ?? {},
        granted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to record consent: ${error.message}`);
    return mapConsentRow(data);
  }

  async revokeConsent(
    customerId: string,
    channel: ConsentChannel,
    consentType: ConsentType,
  ): Promise<void> {
    const { error } = await this.supabase
      .from("consent_records")
      .update({
        granted: false,
        revoked_at: new Date().toISOString(),
      })
      .eq("customer_id", customerId)
      .eq("channel", channel)
      .eq("consent_type", consentType)
      .eq("granted", true);

    if (error) throw new Error(`Failed to revoke consent: ${error.message}`);
  }

  async hasActiveConsent(
    contactValue: string,
    channel: ConsentChannel,
    consentType: ConsentType,
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("consent_records")
      .select("id")
      .eq("contact_value", contactValue)
      .eq("channel", channel)
      .eq("consent_type", consentType)
      .eq("granted", true)
      .is("revoked_at", null)
      .limit(1);

    if (error) throw new Error(`Failed to check consent: ${error.message}`);
    return (data?.length ?? 0) > 0;
  }

  async getConsentRecords(customerId: string): Promise<ConsentRecord[]> {
    const { data, error } = await this.supabase
      .from("consent_records")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to get consent records: ${error.message}`);
    return (data ?? []).map(mapConsentRow);
  }

  /* ── Data deletion requests (LGPD Art. 18) ── */

  async requestDataDeletion(
    requesterEmail: string,
    requesterPhone?: string,
    reason?: string,
  ): Promise<DeletionRequest> {
    // Try to find existing customer by email or phone
    let customerId: string | null = null;

    const { data: customerByEmail } = await this.supabase
      .from("customers")
      .select("id")
      .eq("email", requesterEmail.toLowerCase().trim())
      .limit(1)
      .single();

    if (customerByEmail) {
      customerId = customerByEmail.id;
    } else if (requesterPhone) {
      const { data: customerByPhone } = await this.supabase
        .from("customers")
        .select("id")
        .eq("phone", requesterPhone.trim())
        .limit(1)
        .single();

      if (customerByPhone) {
        customerId = customerByPhone.id;
      }
    }

    const { data, error } = await this.supabase
      .from("data_deletion_requests")
      .insert({
        requester_email: requesterEmail.toLowerCase().trim(),
        requester_phone: requesterPhone?.trim() ?? null,
        customer_id: customerId,
        status: "pending",
        reason: reason ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create deletion request: ${error.message}`);
    return mapDeletionRow(data);
  }

  async processDataDeletion(
    requestId: string,
  ): Promise<{ tablesAffected: string[]; recordsDeleted: number }> {
    // 1. Load the request
    const { data: reqRow, error: reqErr } = await this.supabase
      .from("data_deletion_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (reqErr || !reqRow) throw new Error("Deletion request not found.");

    const request = mapDeletionRow(reqRow);
    if (request.status === "completed") {
      throw new Error("Deletion request already processed.");
    }

    // Mark as processing
    await this.supabase
      .from("data_deletion_requests")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", requestId);

    const tablesAffected: string[] = [];
    let recordsDeleted = 0;

    try {
      // 2. Find customer records by email and/or phone
      const customerIds: string[] = [];

      const { data: byEmail } = await this.supabase
        .from("customers")
        .select("id")
        .eq("email", request.requesterEmail);

      if (byEmail?.length) {
        customerIds.push(...byEmail.map((c) => c.id));
      }

      if (request.requesterPhone) {
        const { data: byPhone } = await this.supabase
          .from("customers")
          .select("id")
          .eq("phone", request.requesterPhone);

        if (byPhone?.length) {
          for (const c of byPhone) {
            if (!customerIds.includes(c.id)) customerIds.push(c.id);
          }
        }
      }

      if (customerIds.length === 0) {
        // No customer records found — complete with empty result
        await this.supabase
          .from("data_deletion_requests")
          .update({
            status: "completed",
            tables_affected: [],
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", requestId);

        return { tablesAffected: [], recordsDeleted: 0 };
      }

      // 3. Anonymize customers (don't hard-delete)
      for (const custId of customerIds) {
        const emailHash = `lgpd_${hashPii(request.requesterEmail)}@removed.lgpd`;
        const phoneHash = `lgpd_${hashPii(request.requesterPhone ?? custId)}`;

        const { error: custErr } = await this.supabase
          .from("customers")
          .update({
            name: "LGPD_REMOVIDO",
            email: emailHash,
            phone: phoneHash,
          })
          .eq("id", custId);

        if (!custErr) {
          tablesAffected.push("customers");
          recordsDeleted++;
        }
      }

      // 4. Find and anonymize messages
      const { data: conversations } = await this.supabase
        .from("conversations")
        .select("id")
        .in("customer_id", customerIds);

      if (conversations?.length) {
        const conversationIds = conversations.map((c) => c.id);

        const { data: updatedMsgs } = await this.supabase
          .from("messages")
          .update({ content: "[conteudo removido por LGPD]" })
          .in("conversation_id", conversationIds)
          .select("id");

        const msgCount = updatedMsgs?.length ?? 0;
        if (msgCount > 0) {
          tablesAffected.push("messages");
          recordsDeleted += msgCount;
        }
      }

      // 5. Mark leads as LOST
      const { data: updatedLeads } = await this.supabase
        .from("recovery_leads")
        .update({ status: "LOST" })
        .in("customer_id", customerIds)
        .select("id");

      const leadsCount = updatedLeads?.length ?? 0;
      if (leadsCount > 0) {
        tablesAffected.push("recovery_leads");
        recordsDeleted += leadsCount;
      }

      // 6. Revoke all consents
      const { data: updatedConsents } = await this.supabase
        .from("consent_records")
        .update({
          granted: false,
          revoked_at: new Date().toISOString(),
        })
        .in("customer_id", customerIds)
        .eq("granted", true)
        .select("id");

      const consentCount = updatedConsents?.length ?? 0;
      if (consentCount > 0) {
        tablesAffected.push("consent_records");
        recordsDeleted += consentCount;
      }

      // 7. Update deletion request as completed
      const uniqueTables = [...new Set(tablesAffected)];
      await this.supabase
        .from("data_deletion_requests")
        .update({
          status: "completed",
          tables_affected: uniqueTables,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      return { tablesAffected: uniqueTables, recordsDeleted };
    } catch (err) {
      // Roll back status on failure
      await this.supabase
        .from("data_deletion_requests")
        .update({
          status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      throw err;
    }
  }

  async getDeletionRequests(status?: DeletionStatus): Promise<DeletionRequest[]> {
    let query = this.supabase
      .from("data_deletion_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Failed to get deletion requests: ${error.message}`);
    return (data ?? []).map(mapDeletionRow);
  }

  async updateDeletionStatus(
    requestId: string,
    status: DeletionStatus,
    denialReason?: string,
  ): Promise<DeletionRequest> {
    const updatePayload: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "denied" && denialReason) {
      updatePayload.denial_reason = denialReason;
    }

    if (status === "completed") {
      updatePayload.completed_at = new Date().toISOString();
    }

    const { data, error } = await this.supabase
      .from("data_deletion_requests")
      .update(updatePayload)
      .eq("id", requestId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update deletion status: ${error.message}`);
    return mapDeletionRow(data);
  }

  /* ── Data access audit log (LGPD Art. 37) ── */

  async logDataAccess(
    userEmail: string,
    userRole: string,
    action: string,
    resourceType: string,
    resourceId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const { error } = await this.supabase.from("data_access_log").insert({
      user_email: userEmail,
      user_role: userRole,
      action,
      resource_type: resourceType,
      resource_id: resourceId ?? null,
      metadata: metadata ?? {},
    });

    if (error) {
      // Audit logging should never break the main flow
      console.error("[compliance] Failed to log data access:", error.message);
    }
  }

  /* ── Retention policies ── */

  async getRetentionPolicies(): Promise<RetentionPolicy[]> {
    const { data, error } = await this.supabase
      .from("data_retention_policies")
      .select("*")
      .order("resource_type");

    if (error) throw new Error(`Failed to get retention policies: ${error.message}`);
    return (data ?? []).map(mapRetentionRow);
  }

  async updateRetentionPolicy(
    resourceType: string,
    retentionDays: number,
    autoDelete: boolean,
  ): Promise<RetentionPolicy> {
    const { data, error } = await this.supabase
      .from("data_retention_policies")
      .update({
        retention_days: retentionDays,
        auto_delete: autoDelete,
        updated_at: new Date().toISOString(),
      })
      .eq("resource_type", resourceType)
      .select()
      .single();

    if (error) throw new Error(`Failed to update retention policy: ${error.message}`);
    return mapRetentionRow(data);
  }

  async runRetentionCleanup(): Promise<{
    tablesProcessed: string[];
    recordsDeleted: Record<string, number>;
  }> {
    const policies = await this.getRetentionPolicies();
    const autoDeletePolicies = policies.filter((p) => p.autoDelete);

    const tablesProcessed: string[] = [];
    const recordsDeleted: Record<string, number> = {};

    for (const policy of autoDeletePolicies) {
      const tableName = RETENTION_TABLE_MAP[policy.resourceType];
      if (!tableName) continue;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);
      const cutoffIso = cutoffDate.toISOString();

      try {
        const { count, error } = await this.supabase
          .from(tableName)
          .delete({ count: "exact" })
          .lt("created_at", cutoffIso);

        if (error) {
          console.error(
            `[compliance] Retention cleanup failed for ${tableName}:`,
            error.message,
          );
          continue;
        }

        tablesProcessed.push(tableName);
        recordsDeleted[tableName] = count ?? 0;
      } catch (err) {
        console.error(
          `[compliance] Retention cleanup error for ${tableName}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    return { tablesProcessed, recordsDeleted };
  }

  /* ── Data portability (LGPD Art. 18, V) ── */

  async exportCustomerData(customerId: string): Promise<CustomerDataExport> {
    const [
      { data: customer },
      { data: payments },
      { data: leads },
      { data: conversations },
      { data: consentsRaw },
    ] = await Promise.all([
      this.supabase.from("customers").select("*").eq("id", customerId).single(),
      this.supabase.from("payments").select("*").eq("customer_id", customerId),
      this.supabase.from("recovery_leads").select("*").eq("customer_id", customerId),
      this.supabase.from("conversations").select("*").eq("customer_id", customerId),
      this.supabase
        .from("consent_records")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false }),
    ]);

    // Fetch messages for all conversations
    const conversationIds = (conversations ?? []).map(
      (c: Record<string, unknown>) => c.id as string,
    );
    let messages: Record<string, unknown>[] = [];

    if (conversationIds.length > 0) {
      const { data: msgs } = await this.supabase
        .from("messages")
        .select("*")
        .in("conversation_id", conversationIds);
      messages = (msgs ?? []) as Record<string, unknown>[];
    }

    return {
      customer: (customer as Record<string, unknown>) ?? null,
      payments: (payments ?? []) as Record<string, unknown>[],
      leads: (leads ?? []) as Record<string, unknown>[],
      conversations: (conversations ?? []) as Record<string, unknown>[],
      messages,
      consents: (consentsRaw ?? []).map(mapConsentRow),
    };
  }

  /* ── Dashboard summary ── */

  async getDashboardSummary(): Promise<{
    totalConsents: number;
    activeConsents: number;
    revokedConsents: number;
    pendingDeletions: number;
    completedDeletions: number;
    deniedDeletions: number;
    retentionPolicies: RetentionPolicy[];
    recentAccessLogs: DataAccessLogEntry[];
  }> {
    const [
      { count: totalConsents },
      { count: activeConsents },
      { count: revokedConsents },
      { count: pendingDeletions },
      { count: completedDeletions },
      { count: deniedDeletions },
      { data: retentionData },
      { data: recentLogs },
    ] = await Promise.all([
      this.supabase
        .from("consent_records")
        .select("*", { count: "exact", head: true }),
      this.supabase
        .from("consent_records")
        .select("*", { count: "exact", head: true })
        .eq("granted", true)
        .is("revoked_at", null),
      this.supabase
        .from("consent_records")
        .select("*", { count: "exact", head: true })
        .eq("granted", false),
      this.supabase
        .from("data_deletion_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      this.supabase
        .from("data_deletion_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed"),
      this.supabase
        .from("data_deletion_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "denied"),
      this.supabase
        .from("data_retention_policies")
        .select("*")
        .order("resource_type"),
      this.supabase
        .from("data_access_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    return {
      totalConsents: totalConsents ?? 0,
      activeConsents: activeConsents ?? 0,
      revokedConsents: revokedConsents ?? 0,
      pendingDeletions: pendingDeletions ?? 0,
      completedDeletions: completedDeletions ?? 0,
      deniedDeletions: deniedDeletions ?? 0,
      retentionPolicies: (retentionData ?? []).map(mapRetentionRow),
      recentAccessLogs: (recentLogs ?? []).map(mapAccessLogRow),
    };
  }
}

/* ── Singleton ── */

let _instance: ComplianceService | null = null;

export function getComplianceService(): ComplianceService {
  if (!_instance) {
    _instance = new ComplianceService();
  }
  return _instance;
}

/* ── Implicit consent helper ── */

/**
 * Track implicit consent in a non-blocking way.
 * Safe to call from any context — errors are swallowed and logged.
 */
export function trackImplicitConsent(
  customerId: string,
  contactValue: string,
  channel: ConsentChannel,
  consentType: ConsentType,
  source: ConsentSource,
  metadata?: Record<string, unknown>,
): void {
  getComplianceService()
    .recordConsent(customerId, contactValue, channel, consentType, source, metadata)
    .catch((err) => {
      console.error(
        "[compliance] Failed to track implicit consent:",
        err instanceof Error ? err.message : err,
      );
    });
}
