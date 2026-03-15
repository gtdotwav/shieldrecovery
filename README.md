# Shield Recovery

Shield Recovery is a payment recovery platform embedded into Shield Lead.

The product has two layers:

- public product presentation at `/`
- operational platform for recovery at `/dashboard`, `/connect`, `/leads` and `/inbox`

## Current V1 scope

The V1 that should go live is:

- `/`
- `/dashboard`
- `/connect`
- `/leads`
- `/leads/[leadId]`
- `/inbox`
- `/api/webhooks/shield-gateway`
- `/api/webhooks/whatsapp`
- `/api/import`
- `/api/health`
- `/api/analytics/recovery`
- `/api/followups/contacts`
- `/api/payments/retry`
- `/api/settings/connections`

Experimental areas are hidden by default:

- `/ai`
- `/test`

To expose experimental pages locally:

```bash
SHIELD_ENABLE_EXPERIMENTAL_UI=true
```

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase (Postgres via `supabase-js`)
- Framer Motion
- Lucide React

## Project structure

```text
src/
  app/                         Next.js pages and API routes
  components/
    platform/                  product-specific UI
    ui/                        reusable generic UI
  lib/                         shared frontend helpers
  server/
    recovery/                  backend domain
      ai/                      experimental AI layer
      controllers/             request handlers used by routes
      crm/                     Shield Lead lead orchestration
      queues/                  scheduled job builders
      services/                storage, messaging, automation, recovery
      types.ts                 domain types
      utils/                   error, signature and logging helpers
      webhooks/                payload normalization
supabase/
  schema.sql                   relational schema for the operational database
data/
  shield-recovery.local.json   fallback local persistence
docs/
  *.md                         product and cleanup analysis
```

## Runtime model

### Official API surface

Use `/api/*` as the public integration surface.

Main endpoints:

- `POST /api/webhooks/shield-gateway`
- `POST /api/webhooks/whatsapp`
- `GET /api/webhooks/whatsapp`
- `POST /api/import`
- `GET /api/health`
- `GET /api/analytics/recovery`
- `GET /api/followups/contacts`
- `POST /api/payments/retry`
- `GET /api/settings/connections`
- `POST /api/settings/connections`

Legacy paths still exist for compatibility, but new integrations should point only to `/api/*`.

### Request flow

1. Next.js route receives the request.
2. A controller in `src/server/recovery/controllers` handles validation and response shape.
3. `PaymentRecoveryService` coordinates normalization, persistence, lead creation and automation scheduling.
4. Messaging and CRM helpers translate business decisions into platform records.

## Persistence

The current project is aligned around Supabase credentials:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

If those variables are present, the app runs in `supabase` mode.

If not, it falls back to local JSON:

- local: `data/shield-recovery.local.json`
- serverless preview fallback: `/tmp/shield-recovery-store.json`

This means:

- local demos work without a database
- production should use Supabase
- connection settings can now be maintained from `/connect` and are persisted in the current storage backend

## Connection management

The `/connect` page is now a real configuration surface for:

- workspace base URL and gateway secret
- WhatsApp API / Web API values
- email provider values
- Shield Lead CRM URL and key
- OpenAI key

Those settings are persisted in storage and exposed through:

- `GET /api/settings/connections`
- `POST /api/settings/connections`

Important:

- the database bootstrap itself still depends on environment variables so the app can start
- after startup, operational connections are managed through the platform UI and saved in storage

## Environment variables

```bash
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3001

SHIELD_GATEWAY_WEBHOOK_SECRET=shield_preview_secret
WEBHOOK_TOLERANCE_SECONDS=300

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

WHATSAPP_ACCESS_TOKEN=your-whatsapp-access-token
WHATSAPP_PHONE_NUMBER_ID=your-whatsapp-phone-number-id
WHATSAPP_BUSINESS_ACCOUNT_ID=your-whatsapp-business-account-id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-whatsapp-webhook-verify-token

SENDGRID_API_KEY=your-sendgrid-api-key

SHIELD_LEAD_API_URL=https://shieldlead.example.com/api
SHIELD_LEAD_API_KEY=your-shield-lead-api-key

OPENAI_API_KEY=your-openai-api-key

SHIELD_ENABLE_EXPERIMENTAL_UI=false
```

## Webhook contract

Official Shield Gateway webhook:

- local: `POST http://127.0.0.1:3001/api/webhooks/shield-gateway`

Required headers:

- `X-Signature`
- `X-Webhook-ID`
- `X-Timestamp`

Signature format:

```text
sha256=<hmac_sha256("${timestamp}.${rawBody}")>
```

## Current functional status

Already working:

- Shield Gateway webhook intake
- payload normalization
- lead creation and status updates
- retry link generation
- inbox persistence for inbound/outbound records
- operational dashboard, CRM and connect surfaces
- WhatsApp webhook intake

Not complete yet:

- real outbound WhatsApp sending from the platform
- real worker execution for scheduled jobs
- production-ready automation execution layer
- final checkout handoff in the retry page

## Local development

```bash
npm install
npm run dev
```

Open:

- [http://127.0.0.1:3000](http://127.0.0.1:3000)

If you want the app on a custom port:

```bash
npm run dev -- --port 3011
```

## Validation

```bash
npm run lint
./node_modules/.bin/tsc --noEmit
```

The release should be considered ready only when both pass and the V1 routes respond correctly.

## Delivery recommendation

To ship fast, keep the release focused on:

- recovery intake
- CRM workflow
- inbox workflow
- integration setup
- analytics

Do not position the current release as if AI automation workers were already executing live recovery by themselves.
