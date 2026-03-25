# Estudo Final de Lapidação do Produto

## Objetivo

Levar a Shield Recovery do estado atual de `V1 operacional consistente` para
um `produto final coeso, elegante e pronto para uso diário`, sem refatorações
desnecessárias e sem romper a base que já está funcional.

Este estudo parte de uma leitura prática do projeto: a fundação técnica já está
boa. O que falta agora é menos arquitetura nova e mais lapidação contínua da
experiência.

## O que já está sólido

- Home pública separada das áreas internas.
- Login com perfis `admin` e `seller`.
- `Dashboard`, `CRM`, `Conversas`, `Integrações`, `Automações`, `Calendário`,
  `Admin` e `Guia` já com papel definido.
- Webhooks, worker, Supabase, governança por seller e automação com IA já
  encaixados na arquitetura.
- Fluxo principal já coerente:
  webhook -> lead -> conversa -> CRM -> automação/IA -> acompanhamento.

## Conclusão central

O projeto não precisa de uma nova grande camada estrutural.

O melhor caminho agora é:

1. manter a base técnica,
2. reduzir ruído visual,
3. reforçar orientação de uso,
4. deixar os papéis de cada tela ainda mais óbvios,
5. revisar fluxos reais com dados e operações de verdade.

Em outras palavras: o produto já está construído. Agora precisamos fazê-lo
parecer inevitável, simples e confiável.

## O que ainda pede lapidação

### 1. Entrada na plataforma

Ainda precisamos deixar a chegada mais guiada.

O que fazer:
- reforçar o `Guia` como porta de entrada real;
- melhorar empty states com a próxima ação exata;
- fazer seller cair sempre em uma visão de trabalho, não em uma visão analítica.

### 2. Coesão visual

O sistema já melhorou bastante, mas ainda existem pontos onde a interface
carrega mais informação visual do que deveria.

O que fazer:
- reduzir pills decorativas;
- reduzir superfícies duplicadas;
- evitar duas leituras visuais fortes no mesmo bloco;
- manter fundo, borda, hover e CTA sempre na mesma linguagem.

### 3. Leitura operacional

Algumas áreas ainda precisam ficar mais “de operação” e menos “de apresentação”.

O que fazer:
- tratar métricas como apoio, não como protagonista;
- priorizar lista, estado e próxima ação;
- concentrar densidade nas telas certas;
- usar sidebars só quando elas realmente ajudam.

### 4. Primeiro uso e estados vazios

Hoje a plataforma já explica melhor o que faz, mas ainda dá para evoluir muito
nos estados em que:
- não há lead,
- não há conversa,
- não há seller,
- não há WhatsApp conectado,
- não entrou evento do gateway.

O que fazer:
- sempre mostrar o que falta;
- sempre mostrar qual tela abrir em seguida;
- sempre mostrar o impacto da ausência daquela integração.

## Direção final por área

### Home

Função:
- posicionar o produto;
- explicar o ecossistema sem parecer painel interno.

Direção:
- manter limpa;
- reforçar prova de produto sem virar dashboard;
- reduzir qualquer elemento que lembre nave interna.

### Guia

Função:
- onboarding real;
- dizer por onde começar;
- mostrar o que está pronto e o que ainda depende de conexão.

Direção:
- menos texto institucional;
- mais “próxima ação”;
- mais papel por perfil.

### Dashboard

Função:
- visão de controle;
- gargalos;
- ritmo da operação.

Direção:
- não concorrer com CRM;
- mostrar só o que exige leitura executiva;
- reduzir módulos laterais supérfluos.

### CRM

Função:
- área principal de trabalho.

Direção:
- lista primeiro;
- kanban como apoio;
- ação e etapa mais visíveis do que contexto longo.

### Conversas

Função:
- continuidade real do recovery.

Direção:
- fila limpa;
- thread central;
- contexto do lead sem excesso;
- tudo orientado à próxima resposta.

### Integrações

Função:
- central de setup e diagnóstico.

Direção:
- checklist acima de narrativa;
- o usuário precisa ver rapidamente:
  - o que está ativo,
  - o que falta,
  - qual URL copiar,
  - qual segredo/configuração ainda está pendente.

### Automações

Função:
- leitura do motor;
- não deve parecer painel técnico de laboratório.

Direção:
- atividade recente,
- prioridade,
- estratégia,
- performance,
- estado do motor.

Tudo além disso deve ser secundário.

### Calendário

Função:
- leitura do mês por movimentação;
- memória operacional por dia.

Direção:
- mês enxuto;
- detalhe concentrado na data aberta;
- notas simples;
- nada de transformar o calendário em outro dashboard.

### Admin

Função:
- governança da operação.

Direção:
- localizar seller rápido;
- abrir detalhe só quando necessário;
- controlar limites, autonomia, meta e taxa real sem poluição visual.

## O que não devemos fazer agora

- Não abrir novas áreas sem necessidade.
- Não redesenhar a arquitetura de backend.
- Não trocar storage, auth ou worker sem motivo real.
- Não criar telas duplicadas com papéis já cobertos.
- Não deixar o front “mais bonito” às custas de piorar a leitura.

## Plano recomendado até o produto final

### Fase 1: acabamento estrutural

- lapidar `Guia`, `Calendário`, `Admin` e `Automações`;
- revisar empty states;
- revisar CTA principal por perfil;
- revisar consistência de linguagem visual.

### Fase 2: fechamento operacional

- validar fluxo completo com gateway real;
- validar follow-up automático com canal real;
- validar seller/admin em operação real;
- revisar estados de erro e indisponibilidade.

### Fase 3: go-live

- revisar permissões,
- revisar integrações,
- revisar onboarding,
- revisar worker/cron,
- revisar URLs públicas e webhooks,
- revisar qualidade visual final.

## Prioridade prática imediata

Daqui para frente, a ordem mais inteligente é:

1. continuar lapidando UX/UI com foco em clareza;
2. validar cada fluxo real da operação;
3. só então ajustar detalhes estruturais remanescentes.

## Resumo final

A Shield Recovery já tem uma espinha dorsal boa.

O que falta para ela parecer produto final não é “mais sistema”.
É:

- mais clareza,
- mais consistência,
- mais calma visual,
- mais orientação,
- menos ruído.

Essa deve ser a linha de trabalho até a entrega final.
