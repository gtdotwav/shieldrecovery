# Shield Recovery - Analise Completa e Proximos Passos

## 1. Objetivo deste documento

Este documento existe para transformar o estado atual do projeto em um plano de execucao claro.

O foco agora nao e mais "construir telas bonitas" nem "provar conceito". O foco passa a ser:

- limpar a base
- reduzir mock e duplicidade
- padronizar persistencia
- ligar integracoes reais
- receber dados reais do gateway
- operar leads reais
- conectar contas reais de WhatsApp
- criar uma area real de mensagens e atendimento
- deixar o produto utilizavel no dia a dia

## 2. Resumo executivo

O projeto ja tem uma base boa e aproveitavel:

- landing e areas internas prontas como estrutura de produto
- webhook de entrada implementado
- normalizacao de eventos implementada
- criacao de leads e analytics basicos implementados
- rotas operacionais funcionando
- persistencia abstrata com fallback local e caminho para banco

Mas o estado atual ainda e hibrido. Hoje convivem tres camadas que nao estao 100% alinhadas:

1. interface interna com muita informacao mockada ou semi-real
2. persistencia real parcial, com direcoes concorrentes entre `local_json`, `Supabase` e `Prisma`
3. operacao comercial simulada, sem inbox real de mensagens nem integracao real de canais

Conclusao objetiva:

- o projeto ja passou da fase de ideia
- o backend principal existe
- a proxima fase correta nao e "adicionar mais tela"
- a proxima fase correta e limpar, consolidar e conectar a operacao real

## 3. Estado atual do projeto

### 3.1 O que ja esta bem encaminhado

- `src/server/recovery/webhooks/event-normalizer.ts`
  - normaliza diferentes formatos de payload para um contrato unico interno
- `src/server/recovery/services/payment-recovery-service.ts`
  - concentra o fluxo principal de webhook, persistencia, lead e retry
- `src/server/recovery/controllers/*`
  - separacao razoavel entre camada HTTP e servico
- `src/server/recovery/crm/shield-lead-crm.ts`
  - ja existe uma camada de traducao para lead de recovery
- `src/app/webhooks/shield-gateway/route.ts`
  - endpoint de webhook pronto
- `src/app/analytics/recovery/route.ts`
  - analytics basico ja disponivel
- `src/app/followups/contacts/route.ts`
  - lista de contatos pronta para follow-up

### 3.2 O que ainda esta mockado ou semi-real

- `src/app/dashboard/page.tsx`
  - mistura dados reais com campos inventados como `nextTouch`, `aiReading`, `urgency`
- `src/app/connect/page.tsx`
  - hoje e uma tela de narrativa do produto, nao um hub real de integracoes
- `src/app/leads/page.tsx`
  - usa dados reais de contatos, mas ainda preenche varios campos com texto fixo
- `src/components/platform/recovery-command-center.tsx`
  - e um preview comercial, nao uma visao operacional real
- `src/app/retry/[gatewayPaymentId]/page.tsx`
  - ainda esta em placeholder

### 3.3 O que esta estruturalmente inconsistente

- `prisma/schema.prisma`
  - define uma direcao de banco relacional
- `src/server/recovery/services/storage.ts`
  - hoje escolhe entre `SupabaseStorageService` e fallback local
- `src/server/recovery/services/supabase-storage.ts`
  - existe como implementacao real, mas o projeto ainda carrega a presenca de Prisma em paralelo
- `.env.example`
  - ainda fala em `DATABASE_URL` e `REDIS_URL`, mas a configuracao principal atual esta em `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`

Isso significa que o projeto ainda nao tomou a decisao final sobre "qual e a camada oficial de persistencia".

### 3.4 O que ainda nao existe, mas precisa existir

