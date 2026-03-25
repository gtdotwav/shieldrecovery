# Estudo de Subagentes para o Shield Recovery

## Objetivo

Definir os subagentes mais úteis para evoluir o Shield Recovery sem aumentar ruído, acoplamento ou risco operacional.

O foco aqui não é criar "muitos agentes". O foco é criar poucos subagentes com fronteira clara, alinhados ao fluxo real do produto:

1. o gateway envia um evento
2. o caso nasce na plataforma
3. o seller/admin ganha contexto
4. a IA decide a estratégia
5. a mensagem sai
6. a conversa continua
7. o admin governa escala, qualidade e fila

## Leitura do estado atual do projeto

Hoje o projeto já tem uma base muito boa para subagentes porque a arquitetura está relativamente bem separada por domínio:

- `src/server/recovery/services/payment-recovery-service.ts`
  - é o grande orquestrador do produto
  - concentra intake, persistência, lead, retry, admin, seller, calendar e health
- `src/server/recovery/services/messaging-service.ts`
  - concentra canal, inbound/outbound, status e QR/session
- `src/server/recovery/services/recovery-worker-service.ts`
  - concentra execução assíncrona, retries e jobs
- `src/server/recovery/ai/*`
  - já existe um começo real de camada de decisão de IA
- `src/server/auth/*`
  - já existe um domínio próprio de sessão, identidade e seller
- `src/app/*`
  - o produto operacional está bem dividido entre `connect`, `admin`, `leads`, `inbox`, `dashboard`, `calendar`, `ai`

## Conclusão principal

O projeto **já está pronto para ter subagentes**, mas eles devem ser criados sobre o ciclo de vida do lead, não sobre modismos.

Se fizermos isso certo, os subagentes vão:

- reduzir pressão sobre o `PaymentRecoveryService`
- deixar a automação mais previsível
- facilitar escala com sellers
- dar mais governança ao admin
- melhorar observabilidade e segurança operacional

Se fizermos errado, vamos criar:

- lógica duplicada
- conflitos entre automação e seller
- IA decidindo fora de contexto
- manutenção difícil

## Princípios para os subagentes

### 1. Cada subagente deve ter uma pergunta central

Exemplos:

- este evento deve virar lead?
- qual estratégia esse caso pede?
- essa mensagem deve sair agora?
- esse seller pode receber mais volume?

### 2. Cada subagente deve ter fronteira de escrita

Ele pode:

- propor ação
- enriquecer contexto
- disparar um conjunto limitado de efeitos

Ele não deve:

- sair alterando tudo em todo o sistema

### 3. O lead é a unidade principal

Tudo deve orbitar em torno de:

- `payment`
- `lead`
- `conversation`
- `seller`
- `queue jobs`

### 4. Admin sempre deve conseguir governar

Mesmo com IA forte, o admin precisa conseguir:

- pausar seller
- limitar carteira
- desligar inbox
- desligar automações
- mudar autonomia
- comparar taxa real e taxa da plataforma

### 5. Toda decisão de subagente deve ser auditável

O sistema já tem fila e logs. Os subagentes devem se apoiar nisso.

## Mapa recomendado de subagentes

## Fase 1: Subagentes centrais

Esses são os subagentes que mais aumentam qualidade e escala sem bagunçar a base.

### 1. Subagente de Intake e Roteamento

**Missão**

Receber o evento do gateway, validar escopo, deduplicar e decidir para qual operação/seller o caso pertence.

**Pergunta central**

"Este webhook é válido, novo e pertence a qual lane operacional?"

**Domínio**

- webhook gateway
- seller-specific webhooks
- normalização inicial
- deduplicação
- contexto mínimo para fila

**Arquivos que ele já encosta**

- `src/server/recovery/controllers/webhook-controller.ts`
- `src/server/recovery/webhooks/event-normalizer.ts`
- `src/server/recovery/services/payment-recovery-service.ts`
- `src/server/recovery/services/recovery-automation.ts`
- `src/server/recovery/queues/recovery-queues.ts`

