# Shield Recovery / PagRecovery — Platform Documentation

> White-label payment recovery SaaS — Complete integration & iframe embedding guide

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Authentication](#2-authentication)
3. [White-Label / Brand System](#3-white-label--brand-system)
4. [API Reference](#4-api-reference)
5. [Webhook Integration](#5-webhook-integration)
6. [Recovery Engine Flow](#6-recovery-engine-flow)
7. [Messaging & Inbox](#7-messaging--inbox)
8. [AI System](#8-ai-system)
9. [Checkout & Payment Retry](#9-checkout--payment-retry)
10. [Worker / Cron System](#10-worker--cron-system)
11. [Page Routes & Roles](#11-page-routes--roles)
12. [Server Actions](#12-server-actions)
13. [Database Schema](#13-database-schema)
14. [Iframe Integration Guide](#14-iframe-integration-guide)
15. [Environment Variables](#15-environment-variables)
16. [File Structure](#16-file-structure)

---

## 1. Architecture Overview

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) + React 19 |
| Language | TypeScript 5.9 |
| Database | Supabase PostgreSQL (fallback: local JSON) |
| Auth | Custom JWT (HMAC-SHA256), cookie-based sessions |
| AI | OpenAI GPT-4 |
| Messaging | WhatsApp Cloud API, SendGrid |
| Payments | Pagou.ai, Shield Gateway |
| Hosting | Vercel |
| Styling | Tailwind CSS v4, CSS custom properties for brand theming |

**Storage Modes:**

- `supabase` — Production (PostgreSQL via Supabase SDK)
- `local_json` — Development/testing (file-based)

---

## 2. Authentication

### Session

| Property | Value |
|----------|-------|
| Cookie name | `pagrecovery_session` |
| TTL | 7 days |
| Algorithm | HMAC-SHA256 |
| Payload | `{ sub: email, role: "admin"\|"seller", exp: timestamp }` |

### Roles

| Role | Access |
|------|--------|
| `admin` | Full platform: dashboard, admin panel, seller management, analytics, all leads |
| `seller` | CRM (own leads), inbox (own conversations), AI, calendar, connect |

### Credential Sets

The platform supports **multiple credential sets** for white-label operation:

```typescript
type CredentialSet = {
  adminEmail: string;
  adminPassword: string;
  sellerEmail: string;
  sellerPassword: string;
  sellerAgentName: string;
};
```

Primary credentials come from `PLATFORM_AUTH_*` env vars. Additional sets (e.g. Shield) come from `SHIELD_AUTH_*` env vars. Both work simultaneously on the same deployment.

### Login

```
POST /login (form action)
Fields: email, password, redirect (optional)
Response: Sets cookie, redirects to /dashboard (admin) or /leads (seller)
```

### Protected vs Public Routes

| Public | Protected |
|--------|-----------|
| `/`, `/login`, `/retry/*`, `/checkout/*` | `/dashboard`, `/admin`, `/leads`, `/inbox`, `/ai` |
| `/api/webhooks/*`, `/api/worker/run` | `/api/analytics/*`, `/api/settings/*`, `/api/health` |
| `/invite/[token]` | `/connect`, `/calendar`, `/onboarding`, `/test` |

---

## 3. White-Label / Brand System

### How It Works

The active brand is selected by `NEXT_PUBLIC_BRAND` env var (defaults to `pagrecovery`).

Brand-specific CSS custom properties are injected at `<html>` level:

```css
:root {
  --accent: #f97316;        /* or #1ed760 for PagRecovery */
  --accent-strong: #ea580c;
  --accent-soft: rgba(249, 115, 22, 0.10);
}
```

### Brand Configs

```typescript
const brands = {
  pagrecovery: {
    name: "PagRecovery",
    slug: "pagrecovery",
    accent: "#1ed760",         // green
    logo: "/brand/pagrecovery-logo.png",
    mark: "/brand/pagrecovery-mark.png",
    gateway: {
      name: "Pagou.ai",
      slug: "pagouai",
      webhookBasePath: "/api/webhooks/pagouai",
    },
  },
  shield: {
    name: "Shield Recovery",
    slug: "shield-recovery",
    accent: "#f97316",         // orange
    logo: "/brand/shield-logo.png",
    mark: "/brand/shield-mark.png",
    gateway: {
      name: "Shield Gateway",
      slug: "shield-gateway",
      webhookBasePath: "/api/webhooks/shield-gateway",
    },
  },
};
```

### Adding a New Brand

1. Add entry to `brands` object in `src/lib/platform.ts`
2. Set `NEXT_PUBLIC_BRAND=your_brand` in env
3. Add logo/mark assets to `/public/brand/`
4. Deploy — all UI adapts via CSS custom properties

---

## 4. API Reference

### 4.1 Health Check

```
GET /api/health
Auth: Admin session required
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-26T13:00:00.000Z",
  "storage_mode": "supabase",
  "database_configured": true,
  "counts": {
    "leads_total": 142,
    "leads_ativos": 34,
    "pagamentos_falhos": 89,
    "recuperados": 55,
    "taxa_recuperacao": 0.38,
    "receita_recuperada": 47230.50,
    "conversas": 28,
    "recuperacoes_ativas": 34
  },
  "webhooks": {
    "shield-gateway": "https://shield-recovery.vercel.app/api/webhooks/shield-gateway",
    "whatsapp": "https://shield-recovery.vercel.app/api/webhooks/whatsapp",
    "import": "https://shield-recovery.vercel.app/api/import",
    "worker": "https://shield-recovery.vercel.app/api/worker/run"
  },
  "integrations": {
    "pagouai": false,
    "supabase": true,
    "whatsapp": true,
    "email": true,
    "crm": true,
    "ai": true
  },
  "automation": {
    "worker_enabled": true,
    "worker_executor_configured": true,
    "cron_secret_configured": true,
    "worker_batch_size": 60,
    "worker_concurrency": 4
  }
}
```

### 4.2 Recovery Analytics

```
GET /api/analytics/recovery
Auth: Admin session required
```

**Response:**
```json
{
  "totalFailedPayments": 89,
  "activeRecoveries": 34,
  "recoveredRevenue": 47230.50,
  "recoveryRate": 0.38,
  "leadsByStatus": {
    "NEW_RECOVERY": 8,
    "CONTACTING": 12,
    "WAITING_CUSTOMER": 14,
    "RECOVERED": 55,
    "LOST": 0
  }
}
```

### 4.3 Follow-Up Contacts

```
GET /api/followups/contacts
Auth: Admin session required
```

**Response:**
```json
[
  {
    "lead_id": "uuid",
    "customer_name": "Maria Santos",
    "email": "maria@example.com",
    "phone": "+5511999998888",
    "payment_value": 197.00,
    "payment_method": "pix",
    "payment_status": "failed",
    "product": "Curso Online",
    "lead_status": "CONTACTING",
    "assigned_agent": "Carla",
    "updated_at": "2026-03-26T10:30:00Z",
    "created_at": "2026-03-25T14:00:00Z"
  }
]
```

### 4.4 Payment Retry

```
POST /api/payments/retry
Auth: Admin session required
Content-Type: application/json
```

**Request:**
```json
{
  "payment_id": "uuid (optional)",
  "gateway_payment_id": "string (optional)",
  "order_id": "string (optional)",
  "reason": "customer_requested (optional)"
}
```

**Response:**
```json
{
  "ok": true,
  "recovery_link": "https://checkout.example.com/c/xK9m2",
  "short_id": "xK9m2",
  "retry_attempt_number": 2,
  "payment_link_valid_until": "2026-03-27T13:00:00Z"
}
```

### 4.5 Bulk Import

```
POST /api/import
Auth: Admin session required
Content-Type: application/json
```

**Request:**
```json
{
  "transactions": [
    {
      "gateway_payment_id": "pay_123",
      "order_id": "order_456",
      "customer_name": "João P.",
      "customer_email": "joao@example.com",
      "customer_phone": "+5511888887777",
      "amount": 497.00,
      "payment_method": "credit_card",
      "payment_status": "failed",
      "failure_reason": "insufficient_funds",
      "product": "Mentoria Premium",
      "created_at": "2026-03-20T10:00:00Z"
    }
  ]
}
```

**Response:**
```json
{
  "ok": true,
  "imported": 1,
  "skipped": 0,
  "errors": []
}
```

### 4.6 Connection Status

```
GET /api/settings/connections
Auth: Admin session required
```

**Response:**
```json
{
  "databaseConfigured": true,
  "whatsappConfigured": true,
  "emailConfigured": true,
  "crmConfigured": true,
  "aiConfigured": true,
  "workerConfigured": true
}
```

### 4.7 Worker Execution

```
GET /api/worker/run?limit=60&concurrency=4
Auth: CRON_SECRET header or Admin session
```

**Response:**
```json
{
  "ok": true,
  "claimed": 12,
  "limit": 60,
  "concurrency": 4,
  "processed": 10,
  "skipped": 1,
  "rescheduled": 0,
  "failed": 1,
  "results": [
    {
      "jobId": "uuid",
      "queue": "notification-jobs",
      "type": "whatsapp-initial",
      "status": "processed",
      "detail": "Message sent to +5511999998888"
    }
  ],
  "runAt": "2026-03-26T13:05:00Z"
}
```

### 4.8 Checkout Session

```
POST /api/checkout/session
Auth: Admin session or API key
Content-Type: application/json
```

**Request:**
```json
{
  "amount": 497.00,
  "currency": "BRL",
  "description": "Mentoria Premium - Retry",
  "customerName": "João P.",
  "customerEmail": "joao@example.com",
  "customerPhone": "+5511888887777",
  "customerDocument": "123.456.789-00",
  "source": "recovery",
  "sourceReferenceId": "lead_uuid",
  "metadata": {}
}
```

**Response:**
```json
{
  "sessionId": "sess_abc123",
  "shortId": "xK9m2",
  "checkoutUrl": "https://checkout.example.com/c/xK9m2",
  "expiresAt": "2026-03-27T13:00:00Z"
}
```

---

## 5. Webhook Integration

### 5.1 Shield Gateway Webhook

```
POST /api/webhooks/shield-gateway
POST /api/webhooks/shield-gateway/{sellerKey}
```

**Headers:**
```
X-Webhook-ID: <unique_id>
X-Signature: <hmac_sha256_hex>
X-Timestamp: <unix_timestamp>
Content-Type: application/json
```

**Signature Verification:**
```
message = timestamp + "." + raw_body
signature = HMAC-SHA256(SHIELD_GATEWAY_WEBHOOK_SECRET, message)
```

Tolerance: ±300 seconds (configurable via `WEBHOOK_TOLERANCE_SECONDS`)

**Payload (normalized from any structure):**
```json
{
  "id": "evt_abc123",
  "event": "payment.failed",
  "data": {
    "id": "pay_xyz",
    "order_id": "order_456",
    "amount": 49700,
    "currency": "BRL",
    "status": "failed",
    "payment_method": "credit_card",
    "failure_code": "insufficient_funds",
    "customer": {
      "name": "João P.",
      "email": "joao@example.com",
      "phone": "+5511888887777",
      "document": "12345678900"
    },
    "pix": {
      "code": "00020126...",
      "qr_code": "data:image/png;base64,...",
      "expires_at": "2026-03-27T00:00:00Z"
    },
    "payment_url": "https://pay.example.com/retry/xyz",
    "metadata": {
      "product": "Mentoria Premium"
    }
  }
}
```

The normalizer recursively searches the payload for:
- PIX code, QR code, expiration
- Payment URL / retry link
- Customer info (name, email, phone, document)
- Product name

**Response:**
```json
{
  "ok": true,
  "eventId": "uuid",
  "leadId": "uuid"
}
```

### 5.2 Pagou.ai Webhook

```
POST /api/webhooks/pagouai
POST /api/webhooks/pagouai/{sellerKey}
```

Same flow as Shield Gateway but with Pagou.ai-specific normalization.

### 5.3 WhatsApp Webhook

```
GET  /api/webhooks/whatsapp  (verification challenge)
POST /api/webhooks/whatsapp  (messages & status updates)
```

**Verification (GET):**
```
?hub.mode=subscribe
&hub.verify_token=WHATSAPP_WEBHOOK_VERIFY_TOKEN
&hub.challenge=random_string
```

**Inbound Message (POST):**
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "from": "5511999998888",
          "type": "text",
          "text": { "body": "Paguei!" },
          "timestamp": "1711461600"
        }],
        "statuses": [{
          "id": "wamid.xxx",
          "status": "delivered",
          "timestamp": "1711461600"
        }]
      }
    }]
  }]
}
```

---

## 6. Recovery Engine Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PAYMENT RECOVERY PIPELINE                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. WEBHOOK RECEIVED                                                     │
│     POST /api/webhooks/{gateway}/{sellerKey?}                           │
│     ↓ HMAC verification → normalize event                               │
│                                                                          │
│  2. RECORDS CREATED                                                      │
│     → Upsert Customer (name, email, phone)                              │
│     → Upsert Payment (amount, method, status, failure_code)             │
│     → Create Lead (status: NEW_RECOVERY)                                │
│     → Assign Agent (round-robin)                                         │
│                                                                          │
│  3. WORKFLOW JOBS SCHEDULED                                              │
│     → lead-created       (immediate)                                     │
│     → whatsapp-initial   (+6 min)                                       │
│     → email-reminder     (+30 min)                                       │
│     → whatsapp-follow-up (+12 min)                                      │
│     → agent-task         (+24 hours)                                     │
│                                                                          │
│  4. WORKER PROCESSES JOBS                                                │
│     GET /api/worker/run → claims due jobs → executes                    │
│     ↓                                                                    │
│     AI classifies → selects strategy → generates message                │
│     ↓                                                                    │
│     Send via WhatsApp/Email → create conversation + messages            │
│     Lead moves: NEW_RECOVERY → CONTACTING → WAITING_CUSTOMER            │
│                                                                          │
│  5. CUSTOMER RESPONDS                                                    │
│     WhatsApp webhook → classify intent → follow-up or escalate          │
│                                                                          │
│  6. OUTCOME                                                              │
│     ✅ Payment succeeds → Lead → RECOVERED → CRM sync                   │
│     ❌ Exhausted attempts → Lead → LOST → CRM sync                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Lead Status Pipeline

| Status | Description | Next States |
|--------|-------------|-------------|
| `NEW_RECOVERY` | Just created from webhook | `CONTACTING` |
| `CONTACTING` | Initial outreach sent | `WAITING_CUSTOMER` |
| `WAITING_CUSTOMER` | Awaiting customer response | `CONTACTING`, `RECOVERED`, `LOST` |
| `RECOVERED` | Payment successful (terminal) | — |
| `LOST` | Abandoned (terminal) | — |

---

## 7. Messaging & Inbox

### Conversation Record

```typescript
{
  id: string;
  leadId?: string;
  customerId?: string;
  customerName: string;
  channel: "whatsapp" | "email" | "sms";
  contactValue: string;       // phone or email
  assignedAgentId?: string;
  status: "open" | "pending" | "closed";
  lastMessageAt: string;
  messageCount: number;
  unreadCount: number;
  createdAt: string;
}
```

### Message Record

```typescript
{
  id: string;
  conversationId: string;
  direction: "inbound" | "outbound";
  content: string;
  status: "queued" | "sent" | "delivered" | "read" | "failed";
  providerMessageId?: string;
  metadata?: {
    kind?: "recovery_prompt" | "ai_draft" | "operator_note";
    generatedBy?: "workflow" | "ai" | "operator";
    pixCode?: string;
    pixQrCode?: string;
    pixExpiresAt?: string;
    paymentUrl?: string;
    retryLink?: string;
    actionLabel?: string;
    product?: string;
    paymentValue?: number;
    paymentMethod?: string;
    paymentStatus?: string;
    failureReason?: string;
    recoveryProbability?: "high" | "medium" | "low" | "manual";
    recoveryScore?: number;
    nextAction?: string;
    tone?: string;
  };
  createdAt: string;
}
```

### Message Status Flow

```
queued → sent → delivered → read
                    ↘ failed
```

### WhatsApp Integration

| Config | Env Var |
|--------|---------|
| Access Token | `WHATSAPP_ACCESS_TOKEN` |
| Phone Number ID | `WHATSAPP_PHONE_NUMBER_ID` |
| Business Account ID | `WHATSAPP_BUSINESS_ACCOUNT_ID` |
| Verify Token | `WHATSAPP_WEBHOOK_VERIFY_TOKEN` |
| API Endpoint | `POST /v22.0/{phone_id}/messages` |

---

## 8. AI System

### Recovery Classifier

Classifies each lead for recovery probability:

```typescript
classifyRecovery(contact) => {
  probability: "high" | "medium" | "low" | "manual",
  score: 0-100,
  reasoning: string,
  suggestedStrategy: string,
}
```

Factors: payment value, method, failure reason, days since failure, customer history.

### Strategy Engine

Predefined strategies matched by payment conditions:

```typescript
type RecoveryStrategy = {
  id: string;
  name: string;
  triggerCondition: string;
  failureReasons: string[];
  steps: Array<{
    order: number;
    channel: "whatsapp" | "email" | "system";
    action: string;
    delayMinutes: number;
    template: string;
  }>;
  enabled: boolean;
};
```

### AI Orchestrator

Central decision engine that coordinates classification, strategy selection, and messaging:

```typescript
decideRecoveryPlan(context) => {
  classification: RecoveryClassification;
  strategy?: RecoveryStrategy;
  nextAction: "send_initial_message" | "ask_payment_method" | "send_pix_code"
    | "send_payment_link" | "send_follow_up" | "escalate_to_seller"
    | "schedule_retry" | "mark_recovered" | "mark_lost" | ...;
  reason: string;
  urgency: "immediate" | "today" | "scheduled" | "manual";
  channel: "whatsapp" | "email" | "system";
  tone: "empathetic" | "urgent" | "casual" | "reassuring" | "direct";
  followUpMode: "autonomous" | "supervised" | "manual";
  requiresHuman: boolean;
  shouldGeneratePaymentLink: boolean;
}
```

### Message Generation

~50 templates with conditional matching:
- By channel (WhatsApp, email, SMS)
- By tone (empathetic, urgent, casual, reassuring, direct)
- By action (initial contact, follow-up, insufficient funds, send PIX)
- By context (cart value, attempt number, failure reason)

OpenAI GPT-4 is used for:
- Inbound message intent classification
- Contextual reply generation (beyond templates)
- Real-time conversation analysis

---

## 9. Checkout & Payment Retry

### Checkout Flow

1. Platform creates checkout session via internal API
2. Returns `shortId` and `checkoutUrl`
3. Customer is redirected to checkout page
4. On payment success → webhook fires → lead marked RECOVERED

### Retry Page

```
GET /retry/{gatewayPaymentId}
```

Public page showing:
- PIX QR Code (scannable)
- PIX copy-and-paste code
- Payment amount and product info
- Expiration countdown

### Checkout Platform Integration

```
POST {CHECKOUT_PLATFORM_URL}/api/v1/sessions
Headers: X-API-Key: {CHECKOUT_PLATFORM_API_KEY}
```

---

## 10. Worker / Cron System

### Job Queues

| Queue | Purpose |
|-------|---------|
| `recovery-jobs` | Lead workflow: creation, assignment, webhook processing |
| `payment-retry-jobs` | Payment retry link generation |
| `notification-jobs` | WhatsApp, email, SMS sending |

### Job Record

```typescript
{
  id: string;
  queueName: "recovery-jobs" | "payment-retry-jobs" | "notification-jobs";
  jobType: string;
  payload: Record<string, unknown>;
  runAt: string;           // When to execute (ISO timestamp)
  attempts: number;        // Remaining retries (default 3)
  status: "scheduled" | "processing" | "processed" | "failed";
  error?: string;
  createdAt: string;
}
```

### Default Job Schedule (per lead)

| Job | Delay | Queue |
|-----|-------|-------|
| `lead-created` | Immediate | recovery-jobs |
| `whatsapp-initial` | +6 min | notification-jobs |
| `email-reminder` | +30 min | notification-jobs |
| `whatsapp-follow-up` | +12 min | notification-jobs |
| `agent-task` | +24 hours | recovery-jobs |

### Triggering the Worker

**Option 1 — Vercel Cron:**
```json
// vercel.json
{
  "crons": [{
    "path": "/api/worker/run",
    "schedule": "*/5 * * * *"
  }]
}
```

**Option 2 — External Cron:**
```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://shield-recovery.vercel.app/api/worker/run?limit=60&concurrency=4"
```

**Option 3 — Manual (Admin):**
```
GET /api/worker/run  (with admin session cookie)
```

---

## 11. Page Routes & Roles

| Route | Roles | Description |
|-------|-------|-------------|
| `/` | Public | Landing page with live metrics, demo, calculator |
| `/login` | Public | Email/password login form |
| `/retry/[gatewayPaymentId]` | Public | PIX retry page (QR + copy code) |
| `/checkout/[shortId]` | Public | Redirect to checkout platform |
| `/invite/[token]` | Public | Seller invite acceptance form |
| `/onboarding` | Admin, Seller | Setup guide and documentation |
| `/dashboard` | Admin | KPIs, recovery chart, priority queue, channel stats |
| `/leads` | Admin, Seller | CRM: list + kanban view, lead detail, stage transitions |
| `/leads/[leadId]` | Admin, Seller | Lead detail: timeline, messages, metadata, actions |
| `/inbox` | Admin, Seller | Conversations: queue, thread, context panel, AI reply |
| `/ai` | Admin, Seller | AI dashboard: classifications, strategies, activity log |
| `/calendar` | Admin, Seller | Calendar: daily notes, revenue tracking, activities |
| `/connect` | Admin, Seller | Integration setup: webhooks, WhatsApp, API keys |
| `/admin` | Admin | Seller management, invites, controls, queue overview |
| `/test` | Admin | Testing interface for simulated events |

---

## 12. Server Actions

### Auth Actions

| Action | Input | Effect |
|--------|-------|--------|
| `loginAction` | email, password, redirect | Creates session cookie, redirects |
| `logoutAction` | — | Clears cookie, redirects to /login |

### Recovery Actions

| Action | Input | Effect |
|--------|-------|--------|
| `transitionLeadStage` | leadId, status, intent | Moves lead in pipeline or starts recovery flow |
| `registerConversationReply` | conversationId, content | Creates manual outbound message |
| `sendAiConversationReply` | conversationId | AI generates and sends contextual reply |
| `changeConversationStatus` | conversationId, status | Updates conversation to open/pending/closed |

### Admin Actions

| Action | Input | Effect |
|--------|-------|--------|
| `saveSellerUserAction` | email, displayName, agentName, password, active | Creates/updates seller login |
| `createSellerInviteAction` | email, agentName, note, expiresInDays | Generates invite token with expiration |
| `saveSellerControlAction` | sellerKey, recoveryTargetPercent, autonomyMode, maxAssignedLeads, ... | Controls seller settings and features |

---

## 13. Database Schema

### Core Tables

| Table | Key Fields |
|-------|-----------|
| `payments` | id, gateway_payment_id, order_id, customer_id, amount, currency, payment_method, status, failure_code |
| `customers` | id, name, email, phone, document |
| `recovery_leads` | id, payment_id, customer_id, status (pipeline), assigned_agent, product |
| `conversations` | id, lead_id, customer_id, channel, contact_value, status, message_count, unread_count |
| `messages` | id, conversation_id, direction, content, status, provider_message_id, metadata |
| `webhook_events` | id, source, event_type, payload, processing_status |
| `queue_jobs` | id, queue_name, job_type, payload, run_at, attempts, status |
| `agents` | id, name, email, active |
| `seller_admin_controls` | seller_key, recovery_target_percent, autonomy_mode, max_assigned_leads, inbox_enabled, automations_enabled |
| `seller_users` | id, email, display_name, agent_name, password_hash, active |
| `seller_invites` | id, email, agent_name, token, expires_at, accepted_at |
| `calendar_notes` | id, date, lane, content, created_by |
| `connection_settings` | key, value, updated_at |

---

## 14. Iframe Integration Guide

### Option A — Embed Full Platform

Embed the entire authenticated platform inside an iframe:

```html
<iframe
  id="shield-recovery"
  src="https://shield-recovery.vercel.app/login"
  width="100%"
  height="100vh"
  style="border: none; min-height: 100vh;"
  allow="clipboard-write"
></iframe>
```

**Authentication Flow:**

1. Parent page redirects iframe to `/login`
2. User logs in → session cookie set inside iframe
3. After login, iframe navigates to `/dashboard` or `/leads`

**Auto-login via URL (if implementing):**

To bypass manual login from the parent app, you can create an auto-login endpoint:

```
GET /api/auth/token?email=admin@shield.local&token=pre-shared-token
→ Sets session cookie and redirects to desired page
```

*(Not implemented yet — requires custom endpoint)*

### Option B — Embed Specific Pages

Embed individual pages with hash routing:

```html
<!-- Dashboard only -->
<iframe src="https://shield-recovery.vercel.app/dashboard" ...></iframe>

<!-- CRM only -->
<iframe src="https://shield-recovery.vercel.app/leads" ...></iframe>

<!-- Inbox only -->
<iframe src="https://shield-recovery.vercel.app/inbox" ...></iframe>

<!-- Public retry page (no auth needed) -->
<iframe src="https://shield-recovery.vercel.app/retry/{gatewayPaymentId}" ...></iframe>
```

### Option C — API-Only Integration (Headless)

Use the APIs without the UI:

```javascript
// 1. Send payment webhook
await fetch("https://shield-recovery.vercel.app/api/webhooks/shield-gateway", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Webhook-ID": crypto.randomUUID(),
    "X-Signature": hmacSha256(secret, timestamp + "." + body),
    "X-Timestamp": Math.floor(Date.now() / 1000).toString(),
  },
  body: JSON.stringify(paymentEvent),
});

// 2. Check recovery analytics (needs auth cookie)
const analytics = await fetch("/api/analytics/recovery", {
  credentials: "include",
});

// 3. Trigger worker manually
await fetch("/api/worker/run?limit=60", {
  headers: { "Authorization": `Bearer ${CRON_SECRET}` },
});
```

### Iframe Configuration Notes

**Required Headers (Vercel):**

Add to `vercel.json` to allow iframe embedding:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "ALLOWALL"
        },
        {
          "key": "Content-Security-Policy",
          "value": "frame-ancestors 'self' https://your-parent-domain.com"
        }
      ]
    }
  ]
}
```

**Or in `next.config.ts`:**

```typescript
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://your-parent-domain.com",
          },
        ],
      },
    ];
  },
};
```

**Cookie Configuration for Iframe:**

Since the iframe is cross-origin, cookies need `SameSite=None; Secure`:

```typescript
// In session.ts cookie options:
{
  httpOnly: true,
  secure: true,
  sameSite: "none",  // Required for cross-origin iframe
  path: "/",
  maxAge: 7 * 24 * 60 * 60,
}
```

### PostMessage Communication (Parent ↔ Iframe)

For the parent app to communicate with the embedded platform:

**Iframe sends events to parent:**
```javascript
// Inside Shield Recovery (add to layout or specific pages)
window.parent.postMessage({
  type: "shield:navigation",
  path: "/leads",
  leadCount: 34,
}, "*");

window.parent.postMessage({
  type: "shield:recovery",
  leadId: "uuid",
  status: "RECOVERED",
  amount: 497.00,
}, "*");
```

**Parent listens:**
```javascript
window.addEventListener("message", (event) => {
  if (event.origin !== "https://shield-recovery.vercel.app") return;

  const { type, ...data } = event.data;

  switch (type) {
    case "shield:navigation":
      console.log("User navigated to", data.path);
      break;
    case "shield:recovery":
      console.log("Lead recovered!", data.leadId, data.amount);
      break;
  }
});
```

**Parent sends commands to iframe:**
```javascript
const iframe = document.getElementById("shield-recovery");

// Navigate iframe to specific page
iframe.contentWindow.postMessage({
  type: "parent:navigate",
  path: "/leads/uuid-here",
}, "https://shield-recovery.vercel.app");

// Set theme
iframe.contentWindow.postMessage({
  type: "parent:theme",
  theme: "dark",
}, "https://shield-recovery.vercel.app");
```

### Recommended Iframe Dimensions

| View | Min Width | Min Height |
|------|-----------|------------|
| Full platform | 1024px | 768px |
| Dashboard | 800px | 600px |
| CRM (leads) | 900px | 700px |
| Inbox | 1024px | 700px |
| Retry page | 400px | 600px |

### Mobile Responsive

The platform is fully responsive. For mobile embedding:

```html
<iframe
  src="https://shield-recovery.vercel.app/leads"
  style="width: 100%; height: 100vh; border: none;"
></iframe>
```

The mobile bottom nav activates at `< 768px` width.

---

## 15. Environment Variables

### Required

```env
# Auth
PLATFORM_AUTH_EMAIL=admin@pagrecovery.local
PLATFORM_AUTH_PASSWORD=secure-password
PLATFORM_AUTH_SECRET=long-random-secret-for-jwt

# Brand
NEXT_PUBLIC_BRAND=shield
NEXT_PUBLIC_APP_URL=https://shield-recovery.vercel.app
```

### Database

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Seller Auth

```env
PLATFORM_SELLER_AUTH_EMAIL=seller@pagrecovery.local
PLATFORM_SELLER_AUTH_PASSWORD=seller-password
PLATFORM_SELLER_AGENT_NAME=Carla

# Additional credential set (Shield)
SHIELD_AUTH_EMAIL=admin@shieldrecovery.local
SHIELD_AUTH_PASSWORD=ShieldAdmin@2026!
SHIELD_SELLER_AUTH_EMAIL=seller@shieldrecovery.local
SHIELD_SELLER_AUTH_PASSWORD=ShieldSeller@2026!
SHIELD_SELLER_AGENT_NAME=Carla
```

### Integrations

```env
# Payment Gateway
SHIELD_GATEWAY_WEBHOOK_SECRET=webhook-secret
WEBHOOK_TOLERANCE_SECONDS=300

# WhatsApp
WHATSAPP_ACCESS_TOKEN=EAA...
WHATSAPP_PHONE_NUMBER_ID=12345
WHATSAPP_BUSINESS_ACCOUNT_ID=67890
WHATSAPP_WEBHOOK_VERIFY_TOKEN=verify-token

# Email
SENDGRID_API_KEY=SG.xxx

# AI
OPENAI_API_KEY=sk-xxx

# CRM
SHIELD_LEAD_API_URL=https://crm.example.com/api
SHIELD_LEAD_API_KEY=api-key

# Checkout
CHECKOUT_PLATFORM_URL=https://checkout.example.com
CHECKOUT_PLATFORM_API_KEY=api-key
```

### Worker

```env
WORKER_AUTH_TOKEN=worker-token
CRON_SECRET=cron-secret
SHIELD_WORKER_BATCH_SIZE=60
SHIELD_WORKER_CONCURRENCY=4
```

### Optional

```env
SHIELD_ENABLE_EXPERIMENTAL_UI=false
PAGOUAI_ENVIRONMENT=production
PAGOUAI_SECRET_KEY=key
NEXT_PUBLIC_PAGOUAI_PUBLIC_KEY=key
PAGOUAI_API_BASE_URL=https://api.pagou.ai
```

---

## 16. File Structure

```
src/
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # Root layout (brand injection, dark mode)
│   ├── globals.css                   # Theme system (light/dark, custom properties)
│   ├── page.tsx                      # Landing page
│   ├── login/page.tsx                # Login form
│   ├── icon.svg                      # Favicon (brand-colored)
│   ├── actions/
│   │   ├── auth-actions.ts           # login, logout
│   │   └── recovery-actions.ts       # lead transitions, messaging, admin
│   ├── api/
│   │   ├── health/route.ts           # Platform health check
│   │   ├── analytics/recovery/       # Recovery analytics
│   │   ├── checkout/                 # Checkout session, process, track
│   │   ├── followups/contacts/       # Follow-up contact list
│   │   ├── import/route.ts           # Bulk transaction import
│   │   ├── payments/retry/           # Payment retry
│   │   ├── settings/connections/     # Integration status
│   │   ├── webhooks/
│   │   │   ├── pagouai/              # Pagou.ai webhook
│   │   │   ├── shield-gateway/       # Shield Gateway webhook
│   │   │   └── whatsapp/             # WhatsApp Cloud API webhook
│   │   └── worker/run/               # Background job worker
│   ├── admin/page.tsx                # Seller management
│   ├── ai/page.tsx                   # AI dashboard
│   ├── calendar/page.tsx             # Calendar view
│   ├── checkout/[shortId]/page.tsx   # Checkout redirect
│   ├── connect/page.tsx              # Integration setup
│   ├── dashboard/page.tsx            # KPI dashboard
│   ├── inbox/page.tsx                # Conversations
│   ├── invite/[token]/page.tsx       # Seller invite
│   ├── leads/
│   │   ├── page.tsx                  # CRM list/kanban
│   │   └── [leadId]/page.tsx         # Lead detail
│   ├── onboarding/page.tsx           # Setup guide
│   ├── retry/[gatewayPaymentId]/     # PIX retry page
│   └── test/page.tsx                 # Testing interface
│
├── server/
│   ├── auth/
│   │   ├── core.ts                   # JWT, credentials, roles
│   │   ├── session.ts                # Cookie management
│   │   ├── identities.ts            # User/seller identity
│   │   ├── passwords.ts             # Hashing
│   │   └── request.ts               # HTTP auth
│   └── recovery/
│       ├── types.ts                  # All type definitions
│       ├── config.ts                 # Environment & bootstrap
│       ├── services/
│       │   ├── payment-recovery-service.ts  # Core recovery logic
│       │   ├── messaging-service.ts         # Conversations & messages
│       │   ├── recovery-worker-service.ts   # Job processing
│       │   └── storage/                     # Supabase & JSON adapters
│       ├── controllers/              # Route handler logic
│       ├── ai/
│       │   ├── recovery-classifier.ts       # Lead scoring
│       │   ├── strategy-engine.ts           # Strategy matching
│       │   ├── message-generator.ts         # Template engine
│       │   └── orchestrator.ts              # Decision engine
│       ├── crm/                      # External CRM sync
│       ├── queues/                   # Job scheduling
│       └── webhooks/                 # Event normalization
│
├── components/
│   ├── platform/
│   │   ├── platform-shell.tsx        # Layout: sidebar, header, cards
│   │   ├── platform-logo.tsx         # Brand logo component
│   │   ├── pagrecovery-mark.tsx      # PagRecovery SVG mark
│   │   └── recovery-command-center.tsx
│   ├── landing/
│   │   ├── live-demo.tsx             # Animated demo
│   │   └── recovery-calculator.tsx   # Revenue calculator
│   └── ui/
│       ├── message-bubble.tsx        # Chat message display
│       ├── recovery-chart.tsx        # SVG line chart
│       ├── toast.tsx                 # Toast notifications
│       ├── status-badge.tsx          # Status pill
│       ├── stage-badge.tsx           # Pipeline stage badge
│       ├── theme-toggle.tsx          # Light/dark toggle
│       └── ...
│
├── lib/
│   ├── platform.ts                   # Brand config & selection
│   ├── stage.ts                      # Lead stage utilities
│   ├── format.ts                     # Currency, date formatting
│   ├── contact.ts                    # Contact utilities
│   └── utils.ts                      # cn() classname helper
│
└── middleware.ts                      # Auth guard & routing
```

---

## Quick Start for Iframe Integration

1. **Set frame headers** in `vercel.json` or `next.config.ts` to allow your domain
2. **Update cookie SameSite** to `none` in `src/server/auth/session.ts` for cross-origin
3. **Embed the iframe** in your parent app pointing to `/login` or a specific page
4. **Register your webhook** endpoint to receive payment events
5. **Configure the worker** via cron or manual trigger
6. **Optionally implement PostMessage** for parent ↔ iframe communication

---

*Generated for Shield Recovery v1.0 — Last updated: 2026-03-26*
