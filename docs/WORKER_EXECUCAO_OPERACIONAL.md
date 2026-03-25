# Worker de Execução Operacional

## Papel do worker

O worker existe para fechar a lacuna entre:

- evento recebido
- jobs agendados
- execução real do próximo passo

Sem ele, a plataforma sabe o que deve acontecer, mas para em `queue_jobs`.

## O que o worker precisa cumprir

### 1. Reivindicar jobs vencidos

O worker precisa:

- buscar apenas jobs `scheduled`
- respeitar `run_at`
- limitar volume por execução
- evitar reprocessamento concorrente

Por isso a camada de storage agora suporta:

- `claimDueQueueJobs`
- `completeQueueJob`
- `rescheduleQueueJobFailure`

### 2. Executar por tipo de job

Hoje os tipos suportados são:

- `lead-created`
- `whatsapp-initial`
- `email-reminder`
- `whatsapp-follow-up`
- `agent-task`
- `payment-link-generated`

### 3. Tratar sucesso, skip e falha

Cada job precisa terminar em um destes caminhos:

- `processed`
- `skipped`
- `rescheduled`
- `failed`

### 4. Fazer backoff de tentativa

Hoje o backoff está assim:

- primeira falha: +5 min
- segunda falha: +15 min
- última falha: +60 min e depois `failed`

### 5. Registrar auditoria

O worker precisa deixar rastro em logs:

- `worker_job_processed`
- `worker_job_rescheduled`
- `worker_job_failed`

## O que ele já faz agora

### `lead-created`

- confirma que o lead existe
- marca checkpoint operacional

### `whatsapp-initial`

- tenta reenviar a cobrança inicial se ela estiver `queued` ou `failed`
- se ainda não existir prompt, usa o fluxo de início do lead
- se o canal não estiver pronto, o job volta para a fila

### `email-reminder`

- abre ou reutiliza a conversa por email
- gera o follow-up pela IA
- hoje o resultado prático é `queued` quando não existir provider real de email

### `whatsapp-follow-up`

- reutiliza a conversa do lead
- não insiste se o cliente já respondeu depois da última saída
- pede nova resposta da IA
- se WhatsApp não estiver pronto, reprograma o job

### `agent-task`

- registra checkpoint para ação humana

### `payment-link-generated`

- confirma o checkpoint de geração do retry link

## Endpoint do worker

Executa jobs vencidos:

- `GET /api/worker/run`
- `POST /api/worker/run`

Pode ser usado de dois jeitos:

### 1. Sessão admin

Se estiver logado como admin, a rota pode ser chamada normalmente.

### 2. Token técnico

Via header:

- `Authorization: Bearer <WORKER_AUTH_TOKEN>`
- ou `x-worker-secret: <WORKER_AUTH_TOKEN>`

Também aceita:

- `CRON_SECRET`

Isso deixa a rota pronta para cron.

## Modos de execução

Hoje o projeto suporta dois modos reais:

### 1. Cron da Vercel

- configurado em [vercel.json](/Users/geander/Documents/shield%20recovery/vercel.json)
- roda `GET /api/worker/run`
- frequência atual: a cada 5 minutos
- usa `CRON_SECRET` para proteger a rota

### 2. Executor manual ou externo

- pode chamar `POST /api/worker/run`
- usa `WORKER_AUTH_TOKEN`
- também pode ser disparado pelo script local:

```bash
npm run worker:run
```

ou:

```bash
WORKER_RUN_URL=https://shield-recovery.vercel.app \
WORKER_AUTH_TOKEN=your-worker-token \
npm run worker:run -- --limit=50
```

## O que ainda não é o estágio final

O worker atual já executa a fila, mas ainda não é uma camada de automação completa no sentido mais alto do produto.

Ainda falta:

- provider de email real
- política mais avançada de reprogramação por tipo de job
- métricas dedicadas da fila

## Recomendação de uso

### Agora

Usar o worker para:

- rodar follow-up vencido
- validar ciclo de cobrança
- testar a operação ponta a ponta

### Próxima evolução

Depois disso, a próxima camada ideal é:

- cron recorrente na Vercel
- painel de jobs na plataforma
- política por canal e por tipo de erro
