# Oportunidades de Melhoria — PagRecovery / Shield Recovery

> Tabela mestra de **40 oportunidades** de lapidação, otimização e segurança identificadas em auditoria profunda.
> **Premissa central**: integração com a PagNet já foi entregue (docs + keys). Toda mudança aqui preserva os contratos externos.

**Data da auditoria**: 2026-04-29
**Stack**: Next.js 16 (App Router) + React 19 + TypeScript + Supabase + Vercel
**Escopo**: 391 arquivos `.ts/.tsx`, 28 tabelas DB, 5 dimensões analisadas

---

## 1. Contratos Congelados (Zona Vermelha — NÃO TOCAR)

Tudo abaixo já está documentado e em uso pela PagNet. Mexer requer aviso prévio + versionamento (`v2/`).

| Contrato | Path | O que está congelado |
|---|---|---|
| Webhook PagouAi | `src/app/api/webhooks/pagouai/[sellerKey]/route.ts` | URL, método POST, payload JSON, response `{ok, accepted, queued, webhook_id, event_id, event_type, seller_key}` |
| Webhook PagNet | `src/app/api/webhooks/pagnet/[sellerKey]/route.ts` | Alias do handler PagouAi — mesmo contrato |
| Health checks | `GET /api/webhooks/pagouai`, `GET /api/webhooks/pagnet` | Response `{ok: true, gateway: ...}` |
| Cliente saques PagNet | `src/server/pagnet/withdraw-client.ts` | Base URL `https://api.pagnetbrasil.com/v1`, Basic Auth, endpoints `/withdraws`, `/balance`, `/antecipations` |
| Event types | `src/server/recovery/types.ts:1-20` | `payment_failed`, `payment_refused`, `payment_expired`, `payment_succeeded`, `payment_refunded`, etc. |
| Normalização payload | `src/server/recovery/webhooks/event-normalizer.ts` | Mapeamento de aliases (`transaction_paid → payment_succeeded`) |
| HMAC signature | `src/server/recovery/utils/webhook-signature.ts` | SHA256 timing-safe, header `X-Signature: sha256=<hex>`, tolerância 300s |
| Checkout API | `docs/checkout-api.md`, `PLATFORM_DOCS.md` | Header `X-API-Key`, endpoints `/api/v1/sessions/*`, `/api/v1/merchants/*` |
| Variáveis de ambiente | `.env.*` | Nomes `PAGOUAI_*`, `PAGNET_*`, `CHECKOUT_PLATFORM_*`, `WEBHOOK_*`, `CRON_SECRET`, `WORKER_AUTH_TOKEN` |

**Regra de ouro**: refatorar implementação interna é livre, contanto que rota + headers + request/response shape permaneçam idênticos.

---

## 2. Tabela Mestra de Oportunidades

Legendas:
- **Sev**: severidade (CRIT/ALTO/MED/BAIXO)
- **Custo**: S = ≤4h, M = 1-2 dias, L = 3+ dias
- **Risco PN**: risco de afetar integração PagNet (Zero / Baixo / Médio / Alto)
- **Onda**: 1 = quick win imediato, 2 = hardening (semanas 2-4), 3 = estrutural (mês 2)

### 2.1 Crítico — quebra em escala ou expõe segurança

