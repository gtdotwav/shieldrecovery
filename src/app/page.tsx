import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDown,
  ArrowRight,
  Bot,
  Clock,
  CreditCard,
  DollarSign,
  Headphones,
  LinkIcon,
  MessageSquare,
  Phone,
  TrendingUp,
  Zap,
} from "lucide-react";

import { CountUp } from "@/components/landing/count-up";
import { HeroHeading } from "@/components/landing/hero-heading";
import { HeroParticles } from "@/components/landing/hero-particles";
import { MagneticButton } from "@/components/landing/magnetic-button";
import { Reveal } from "@/components/landing/scroll-reveal";
import { ScrollProgress } from "@/components/landing/scroll-progress";
import { PlatformLogo } from "@/components/platform/platform-logo";
import { platformBrand } from "@/lib/platform";

// New landing components (created by parallel agent)
import { TrustBadges } from "@/components/landing/trust-badges";
import { ComparisonTable } from "@/components/landing/comparison-table";
import { SocialProof } from "@/components/landing/social-proof";
import { OnboardingSteps } from "@/components/landing/onboarding-steps";
import { SecuritySection } from "@/components/landing/security-section";

// Heavy below-fold components — lazy loaded
const LiveDemo = dynamic(() =>
  import("@/components/landing/live-demo").then((m) => ({ default: m.LiveDemo }))
);
const RecoveryCalculator = dynamic(() =>
  import("@/components/landing/recovery-calculator").then((m) => ({
    default: m.RecoveryCalculator,
  }))
);
const FaqSection = dynamic(() =>
  import("@/components/landing/faq-section").then((m) => ({
    default: m.FaqSection,
  }))
);
const DemoCallForm = dynamic(() =>
  import("@/components/landing/demo-call-form").then((m) => ({
    default: m.DemoCallForm,
  }))
);

export const revalidate = 60;

// ── Brand-derived tokens ──
const b = platformBrand;
const rgb = b.accentRgb;
const cardBg = `rgba(${b.slug === "pagrecovery" ? "6,20,15" : "13,13,13"}`;