- inbox real de mensagens
- tabela de conversas
- tabela de mensagens
- status de envio, entrega, leitura e erro por mensagem
- integracao real de WhatsApp
- configuracao de contas/canais
- playbooks reais salvos no banco
- execucao real de filas com worker
- detalhe de lead com historico de tratativa
- area para ver e responder mensagens por lead
- leitura de IA com log e justificativa

## 4. Principal decisao arquitetural que precisa ser tomada agora

### Recomendacao

Padronizar em:

- Supabase como infraestrutura principal
  - Postgres
  - opcionalmente Realtime
  - opcionalmente Storage
- uma unica camada de acesso a dados no backend

### Escolha mais pragmatica neste projeto

Pelo estado atual, a recomendacao mais pragmatica e:

- manter Supabase como banco real
- manter o backend escrevendo e lendo via `supabase-js` no curto prazo
- remover o que sobrar de caminho paralelo com Prisma se ele nao for ser usado imediatamente

Motivo:

- `SupabaseStorageService` ja existe
- o projeto ja esta mais perto de rodar em Supabase do que em Prisma
- insistir em manter `Supabase` e `Prisma` como caminhos ativos ao mesmo tempo vai gerar manutencao duplicada

### Alternativa valida

Se o objetivo for padronizacao de engenharia a medio prazo:

- Supabase continua como Postgres hospedado
- Prisma vira a unica forma de acesso do backend
- `supabase-js` fica apenas para auth/realtime/storage, se de fato forem usados

Mas isso so vale a pena se fizermos essa consolidacao por completo. Meio-termo aqui vai piorar a base.

## 5. O que precisa ser limpo imediatamente

### Limpeza de arquitetura

1. Escolher uma camada oficial de banco.
2. Remover implementacao nao utilizada.
3. Alinhar `.env.example`, `config.ts`, README e deploy com a mesma estrategia.
4. Parar de carregar placeholders operacionais dentro de telas que o time vai usar.

### Limpeza de UX operacional

1. Home continua comercial e explicativa.
2. `/dashboard` vira painel real.
3. `/connect` vira integracoes reais.
4. `/leads` vira CRM real.
5. criar `/inbox` ou `/messages` como area de atendimento.

### Limpeza de produto

Remover qualquer texto que:

- descreve "a promessa da plataforma" dentro de areas internas
- simula sinais de IA sem base de dados
- exibe numeros inventados
- fala de recurso conectado quando ele ainda nao esta conectado

## 6. Arquitetura alvo recomendada

## 6.1 Visao funcional

```text
Gateway Shield
  -> Webhook Receiver
  -> Event Normalizer
  -> Persistencia
  -> Lead Engine
  -> Recovery Automation
  -> CRM
  -> Inbox / Messaging
  -> Analytics
```

## 6.2 Rotas de produto

- `/`
  - pagina institucional do produto
- `/dashboard`
  - visao operacional real
- `/connect`
  - integracoes e canais
- `/leads`
  - CRM com funis
- `/leads/[leadId]`
  - detalhe completo do lead
- `/inbox`
  - lista de conversas
- `/inbox/[conversationId]`
  - atendimento por conversa

## 6.3 Modulos backend que faltam ficar reais

- `integrations`
- `conversations`
- `messages`
- `message-events`
- `playbooks`
- `ai-analysis`
- `workers`
- `channels`

## 7. Modelo de dados minimo para operacao real

As tabelas atuais cobrem o inicio da operacao, mas faltam entidades para mensageria e tratativa.

### Ja existentes ou parcialmente cobertas

- payments
- customers
- payment_attempts
- webhook_events
- agents
- recovery_leads
- queue_jobs
- system_logs

### Devem ser adicionadas

- `integrations`
  - tipo: whatsapp, email, gateway, crm
  - status
  - credenciais/identificadores
  - ultimo sync
- `whatsapp_accounts`
  - nome da conta
  - phone number id
  - business account id
  - status
- `conversations`
  - lead_id
  - customer_id
  - channel
  - status
  - last_message_at
  - assigned_agent_id
