import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  Clock,
  CreditCard,
  Layers,
  LineChart,
  MessageSquare,
  QrCode,
  Shield,
  Smartphone,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

import { LiveDemo } from "@/components/landing/live-demo";
import { RecoveryCalculator } from "@/components/landing/recovery-calculator";
import { PlatformLogo } from "@/components/platform/platform-logo";
import { formatCurrency } from "@/lib/format";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";

export const dynamic = "force-dynamic";

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
  const recoveryRate =
    analytics.total_failed_payments > 0
      ? ((analytics.recovered_payments / analytics.total_failed_payments) * 100).toFixed(1)
      : "0";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030a07]">
      {/* ═══ Background layers ═══ */}
      {/* Base gradient */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -10%, rgba(30,215,96,0.12), transparent 60%),
            radial-gradient(ellipse 60% 40% at 80% 60%, rgba(15,164,122,0.06), transparent 50%),
            radial-gradient(ellipse 50% 50% at 10% 90%, rgba(30,215,96,0.04), transparent 50%),
            linear-gradient(180deg, #030a07 0%, #041510 40%, #051a13 100%)
          `,
        }}
      />
      {/* Grid pattern */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(30,215,96,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(30,215,96,0.3) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, black, transparent 80%)",
        }}
      />
      {/* Noise texture */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.03] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      {/* Floating orbs */}
      <div className="pointer-events-none fixed left-[-10%] top-[-8%] z-0 h-[600px] w-[600px] rounded-full bg-[rgba(30,215,96,0.07)] blur-[120px]" />
      <div className="pointer-events-none fixed right-[-8%] top-[30%] z-0 h-[500px] w-[500px] rounded-full bg-[rgba(15,164,122,0.05)] blur-[100px]" />
      <div className="pointer-events-none fixed bottom-[-10%] left-[30%] z-0 h-[400px] w-[400px] rounded-full bg-[rgba(30,215,96,0.04)] blur-[100px]" />

      {/* ═══ Navigation ═══ */}
      <nav className="relative z-30 mx-auto flex max-w-[82rem] items-center justify-between px-6 py-5 sm:px-8 lg:px-10">
        <Image
          src="/brand/pagrecovery-logo.png"
          alt="PagRecovery"
          width={1600}
          height={1600}
          className="h-[8rem] w-auto object-contain drop-shadow-[0_8px_24px_rgba(30,215,96,0.12)] sm:h-[11rem]"
          priority
        />
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white/70 backdrop-blur-md transition-all hover:border-[rgba(30,215,96,0.2)] hover:bg-white/[0.07] hover:text-white max-sm:hidden"
          >
            Entrar
          </Link>
          <Link
            href="/dashboard"
            className="glass-button-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold"
          >
            Abrir plataforma
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </nav>

      <main className="relative z-10">
        {/* ═══════════════════════ HERO ═══════════════════════ */}
        <section className="relative mx-auto max-w-[82rem] px-6 pb-20 pt-6 sm:px-8 sm:pt-12 lg:px-10 lg:pt-16">
          {/* Decorative P watermark */}
          <div className="pointer-events-none absolute right-[-2rem] top-[-4rem] z-0 hidden opacity-[0.018] lg:block">
            <Image
              src="/brand/pagrecovery-mark.png"
              alt=""
              width={800}
              height={800}
              className="h-[42rem] w-[42rem] object-contain"
              aria-hidden="true"
            />
          </div>

          <div className="relative z-10 mx-auto max-w-[48rem] text-center">
            {/* Status pill */}
            <div className="inline-flex items-center gap-2.5 rounded-full border border-[rgba(30,215,96,0.15)] bg-[rgba(30,215,96,0.04)] px-5 py-2 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)] shadow-[0_0_8px_rgba(30,215,96,0.6)]" />
              </span>
              <span className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]/80">
                Recuperação autônoma com IA
              </span>
            </div>

            <h1 className="mt-10 text-balance text-[2.5rem] font-bold leading-[1.1] tracking-[-0.03em] text-white sm:text-[3.5rem] lg:text-[4.2rem]">
              Transforme pagamentos{" "}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-[#1ed760] via-[#2aed72] to-[#0fa47a] bg-clip-text text-transparent">
                  falhados em receita
                </span>
                <span className="absolute -bottom-1.5 left-0 h-[2px] w-full bg-gradient-to-r from-[var(--accent)]/60 via-[var(--accent)]/20 to-transparent" />
              </span>
            </h1>

            <p className="mx-auto mt-7 max-w-[36rem] text-[1.05rem] leading-[1.8] text-white/50 sm:text-[1.1rem]">
              Plataforma inteligente que detecta falhas em tempo real, aciona o
              cliente via WhatsApp com IA personalizada e recupera a venda
              automaticamente.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/dashboard"
                className="glass-button-primary group inline-flex items-center gap-2.5 px-8 py-3.5 text-[0.92rem] font-semibold shadow-[0_12px_32px_rgba(30,215,96,0.2)]"
              >
                Acessar plataforma
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-8 py-3.5 text-[0.92rem] font-medium text-white/60 backdrop-blur-sm transition-all hover:border-white/14 hover:text-white/80"
              >
                Como funciona
              </Link>
            </div>
          </div>

          {/* ─── Live metrics ─── */}
          <div className="relative z-10 mx-auto mt-20 max-w-[60rem]">
            <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[rgba(6,20,15,0.6)] shadow-[0_24px_64px_rgba(0,0,0,0.4)] backdrop-blur-xl">
              <div className="grid grid-cols-2 sm:grid-cols-4">
                <LiveMetric
                  value={analytics.total_failed_payments.toString()}
                  label="Eventos capturados"
                  icon={Zap}
                />
                <LiveMetric
                  value={analytics.active_recoveries.toString()}
                  label="Em recuperação"
                  icon={Clock}
                />
                <LiveMetric
                  value={analytics.recovered_payments.toString()}
                  label="Recuperados"
                  icon={CheckCircle2}
                />
                <LiveMetric
                  value={formatCurrency(portfolioValue)}
                  label="Carteira ativa"
                  icon={TrendingUp}
                />
              </div>
              <div className="flex items-center justify-center gap-2 border-t border-white/[0.04] py-3">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-40" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                </span>
                <p className="font-mono text-[0.55rem] uppercase tracking-[0.24em] text-white/25">
                  dados ao vivo da operação
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════ TRUST BAR ═══════════════════════ */}
        <section className="relative mx-auto max-w-[82rem] px-6 pb-24 sm:px-8 lg:px-10">
          <div className="mx-auto flex max-w-[56rem] flex-wrap items-center justify-center gap-x-10 gap-y-5 border-y border-white/[0.04] py-6">
            <ProofItem icon={Shield} text="HMAC-SHA256" />
            <ProofItem icon={QrCode} text="PIX, Cartão, Boleto" />
            <ProofItem icon={Bot} text="GPT-4.1 IA" />
            <ProofItem icon={Smartphone} text="WhatsApp Nativo" />
            <ProofItem icon={Layers} text="Multi-tenant" />
          </div>
        </section>

        {/* ═══════════════════════ HOW IT WORKS ═══════════════════════ */}
        <section className="relative mx-auto max-w-[82rem] px-6 py-24 sm:px-8 lg:px-10">
          <div className="text-center">
            <SectionEyebrow>Como funciona</SectionEyebrow>
            <h2 className="mt-4 text-balance text-[1.75rem] font-bold tracking-[-0.03em] text-white sm:text-[2.2rem]">
              Da falha à recuperação em minutos
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[0.95rem] leading-7 text-white/40">
              Quatro etapas automatizadas. Zero intervenção manual.
            </p>
          </div>

          <div className="mx-auto mt-14 grid max-w-[60rem] gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StepCard number="01" icon={Zap} title="Webhook detecta" description="Falha de pagamento capturada via webhook do gateway em tempo real." />
            <StepCard number="02" icon={Bot} title="IA personaliza" description="Analisa valor, método, histórico e define tom e momento ideal." />
            <StepCard number="03" icon={MessageSquare} title="WhatsApp contata" description="Mensagem humanizada com link de pagamento direto ao cliente." />
            <StepCard number="04" icon={TrendingUp} title="Receita recuperada" description="Cliente paga, status atualiza. Dashboard reflete em tempo real." />
          </div>
        </section>

        {/* ═══════════════════════ LIVE DEMO ═══════════════════════ */}
        <LiveDemo />

        {/* ═══════════════════════ CALCULATOR ═══════════════════════ */}
        <RecoveryCalculator />

        {/* ═══════════════════════ FEATURES ═══════════════════════ */}
        <section className="relative mx-auto max-w-[82rem] px-6 py-24 sm:px-8 lg:px-10">
          <div className="grid items-start gap-16 lg:grid-cols-[1fr_1.25fr]">
            {/* Left */}
            <div className="lg:sticky lg:top-24">
              <SectionEyebrow>Plataforma completa</SectionEyebrow>
              <h2 className="mt-4 max-w-[16ch] text-[1.75rem] font-bold tracking-[-0.03em] text-white sm:text-[2.2rem] sm:leading-[1.15]">
                Tudo que sua operação precisa em um lugar
              </h2>
              <p className="mt-5 max-w-md text-[0.95rem] leading-7 text-white/40">
                CRM, inbox, automações e analytics — integrados em um ecossistema
                focado em recuperação de pagamentos.
              </p>
              <div className="mt-8">
                <Link
                  href="/dashboard"
                  className="glass-button-primary group inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold"
                >
                  Explorar plataforma
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>

              {/* Recovery rate */}
              <div className="mt-10 inline-flex items-end gap-3 overflow-hidden rounded-xl border border-white/[0.06] bg-[rgba(6,20,15,0.5)] px-6 py-5 backdrop-blur-sm">
                <div>
                  <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-white/30">
                    Taxa de recuperação
                  </p>
                  <p className="mt-1.5 text-[2.2rem] font-bold leading-none tracking-tight text-[var(--accent)]">
                    {recoveryRate}%
                  </p>
                </div>
                <LineChart className="mb-1 h-7 w-7 text-[var(--accent)]/30" />
              </div>
            </div>

            {/* Right — grid */}
            <div className="grid gap-3 sm:grid-cols-2">
              <FeatureCard icon={Bot} title="IA conversacional" description="Mensagens com contexto: valor, método, histórico e tom personalizado." />
              <FeatureCard icon={MessageSquare} title="WhatsApp nativo" description="Envio, recebimento e respostas automáticas em tempo real." />
              <FeatureCard icon={BarChart3} title="Dashboard analítico" description="KPIs ao vivo: taxa, receita salva, tempo médio e performance." />
              <FeatureCard icon={Clock} title="Follow-up automático" description="Sequências inteligentes com delay configurável." />
              <FeatureCard icon={Shield} title="Segurança enterprise" description="HMAC-SHA256, RLS por tenant, rate limiting." />
              <FeatureCard icon={CreditCard} title="Checkout integrado" description="PIX, cartão de crédito e boleto. Link automático." />
              <FeatureCard icon={Users} title="CRM de recovery" description="Lead com timeline: tentativas, mensagens e status." />
              <FeatureCard icon={Layers} title="Multi-seller" description="Permissões isoladas. Admin governa. Escala segura." />
            </div>
          </div>
        </section>

        {/* ═══════════════════════ INTEGRATION ═══════════════════════ */}
        <section className="relative mx-auto max-w-[82rem] px-6 py-24 sm:px-8 lg:px-10">
          <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[rgba(6,20,15,0.5)] shadow-[0_32px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(30,215,96,0.05),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(15,164,122,0.04),transparent_50%)]" />

            <div className="relative grid gap-10 px-8 py-14 sm:px-12 sm:py-16 lg:grid-cols-2 lg:gap-16 lg:px-14">
              <div>
                <SectionEyebrow>Integração em minutos</SectionEyebrow>
                <h2 className="mt-4 max-w-[16ch] text-[1.75rem] font-bold tracking-[-0.03em] text-white sm:text-[2.2rem] sm:leading-[1.15]">
                  Conecte seu gateway e comece a recuperar
                </h2>
                <p className="mt-4 max-w-md text-[0.95rem] leading-7 text-white/40">
                  Basta apontar o webhook do seu gateway para a PagRecovery.
                  A plataforma faz o resto.
                </p>
                <Link
                  href="/connect"
                  className="glass-button-primary group mt-8 inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold"
                >
                  Configurar integração
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>

              <div className="space-y-3">
                <IntegrationStep step="1" title="Configure o webhook" description="Adicione a URL da PagRecovery no seu gateway de pagamento." />
                <IntegrationStep step="2" title="Conecte o WhatsApp" description="Escaneie o QR code para conectar seu número via Evolution API." />
                <IntegrationStep step="3" title="Ative a IA" description="Defina o tom, limites de tentativa e política de automação." />
                <IntegrationStep step="4" title="Recupere automaticamente" description="A plataforma opera 24/7. Acompanhe tudo no dashboard." />
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════ CTA FINAL ═══════════════════════ */}
        <section className="relative mx-auto max-w-[82rem] px-6 py-24 sm:px-8 lg:px-10">
          <div className="relative overflow-hidden rounded-2xl border border-[rgba(30,215,96,0.08)] bg-gradient-to-br from-[rgba(30,215,96,0.04)] via-[rgba(6,20,15,0.6)] to-[rgba(15,164,122,0.03)] px-8 py-16 text-center shadow-[0_40px_100px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:px-14 sm:py-24">
            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.015]">
              <Image
                src="/brand/pagrecovery-mark.png"
                alt=""
                width={600}
                height={600}
                className="h-[28rem] w-[28rem] object-contain"
                aria-hidden="true"
              />
            </div>

            <div className="relative">
              <div className="mx-auto mb-8 flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(30,215,96,0.14)] bg-[rgba(30,215,96,0.06)]">
                <TrendingUp className="h-6 w-6 text-[var(--accent)]" />
              </div>
              <h2 className="text-balance text-[1.75rem] font-bold tracking-[-0.03em] text-white sm:text-[2.2rem] lg:text-[2.8rem]">
                Pare de perder receita
              </h2>
              <p className="mx-auto mt-5 max-w-lg text-[1rem] leading-7 text-white/42">
                Cada minuto sem recuperação ativa é dinheiro na mesa.
                Configure em minutos. Resultados no primeiro dia.
              </p>
              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link
                  href="/dashboard"
                  className="glass-button-primary group inline-flex items-center gap-2.5 px-8 py-3.5 text-[0.92rem] font-semibold shadow-[0_12px_32px_rgba(30,215,96,0.2)]"
                >
                  Começar agora
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-8 py-3.5 text-[0.92rem] font-medium text-white/60 backdrop-blur-sm transition-all hover:border-white/14 hover:text-white/80"
                >
                  Fazer login
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════ FOOTER ═══════════════════════ */}
        <footer className="relative mx-auto max-w-[82rem] px-6 pb-10 pt-4 sm:px-8 lg:px-10">
          <div className="border-t border-white/[0.04] pt-8">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
              <div className="flex items-center gap-4">
                <PlatformLogo mode="icon" size="sm" />
                <div>
                  <p className="text-sm font-semibold text-white/60">PagRecovery</p>
                  <p className="text-[0.68rem] text-white/25">Recuperação inteligente de pagamentos</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <Link href="/login" className="text-[0.8rem] text-white/28 transition-colors hover:text-white/55">Login</Link>
                <Link href="/onboarding" className="text-[0.8rem] text-white/28 transition-colors hover:text-white/55">Docs</Link>
                <Link href="/connect" className="text-[0.8rem] text-white/28 transition-colors hover:text-white/55">Integrações</Link>
              </div>
            </div>
            <p className="mt-6 text-center font-mono text-[0.55rem] uppercase tracking-[0.22em] text-white/15">
              &copy; {new Date().getFullYear()} PagRecovery. Todos os direitos reservados.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}

/* ═══════════════════════ COMPONENTS ═══════════════════════ */

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[var(--accent)]/70">
      {children}
    </p>
  );
}

function LiveMetric({ value, label, icon: Icon }: { value: string; label: string; icon: LucideIcon }) {
  return (
    <div className="flex flex-col items-center gap-2 border-r border-white/[0.04] px-4 py-6 last:border-r-0 sm:py-7">
      <Icon className="h-4 w-4 text-[var(--accent)]/40" />
      <p className="text-[1.5rem] font-bold tracking-tight text-white sm:text-[1.7rem]">{value}</p>
      <p className="font-mono text-[0.52rem] uppercase tracking-[0.2em] text-white/30">{label}</p>
    </div>
  );
}

function ProofItem({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex items-center gap-2 text-white/25">
      <Icon className="h-3.5 w-3.5 text-[var(--accent)]/30" />
      <span className="text-[0.7rem] font-medium uppercase tracking-[0.12em]">{text}</span>
    </div>
  );
}

function StepCard({ number, icon: Icon, title, description }: { number: string; icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="group rounded-xl border border-white/[0.05] bg-[rgba(6,20,15,0.4)] px-5 py-6 backdrop-blur-sm transition-all duration-300 hover:border-[rgba(30,215,96,0.12)] hover:bg-[rgba(6,20,15,0.6)]">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[rgba(30,215,96,0.12)] bg-[rgba(30,215,96,0.06)]">
          <Icon className="h-[18px] w-[18px] text-[var(--accent)]" />
        </div>
        <span className="font-mono text-[0.65rem] font-bold tracking-wider text-white/15">{number}</span>
      </div>
      <h3 className="mt-4 text-[0.88rem] font-semibold text-white/85">{title}</h3>
      <p className="mt-2 text-[0.78rem] leading-[1.7] text-white/35">{description}</p>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="group rounded-xl border border-white/[0.05] bg-[rgba(6,20,15,0.35)] px-5 py-5 backdrop-blur-sm transition-all duration-300 hover:border-[rgba(30,215,96,0.1)] hover:bg-[rgba(6,20,15,0.55)]">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[rgba(30,215,96,0.10)] bg-[rgba(30,215,96,0.05)]">
        <Icon className="h-4 w-4 text-[var(--accent)]/80" />
      </div>
      <h3 className="mt-3.5 text-[0.82rem] font-semibold text-white/80">{title}</h3>
      <p className="mt-1.5 text-[0.75rem] leading-[1.7] text-white/32">{description}</p>
    </div>
  );
}

function IntegrationStep({ step, title, description }: { step: string; title: string; description: string }) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-white/[0.05] bg-white/[0.02] px-5 py-4 backdrop-blur-sm transition-all hover:border-[rgba(30,215,96,0.08)]">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[rgba(30,215,96,0.14)] bg-[rgba(30,215,96,0.06)] text-[0.7rem] font-bold text-[var(--accent)]/80">
        {step}
      </div>
      <div>
        <p className="text-[0.82rem] font-semibold text-white/80">{title}</p>
        <p className="mt-1 text-[0.72rem] leading-5 text-white/32">{description}</p>
      </div>
    </div>
  );
}