| # | Categoria | Achado | Path | Custo | Impacto | Risco PN | Onda |
|---|---|---|---|---|---|---|---|
| 1 | Multi-tenancy | 80% das tabelas (`recovery_leads`, `payments`, `customers`, `messages`, `conversations`, `queue_jobs`, `follow_up_cadences`) **sem `seller_id`** — risco de leak entre sellers e bloqueio de LGPD | `supabase/migrations/`, `src/server/recovery/services/supabase-storage.ts` | L (3-5d) | Bloqueia escala white-label e LGPD | Zero | 3 |
| 2 | Worker race condition | Job claim sem `FOR UPDATE SKIP LOCKED` — Vercel pode disparar cron 2x e duplicar processamento | `src/server/recovery/services/recovery-worker-service.ts:85-140`, `supabase-storage.ts:1089+` | M (1d) | WhatsApp dispara 2x ao cliente, double accounting | Zero | 2 |
| 3 | Queries `select("*")` | 136+ ocorrências carregando colunas desnecessárias em queries de alta frequência | `src/server/recovery/services/supabase-storage.ts` (linhas 513, 542, 597, 647, 1500…) | M (1-2d) | -30% latência Supabase, -30% banda | Zero | 2 |
| 4 | CVEs em deps | `flatted` (prototype pollution), `picomatch` (ReDoS), `vite` (path traversal), `brace-expansion` (DoS), `postcss` (XSS) | `package.json` | S (30min) | Surface de ataque ativa | Zero | 1 |
| 5 | CORS fallback hardcoded | Se `NEXT_PUBLIC_APP_URL` ausente em produção, usa fallback que pode aceitar origins indevidos | `src/server/recovery/utils/api-response.ts:3-23` | S (1h) | CORS bypass potencial | Zero | 1 |

### 2.2 Alto — confiabilidade, segurança e UX cliente

| # | Categoria | Achado | Path | Custo | Impacto | Risco PN | Onda |
|---|---|---|---|---|---|---|---|
| 6 | Observabilidade | Sentry **não configurado** no app Next.js — produção é cega para falhas | `src/server/recovery/utils/logger.ts` | S (3-4h) | Falhas silenciosas; recovery rate cai sem aviso | Zero | 1 |
| 7 | Auth | Sessões HMAC sem `jti`/blacklist — não dá pra forçar logout antes de TTL de 7d | `src/server/auth/core.ts` | M (1d) | Compromisso de sessão dura 7d | Zero | 2 |
| 8 | Cron security | `/api/debug/process-webhook` e `/api/agent/orchestrate` validam só `CRON_SECRET`, sem checar origem Vercel Cron | `src/app/api/debug/process-webhook/route.ts`, `src/app/api/agent/orchestrate/route.ts` | S (2h) | Trigger manual indevido | Zero | 2 |
| 9 | Rate limit | `/api/auth/token` reseta no cold start (Map em memória) — burst attacks possíveis em múltiplas regiões | `src/app/api/auth/token/route.ts:12-48` | M (4h) | Brute force de credenciais | Zero | 2 |
| 10 | Cron concorrência | Sem lock distribuído — agent/worker rodam simultaneamente em retries | `src/app/api/agent/orchestrate/route.ts`, `src/app/api/worker/run/route.ts` | S (2h) | Cadências duplicadas | Zero | 2 |
| 11 | LGPD | `cadence-engine.ts` agenda mensagens sem checar consent atual; opt-out só validado no dispatch | `src/server/recovery/ai/cadence-engine.ts` vs `messaging-service.ts:497-530` | M (1d) | Multa ANPD + reputação | Zero | 2 |
| 12 | UX cliente | Retry page com cores `text-sky-600` hardcoded (ignora `platformBrand.accent`); erros vagos ("Não foi possível carregar"); contraste WCAG marginal (`#64748b`); sem skeleton; sem countdown PIX | `src/app/retry/[gatewayPaymentId]/page.tsx` | M (1-2d) | É o ponto de monetização — cada % de conversão importa | Zero | 3 |
| 13 | XSS interno | `dangerouslySetInnerHTML` sem sanitização em CFO bubble | `src/components/cfo/cfo-message-bubble.tsx:~160` | S (1h) | Injection via mensagens AI | Zero | 1 |
| 14 | XSS email | `input.content.replace(/\n/g, "<br>")` em template de email sem escape prévio | `src/server/recovery/templates/email-recovery.ts` | S (1h) | XSS em emails para clientes | Zero | 1 |
| 15 | Defense-in-depth | Sem RLS no Supabase — service role key vaza tudo se comprometido | `supabase/migrations/` | M (1-2d) | Camada extra de proteção | Zero | 2 |
| 16 | Performance UI | Admin (`Sellers`/`Leads`/`Financeiro`) carrega listas inteiras client-side, sem paginação/virtualização | `src/app/admin/page.tsx:483+` | M (1d) | Trava com 500+ items | Zero | 3 |

