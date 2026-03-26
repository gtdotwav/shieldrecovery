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
  Layers,
  LineChart,
  Lock,
  Mail,
  MessageSquare,
  QrCode,
  Scale,
  Server,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TrendingUp,
  Users,
  XCircle,
  Zap,
} from "lucide-react";

import { AdminAccessButton } from "@/components/landing/admin-access";
import { CountUp } from "@/components/landing/count-up";
import { FaqSection } from "@/components/landing/faq-section";
import { HeroHeading } from "@/components/landing/hero-heading";
import { HeroParticles } from "@/components/landing/hero-particles";
import { LiveDemo } from "@/components/landing/live-demo";
import { MagneticButton } from "@/components/landing/magnetic-button";
import { Marquee } from "@/components/landing/marquee";
import { PhoneMockup } from "@/components/landing/phone-mockup";
import { RecoveryCalculator } from "@/components/landing/recovery-calculator";
import { Reveal } from "@/components/landing/scroll-reveal";
import { ScrollProgress } from "@/components/landing/scroll-progress";
import { TiltCard } from "@/components/landing/tilt-card";
import { PlatformLogo } from "@/components/platform/platform-logo";
import { formatCurrency } from "@/lib/format";
import { platformBrand } from "@/lib/platform";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";

export const dynamic = "force-dynamic";

