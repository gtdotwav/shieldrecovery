# Onboarding E Analise Da Usabilidade

## Objetivo
Este material existe para duas coisas ao mesmo tempo:

1. Explicar rapidamente como usar a plataforma ao entrar.
2. Deixar claro o que ja esta funcional, o que depende de integracao externa e o que ainda merece refinamento para a UX ficar mais fluida.

## Leitura executiva
- A plataforma ja tem contexto real de produto.
- As areas principais estao com papel mais claro: `Connect`, `CRM`, `Conversas`, `Automações`, `Calendario`, `Admin`.
- O fluxo principal ja faz sentido para operacao:
  - webhook entra
  - lead nasce ou atualiza
  - conversa nasce
  - CRM organiza
  - IA ajuda
  - worker executa a fila
- O principal risco de usabilidade nao e mais “estrutura errada”.
- O principal risco agora e o usuario entrar sem entender a ordem correta de uso.

## Quem usa o que

### Admin
- Configura ambiente e integrações.
- Acompanha a carteira geral.
- Controla sellers, metas, limites e autonomia.
- Observa fila, worker e pontos de gargalo.

### Seller
- Trabalha a propria carteira.
- Usa o CRM como area principal.
- Continua a tratativa na Inbox.
- Usa Automações como apoio, nao como area de configuracao.

## Ordem recomendada de uso

### Admin
1. `Connect`
2. `Dashboard`
3. `Admin`
4. `CRM`
5. `Conversas`
6. `Automações`
7. `Calendario`

### Seller
1. `CRM`
2. `Conversas`
3. `Automações`
4. `Calendario`
5. `Connect` apenas para consultar URLs e estado

## O que cada area faz

### Home
- Explica o produto e a tese da operacao.
- Nao e area de trabalho.

### Guia
- E o novo ponto de entrada orientado.
- Explica cada modulo e mostra o estado real do ambiente.
- Deve virar a primeira referencia para onboarding.

### Recuperação
- Painel de controle da carteira.
- Serve para leitura executiva e prioridade.
- Nao e a area certa para tratar cada caso em detalhe.

### Admin
- Governanca da operacao.
- Controle de sellers, metas, acessos, autonomia e worker.
- E onde o time de operacao central controla o jogo.

### Integrações
- Mostra o que esta ativo e o que falta.
- E a area mais importante no setup inicial.
- O seller pode consultar; o admin configura.

### CRM
- Area principal de trabalho.
- Mostra carteira, etapa, dono, valor, contato e acao.
- E a melhor tela para seller com volume.

### Conversas
- Central de atendimento.
- Mantem a thread viva e ligada ao lead.
- Faz sentido para quem precisa responder, nao so observar.

### Automações
- Mostra a leitura da IA e o motor operacional.
- Faz sentido como leitura e acompanhamento de estrategia.

### Calendario
- Hoje esta melhor como leitura de movimento.
- A decisao certa foi simplificar o mes e deixar o detalhe na data aberta.

### Testes
- Area de homologacao.
- Serve para admins validarem o fluxo sem depender do gateway real.

## O que esta funcional hoje
- Login com papeis `admin` e `seller`.
- Multi-seller persistido.
- Painel admin com governanca.
- Worker com rota e cron.
- CRM em lista mais adequado para escala.
- Inbox ligada a leads.
- Connect configuravel pelo front.
- Calendario com leitura simplificada por dia.
- WhatsApp com estrutura de provider e QR no modo `web_api`.
- Webhooks publicos do gateway e WhatsApp.
- Persistencia em Supabase.

## O que depende de ambiente ou integracao externa
- Disparo real pelo WhatsApp depende de provider valido.
- IA depende de chave configurada.
- Worker depende de ambiente com executor/cron valido.
- Qualidade do follow-up depende do payload real chegar completo do gateway.

## Conclusao critica de UX
- O produto ja esta usavel.
- O desenho atual ja e coerente para V1 operacional.
- O maior ganho de UX nao e adicionar mais paginas.
- O maior ganho e reduzir ambiguidade para o primeiro acesso.

## O que eu mudaria para ficar ainda mais fluido
1. Abrir o `Guia` automaticamente no primeiro login de cada perfil.
2. Reforcar empty states com “proxima acao” exata.
3. Manter `CRM` como homepage natural do seller.
4. Manter `Connect` como primeira parada natural do admin.
5. Continuar secando telas de apoio para nao competir com `CRM` e `Conversas`.

## Fechamento
Se a pergunta for “a plataforma ja tem contexto e faz sentido?”, a resposta e sim.

Se a pergunta for “ela ja esta perfeita sem orientacao interna?”, a resposta ainda e nao.

Por isso o onboarding dentro da plataforma e importante: ele resolve o principal gargalo atual, que nao e falta de recurso, e sim falta de leitura guiada da ordem certa de uso.
