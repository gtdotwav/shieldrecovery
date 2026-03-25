# PagRecovery

PagRecovery e um clone operacional da stack de recovery preparado para expansao em white label.

Hoje a base ja nasce com:

- identidade visual azul e marca centralizada em [`src/lib/platform.ts`](/Users/geander/Documents/shield recovery/src/lib/platform.ts)
- webhook oficial da Pagou.ai em `POST /api/webhooks/pagouai`
- rota legada `/api/webhooks/shield-gateway` mantida so para compatibilidade
- Pix de recovery criado direto na API v2 da Pagou.ai
- CRM, inbox, automacoes, worker e persistencia reaproveitando a mesma estrutura do projeto original

## Docs analisadas

- docs atuais da Pagou.ai: [developer.pagou.ai](https://developer.pagou.ai/)
- docs legadas: [pagouai.readme.io/reference/introducao](https://pagouai.readme.io/reference/introducao)

Observacao importante: as chaves fornecidas para este projeto seguem o padrao `v2`, entao a integracao desta base foi orientada para a documentacao atual da API v2.

## Escopo atual

Rotas principais:

- `/`
- `/dashboard`
- `/connect`
- `/leads`
- `/leads/[leadId]`
- `/inbox`
- `/ai`
- `/retry/[gatewayPaymentId]`
- `POST /api/webhooks/pagouai`
- `POST /api/webhooks/pagouai/[sellerKey]`
- `POST /api/import`
- `GET /api/health`
- `GET /api/analytics/recovery`
- `GET /api/followups/contacts`
- `POST /api/payments/retry`
- `GET|POST /api/settings/connections`
- `GET|POST /api/worker/run`

Rotas legadas mantidas:

- `/api/webhooks/shield-gateway`
- `/api/webhooks/shield-gateway/[sellerKey]`
- `/webhooks/shield-gateway`
- `/webhooks/shield-gateway/[sellerKey]`

## Como a integracao Pagou.ai funciona

Fluxo atual:

1. Falha de pagamento entra por webhook, import manual ou fluxo interno.
2. O backend normaliza o evento e salva customer, payment, lead e fila operacional.
3. Quando o cliente escolhe Pix, a plataforma cria uma cobranca em `POST /v2/transactions`.
4. Se o webhook vier resumido, a plataforma reconcilia dados faltantes com `GET /v2/transactions/{id}`.
5. A tela de retry consegue exibir QR Code Pix, copia-e-cola e status da transacao Pagou.ai.

Estado da integracao:

- Pix: implementado e pronto para uso
- webhook Pagou.ai: implementado
- reconciliacao por consulta da transacao: implementada
- card: preparado via public key, mas o fluxo hospedado/cartao ainda depende da estrategia final de checkout que voce quiser adotar

## White label

O projeto foi ressignificado para facilitar novos clones:

- marca e gateway centralizados em [`src/lib/platform.ts`](/Users/geander/Documents/shield recovery/src/lib/platform.ts)
- logo textual reutilizavel em [`src/components/platform/platform-logo.tsx`](/Users/geander/Documents/shield recovery/src/components/platform/platform-logo.tsx)
- cookies, namespace de senha e arquivos locais separados com slug `pagrecovery`
- configuracao do gateway tratada como camada propria em [`src/server/pagouai/client.ts`](/Users/geander/Documents/shield recovery/src/server/pagouai/client.ts)

## Variaveis de ambiente

Use [`.env.example`](/Users/geander/Documents/shield recovery/.env.example) como base.

Minimo recomendado:

```bash
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3001

PAGOUAI_ENVIRONMENT=production
PAGOUAI_SECRET_KEY=your-pagouai-secret-key
NEXT_PUBLIC_PAGOUAI_PUBLIC_KEY=your-pagouai-public-key

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

PLATFORM_AUTH_EMAIL=admin@pagrecovery.local
PLATFORM_AUTH_PASSWORD=change-this-password
PLATFORM_AUTH_SECRET=change-this-long-random-secret
```

Notas:

- `PAGOUAI_API_BASE_URL` e opcional e so precisa ser definido para sobrescrever o host padrao
- `NEXT_PUBLIC_PAGOUAI_PUBLIC_KEY` e recomendada se voce quiser evoluir para checkout card
- `SHIELD_GATEWAY_WEBHOOK_SECRET` ficou apenas para compatibilidade com o webhook legado
- nunca versione chaves live no repositorio

## Desenvolvimento local

```bash
npm install
npm run dev
```

Build de producao:

```bash
npm run build
```

Executar o worker manualmente:

```bash
npm run worker:run
```

## Estrutura

```text
src/
  app/                         rotas Next.js e APIs
  components/
    platform/                  camada visual e branding
    ui/                        blocos reutilizaveis
  lib/
    platform.ts                marca, gateway e helpers de white label
  server/
    pagouai/                   client API v2 da Pagou.ai
    recovery/                  dominio operacional de recovery
supabase/
  schema.sql                   schema operacional
data/
  pagrecovery.local.json       persistencia local
```

## Observacoes

- a configuracao do gateway na tela `/connect` mostra o estado real da Pagou.ai, mas as chaves do gateway continuam no ambiente para facilitar novos white labels
- se quiser transformar este projeto em uma nova marca, o ponto de partida mais importante e [`src/lib/platform.ts`](/Users/geander/Documents/shield recovery/src/lib/platform.ts)