**Por que vale criar**

Hoje esse papel já existe, mas ainda muito embutido no `PaymentRecoveryService`. Separar esse subagente facilita:

- suporte a múltiplos sellers via webhook próprio
- tolerância a payloads irregulares do gateway
- crescimento de integrações sem poluir a regra de recovery

**Saídas esperadas**

- evento normalizado
- seller resolvido
- webhook persistido
- job `webhook-process`

### 2. Subagente de Estratégia de Recovery

**Missão**

Classificar cada caso e decidir a estratégia de recuperação.

**Pergunta central**

"Qual é a melhor próxima abordagem para este lead agora?"

**Domínio**

- classificação
- prioridade
- escolha de canal
- escolha de tom
- escolha de timing

**Arquivos que ele já encosta**

- `src/server/recovery/ai/recovery-classifier.ts`
- `src/server/recovery/ai/strategy-engine.ts`
- `src/server/recovery/ai/orchestrator.ts`
- `src/server/recovery/services/payment-recovery-service.ts`
- `src/server/recovery/services/recovery-automation.ts`

**Por que vale criar**

Esse é o cérebro do produto. Sem esse subagente, a IA vira só geradora de copy.

Com ele, o produto começa a decidir:

- quando insistir
- quando pausar
- quando trocar canal
- quando escalar para humano

**Saídas esperadas**

- probabilidade de recuperação
- estratégia sugerida
- próxima etapa sugerida
- necessidade ou não de automação

### 3. Subagente de Conversa e Follow-up

**Missão**

Executar a comunicação do caso, mantendo coerência de contexto, timing e continuidade.

**Pergunta central**

"O que devemos mandar agora, por qual canal e com qual contexto?"

**Domínio**

- primeira mensagem
- follow-ups
- continuação após inbound
- regras de pausa
- detecção de espera vs insistência

**Arquivos que ele já encosta**

- `src/server/recovery/services/messaging-service.ts`
- `src/server/recovery/ai/message-generator.ts`
- `src/server/recovery/services/recovery-worker-service.ts`
- `src/app/inbox/page.tsx`
- `src/components/ui/message-bubble.tsx`

**Por que vale criar**

Este é o coração percebido pelo cliente final. É onde a operação deixa de ser dashboard e vira recuperação real.

Separar esse subagente ajuda a:

- evitar copy inconsistente
- evitar disparo fora de hora
- tratar inbound com contexto
- padronizar handoff entre IA e seller

**Saídas esperadas**

- mensagem outbound pronta
- status de envio
- decisão de seguir, pausar ou escalar
- atualização de conversa

### 4. Subagente de Governança de Seller

**Missão**

Garantir que cada seller opere dentro da sua capacidade, política e autonomia.

**Pergunta central**

"Esse seller pode receber, agir e automatizar este caso?"

**Domínio**

- seller users
- seller invites
- controles do admin
- autonomia por seller
- capacidade máxima
- acesso a inbox e automações

**Arquivos que ele já encosta**

- `src/server/auth/core.ts`
- `src/server/auth/identities.ts`
- `src/app/admin/page.tsx`
- `src/app/actions/admin-actions.ts`
- `src/app/actions/seller-invite-actions.ts`
- `src/server/recovery/services/payment-recovery-service.ts`
- `src/server/recovery/services/storage.ts`
- `src/server/recovery/services/supabase-storage.ts`

**Por que vale criar**

Esse projeto já tem multi-seller real. Sem um subagente de governança, a escala vira desorganização.

Esse subagente é o que permite:

- sellers com lanes próprias
- webhooks próprios
- limitação de carga
- autonomia graduada
- expansão segura da operação

**Saídas esperadas**

- seller elegível ou não
- política de autonomia ativa
- bloqueios operacionais
- sugestão de redistribuição de carteira

### 5. Subagente de Execução e Fila

**Missão**

