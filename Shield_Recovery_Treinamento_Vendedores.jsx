import { useState } from "react";
import { ChevronLeft, ChevronRight, Shield, Zap, MessageSquare, Users, BarChart3, Settings, Brain, Calendar, Layers, ArrowRight, CheckCircle, Target, TrendingUp, Globe, Lock, Bot, Workflow, Database, Headphones, Star, Award, Rocket } from "lucide-react";

const COLORS = {
  navy: "#0F1B2D",
  darkBlue: "#162337",
  accent: "#00D4AA",
  accentDark: "#00B892",
  accentLight: "#00F0C0",
  white: "#FFFFFF",
  offWhite: "#F0F4F8",
  lightGray: "#E2E8F0",
  midGray: "#94A3B8",
  darkGray: "#475569",
  card: "#1A2A42",
  cardLight: "#FFFFFF",
  success: "#10B981",
  warning: "#F59E0B",
  info: "#3B82F6",
};

const slides = [
  // SLIDE 0 - CAPA
  {
    bg: COLORS.navy,
    render: () => (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})` }}>
            <Shield size={36} color={COLORS.navy} strokeWidth={2.5} />
          </div>
        </div>
        <h1 className="text-5xl font-bold mb-3" style={{ color: COLORS.white }}>Shield Recovery</h1>
        <p className="text-lg mb-8" style={{ color: COLORS.accent }}>Plataforma de Recovery com IA</p>
        <div className="w-24 h-0.5 mb-8" style={{ background: COLORS.accent }} />
        <h2 className="text-2xl font-semibold mb-2" style={{ color: COLORS.white }}>Treinamento Comercial Completo</h2>
        <p className="text-base" style={{ color: COLORS.midGray }}>Tudo que você precisa saber para vender, demonstrar e escalar</p>
        <div className="mt-12 px-6 py-3 rounded-lg" style={{ background: COLORS.card, border: `1px solid ${COLORS.accent}30` }}>
          <p className="text-sm" style={{ color: COLORS.midGray }}>Material confidencial — Uso exclusivo da equipe comercial</p>
        </div>
      </div>
    ),
  },

  // SLIDE 1 - AGENDA
  {
    bg: COLORS.offWhite,
    render: () => (
      <div className="h-full px-10 py-8">
        <p className="text-sm font-semibold tracking-widest uppercase mb-1" style={{ color: COLORS.accent }}>Agenda</p>
        <h2 className="text-3xl font-bold mb-8" style={{ color: COLORS.navy }}>O que você vai dominar</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { n: "01", t: "O que é o Shield Recovery", d: "Visão do produto e proposta de valor" },
            { n: "02", t: "Para quem vendemos", d: "Perfil de cliente ideal e dores reais" },
            { n: "03", t: "Arquitetura da plataforma", d: "Módulos, fluxos e integrações" },
            { n: "04", t: "Funcionalidades detalhadas", d: "Cada área explicada com profundidade" },
            { n: "05", t: "Motor de IA", d: "Classificação, estratégia e automação" },
            { n: "06", t: "Perfis: Admin vs Seller", d: "Quem faz o quê dentro da plataforma" },
            { n: "07", t: "Diferenciais competitivos", d: "Por que somos a melhor escolha" },
            { n: "08", t: "Modelo de escala e whitelabel", d: "Como o cliente cresce com a gente" },
          ].map((item) => (
            <div key={item.n} className="flex gap-4 p-4 rounded-lg" style={{ background: COLORS.white, border: `1px solid ${COLORS.lightGray}` }}>
              <span className="text-2xl font-bold" style={{ color: COLORS.accent }}>{item.n}</span>
              <div>
                <p className="font-semibold text-sm" style={{ color: COLORS.navy }}>{item.t}</p>
                <p className="text-xs mt-1" style={{ color: COLORS.darkGray }}>{item.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // SLIDE 2 - O QUE É
  {
    bg: COLORS.navy,
    render: () => (
      <div className="h-full px-10 py-8">
        <p className="text-sm font-semibold tracking-widest uppercase mb-1" style={{ color: COLORS.accent }}>01 — Visão do Produto</p>
        <h2 className="text-3xl font-bold mb-6" style={{ color: COLORS.white }}>O que é o Shield Recovery?</h2>
        <div className="grid grid-cols-5 gap-6">
          <div className="col-span-3">
            <div className="p-5 rounded-lg mb-4" style={{ background: COLORS.card, border: `1px solid ${COLORS.accent}20` }}>
              <p className="text-base leading-relaxed" style={{ color: COLORS.lightGray }}>
                Uma <span className="font-bold" style={{ color: COLORS.accent }}>plataforma SaaS de recuperação de pagamentos</span> que combina CRM operacional,
                inbox de conversas, automações com IA e governança administrativa para transformar cobranças falhas em receita recuperada.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Zap, t: "Recovery automático", d: "Webhook recebe, IA decide, mensagem sai" },
                { icon: MessageSquare, t: "Inbox inteligente", d: "Conversas com contexto total do caso" },
                { icon: Users, t: "Multi-seller", d: "Cada operador com sua carteira e regras" },
                { icon: Brain, t: "IA estratégica", d: "Classificação, timing, tom e canal ideal" },
              ].map((item, i) => (
                <div key={i} className="p-3 rounded-lg flex gap-3" style={{ background: COLORS.darkBlue }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${COLORS.accent}15` }}>
                    <item.icon size={16} color={COLORS.accent} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: COLORS.white }}>{item.t}</p>
                    <p className="text-xs mt-0.5" style={{ color: COLORS.midGray }}>{item.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="col-span-2 flex flex-col gap-3">
            <div className="p-4 rounded-lg text-center" style={{ background: `${COLORS.accent}10`, border: `1px solid ${COLORS.accent}30` }}>
              <p className="text-3xl font-bold" style={{ color: COLORS.accent }}>100%</p>
              <p className="text-xs" style={{ color: COLORS.midGray }}>Operacional como V1</p>
            </div>
            <div className="p-4 rounded-lg text-center" style={{ background: `${COLORS.accent}10`, border: `1px solid ${COLORS.accent}30` }}>
              <p className="text-3xl font-bold" style={{ color: COLORS.accent }}>5+</p>
              <p className="text-xs" style={{ color: COLORS.midGray }}>Módulos integrados</p>
            </div>
            <div className="p-4 rounded-lg text-center" style={{ background: `${COLORS.accent}10`, border: `1px solid ${COLORS.accent}30` }}>
              <p className="text-3xl font-bold" style={{ color: COLORS.accent }}>24/7</p>
              <p className="text-xs" style={{ color: COLORS.midGray }}>Worker automático</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },

  // SLIDE 3 - PARA QUEM VENDEMOS
  {
    bg: COLORS.offWhite,
    render: () => (
      <div className="h-full px-10 py-8">
        <p className="text-sm font-semibold tracking-widest uppercase mb-1" style={{ color: COLORS.accent }}>02 — Mercado</p>
        <h2 className="text-3xl font-bold mb-6" style={{ color: COLORS.navy }}>Para quem vendemos?</h2>
        <div className="grid grid-cols-3 gap-5">
          {[
            { icon: Globe, title: "E-commerce & SaaS", points: ["Alta recorrência de pagamentos", "Churn involuntário por falha de cobrança", "Precisam de recovery em escala", "Volume justifica automação"] },
            { icon: Layers, title: "Infoprodutores", points: ["Vendas por impulso com alto abandono", "Boleto e Pix com prazo curto", "Precisam recuperar rápido", "Sensíveis a tom da abordagem"] },
            { icon: Users, title: "Agências & Operações", points: ["Gerenciam múltiplos clientes", "Precisam de multi-seller", "Querem whitelabel", "Buscam escala operacional"] },
          ].map((item, i) => (
            <div key={i} className="p-5 rounded-xl" style={{ background: COLORS.white, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: `${COLORS.accent}15` }}>
                <item.icon size={20} color={COLORS.accentDark} />
              </div>
              <h3 className="text-lg font-bold mb-3" style={{ color: COLORS.navy }}>{item.title}</h3>
              <div className="flex flex-col gap-2">
                {item.points.map((p, j) => (
                  <div key={j} className="flex items-start gap-2">
                    <CheckCircle size={14} color={COLORS.success} className="mt-0.5 flex-shrink-0" />
                    <p className="text-sm" style={{ color: COLORS.darkGray }}>{p}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 p-4 rounded-lg flex items-center gap-3" style={{ background: `${COLORS.navy}08`, border: `1px solid ${COLORS.navy}15` }}>
          <Target size={20} color={COLORS.navy} />
          <p className="text-sm" style={{ color: COLORS.navy }}>
            <span className="font-bold">Dor central em comum:</span> dinheiro ficando na mesa por falta de uma operação de recovery estruturada, com contexto e continuidade.
          </p>
        </div>
      </div>
    ),
  },

  // SLIDE 4 - FLUXO PRINCIPAL
  {
    bg: COLORS.navy,
    render: () => (
      <div className="h-full px-10 py-8">
        <p className="text-sm font-semibold tracking-widest uppercase mb-1" style={{ color: COLORS.accent }}>03 — Arquitetura</p>
        <h2 className="text-3xl font-bold mb-6" style={{ color: COLORS.white }}>O fluxo da recuperação</h2>
        <div className="flex flex-col gap-3">
          {[
            { step: "1", title: "Webhook do Gateway", desc: "Pagamento falha → evento chega automaticamente na plataforma", icon: Zap },
            { step: "2", title: "Intake e Normalização", desc: "Validação, deduplicação e criação de customer/payment/lead", icon: Database },
            { step: "3", title: "IA Classifica e Decide", desc: "Probabilidade, urgência, canal ideal, tom e timing da abordagem", icon: Brain },
            { step: "4", title: "Mensagem Sai (WhatsApp/Email)", desc: "Copy personalizada com link de pagamento, Pix ou boleto", icon: MessageSquare },
            { step: "5", title: "CRM Organiza", desc: "Lead entra na carteira com etapa, dono e próxima ação definidos", icon: Layers },
            { step: "6", title: "Worker Continua", desc: "Follow-ups automáticos respeitando contexto, timing e resposta do cliente", icon: Workflow },
            { step: "7", title: "Admin Governa", desc: "Visão executiva, controle de sellers, metas e taxa de recuperação", icon: BarChart3 },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-lg" style={{ background: COLORS.card }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-lg font-bold" style={{ background: COLORS.accent, color: COLORS.navy }}>
                {item.step}
              </div>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${COLORS.accent}15` }}>
                <item.icon size={16} color={COLORS.accent} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color: COLORS.white }}>{item.title}</p>
                <p className="text-xs" style={{ color: COLORS.midGray }}>{item.desc}</p>
              </div>
              {i < 6 && <ArrowRight size={14} color={COLORS.accent} className="opacity-40" />}
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // SLIDE 5 - MÓDULOS DETALHADOS (PARTE 1)
  {
    bg: COLORS.offWhite,
    render: () => (
      <div className="h-full px-10 py-8">
        <p className="text-sm font-semibold tracking-widest uppercase mb-1" style={{ color: COLORS.accent }}>04 — Funcionalidades</p>
        <h2 className="text-3xl font-bold mb-5" style={{ color: COLORS.navy }}>Módulos da plataforma (1/2)</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            {
              icon: BarChart3, title: "Dashboard", color: COLORS.info,
              features: ["Visão executiva da carteira", "Taxa de recuperação em tempo real", "Valor recuperado no período", "Prioridades do dia", "Leitura de gargalos por canal"],
              who: "Admin"
            },
            {
              icon: Settings, title: "Connect (Integrações)", color: COLORS.warning,
              features: ["Configurar Supabase, Gateway, WhatsApp", "Configurar OpenAI e CRM", "Status de cada integração", "URLs públicas de webhook", "Seller vê status; Admin configura"],
              who: "Admin configura / Seller consulta"
            },
            {
              icon: Users, title: "CRM (Leads)", color: COLORS.success,
              features: ["Carteira com lista + kanban", "Filtro por etapa, dono e status", "Detalhe completo do caso", "Histórico de conversa no lead", "Seller opera sua própria carteira"],
              who: "Admin + Seller"
            },
            {
              icon: MessageSquare, title: "Inbox (Conversas)", color: COLORS.accent,
              features: ["Central de conversas em tempo real", "Continue follow-up manualmente", "Peça resposta da IA", "Altere status da conversa", "Admin controla acesso do seller"],
              who: "Admin + Seller (se liberado)"
            },
          ].map((mod, i) => (
            <div key={i} className="p-4 rounded-xl" style={{ background: COLORS.white, boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${mod.color}15` }}>
                  <mod.icon size={16} color={mod.color} />
                </div>
                <h3 className="font-bold text-base" style={{ color: COLORS.navy }}>{mod.title}</h3>
              </div>
              <div className="flex flex-col gap-1.5 mb-3">
                {mod.features.map((f, j) => (
                  <div key={j} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: mod.color }} />
                    <p className="text-xs" style={{ color: COLORS.darkGray }}>{f}</p>
                  </div>
                ))}
              </div>
              <div className="px-2 py-1 rounded text-xs inline-block" style={{ background: `${mod.color}10`, color: mod.color }}>
                {mod.who}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // SLIDE 6 - MÓDULOS DETALHADOS (PARTE 2)
  {
    bg: COLORS.offWhite,
    render: () => (
      <div className="h-full px-10 py-8">
        <p className="text-sm font-semibold tracking-widest uppercase mb-1" style={{ color: COLORS.accent }}>04 — Funcionalidades</p>
        <h2 className="text-3xl font-bold mb-5" style={{ color: COLORS.navy }}>Módulos da plataforma (2/2)</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              icon: Brain, title: "Automações (IA)", color: "#8B5CF6",
              features: ["Classificação automática do caso", "Estratégia de abordagem", "Geração de copy personalizada", "Continuidade inteligente da conversa", "Decisão: insistir, pausar ou escalar"],
              who: "Admin + Seller (se liberado)"
            },
            {
              icon: Calendar, title: "Calendário", color: COLORS.info,
              features: ["Leitura do movimento por dia", "Detalhe com notas na data aberta", "Timeline operacional", "Memória da operação por período"],
              who: "Admin + Seller"
            },
            {
              icon: Lock, title: "Admin", color: "#EF4444",
              features: ["Governança dos sellers", "Controle de meta e limite", "Controle de autonomia", "Acesso a inbox/automações por seller", "Taxa real de recuperação manual"],
              who: "Apenas Admin"
            },
          ].map((mod, i) => (
            <div key={i} className="p-4 rounded-xl" style={{ background: COLORS.white, boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${mod.color}15` }}>
                  <mod.icon size={16} color={mod.color} />
                </div>
                <h3 className="font-bold text-base" style={{ color: COLORS.navy }}>{mod.title}</h3>
              </div>
              <div className="flex flex-col gap-1.5 mb-3">
                {mod.features.map((f, j) => (
                  <div key={j} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: mod.color }} />
                    <p className="text-xs" style={{ color: COLORS.darkGray }}>{f}</p>
                  </div>
                ))}
              </div>
              <div className="px-2 py-1 rounded text-xs inline-block" style={{ background: `${mod.color}10`, color: mod.color }}>
                {mod.who}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-4 rounded-lg" style={{ background: COLORS.white, border: `1px solid ${COLORS.lightGray}` }}>
          <div className="flex items-center gap-3">
            <Workflow size={18} color={COLORS.accent} />
            <div>
              <p className="text-sm font-semibold" style={{ color: COLORS.navy }}>Worker de Execução</p>
              <p className="text-xs" style={{ color: COLORS.darkGray }}>Módulo invisível que roda em background: consome jobs, executa follow-ups, reprograma falhas e registra logs. Roda via cron (Vercel) ou executor externo a cada 5 min.</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },

  // SLIDE 7 - MOTOR DE IA
  {
    bg: COLORS.navy,
    render: () => (
      <div className="h-full px-10 py-8">
        <p className="text-sm font-semibold tracking-widest uppercase mb-1" style={{ color: COLORS.accent }}>05 — Inteligência Artificial</p>
        <h2 className="text-3xl font-bold mb-6" style={{ color: COLORS.white }}>O cérebro da recuperação</h2>
        <div className="grid grid-cols-2 gap-5">
          <div className="flex flex-col gap-3">
            <div className="p-4 rounded-lg" style={{ background: COLORS.card }}>
              <h3 className="font-bold text-sm mb-2" style={{ color: COLORS.accent }}>Classificação Automática</h3>
              <p className="text-xs" style={{ color: COLORS.midGray }}>Cada caso recebe classificação de probabilidade de recuperação, urgência e melhor canal de abordagem.</p>
            </div>
            <div className="p-4 rounded-lg" style={{ background: COLORS.card }}>
              <h3 className="font-bold text-sm mb-2" style={{ color: COLORS.accent }}>Estratégia de Recovery</h3>
              <p className="text-xs" style={{ color: COLORS.midGray }}>A IA decide: quando insistir, quando pausar, quando trocar canal e quando escalar para humano.</p>
            </div>
            <div className="p-4 rounded-lg" style={{ background: COLORS.card }}>
              <h3 className="font-bold text-sm mb-2" style={{ color: COLORS.accent }}>Geração de Copy</h3>
              <p className="text-xs" style={{ color: COLORS.midGray }}>Mensagens personalizadas com tom adequado ao perfil do cliente e estágio da negociação.</p>
            </div>
            <div className="p-4 rounded-lg" style={{ background: COLORS.card }}>
              <h3 className="font-bold text-sm mb-2" style={{ color: COLORS.accent }}>Leitura de Inbound</h3>
              <p className="text-xs" style={{ color: COLORS.midGray }}>Classifica resposta do cliente: dúvida, objeção, intenção de pagar, pedido de tempo ou irritação.</p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="p-5 rounded-lg" style={{ background: `${COLORS.accent}10`, border: `1px solid ${COLORS.accent}30` }}>
              <h3 className="font-bold text-base mb-3" style={{ color: COLORS.accent }}>Como explicar ao cliente:</h3>
              <div className="flex flex-col gap-3">
                {[
                  "\"A IA não só envia mensagens — ela decide a melhor estratégia para cada caso\"",
                  "\"Cada follow-up tem uma razão explícita, não é spam\"",
                  "\"O sistema sabe quando parar de insistir\"",
                  "\"Admin e seller entendem por que a IA tomou cada decisão\"",
                ].map((q, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Star size={12} color={COLORS.accent} className="mt-1 flex-shrink-0" />
                    <p className="text-xs italic" style={{ color: COLORS.lightGray }}>{q}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 rounded-lg" style={{ background: COLORS.darkBlue }}>
              <p className="text-xs font-semibold mb-2" style={{ color: COLORS.warning }}>Importante para o pitch:</p>
              <p className="text-xs" style={{ color: COLORS.midGray }}>
                Posicione como <span className="font-bold" style={{ color: COLORS.white }}>IA assistida</span>, não como automação 100% autônoma.
                A IA decide e sugere, mas o admin/seller mantém governança total.
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },

  // SLIDE 8 - ADMIN vs SELLER
  {
    bg: COLORS.offWhite,
    render: () => (
      <div className="h-full px-10 py-8">
        <p className="text-sm font-semibold tracking-widest uppercase mb-1" style={{ color: COLORS.accent }}>06 — Perfis e Permissões</p>
        <h2 className="text-3xl font-bold mb-5" style={{ color: COLORS.navy }}>Admin vs Seller</h2>
        <div className="grid grid-cols-2 gap-6">
          <div className="p-5 rounded-xl" style={{ background: COLORS.white, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${COLORS.navy}10` }}>
                <Lock size={20} color={COLORS.navy} />
              </div>
              <h3 className="text-xl font-bold" style={{ color: COLORS.navy }}>Admin</h3>
            </div>
            <p className="text-sm mb-4" style={{ color: COLORS.darkGray }}>Visão total. Controla a operação inteira.</p>
            <div className="flex flex-col gap-2">
              {[
                "Dashboard completo",
                "Configurar todas as integrações",
                "Governar sellers (meta, limite, autonomia)",
                "Controlar acesso à inbox e automações",
                "Registrar taxa real de recuperação",
                "Acessar CRM, Inbox, IA, Calendário",
                "Área de testes",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle size={14} color={COLORS.success} />
                  <p className="text-xs" style={{ color: COLORS.darkGray }}>{item}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="p-5 rounded-xl" style={{ background: COLORS.white, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${COLORS.accent}15` }}>
                <Headphones size={20} color={COLORS.accentDark} />
              </div>
              <h3 className="text-xl font-bold" style={{ color: COLORS.navy }}>Seller</h3>
            </div>
            <p className="text-sm mb-4" style={{ color: COLORS.darkGray }}>Foco na operação. Trabalha sua carteira.</p>
            <div className="flex flex-col gap-2">
              {[
                { t: "CRM com carteira própria", ok: true },
                { t: "Inbox (se liberado pelo admin)", ok: true },
                { t: "Automações (se liberado pelo admin)", ok: true },
                { t: "Calendário operacional", ok: true },
                { t: "Connect (apenas visualizar status)", ok: true },
                { t: "Dashboard / Admin / Testes", ok: false },
                { t: "Alterar chaves e segredos", ok: false },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  {item.ok ? <CheckCircle size={14} color={COLORS.success} /> : <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background: "#FEE2E2" }}><span className="text-xs" style={{ color: "#EF4444" }}>✕</span></div>}
                  <p className="text-xs" style={{ color: item.ok ? COLORS.darkGray : COLORS.midGray }}>{item.t}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
  },

  // SLIDE 9 - INTEGRAÇÕES
  {
    bg: COLORS.navy,
    render: () => (
      <div className="h-full px-10 py-8">
        <p className="text-sm font-semibold tracking-widest uppercase mb-1" style={{ color: COLORS.accent }}>03 — Integrações</p>
        <h2 className="text-3xl font-bold mb-5" style={{ color: COLORS.white }}>Ecossistema de conexões</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { title: "Gateway de Pagamento", desc: "Recebe webhooks automaticamente quando um pagamento falha. Suporta validação de assinatura e normalização de payload.", status: "Funcional", icon: Zap },
            { title: "WhatsApp", desc: "Envia e recebe mensagens via Cloud API ou Web API. Suporte a QR code para Web API. Inbox com thread completa.", status: "Funcional (precisa de provider)", icon: MessageSquare },
            { title: "OpenAI", desc: "Motor de classificação, estratégia, geração de copy e análise de inbound. Configurável pela área de integrações.", status: "Funcional (precisa de API key)", icon: Brain },
            { title: "Supabase", desc: "Banco de dados principal. Customers, payments, leads, conversations, messages, queue, notas e controles admin.", status: "Funcional", icon: Database },
          ].map((item, i) => (
            <div key={i} className="p-4 rounded-lg" style={{ background: COLORS.card, border: `1px solid ${COLORS.accent}15` }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${COLORS.accent}15` }}>
                  <item.icon size={16} color={COLORS.accent} />
                </div>
                <h3 className="font-bold text-sm" style={{ color: COLORS.white }}>{item.title}</h3>
                <span className="ml-auto px-2 py-0.5 rounded text-xs" style={{ background: `${COLORS.success}20`, color: COLORS.success }}>{item.status}</span>
              </div>
              <p className="text-xs" style={{ color: COLORS.midGray }}>{item.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 p-4 rounded-lg" style={{ background: COLORS.darkBlue }}>
          <p className="text-xs font-semibold mb-1" style={{ color: COLORS.accent }}>Argumento de venda:</p>
          <p className="text-xs" style={{ color: COLORS.midGray }}>
            "Tudo configurável pelo painel, sem precisar de desenvolvedor. O admin configura uma vez, e a operação roda.
            O cliente pode trocar de gateway ou provider de WhatsApp sem reescrever nada."
          </p>
        </div>
      </div>
    ),
  },

  // SLIDE 10 - DIFERENCIAIS
  {
    bg: COLORS.offWhite,
    render: () => (
      <div className="h-full px-10 py-8">
        <p className="text-sm font-semibold tracking-widest uppercase mb-1" style={{ color: COLORS.accent }}>07 — Diferenciais</p>
        <h2 className="text-3xl font-bold mb-5" style={{ color: COLORS.navy }}>Por que o Shield Recovery?</h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          {[
            { icon: Brain, title: "IA que decide, não só escreve", desc: "Classificação, estratégia, timing e escalação. Não é um gerador de texto — é um motor de decisão." },
            { icon: Users, title: "Multi-seller nativo", desc: "Cada operador com carteira, webhook, limites e autonomia próprios. Governança real do admin." },
            { icon: Shield, title: "Governança completa", desc: "O admin controla tudo: meta, limite, acesso, autonomia, taxa real. Nenhum seller opera fora do controle." },
            { icon: MessageSquare, title: "Inbox com contexto", desc: "Não é um chat genérico. Cada conversa está ligada ao caso, ao lead, ao payment e à estratégia da IA." },
            { icon: Workflow, title: "Worker autônomo", desc: "Follow-ups rodam em background via cron. O sistema não depende de alguém clicar para a operação continuar." },
            { icon: Settings, title: "Setup pelo painel", desc: "Gateway, WhatsApp, OpenAI, Supabase — tudo configurável pelo front, sem código, sem deploy." },
          ].map((item, i) => (
            <div key={i} className="p-4 rounded-xl" style={{ background: COLORS.white, boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: `${COLORS.accent}12` }}>
                <item.icon size={18} color={COLORS.accentDark} />
              </div>
              <h3 className="font-bold text-sm mb-1" style={{ color: COLORS.navy }}>{item.title}</h3>
              <p className="text-xs" style={{ color: COLORS.darkGray }}>{item.desc}</p>
            </div>
          ))}
        </div>
        <div className="p-4 rounded-lg" style={{ background: COLORS.navy }}>
          <p className="text-sm text-center" style={{ color: COLORS.accent }}>
            "Não é um CRM genérico. É uma operação de recovery com IA, construída do zero para recuperar dinheiro."
          </p>
        </div>
      </div>
    ),
  },

  // SLIDE 11 - WHITELABEL E ESCALA
  {
    bg: COLORS.navy,
    render: () => (
      <div className="h-full px-10 py-8">
        <p className="text-sm font-semibold tracking-widest uppercase mb-1" style={{ color: COLORS.accent }}>08 — Escala & Whitelabel</p>
        <h2 className="text-3xl font-bold mb-5" style={{ color: COLORS.white }}>Modelo de crescimento</h2>
        <div className="grid grid-cols-2 gap-5">
          <div>
            <h3 className="font-bold text-lg mb-4" style={{ color: COLORS.white }}>Escala operacional</h3>
            <div className="flex flex-col gap-3">
              {[
                { title: "Multi-seller real", desc: "Cada seller opera sua carteira com webhook e regras próprias. O admin escala adicionando operadores sem limite técnico." },
                { title: "Worker com cron", desc: "A automação roda sozinha a cada 5 min. Mais volume = mais jobs, sem necessidade de ação humana adicional." },
                { title: "Subagentes de IA", desc: "Arquitetura preparada para 10 subagentes especializados: estratégia, conversa, governança, fila, pagamento, qualidade, onboarding e mais." },
                { title: "Supabase como backbone", desc: "Banco escalável, com realtime e storage opcionais. Pronto para produção de alto volume." },
              ].map((item, i) => (
                <div key={i} className="p-3 rounded-lg" style={{ background: COLORS.card }}>
                  <p className="font-semibold text-sm mb-1" style={{ color: COLORS.accent }}>{item.title}</p>
                  <p className="text-xs" style={{ color: COLORS.midGray }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-4" style={{ color: COLORS.white }}>Whitelabel</h3>
            <div className="p-5 rounded-xl mb-4" style={{ background: `${COLORS.accent}08`, border: `1px solid ${COLORS.accent}25` }}>
              <div className="flex flex-col gap-3">
                {[
                  { icon: Globe, t: "Marca do cliente", d: "Domínio, logo, cores e identidade visual personalizáveis" },
                  { icon: Users, t: "Sellers independentes", d: "Cada seller com seu webhook, lane e operação isolada" },
                  { icon: Lock, t: "Admin como operador central", d: "Agência ou parceiro gerencia tudo via painel admin" },
                  { icon: TrendingUp, t: "Revenue share ou SaaS", d: "Modelo comercial flexível: assinatura, % sobre recuperação ou fee fixo" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0" style={{ background: `${COLORS.accent}20` }}>
                      <item.icon size={14} color={COLORS.accent} />
                    </div>
                    <div>
                      <p className="font-semibold text-xs" style={{ color: COLORS.white }}>{item.t}</p>
                      <p className="text-xs" style={{ color: COLORS.midGray }}>{item.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-3 rounded-lg" style={{ background: COLORS.darkBlue }}>
              <p className="text-xs" style={{ color: COLORS.warning }}>
                <span className="font-bold">Pitch:</span> "O cliente pode ter sua própria plataforma de recovery, com a marca dele, operando sellers dele, sem construir nada do zero."
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },

  // SLIDE 12 - ROADMAP DE SUBAGENTES
  {
    bg: COLORS.offWhite,
    render: () => (
      <div className="h-full px-10 py-8">
        <p className="text-sm font-semibold tracking-widest uppercase mb-1" style={{ color: COLORS.accent }}>Roadmap</p>
        <h2 className="text-3xl font-bold mb-5" style={{ color: COLORS.navy }}>Evolução planejada do produto</h2>
        <div className="flex flex-col gap-3">
          {[
            { phase: "Fase 1", title: "Estratégia e Follow-up", desc: "IA decide a melhor ação, padroniza mensagem inicial e follow-ups, classifica inbound", status: "Em execução", color: COLORS.success },
            { phase: "Fase 2", title: "Governança de Seller", desc: "Onboarding, políticas por seller, webhook próprio, controle de prontidão", status: "Próxima", color: COLORS.info },
            { phase: "Fase 3", title: "Fila e Qualidade", desc: "Priorização por criticidade, guardrails contra envio errado, métricas de lag", status: "Planejada", color: COLORS.warning },
            { phase: "Fase 4", title: "Link de Pagamento", desc: "Gestão ativa de Pix/boleto/link, renovação automática, expiração inteligente", status: "Planejada", color: COLORS.warning },
            { phase: "Fase 5", title: "Inteligência Operacional", desc: "Detecção de gargalos, redistribuição, casos sensíveis e revisão humana", status: "Planejada", color: COLORS.midGray },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-lg" style={{ background: COLORS.white, boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
              <div className="w-16 text-center flex-shrink-0">
                <span className="text-xs font-bold px-2 py-1 rounded" style={{ background: `${item.color}15`, color: item.color }}>{item.phase}</span>
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm" style={{ color: COLORS.navy }}>{item.title}</p>
                <p className="text-xs mt-0.5" style={{ color: COLORS.darkGray }}>{item.desc}</p>
              </div>
              <span className="text-xs px-2 py-1 rounded flex-shrink-0" style={{ background: `${item.color}10`, color: item.color }}>{item.status}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 rounded-lg" style={{ background: `${COLORS.accent}08`, border: `1px solid ${COLORS.accent}20` }}>
          <p className="text-xs text-center" style={{ color: COLORS.navy }}>
            <span className="font-bold">Para o cliente:</span> "A plataforma já é forte hoje, e a cada sprint fica mais inteligente, mais escalável e mais autônoma."
          </p>
        </div>
      </div>
    ),
  },

  // SLIDE 13 - COMO DEMONSTRAR
  {
    bg: COLORS.navy,
    render: () => (
      <div className="h-full px-10 py-8">
        <p className="text-sm font-semibold tracking-widest uppercase mb-1" style={{ color: COLORS.accent }}>Playbook</p>
        <h2 className="text-3xl font-bold mb-5" style={{ color: COLORS.white }}>Como demonstrar na prática</h2>
        <div className="grid grid-cols-2 gap-5">
          <div>
            <h3 className="font-bold text-base mb-3" style={{ color: COLORS.accent }}>Roteiro da demo</h3>
            <div className="flex flex-col gap-2">
              {[
                { n: "1", t: "Home", d: "Mostre o posicionamento do produto" },
                { n: "2", t: "Connect", d: "Mostre que tudo é configurável pelo painel" },
                { n: "3", t: "Simule webhook", d: "Use /test para simular entrada de evento" },
                { n: "4", t: "CRM", d: "Mostre o lead nascendo automaticamente" },
                { n: "5", t: "Inbox", d: "Mostre a conversa com contexto do caso" },
                { n: "6", t: "IA", d: "Mostre classificação e estratégia automáticas" },
                { n: "7", t: "Admin", d: "Mostre governança e controle de sellers" },
                { n: "8", t: "Dashboard", d: "Feche com a visão executiva" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: COLORS.card }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ background: COLORS.accent, color: COLORS.navy }}>
                    {item.n}
                  </div>
                  <div>
                    <p className="font-semibold text-xs" style={{ color: COLORS.white }}>{item.t}</p>
                    <p className="text-xs" style={{ color: COLORS.midGray }}>{item.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-bold text-base mb-3" style={{ color: COLORS.accent }}>Objeções comuns</h3>
            <div className="flex flex-col gap-3">
              {[
                { q: "\"Já uso CRM pra isso\"", a: "CRM genérico não tem IA de recovery, worker automático, inbox com contexto de cobrança nem governança de sellers." },
                { q: "\"E se a IA mandar mensagem errada?\"", a: "O admin controla autonomia por seller, pode desligar automação e a IA sempre registra motivo da decisão." },
                { q: "\"Preciso de integração com meu gateway\"", a: "O sistema recebe webhook padrão e normaliza. Na maioria dos casos, é questão de configurar a URL." },
                { q: "\"É caro?\"", a: "Compare com a receita que fica na mesa. Um recovery bem feito paga a plataforma várias vezes." },
                { q: "\"Quero com minha marca\"", a: "O modelo whitelabel permite isso. Domínio, logo, sellers e operação completa na marca do parceiro." },
              ].map((item, i) => (
                <div key={i} className="p-3 rounded-lg" style={{ background: COLORS.darkBlue }}>
                  <p className="text-xs font-bold mb-1" style={{ color: COLORS.warning }}>{item.q}</p>
                  <p className="text-xs" style={{ color: COLORS.midGray }}>{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
  },

  // SLIDE 14 - PONTOS DE ATENÇÃO HONESTOS
  {
    bg: COLORS.offWhite,
    render: () => (
      <div className="h-full px-10 py-8">
        <p className="text-sm font-semibold tracking-widest uppercase mb-1" style={{ color: COLORS.warning }}>Transparência</p>
        <h2 className="text-3xl font-bold mb-5" style={{ color: COLORS.navy }}>O que você precisa saber (uso interno)</h2>
        <div className="grid grid-cols-2 gap-5">
          <div>
            <h3 className="font-bold text-base mb-3" style={{ color: COLORS.success }}>O que já pode prometer</h3>
            <div className="flex flex-col gap-2">
              {[
                "CRM operacional funcionando",
                "Inbox de conversas com thread completa",
                "IA que classifica, decide e gera copy",
                "Dashboard de acompanhamento",
                "Multi-seller com governança real",
                "Integrações configuráveis pelo painel",
                "Worker automático com cron",
                "Supabase como banco de produção",
                "Setup completo sem código",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded" style={{ background: `${COLORS.success}08` }}>
                  <CheckCircle size={14} color={COLORS.success} />
                  <p className="text-xs" style={{ color: COLORS.darkGray }}>{item}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-bold text-base mb-3" style={{ color: COLORS.warning }}>O que ainda NÃO prometer</h3>
            <div className="flex flex-col gap-2 mb-4">
              {[
                "Operação 100% autônoma sem supervisão",
                "Multi-login seller independente (auth simples ainda)",
                "Plug-and-play universal com qualquer gateway",
                "Autonomia total da IA sem humano no loop",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded" style={{ background: `${COLORS.warning}08` }}>
                  <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${COLORS.warning}20` }}>
                    <span className="text-xs" style={{ color: COLORS.warning }}>!</span>
                  </div>
                  <p className="text-xs" style={{ color: COLORS.darkGray }}>{item}</p>
                </div>
              ))}
            </div>
            <div className="p-4 rounded-lg" style={{ background: COLORS.navy }}>
              <h4 className="font-bold text-sm mb-2" style={{ color: COLORS.accent }}>Narrativa correta:</h4>
              <p className="text-xs italic" style={{ color: COLORS.lightGray }}>
                "Plataforma de recovery com IA assistida, CRM próprio, inbox operacional e integrações configuráveis."
              </p>
              <h4 className="font-bold text-sm mt-3 mb-2" style={{ color: "#EF4444" }}>Narrativa a evitar:</h4>
              <p className="text-xs italic" style={{ color: COLORS.midGray }}>
                "Plataforma totalmente autônoma que faz tudo sozinha."
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },

  // SLIDE 15 - FECHAMENTO
  {
    bg: COLORS.navy,
    render: () => (
      <div className="flex flex-col items-center justify-center h-full text-center px-12">
        <div className="w-16 h-16 rounded-xl flex items-center justify-center mb-6" style={{ background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})` }}>
          <Rocket size={32} color={COLORS.navy} />
        </div>
        <h2 className="text-4xl font-bold mb-4" style={{ color: COLORS.white }}>Agora você tem tudo</h2>
        <p className="text-base mb-8 max-w-xl" style={{ color: COLORS.midGray }}>
          Conhece o produto, entende a arquitetura, sabe demonstrar, conhece os diferenciais e sabe exatamente onde estão os limites atuais.
        </p>
        <div className="grid grid-cols-3 gap-4 mb-8 max-w-2xl w-full">
          {[
            { icon: Award, n: "7", l: "módulos operacionais" },
            { icon: Brain, n: "10", l: "subagentes planejados" },
            { icon: TrendingUp, n: "∞", l: "sellers escaláveis" },
          ].map((item, i) => (
            <div key={i} className="p-4 rounded-lg text-center" style={{ background: COLORS.card }}>
              <item.icon size={20} color={COLORS.accent} className="mx-auto mb-2" />
              <p className="text-2xl font-bold" style={{ color: COLORS.accent }}>{item.n}</p>
              <p className="text-xs" style={{ color: COLORS.midGray }}>{item.l}</p>
            </div>
          ))}
        </div>
        <div className="px-6 py-3 rounded-lg" style={{ background: `${COLORS.accent}10`, border: `1px solid ${COLORS.accent}30` }}>
          <p className="text-sm font-semibold" style={{ color: COLORS.accent }}>
            "Recupere receita. Escale operação. Governe com inteligência."
          </p>
        </div>
        <p className="mt-6 text-xs" style={{ color: COLORS.midGray }}>Shield Recovery — Recovery com IA, CRM e governança</p>
      </div>
    ),
  },
];

export default function ShieldRecoveryTraining() {
  const [current, setCurrent] = useState(0);
  const total = slides.length;

  const prev = () => setCurrent((c) => (c > 0 ? c - 1 : c));
  const next = () => setCurrent((c) => (c < total - 1 ? c + 1 : c));

  return (
    <div className="flex flex-col items-center justify-center min-h-screen" style={{ background: "#0A0F1A" }}>
      <div
        className="relative overflow-hidden"
        style={{
          width: "960px",
          height: "540px",
          background: slides[current].bg,
          borderRadius: "12px",
          boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
        }}
      >
        {slides[current].render()}
      </div>

      <div className="flex items-center gap-6 mt-6">
        <button
          onClick={prev}
          disabled={current === 0}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity"
          style={{
            background: current === 0 ? "#1E293B" : COLORS.accent,
            color: current === 0 ? COLORS.midGray : COLORS.navy,
            opacity: current === 0 ? 0.4 : 1,
            cursor: current === 0 ? "default" : "pointer",
          }}
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flex items-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className="transition-all"
              style={{
                width: i === current ? "24px" : "8px",
                height: "8px",
                borderRadius: "4px",
                background: i === current ? COLORS.accent : "#334155",
                cursor: "pointer",
              }}
            />
          ))}
        </div>

        <button
          onClick={next}
          disabled={current === total - 1}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity"
          style={{
            background: current === total - 1 ? "#1E293B" : COLORS.accent,
            color: current === total - 1 ? COLORS.midGray : COLORS.navy,
            opacity: current === total - 1 ? 0.4 : 1,
            cursor: current === total - 1 ? "default" : "pointer",
          }}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <p className="mt-3 text-xs" style={{ color: COLORS.midGray }}>
        Slide {current + 1} de {total} — Use as setas ou clique nos indicadores
      </p>
    </div>
  );
}
