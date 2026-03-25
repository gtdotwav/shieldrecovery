# Fase 1: Plano Técnico de Estratégia e Follow-up

## Objetivo da fase

Fazer a IA deixar de atuar apenas como apoio de texto e passar a operar como motor claro de decisão de recovery.

Nesta fase, o foco é:

- classificar melhor cada caso
- decidir a próxima ação de forma explícita
- padronizar a continuidade da conversa
- reduzir improviso dentro do `PaymentRecoveryService`

## Problema atual

Hoje o projeto já consegue:

- receber webhook
- abrir lead
- criar conversa
- gerar mensagem
- seguir via worker

Mas parte importante da inteligência ainda está espalhada entre:

- `payment-recovery-service.ts`
- `messaging-service.ts`
- `recovery-worker-service.ts`
- `message-generator.ts`

Na prática, isso significa:

- a estratégia do caso ainda não é uma entidade forte
- a “próxima ação” ainda depende demais do fluxo em que o código caiu
- a IA já gera resposta, mas ainda não governa o ciclo inteiro com clareza

## Resultado esperado ao fim da fase

Ao final da Fase 1, queremos que cada lead tenha:

- uma classificação explícita
- uma estratégia explícita
- uma próxima ação explícita
- um motivo explícito
- uma política clara de continuidade da conversa

## Entregas centrais

### 1. Criar um contrato de decisão de recovery

Hoje já existe tipagem de IA, mas falta um contrato central que responda:

- probabilidade de recuperação
- urgência
- melhor canal
- timing recomendado
- tom da abordagem
- condição de escala para humano
- condição de pause

### Arquivos principais

- `src/server/recovery/ai/types.ts`
- `src/server/recovery/ai/recovery-classifier.ts`
- `src/server/recovery/ai/strategy-engine.ts`

### Tarefa

Criar uma estrutura como:

- `nextAction`
- `reason`
- `channel`
- `timing`
- `tone`
- `requiresHuman`
- `followUpMode`

### 2. Consolidar um “recovery decision engine”

Hoje a classificação e a estratégia existem, mas ainda devem virar um ponto único de decisão reutilizável.

### Arquivos principais

- `src/server/recovery/ai/orchestrator.ts`
- `src/server/recovery/ai/recovery-classifier.ts`
- `src/server/recovery/ai/strategy-engine.ts`

### Tarefa

Criar uma função única para algo como:

- `decideRecoveryPlan(lead, conversation, payment, sellerPolicy)`

Essa função deve devolver:

- estratégia do caso
- próxima ação
- justificativa
- se a IA pode agir sozinha
- qual mensagem deve ser tentada

### 3. Tirar decisão de estratégia de dentro do serviço principal

Hoje o `PaymentRecoveryService` decide coisa demais.

### Arquivo principal

- `src/server/recovery/services/payment-recovery-service.ts`

### Tarefa

Reduzir o serviço principal para estes papéis:

- validar contexto
- carregar dados
- chamar o motor de decisão
- persistir efeito
- chamar automação/mensagem

O serviço não deve continuar sendo o lugar onde toda regra de recovery mora.

### 4. Separar melhor o follow-up automático da mensagem inicial

Hoje o fluxo de primeira mensagem e follow-up posterior ainda compartilha muita lógica implícita.

### Arquivos principais

- `src/server/recovery/services/messaging-service.ts`
- `src/server/recovery/services/recovery-worker-service.ts`
- `src/server/recovery/ai/message-generator.ts`

### Tarefa

Criar duas trilhas mais explícitas:

- `initial recovery prompt`
- `ongoing conversation follow-up`

Isso melhora:

- previsibilidade
- contexto
- regras de insistência
- handoff para seller

### 5. Criar regra formal de inbound

Hoje já existe resposta automática, mas a leitura do inbound ainda pode evoluir para algo mais determinístico.

### Arquivos principais

- `src/server/recovery/services/messaging-service.ts`
- `src/server/recovery/services/recovery-worker-service.ts`
- `src/server/recovery/ai/message-generator.ts`

### Tarefa

Ao chegar mensagem do cliente, o sistema deve classificar:

- dúvida
- objeção
- intenção de pagar
- pedido de tempo
- irritação / fricção
- resposta irrelevante

E então decidir:

