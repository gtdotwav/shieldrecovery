# Estudo Funcional Completo

## 1. Leitura executiva

O projeto hoje já funciona como uma plataforma operacional de recovery assistido por IA, com:

- entrada de eventos via webhook do gateway
- criação de lead e carteira de recovery
- CRM operacional
- inbox de conversas
- painel de integrações
- calendário operacional
- automações com worker
- painel administrativo para governança de sellers/agentes

O produto já pode ser testado de ponta a ponta como V1 operacional.

O que ele ainda não representa como promessa fechada:

- operação 100% autônoma sem supervisão
- múltiplos logins seller independentes com RBAC granular por usuário
- integração garantida com qualquer provider externo sem ajuste de payload/credencial

## 2. Estrutura do produto

### Home pública
Arquivo: [src/app/page.tsx](/Users/geander/Documents/shield%20recovery/src/app/page.tsx)

Função:

- explicar o produto
- mostrar os módulos principais
- abrir login ou plataforma

Estado:

- funcional
- orientada a produto, não a dashboard interno

### Login
Arquivos:

- [src/app/login/page.tsx](/Users/geander/Documents/shield%20recovery/src/app/login/page.tsx)
- [src/server/auth/core.ts](/Users/geander/Documents/shield%20recovery/src/server/auth/core.ts)
- [src/server/auth/session.ts](/Users/geander/Documents/shield%20recovery/src/server/auth/session.ts)
- [middleware.ts](/Users/geander/Documents/shield%20recovery/middleware.ts)

Função:

- proteger a plataforma por cookie assinado
- separar `admin` e `seller`

Estado:

- funcional
- `admin` tem acesso total às áreas internas
- `seller` opera com acesso reduzido

Observação:

- a autenticação seller atual ainda é simples, baseada em uma configuração principal
- a operação já suporta múltiplos agentes/sellers no dado, mas o auth ainda não é multiusuário completo por seller

## 3. Áreas internas

### Dashboard
Arquivo: [src/app/dashboard/page.tsx](/Users/geander/Documents/shield%20recovery/src/app/dashboard/page.tsx)

Função:

- visão executiva da carteira
- prioridade do dia
- taxa de recuperação
- valor recuperado
- leitura de canais

Estado:

- funcional
- admin-only
- consome dados reais de analytics e contatos

### Connect
Arquivo: [src/app/connect/page.tsx](/Users/geander/Documents/shield%20recovery/src/app/connect/page.tsx)

Função:

- configurar Supabase
- configurar gateway
- configurar WhatsApp
- configurar CRM
- configurar OpenAI

Estado:

- funcional
- admin pode editar credenciais
- seller recebe uma visão enxuta com URLs públicas e estado do runtime

### CRM
Arquivo: [src/app/leads/page.tsx](/Users/geander/Documents/shield%20recovery/src/app/leads/page.tsx)

Função:

- operar a carteira
- listar leads em escala
- abrir detalhe do lead
- mudar etapa

Estado:

- funcional
- lista é a visão principal
- kanban é apoio de leitura
- seller vê apenas a carteira acessível à sua operação

### Detalhe do lead
Arquivo: [src/app/leads/[leadId]/page.tsx](/Users/geander/Documents/shield%20recovery/src/app/leads/%5BleadId%5D/page.tsx)

Função:

- abrir contexto completo do caso
- ver conversa relacionada
- registrar resposta
- conduzir o lead

Estado:

- funcional

### Inbox
Arquivo: [src/app/inbox/page.tsx](/Users/geander/Documents/shield%20recovery/src/app/inbox/page.tsx)

Função:

- central de conversas
- continuar o follow-up
- responder manualmente
- pedir resposta da IA
- alterar status da conversa

Estado:

- funcional
- admin tem visão total
- seller pode usar, mas o admin pode bloquear essa área por seller

### Automações
Arquivo: [src/app/ai/page.tsx](/Users/geander/Documents/shield%20recovery/src/app/ai/page.tsx)

Função:

- leitura da IA
- classificação da carteira
- estratégias
- visão operacional das automações

Estado:

- funcional
- seller pode acessar se o admin mantiver essa permissão ativa

### Calendário
Arquivo: [src/app/calendar/page.tsx](/Users/geander/Documents/shield%20recovery/src/app/calendar/page.tsx)

Função:

- leitura do movimento por dia
- abrir data para detalhes
- guardar notas por data

Estado:

- funcional
- visão mensal simplificada
- detalhe do dia concentra notas e timeline

### Admin
Arquivo: [src/app/admin/page.tsx](/Users/geander/Documents/shield%20recovery/src/app/admin/page.tsx)

Função:

- governança dos sellers/agentes
- leitura de carteira, conversa e recuperação por seller
- controlar meta, limite e autonomia
- controlar acesso do seller a inbox e automações
- registrar taxa real recuperada manualmente

Estado:

- funcional
- admin-only
- já interfere de verdade no painel seller

## 4. Backend e domínio

### Núcleo de recovery
Arquivo: [src/server/recovery/services/payment-recovery-service.ts](/Users/geander/Documents/shield%20recovery/src/server/recovery/services/payment-recovery-service.ts)

Função:

- validar e processar webhook
- normalizar evento
- criar customer, payment e lead
- abrir conversa
- preparar mensagem inicial
- criar retry link
- alimentar CRM, inbox, analytics e admin

Estado:

- funcional
- é o coração da plataforma

### Normalização do webhook
Arquivo: [src/server/recovery/webhooks/event-normalizer.ts](/Users/geander/Documents/shield%20recovery/src/server/recovery/webhooks/event-normalizer.ts)

Função:

- adaptar payloads do gateway/Shield
- extrair payment URL, pix code, QR e metadata

Estado:

- funcional para o formato principal trabalhado hoje

### Messaging / WhatsApp
Arquivo: [src/server/recovery/services/messaging-service.ts](/Users/geander/Documents/shield%20recovery/src/server/recovery/services/messaging-service.ts)

Função:

- enviar outbound
- tratar inbound do WhatsApp
- atualizar status de mensagens
- lidar com Cloud API ou Web API
- suportar fluxo de QR para provider Web API

Estado:

- funcional em termos de estrutura
- depende de provider real e credenciais corretas para operação externa

Observação importante:

- QR Code só faz sentido no modo `web_api`
- não existe QR na Cloud API oficial da Meta

### Worker
Arquivo: [src/server/recovery/services/recovery-worker-service.ts](/Users/geander/Documents/shield%20recovery/src/server/recovery/services/recovery-worker-service.ts)

Função:

- consumir jobs vencidos
- executar follow-ups
- reprogramar falhas
- registrar logs

Estado:

- funcional em código
- precisa de cron/executor ativo no ambiente para operar continuamente

## 5. Persistência

### Local fallback
Arquivo: [src/server/recovery/services/storage.ts](/Users/geander/Documents/shield%20recovery/src/server/recovery/services/storage.ts)

Função:

- persistência local JSON
- útil para desenvolvimento e testes

Estado:

- funcional
- segura o app em ambiente local e fallback

### Supabase
Arquivos:

- [src/server/recovery/services/supabase-storage.ts](/Users/geander/Documents/shield%20recovery/src/server/recovery/services/supabase-storage.ts)
- [supabase/schema.sql](/Users/geander/Documents/shield%20recovery/supabase/schema.sql)

Função:

- persistência real da operação
- customers, payments, leads, conversations, messages, queue, notes, controls admin

Estado:

- funcional
- precisa estar com o schema aplicado

Observação:

- a tabela `seller_admin_controls` precisa existir para a nova governança admin

## 6. Permissões

### Admin

Pode acessar:

- `/admin`
- `/dashboard`
- `/connect`
- `/calendar`
- `/leads`
- `/inbox`
- `/ai`
- `/test`

Pode:

- configurar integrações
- controlar seller
- operar a carteira
- usar inbox
- ver analytics completos

### Seller

Pode acessar:

- `/connect` em modo enxuto
- `/calendar`
- `/leads`
- `/inbox` se liberado pelo admin
- `/ai` se liberado pelo admin

Não pode:

- alterar chaves/segredos
- abrir `/admin`
- abrir `/dashboard`
- abrir `/test`

## 7. O que já está funcional de ponta a ponta

### Fluxo principal

1. webhook chega
2. evento é validado
3. customer/payment/lead são criados ou atualizados
4. CRM recebe o caso
5. inbox recebe a conversa
6. mensagem inicial pode ser gerada
7. worker pode continuar a cadência
8. admin acompanha sellers e carteira

### Fluxo de seller

1. seller entra no CRM
2. vê carteira que pode operar
3. abre o caso
4. usa inbox se estiver liberado
5. usa automações se estiver liberado

### Fluxo de admin

1. admin entra no painel
2. vê dashboard
3. configura integrações
4. governa sellers em `/admin`
5. ajusta meta, limite, permissões e taxa real manual

## 8. O que depende de configuração externa

### Gateway

Precisa:

- URL pública do webhook
- secret correto
- payload alinhado

### WhatsApp

Precisa:

- provider real
- token/base URL corretos
- QR apenas se usar `web_api`

### OpenAI

Precisa:

- API key válida

### Supabase

Precisa:

- URL
- service role key
- schema aplicado

## 9. O que está sólido para entrega

- arquitetura geral do produto
- separação entre home e áreas internas
- auth
- CRM
- inbox
- connect
- calendário
- painel admin
- worker service
- persistência local e Supabase

## 10. Limitações reais atuais

### 1. Multi-seller de autenticação ainda é simples

A plataforma já suporta múltiplos sellers/agentes no dado operacional, mas a autenticação seller ainda não é um sistema completo de múltiplos usuários independentes.

### 2. Integrações externas ainda dependem da configuração correta

Sem provider real, token e schema, o código existe, mas a ponta externa não fecha.

### 3. Worker precisa estar rodando no ambiente final

O serviço existe, mas a automação contínua depende de cron/disparo operacional.

## 11. Leitura de entrega

Hoje o produto pode ser descrito honestamente como:

**uma plataforma funcional de recovery assistido por IA, com governança administrativa, CRM, inbox, integrações e automação por worker.**

Ele ainda não deve ser descrito como:

**uma operação totalmente autônoma, multiusuário seller completo, plug-and-play universal para qualquer provider sem configuração.**

## 12. Checklist real para go-live

### Obrigatório

- aplicar [supabase/schema.sql](/Users/geander/Documents/shield%20recovery/supabase/schema.sql)
- validar `seller_admin_controls`
- configurar gateway em `/connect`
- configurar provider WhatsApp em `/connect`
- configurar OpenAI em `/connect`
- validar login admin e seller
- validar webhook do gateway
- validar mensagem inicial
- validar inbox
- validar worker

### Recomendado

- definir o provider oficial de WhatsApp
- definir rotina de cron para o worker
- decidir se a taxa real manual será preenchida sempre ou só em sellers específicos
- evoluir depois para multi-seller auth completo

## 13. Estado técnico validado nesta rodada

Validação executada:

- `eslint`
- `tsc --noEmit`
- `npm run build`

Resultado:

- build ok
- tipagem ok
- rotas internas principais presentes no build
- `/admin` já entrou na aplicação