export default async function Home() {
  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ background: b.bgDark }}
    >
      <ScrollProgress />

      {/* ═══ Background ═══ */}
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
      <nav
        className="relative z-30 mx-auto flex max-w-[82rem] items-center justify-between px-4 py-3 sm:px-8 sm:py-5 lg:px-10"
        aria-label="Navegação principal"
      >
        <Image
          src={b.logo}
          alt={`${b.name} — plataforma de recuperação de pagamentos`}
          width={176}
          height={176}
          sizes="(min-width: 640px) 176px, 96px"
          quality={80}
          className="h-[5rem] w-auto object-contain sm:h-[8rem] lg:h-[11rem]"
          style={{ filter: `drop-shadow(0 8px 24px rgba(${rgb},0.12))` }}
          priority
        />
        <div className="flex items-center gap-2 sm:gap-3">
          <MagneticButton>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white transition-all focus-visible:ring-2 sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm"
              style={{
                background: b.accent,
                boxShadow: `0 12px 32px ${b.accentGlow}`,
              }}
            >
              <span className="hidden sm:inline">Começar gratuitamente</span>
              <span className="sm:hidden">Acessar</span>
              <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Link>
          </MagneticButton>
        </div>
      </nav>

      <main className="relative z-10">
        {/* ═══════════════════════ 1. HERO ═══════════════════════ */}
        <section className="relative mx-auto max-w-[82rem] px-4 pb-14 pt-2 sm:px-8 sm:pb-20 sm:pt-12 lg:px-10 lg:pt-16">
          <div className="pointer-events-none absolute inset-0 z-0">
            <HeroParticles />
          </div>

          <div className="pointer-events-none absolute right-[-2rem] top-[-4rem] z-0 hidden opacity-[0.018] lg:block">
            <Image
              src={b.mark}
              alt={`${b.name} marca decorativa`}
              width={672}
              height={672}
              sizes="672px"
              quality={80}
              className="h-[42rem] w-[42rem] object-contain"
              aria-hidden="true"
              loading="lazy"
            />
          </div>

          <div className="relative z-10 mx-auto max-w-[48rem] text-center lg:mx-0 lg:text-left">
            <HeroHeading />

            <Reveal direction="up" delay={400}>
              <p className="mt-5 max-w-[36rem] text-sm leading-[1.7] text-[var(--text-secondary)] sm:mt-7 sm:text-base sm:leading-[1.8] lg:mx-0">
                IA que detecta, contata e converte — em menos de 2 minutos.
                24/7, sem equipe, sem custo fixo.
              </p>
            </Reveal>

            {/* Stats row */}
            <Reveal direction="up" delay={500}>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-6 sm:mt-14 sm:gap-10 lg:justify-start">
                <HeroStat
                  value={
                    <>
                      {"< "}
                      <CountUp end={2} duration={1500} /> min
                    </>
                  }
                  label="Tempo de resposta"
                />
                <div
                  className="hidden h-8 w-px sm:block"
                  style={{ background: `rgba(${rgb},0.12)` }}
                />
                <HeroStat
                  value={
                    <>
                      ~<CountUp end={40} suffix="%" duration={2200} />
                    </>
                  }
                  label="Taxa de recuperação (vs 5% do mercado)"
                />
                <div
                  className="hidden h-8 w-px sm:block"
                  style={{ background: `rgba(${rgb},0.12)` }}
                />
                <HeroStat
                  value="R$ 0"
                  label="Custo fixo mensal"
                />
              </div>
            </Reveal>

            {/* CTA buttons */}
            <Reveal direction="up" delay={600}>
              <div className="mt-7 flex flex-col items-center gap-3 sm:mt-10 sm:flex-row sm:gap-4 lg:justify-start">
                <MagneticButton>
                  <Link
                    href="/login"
                    className="group inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all hover:brightness-110 focus-visible:ring-2 sm:gap-2.5 sm:px-8 sm:py-3.5 sm:text-base"
                    style={{
                      background: b.accent,
                      boxShadow: `0 12px 32px ${b.accentGlow}`,
                    }}
                  >
                    Começar gratuitamente
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </MagneticButton>
                <a
                  href="#demo"
                  className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-6 py-3 text-sm font-medium text-[var(--text-secondary)] backdrop-blur-sm transition-all hover:border-white/[0.14] hover:text-gray-200 focus-visible:ring-2 sm:px-8 sm:py-3.5 sm:text-base"
                >
                  Ver como funciona
                  <ArrowDown className="h-4 w-4" />
                </a>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ═══════════════════════ 2. TRUST BADGES ═══════════════════════ */}
        <section className="relative mx-auto max-w-[82rem] px-4 py-20 sm:px-8 md:py-28 lg:px-10">
          <TrustBadges />
        </section>

        <GlowDivider />

        {/* ═══════════════════════ 3. COMO FUNCIONA ═══════════════════════ */}
        <section
          id="como-funciona"
          className="relative mx-auto max-w-[82rem] scroll-mt-8 px-4 py-20 sm:px-8 md:py-28 lg:px-10"
        >
          <Reveal direction="up">
            <div className="text-center">
              <SectionEyebrow>Como funciona</SectionEyebrow>
              <h2 className="mt-4 text-balance text-[1.5rem] font-bold tracking-[-0.03em] text-white sm:text-[1.75rem] lg:text-[2.2rem]">
                Da falha ao pagamento em 4 passos
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-[var(--text-secondary)]">
                Tudo acontece automaticamente, sem intervenção humana.
              </p>
            </div>
          </Reveal>

          {/* 4 Steps */}
          <div className="mx-auto mt-12 grid max-w-[60rem] gap-4 sm:mt-16 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Zap,
                step: "01",
                title: "Falha detectada",
                description:
                  "Gateway envia webhook, IA processa em segundos.",
              },
              {
                icon: MessageSquare,
                step: "02",
                title: "Cliente contatado",
                description:
                  "Mensagem personalizada via WhatsApp em menos de 2 minutos.",
              },
              {
                icon: LinkIcon,
                step: "03",
                title: "Link enviado",
                description:
                  "Checkout otimizado com PIX, cartão e boleto.",
              },
              {
                icon: CreditCard,
                step: "04",
                title: "Pagamento recuperado",
                description:
                  "Dinheiro de volta, relatório atualizado em tempo real.",
              },
            ].map((item, i) => (
              <Reveal key={item.step} direction="up" delay={i * 120}>
                <div
                  className="card-hover-glow rounded-xl px-5 py-6 sm:px-6 sm:py-8"
                  style={{
                    border: `1px solid rgba(${rgb},0.08)`,
                    background: `${cardBg},0.3)`,
                    ["--card-glow-rgb" as string]: rgb,
                  }}
                >
                  <div
                    className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{
                      border: `1px solid rgba(${rgb},0.12)`,
                      background: `rgba(${rgb},0.06)`,
                    }}
                  >
                    <item.icon
                      className="h-4 w-4"
                      style={{ color: b.accent }}
                    />
                  </div>
                  <p
                    className="font-mono text-xs font-semibold uppercase tracking-[0.15em]"
                    style={{ color: b.accent }}
                  >
                    {item.step}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {item.title}
                  </p>
                  <p className="mt-2 text-sm leading-[1.6] text-[var(--text-secondary)]">
                    {item.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <GlowDivider />

        {/* ═══════════════════════ 4. COMPARISON TABLE ═══════════════════════ */}
        <section className="relative mx-auto max-w-[82rem] px-4 py-20 sm:px-8 md:py-28 lg:px-10">
          <ComparisonTable />
        </section>

        <GlowDivider />

        {/* ═══════════════════════ 5. SOCIAL PROOF ═══════════════════════ */}
        <section className="relative mx-auto max-w-[82rem] px-4 py-20 sm:px-8 md:py-28 lg:px-10">
          <SocialProof />
        </section>

        <GlowDivider />

        {/* ═══════════════════════ 6. DEMO INTERATIVA ═══════════════════════ */}
        <div id="demo" className="content-auto scroll-mt-8">
          <LiveDemo />
        </div>

        <GlowDivider />

        {/* ═══════════════════════ 7. CALCULADORA ═══════════════════════ */}
        <div id="calculadora" className="content-auto scroll-mt-8">
          <RecoveryCalculator />
        </div>

        <GlowDivider />

        {/* ═══════════════════════ 8. ONBOARDING STEPS ═══════════════════════ */}
        <section className="relative mx-auto max-w-[82rem] px-4 py-20 sm:px-8 md:py-28 lg:px-10">
          <OnboardingSteps />
        </section>

        <GlowDivider />

        {/* ═══════════════════════ 9. PRICING ═══════════════════════ */}
        <section
          id="precos"
          className="relative mx-auto max-w-[82rem] scroll-mt-8 px-4 py-20 sm:px-8 md:py-28 lg:px-10"
        >
          <Reveal direction="up">
            <div className="text-center">
              <SectionEyebrow>Modelo de negócio</SectionEyebrow>
              <h2 className="mt-4 text-balance text-[1.5rem] font-bold tracking-[-0.03em] text-white sm:text-[1.75rem] lg:text-[2.2rem]">
                Você só paga quando recuperamos
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-[var(--text-secondary)]">
                Modelo 100% baseado em performance. Sem taxa fixa, sem contrato.
              </p>
            </div>
          </Reveal>

          <div className="mx-auto mt-14 grid max-w-[56rem] gap-4 sm:grid-cols-3">
            <Reveal direction="up" delay={0}>
              <PricingCard
                title="Integração"
                price="R$0"
                description="Setup, configuração e onboarding gratuitos."
                icon={Zap}
              />
            </Reveal>
            <Reveal direction="up" delay={120}>
              <PricingCard
                title="Mensalidade"
                price="R$0"
                description="Sem taxa fixa. Cancele quando quiser."
                icon={Clock}
              />
            </Reveal>
            <Reveal direction="up" delay={240}>
              <PricingCard
                title="Recovery fee"
                price="% sobre recuperação"
                description="Percentual definido no onboarding com base no seu volume. Sem resultado, sem custo."
                icon={DollarSign}
                highlighted
              />
            </Reveal>
          </div>

          {/* Concrete example */}
          <Reveal direction="up" delay={360}>
            <div className="mx-auto mt-8 max-w-[36rem] text-center">
              <p
                className="rounded-xl px-6 py-4 text-sm leading-relaxed"
                style={{
                  border: `1px solid rgba(${rgb},0.10)`,
                  background: `rgba(${rgb},0.03)`,
                  color: "var(--text-secondary)",
                }}
              >
                <strong className="text-white">Exemplo:</strong> recuperamos
                R$10.000 → sua comissão é R$1.500 (15%)
              </p>
            </div>
          </Reveal>

          {/* Unified CTA */}
          <Reveal direction="up" delay={400}>
            <div className="mt-10 flex justify-center">
              <MagneticButton>
                <Link
                  href="/login"
                  className="group inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all hover:brightness-110 focus-visible:ring-2 sm:gap-2.5 sm:px-8 sm:py-3.5 sm:text-base"
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
          </Reveal>
        </section>

        <GlowDivider />

        {/* ═══════════════════════ 10. SECURITY ═══════════════════════ */}
        <section className="relative mx-auto max-w-[82rem] px-4 py-20 sm:px-8 md:py-28 lg:px-10">
          <SecuritySection />
        </section>

        <GlowDivider />

        {/* ═══════════════════════ 11. FAQ ═══════════════════════ */}
        <section className="relative mx-auto max-w-[82rem] px-4 py-20 sm:px-8 md:py-28 lg:px-10">
          <Reveal direction="up">
            <div className="text-center">
              <SectionEyebrow>Perguntas frequentes</SectionEyebrow>
              <h2 className="mt-4 text-balance text-[1.5rem] font-bold tracking-[-0.03em] text-white sm:text-[1.75rem] lg:text-[2.2rem]">
                Tire suas dúvidas
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

        {/* ═══════════════════════ 12. DEMO CALL ═══════════════════════ */}
        <section
          id="demo-call"
          className="relative mx-auto max-w-[82rem] scroll-mt-8 px-4 py-20 sm:px-8 md:py-28 lg:px-10"
        >
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
                style={{
                  background: `radial-gradient(ellipse at top right, rgba(${rgb},0.06), transparent 50%)`,
                }}
              />

              <div className="relative grid gap-10 px-5 py-10 sm:px-12 sm:py-16 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:px-14">
                <div>
                  <SectionEyebrow>Teste ao vivo</SectionEyebrow>
                  <h2 className="mt-4 max-w-[18ch] text-[1.5rem] font-bold tracking-[-0.03em] text-white sm:text-[1.75rem] sm:leading-[1.15] lg:text-[2.2rem]">
                    Receba uma ligação da nossa IA agora
                  </h2>
                  <p className="mt-5 max-w-md text-sm leading-7 text-[var(--text-secondary)]">
                    A mesma tecnologia que recupera pagamentos dos seus clientes.
                    Voz natural, respostas em tempo real.
                  </p>

                  <div className="mt-8 space-y-4">
                    {[
                      {
                        icon: Phone,
                        title: "Chamada real em segundos",
                        desc: "Preencha o formulário e receba uma ligação instantaneamente.",
                      },
                      {
                        icon: Bot,
                        title: "Voz natural e conversacional",
                        desc: "A IA conversa, responde dúvidas e negocia como um humano.",
                      },
                      {
                        icon: MessageSquare,
                        title: "Mesmo fluxo dos clientes",
                        desc: "Exatamente assim que contactamos clientes com pagamento falhado.",
                      },
                    ].map((item) => (
                      <div key={item.title} className="flex gap-4">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                          style={{
                            border: `1px solid rgba(${rgb},0.12)`,
                            background: `rgba(${rgb},0.06)`,
                          }}
                        >
                          <item.icon
                            className="h-4 w-4"
                            style={{ color: b.accent }}
                            aria-hidden="true"
                          />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-200">
                            {item.title}
                          </p>
                          <p className="mt-1 text-sm leading-[1.7] text-[var(--text-tertiary)]">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

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
                        <Headphones
                          className="h-5 w-5"
                          style={{ color: b.accent }}
                          aria-hidden="true"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">
                          Teste o Call Center IA
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)]">
                          Chamada gratuita de demonstração
                        </p>
                      </div>
                    </div>

                    <DemoCallForm />
                  </div>

                  <p className="mt-4 text-center text-xs leading-5 text-[var(--text-muted)]">
                    Ao solicitar, você concorda em receber uma chamada de demonstração.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ═══════════════════════ CTA FINAL ═══════════════════════ */}
        <section className="relative mx-auto max-w-[82rem] px-4 py-20 sm:px-8 md:py-28 lg:px-10">
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
                  alt={`${b.name} marca decorativa`}
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
                  <TrendingUp
                    className="h-6 w-6"
                    style={{ color: b.accent }}
                    aria-hidden="true"
                  />
                </div>
                <h2 className="text-balance text-[1.5rem] font-bold tracking-[-0.03em] text-white sm:text-[2rem] lg:text-[2.8rem]">
                  Comece a recuperar receita hoje
                </h2>
                <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-[var(--text-secondary)]">
                  Integração em minutos. Conecte, acompanhe e recupere — sem mudar
                  sua operação.
                </p>
                <div className="mt-7 flex flex-col items-center gap-3 sm:mt-10 sm:flex-row sm:justify-center">
                  <MagneticButton>
                    <Link
                      href="/login"
                      className="group inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all hover:brightness-110 focus-visible:ring-2 sm:gap-2.5 sm:px-8 sm:py-3.5 sm:text-base"
                      style={{
                        background: b.accent,
                        boxShadow: `0 12px 32px ${b.accentGlow}`,
                      }}
                    >
                      Começar gratuitamente
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </MagneticButton>
                  <a
                    href="#demo-call"
                    className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-6 py-3 text-sm font-medium text-[var(--text-secondary)] backdrop-blur-sm transition-all hover:border-white/[0.14] hover:text-gray-200 focus-visible:ring-2 sm:px-8 sm:py-3.5 sm:text-base"
                  >
                    Falar com especialista
                  </a>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ═══════════════════════ 13. FOOTER ═══════════════════════ */}
        <footer className="relative mx-auto max-w-[82rem] px-4 pb-10 pt-4 sm:px-8 lg:px-10">
          <div className="border-t border-white/[0.06] pt-12">
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              {/* Brand */}
              <div className="sm:col-span-2 lg:col-span-1">
                <div className="flex items-center gap-3">
                  <PlatformLogo mode="icon" size="sm" />
                  <p className="text-sm font-semibold text-[var(--text-secondary)]">
                    {b.name}
                  </p>
                </div>
                <p className="mt-3 max-w-[18rem] text-sm leading-[1.7] text-[var(--text-tertiary)]">
                  Plugue seu gateway e recupere pagamentos perdidos via WhatsApp
                  e Call Center de IA. 24/7.
                </p>
              </div>

              {/* Produto */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-secondary)]">
                  Produto
                </p>
                <ul className="mt-4 space-y-2.5">
                  <FooterLink href="#como-funciona">Como funciona</FooterLink>
                  <FooterLink href="#calculadora">Calculadora</FooterLink>
                  <FooterLink href="#precos">Preços</FooterLink>
                  <FooterLink href="#demo-call">Demo Call Center</FooterLink>
                </ul>
              </div>

              {/* Empresa */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-secondary)]">
                  Empresa
                </p>
                <ul className="mt-4 space-y-2.5">
                  <FooterLink href="/login">Solicitar acesso</FooterLink>
                  <FooterLink href={`mailto:${b.contactEmail}`}>
                    Contato
                  </FooterLink>
                </ul>
              </div>

              {/* Legal */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-secondary)]">
                  Legal
                </p>
                <ul className="mt-4 space-y-2.5">
                  <FooterLink href="/privacy">
                    Política de Privacidade
                  </FooterLink>
                  <FooterLink href="/terms">Termos de Uso</FooterLink>
                </ul>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="mt-12 flex flex-col items-center gap-3 border-t border-white/[0.06] pt-6 sm:flex-row sm:justify-between">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                &copy; {new Date().getFullYear()} {b.name} Tecnologia. Todos os
                direitos reservados.
              </p>
              <div className="flex items-center gap-4">
                <Link
                  href="/privacy"
                  className="text-xs text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-secondary)]"
                >
                  Privacidade
                </Link>
                <Link
                  href="/terms"
                  className="text-xs text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-secondary)]"
                >
                  Termos
                </Link>
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
      className="font-mono text-xs font-semibold uppercase tracking-[0.2em] sm:tracking-[0.3em]"
      style={{ color: b.accent }}
    >
      {children}
    </p>
  );
}