### 2.3 Médio — DX, manutenibilidade, polish

| # | Categoria | Achado | Path | Custo | Impacto | Risco PN | Onda |
|---|---|---|---|---|---|---|---|
| 17 | Performance DB | Sem índices em `recovery_leads(seller, status, agent)`, `conversations(seller, status, created_at)`, `customers(email)`, `follow_up_cadences(seller, scheduled_at)` | `supabase/migrations/20260414_performance_indexes.sql` | S (30min) | -50-200ms por agent tick | Zero | 1 |
| 18 | Reliability | Agent hard bail 50s (Vercel limit 55s) sem `AbortSignal` por LLM call — 1 call travada trava o tick inteiro | `src/server/recovery/ai/autonomous-agent.ts:95-141`, `message-generator.ts` | M (4h) | Ticks falham silenciosamente | Zero | 2 |
| 19 | Worker | 16 jobs paralelos sem throttle por seller — esgota cota WhatsApp/SendGrid de um seller volumoso e quebra os outros | `src/server/recovery/controllers/worker-controller.ts:143` | M (4h) | Rate limit cascading | Zero | 2 |
| 20 | DLQ | `cleanupDeadJobs()` deleta jobs após 7d sem aviso e sem archive | `worker-controller.ts:73-125` | M (4h) | Perda silenciosa de jobs | Zero | 2 |
| 21 | Observabilidade | Logs sem `request_id` propagado — impossível correlacionar webhook → worker → message | `src/server/recovery/utils/logger.ts`, `structured-logger.ts` | M (5h) | DX de debug ruim | Zero | 2 |
| 22 | Security headers | CSP com `unsafe-inline` em script-src e style-src | `next.config.ts:17-25` | M (3h) | XSS surface aumentada | Zero | 2 |
| 23 | Type safety | `tsconfig.json` sem `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `useUnknownInCatchVariables` | `tsconfig.json` | L (2-3sem incremental) | Bugs de runtime | Zero | 3 |
| 24 | Type safety | 13 ocorrências de `: any` ou `as any` documentadas | `src/app/api/cfo/chat/route.ts`, `outbound-sales-service.ts`, +11 | M (2d) | Type safety | Zero | 3 |
| 25 | Maintainability | `platform-shell.tsx` com 808 linhas mistura layout + nav + breadcrumb + CFO FAB provider | `src/components/platform/platform-shell.tsx` | M (4h) | DX, manutenção | Zero | 3 |
| 26 | Design System | Sem `<Button>` / `<FormField>` / `<EmptyState>` reusáveis — botões e forms espalhados com `className` inline | `src/components/ui/` | M (1d) | Inconsistência visual e funcional | Zero | 3 |
| 27 | UX a11y | Toast auto-close em 3.5s (some antes de ler erros longos) e sem `aria-live="assertive"` em error | `src/components/ui/toast.tsx` | S (1h) | UX + a11y | Zero | 2 |
| 28 | Testes | 4 arquivos só em `tests/security/` — zero unit dos services, zero integration do worker/agent | `tests/` | L (2sem) | Refactor risk alto | Zero | 3 |
| 29 | Testes | Sem mocks de PagouAi/SendGrid/VAPI/OpenAI — testes não rodam offline | `tests/` | M (1sem) | DX testing | Zero | 3 |
| 30 | Operação | Backup/DR não documentado — sem playbook de restore Supabase | docs ausentes | S (2h) | Disaster prep | Zero | 2 |
| 31 | UI excellence | Aceternity UI nem instalado, embora seja preferência declarada do dono | `package.json` | M (1-2d para 3 components-chave) | Eleva produto a "elite" | Zero | 3 |
| 32 | A/B testing | Templates de mensagem hardcoded em TS (1000+ linhas em `message-generator.ts`); table `message_templates` existe vazia | `src/server/recovery/ai/message-generator.ts` | M (1-2d) | A/B testing impossível hoje | Zero | 3 |
| 33 | LGPD/Audit | Hard delete com `ON DELETE CASCADE`; sem `deleted_at`; audit trail só registra "quem", não "o quê" | schema | L (3-4d) | Compliance LGPD | Zero | 3 |

### 2.4 Baixo — cosmético e dívida menor

| # | Achado | Path | Custo | Onda |
|---|---|---|---|---|
| 34 | Diretório legacy `src/app/webhooks/` duplica `src/app/api/webhooks/` | revisar e remover | S (2h) | 2 |
| 35 | `checkout.ts` vs `checkout-admin.ts` vs `checkout-overrides.ts` — naming confuso | renomear para folder structure | S (1h) | 3 |
| 36 | Typos em PT-BR ("Ola" sem til, "Nao desejo") em emails para clientes | `src/server/recovery/templates/email-recovery.ts` | S (15min) | 1 |
| 37 | Imagens `public/` sem variantes `.webp` | conversão | M (2d) | 3 |
| 38 | `motion@12.38.0` instalado, sem imports detectados — provavelmente dead | `package.json:21` | S (10min) | 1 |
| 39 | i18n não preparado, hardcoded PT-BR | sitewide | L (futuro) | 4 |
| 40 | `vercel.json` cron sem `timeoutSeconds` explícito (default 900s, mas maxDuration=60/55) | `vercel.json:14-24` | S (10min) | 1 |

---

## 3. Roadmap em Ondas

### Onda 1 — Quick Wins (semana 1, ~1 dia útil somado, zero risco PagNet)

Ataque silencioso, alto ROI. Cada item é independente e testável isoladamente.

| Ordem | Tarefa | Item # | Tempo |
|---|---|---|---|
| 1 | `npm audit fix` — fechar 5 CVEs | #4 | 30min |
| 2 | Migration aditiva: 4 índices DB faltantes | #17 | 30min |
| 3 | CORS fail-fast se `NEXT_PUBLIC_APP_URL` ausente | #5 | 1h |
| 4 | Sanitizar `dangerouslySetInnerHTML` (CFO + email) | #13, #14 | 2h |
| 5 | Sentry integration — wrap worker/agent + logger | #6 | 3-4h |
| 6 | `vercel.json`: `timeoutSeconds: 70` explícito | #40 | 10min |
| 7 | Corrigir typos em templates | #36 | 15min |
| 8 | Remover `motion` se não usado | #38 | 10min |

### Onda 2 — Hardening Estrutural (semanas 2-4, contratos PagNet intactos)

Mudanças internas. Serializadas para reduzir risco e revisar uma de cada vez.

| Ordem | Tarefa | Item # |
|---|---|---|
| 9 | Distributed lock (`FOR UPDATE SKIP LOCKED`) — corrige worker race + cron concorrência | #2, #10 |
| 10 | Auditar 20 queries top-frequência: `select("*")` → colunas explícitas | #3 |
| 11 | `AbortSignal.timeout(5s)` em todas LLM/HTTP calls | #18 |
| 12 | Per-seller worker concurrency limit (3 paralelos por seller) | #19 |
| 13 | `request_id` propagado em todo lifecycle | #21 |
| 14 | DLQ archive table + alerta Sentry quando job morre | #20 |
| 15 | Validação de origem Vercel Cron em endpoints debug/agent | #8 |
| 16 | Rate limit distribuído via Supabase KV ou Vercel KV | #9 |
| 17 | `jti` + blacklist de sessão | #7 |
| 18 | CSP com nonce, remover `unsafe-inline` | #22 |
| 19 | Compliance check ANTES de schedule de cadência | #11 |
| 20 | RLS policies no Supabase | #15 |
| 21 | Toast com `aria-live` e timing maior em errors | #27 |
| 22 | Backup/DR playbook documentado | #30 |
| 23 | Limpeza do diretório `src/app/webhooks/` legacy | #34 |

### Onda 3 — Estrutural (mês 2, mudanças maiores)

Exigem migrations cuidadosas, rollout faseado e cobertura de testes.

| Ordem | Tarefa | Item # |
|---|---|---|
| 24 | **Multi-tenancy completo** — `seller_id` + RLS em todas as tabelas críticas. Rollout: shadow column → backfill → enforce | #1 |
| 25 | Paginação server-side em Admin (Sellers/Leads/Financeiro) | #16 |
| 26 | Refazer Retry page — cores via `platformBrand.accent`, contraste WCAG AA, skeleton, erros categorizados, OG image dinâmica, countdown PIX | #12 |
| 27 | Design System — `<Button>`, `<FormField>`, `<EmptyState>` com variants e states (loading/disabled/error) | #26 |
| 28 | Aceternity UI nos pontos de impacto: `ShineButton` no checkout, `AuroraBackground` no fallback de retry, `CardStack` no admin overview | #31 |
| 29 | Soft delete (`deleted_at`) + audit trail com old/new values | #33 |
| 30 | Templates → DB com A/B testing real | #32 |
| 31 | Refatorar `platform-shell.tsx` em 4 arquivos | #25 |
| 32 | Cobertura de testes: services + integration + mocks externos | #28, #29 |
| 33 | tsconfig strict flags, eliminar `: any` | #23, #24 |
| 34 | Renomear pasta de `checkout/` | #35 |
| 35 | Imagens `.webp` + `srcset` | #37 |

### Onda 4 — Futuro (não bloqueia nada)

| Ordem | Tarefa | Item # |
|---|---|---|
| 36 | i18n com `next-intl` se expansão internacional | #39 |

---

## 4. Resumo Executivo

| Métrica | Estado Atual | Após Onda 1 | Após Onda 2 | Após Onda 3 |
|---|---|---|---|---|
| CVEs abertos | 5 HIGH + 2 MED | 0 | 0 | 0 |
| Observabilidade | Cego (só Vercel logs 14d) | Sentry ativo | + request_id correlacionado | + métricas de negócio |
| Latência agent tick | 100% baseline | -10% (índices) | -25% (queries + abort) | -40% (multi-tenant index) |
| Risco data leak entre sellers | Alto | Alto | Médio (RLS) | Eliminado (seller_id + RLS) |
| Compliance LGPD | Parcial | Parcial | OK (consent + retention) | Total (soft delete + audit) |
| UX cliente final (retry) | Genérico | Genérico | Genérico | Premium (Aceternity + WCAG) |
| Cobertura de testes | 4 arquivos só security | Igual | Igual | + unit + integration |
| Design System | Inexistente | Inexistente | Inexistente | Componentes padronizados |

**Wins de maior ROI (custo × impacto)**:
1. Índices DB (#17) — 30min de SQL rende -10% latência permanente
2. Sentry (#6) — 3h e produção deixa de ser cega
3. Distributed lock (#2) — 1d e elimina classe inteira de bugs (job duplication)
4. `select("*")` audit (#3) — 1-2d e -30% banda Supabase
5. Multi-tenancy (#1) — investimento maior, mas destrava escala white-label

**Caminho seguro**: executar Onda 1 inteira em uma sprint curta. Ela toca **zero contratos externos**, dá visibilidade (Sentry) e fecha as vulnerabilidades imediatas. A partir daí, Onda 2 e 3 podem ser priorizadas por necessidade de negócio.

---

## 5. Como Acompanhar

11 tasks já criadas no painel do Claude Code, espelhando as ações concretas das Ondas 1 e 2. Para abrir e executar item por item:

```
/tasks            # listar
TaskUpdate <id>   # marcar in_progress / completed
```

Documentos relacionados:
- `docs/AUDITORIA_FINAL_ENTREGA_PRODUTO.md` — auditoria anterior (referência histórica)
- `docs/BACKLOG_POR_FASE_DOS_SUBAGENTES.md` — backlog de fases prévias
- `docs/checkout-api.md` — contrato externo da API de checkout (não tocar)
- `PLATFORM_DOCS.md` — documentação pública usada pela PagNet (não tocar)
