# Backlog por Fase dos Subagentes

## Objetivo

Traduzir o estudo de subagentes em uma ordem prática de construção.

Aqui a ideia não é descrever o sistema de novo. A ideia é responder:

- o que fazemos primeiro
- o que depende do quê
- o que já gera valor real
- o que deve esperar

## Regra de priorização

Cada fase foi definida pelo impacto no core do produto:

1. receber e organizar o caso
2. decidir a estratégia
3. executar follow-up com coerência
4. escalar com sellers sem perder controle
5. endurecer qualidade e previsibilidade

---

## Fase 1: Estratégia e execução do recovery

### Objetivo

Fazer a IA deixar de ser apenas apoio de copy e passar a conduzir a lógica principal da recuperação.

### Subagentes da fase

- Estratégia de Recovery
- Conversa e Follow-up

### Entregas

- separar a decisão estratégica da orquestração geral
- criar um contrato claro para “próxima melhor ação”
- padronizar a geração da primeira mensagem e dos follow-ups
- definir quando a IA continua, pausa ou escala para humano
- consolidar regras de inbound no fluxo da conversa

### Arquivos principais

- `src/server/recovery/ai/recovery-classifier.ts`
- `src/server/recovery/ai/strategy-engine.ts`
- `src/server/recovery/ai/orchestrator.ts`
- `src/server/recovery/ai/message-generator.ts`
- `src/server/recovery/services/payment-recovery-service.ts`
- `src/server/recovery/services/messaging-service.ts`
- `src/server/recovery/services/recovery-worker-service.ts`

### Critério de pronto

- cada lead passa a ter estratégia explícita
- cada follow-up sai com razão definida
- inbound já consegue decidir “responder”, “aguardar” ou “escalar”
- seller/admin conseguem entender por que a IA fez algo

### Valor entregue

- melhora imediata do core do produto
- maior coerência de comunicação
- menos comportamento improvisado da IA

---

## Fase 2: Governança de seller e escala operacional

### Objetivo

Escalar com sellers sem perder controle administrativo.

### Subagentes da fase

- Governança de Seller
- Onboarding Operacional

### Entregas

- consolidar política por seller
- separar capacidade, autonomia e acesso
- fechar o fluxo “criar seller” vs “convidar seller”
- tornar seller webhook + setup operacional parte do onboarding real
- permitir ao admin entender prontidão de cada seller

### Arquivos principais

- `src/server/auth/core.ts`
- `src/server/auth/identities.ts`
- `src/app/admin/page.tsx`
- `src/app/actions/admin-actions.ts`
- `src/app/actions/seller-invite-actions.ts`
- `src/app/invite/[token]/page.tsx`
- `src/app/connect/page.tsx`
- `src/server/recovery/services/payment-recovery-service.ts`

### Critério de pronto

- seller entra por convite ou criação manual sem fricção
- cada seller tem lane, webhook e governança claros
- admin sabe quais sellers estão prontos, ativos e recebendo tráfego

### Valor entregue

- expansão segura da operação
- menos setup manual
- mais previsibilidade no crescimento com sellers

---

## Fase 3: Fila, throughput e previsibilidade

### Objetivo

Garantir que a operação continue coesa conforme o volume sobe.

### Subagentes da fase

- Execução e Fila
- Qualidade e Guardrails

### Entregas

- enriquecer priorização da fila por criticidade
- melhorar observabilidade de atraso, falha e backlog
- separar claramente “erro de canal”, “erro de dado” e “erro de automação”
- impedir follow-up fora de contexto
- criar guardrails explícitos para seller pausado, lead fechado, canal indisponível e duplicidade

### Arquivos principais

- `src/server/recovery/services/recovery-worker-service.ts`
- `src/server/recovery/services/storage.ts`
- `src/server/recovery/services/supabase-storage.ts`
- `src/server/recovery/services/messaging-service.ts`
- `src/server/recovery/services/connection-settings-service.ts`
- `src/app/admin/page.tsx`
- `src/app/connect/page.tsx`

### Critério de pronto

- worker mostra fila com mais clareza
- cada falha relevante tem tratamento previsível
- follow-up não insiste em caso já respondido ou bloqueado
- admin enxerga gargalos antes de virarem problema operacional

### Valor entregue

- mais resiliência
- menos desgaste operacional
- mais confiança para aumentar carga do gateway

---

## Fase 4: Link de pagamento e recuperação comercial completa

### Objetivo

Fazer a plataforma controlar melhor o ativo principal da recuperação: o meio de pagamento.

### Subagentes da fase

- Link de Pagamento e Pix

### Entregas

- consolidar leitura de `paymentUrl`, `pixCode`, `pixQrCode`, expiração
- tratar melhor payloads vindos do gateway
- se necessário, plugar geração ativa de novo link pelo gateway
- padronizar mensagem de cobrança com contexto comercial forte

### Arquivos principais

- `src/server/recovery/webhooks/event-normalizer.ts`
- `src/server/recovery/services/payment-recovery-service.ts`
- `src/server/recovery/services/messaging-service.ts`
- `src/server/recovery/types.ts`

### Critério de pronto

- o caso sempre tem um ativo de conversão claro
- a mensagem sai com contexto comercial utilizável
- expiração e renovação deixam de ser improvisadas

### Valor entregue

- aumento direto na capacidade de recuperação
- menos dependência de fallback interno

---

## Fase 5: Inteligência operacional e casos sensíveis

### Objetivo

Refinar a operação para qualidade alta, governança madura e menos desgaste.

### Subagentes da fase

- Inteligência Operacional
- Casos Sensíveis

### Entregas

- detectar sellers sobrecarregados
- sinalizar gargalos por canal, fila e carteira
- destacar casos que devem sair da automação padrão
- dar mais inteligência ao admin para redistribuição e revisão

### Arquivos principais

- `src/app/dashboard/page.tsx`
- `src/app/calendar/page.tsx`
- `src/app/admin/page.tsx`
- `src/app/inbox/page.tsx`
- `src/app/leads/page.tsx`
- `src/server/recovery/controllers/analytics-controller.ts`
- `src/server/recovery/ai/recovery-classifier.ts`

### Critério de pronto

- admin consegue agir antes da operação degringolar
- casos sensíveis deixam de ficar escondidos no fluxo comum
- seller recebe contexto melhor sobre prioridade e risco

### Valor entregue

- maturidade operacional
- melhor qualidade percebida
- mais segurança para autonomia gradual

---

## Ordem prática de construção

### Sprint 1

- Estratégia de Recovery
- Conversa e Follow-up

### Sprint 2

- Governança de Seller
- Onboarding Operacional

### Sprint 3

- Execução e Fila
- Qualidade e Guardrails

### Sprint 4

- Link de Pagamento e Pix

### Sprint 5

- Inteligência Operacional
- Casos Sensíveis

---

## Recomendação final

Se a meta é excelência sem estragar o que já foi feito, a sequência certa é:

1. fortalecer o cérebro da recuperação
2. fortalecer a governança dos sellers
3. fortalecer a previsibilidade da fila
4. fortalecer o ativo comercial da cobrança
5. só então sofisticar a inteligência operacional

Isso mantém o Shield Recovery coerente, escalável e cada vez mais utilizável sem cair em refatoração desnecessária.