function HeroStat({
  value,
  label,
}: {
  value: React.ReactNode;
  label: string;
}) {
  return (
    <div className="text-center">
      <p
        className="text-[1.4rem] font-bold tracking-tight sm:text-[1.8rem]"
        style={{ color: b.accent }}
      >
        {value}
      </p>
      <p className="mt-0.5 max-w-[10rem] font-mono text-xs uppercase tracking-[0.15em] text-[var(--text-tertiary)]">
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
      className="card-hover-glow rounded-xl px-5 py-6 text-center backdrop-blur-sm transition-shadow hover:shadow-lg sm:rounded-2xl sm:px-7 sm:py-8"
      style={{
        border: highlighted
          ? `1px solid rgba(${rgb},0.15)`
          : "1px solid rgba(255,255,255,0.05)",
        background: highlighted ? `rgba(${rgb},0.04)` : `${cardBg},0.5)`,
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
        <Icon className="h-4 w-4" style={{ color: b.accent }} aria-hidden="true" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
        {title}
      </p>
      <p
        className="mt-2 text-[1.6rem] font-bold leading-none tracking-tight"
        style={{ color: highlighted ? b.accent : undefined }}
      >
        <span className={highlighted ? "" : "text-white"}>{price}</span>
      </p>
      <p className="mt-3 text-sm leading-[1.7] text-[var(--text-secondary)]">
        {description}
      </p>
    </div>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const isExternal = href.startsWith("mailto:") || href.startsWith("http");
  const Component = isExternal ? "a" : Link;
  return (
    <li>
      <Component
        href={href}
        className="text-sm text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-secondary)]"
      >
        {children}
      </Component>
    </li>
  );
}