- responder automaticamente
- aguardar
- escalar para seller

## Backlog técnico detalhado

## Bloco A: Tipos e contratos

### Tarefas

- revisar `src/server/recovery/ai/types.ts`
- criar tipos explícitos para:
  - `RecoveryNextAction`
  - `RecoveryDecision`
  - `ConversationFollowUpDecision`
  - `InboundIntent`
  - `EscalationReason`
- revisar tipos existentes para evitar duplicação entre IA e service layer

### Critério de pronto

- qualquer decisão importante de recovery passa a ter tipo próprio

## Bloco B: Decision engine

### Tarefas

- extrair regra de decisão do fluxo espalhado
- criar método central no domínio de IA
- unificar “classificação + estratégia + próxima ação”
- permitir leitura da política do seller na decisão

### Arquivos prováveis

- `src/server/recovery/ai/orchestrator.ts`
- `src/server/recovery/ai/recovery-classifier.ts`
- `src/server/recovery/ai/strategy-engine.ts`
- `src/server/recovery/services/payment-recovery-service.ts`

### Critério de pronto

- primeira abordagem e follow-up passam pelo mesmo motor conceitual

## Bloco C: Fluxo de outbound

### Tarefas

- separar criação de mensagem inicial de continuação
- usar decisão explícita para escolher conteúdo
- registrar no metadata:
  - razão da mensagem
  - estratégia
  - origem da ação
  - tipo de follow-up

### Arquivos prováveis

- `src/server/recovery/services/messaging-service.ts`
- `src/server/recovery/ai/message-generator.ts`
- `src/server/recovery/services/payment-recovery-service.ts`

### Critério de pronto

- toda mensagem passa a nascer com contexto estratégico legível

## Bloco D: Fluxo de inbound

### Tarefas

- classificar intenção do cliente
- criar política de auto-reply vs handoff
- parar insistência quando o contexto mudou
- atualizar lead/status com mais coerência após inbound

### Arquivos prováveis

- `src/server/recovery/services/messaging-service.ts`
- `src/server/recovery/services/recovery-worker-service.ts`
- `src/server/recovery/ai/message-generator.ts`

### Critério de pronto

- inbound deixa de ser só texto recebido e vira gatilho claro de decisão

## Bloco E: Worker e cadência

### Tarefas

- fazer o worker consultar decisão estratégica antes de insistir
- formalizar “deve tentar follow-up agora?”
- formalizar “deve pausar?”
- formalizar “deve escalar?”

### Arquivos prováveis

- `src/server/recovery/services/recovery-worker-service.ts`
- `src/server/recovery/services/payment-recovery-service.ts`

### Critério de pronto

- o worker deixa de ser só executor de jobs e passa a ser executor de decisões

## Arquitetura desejada ao fim da fase

### Fluxo desejado

1. chega o evento
2. o caso nasce
3. o motor de decisão monta o plano do lead
4. a mensagem inicial sai com estratégia explícita
5. o inbound entra
6. o motor reavalia o plano
7. o worker executa a próxima ação certa

## O que não vamos fazer nesta fase

- não vamos reabrir auth
- não vamos mexer forte em seller onboarding
- não vamos refatorar admin inteiro
- não vamos criar integração nova de gateway agora
- não vamos tentar resolver toda observabilidade nesta fase

## Ordem de implementação recomendada

### Passo 1

Tipos e contratos em `ai/types.ts`

### Passo 2

Criar motor unificado de decisão

### Passo 3

Refatorar `PaymentRecoveryService` para depender desse motor

### Passo 4

Separar melhor mensagem inicial vs follow-up

### Passo 5

Formalizar inbound intent e handoff

### Passo 6

Conectar o worker ao novo contrato

## Critério final da fase

Vamos considerar a Fase 1 pronta quando:

- cada lead tiver estratégia explícita
- cada mensagem tiver motivo explícito
- inbound disparar decisão coerente
- o worker agir com base em decisão e não só em cronologia
- a IA ficar mais previsível para admin e seller

## Recomendação prática

O melhor começo técnico agora é:

1. atacar `src/server/recovery/ai/types.ts`
2. depois `src/server/recovery/ai/orchestrator.ts`
3. depois refatorar `src/server/recovery/services/payment-recovery-service.ts`

Essa é a menor sequência com maior ganho estrutural.
