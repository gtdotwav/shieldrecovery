# Operacional de Produção — Shield Recovery / PagRecovery

> Atualizado: 30 de março de 2026

## 1. Fluxo Completo (Recovery → Disparo → Checkout → Split)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. DETECÇÃO                                                      │
│    Gateway (PagouAi/Shield) → webhook → /webhooks/pagouai/[key] │
│    Verificação HMAC → Dedup → Armazena em webhook_events        │
│    Cria job na fila (queue_jobs) com 3 retries                  │
├─────────────────────────────────────────────────────────────────┤
│ 2. PROCESSAMENTO (Worker — a cada 1 min)                        │
│    /api/worker/run → RecoveryWorkerService.runDueJobs()         │
│    Job webhook-process → normaliza evento → cria/atualiza:     │
│      • Customer (customers)                                     │
│      • Payment (payments)                                       │
│      • Recovery Lead (recovery_leads, status: NEW_RECOVERY)     │
│    Agenda 3 jobs de follow-up:                                  │
│      • WhatsApp inicial (6 min)                                 │
│      • Email reminder (30 min)                                  │
│      • Agent checkpoint (24h)                                   │
├─────────────────────────────────────────────────────────────────┤
│ 3. DISPARO (Worker executa jobs agendados)                      │
│    whatsapp-initial → AI gera mensagem + link de checkout       │
│    email-reminder → HTML email via SendGrid                     │
│    Mensagem inclui: /retry/{gatewayPaymentId}                   │
├─────────────────────────────────────────────────────────────────┤
│ 4. AGENTE AUTÔNOMO (a cada 5 min)                               │
│    /api/agent/orchestrate → AutonomousAgent.tick()              │
│    7 estágios:                                                  │
│      1. Processa mensagens inbound (Claude AI reply)            │
│      2. Executa cadência due (follow-ups agendados)             │
│      3. Agenda cadências para novos leads                       │
│      4. Processa transcrições de calls                          │
│      5. Atualiza recovery scores                                │
│      6. Escalação para humano se necessário                     │
│      7. Fecha leads exauridos (7+ dias sem engajamento)         │
├─────────────────────────────────────────────────────────────────┤
│ 5. CHECKOUT (quando cliente clica no link)                      │
│    /retry/{id} → createCheckoutSession() → Substratum           │
│    Redirect para checkout hosted                                │
│    Pagamento PIX/Cartão processado no Substratum                │
├─────────────────────────────────────────────────────────────────┤
│ 6. CONFIRMAÇÃO                                                   │
│    Gateway (PagouAi) → webhook payment_succeeded                │
│    Lead status → RECOVERED, Payment → recovered_at = NOW()      │
│    Conversa fechada, automação pausada                          │
├─────────────────────────────────────────────────────────────────┤
│ 7. SPLIT (automático no Substratum)                             │
│    Cada pagamento → split baseado em fee % (global ou override) │
│    Valor retido por holdPeriodDays                              │
│    Merchant solicita payout → admin aprova → PIX enviado        │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Env Vars — Status por Projeto

### Shield Recovery (shield-recovery.vercel.app)

| Env Var | Configurada? | Necessária para |
|---------|:----------:|-----------------|
| `CRON_SECRET` | ✅ | Worker + Agent auth |
| `WORKER_AUTH_TOKEN` | ✅ | Worker legacy auth |
| `PLATFORM_AUTH_SECRET` | ✅ | Sessões HMAC |
| `PLATFORM_AUTH_EMAIL` | ✅ | Login admin |
| `PLATFORM_AUTH_PASSWORD` | ✅ | Login admin |
| `PLATFORM_SELLER_AUTH_EMAIL` | ✅ | Login seller |
| `PLATFORM_SELLER_AUTH_PASSWORD` | ✅ | Login seller |
| `PLATFORM_SELLER_AGENT_NAME` | ✅ | Agent name |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Database |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Database |
| `SHIELD_GATEWAY_WEBHOOK_SECRET` | ✅ | Webhook HMAC |
| `CHECKOUT_PLATFORM_URL` | ✅ | Checkout redirect |
| `CHECKOUT_PLATFORM_API_KEY` | ✅ | Checkout API |
| `OPENAI_API_KEY` | ✅ | AI messages |
| `NEXT_PUBLIC_BRAND` | ✅ | Brand config |
| `NEXT_PUBLIC_APP_URL` | ✅ | CORS + base URL |
| `QUICK_ACCESS_ADMIN_PASS` | ✅ | Quick login |
| `QUICK_ACCESS_SELLER_PASS` | ✅ | Quick login |
| `ADMIN_API_SECRET` | ✅ | Split admin API |
| `VAPI_API_KEY` | ✅ | Voice calls |
| `WHATSAPP_ACCESS_TOKEN` | ❌ | WhatsApp envio |
| `WHATSAPP_PHONE_NUMBER_ID` | ❌ | WhatsApp envio |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | ❌ | WhatsApp envio |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | ❌ | WhatsApp inbound |
| `SENDGRID_API_KEY` | ❌ | Email envio |
| `PAGOUAI_SECRET_KEY` | ❌ | Gateway auth |
| `PAGOUAI_ENVIRONMENT` | ❌ | Gateway env |

