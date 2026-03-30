import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  Clock,
  CreditCard,
  Database,
  DollarSign,
  Eye,
  FileCheck,
  Globe,
  Headphones,
  Layers,
  LineChart,
  Lock,
  MessageSquare,
  Phone,
  QrCode,
  Server,
  Shield,
  ShieldCheck,
  Smartphone,
  Gem,
  TrendingUp,
  Users,
  XCircle,
  Zap,
} from "lucide-react";

import { AdminAccessButton } from "@/components/landing/admin-access";
import { CountUp } from "@/components/landing/count-up";
import { HeroHeading } from "@/components/landing/hero-heading";
import { HeroParticles } from "@/components/landing/hero-particles";
import { MagneticButton } from "@/components/landing/magnetic-button";
import { Marquee } from "@/components/landing/marquee";
import { Reveal } from "@/components/landing/scroll-reveal";
import { ScrollProgress } from "@/components/landing/scroll-progress";
import { TiltCard } from "@/components/landing/tilt-card";
import { PlatformLogo } from "@/components/platform/platform-logo";
import { platformBrand } from "@/lib/platform";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";

// Heavy below-fold components — lazy loaded
const LiveDemo = dynamic(() => import("@/components/landing/live-demo").then(m => ({ default: m.LiveDemo })));
const RecoveryCalculator = dynamic(() => import("@/components/landing/recovery-calculator").then(m => ({ default: m.RecoveryCalculator })));
const FaqSection = dynamic(() => import("@/components/landing/faq-section").then(m => ({ default: m.FaqSection })));
const TestimonialsColumn = dynamic(() => import("@/components/ui/testimonials-columns").then(m => ({ default: m.TestimonialsColumn })));
const DemoCallForm = dynamic(() => import("@/components/landing/demo-call-form").then(m => ({ default: m.DemoCallForm })));

export const revalidate = 60;

// ── Brand-derived tokens ──
const b = platformBrand;
const rgb = b.accentRgb;
const cardBg = `rgba(${b.slug === "pagrecovery" ? "6,20,15" : "13,13,13"}`;

// ── Testimonials ──
const testimonials = [
  {
    text: "Em 48h recuperamos R$ 12 mil que estavam parados. A IA identificou o melhor canal e horário pra cada cliente automaticamente.",
    name: "Ricardo Mendes",
    role: "CEO",
    company: "DigitalPay",
  },
  {
    text: "O call center de agentes IA é surreal. Ligam com voz humanizada, negociam e enviam o link de pagamento na hora. Nosso time nem precisa intervir.",
    name: "Camila Rocha",
    role: "Head de Operações",
    company: "ShopFlex",
  },
  {
    text: "Integramos em menos de 5 minutos. Conectamos o webhook e já começamos a recuperar no mesmo dia.",
    name: "Fernando Lima",
    role: "CTO",
    company: "TechPay",
  },
  {
    text: "A taxa de recuperação subiu de 4% para 32% em duas semanas. O ROI se pagou no primeiro dia.",
    name: "Juliana Alves",
    role: "Diretora Financeira",
    company: "VendasOnline",
  },
  {
    text: "O dashboard é muito claro. Vejo em tempo real cada tentativa, cada contato, cada pagamento recuperado. Controle total.",
    name: "Bruno Nascimento",
    role: "Gerente de Produto",
    company: "PayHub",
  },
  {
    text: "Antes eu perdia 40% dos pagamentos com falha. Hoje perco menos de 15%. A plataforma faz tudo sozinha.",
    name: "Patricia Duarte",
    role: "Proprietária",
    company: "EssencialStore",
  },
  {
    text: "O suporte é incrível. Nos ajudaram a configurar os funis, personalizar as mensagens e otimizar o timing de cada contato.",
    name: "Marcos Costa",
    role: "Analista de Dados",
    company: "DataDriven",
  },
  {
    text: "Usamos com 3 sellers diferentes. Cada um tem seu próprio painel, seus próprios leads. Perfeito pra nossa operação white-label.",
    name: "Ana Beatriz",
    role: "COO",
    company: "MultiGateway",
  },
  {
    text: "A IA conversa pelo WhatsApp de forma tão natural que os clientes pensam que é um humano. A taxa de resposta triplicou.",
    name: "Diego Oliveira",
    role: "Head de Growth",
    company: "RapidCommerce",
  },
];

const testimonialsCol1 = testimonials.slice(0, 3);
const testimonialsCol2 = testimonials.slice(3, 6);
const testimonialsCol3 = testimonials.slice(6, 9);