// ── Brand-derived tokens ──
const b = platformBrand;
const rgb = b.accentRgb;
const cardBg = `rgba(${b.slug === "pagrecovery" ? "6,20,15" : "13,13,13"}`;

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

      {/* ═══ Background layers ═══ */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -10%, rgba(${rgb},0.12), transparent 60%),
            radial-gradient(ellipse 60% 40% at 80% 60%, rgba(${rgb},0.06), transparent 50%),
            radial-gradient(ellipse 50% 50% at 10% 90%, rgba(${rgb},0.04), transparent 50%),
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
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.03] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      <div
        className="pointer-events-none fixed left-[-10%] top-[-8%] z-0 h-[600px] w-[600px] rounded-full blur-[120px]"
        style={{ background: `rgba(${rgb},0.07)` }}
      />
      <div
        className="pointer-events-none fixed right-[-8%] top-[30%] z-0 h-[500px] w-[500px] rounded-full blur-[100px]"
        style={{ background: `rgba(${rgb},0.05)` }}
      />
      <div
        className="pointer-events-none fixed bottom-[-10%] left-[30%] z-0 h-[400px] w-[400px] rounded-full blur-[100px]"
        style={{ background: `rgba(${rgb},0.04)` }}
      />

      {/* ═══ Navigation ═══ */}
      <nav className="relative z-30 mx-auto flex max-w-[82rem] items-center justify-between px-6 py-5 sm:px-8 lg:px-10">
        <Image
          src={b.logo}
          alt={b.name}
          width={176}
          height={176}
          sizes="(min-width: 640px) 176px, 128px"
          className="h-[8rem] w-auto object-contain sm:h-[11rem]"
          style={{ filter: `drop-shadow(0 8px 24px rgba(${rgb},0.12))` }}
          priority
        />
        <div className="flex items-center gap-3">
          <AdminAccessButton />
          <MagneticButton>
            <Link
              href="/quiz"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all"
              style={{
                background: b.accent,
                boxShadow: `0 12px 32px ${b.accentGlow}`,
              }}
            >
              Abrir plataforma
              <ArrowRight className="h-4 w-4" />
            </Link>
          </MagneticButton>
        </div>
      </nav>

      <main className="relative z-10">
        {/* ═══════════════════════ HERO ═══════════════════════ */}
        <section className="relative mx-auto max-w-[82rem] px-6 pb-20 pt-6 sm:px-8 sm:pt-12 lg:px-10 lg:pt-16">
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
              className="h-[42rem] w-[42rem] object-contain"
              aria-hidden="true"
              loading="lazy"
            />
          </div>

          <div className="relative z-10 grid items-center gap-12 lg:grid-cols-[1fr_auto] lg:gap-16">
            {/* Hero text */}
            <div className="mx-auto max-w-[48rem] text-center lg:mx-0 lg:text-left">
              <Reveal direction="up">
                <div
                  className="inline-flex items-center gap-2.5 rounded-full px-5 py-2 backdrop-blur-md"
                  style={{
                    border: `1px solid rgba(${rgb},0.15)`,
                    background: `rgba(${rgb},0.04)`,
                  }}
                >
                  <span className="relative flex h-2 w-2">
                    <span
                      className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-50"
                      style={{ background: b.accent }}
                    />
                    <span
                      className="relative inline-flex h-2 w-2 rounded-full"
                      style={{
                        background: b.accent,
                        boxShadow: `0 0 8px rgba(${rgb},0.6)`,
                      }}
                    />
                  </span>
                  <span
                    className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] opacity-80"
                    style={{ color: b.accent }}
                  >
                    Recuperação autônoma com IA
                  </span>
                </div>
              </Reveal>

              <HeroHeading />

              <Reveal direction="up" delay={400}>
                <p className="mt-7 max-w-[36rem] text-[1.05rem] leading-[1.8] text-gray-500 dark:text-gray-400 sm:text-[1.1rem] lg:mx-0">
                  Quando um pagamento falha, nossa IA contata o cliente em 2 minutos
                  via WhatsApp com link direto. Resultado: até 38% da receita perdida
                  recuperada — sem intervenção humana.
                </p>
              </Reveal>

              <Reveal direction="up" delay={500}>
                <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
                  <MagneticButton>
                    <Link
                      href="/quiz"
                      className="group inline-flex items-center gap-2.5 rounded-xl px-8 py-3.5 text-[0.92rem] font-semibold text-white transition-all hover:brightness-110"
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
                    className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-white/[0.03] px-8 py-3.5 text-[0.92rem] font-medium text-gray-500 dark:text-gray-400 backdrop-blur-sm transition-all hover:border-gray-300 dark:hover:border-white/14 hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    Como funciona
                    <ArrowDown className="h-4 w-4" />
                  </a>
                </div>
              </Reveal>
            </div>

            {/* Phone mockup - desktop */}
            <Reveal direction="right" delay={600} className="hidden lg:flex lg:justify-end">
              <PhoneMockup className="animate-float" />
            </Reveal>
          </div>

          {/* Live metrics */}
          <Reveal direction="up" delay={300}>
            <div className="relative z-10 mx-auto mt-20 max-w-[60rem]">
              <div
                className="overflow-hidden rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.4)] backdrop-blur-xl"
                style={{
                  border: "1px solid rgba(255,255,255,0.06)",
                  background: `${cardBg},0.6)`,
                }}
              >
                <div className="grid grid-cols-2 sm:grid-cols-4">
                  <LiveMetric value={analytics.total_failed_payments.toString()} label="Eventos capturados" icon={Zap} />
                  <LiveMetric value={analytics.active_recoveries.toString()} label="Em recuperação" icon={Clock} />
                  <LiveMetric value={analytics.recovered_payments.toString()} label="Recuperados" icon={CheckCircle2} />
                  <LiveMetric value={formatCurrency(portfolioValue)} label="Carteira ativa" icon={TrendingUp} />
                </div>
                <div className="flex items-center justify-center gap-2 border-t border-gray-100 dark:border-gray-800 py-3">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-40" style={{ background: b.accent }} />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: b.accent }} />
                  </span>
                  <p className="font-mono text-[0.55rem] uppercase tracking-[0.24em] text-gray-400 dark:text-gray-600">
                    dados ao vivo da operação
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ═══════════════════════ MARQUEE TRUST BAR ═══════════════════════ */}
        <section className="relative mx-auto max-w-[82rem] px-0 pb-20">
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
              <MarqueeItem icon={Bot} text="GPT-4.1 IA" />
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
        <section className="relative mx-auto max-w-[82rem] px-6 py-24 sm:px-8 lg:px-10">
          <Reveal direction="up">
            <div className="text-center">
              <SectionEyebrow>Impacto real</SectionEyebrow>
              <h2 className="mt-4 text-balance text-[1.75rem] font-bold tracking-[-0.03em] text-gray-900 dark:text-white sm:text-[2.2rem]">
                Números que falam por si
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-[0.95rem] leading-7 text-gray-400 dark:text-gray-500">
                Métricas da operação ativa — dados reais, não projeções.
              </p>
            </div>
          </Reveal>

          <div className="mx-auto mt-14 grid max-w-[56rem] gap-4 sm:grid-cols-3">
            <Reveal direction="up" delay={0}>
              <TiltCard>
                <ImpactCard
                  value={<CountUp end={38} suffix="%" duration={2000} />}
                  label="Taxa de recuperação"
                  sublabel="de pagamentos falhados recuperados"
                />
              </TiltCard>
            </Reveal>
            <Reveal direction="up" delay={150}>
              <TiltCard>
                <ImpactCard
                  value={<><CountUp end={2} duration={1500} />min</>}
                  label="Tempo de resposta"
                  sublabel="da falha ao contato via WhatsApp"
                />
              </TiltCard>
            </Reveal>
            <Reveal direction="up" delay={300}>
              <TiltCard>
                <ImpactCard
                  value={<CountUp end={24} suffix="/7" duration={1800} />}
                  label="Operação contínua"
                  sublabel="IA trabalhando sem parar"
                />
              </TiltCard>
            </Reveal>
          </div>
        </section>

        <GlowDivider />

        {/* ═══════════════════════ BEFORE / AFTER ═══════════════════════ */}
        <section className="relative mx-auto max-w-[82rem] px-6 py-24 sm:px-8 lg:px-10">
          <Reveal direction="up">
            <div className="text-center">
              <SectionEyebrow>Antes vs depois</SectionEyebrow>
              <h2 className="mt-4 text-balance text-[1.75rem] font-bold tracking-[-0.03em] text-gray-900 dark:text-white sm:text-[2.2rem]">
                O que muda com recuperação ativa
              </h2>
            </div>
          </Reveal>

          <div className="mx-auto mt-14 grid max-w-[60rem] gap-6 lg:grid-cols-2">
            <Reveal direction="left" delay={100}>
              <TiltCard>
                <div
                  className="rounded-2xl px-7 py-8"
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
                    <BeforeAfterItem negative text="Pagamento falha → cliente some" />
                    <BeforeAfterItem negative text="Equipe descobre dias depois" />
                    <BeforeAfterItem negative text="Contato manual, sem escala" />
                    <BeforeAfterItem negative text="Sem dados sobre o motivo da falha" />
                    <BeforeAfterItem negative text="Receita perdida permanentemente" />
                  </ul>
                </div>
              </TiltCard>
            </Reveal>

            <Reveal direction="right" delay={100}>
              <TiltCard>
                <div
                  className="rounded-2xl px-7 py-8"
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
                      <Sparkles className="h-5 w-5" style={{ color: b.accent }} />
                    </div>
                    <h3 className="text-[1rem] font-bold" style={{ color: b.accent }}>
                      Com {b.name}
                    </h3>
                  </div>
                  <ul className="mt-6 space-y-4">
                    <BeforeAfterItem text="Falha detectada → contato em 2 minutos" />
                    <BeforeAfterItem text="IA identifica melhor momento e canal" />
                    <BeforeAfterItem text="WhatsApp automatizado com link de pagamento" />
                    <BeforeAfterItem text="Dashboard com analytics em tempo real" />
                    <BeforeAfterItem text="~38% da receita perdida é recuperada" />
                  </ul>
                </div>
              </TiltCard>
            </Reveal>
          </div>
        </section>

        <GlowDivider />

        {/* ═══════════════════════ HOW IT WORKS ═══════════════════════ */}
        <section id="como-funciona" className="relative mx-auto max-w-[82rem] scroll-mt-8 px-6 py-24 sm:px-8 lg:px-10">
          <Reveal direction="up">
            <div className="text-center">
              <SectionEyebrow>Como funciona</SectionEyebrow>
              <h2 className="mt-4 text-balance text-[1.75rem] font-bold tracking-[-0.03em] text-gray-900 dark:text-white sm:text-[2.2rem]">
                Da falha à recuperação em minutos
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-[0.95rem] leading-7 text-gray-400 dark:text-gray-500">
                Quatro etapas automatizadas. Zero intervenção manual.
              </p>
            </div>
          </Reveal>

          <div className="mx-auto mt-14 grid max-w-[60rem] gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: "01", icon: Zap, title: "Webhook detecta", desc: "Falha de pagamento capturada via webhook do gateway em tempo real." },
              { n: "02", icon: Bot, title: "IA personaliza", desc: "Analisa valor, método, histórico e define tom e momento ideal." },
              { n: "03", icon: MessageSquare, title: "WhatsApp contata", desc: "Mensagem humanizada com link de pagamento direto ao cliente." },
              { n: "04", icon: TrendingUp, title: "Receita recuperada", desc: "Cliente paga, status atualiza. Dashboard reflete em tempo real." },
            ].map((s, i) => (
              <Reveal key={s.n} direction="up" delay={i * 100}>
                <TiltCard>
                  <StepCard number={s.n} icon={s.icon} title={s.title} description={s.desc} />
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ═══════════════════════ PHONE MOCKUP (mobile) ═══════════════════════ */}
        <section className="relative mx-auto max-w-[82rem] px-6 pb-16 sm:px-8 lg:hidden lg:px-10">
          <Reveal direction="scale">
            <div className="flex justify-center">
              <PhoneMockup />
            </div>
          </Reveal>
        </section>

        {/* ═══════════════════════ RESULTS ═══════════════════════ */}
        <section className="relative mx-auto max-w-[82rem] px-6 py-24 sm:px-8 lg:px-10">
          <Reveal direction="up">
            <div className="text-center">
              <SectionEyebrow>Resultados</SectionEyebrow>
              <h2 className="mt-4 text-balance text-[1.75rem] font-bold tracking-[-0.03em] text-gray-900 dark:text-white sm:text-[2.2rem]">
                Recuperação que funciona
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-[0.95rem] leading-7 text-gray-400 dark:text-gray-500">
                Cenários reais de operações usando a plataforma.
              </p>
            </div>
          </Reveal>

          <div className="mx-auto mt-14 grid max-w-[60rem] gap-4 sm:grid-cols-3">
            <Reveal direction="up" delay={0}>
              <TiltCard>
                <ResultCard
                  category="E-commerce de moda"
                  value="R$23.400"
                  description="recuperados em 30 dias • 187 transações • tempo médio de recuperação: 14 min"
                  icon={CreditCard}
                />
              </TiltCard>
            </Reveal>
            <Reveal direction="up" delay={150}>
              <TiltCard>
                <ResultCard
                  category="SaaS B2B — Recorrência"
                  value="3.2x ROI"
                  description="no primeiro mês • churn involuntário reduzido de 8.4% para 2.1%"
                  icon={TrendingUp}
                />
              </TiltCard>
            </Reveal>
            <Reveal direction="up" delay={300}>
              <TiltCard>
                <ResultCard
                  category="Infoproduto digital"
                  value="41%"
                  description="taxa de recuperação • 68% via Pix, 32% cartão • R$890 ticket médio salvo"
                  icon={BarChart3}
                />
              </TiltCard>
            </Reveal>
          </div>
        </section>

        <GlowDivider />

        {/* ═══════════════════════ LIVE DEMO ═══════════════════════ */}
        <LiveDemo />

        {/* ═══════════════════════ CALCULATOR ═══════════════════════ */}
        <RecoveryCalculator />

        <GlowDivider />

        {/* ═══════════════════════ FEATURES ═══════════════════════ */}
        <section className="relative mx-auto max-w-[82rem] px-6 py-24 sm:px-8 lg:px-10">
          <div className="grid items-start gap-16 lg:grid-cols-[1fr_1.25fr]">
            <Reveal direction="left">
              <div className="lg:sticky lg:top-24">
                <SectionEyebrow>Plataforma completa</SectionEyebrow>
                <h2 className="mt-4 max-w-[16ch] text-[1.75rem] font-bold tracking-[-0.03em] text-gray-900 dark:text-white sm:text-[2.2rem] sm:leading-[1.15]">
                  Tudo que sua operação precisa em um lugar
                </h2>
                <p className="mt-5 max-w-md text-[0.95rem] leading-7 text-gray-400 dark:text-gray-500">
                  CRM, inbox, automações e analytics — integrados em um ecossistema
                  focado em recuperação de pagamentos.
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
                    <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-gray-400 dark:text-gray-600">
                      Taxa de recuperação
                    </p>
                    <p className="mt-1.5 text-[2.2rem] font-bold leading-none tracking-tight" style={{ color: b.accent }}>
                      {recoveryRate}%
                    </p>
                  </div>
                  <LineChart className="mb-1 h-7 w-7 opacity-30" style={{ color: b.accent }} />
                </div>
              </div>
            </Reveal>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { icon: Bot, title: "IA conversacional", desc: "Mensagens com contexto: valor, método, histórico e tom personalizado." },
                { icon: MessageSquare, title: "WhatsApp nativo", desc: "Envio, recebimento e respostas automáticas em tempo real." },
                { icon: BarChart3, title: "Dashboard analítico", desc: "KPIs ao vivo: taxa, receita salva, tempo médio e performance." },
                { icon: Clock, title: "Follow-up automático", desc: "Sequências inteligentes com delay configurável." },
                { icon: Shield, title: "Segurança enterprise", desc: "HMAC-SHA256, RLS por tenant, rate limiting." },
                { icon: CreditCard, title: "Checkout integrado", desc: "PIX, cartão de crédito e boleto. Link automático." },
                { icon: Users, title: "CRM de recovery", desc: "Lead com timeline: tentativas, mensagens e status." },
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
        <section className="relative mx-auto max-w-[82rem] px-6 py-24 sm:px-8 lg:px-10">
          <Reveal direction="up">
            <div className="text-center">
              <SectionEyebrow>Segurança & Compliance</SectionEyebrow>
              <h2 className="mt-4 text-balance text-[1.75rem] font-bold tracking-[-0.03em] text-gray-900 dark:text-white sm:text-[2.2rem]">
                Infraestrutura de nível enterprise
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-[0.95rem] leading-7 text-gray-400 dark:text-gray-500">
                Seus dados e os dados dos seus clientes protegidos por múltiplas camadas de segurança.
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
        <section className="relative mx-auto max-w-[82rem] px-6 py-24 sm:px-8 lg:px-10">
          <Reveal direction="up">
            <div className="text-center">
              <SectionEyebrow>Modelo de negócio</SectionEyebrow>
              <h2 className="mt-4 text-balance text-[1.75rem] font-bold tracking-[-0.03em] text-gray-900 dark:text-white sm:text-[2.2rem]">
                Alinhamento total de incentivos
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-[0.95rem] leading-7 text-gray-400 dark:text-gray-500">
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
                  description="Setup, configuração e onboarding completo sem custo."
                  icon={Zap}
                />
              </TiltCard>
            </Reveal>
            <Reveal direction="up" delay={120}>
              <TiltCard>
                <PricingCard
                  title="Mensalidade"
                  price="R$0"
                  description="Sem taxa fixa mensal. Cancele quando quiser, sem lock-in."
                  icon={Clock}
                />
              </TiltCard>
            </Reveal>
            <Reveal direction="up" delay={240}>
              <TiltCard>
                <PricingCard
                  title="Recovery fee"
                  price="% sobre recuperação"
                  description="Comissão apenas sobre pagamentos efetivamente recuperados."
                  icon={DollarSign}
                  highlighted
                />
              </TiltCard>
            </Reveal>
          </div>

          <Reveal direction="up" delay={300}>
            <p className="mx-auto mt-8 max-w-md text-center text-[0.78rem] leading-[1.7] text-gray-500 dark:text-gray-600">
              Percentual definido durante o onboarding com base no volume da operação.
              Transparência total — sem surpresas, sem taxas ocultas.
            </p>
          </Reveal>
        </section>

        <GlowDivider />

        {/* ═══════════════════════ SOCIAL PROOF / WAITLIST ═══════════════════════ */}
        <section className="relative mx-auto max-w-[82rem] px-6 py-24 sm:px-8 lg:px-10">
          <Reveal direction="scale">
            <div
              className="mx-auto max-w-[48rem] overflow-hidden rounded-2xl px-8 py-14 text-center backdrop-blur-xl sm:px-12 sm:py-16"
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
                <Sparkles className="h-7 w-7" style={{ color: b.accent }} />
              </div>
              <h2 className="text-[1.5rem] font-bold tracking-[-0.02em] text-gray-900 dark:text-white sm:text-[1.8rem]">
                Acesso antecipado aberto
              </h2>
              <p className="mx-auto mt-4 max-w-md text-[0.92rem] leading-7 text-gray-400 dark:text-gray-500">
                Estamos selecionando as primeiras operações para onboarding.
                Responda o quiz e garanta sua vaga.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
                <WaitlistStat value={<CountUp end={50} duration={2000} />} label="vagas disponíveis" />
                <div className="h-8 w-px" style={{ background: `rgba(${rgb},0.12)` }} />
                <WaitlistStat value={<CountUp end={0} duration={1000} prefix="R$" />} label="setup gratuito" />
                <div className="h-8 w-px" style={{ background: `rgba(${rgb},0.12)` }} />
                <WaitlistStat value={<CountUp end={5} duration={1500} suffix=" min" />} label="para integrar" />
              </div>

              <MagneticButton className="mt-10">
                <Link
                  href="/quiz"
                  className="group inline-flex items-center gap-2.5 rounded-xl px-8 py-3.5 text-[0.92rem] font-semibold text-white transition-all hover:brightness-110"
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
        <section className="relative mx-auto max-w-[82rem] px-6 py-24 sm:px-8 lg:px-10">
          <Reveal direction="up">
            <div className="text-center">
              <SectionEyebrow>Perguntas frequentes</SectionEyebrow>
              <h2 className="mt-4 text-balance text-[1.75rem] font-bold tracking-[-0.03em] text-gray-900 dark:text-white sm:text-[2.2rem]">
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
        <section className="relative mx-auto max-w-[82rem] px-6 py-24 sm:px-8 lg:px-10">
          <Reveal direction="up">
            <div className="text-center">
              <SectionEyebrow>Comparativo</SectionEyebrow>
              <h2 className="mt-4 text-balance text-[1.75rem] font-bold tracking-[-0.03em] text-gray-900 dark:text-white sm:text-[2.2rem]">
                Por que não fazer internamente?
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-[0.95rem] leading-7 text-gray-400 dark:text-gray-500">
                Compare o custo e resultado de cada abordagem.
              </p>
            </div>
          </Reveal>

          <Reveal direction="up" delay={100}>
            <div
              className="mx-auto mt-14 max-w-[56rem] overflow-hidden rounded-2xl"
              style={{
                border: "1px solid rgba(255,255,255,0.06)",
                background: `${cardBg},0.4)`,
              }}
            >
              {/* Table header */}
              <div className="grid grid-cols-4 border-b border-white/[0.04]">
                <div className="px-5 py-4">
                  <span className="text-[0.68rem] font-semibold text-gray-500">Critério</span>
                </div>
                <div className="border-l border-white/[0.04] px-5 py-4 text-center">
                  <span className="text-[0.68rem] font-semibold text-gray-500">Manual</span>
                </div>
                <div className="border-l border-white/[0.04] px-5 py-4 text-center">
                  <span className="text-[0.68rem] font-semibold text-gray-500">Gateway nativo</span>
                </div>
                <div className="border-l px-5 py-4 text-center" style={{ borderColor: `rgba(${rgb},0.12)`, background: `rgba(${rgb},0.04)` }}>
                  <span className="text-[0.68rem] font-bold" style={{ color: b.accent }}>{b.name}</span>
                </div>
              </div>

              {/* Table rows */}
              {[
                { label: "Tempo de resposta", manual: "Horas/dias", gateway: "~30 min", ours: "2 min" },
                { label: "Canal de contato", manual: "E-mail, telefone", gateway: "E-mail", ours: "WhatsApp + IA" },
                { label: "Personalização", manual: "Baixa", gateway: "Genérica", ours: "IA contextual" },
                { label: "Disponibilidade", manual: "Horário comercial", gateway: "24/7", ours: "24/7" },
                { label: "Escala", manual: "Limitada pela equipe", gateway: "Limitada", ours: "Infinita" },
                { label: "Taxa de recuperação", manual: "5-10%", gateway: "10-15%", ours: "35-40%" },
              ].map((row) => (
                <div key={row.label} className="grid grid-cols-4 border-b border-white/[0.03] last:border-b-0">
                  <div className="px-5 py-3.5">
                    <span className="text-[0.72rem] font-medium text-gray-300">{row.label}</span>
                  </div>
                  <div className="border-l border-white/[0.04] px-5 py-3.5 text-center">
                    <span className="text-[0.72rem] text-gray-500">{row.manual}</span>
                  </div>
                  <div className="border-l border-white/[0.04] px-5 py-3.5 text-center">
                    <span className="text-[0.72rem] text-gray-500">{row.gateway}</span>
                  </div>
                  <div className="border-l px-5 py-3.5 text-center" style={{ borderColor: `rgba(${rgb},0.12)`, background: `rgba(${rgb},0.03)` }}>
                    <span className="text-[0.72rem] font-semibold" style={{ color: b.accent }}>{row.ours}</span>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        <GlowDivider />

        {/* ═══════════════════════ INTEGRATION ═══════════════════════ */}
        <section className="relative mx-auto max-w-[82rem] px-6 py-24 sm:px-8 lg:px-10">
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

              <div className="relative grid gap-10 px-8 py-14 sm:px-12 sm:py-16 lg:grid-cols-2 lg:gap-16 lg:px-14">
                <div>
                  <SectionEyebrow>Integração em minutos</SectionEyebrow>
                  <h2 className="mt-4 max-w-[16ch] text-[1.75rem] font-bold tracking-[-0.03em] text-gray-900 dark:text-white sm:text-[2.2rem] sm:leading-[1.15]">
                    Conecte seu gateway e comece a recuperar
                  </h2>
                  <p className="mt-4 max-w-md text-[0.95rem] leading-7 text-gray-400 dark:text-gray-500">
                    Basta apontar o webhook do seu gateway para a {b.name}.
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
                  <IntegrationStep step="3" title="Ative a IA" description="Defina o tom, limites de tentativa e política de automação." />
                  <IntegrationStep step="4" title="Recupere automaticamente" description="A plataforma opera 24/7. Acompanhe tudo no dashboard." />
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ═══════════════════════ CTA FINAL ═══════════════════════ */}
        <section className="relative mx-auto max-w-[82rem] px-6 py-24 sm:px-8 lg:px-10">
          <Reveal direction="scale">
            <div
              className="relative overflow-hidden rounded-2xl px-8 py-16 text-center shadow-[0_40px_100px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:px-14 sm:py-24"
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
                  className="h-[28rem] w-[28rem] object-contain"
                  aria-hidden="true"
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
                <h2 className="text-balance text-[1.75rem] font-bold tracking-[-0.03em] text-gray-900 dark:text-white sm:text-[2.2rem] lg:text-[2.8rem]">
                  Pare de perder receita
                </h2>
                <p className="mx-auto mt-5 max-w-lg text-[1rem] leading-7 text-gray-400 dark:text-gray-500">
                  Cada minuto sem recuperação ativa é dinheiro na mesa.
                  Configure em minutos. Resultados no primeiro dia.
                </p>
                <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                  <MagneticButton>
                    <Link
                      href="/quiz"
                      className="group inline-flex items-center gap-2.5 rounded-xl px-8 py-3.5 text-[0.92rem] font-semibold text-white transition-all hover:brightness-110"
                      style={{
                        background: b.accent,
                        boxShadow: `0 12px 32px ${b.accentGlow}`,
                      }}
                    >
                      Começar gratuitamente
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </MagneticButton>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ═══════════════════════ FOOTER ═══════════════════════ */}
        <footer className="relative mx-auto max-w-[82rem] px-6 pb-10 pt-4 sm:px-8 lg:px-10">
          <div className="border-t border-gray-100 dark:border-gray-800 pt-12">
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              {/* Brand */}
              <div className="sm:col-span-2 lg:col-span-1">
                <div className="flex items-center gap-3">
                  <PlatformLogo mode="icon" size="sm" />
                  <p className="text-sm font-semibold text-gray-400">{b.name}</p>
                </div>
                <p className="mt-3 max-w-[18rem] text-[0.75rem] leading-[1.7] text-gray-500 dark:text-gray-600">
                  Plataforma de recuperação autônoma de pagamentos com IA e WhatsApp. Transforme falhas em receita.
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5" style={{ color: `rgba(${rgb},0.5)` }} />
                  <span className="text-[0.6rem] text-gray-500 dark:text-gray-600">LGPD Compliant • Dados criptografados</span>
                </div>
              </div>

              {/* Produto */}
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500">Produto</p>
                <ul className="mt-4 space-y-2.5">
                  <FooterLink href="#como-funciona">Como funciona</FooterLink>
                  <FooterLink href="/quiz">Funcionalidades</FooterLink>
                  <FooterLink href="/quiz">Integração</FooterLink>
                  <FooterLink href="/quiz">Calculadora</FooterLink>
                </ul>
              </div>

              {/* Empresa */}
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500">Empresa</p>
                <ul className="mt-4 space-y-2.5">
                  <FooterLink href="/quiz">Acesso antecipado</FooterLink>
                  <FooterLink href="mailto:contato@pagrecovery.com">Contato</FooterLink>
                  <FooterLink href="/quiz">Blog</FooterLink>
                </ul>
              </div>

              {/* Legal */}
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500">Legal</p>
                <ul className="mt-4 space-y-2.5">
                  <FooterLink href="/privacy">Política de Privacidade</FooterLink>
                  <FooterLink href="/terms">Termos de Uso</FooterLink>
                  <FooterLink href="/privacy">LGPD</FooterLink>
                  <FooterLink href="/privacy">Segurança dos Dados</FooterLink>
                </ul>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="mt-12 flex flex-col items-center gap-3 border-t border-gray-100 dark:border-gray-800 pt-6 sm:flex-row sm:justify-between">
              <p className="font-mono text-[0.52rem] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-600">
                &copy; {new Date().getFullYear()} {b.name} Tecnologia. Todos os direitos reservados.
              </p>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-[0.52rem] text-gray-400 dark:text-gray-600">
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
      className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.3em] opacity-70"
      style={{ color: b.accent }}
    >
      {children}
    </p>
  );
}