Manter o worker saudável, rápido e previsível.

**Pergunta central**

"Quais jobs devem rodar agora, em que ordem e com qual capacidade?"

**Domínio**

- claim de jobs
- paralelismo
- retry
- backoff
- priorização
- lag da fila

**Arquivos que ele já encosta**

- `src/server/recovery/services/recovery-worker-service.ts`
- `src/server/recovery/services/storage.ts`
- `src/server/recovery/services/supabase-storage.ts`
- `src/server/recovery/controllers/worker-controller.ts`
- `src/app/admin/page.tsx`
- `vercel.json`

**Por que vale criar**

O projeto já saiu do modo frágil de webhook síncrono. Agora esse subagente é o eixo de escala técnica.

Ele é essencial para:

- throughput do gateway
- follow-up em massa
- resiliência a falhas temporárias
- visibilidade para admin

**Saídas esperadas**

- priorização de jobs
- resultados de execução
- jobs reagendados
- indicadores de lag e falha

## Fase 2: Subagentes de excelência operacional

Esses não são os primeiros a criar, mas levam o produto de "bom" para "excelente".

### 6. Subagente de Link de Pagamento e Pix

**Missão**

Garantir que a comunicação sempre tenha um link/pix válido e atual.

**Pergunta central**

"O caso já tem um meio de pagamento recuperável e pronto para envio?"

**Domínio**

- `paymentUrl`
- `pixCode`
- `pixQrCode`
- expiração
- integração com gateway para gerar link novo quando necessário

**Arquivos que ele já encosta**

- `src/server/recovery/webhooks/event-normalizer.ts`
- `src/server/recovery/services/payment-recovery-service.ts`
- `src/server/recovery/types.ts`
- `src/server/recovery/services/messaging-service.ts`

**Por que vale criar**

Isso fecha o ciclo comercial. Sem esse subagente, a plataforma ainda depende muito do payload recebido.

### 7. Subagente de Qualidade e Guardrails

**Missão**

Evitar que automações saiam em contexto errado.

**Pergunta central**

"É seguro enviar, continuar ou automatizar este caso agora?"

**Domínio**

- canal indisponível
- seller pausado
- lead já fechado
- mensagem duplicada
- timing ruim
- provider com erro

**Arquivos que ele já encosta**

- `src/server/recovery/services/messaging-service.ts`
- `src/server/recovery/services/recovery-worker-service.ts`
- `src/server/recovery/services/connection-settings-service.ts`
- `src/app/connect/page.tsx`
- `src/app/admin/page.tsx`

**Por que vale criar**

Esse subagente reduz o risco operacional invisível.

### 8. Subagente de Onboarding Operacional

**Missão**

Fazer o seller entrar rápido, com setup correto e primeira operação bem-sucedida.

**Pergunta central**

"Esse seller está pronto para receber tráfego e operar?"

**Domínio**

- convite
- criação manual
- setup de webhook
- leitura de integração
- primeira validação de tráfego

**Arquivos que ele já encosta**

- `src/app/invite/[token]/page.tsx`
- `src/app/onboarding/page.tsx`
- `src/app/connect/page.tsx`
- `src/app/admin/page.tsx`
- `src/app/actions/seller-invite-actions.ts`

**Por que vale criar**

Hoje o projeto já tem seller invite e seller webhook. Esse subagente transforma isso em onboarding de verdade, não só cadastro.

### 9. Subagente de Inteligência Operacional

**Missão**

Traduzir a operação em leitura acionável para admin.

**Pergunta central**

"Onde estão gargalo, sobrecarga, risco e oportunidade de recuperação?"

**Domínio**

- analytics
- calendar
- dashboard
- taxa real vs taxa plataforma
- performance por seller
- volume por lane

**Arquivos que ele já encosta**

- `src/app/dashboard/page.tsx`
- `src/app/calendar/page.tsx`
- `src/app/admin/page.tsx`
- `src/server/recovery/controllers/analytics-controller.ts`
- `src/server/recovery/services/payment-recovery-service.ts`

