/**
 * Explicit column projections for hot-path Supabase queries.
 *
 * Replacing `.select("*")` with these constants:
 *   - bounds the network payload so a future column (e.g. a large JSONB)
 *     won't quietly inflate every read,
 *   - documents which columns each mapper depends on, and
 *   - lets us tweak a single place when the schema gains soft-delete /
 *     multi-tenancy fields.
 *
 * Add fields here when a mapper needs them. Do NOT prune fields without
 * checking the corresponding map* function in supabase-storage.
 */

export const CUSTOMER_FIELDS = [
  "id",
  "gateway_customer_id",
  "name",
  "email",
  "phone",
  "document",
  "created_at",
  "updated_at",
  "deleted_at",
  "seller_key",
].join(",");

export const PAYMENT_FIELDS = [
  "id",
  "gateway_payment_id",
  "order_id",
  "customer_id",
  "status",
  "amount",
  "currency",
  "payment_method",
  "failure_code",
  "first_failure_at",
  "recovered_at",
  "created_at",
  "updated_at",
  "deleted_at",
  "seller_key",
].join(",");

export const LEAD_FIELDS = [
  "id",
  "lead_id",
  "payment_id",
  "customer_id",
  "customer_name",
  "email",
  "phone",
  "payment_value",
  "product",
  "failure_reason",
  "status",
  "assigned_agent_id",
  "created_at",
  "updated_at",
  "recovered_at",
  "deleted_at",
  "seller_key",
].join(",");

export const LEAD_FIELDS_WITH_AGENT = `${LEAD_FIELDS}, agent:agents(*)`;

export const QUEUE_JOB_FIELDS = [
  "id",
  "queue_name",
  "job_type",
  "payload",
  "run_at",
  "attempts",
  "status",
  "error",
  "created_at",
  "updated_at",
  "seller_key",
].join(",");

export const MESSAGE_FIELDS = [
  "id",
  "conversation_id",
  "lead_record_id",
  "lead_public_id",
  "customer_id",
  "channel",
  "direction",
  "sender_name",
  "sender_address",
  "content",
  "provider_message_id",
  "status",
  "created_at",
  "delivered_at",
  "read_at",
  "queued_at",
  "sent_at",
  "failed_at",
  "clicked_at",
  "converted_at",
  "error",
  "metadata",
  "seller_key",
].join(",");

export const CONVERSATION_FIELDS = [
  "id",
  "lead_record_id",
  "lead_public_id",
  "customer_id",
  "customer_name",
  "channel",
  "contact_value",
  "assigned_agent_id",
  "status",
  "last_message_at",
  "created_at",
  "updated_at",
  "deleted_at",
  "seller_key",
].join(",");