function LiveMetric({ value, label, icon: Icon }: { value: string; label: string; icon: LucideIcon }) {
  return (
    <div className="flex flex-col items-center gap-2 border-r border-gray-100 dark:border-gray-800 px-4 py-6 last:border-r-0 sm:py-7">
      <Icon className="h-4 w-4 opacity-40" style={{ color: b.accent }} />
      <p className="text-[1.5rem] font-bold tracking-tight text-gray-900 dark:text-white sm:text-[1.7rem]">{value}</p>
      <p className="font-mono text-[0.52rem] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-600">{label}</p>
    </div>
  );
}

function MarqueeItem({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex items-center gap-2 px-4 text-gray-400 dark:text-gray-500">
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
      className="card-hover-glow rounded-2xl px-7 py-8 text-center backdrop-blur-sm"
      style={{
        border: "1px solid rgba(255,255,255,0.05)",
        background: `${cardBg},0.5)`,
        ["--card-glow-rgb" as string]: rgb,
      }}
    >
      <p className="text-[2.8rem] font-bold leading-none tracking-tight" style={{ color: b.accent }}>
        {value}
      </p>
      <p className="mt-3 text-[0.88rem] font-semibold text-gray-700 dark:text-gray-200">{label}</p>
      <p className="mt-1.5 text-[0.72rem] text-gray-400 dark:text-gray-600">{sublabel}</p>
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
      className="card-hover-glow rounded-2xl px-7 py-8 text-center backdrop-blur-sm"
      style={{
        border: "1px solid rgba(255,255,255,0.05)",
        background: `${cardBg},0.45)`,
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
      <p className="mt-4 text-[2.2rem] font-bold leading-none tracking-tight" style={{ color: b.accent }}>
        {value}
      </p>
      <p className="mt-2 text-[0.78rem] leading-[1.6] text-gray-400 dark:text-gray-500">
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
        <span className="font-mono text-[0.65rem] font-bold tracking-wider text-gray-300 dark:text-gray-600">{number}</span>
      </div>
      <h3 className="mt-4 text-[0.88rem] font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
      <p className="mt-2 text-[0.78rem] leading-[1.7] text-gray-400 dark:text-gray-500">{description}</p>
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
      <h3 className="mt-3.5 text-[0.82rem] font-semibold text-gray-700 dark:text-gray-200">{title}</h3>
      <p className="mt-1.5 text-[0.75rem] leading-[1.7] text-gray-400 dark:text-gray-600">{description}</p>
    </div>
  );
}

function WaitlistStat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="text-center">
      <p className="text-[1.6rem] font-bold tracking-tight" style={{ color: b.accent }}>
        {value}
      </p>
      <p className="font-mono text-[0.52rem] uppercase tracking-[0.2em] text-gray-500 dark:text-gray-600">
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
      className="card-hover-glow rounded-2xl px-7 py-8 text-center backdrop-blur-sm"
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
      <p className="mt-3 text-[0.75rem] leading-[1.7] text-gray-400 dark:text-gray-600">{description}</p>
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
        className="text-[0.75rem] text-gray-500 dark:text-gray-600 transition-colors hover:text-gray-400 dark:hover:text-gray-400"
      >
        {children}
      </Component>
    </li>
  );
}

function IntegrationStep({ step, title, description }: { step: string; title: string; description: string }) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/[0.02] px-5 py-4 backdrop-blur-sm transition-all">
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
        <p className="text-[0.82rem] font-semibold text-gray-700 dark:text-gray-200">{title}</p>
        <p className="mt-1 text-[0.72rem] leading-5 text-gray-400 dark:text-gray-600">{description}</p>
      </div>
    </div>
  );
}