- `messages`
  - conversation_id
  - direction (`inbound` / `outbound`)
  - sender
  - content
  - provider_message_id
  - status
  - delivered_at
  - read_at
  - error
- `lead_activities`
  - lead_id
  - actor (`system`, `agent`, `ai`)
  - action
  - payload
- `playbooks`
  - nome
  - gatilho
  - segmento
  - canal preferido
  - mensagem sugerida
- `ai_runs`
  - lead_id
  - input snapshot
  - output
  - recomendacao
  - score
  - created_at

## 8. Integracao real com WhatsApp

## 8.1 O que o produto precisa fazer

- conectar uma ou mais contas
- validar estado da conta
- exibir status do canal
- enviar mensagens
- receber mensagens
- vincular mensagens a leads e conversas
- mostrar historico completo
- permitir resposta humana
- registrar tudo no CRM

## 8.2 O que falta hoje

- camada de credenciais
- webhook de mensagens inbound
- envio real outbound
- inbox por conversa
- templates e aprovacao
- sincronizacao de status da mensagem

## 8.3 Estrategia recomendada

Fase 1:

- integrar com WhatsApp Cloud API
- salvar configuracao em `integrations` / `whatsapp_accounts`
- criar webhook dedicado para mensagens
- armazenar tudo em `conversations` e `messages`

Fase 2:

- templates
- envio manual pelo CRM
- automacao por playbook
- leitura de IA por conversa

## 9. Inbox de mensagens: requisito obrigatorio da proxima fase

Se o usuario vai conectar contas de WhatsApp, a plataforma precisa ter uma tela real para conversar e acompanhar o historico.

### A `/inbox` precisa mostrar

- lista de conversas
- canal
- lead vinculado
- responsavel
- ultima mensagem
- horario da ultima interacao
- status da conversa
- prioridade

### A `/inbox/[conversationId]` precisa mostrar

- historico completo
- mensagens inbound e outbound
- quem enviou
- timestamps
- status de entrega/leitura
- composer para resposta
- sugestao de resposta da IA
- eventos da conversa

Sem isso, conectar WhatsApp vai gerar entrada de dado sem capacidade de operacao real.

## 10. Dashboard: como deve deixar de ser mock

O Dashboard deve sair do estado atual de "mistura entre real e demonstrativo".

### Hoje

- parte dos dados vem de `getFollowUpContacts()`
- parte da experiencia ainda e texto fixo
- prioridade, proximo toque e leitura de IA sao placeholders

### Alvo

Dashboard deve ler do banco:

- total de recoveries ativas
- receita em risco
- receita recuperada no periodo
- leads sem resposta
- leads aguardando agente
- leads aguardando cliente
- filas atrasadas
- canais com maior resposta
- agentes com mais recuperacao

### Regra

Nenhum card operacional deve mostrar numero inventado.

Se o dado nao existir ainda, a tela deve mostrar:

- estado vazio honesto
- call to action para conectar fonte ou iniciar fluxo

## 11. Connect: o que essa area deve virar

Hoje `/connect` esta mais perto de uma tela de posicionamento interno.

Ela precisa virar um hub real com:

- status de cada integracao
- acao de conectar
- credenciais
- validacao
- ultimo sync
- erros de autenticacao
- testes de conexao

### Blocos recomendados

- Gateway
- WhatsApp
- Email
- CRM
- IA
- Playbooks

Cada bloco deve ter:

- status
- owner
- ultima sincronizacao
- acao principal
- ultima falha

## 12. Leads: o que falta para virar CRM real

Hoje `/leads` ja usa parte dos contatos reais, mas ainda nao e um CRM completo.

### Falta

- detalhe por lead
- timeline do lead
- historico de mensagens
- historico de mudanca de funil
- anotacoes do agente
- sugestao da IA com justificativa
- proxima acao registrada
- SLA por lead

### Recomendacao

Criar:

- `/leads/[leadId]`