### PagRecovery (pagrecovery.com)

Verificar via `vercel env ls --project pagrecovery` — mesmas vars necessárias.

## 3. Checklist para o Fluxo Funcionar End-to-End

### Mínimo Viável (Recovery + Checkout)
- [x] Supabase configurado (URL + service role key)
- [x] Auth configurado (secret + credentials)
- [x] CRON_SECRET configurado
- [x] Checkout Platform configurado (URL + API key)
- [x] Crons ativos no vercel.json (worker + agent)
- [ ] Gateway webhook apontando para `/webhooks/pagouai/[sellerKey]`
- [ ] PAGOUAI_SECRET_KEY configurado no Vercel
- [ ] Seller criado no admin com gateway_slug + checkout configs

### Disparo WhatsApp
- [ ] WHATSAPP_ACCESS_TOKEN no Vercel
- [ ] WHATSAPP_PHONE_NUMBER_ID no Vercel
- [ ] WHATSAPP_BUSINESS_ACCOUNT_ID no Vercel
- [ ] WHATSAPP_WEBHOOK_VERIFY_TOKEN no Vercel
- [ ] Webhook do WhatsApp apontando para `/webhooks/whatsapp`

### Disparo Email
- [ ] SENDGRID_API_KEY no Vercel

### AI (Agente Autônomo)
- [x] OPENAI_API_KEY configurado
- [x] Agent orchestrate cron ativo

### Split/Payout
- [x] CHECKOUT_PLATFORM_URL configurado
- [x] ADMIN_API_SECRET configurado
- [x] Split config definido no Substratum
- [ ] Fee % definido para cada seller (admin → Financeiro)

## 4. Tabelas do Banco (28 total)

### Core (Supabase principal)
| Tabela | Registros | Propósito |
|--------|-----------|-----------|
| `customers` | - | Clientes do gateway |
| `payments` | - | Pagamentos rastreados |
| `payment_attempts` | - | Tentativas de retry |
| `webhook_events` | - | Webhooks recebidos |
| `recovery_leads` | - | Leads em recuperação |
| `conversations` | - | Threads de conversa |
| `messages` | - | Mensagens individuais |
| `queue_jobs` | - | Fila de jobs background |
| `agents` | - | Agentes de recuperação |
| `follow_up_cadences` | - | Steps de cadência |
| `recovery_insights` | - | Insights extraídos pela IA |
| `agent_runs` | - | Log de execuções do agente |
| `calls` | - | Chamadas de voz |
| `call_events` | - | Eventos de chamada |
| `call_campaigns` | - | Campanhas de ligação |
| `callcenter_settings` | - | Config por seller |
| `connection_settings` | 1 | Config global de integração |
| `seller_admin_controls` | - | Config admin por seller |
| `seller_users` | - | Usuários sellers |
| `seller_invites` | - | Convites pendentes |
| `whitelabel_profiles` | - | Perfis white-label |
| `quiz_leads` | - | Leads do quiz da landing |
| `demo_call_leads` | - | Leads demo call |
| `calendar_notes` | - | Notas do calendário |
| `system_logs` | - | Logs do sistema |

### Checkout (Supabase separado — Substratum)
| Tabela | Propósito |
|--------|-----------|
| `checkout_sessions` | Sessões de pagamento |
| `checkout_payment_providers` | Providers configurados |
| `checkout_tracking_events` | Analytics |

## 5. Segurança (Implementada)

- [x] Senhas via env vars (zero hardcoded)
- [x] HMAC webhook verification
- [x] Timing-safe secret comparisons
- [x] Security headers (HSTS, X-Frame-Options, X-Content-Type-Options)
- [x] PostgREST filter sanitization (anti SQL injection)
- [x] Rate limiting auth endpoint (5 req/min)
- [x] CORS restrito ao domínio configurado
- [x] Debug route protegida com CRON_SECRET
- [x] CRON_SECRET obrigatório (deny se não configurado)
- [x] Password hashing com salt aleatório por usuário
- [x] Open redirect prevention no checkout retry
- [x] 52 testes de segurança automatizados

## 6. Deploy

```bash
# Commit + push para ambos
git add <files>
git commit -m "description"
git pull --rebase origin main
git push origin main                    # PagRecovery auto-deploy
git push shieldrecovery-origin main     # Push para shield repo

# Shield Recovery requer deploy manual
vercel deploy --prod
```