**Por que vale criar**

Ajuda o admin a deixar de só reagir e começar a governar a operação com mais precisão.

## Fase 3: Subagente de exceção e revisão humana

### 10. Subagente de Casos Sensíveis

**Missão**

Identificar casos que não devem seguir no fluxo normal.

**Pergunta central**

"Esse caso deve sair da automação padrão e ir para revisão humana?"

**Domínio**

- chargeback
- cliente irritado
- pedido de cancelamento
- múltiplas falhas sem resposta
- incoerência de dados

**Arquivos que ele já encosta**

- `src/server/recovery/ai/recovery-classifier.ts`
- `src/server/recovery/services/messaging-service.ts`
- `src/server/recovery/services/recovery-worker-service.ts`
- `src/app/inbox/page.tsx`
- `src/app/leads/page.tsx`

**Por que vale criar**

Esse subagente melhora confiança e evita desgaste de marca.

## Ordem ideal de criação

### Ordem recomendada

1. Subagente de Estratégia de Recovery
2. Subagente de Conversa e Follow-up
3. Subagente de Governança de Seller
4. Subagente de Execução e Fila
5. Subagente de Link de Pagamento e Pix
6. Subagente de Qualidade e Guardrails
7. Subagente de Onboarding Operacional
8. Subagente de Inteligência Operacional
9. Subagente de Casos Sensíveis

## O que não devemos criar agora

### Não criar um "super agente"

Um agente único para intake, estratégia, seller, mensagem e admin vai virar confusão e opacidade.

### Não criar subagentes por tela

Exemplo ruim:

- agente do dashboard
- agente do calendário
- agente do CRM

As telas são superfícies. Os subagentes devem seguir domínios e decisões, não páginas.

### Não acoplar IA diretamente ao provider

A IA decide estratégia e copy. O provider decide entrega. Misturar isso vai dificultar muito o suporte.

## Arquitetura alvo recomendada

Cada subagente deve operar com este contrato mental:

### Entrada

- `lead`
- `payment`
- `conversation`
- `seller control`
- `runtime settings`
- `last activity`

### Saída

- `proposed_action`
- `reason`
- `confidence`
- `side_effects`
- `requires_human`

### Efeitos permitidos

- criar/sugerir mensagem
- reagendar job
- mover etapa
- escalar para seller/admin
- marcar bloqueio operacional

## Como isso conversa com a arquitetura atual

Hoje o maior ponto de centralização é o `PaymentRecoveryService`.

Isso não é um problema imediato, mas é o principal candidato a ficar grande demais.

A boa notícia é que o projeto já tem os ganchos certos para subagentes:

- `ai/*`
- `messaging-service`
- `recovery-worker-service`
- `connection-settings-service`
- `auth/*`
- `storage` / `supabase-storage`

Então a evolução ideal é:

1. reduzir o peso do `PaymentRecoveryService`
2. transformar decisões repetidas em subagentes explícitos
3. manter storage e worker como infraestrutura de execução

## Recomendação final

Se o objetivo é deixar o Shield Recovery excelente, eu **não criaria 10 subagentes de uma vez**.

Eu começaria por 4:

1. Estratégia de Recovery
2. Conversa e Follow-up
3. Governança de Seller
4. Execução e Fila

Esses 4 já melhoram:

- qualidade da recuperação
- escala com sellers
- previsibilidade do worker
- controle administrativo

Depois disso, o próximo salto real vem de:

- Link de Pagamento e Pix
- Guardrails
- Onboarding Operacional

## Síntese executiva

O core do projeto já está certo: **gateway -> lead -> seller -> conversa -> recuperação -> governança**.

Os subagentes devem reforçar esse eixo, não desviar dele.

Se fizermos isso com disciplina, o Shield Recovery deixa de ser só uma plataforma operacional boa e vira um sistema de recovery realmente escalável, governável e inteligente.