export default async function Home() {
  const service = getPaymentRecoveryService();
  const [analytics, contacts] = await Promise.all([
    service.getRecoveryAnalytics(),
    service.getFollowUpContacts(),
  ]);

  const activeContacts = contacts.filter(
    (c) => c.lead_status !== "RECOVERED" && c.lead_status !== "LOST",
  );
  const portfolioValue = activeContacts.reduce(
    (sum, c) => sum + c.payment_value,
    0,
  );
  const recoveryRate = analytics.recovery_rate.toFixed(1);

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ background: b.bgDark }}
    >
      {/* ═══ Scroll progress ═══ */}
      <ScrollProgress />

      {/* ═══ Background — 2 layers instead of 4 ═══ */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -10%, rgba(${rgb},0.12), transparent 60%),
            radial-gradient(circle 600px at -10% -8%, rgba(${rgb},0.07), transparent 60%),
            radial-gradient(circle 500px at 108% 30%, rgba(${rgb},0.05), transparent 60%),
            linear-gradient(180deg, ${b.bgDark} 0%, ${b.bgDarkSecondary} 40%, ${b.bgDark} 100%)
          `,
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(rgba(${rgb},0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(${rgb},0.3) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 30%, black, transparent 80%)",
        }}
      />

      {/* ═══ Navigation ═══ */}
      <nav className="relative z-30 mx-auto flex max-w-[82rem] items-center justify-between px-4 py-3 sm:px-8 sm:py-5 lg:px-10">
        <Image
          src={b.logo}
          alt={b.name}
          width={176}
          height={176}
          sizes="(min-width: 640px) 176px, 96px"
          quality={80}
          className="h-[5rem] w-auto object-contain sm:h-[8rem] lg:h-[11rem]"
          style={{ filter: `drop-shadow(0 8px 24px rgba(${rgb},0.12))` }}
          priority
        />
        <div className="flex items-center gap-2 sm:gap-3">
          <AdminAccessButton />
          <MagneticButton>
            <Link
              href="/quiz"
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white transition-all sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm"
              style={{
                background: b.accent,
                boxShadow: `0 12px 32px ${b.accentGlow}`,
              }}
            >
              <span className="hidden sm:inline">Abrir plataforma</span>
              <span className="sm:hidden">Acessar</span>
              <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Link>
          </MagneticButton>
        </div>
      </nav>

      <main className="relative z-10">
        {/* ═══════════════════════ HERO ═══════════════════════ */}
        <section className="relative mx-auto max-w-[82rem] px-4 pb-14 pt-2 sm:px-8 sm:pb-20 sm:pt-12 lg:px-10 lg:pt-16">
          {/* Particle canvas */}
          <div className="pointer-events-none absolute inset-0 z-0">
            <HeroParticles />
          </div>

          <div className="pointer-events-none absolute right-[-2rem] top-[-4rem] z-0 hidden opacity-[0.018] lg:block">
            <Image
              src={b.mark}
              alt=""
              width={672}
              height={672}
              sizes="672px"
              quality={60}
              className="h-[42rem] w-[42rem] object-contain"
              aria-hidden="true"
              loading="lazy"
            />
          </div>

          <div className="relative z-10 grid items-center gap-12 lg:grid-cols-[1fr_auto] lg:gap-16">
            {/* Hero text */}
            <div className="mx-auto max-w-[48rem] text-center lg:mx-0 lg:text-left">
              <HeroHeading />

              <Reveal direction="up" delay={400}>
                <p className="mt-5 max-w-[36rem] text-[0.92rem] leading-[1.7] text-gray-400 sm:mt-7 sm:text-[1.05rem] sm:leading-[1.8] lg:mx-0">
                  Pagamento falhou? Em 2 minutos, nossa IA contata o cliente
                  via WhatsApp com link de pagamento. Se não responder, o Call Center
                  de agentes IA liga com voz natural e negocia. Tudo 100% autônomo
                  — você só acompanha os resultados.
                </p>
              </Reveal>

              <Reveal direction="up" delay={500}>
                <div className="mt-7 flex flex-col items-center gap-3 sm:mt-10 sm:flex-row sm:gap-4 lg:justify-start">
                  <MagneticButton>
                    <Link
                      href="/quiz"
                      className="group inline-flex items-center gap-2 rounded-xl px-6 py-3 text-[0.85rem] font-semibold text-white transition-all hover:brightness-110 sm:gap-2.5 sm:px-8 sm:py-3.5 sm:text-[0.92rem]"
                      style={{
                        background: b.accent,
                        boxShadow: `0 12px 32px ${b.accentGlow}`,
                      }}
                    >
                      Acessar plataforma
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </MagneticButton>
                  <a
                    href="#como-funciona"
                    className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-6 py-3 text-[0.85rem] font-medium text-gray-400 backdrop-blur-sm transition-all hover:border-white/[0.14] hover:text-gray-200 sm:px-8 sm:py-3.5 sm:text-[0.92rem]"
                  >
                    Como funciona
                    <ArrowDown className="h-4 w-4" />
                  </a>
                </div>
              </Reveal>
            </div>

          </div>

        </section>

        {/* ═══════════════════════ MARQUEE TRUST BAR ═══════════════════════ */}
        <section className="relative mx-auto max-w-[82rem] px-0 pb-12 sm:pb-20">
          <Reveal direction="up">
            <Marquee speed={40} className="py-6" >
              <MarqueeItem icon={ShieldCheck} text="LGPD Compliant" />
              <MarqueeDot />
              <MarqueeItem icon={Lock} text="PCI-DSS" />
              <MarqueeDot />
              <MarqueeItem icon={Shield} text="HMAC-SHA256" />
              <MarqueeDot />
              <MarqueeItem icon={QrCode} text="PIX" />
              <MarqueeDot />
              <MarqueeItem icon={CreditCard} text="Cartão de Crédito" />
              <MarqueeDot />
              <MarqueeItem icon={Bot} text="IA Avançada" />
              <MarqueeDot />
              <MarqueeItem icon={Smartphone} text="WhatsApp Business" />
              <MarqueeDot />
              <MarqueeItem icon={Layers} text="Multi-tenant" />
              <MarqueeDot />
              <MarqueeItem icon={Zap} text="Webhooks" />
              <MarqueeDot />
              <MarqueeItem icon={BarChart3} text="Real-time Analytics" />
              <MarqueeDot />
              <MarqueeItem icon={Globe} text="API Universal" />
              <MarqueeDot />
            </Marquee>
          </Reveal>
        </section>

        <GlowDivider />

        {/* ═══════════════════════ IMPACT NUMBERS ═══════════════════════ */}
        <section className="relative mx-auto max-w-[82rem] px-4 py-16 sm:px-8 sm:py-24 lg:px-10">
          <Reveal direction="up">
            <div className="text-center">
              <SectionEyebrow>Impacto real</SectionEyebrow>
              <h2 className="mt-4 text-balance text-[1.5rem] font-bold tracking-[-0.03em] text-white sm:text-[1.75rem] lg:text-[2.2rem]">
                Resultados reais, em produção
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-[0.88rem] leading-6 text-gray-400 sm:mt-4 sm:text-[0.95rem] sm:leading-7">
                Dados da operação ativa. Sem simulações, sem projeções.
              </p>
            </div>
          </Reveal>

          <div className="mx-auto mt-10 grid max-w-[56rem] gap-3 sm:mt-14 sm:gap-4 sm:grid-cols-3">
            <Reveal direction="up" delay={0}>
              <TiltCard>
                <ImpactCard
                  value={<><CountUp end={19} duration={1500} />–<CountUp end={40} suffix="%" duration={2200} /></>}
                  label="Taxa de recuperação"
                  sublabel="dependendo do funil e nicho"
                />
              </TiltCard>
            </Reveal>
            <Reveal direction="up" delay={150}>
              <TiltCard>
                <ImpactCard
                  value={<><CountUp end={2} duration={1500} />min</>}
                  label="Tempo de resposta"
                  sublabel="da falha ao primeiro contato"
                />
              </TiltCard>
            </Reveal>
            <Reveal direction="up" delay={300}>
              <TiltCard>
                <ImpactCard
                  value={<CountUp end={24} suffix="/7" duration={1800} />}
                  label="Operação contínua"
                  sublabel="sem pausas, sem folgas, sem custo fixo"
                />
              </TiltCard>
            </Reveal>
          </div>
        </section>

        <GlowDivider />

        {/* ═══════════════════════ A DOR INVISÍVEL ═══════════════════════ */}
        <section className="relative mx-auto max-w-[82rem] px-4 py-16 sm:px-8 sm:py-24 lg:px-10">
          <Reveal direction="up">
            <div className="mx-auto max-w-[48rem] text-center">
              <SectionEyebrow>A dor que ninguém vê</SectionEyebrow>
              <h2 className="mt-4 text-balance text-[1.5rem] font-bold tracking-[-0.03em] text-white sm:text-[1.75rem] lg:text-[2.2rem]">
                Cada pagamento falhado é um cliente que já disse sim
              </h2>
              <p className="mx-auto mt-6 max-w-[38rem] text-[0.95rem] leading-[1.8] text-gray-400">
                Ele escolheu o produto. Colocou os dados. Clicou em pagar.
                Mas algo deu errado — e ninguém fez nada. O cliente sai.
                A receita vai embora. E você nem sabe que perdeu.
              </p>
            </div>
          </Reveal>

          <div className="mx-auto mt-12 grid max-w-[56rem] gap-6 sm:mt-16 lg:grid-cols-3">
            <Reveal direction="up" delay={0}>
              <div
                className="rounded-xl px-6 py-7 text-center"
                style={{
                  border: "1px solid rgba(239,68,68,0.10)",
                  background: "rgba(239,68,68,0.03)",
                }}
              >
                <p className="text-[2.4rem] font-bold leading-none text-red-400">
                  62%
                </p>
                <p className="mt-3 text-[0.82rem] font-medium text-gray-300">
                  dos pagamentos que falham nunca são recuperados
                </p>
                <p className="mt-2 text-[0.72rem] leading-[1.7] text-gray-500">
                  Sem sistema ativo, a maioria dos clientes simplesmente desiste. A janela de recuperação fecha em horas.
                </p>
              </div>
            </Reveal>
            <Reveal direction="up" delay={150}>
              <div
                className="rounded-xl px-6 py-7 text-center"
                style={{
                  border: "1px solid rgba(239,68,68,0.10)",
                  background: "rgba(239,68,68,0.03)",
                }}
              >
                <p className="text-[2.4rem] font-bold leading-none text-red-400">
                  4h
                </p>
                <p className="mt-3 text-[0.82rem] font-medium text-gray-300">
                  é o tempo médio que empresas levam para perceber a falha
                </p>
                <p className="mt-2 text-[0.72rem] leading-[1.7] text-gray-500">
                  A cada minuto sem contato, a chance de recuperação cai. Depois de 24h, o cliente já esqueceu.
                </p>
              </div>
            </Reveal>
            <Reveal direction="up" delay={300}>
              <div
                className="rounded-xl px-6 py-7 text-center"
                style={{
                  border: `1px solid rgba(${rgb},0.12)`,
                  background: `rgba(${rgb},0.03)`,
                }}
              >
                <p className="text-[2.4rem] font-bold leading-none" style={{ color: b.accent }}>
                  2min
                </p>
                <p className="mt-3 text-[0.82rem] font-medium text-gray-300">
                  é o tempo da {b.name} para fazer o primeiro contato
                </p>
                <p className="mt-2 text-[0.72rem] leading-[1.7] text-gray-500">
                  A falha acontece e em 120 segundos o cliente recebe o link de pagamento no WhatsApp. Sem intervenção humana.
                </p>
              </div>
            </Reveal>
          </div>

          <Reveal direction="up" delay={400}>
            <p className="mx-auto mt-10 max-w-[40rem] text-center text-[0.88rem] leading-[1.8] text-gray-400">
              A maior dor não é a falha no pagamento — é o silêncio depois dela. Enquanto você não
              sabe o que aconteceu, a {b.name} já resolveu, contactou e recuperou.
            </p>
          </Reveal>
        </section>

        <GlowDivider />

        {/* ═══════════════════════ TIMELINE — RECUPERAÇÃO PREVISÍVEL ═══════════════════════ */}
        <section className="relative mx-auto max-w-[82rem] px-4 py-16 sm:px-8 sm:py-24 lg:px-10">
          <Reveal direction="up">
            <div className="mx-auto max-w-[52rem] text-center">
              <SectionEyebrow>Da falha à escala previsível</SectionEyebrow>
              <h2 className="mt-4 text-balance text-[1.5rem] font-bold tracking-[-0.03em] text-white sm:text-[1.75rem] lg:text-[2.2rem]">
                Um funil que transforma caos em receita previsível
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-[0.95rem] leading-7 text-gray-400">
                A maioria das empresas não sabe quantos pagamentos falham por dia, nem quanto
                dinheiro deixa de entrar. Com a {b.name}, cada falha vira um dado,
                cada tentativa vira uma métrica, e cada recuperação vira previsibilidade.
              </p>
            </div>
          </Reveal>

          <div className="mx-auto mt-12 grid max-w-[64rem] gap-10 sm:mt-16 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
            {/* Timeline */}
            <div>
              {[
                { time: "0s", title: "Falha detectada", desc: "Webhook chega. A plataforma classifica: valor, método, histórico do cliente e motivo exato da falha.", accent: false },
                { time: "30s", title: "Estratégia definida pela IA", desc: "Algoritmo escolhe canal, tom, urgência e abordagem ideal com base no perfil do cliente.", accent: false },
                { time: "2min", title: "WhatsApp disparado", desc: "Mensagem personalizada com link de pagamento, PIX copia-e-cola ou cartão. O cliente paga em 1 toque.", accent: true },
                { time: "4h", title: "Follow-up adaptativo", desc: "Leu mas não respondeu? A IA ajusta a abordagem: muda o tom, oferece parcelamento, troca de método.", accent: false },
                { time: "12h", title: "Call Center IA liga", desc: "Para leads de alto valor, agente IA liga com voz natural, negocia condições e envia o link na hora.", accent: true },
                { time: "48h", title: "Escalonamento inteligente", desc: "Novas abordagens: urgência, oferta exclusiva, troca de canal. O sistema nunca repete a mesma tática.", accent: false },
                { time: "7d", title: "Soft close com porta aberta", desc: "Última mensagem respeitosa. Link ativo. Sem pressão. O cliente decide quando quer pagar.", accent: false },
              ].map((step, i) => (
                <Reveal key={step.time} direction="up" delay={i * 60}>
                  <div className="flex gap-5 sm:gap-7">
                    <div className="flex flex-col items-center">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[0.6rem] font-bold"
                        style={{
                          border: `1px solid rgba(${rgb},${step.accent ? "0.25" : "0.10"})`,
                          background: `rgba(${rgb},${step.accent ? "0.08" : "0.03"})`,
                          color: step.accent ? b.accent : "#9ca3af",
                          boxShadow: step.accent ? `0 0 16px rgba(${rgb},0.15)` : "none",
                        }}
                      >
                        {step.time}
                      </div>
                      {i < 6 && (
                        <div
                          className="w-px flex-1 min-h-[2rem]"
                          style={{ background: `rgba(${rgb},0.08)` }}
                        />
                      )}
                    </div>
                    <div className="pb-8">
                      <h3 className="text-[0.88rem] font-semibold text-gray-200">
                        {step.title}
                      </h3>
                      <p className="mt-1.5 text-[0.78rem] leading-[1.7] text-gray-500">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>

            {/* Right side — Why this matters */}
            <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
              <Reveal direction="right" delay={100}>
                <div
                  className="rounded-xl px-6 py-6"
                  style={{
                    border: `1px solid rgba(${rgb},0.10)`,
                    background: `rgba(${rgb},0.03)`,
                  }}
                >
                  <h3 className="text-[0.95rem] font-bold text-white">
                    Por que previsibilidade importa?
                  </h3>
                  <p className="mt-3 text-[0.82rem] leading-[1.7] text-gray-400">
                    Um negócio que não mede recuperação não tem controle sobre a própria receita.
                    Você sabe quantos pagamentos falharam essa semana? Quantos foram recuperados?
                    Qual o tempo médio entre falha e pagamento? Sem essas respostas, você opera no escuro.
                  </p>
                </div>
              </Reveal>

              <Reveal direction="right" delay={200}>
                <div
                  className="rounded-xl px-6 py-6"
                  style={{
                    border: "1px solid rgba(255,255,255,0.05)",
                    background: `${cardBg},0.4)`,
                  }}
                >
                  <h3 className="text-[0.95rem] font-bold text-white">
                    Dashboard com controle total
                  </h3>
                  <p className="mt-3 text-[0.82rem] leading-[1.7] text-gray-400">
                    Taxa de recuperação por canal, por método de pagamento, por faixa de valor.
                    Tempo médio de recuperação. Receita salva por dia, semana, mês. Performance de cada
                    seller. Tudo em tempo real, com histórico completo.
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <MiniStat label="Taxa média" value="19–40%" />
                    <MiniStat label="Tempo médio" value="14 min" />
                    <MiniStat label="Canais ativos" value="3" />
                    <MiniStat label="Uptime" value="24/7" />
                  </div>
                </div>
              </Reveal>

              <Reveal direction="right" delay={300}>
                <div
                  className="rounded-xl px-6 py-6 text-center"
                  style={{
                    border: `1px solid rgba(${rgb},0.15)`,
                    background: `rgba(${rgb},0.04)`,
                  }}
                >
                  <p className="text-[1rem] font-bold text-white">
                    Mesmo fluxo. Qualquer volume.
                  </p>
                  <p className="mt-2 text-[0.82rem] leading-[1.7] text-gray-400">
                    10 transações ou 10.000 — o sistema escala automaticamente.
                    Sem equipe, sem custo adicional, sem intervenção.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <GlowDivider />

        {/* ═══════════════════════ BEFORE / AFTER ═══════════════════════ */}
        <section className="relative mx-auto max-w-[82rem] px-4 py-16 sm:px-8 sm:py-24 lg:px-10">
          <Reveal direction="up">
            <div className="text-center">
              <SectionEyebrow>Antes vs depois</SectionEyebrow>
              <h2 className="mt-4 text-balance text-[1.5rem] font-bold tracking-[-0.03em] text-white sm:text-[1.75rem] lg:text-[2.2rem]">
                O que muda quando a IA assume
              </h2>
            </div>
          </Reveal>

          <div className="mx-auto mt-10 grid max-w-[60rem] gap-4 sm:mt-14 sm:gap-6 lg:grid-cols-2">
            <Reveal direction="left" delay={100}>
              <TiltCard>
                <div
                  className="rounded-2xl px-5 py-6 sm:px-7 sm:py-8"
                  style={{
                    border: "1px solid rgba(239,68,68,0.12)",
                    background: "rgba(239,68,68,0.03)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                      <XCircle className="h-5 w-5 text-red-400" />
                    </div>
                    <h3 className="text-[1rem] font-bold text-red-400">Sem recuperação</h3>
                  </div>
                  <ul className="mt-6 space-y-4">
                    <BeforeAfterItem negative text="Pagamento falha e o cliente desaparece" />
                    <BeforeAfterItem negative text="Sua equipe descobre tarde demais" />
                    <BeforeAfterItem negative text="Cobranças manuais que não escalam" />
                    <BeforeAfterItem negative text="Nenhuma visibilidade sobre o que falhou" />
                    <BeforeAfterItem negative text="Receita que não volta mais" />
                  </ul>
                </div>
              </TiltCard>
            </Reveal>

            <Reveal direction="right" delay={100}>
              <TiltCard>
                <div
                  className="rounded-2xl px-5 py-6 sm:px-7 sm:py-8"
                  style={{
                    border: `1px solid rgba(${rgb},0.12)`,
                    background: `rgba(${rgb},0.03)`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{ background: `rgba(${rgb},0.10)` }}
                    >
                      <Gem className="h-5 w-5" style={{ color: b.accent }} />
                    </div>
                    <h3 className="text-[1rem] font-bold" style={{ color: b.accent }}>
                      Com {b.name}
                    </h3>
                  </div>
                  <ul className="mt-6 space-y-4">
                    <BeforeAfterItem text="Falha detectada, contato em 2 minutos" />
                    <BeforeAfterItem text="IA escolhe o canal e o momento certo" />
                    <BeforeAfterItem text="WhatsApp com link de pagamento direto" />
                    <BeforeAfterItem text="Call Center IA liga se o cliente não responder" />
                    <BeforeAfterItem text="Analytics em tempo real no dashboard" />
                    <BeforeAfterItem text="19% a 40% da receita perdida volta pro seu caixa" />
                  </ul>
                </div>
              </TiltCard>
            </Reveal>
          </div>
        </section>

        <GlowDivider />

        {/* ═══════════════════════ HOW IT WORKS ═══════════════════════ */}
        <section id="como-funciona" className="relative mx-auto max-w-[82rem] scroll-mt-8 px-4 py-16 sm:px-8 sm:py-24 lg:px-10">
          <Reveal direction="up">
            <div className="text-center">
              <SectionEyebrow>Como funciona</SectionEyebrow>
              <h2 className="mt-4 text-balance text-[1.5rem] font-bold tracking-[-0.03em] text-white sm:text-[1.75rem] lg:text-[2.2rem]">
                Da falha à recuperação em minutos
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-[0.95rem] leading-7 text-gray-400">
                Cinco etapas. Zero intervenção humana. Você só acompanha.
              </p>
            </div>
          </Reveal>

          <div className="mx-auto mt-10 grid max-w-[64rem] gap-3 sm:mt-14 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { n: "01", icon: Zap, title: "Gateway notifica", desc: "Pagamento falha e o webhook notifica a plataforma instantaneamente." },
              { n: "02", icon: Bot, title: "IA analisa", desc: "Valor, histórico e método de pagamento definem a abordagem ideal." },
              { n: "03", icon: MessageSquare, title: "WhatsApp envia", desc: "Mensagem personalizada com link de pagamento direto pro cliente." },
              { n: "04", icon: Headphones, title: "Call Center IA", desc: "Se não houve resposta, agente IA liga com voz natural e negocia." },
              { n: "05", icon: TrendingUp, title: "Pagamento confirmado", desc: "Cliente paga, receita entra e o dashboard atualiza em tempo real." },
            ].map((s, i) => (
              <Reveal key={s.n} direction="up" delay={i * 100}>
                <TiltCard>
                  <StepCard number={s.n} icon={s.icon} title={s.title} description={s.desc} />
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ═══════════════════════ RESULTS ═══════════════════════ */}
        <section className="relative mx-auto max-w-[82rem] px-4 py-16 sm:px-8 sm:py-24 lg:px-10">
          <Reveal direction="up">
            <div className="text-center">
              <SectionEyebrow>Resultados</SectionEyebrow>
              <h2 className="mt-4 text-balance text-[1.5rem] font-bold tracking-[-0.03em] text-white sm:text-[1.75rem] lg:text-[2.2rem]">
                Casos reais de recuperação
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-[0.95rem] leading-7 text-gray-400">
                Resultados de operações ativas na plataforma.
              </p>
            </div>
          </Reveal>

          <div className="mx-auto mt-10 grid max-w-[60rem] gap-3 sm:mt-14 sm:gap-4 sm:grid-cols-3">
            <Reveal direction="up" delay={0}>
              <TiltCard>
                <ResultCard
                  category="E-commerce de moda"
                  value="R$23.400"
                  description="recuperados em 30 dias · 187 transações · tempo médio: 14 minutos"
                  icon={CreditCard}
                />
              </TiltCard>
            </Reveal>
            <Reveal direction="up" delay={150}>
              <TiltCard>
                <ResultCard
                  category="SaaS B2B — Recorrência"
                  value="3.2x ROI"
                  description="no primeiro mês · churn involuntário caiu de 8.4% para 2.1%"
                  icon={TrendingUp}
                />
              </TiltCard>
            </Reveal>
            <Reveal direction="up" delay={300}>
              <TiltCard>
                <ResultCard
                  category="Infoproduto digital"
                  value="41%"
                  description="de recuperação · 68% via Pix, 32% cartão · ticket médio de R$890"
                  icon={BarChart3}
                />
              </TiltCard>
            </Reveal>
          </div>
        </section>

        <GlowDivider />

        {/* ═══════════════════════ AI CALL CENTER DEMO ═══════════════════════ */}
        <section id="demo-call" className="relative mx-auto max-w-[82rem] scroll-mt-8 px-4 py-16 sm:px-8 sm:py-24 lg:px-10">
          <Reveal direction="up">
            <div
              className="relative overflow-hidden rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl"
              style={{
                border: `1px solid rgba(${rgb},0.12)`,
                background: `${cardBg},0.5)`,
              }}
            >
              <div
                className="absolute inset-0"
                style={{ background: `radial-gradient(ellipse at top right, rgba(${rgb},0.06), transparent 50%)` }}
              />
              <div
                className="absolute inset-0"
                style={{ background: `radial-gradient(ellipse at bottom left, rgba(${rgb},0.04), transparent 50%)` }}
              />

              <div className="relative grid gap-10 px-5 py-10 sm:px-12 sm:py-16 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:px-14">
                {/* Left — explanation */}
                <div>
                  <SectionEyebrow>Call Center de IA — ao vivo</SectionEyebrow>
                  <h2 className="mt-4 max-w-[18ch] text-[1.5rem] font-bold tracking-[-0.03em] text-white sm:text-[1.75rem] lg:text-[2.2rem] sm:leading-[1.15]">
                    Receba uma ligação da nossa IA agora
                  </h2>
                  <p className="mt-5 max-w-md text-[0.95rem] leading-7 text-gray-400">
                    Essa é a mesma tecnologia que liga para clientes com pagamento pendente.
                    A IA se apresenta, explica como a plataforma funciona, responde suas
                    dúvidas e tenta te convencer — tudo com voz natural, em tempo real.
                  </p>

                  <div className="mt-8 space-y-4">
                    {[
                      { icon: Phone, title: "Chamada real em segundos", desc: "Ao preencher, uma IA consultora liga para seu número instantaneamente." },
                      { icon: Bot, title: "Voz natural + IA conversacional", desc: "A IA conversa, negocia e responde dúvidas como uma vendedora real — aumentando consideravelmente a conversão." },
                      { icon: MessageSquare, title: "Mesmo fluxo dos seus clientes", desc: "É exatamente assim que a plataforma contacta clientes com pagamento falhado." },
                    ].map((item) => (
                      <div key={item.title} className="flex gap-4">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                          style={{
                            border: `1px solid rgba(${rgb},0.12)`,
                            background: `rgba(${rgb},0.06)`,
                          }}
                        >
                          <item.icon className="h-4 w-4" style={{ color: b.accent }} />
                        </div>
                        <div>
                          <p className="text-[0.82rem] font-semibold text-gray-200">{item.title}</p>
                          <p className="mt-1 text-[0.72rem] leading-[1.7] text-gray-500">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right — form */}
                <div className="flex flex-col justify-center">
                  <div
                    className="rounded-xl px-6 py-8 sm:px-8 sm:py-10"
                    style={{
                      border: `1px solid rgba(${rgb},0.10)`,
                      background: `rgba(${rgb},0.03)`,
                    }}
                  >
                    <div className="mb-6 flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl"
                        style={{
                          border: `1px solid rgba(${rgb},0.14)`,
                          background: `rgba(${rgb},0.06)`,
                        }}
                      >
                        <Headphones className="h-5 w-5" style={{ color: b.accent }} />
                      </div>
                      <div>
                        <p className="text-[0.88rem] font-bold text-white">Teste o Call Center IA</p>
                        <p className="text-[0.72rem] text-gray-500">Receba uma chamada de demonstração gratuita</p>
                      </div>
                    </div>

                    <DemoCallForm />
                  </div>

                  <p className="mt-4 text-center text-[0.68rem] leading-5 text-gray-600">
                    Ao solicitar, você concorda em receber uma chamada de demonstração.
                    Seus dados ficam seguros e protegidos conforme LGPD.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        <GlowDivider />

        {/* ═══════════════════════ LIVE DEMO ═══════════════════════ */}
        <div className="content-auto">
          <LiveDemo />
        </div>

        {/* ═══════════════════════ CALCULATOR ═══════════════════════ */}
        <div id="calculadora" className="content-auto scroll-mt-8">
          <RecoveryCalculator />
        </div>

        <GlowDivider />

        {/* ═══════════════════════ FEATURES ═══════════════════════ */}
        <section id="funcionalidades" className="relative mx-auto max-w-[82rem] scroll-mt-8 px-4 py-16 sm:px-8 sm:py-24 lg:px-10">
          <div className="grid items-start gap-10 sm:gap-16 lg:grid-cols-[1fr_1.25fr]">
            <Reveal direction="left">
              <div className="lg:sticky lg:top-24">
                <SectionEyebrow>Plataforma completa</SectionEyebrow>
                <h2 className="mt-4 max-w-[16ch] text-[1.5rem] font-bold tracking-[-0.03em] text-white sm:text-[1.75rem] lg:text-[2.2rem] sm:leading-[1.15]">
                  Tudo que você precisa. Nada que não precisa.
                </h2>
                <p className="mt-5 max-w-md text-[0.95rem] leading-7 text-gray-400">
                  CRM de recuperação, automações, inbox e analytics — tudo integrado
                  numa plataforma que opera sozinha.
                </p>
                <div className="mt-8">
                  <MagneticButton>
                    <Link
                      href="/quiz"
                      className="group inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white"
                      style={{ background: b.accent }}
                    >
                      Explorar plataforma
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </MagneticButton>
                </div>

                <div
                  className="mt-10 inline-flex items-end gap-3 overflow-hidden rounded-xl px-6 py-5 backdrop-blur-sm"
                  style={{
                    border: "1px solid rgba(255,255,255,0.06)",
                    background: `${cardBg},0.5)`,
                  }}
                >
                  <div>
                    <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-gray-400">
                      Taxa de recuperação
                    </p>
                    <p className="mt-1.5 text-[2.2rem] font-bold leading-none tracking-tight" style={{ color: b.accent }}>
                      19–40%
                    </p>
                  </div>
                  <LineChart className="mb-1 h-7 w-7 opacity-30" style={{ color: b.accent }} />
                </div>
              </div>
            </Reveal>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { icon: Bot, title: "IA conversacional", desc: "Cada mensagem considera valor, método, histórico e tom ideal pro cliente." },
                { icon: Headphones, title: "Call Center IA", desc: "Agentes IA ligam com voz natural. Sem fila, sem espera, sem equipe humana." },
                { icon: MessageSquare, title: "WhatsApp nativo", desc: "Envio, recebimento e respostas inteligentes — tudo em tempo real." },
                { icon: BarChart3, title: "Dashboard analítico", desc: "Taxa de recuperação, receita salva, tempo médio e performance por canal." },
                { icon: Clock, title: "Follow-up inteligente", desc: "Sequências automáticas com timing otimizado por IA." },
                { icon: Shield, title: "Segurança enterprise", desc: "HMAC-SHA256, RLS por tenant, rate limiting." },
                { icon: CreditCard, title: "Checkout integrado", desc: "Pix, cartão e boleto num único link. Gerado e enviado automaticamente." },
                { icon: Users, title: "CRM de recovery", desc: "Cada lead com timeline completa: tentativas, mensagens, pagamentos." },
                { icon: Layers, title: "Multi-seller", desc: "Permissões isoladas. Admin governa. Escala segura." },
              ].map((f, i) => (
                <Reveal key={f.title} direction="up" delay={i * 80}>
                  <TiltCard>
                    <FeatureCard icon={f.icon} title={f.title} description={f.desc} />
                  </TiltCard>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <GlowDivider />

        {/* ═══════════════════════ SECURITY & COMPLIANCE ═══════════════════════ */}
        <section className="relative mx-auto max-w-[82rem] px-4 py-16 sm:px-8 sm:py-24 lg:px-10">
          <Reveal direction="up">
            <div className="text-center">
              <SectionEyebrow>Segurança & Compliance</SectionEyebrow>
              <h2 className="mt-4 text-balance text-[1.5rem] font-bold tracking-[-0.03em] text-white sm:text-[1.75rem] lg:text-[2.2rem]">
                Segurança que sua operação exige
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-[0.95rem] leading-7 text-gray-400">
                Seus dados e os dos seus clientes protegidos em cada camada.
              </p>
            </div>
          </Reveal>

          <div className="mx-auto mt-14 grid max-w-[56rem] gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: ShieldCheck, title: "LGPD Compliant", desc: "100% aderente à Lei 13.709/2018. Dados processados com base legal e consentimento." },
              { icon: Lock, title: "Criptografia AES-256", desc: "Dados em trânsito (TLS 1.3) e em repouso protegidos com criptografia de nível bancário." },
              { icon: Database, title: "Row-Level Security", desc: "Isolamento de dados por tenant. Cada merchant acessa apenas seus próprios dados." },
              { icon: Eye, title: "Zero-Storage de Cartão", desc: "Nunca armazenamos dados de cartão. Operamos exclusivamente via tokens e links de pagamento." },
              { icon: FileCheck, title: "Audit Trail", desc: "Registro completo de todas as ações: webhooks recebidos, mensagens enviadas, pagamentos processados." },
              { icon: Server, title: "Infraestrutura Cloud", desc: "Hospedagem em data centers com certificação SOC 2. Uptime de 99.9% com failover automático." },
            ].map((item, i) => (
              <Reveal key={item.title} direction="up" delay={i * 80}>
                <div
                  className="rounded-xl px-6 py-6 transition-colors duration-300 hover:border-white/[0.08]"
                  style={{
                    border: "1px solid rgba(255,255,255,0.04)",
                    background: `${cardBg},0.35)`,
                  }}
                >
                  <div
                    className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{
                      border: `1px solid rgba(${rgb},0.12)`,
                      background: `rgba(${rgb},0.06)`,
                    }}
                  >
                    <item.icon className="h-5 w-5" style={{ color: b.accent }} />
                  </div>
                  <h3 className="text-[0.82rem] font-semibold text-gray-200">{item.title}</h3>
                  <p className="mt-2 text-[0.72rem] leading-[1.7] text-gray-500">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <GlowDivider />

        {/* ═══════════════════════ PRICING ═══════════════════════ */}
        <section id="precos" className="relative mx-auto max-w-[82rem] scroll-mt-8 px-4 py-16 sm:px-8 sm:py-24 lg:px-10">
          <Reveal direction="up">
            <div className="text-center">
              <SectionEyebrow>Modelo de negócio</SectionEyebrow>
              <h2 className="mt-4 text-balance text-[1.5rem] font-bold tracking-[-0.03em] text-white sm:text-[1.75rem] lg:text-[2.2rem]">
                Alinhamento total de incentivos
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-[0.95rem] leading-7 text-gray-400">
                Modelo baseado em performance — você só paga quando recuperamos sua receita. Nosso sucesso depende do seu.
              </p>
            </div>
          </Reveal>

          <div className="mx-auto mt-14 grid max-w-[56rem] gap-4 sm:grid-cols-3">
            <Reveal direction="up" delay={0}>
              <TiltCard>
                <PricingCard
                  title="Integração"
                  price="R$0"
                  description="Setup, configuração e onboarding. Tudo por nossa conta."
                  icon={Zap}
                />
              </TiltCard>
            </Reveal>
            <Reveal direction="up" delay={120}>
              <TiltCard>
                <PricingCard
                  title="Mensalidade"
                  price="R$0"
                  description="Sem taxa fixa. Sem contrato. Cancele quando quiser."
                  icon={Clock}
                />
              </TiltCard>
            </Reveal>
            <Reveal direction="up" delay={240}>
              <TiltCard>
                <PricingCard
                  title="Recovery fee"
                  price="% sobre recuperação"
                  description="Só cobramos quando recuperamos. Sem resultado, sem custo."
                  icon={DollarSign}
                  highlighted
                />
              </TiltCard>
            </Reveal>
          </div>

          <Reveal direction="up" delay={300}>
            <p className="mx-auto mt-8 max-w-md text-center text-[0.78rem] leading-[1.7] text-gray-500">
              Percentual definido durante o onboarding com base no volume da operação.
              Transparência total — sem surpresas, sem taxas ocultas.
            </p>
          </Reveal>
        </section>

        <GlowDivider />

        {/* ═══════════════════════ SOCIAL PROOF / WAITLIST ═══════════════════════ */}
        <section className="relative mx-auto max-w-[82rem] px-4 py-16 sm:px-8 sm:py-24 lg:px-10">
          <Reveal direction="scale">
            <div
              className="mx-auto max-w-[48rem] overflow-hidden rounded-2xl px-5 py-10 text-center backdrop-blur-xl sm:px-12 sm:py-16"
              style={{
                border: `1px solid rgba(${rgb},0.10)`,
                background: `${cardBg},0.5)`,
              }}
            >
              <div
                className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{
                  border: `1px solid rgba(${rgb},0.14)`,
                  background: `rgba(${rgb},0.06)`,
                }}
              >
                <Gem className="h-7 w-7" style={{ color: b.accent }} />
              </div>
              <h2 className="text-[1.5rem] font-bold tracking-[-0.02em] text-white sm:text-[1.8rem]">
                Vagas limitadas para onboarding
              </h2>
              <p className="mx-auto mt-4 max-w-md text-[0.92rem] leading-7 text-gray-400">
                Estamos selecionando operações para o programa de acesso antecipado.
                Responda o quiz e garanta sua vaga.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
                <WaitlistStat value={<CountUp end={50} duration={2000} />} label="vagas disponíveis" />
                <div className="hidden h-8 w-px sm:block" style={{ background: `rgba(${rgb},0.12)` }} />
                <WaitlistStat value={<CountUp end={0} duration={1000} prefix="R$" />} label="setup gratuito" />
                <div className="hidden h-8 w-px sm:block" style={{ background: `rgba(${rgb},0.12)` }} />
                <WaitlistStat value={<CountUp end={5} duration={1500} suffix=" min" />} label="para integrar" />
              </div>

              <MagneticButton className="mt-8 sm:mt-10">
                <Link
                  href="/quiz"
                  className="group inline-flex items-center gap-2 rounded-xl px-6 py-3 text-[0.85rem] font-semibold text-white transition-all hover:brightness-110 sm:gap-2.5 sm:px-8 sm:py-3.5 sm:text-[0.92rem]"
                  style={{
                    background: b.accent,
                    boxShadow: `0 12px 32px ${b.accentGlow}`,
                  }}
                >
                  Garantir minha vaga
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </MagneticButton>
            </div>
          </Reveal>
        </section>

        <GlowDivider />

        {/* ═══════════════════════ FAQ ═══════════════════════ */}
        <section className="relative mx-auto max-w-[82rem] px-4 py-16 sm:px-8 sm:py-24 lg:px-10">
          <Reveal direction="up">
            <div className="text-center">
              <SectionEyebrow>Perguntas frequentes</SectionEyebrow>
              <h2 className="mt-4 text-balance text-[1.5rem] font-bold tracking-[-0.03em] text-white sm:text-[1.75rem] lg:text-[2.2rem]">
                Tudo que você precisa saber
              </h2>
            </div>
          </Reveal>

          <div className="mt-14">
            <Reveal direction="up" delay={100}>
              <FaqSection />
            </Reveal>
          </div>
        </section>

        <GlowDivider />

        {/* ═══════════════════════ COMPARISON ═══════════════════════ */}
        <section className="relative mx-auto max-w-[82rem] px-4 py-16 sm:px-8 sm:py-24 lg:px-10">
          <Reveal direction="up">
            <div className="text-center">
              <SectionEyebrow>Comparativo</SectionEyebrow>
              <h2 className="mt-4 text-balance text-[1.5rem] font-bold tracking-[-0.03em] text-white sm:text-[1.75rem] lg:text-[2.2rem]">
                Por que não fazer sozinho?
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-[0.95rem] leading-7 text-gray-400">
                Veja o que muda quando a tecnologia certa entra na operação.
              </p>
            </div>
          </Reveal>

          <Reveal direction="up" delay={100}>
            <div className="mx-auto mt-14 max-w-[56rem] overflow-x-auto rounded-2xl [-webkit-overflow-scrolling:touch]">
              <div
                className="min-w-[26rem] overflow-hidden rounded-2xl"
                style={{
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: `${cardBg},0.4)`,
                }}
              >
                {/* Table header */}
                <div className="grid grid-cols-4 border-b border-white/[0.04]">
                  <div className="px-2.5 py-3 sm:px-5 sm:py-4">
                    <span className="text-[0.6rem] font-semibold text-gray-500 sm:text-[0.68rem]">Critério</span>
                  </div>
                  <div className="border-l border-white/[0.04] px-2.5 py-3 text-center sm:px-5 sm:py-4">
                    <span className="text-[0.6rem] font-semibold text-gray-500 sm:text-[0.68rem]">Manual</span>
                  </div>
                  <div className="border-l border-white/[0.04] px-2.5 py-3 text-center sm:px-5 sm:py-4">
                    <span className="text-[0.6rem] font-semibold text-gray-500 sm:text-[0.68rem]">Gateway</span>
                  </div>
                  <div className="border-l px-2.5 py-3 text-center sm:px-5 sm:py-4" style={{ borderColor: `rgba(${rgb},0.12)`, background: `rgba(${rgb},0.04)` }}>
                    <span className="text-[0.6rem] font-bold sm:text-[0.68rem]" style={{ color: b.accent }}>{b.name}</span>
                  </div>
                </div>

                {/* Table rows */}
                {[
                  { label: "Tempo de resposta", manual: "Horas/dias", gateway: "~30 min", ours: "2 min" },
                  { label: "Canal de contato", manual: "E-mail", gateway: "E-mail", ours: "WhatsApp + IA" },
                  { label: "Personalização", manual: "Baixa", gateway: "Genérica", ours: "IA contextual" },
                  { label: "Call Center", manual: "Terceirizado", gateway: "Não incluso", ours: "Agentes IA" },
                  { label: "Disponibilidade", manual: "Horário comercial", gateway: "24/7", ours: "24/7" },
                  { label: "Escala", manual: "Limitada", gateway: "Limitada", ours: "Infinita" },
                  { label: "Taxa de recuperação", manual: "5-10%", gateway: "10-15%", ours: "19-40%" },
                ].map((row) => (
                  <div key={row.label} className="grid grid-cols-4 border-b border-white/[0.03] last:border-b-0">
                    <div className="px-2.5 py-2.5 sm:px-5 sm:py-3.5">
                      <span className="text-[0.58rem] font-medium text-gray-300 sm:text-[0.72rem]">{row.label}</span>
                    </div>
                    <div className="border-l border-white/[0.04] px-2.5 py-2.5 text-center sm:px-5 sm:py-3.5">
                      <span className="text-[0.58rem] text-gray-500 sm:text-[0.72rem]">{row.manual}</span>
                    </div>
                    <div className="border-l border-white/[0.04] px-2.5 py-2.5 text-center sm:px-5 sm:py-3.5">
                      <span className="text-[0.58rem] text-gray-500 sm:text-[0.72rem]">{row.gateway}</span>
                    </div>
                    <div className="border-l px-2.5 py-2.5 text-center sm:px-5 sm:py-3.5" style={{ borderColor: `rgba(${rgb},0.12)`, background: `rgba(${rgb},0.03)` }}>
                      <span className="text-[0.58rem] font-semibold sm:text-[0.72rem]" style={{ color: b.accent }}>{row.ours}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </section>

        <GlowDivider />

        {/* ═══════════════════════ TESTIMONIALS ═══════════════════════ */}
        <section className="relative mx-auto max-w-[82rem] px-4 py-16 sm:px-8 sm:py-24 lg:px-10">
          <Reveal direction="up">
            <div className="text-center">
              <SectionEyebrow>Depoimentos</SectionEyebrow>
              <h2 className="mt-4 text-balance text-[1.5rem] font-bold tracking-[-0.03em] text-white sm:text-[1.75rem] lg:text-[2.2rem]">
                O que dizem sobre nós
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-[0.95rem] leading-7 text-gray-400">
                Depoimentos de quem já recupera pagamentos com a plataforma.
              </p>
            </div>
          </Reveal>

          <div className="mt-12 flex justify-center gap-5 [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)] max-h-[700px] overflow-hidden">
            <TestimonialsColumn testimonials={testimonialsCol1} duration={16} />
            <TestimonialsColumn testimonials={testimonialsCol2} className="hidden md:block" duration={20} />
            <TestimonialsColumn testimonials={testimonialsCol3} className="hidden lg:block" duration={18} />
          </div>
        </section>

        <GlowDivider />

        {/* ═══════════════════════ INTEGRATION ═══════════════════════ */}
        <section id="integracao" className="relative mx-auto max-w-[82rem] scroll-mt-8 px-4 py-16 sm:px-8 sm:py-24 lg:px-10">
          <Reveal direction="up">
            <div
              className="overflow-hidden rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl"
              style={{
                border: "1px solid rgba(255,255,255,0.06)",
                background: `${cardBg},0.5)`,
              }}
            >
              <div
                className="absolute inset-0"
                style={{ background: `radial-gradient(ellipse at top left, rgba(${rgb},0.05), transparent 50%)` }}
              />
              <div
                className="absolute inset-0"
                style={{ background: `radial-gradient(ellipse at bottom right, rgba(${rgb},0.04), transparent 50%)` }}
              />

              <div className="relative grid gap-8 px-5 py-10 sm:gap-10 sm:px-12 sm:py-16 lg:grid-cols-2 lg:gap-16 lg:px-14">
                <div>
                  <SectionEyebrow>Integração em minutos</SectionEyebrow>
                  <h2 className="mt-4 max-w-[16ch] text-[1.5rem] font-bold tracking-[-0.03em] text-white sm:text-[1.75rem] lg:text-[2.2rem] sm:leading-[1.15]">
                    Conecte seu gateway e comece a recuperar
                  </h2>
                  <p className="mt-4 max-w-md text-[0.95rem] leading-7 text-gray-400">
                    Configure o webhook, conecte o WhatsApp e pronto.
                    A plataforma faz o resto.
                  </p>
                  <MagneticButton className="mt-8">
                    <Link
                      href="/quiz"
                      className="group inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white"
                      style={{ background: b.accent }}
                    >
                      Solicitar acesso
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </MagneticButton>
                </div>

                <div className="space-y-3">
                  <IntegrationStep step="1" title="Configure o webhook" description={`Adicione a URL da ${b.name} no seu gateway de pagamento.`} />
                  <IntegrationStep step="2" title="Conecte o WhatsApp" description="Escaneie o QR code para conectar seu número via Evolution API." />
                  <IntegrationStep step="3" title="Personalize a IA" description="Defina o tom das mensagens, limites de tentativa e regras de automação." />
                  <IntegrationStep step="4" title="Recupere automaticamente" description="A plataforma opera 24/7. Acompanhe tudo no dashboard." />
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ═══════════════════════ CTA FINAL ═══════════════════════ */}
        <section className="relative mx-auto max-w-[82rem] px-4 py-16 sm:px-8 sm:py-24 lg:px-10">
          <Reveal direction="scale">
            <div
              className="relative overflow-hidden rounded-2xl px-5 py-12 text-center shadow-[0_40px_100px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:px-14 sm:py-24"
              style={{
                border: `1px solid rgba(${rgb},0.08)`,
                background: `linear-gradient(135deg, rgba(${rgb},0.04), ${cardBg},0.6), rgba(${rgb},0.03))`,
              }}
            >
              <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.015]">
                <Image
                  src={b.mark}
                  alt=""
                  width={600}
                  height={600}
                  quality={50}
                  className="h-[28rem] w-[28rem] object-contain"
                  aria-hidden="true"
                  loading="lazy"
                />
              </div>

              <div className="relative">
                <div
                  className="mx-auto mb-8 flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{
                    border: `1px solid rgba(${rgb},0.14)`,
                    background: `rgba(${rgb},0.06)`,
                  }}
                >
                  <TrendingUp className="h-6 w-6" style={{ color: b.accent }} />
                </div>
                <h2 className="text-balance text-[1.5rem] font-bold tracking-[-0.03em] text-white sm:text-[2rem] lg:text-[2.8rem]">
                  Sua receita está escapando agora
                </h2>
                <p className="mx-auto mt-5 max-w-lg text-[1rem] leading-7 text-gray-400">
                  Cada pagamento falhado que não é recuperado é receita que não volta.
                  Configure em minutos, veja resultados no primeiro dia.
                </p>
                <div className="mt-7 flex flex-col items-center gap-3 sm:mt-10 sm:flex-row sm:justify-center">
                  <MagneticButton>
                    <Link
                      href="/quiz"
                      className="group inline-flex items-center gap-2 rounded-xl px-6 py-3 text-[0.85rem] font-semibold text-white transition-all hover:brightness-110 sm:gap-2.5 sm:px-8 sm:py-3.5 sm:text-[0.92rem]"
                      style={{
                        background: b.accent,
                        boxShadow: `0 12px 32px ${b.accentGlow}`,
                      }}
                    >
                      Começar agora — sem custo
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </MagneticButton>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ═══════════════════════ FOOTER ═══════════════════════ */}
        <footer className="relative mx-auto max-w-[82rem] px-4 pb-10 pt-4 sm:px-8 lg:px-10">
          <div className="border-t border-white/[0.06] pt-12">
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              {/* Brand */}
              <div className="sm:col-span-2 lg:col-span-1">
                <div className="flex items-center gap-3">
                  <PlatformLogo mode="icon" size="sm" />
                  <p className="text-sm font-semibold text-gray-400">{b.name}</p>
                </div>
                <p className="mt-3 max-w-[18rem] text-[0.75rem] leading-[1.7] text-gray-500">
                  Recuperação autônoma de pagamentos. IA, WhatsApp e Call Center de agentes IA trabalhando 24/7 para transformar falhas em receita.
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5" style={{ color: `rgba(${rgb},0.5)` }} />
                  <span className="text-[0.6rem] text-gray-500">LGPD Compliant • Dados criptografados</span>
                </div>
              </div>

              {/* Produto */}
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.15em] text-gray-400">Produto</p>
                <ul className="mt-4 space-y-2.5">
                  <FooterLink href="#como-funciona">Como funciona</FooterLink>
                  <FooterLink href="#funcionalidades">Funcionalidades</FooterLink>
                  <FooterLink href="#integracao">Integração</FooterLink>
                  <FooterLink href="#calculadora">Calculadora</FooterLink>
                  <FooterLink href="#precos">Preços</FooterLink>
                </ul>
              </div>

              {/* Empresa */}
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.15em] text-gray-400">Empresa</p>
                <ul className="mt-4 space-y-2.5">
                  <FooterLink href="/quiz">Acesso antecipado</FooterLink>
                  <FooterLink href="mailto:contato@pagrecovery.com">Contato</FooterLink>
                </ul>
              </div>

              {/* Legal */}
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.15em] text-gray-400">Legal</p>
                <ul className="mt-4 space-y-2.5">
                  <FooterLink href="/privacy">Política de Privacidade</FooterLink>
                  <FooterLink href="/terms">Termos de Uso</FooterLink>
                </ul>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="mt-12 flex flex-col items-center gap-3 border-t border-white/[0.06] pt-6 sm:flex-row sm:justify-between">
              <p className="font-mono text-[0.52rem] uppercase tracking-[0.2em] text-gray-400">
                &copy; {new Date().getFullYear()} {b.name} Tecnologia. Todos os direitos reservados.
              </p>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-[0.52rem] text-gray-400">
                  <Lock className="h-2.5 w-2.5" />
                  Dados protegidos conforme LGPD (Lei 13.709/2018)
                </span>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

/* ═══════════════════════ COMPONENTS ═══════════════════════ */

function GlowDivider() {
  return (
    <div className="mx-auto max-w-[60rem] px-6">
      <div
        className="h-px"
        style={{
          background: `linear-gradient(to right, transparent, rgba(${rgb},0.15), transparent)`,
        }}
      />
    </div>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="font-mono text-[0.58rem] font-semibold uppercase tracking-[0.2em] opacity-70 sm:text-[0.65rem] sm:tracking-[0.3em]"
      style={{ color: b.accent }}
    >
      {children}
    </p>
  );
}


function MarqueeItem({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex items-center gap-2 px-4 text-gray-400">
      <Icon className="h-3.5 w-3.5 opacity-40" style={{ color: b.accent }} />
      <span className="whitespace-nowrap text-[0.72rem] font-medium uppercase tracking-[0.12em]">
        {text}
      </span>
    </div>
  );
}

function MarqueeDot() {
  return (
    <span
      className="mx-2 h-1 w-1 shrink-0 rounded-full opacity-20"
      style={{ background: b.accent }}
    />
  );
}

function ImpactCard({
  value,
  label,
  sublabel,
}: {
  value: React.ReactNode;
  label: string;
  sublabel: string;
}) {
  return (
    <div
      className="card-hover-glow rounded-xl px-5 py-6 text-center backdrop-blur-sm sm:rounded-2xl sm:px-7 sm:py-8"
      style={{
        border: "1px solid rgba(255,255,255,0.05)",
        background: `${cardBg},0.5)`,
        ["--card-glow-rgb" as string]: rgb,
      }}
    >
      <p className="text-[2.2rem] font-bold leading-none tracking-tight sm:text-[2.8rem]" style={{ color: b.accent }}>
        {value}
      </p>
      <p className="mt-2 text-[0.82rem] font-semibold text-gray-200 sm:mt-3 sm:text-[0.88rem]">{label}</p>
      <p className="mt-1.5 text-[0.72rem] text-gray-400">{sublabel}</p>
    </div>
  );
}

function BeforeAfterItem({ text, negative }: { text: string; negative?: boolean }) {
  return (
    <li className="flex items-start gap-3">
      {negative ? (
        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400/60" />
      ) : (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: b.accent }} />
      )}
      <span className={`text-[0.82rem] leading-[1.6] ${negative ? "text-red-300/70" : "text-gray-300"}`}>
        {text}
      </span>
    </li>
  );
}

function ResultCard({
  category,
  value,
  description,
  icon: Icon,
}: {
  category: string;
  value: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div
      className="card-hover-glow rounded-xl px-5 py-6 text-center backdrop-blur-sm sm:rounded-2xl sm:px-7 sm:py-8"
      style={{
        border: "1px solid rgba(255,255,255,0.05)",
        background: `${cardBg},0.45)`,
        ["--card-glow-rgb" as string]: rgb,
      }}
    >
      <div
        className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-lg sm:mb-4 sm:h-10 sm:w-10 sm:rounded-xl"
        style={{
          border: `1px solid rgba(${rgb},0.12)`,
          background: `rgba(${rgb},0.06)`,
        }}
      >
        <Icon className="h-4 w-4" style={{ color: b.accent }} />
      </div>
      <span
        className="inline-block rounded-full px-3 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.15em]"
        style={{
          border: `1px solid rgba(${rgb},0.12)`,
          background: `rgba(${rgb},0.04)`,
          color: b.accent,
        }}
      >
        {category}
      </span>
      <p className="mt-3 text-[1.8rem] font-bold leading-none tracking-tight sm:mt-4 sm:text-[2.2rem]" style={{ color: b.accent }}>
        {value}
      </p>
      <p className="mt-1.5 text-[0.72rem] leading-[1.6] text-gray-400 sm:mt-2 sm:text-[0.78rem]">
        {description}
      </p>
    </div>
  );
}

function StepCard({ number, icon: Icon, title, description }: { number: string; icon: LucideIcon; title: string; description: string }) {
  return (
    <div
      className="card-hover-glow group rounded-xl px-5 py-6 backdrop-blur-sm"
      style={{
        border: "1px solid rgba(255,255,255,0.05)",
        background: `${cardBg},0.4)`,
        ["--card-glow-rgb" as string]: rgb,
      }}
    >
      <div className="flex items-center justify-between">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{
            border: `1px solid rgba(${rgb},0.12)`,
            background: `rgba(${rgb},0.06)`,
          }}
        >
          <Icon className="h-[18px] w-[18px]" style={{ color: b.accent }} />
        </div>
        <span className="font-mono text-[0.65rem] font-bold tracking-wider text-gray-500">{number}</span>
      </div>
      <h3 className="mt-4 text-[0.88rem] font-semibold text-gray-200">{title}</h3>
      <p className="mt-2 text-[0.78rem] leading-[1.7] text-gray-400">{description}</p>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div
      className="card-hover-glow group rounded-xl px-5 py-5 backdrop-blur-sm"
      style={{
        border: "1px solid rgba(255,255,255,0.05)",
        background: `${cardBg},0.35)`,
        ["--card-glow-rgb" as string]: rgb,
      }}
    >
      <div
        className="flex h-9 w-9 items-center justify-center rounded-lg"
        style={{
          border: `1px solid rgba(${rgb},0.10)`,
          background: `rgba(${rgb},0.05)`,
        }}
      >
        <Icon className="h-4 w-4 opacity-80" style={{ color: b.accent }} />
      </div>
      <h3 className="mt-3.5 text-[0.82rem] font-semibold text-gray-200">{title}</h3>
      <p className="mt-1.5 text-[0.75rem] leading-[1.7] text-gray-400">{description}</p>
    </div>
  );
}

function WaitlistStat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="text-center">
      <p className="text-[1.3rem] font-bold tracking-tight sm:text-[1.6rem]" style={{ color: b.accent }}>
        {value}
      </p>
      <p className="font-mono text-[0.45rem] uppercase tracking-[0.15em] text-gray-500 sm:text-[0.52rem] sm:tracking-[0.2em]">
        {label}
      </p>
    </div>
  );
}

function PricingCard({
  title,
  price,
  description,
  icon: Icon,
  highlighted,
}: {
  title: string;
  price: string;
  description: string;
  icon: LucideIcon;
  highlighted?: boolean;
}) {
  return (
    <div
      className="card-hover-glow rounded-xl px-5 py-6 text-center backdrop-blur-sm sm:rounded-2xl sm:px-7 sm:py-8"
      style={{
        border: highlighted
          ? `1px solid rgba(${rgb},0.15)`
          : "1px solid rgba(255,255,255,0.05)",
        background: highlighted
          ? `rgba(${rgb},0.04)`
          : `${cardBg},0.5)`,
        ["--card-glow-rgb" as string]: rgb,
      }}
    >
      <div
        className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl"
        style={{
          border: `1px solid rgba(${rgb},0.12)`,
          background: `rgba(${rgb},0.06)`,
        }}
      >
        <Icon className="h-4 w-4" style={{ color: b.accent }} />
      </div>
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-gray-400">{title}</p>
      <p className="mt-2 text-[1.6rem] font-bold leading-none tracking-tight" style={{ color: highlighted ? b.accent : undefined }}>
        <span className={highlighted ? "" : "text-white"}>{price}</span>
      </p>
      <p className="mt-3 text-[0.75rem] leading-[1.7] text-gray-400">{description}</p>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  const isExternal = href.startsWith("mailto:") || href.startsWith("http");
  const Component = isExternal ? "a" : Link;
  return (
    <li>
      <Component
        href={href}
        className="text-[0.75rem] text-gray-500 transition-colors hover:text-gray-400 hover:text-gray-400"
      >
        {children}
      </Component>
    </li>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-lg px-3 py-2.5 text-center"
      style={{
        border: `1px solid rgba(${rgb},0.08)`,
        background: `rgba(${rgb},0.03)`,
      }}
    >
      <p className="text-[0.95rem] font-bold tracking-tight" style={{ color: b.accent }}>
        {value}
      </p>
      <p className="mt-0.5 text-[0.58rem] font-medium uppercase tracking-[0.12em] text-gray-500">
        {label}
      </p>
    </div>
  );
}

function IntegrationStep({ step, title, description }: { step: string; title: string; description: string }) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-white/[0.06] bg-gray-50 dark:bg-white/[0.02] px-5 py-4 backdrop-blur-sm transition-all">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-bold opacity-80"
        style={{
          border: `1px solid rgba(${rgb},0.14)`,
          background: `rgba(${rgb},0.06)`,
          color: b.accent,
        }}
      >
        {step}
      </div>
      <div>
        <p className="text-[0.82rem] font-semibold text-gray-200">{title}</p>
        <p className="mt-1 text-[0.72rem] leading-5 text-gray-400">{description}</p>
      </div>
    </div>
  );
}