Essa pagina deve ser o centro operacional da tratativa.

## 13. Fila e automacao: gap importante

O projeto fala em BullMQ/Redis, mas hoje `src/server/recovery/queues/recovery-queues.ts` apenas monta registros de jobs.

Ou seja:

- ja existe o desenho da cadencia
- ainda nao existe o worker real
- ainda nao existe a execucao real da automacao

Proxima fase obrigatoria:

- instalar BullMQ
- ligar Redis
- criar workers
- processar envio real de mensagem e criacao de tarefas

Sem isso, o backend ainda agenda conceitualmente, mas nao executa de verdade.

## 14. Riscos se prosseguirmos sem limpar agora

1. duplicidade de logica de banco
2. telas internas bonitas mas nao confiaveis
3. webhook entrando sem operacao real de atendimento
4. WhatsApp conectado sem inbox utilizavel
5. IA aparecendo como camada cenografica
6. custo de manutencao subindo por causa de caminhos paralelos

## 15. Plano recomendado por fases

## Fase 0 - consolidacao tecnica

Objetivo:

- escolher banco oficial
- alinhar envs
- remover codigo morto
- parar de mostrar dado fake em tela interna

Entregas:

- decisao unica de persistencia
- `storage.ts` simplificado
- `README` e `.env.example` coerentes
- health endpoint indicando modo real

## Fase 1 - dados reais ponta a ponta

Objetivo:

- toda area interna deve ler apenas dado real ou estado vazio

Entregas:

- dashboard sem metricas inventadas
- leads sem campos placeholder
- connect com status real de integracao
- retry page real

## Fase 2 - integracoes reais

Objetivo:

- receber e usar dados do gateway
- conectar canais reais

Entregas:

- gateway definitivo
- WhatsApp Cloud API
- email provider
- persistencia de conexoes

## Fase 3 - inbox e tratativa

Objetivo:

- permitir atendimento real dentro do produto

Entregas:

- `/inbox`
- `/inbox/[conversationId]`
- composer de mensagem
- status de envio e leitura
- historico completo por conversa

## Fase 4 - CRM e IA operacionais

Objetivo:

- transformar `/leads` em area de execucao comercial assistida

Entregas:

- lead detail
- timeline
- AI summary
- recomendacao de funil
- recomendacao de proxima acao
- playbooks reais

## Fase 5 - fila real e automacao

Objetivo:

- automacoes sairem do papel

Entregas:

- BullMQ
- Redis
- workers
- cadencias reais
- alertas e retries

## 16. Definicao de pronto para a virada de "demo" para "produto"

O produto so pode ser considerado operacional quando:

- o gateway envia para uma URL estavel
- o banco esta unico e consistente
- connect mostra integracoes reais
- dashboard nao mostra numero fake
- leads exibe somente dados reais
- existe inbox de mensagens
- mensagens podem ser enviadas e recebidas
- cada lead possui historico, responsavel e proxima acao
- a IA deixa rastro do que recomendou e por que recomendou

## 17. Minha recomendacao pratica para a proxima sprint

Se fossemos executar isso agora, eu faria nesta ordem:

1. escolher e consolidar o banco oficial
2. remover placeholders de `/dashboard`, `/connect` e `/leads`
3. criar estrutura de `integrations`, `conversations` e `messages`
4. construir `/inbox`
5. conectar WhatsApp
6. criar `/leads/[leadId]`
7. ligar fila real com Redis/BullMQ

## 18. Conclusao

Ja existe produto suficiente para justificar a fase de consolidacao.

O erro agora seria continuar adicionando interface sem antes:

- limpar a base
- fixar a camada de dados
- transformar as areas internas em operacao real

O melhor caminho e tratar a proxima etapa como "industrializacao do produto":

- menos mock
- menos duplicidade
- mais dado real
- mais capacidade operacional
- mais consistencia entre webhook, CRM, inbox, IA e automacao
