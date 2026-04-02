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
  DollarSign,
  Headphones,
  Lock,
  MessageSquare,
  Phone,
  ShieldCheck,
  TrendingUp,
  Zap,
} from "lucide-react";

import { AdminAccessButton } from "@/components/landing/admin-access";
import { CountUp } from "@/components/landing/count-up";
import { HeroHeading } from "@/components/landing/hero-heading";
import { HeroParticles } from "@/components/landing/hero-particles";
import { MagneticButton } from "@/components/landing/magnetic-button";
import { Reveal } from "@/components/landing/scroll-reveal";
import { ScrollProgress } from "@/components/landing/scroll-progress";
import { TiltCard } from "@/components/landing/tilt-card";
import { PlatformLogo } from "@/components/platform/platform-logo";
import { platformBrand } from "@/lib/platform";

// Heavy below-fold components — lazy loaded
const LiveDemo = dynamic(() => import("@/components/landing/live-demo").then(m => ({ default: m.LiveDemo })));
const RecoveryCalculator = dynamic(() => import("@/components/landing/recovery-calculator").then(m => ({ default: m.RecoveryCalculator })));
const FaqSection = dynamic(() => import("@/components/landing/faq-section").then(m => ({ default: m.FaqSection })));
const DemoCallForm = dynamic(() => import("@/components/landing/demo-call-form").then(m => ({ default: m.DemoCallForm })));

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
        {/* ═══════════════════════ 1. HERO ═══════════════════════ */}
        <section className="relative mx-auto max-w-[82rem] px-4 pb-14 pt-2 sm:px-8 sm:pb-20 sm:pt-12 lg:px-10 lg:pt-16">
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

          <div className="relative z-10 mx-auto max-w-[48rem] text-center lg:mx-0 lg:text-left">
            <HeroHeading />

            <Reveal direction="up" delay={400}>
              <p className="mt-5 max-w-[36rem] text-[0.92rem] leading-[1.7] text-gray-400 sm:mt-7 sm:text-[1.05rem] sm:leading-[1.8] lg:mx-0">
                Recuperação autônoma de pagamentos falhados via WhatsApp e Call Center de IA.
                Sem equipe, sem custo fixo — você só paga quando recuperamos.
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
                    Começar agora
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

            {/* Inline metrics — single source of truth */}
            <Reveal direction="up" delay={600}>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-6 sm:mt-14 sm:gap-10 lg:justify-start">
                <HeroStat value={<><CountUp end={2} duration={1500} /> min</>} label="tempo de resposta" />
                <div className="hidden h-8 w-px sm:block" style={{ background: `rgba(${rgb},0.12)` }} />
                <HeroStat value={<><CountUp end={19} duration={1500} />–<CountUp end={40} suffix="%" duration={2200} /></>} label="taxa de recuperação" />
                <div className="hidden h-8 w-px sm:block" style={{ background: `rgba(${rgb},0.12)` }} />
                <HeroStat value={<CountUp end={24} suffix="/7" duration={1800} />} label="operação contínua" />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ═══════════════════════ 2. TRUST BAR ═══════════════════════ */}
        <section className="relative mx-auto max-w-[82rem] px-4 pb-12 sm:px-8 sm:pb-20 lg:px-10">
          <Reveal direction="up">
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 sm:gap-x-12">
              <TrustBadge icon={ShieldCheck} text="LGPD Compliant" />
              <TrustBadge icon={Lock} text="Dados criptografados" />
              <TrustBadge icon={MessageSquare} text="WhatsApp Business" />
              <TrustBadge icon={Headphones} text="Call Center IA" />
              <TrustBadge icon={BarChart3} text="Analytics em tempo real" />
            </div>
          </Reveal>
        </section>

        <GlowDivider />

        {/* ═══════════════════════ 3. COMO FUNCIONA ═══════════════════════ */}
        <section id="como-funciona" className="relative mx-auto max-w-[82rem] scroll-mt-8 px-4 py-16 sm:px-8 sm:py-24 lg:px-10">
          <Reveal direction="up">
            <div className="text-center">
              <SectionEyebrow>Como funciona</SectionEyebrow>
              <h2 className="mt-4 text-balance text-[1.5rem] font-bold tracking-[-0.03em] text-white sm:text-[1.75rem] lg:text-[2.2rem]">
                Da falha ao pagamento em 4 passos
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-[0.95rem] leading-7 text-gray-400">
                Tudo acontece automaticamente. Você só acompanha no dashboard.
              </p>
            </div>
          </Reveal>

          <div className="mx-auto mt-10 grid max-w-[60rem] gap-3 sm:mt-14 sm:gap-4 grid-cols-2 lg:grid-cols-4">
            {[
              { n: "01", icon: Zap, title: "Falha detectada", desc: "Webhook captura o evento em tempo real. A IA classifica valor, método e motivo." },
              { n: "02", icon: MessageSquare, title: "WhatsApp enviado", desc: "Mensagem personalizada com link de pagamento em menos de 2 minutos." },
              { n: "03", icon: Headphones, title: "Call Center IA", desc: "Sem resposta? Agente IA liga com voz natural, negocia e envia link na hora." },
              { n: "04", icon: TrendingUp, title: "Pagamento recuperado", desc: "Cliente paga via PIX, cartão ou boleto. Dashboard atualiza em tempo real." },
            ].map((s, i) => (
              <Reveal key={s.n} direction="up" delay={i * 100}>
                <TiltCard>
                  <StepCard number={s.n} icon={s.icon} title={s.title} description={s.desc} />
                </TiltCard>
              </Reveal>
            ))}
          </div>

          {/* Timeline compacta */}
          <Reveal direction="up" delay={400}>
            <div className="mx-auto mt-12 max-w-[56rem] overflow-x-auto sm:mt-16">
              <div
                className="min-w-[32rem] rounded-xl px-6 py-5"
                style={{
                  border: `1px solid rgba(${rgb},0.08)`,
                  background: `${cardBg},0.3)`,
                }}
              >
                <p className="mb-4 font-mono text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-gray-500">
                  Linha do tempo de uma recuperação
                </p>
                <div className="flex items-center justify-between">
                  {[
                    { time: "0s", label: "Falha" },
                    { time: "30s", label: "IA analisa" },
                    { time: "2min", label: "WhatsApp" },
                    { time: "4h", label: "Follow-up" },
                    { time: "12h", label: "Ligação IA" },
                    { time: "48h", label: "Escalonamento" },
                    { time: "7d", label: "Soft close" },
                  ].map((step, i, arr) => (
                    <div key={step.time} className="flex items-center">
                      <div className="text-center">
                        <p
                          className="text-[0.72rem] font-bold"
                          style={{ color: i <= 2 ? b.accent : "rgb(107,114,128)" }}
                        >
                          {step.time}
                        </p>
                        <p className="mt-0.5 text-[0.58rem] text-gray-500">
                          {step.label}
                        </p>
                      </div>
                      {i < arr.length - 1 && (
                        <div
                          className="mx-2 h-px flex-1 min-w-[1.5rem]"
                          style={{ background: `rgba(${rgb},${i < 2 ? "0.2" : "0.06"})` }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        <GlowDivider />

        {/* ═══════════════════════ 4. RESULTADOS ═══════════════════════ */}
        <section className="relative mx-auto max-w-[82rem] px-4 py-16 sm:px-8 sm:py-24 lg:px-10">
          <Reveal direction="up">
            <div className="text-center">
              <SectionEyebrow>Resultados</SectionEyebrow>
              <h2 className="mt-4 text-balance text-[1.5rem] font-bold tracking-[-0.03em] text-white sm:text-[1.75rem] lg:text-[2.2rem]">
                O que muda com recuperação autônoma
              </h2>
            </div>
          </Reveal>

          {/* Before / After compacto */}
          <div className="mx-auto mt-10 grid max-w-[52rem] gap-4 sm:mt-14 sm:grid-cols-2">
            <Reveal direction="left" delay={100}>
              <div
                className="rounded-xl px-5 py-6 sm:px-7 sm:py-8"
                style={{
                  border: "1px solid rgba(239,68,68,0.10)",
                  background: "rgba(239,68,68,0.03)",
                }}
              >
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-red-400/70">Sem recuperação</p>
                <ul className="mt-5 space-y-3">
                  <ComparisonItem negative text="62% dos pagamentos falhados são perdidos" />
                  <ComparisonItem negative text="Equipe descobre horas depois da falha" />
                  <ComparisonItem negative text="Cobranças manuais que não escalam" />
                  <ComparisonItem negative text="Zero visibilidade sobre o que falhou" />
                </ul>
              </div>
            </Reveal>

            <Reveal direction="right" delay={100}>
              <div
                className="rounded-xl px-5 py-6 sm:px-7 sm:py-8"
                style={{
                  border: `1px solid rgba(${rgb},0.12)`,
                  background: `rgba(${rgb},0.03)`,
                }}
              >
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em]" style={{ color: b.accent }}>
                  Com {b.name}
                </p>
                <ul className="mt-5 space-y-3">
                  <ComparisonItem text="Contato automático em menos de 2 minutos" />
                  <ComparisonItem text="IA escolhe canal, tom e momento ideal" />
                  <ComparisonItem text="Escala de 10 a 10.000 transações sem equipe" />
                  <ComparisonItem text="Dashboard com métricas em tempo real" />
                </ul>
              </div>
            </Reveal>
          </div>
        </section>

        <GlowDivider />

        {/* ═══════════════════════ 5. DEMO INTERATIVA ═══════════════════════ */}
        <div className="content-auto">
          <LiveDemo />
        </div>

        {/* ═══════════════════════ 6. CALL CENTER IA DEMO ═══════════════════════ */}
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

              <div className="relative grid gap-10 px-5 py-10 sm:px-12 sm:py-16 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:px-14">
                <div>
                  <SectionEyebrow>Teste ao vivo</SectionEyebrow>
                  <h2 className="mt-4 max-w-[18ch] text-[1.5rem] font-bold tracking-[-0.03em] text-white sm:text-[1.75rem] lg:text-[2.2rem] sm:leading-[1.15]">
                    Receba uma ligação da nossa IA agora
                  </h2>
                  <p className="mt-5 max-w-md text-[0.95rem] leading-7 text-gray-400">
                    A mesma tecnologia que recupera pagamentos dos seus clientes.
                    Voz natural, respostas em tempo real.
                  </p>

                  <div className="mt-8 space-y-4">
                    {[
                      { icon: Phone, title: "Chamada real em segundos", desc: "Preencha o formulário e receba uma ligação instantaneamente." },
                      { icon: Bot, title: "Voz natural e conversacional", desc: "A IA conversa, responde dúvidas e negocia como um humano." },
                      { icon: MessageSquare, title: "Mesmo fluxo dos clientes", desc: "Exatamente assim que contactamos clientes com pagamento falhado." },
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
                        <p className="text-[0.72rem] text-gray-500">Chamada gratuita de demonstração</p>
                      </div>
                    </div>

                    <DemoCallForm />
                  </div>

                  <p className="mt-4 text-center text-[0.68rem] leading-5 text-gray-600">
                    Ao solicitar, você concorda em receber uma chamada de demonstração.
                    Seus dados ficam seguros conforme LGPD.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        <GlowDivider />

        {/* ═══════════════════════ 7. CALCULADORA ═══════════════════════ */}
        <div id="calculadora" className="content-auto scroll-mt-8">
          <RecoveryCalculator />
        </div>

        <GlowDivider />

        {/* ═══════════════════════ 8. PRICING ═══════════════════════ */}
        <section id="precos" className="relative mx-auto max-w-[82rem] scroll-mt-8 px-4 py-16 sm:px-8 sm:py-24 lg:px-10">
          <Reveal direction="up">
            <div className="text-center">
              <SectionEyebrow>Modelo de negócio</SectionEyebrow>
              <h2 className="mt-4 text-balance text-[1.5rem] font-bold tracking-[-0.03em] text-white sm:text-[1.75rem] lg:text-[2.2rem]">
                Você só paga quando recuperamos
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-[0.95rem] leading-7 text-gray-400">
                Modelo 100% baseado em performance. Sem taxa fixa, sem contrato.
              </p>
            </div>
          </Reveal>

          <div className="mx-auto mt-14 grid max-w-[56rem] gap-4 sm:grid-cols-3">
            <Reveal direction="up" delay={0}>
              <TiltCard>
                <PricingCard
                  title="Integração"
                  price="R$0"
                  description="Setup, configuração e onboarding gratuitos."
                  icon={Zap}
                />
              </TiltCard>
            </Reveal>
            <Reveal direction="up" delay={120}>
              <TiltCard>
                <PricingCard
                  title="Mensalidade"
                  price="R$0"
                  description="Sem taxa fixa. Cancele quando quiser."
                  icon={Clock}
                />
              </TiltCard>
            </Reveal>
            <Reveal direction="up" delay={240}>
              <TiltCard>
                <PricingCard
                  title="Recovery fee"
                  price="% sobre recuperação"
                  description="Percentual definido no onboarding com base no seu volume. Sem resultado, sem custo."
                  icon={DollarSign}
                  highlighted
                />
              </TiltCard>
            </Reveal>
          </div>

          {/* Security strip */}
          <Reveal direction="up" delay={300}>
            <div className="mx-auto mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 sm:gap-x-10">
              <SecurityBadge icon={ShieldCheck} text="LGPD Compliant" />
              <SecurityBadge icon={Lock} text="Criptografia AES-256" />
              <SecurityBadge icon={CheckCircle2} text="Zero armazenamento de cartão" />
            </div>
          </Reveal>
        </section>

        <GlowDivider />

        {/* ═══════════════════════ 9. FAQ ═══════════════════════ */}
        <section className="relative mx-auto max-w-[82rem] px-4 py-16 sm:px-8 sm:py-24 lg:px-10">
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

        {/* ═══════════════════════ 10. CTA FINAL ═══════════════════════ */}
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
                  Comece a recuperar receita hoje
                </h2>
                <p className="mx-auto mt-5 max-w-lg text-[1rem] leading-7 text-gray-400">
                  Integração em minutos, sem equipe técnica. Acompanhe cada
                  recuperação no dashboard em tempo real.
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
                  Recuperação autônoma de pagamentos via IA, WhatsApp
                  e Call Center inteligente. 24/7.
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5" style={{ color: `rgba(${rgb},0.5)` }} />
                  <span className="text-[0.6rem] text-gray-500">LGPD Compliant</span>
                </div>
              </div>

              {/* Produto */}
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.15em] text-gray-400">Produto</p>
                <ul className="mt-4 space-y-2.5">
                  <FooterLink href="#como-funciona">Como funciona</FooterLink>
                  <FooterLink href="#calculadora">Calculadora</FooterLink>
                  <FooterLink href="#precos">Preços</FooterLink>
                  <FooterLink href="#demo-call">Demo Call Center</FooterLink>
                </ul>
              </div>

              {/* Empresa */}
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.15em] text-gray-400">Empresa</p>
                <ul className="mt-4 space-y-2.5">
                  <FooterLink href="/quiz">Solicitar acesso</FooterLink>
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

function HeroStat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="text-center">
      <p className="text-[1.4rem] font-bold tracking-tight sm:text-[1.8rem]" style={{ color: b.accent }}>
        {value}
      </p>
      <p className="mt-0.5 font-mono text-[0.5rem] uppercase tracking-[0.15em] text-gray-500 sm:text-[0.55rem]">
        {label}
      </p>
    </div>
  );
}

function TrustBadge({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex items-center gap-2 text-gray-400">
      <Icon className="h-3.5 w-3.5 opacity-40" style={{ color: b.accent }} />
      <span className="whitespace-nowrap text-[0.72rem] font-medium">
        {text}
      </span>
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

function ComparisonItem({ text, negative }: { text: string; negative?: boolean }) {
  return (
    <li className="flex items-start gap-3">
      {negative ? (
        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400/60" />
      ) : (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: b.accent }} />
      )}
      <span className={`text-[0.82rem] leading-[1.6] ${negative ? "text-red-300/70" : "text-gray-300"}`}>
        {text}
      </span>
    </li>
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

function SecurityBadge({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-3 w-3" style={{ color: `rgba(${rgb},0.4)` }} />
      <span className="text-[0.68rem] text-gray-500">{text}</span>
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
        className="text-[0.75rem] text-gray-500 transition-colors hover:text-gray-400"
      >
        {children}
      </Component>
    </li>
  );
}
