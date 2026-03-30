# Shield Recovery / PagRecovery — Developer Guide

## What is this?

White-label payment recovery platform. One codebase, two Vercel deployments:
- **PagRecovery** (`pagrecovery.com`) — auto-deploys from GitHub `origin/main`
- **Shield Recovery** (`shield-recovery.vercel.app`) — manual `vercel deploy --prod`

## Quick Start

```bash
npm install --legacy-peer-deps   # if peer dep conflicts
npm run dev                       # http://localhost:3000
npm run test                      # vitest security tests
```

## Architecture

```
Gateway webhook → Recovery Engine → AI Dispatch (WhatsApp/Email)
                                          ↓
                                   Customer clicks retry link
                                          ↓
                                   Checkout Platform (PagRecovery Checkout)
                                          ↓
                                   Split calculation → Payout
```

### Two Deployments, One Repo

| Remote | Repo | Deploy |
|--------|------|--------|
| `origin` | `gtdotwav/PAGRECOVERY.git` | Auto-deploy on push |
| `shieldrecovery-origin` | `gtdotwav/shieldrecovery.git` | `vercel deploy --prod` |

### Push Workflow

```bash
git pull --rebase origin main
git push origin main
git push shieldrecovery-origin main
vercel deploy --prod  # shield-recovery only
```

## Key Directories

```
src/
├── app/                    # Next.js App Router pages + API routes
│   ├── actions/            # Server actions (auth, quiz, split, payout)
│   ├── api/                # REST endpoints
│   │   ├── agent/          # Autonomous recovery agent (cron)
│   │   ├── auth/           # Token endpoint
│   │   ├── checkout/       # Checkout API (deprecated, use PagRecovery Checkout)
│   │   ├── debug/          # Protected debug tools
│   │   ├── webhooks/       # Payment gateway webhooks
│   │   └── worker/         # Background job runner
│   ├── admin/              # Admin dashboard
│   ├── retry/[id]/         # Customer retry payment page
│   └── webhooks/           # Webhook route handlers (legacy paths)
├── server/
│   ├── auth/               # HMAC session tokens, RBAC, passwords
│   ├── checkout.ts         # Checkout platform API client
│   ├── checkout-admin.ts   # Split/payout admin API client
│   ├── recovery/
│   │   ├── ai/             # Autonomous agent, cadence engine, message gen
│   │   ├── controllers/    # Route controllers (webhook, worker, agent)
│   │   ├── services/       # Core services (storage, messaging, worker)
│   │   └── utils/          # CORS, logging, webhook signatures
│   └── pagouai/            # PagouAi gateway SDK
├── lib/
│   └── platform.ts         # Brand config (accent colors, gateway slugs)
└── components/             # React UI components
```

## Auth System

- Custom HMAC-SHA256 signed tokens (not JWT)
- Stored in httpOnly cookie `pagrecovery_session`, 7-day TTL
- Two roles: `admin`, `seller`
- Password hashing: scrypt with per-user random salt (+ legacy backward compat)
- Rate limiting: 5 req/min on `/api/auth/token`

## Cron Jobs (vercel.json)

| Path | Schedule | Purpose |
|------|----------|---------|
| `/api/worker/run` | Every minute | Process queued recovery jobs |
| `/api/agent/orchestrate` | Every 5 min | Autonomous agent lifecycle |

Both require `CRON_SECRET` Bearer token.

## Database

Supabase (PostgreSQL). Schema in `supabase/schema.sql` + `supabase/migrations/`.

28 tables total. Key ones:
- `payments`, `customers` — payment data from gateway
- `recovery_leads` — leads in recovery flow
- `conversations`, `messages` — WhatsApp/email threads
- `queue_jobs` — background job queue
- `follow_up_cadences` — AI-scheduled follow-up steps
- `seller_admin_controls` — per-seller config
- `seller_users`, `seller_invites` — multi-tenant auth

## External Services

| Service | Purpose | Env Vars |
|---------|---------|----------|
| Supabase | Database | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| PagRecovery Checkout | Checkout platform | `CHECKOUT_PLATFORM_URL`, `CHECKOUT_PLATFORM_API_KEY` |
| WhatsApp Cloud API | Messaging | `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` |
| SendGrid | Email | `SENDGRID_API_KEY` |
| OpenAI/Claude | AI message gen | `OPENAI_API_KEY` |
| PagouAi | Payment gateway | `PAGOUAI_SECRET_KEY` |
| VAPI | Voice calls | `VAPI_API_KEY` |

## Testing

```bash
npm run test        # vitest run (52 security tests)
npm run test:watch  # vitest watch mode
```

Tests in `tests/security/` cover: auth, API routes, injection prevention, input validation.

## Security

- All secrets via env vars (never hardcoded)
- HMAC webhook signature verification
- Timing-safe secret comparisons
- Security headers (HSTS, X-Frame-Options, CSP)
- PostgREST filter value sanitization
- Rate limiting on auth endpoints
- CORS restricted to configured domain

## Common Tasks

### Add a new seller
Admin dashboard → Sellers tab → Invite

### Change split fee
Admin dashboard → Financeiro tab → Edit fee % (calls PagRecovery Checkout admin API)

### Debug a webhook
Requires CRON_SECRET: `GET /api/debug/process-webhook?action=check&id=<webhookId>`

### Check worker health
`GET /api/health` (admin auth required)
