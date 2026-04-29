# Ativar Sentry em produção

> O código já está plugado (`@sentry/nextjs` + `instrumentation.ts` + `sentry.{server,client,edge}.config.ts` + `src/server/observability/sentry.ts`).
> Quando `SENTRY_DSN` está vazio, todas as chamadas viram **no-op** — nada de errado acontece. Para começar a receber eventos, basta preencher as quatro env vars abaixo.

## 1. Criar conta + projeto Sentry (~3 min)

1. Acesse https://sentry.io e faça login (ou cadastre — free tier cobre até 50k eventos/mês).
2. Em **Projects → Create Project**, selecione `Next.js` como plataforma.
3. Nomeie o project como `pagrecovery` (você pode criar um clone `shield-recovery` depois — eles podem compartilhar o mesmo project, ou ficar em projects separados se você quiser dashboards distintos).
4. Copie o **DSN** que aparece na tela inicial — formato `https://<chave>@o<orgId>.ingest.us.sentry.io/<projectId>`.
5. Em **Settings → Account → Auth Tokens**, gere um token com **scopes**:
   - `project:read`
   - `project:write`
   - `project:releases`
   - `org:read`
6. Anote o **slug da organização** (canto superior esquerdo, ex: `acme-co`) e o **slug do project** (ex: `pagrecovery`).

## 2. Setar as env vars no Vercel (3 min)

Para **cada** dos dois projects (`pagrecovery` + `shield-recovery`), em **Settings → Environment Variables**, adicione (todas em **Production** + **Preview**):

| Nome | Valor | Sensitive? |
|---|---|---|
| `SENTRY_DSN` | DSN copiado do passo 1.4 | sim |
| `NEXT_PUBLIC_SENTRY_DSN` | mesmo DSN | não (aparece no bundle do client) |
| `SENTRY_ORG` | slug da organização | não |
| `SENTRY_PROJECT` | slug do project | não |
| `SENTRY_AUTH_TOKEN` | auth token do passo 1.5 | sim |

Atalhos via CLI (opcional):
```bash
# pagrecovery
npx vercel link --project pagrecovery --yes
npx vercel env add SENTRY_DSN production --value "$DSN" --yes --force
npx vercel env add SENTRY_DSN preview    --value "$DSN" --yes --force
npx vercel env add NEXT_PUBLIC_SENTRY_DSN production --value "$DSN" --yes --force
# ... e assim por diante

# shield-recovery (repetir)
npx vercel link --project shield-recovery --yes
npx vercel env add SENTRY_DSN production --value "$DSN" --yes --force
# ...
```

> Se a versão do CLI não aceitar `--value` (algumas builds antigas), use a Vercel REST API:
> `POST https://api.vercel.com/v10/projects/<projectId>/env?upsert=true` com body
> `{"key":"SENTRY_DSN","value":"...","type":"sensitive","target":["production","preview"]}`.

## 3. Re-deploy

```bash
# pagrecovery: auto-deploy via push to main
git commit --allow-empty -m "chore: pick up Sentry env"
git push origin main
git push shieldrecovery-origin main

# shield-recovery: deploy manual
npx vercel link --project shield-recovery --yes
npx vercel deploy --prod --yes
```

## 4. Validar (~ 1 min)

Em produção, dispare um erro deliberado uma vez (ex: chame um endpoint que sabidamente lança). Em **Sentry → Issues** o evento aparece em segundos. A integração no `next.config.ts` também passa a fazer source-map upload automaticamente em cada build, então os stack traces ficam legíveis.

## O que muda quando o DSN está setado

- `logger.error(...)` continua escrevendo JSON no stdout E manda `Sentry.captureException` em paralelo.
- `logger.warn(...)` vira `captureMessage(level: "warning")`.
- `withSentryConfig` no `next.config.ts` ativa upload de source maps + tunneling (`/monitoring`) — bypassa adblockers.
- Erros de cron (worker, agent) param de ser invisíveis: cada falha vira um issue rastreável com `request_id`.

## Custo

Free tier (`Developer`) cobre 50k erros/mês + 100k transactions. A `tracesSampleRate` está em `0.1` em prod e `0.05` no edge — ajuste em `sentry.server.config.ts` / `sentry.edge.config.ts` se quiser mais ou menos amostragem.

## Rollback

Para desligar Sentry sem deploy: remova `SENTRY_DSN` no Vercel. O código volta a no-op gracioso. Não é necessário reverter código.
