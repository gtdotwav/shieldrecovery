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
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Ambient lighting */}
      <div className="glow-orb left-[-14rem] top-[-6rem] h-[36rem] w-[36rem] bg-[rgba(30,215,96,0.10)]" />
      <div className="glow-orb right-[-12rem] top-[4rem] h-[28rem] w-[28rem] bg-[rgba(15,164,122,0.08)]" />
      <div className="glow-orb left-[40%] top-[50%] h-[32rem] w-[32rem] bg-[rgba(30,215,96,0.04)]" />
      <div className="glow-orb bottom-[-10rem] right-[20%] h-[24rem] w-[24rem] bg-[rgba(15,164,122,0.06)]" />

      {/* Navigation */}
      <nav className="relative z-20 mx-auto flex max-w-[82rem] items-center justify-between px-6 py-6 sm:px-8 sm:py-8 lg:px-10">
        <Image
          src="/brand/pagrecovery-logo.png"
          alt="PagRecovery"
          width={1600}
          height={1600}
          className="h-[10rem] w-auto object-contain brightness-[1.02] drop-shadow-[0_10px_28px_rgba(0,0,0,0.35)] sm:h-[14rem]"
          priority
        />
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="glass-button-secondary px-5 py-2.5 text-sm font-medium text-white/80 max-sm:hidden"
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

      <main>
        {/* ═══════════════════════ HERO ═══════════════════════ */}
        <section className="relative z-10 mx-auto max-w-[82rem] px-6 pb-24 pt-10 sm:px-8 sm:pt-16 lg:px-10 lg:pt-20">
          {/* Decorative P mark behind hero */}
          <div className="pointer-events-none absolute right-[-4rem] top-[-2rem] z-0 hidden opacity-[0.03] lg:block">
            <Image
              src="/brand/pagrecovery-mark.png"
              alt=""
              width={800}
              height={800}
              className="h-[38rem] w-[38rem] object-contain"
              aria-hidden="true"
            />
          </div>

          <div className="relative z-10 mx-auto max-w-4xl text-center">
            {/* Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(30,215,96,0.20)] bg-[rgba(30,215,96,0.06)] px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[var(--accent)] backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
              </span>
              Recuperação autônoma com IA
            </div>

            <h1 className="mt-8 text-balance text-[2.6rem] font-bold leading-[1.08] tracking-[-0.035em] text-white sm:text-6xl lg:text-[4.8rem]">
              Transforme pagamentos{" "}
              <span className="relative">
                <span className="bg-gradient-to-r from-[var(--accent)] via-[#28e86e] to-[#0fa47a] bg-clip-text text-transparent">
                  falhados em receita
                </span>
                <span className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-gradient-to-r from-[var(--accent)] to-transparent opacity-40" />
              </span>
            </h1>

            <p className="mx-auto mt-7 max-w-[38rem] text-[1.08rem] leading-[1.75] text-white/55">
              Plataforma inteligente que detecta falhas em tempo real, aciona o
              cliente via WhatsApp com IA personalizada e recupera a venda
              automaticamente.
            </p>

            {/* CTA */}
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/dashboard"
                className="glass-button-primary group inline-flex items-center gap-2.5 px-8 py-4 text-[0.95rem] font-semibold shadow-[0_14px_36px_rgba(30,215,96,0.25)]"
              >
                Acessar plataforma
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/onboarding"
                className="glass-button-secondary inline-flex items-center gap-2 px-8 py-4 text-[0.95rem] font-medium text-white/72"
              >
                Como funciona
              </Link>
            </div>
          </div>

          {/* ─── Live metrics ─── */}
          <div className="relative z-10 mx-auto mt-20 max-w-[64rem]">
            <div className="glass-panel rounded-[1.6rem] px-6 py-7 sm:px-10 sm:py-8">
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-0 sm:divide-x sm:divide-white/8">
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
              <div className="mt-5 flex items-center justify-center gap-2">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-50" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                </span>
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-white/32">
                  dados ao vivo da operação
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════ SOCIAL PROOF BAR ═══════════════════════ */}
        <section className="relative z-10 mx-auto max-w-[82rem] px-6 pb-20 sm:px-8 lg:px-10">
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            <ProofItem icon={Shield} text="HMAC-SHA256 em cada webhook" />
            <ProofItem icon={QrCode} text="PIX, cartão e boleto" />
            <ProofItem icon={Bot} text="IA generativa GPT-4.1" />
            <ProofItem icon={Smartphone} text="WhatsApp nativo" />
            <ProofItem icon={Layers} text="Multi-tenant SaaS" />
          </div>
        </section>

        {/* ═══════════════════════ HOW IT WORKS ═══════════════════════ */}
        <section className="relative z-10 mx-auto max-w-[82rem] px-6 py-24 sm:px-8 lg:px-10">
          <div className="text-center">
            <SectionEyebrow>Como funciona</SectionEyebrow>
            <h2 className="mt-4 text-balance text-3xl font-bold tracking-[-0.035em] text-white sm:text-[2.6rem]">
              Da falha à recuperação em minutos
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/48">
              Quatro etapas automatizadas. Zero intervenção manual.
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-[62rem]">
            {/* Connection line */}
            <div className="absolute left-1/2 hidden h-[calc(100%-6rem)] w-px -translate-x-1/2 bg-gradient-to-b from-[rgba(30,215,96,0.2)] via-[rgba(30,215,96,0.08)] to-transparent lg:hidden" />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <StepCard
                number="01"
                icon={Zap}
                title="Webhook detecta"
                description="Falha de pagamento chega via webhook do gateway. A plataforma captura e classifica em tempo real."
                accent
              />
              <StepCard
                number="02"
                icon={Bot}
                title="IA personaliza"
                description="O modelo analisa valor, método, histórico e decide o tom, canal e momento ideal de contato."
              />
              <StepCard
                number="03"
                icon={MessageSquare}
                title="WhatsApp contata"
                description="Mensagem humanizada enviada direto ao cliente com link de pagamento e opções de método."
              />
              <StepCard
                number="04"
                icon={TrendingUp}
                title="Receita recuperada"
                description="Cliente paga pelo link, status atualiza automaticamente. Dashboard reflete em tempo real."
              />
            </div>
          </div>
        </section>

        {/* ═══════════════════════ LIVE DEMO ═══════════════════════ */}
        <LiveDemo />

        {/* ═══════════════════════ FEATURES ═══════════════════════ */}
        <section className="relative z-10 mx-auto max-w-[82rem] px-6 py-24 sm:px-8 lg:px-10">
          <div className="grid items-start gap-16 lg:grid-cols-[1fr_1.2fr]">
            {/* Left — text */}
            <div className="lg:sticky lg:top-24">
              <SectionEyebrow>Plataforma completa</SectionEyebrow>
              <h2 className="mt-4 max-w-[16ch] text-3xl font-bold tracking-[-0.035em] text-white sm:text-[2.6rem] sm:leading-[1.12]">
                Tudo que sua operação precisa em um lugar
              </h2>
              <p className="mt-5 max-w-md text-base leading-7 text-white/48">
                CRM, inbox, automações e analytics — integrados em um único
                ecossistema focado em recuperação de pagamentos.
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

              {/* Recovery rate highlight */}
              <div className="mt-10 inline-flex items-end gap-3 rounded-[1.2rem] border border-white/8 bg-white/[0.03] px-6 py-5 backdrop-blur-sm">
                <div>
                  <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-white/40">
                    Taxa de recuperação
                  </p>
                  <p className="mt-1 text-[2.4rem] font-bold leading-none tracking-tight text-[var(--accent)]">
                    {recoveryRate}%
                  </p>
                </div>
                <LineChart className="mb-1 h-8 w-8 text-[var(--accent)]/40" />
              </div>
            </div>

            {/* Right — feature grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FeatureCard
                icon={Bot}
                title="IA conversacional"
                description="Mensagens geradas com contexto completo: valor, método, histórico de tentativas e tom personalizado."
              />
              <FeatureCard
                icon={MessageSquare}
                title="WhatsApp nativo"
                description="Integração direta com Evolution API. Envio, recebimento e respostas automáticas em tempo real."
              />
              <FeatureCard
                icon={BarChart3}
                title="Dashboard analítico"
                description="KPIs em tempo real: taxa de recuperação, receita salva, tempo médio e performance por canal."
              />
              <FeatureCard
                icon={Clock}
                title="Follow-up automático"
                description="Sequências inteligentes com delay configurável. Escala sem aumentar equipe."
              />
              <FeatureCard
                icon={Shield}
                title="Segurança enterprise"
                description="HMAC-SHA256 em webhooks, RLS por tenant, rate limiting e validação em cada endpoint."
              />
              <FeatureCard
                icon={CreditCard}
                title="Checkout integrado"
                description="Link de pagamento gerado automaticamente. PIX, cartão de crédito e boleto bancário."
              />
              <FeatureCard
                icon={Users}
                title="CRM de recovery"
                description="Cada cliente em um lead com timeline completa: tentativas, mensagens, respostas e status."
              />
              <FeatureCard
                icon={Layers}
                title="Multi-seller"
                description="Sellers com permissões isoladas. Admin governa a operação. Escala com segurança."
              />
            </div>
          </div>
        </section>

        {/* ═══════════════════════ INTEGRATION FLOW ═══════════════════════ */}
        <section className="relative z-10 mx-auto max-w-[82rem] px-6 py-24 sm:px-8 lg:px-10">
          <div className="glass-panel qr-panel overflow-hidden rounded-[2rem] px-6 py-12 sm:px-10 sm:py-16 lg:px-14">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(30,215,96,0.08),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(15,164,122,0.06),transparent_50%)]" />

            <div className="relative grid gap-10 lg:grid-cols-2 lg:gap-16">
              <div>
                <SectionEyebrow>Integração em minutos</SectionEyebrow>
                <h2 className="mt-4 max-w-[16ch] text-3xl font-bold tracking-[-0.035em] text-white sm:text-[2.4rem] sm:leading-[1.12]">
                  Conecte seu gateway e comece a recuperar
                </h2>
                <p className="mt-4 max-w-md text-base leading-7 text-white/48">
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

              <div className="space-y-4">
                <IntegrationStep
                  step="1"
                  title="Configure o webhook"
                  description="Adicione a URL da PagRecovery no seu gateway de pagamento."
                />
                <IntegrationStep
                  step="2"
                  title="Conecte o WhatsApp"
                  description="Escaneie o QR code para conectar seu número via Evolution API."
                />
                <IntegrationStep
                  step="3"
                  title="Ative a IA"
                  description="Defina o tom, limites de tentativa e política de automação."
                />
                <IntegrationStep
                  step="4"
                  title="Recupere automaticamente"
                  description="A plataforma opera 24/7. Acompanhe tudo no dashboard."
                />
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════ CTA FINAL ═══════════════════════ */}
        <section className="relative z-10 mx-auto max-w-[82rem] px-6 py-24 sm:px-8 lg:px-10">
          <div className="relative overflow-hidden rounded-[2.2rem] border border-[rgba(30,215,96,0.12)] bg-gradient-to-br from-[rgba(30,215,96,0.06)] via-transparent to-[rgba(15,164,122,0.04)] px-8 py-16 text-center shadow-[0_40px_100px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:px-14 sm:py-24">
            {/* Decorative mark */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.025]">
              <Image
                src="/brand/pagrecovery-mark.png"
                alt=""
                width={600}
                height={600}
                className="h-[26rem] w-[26rem] object-contain"
                aria-hidden="true"
              />
            </div>

            <div className="relative">
              <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-[rgba(30,215,96,0.18)] bg-[rgba(30,215,96,0.08)]">
                <TrendingUp className="h-7 w-7 text-[var(--accent)]" />
              </div>
              <h2 className="text-balance text-3xl font-bold tracking-[-0.035em] text-white sm:text-4xl lg:text-5xl">
                Pare de perder receita
              </h2>
              <p className="mx-auto mt-5 max-w-lg text-[1.05rem] leading-7 text-white/50">
                Cada minuto sem recuperação ativa é dinheiro deixado na mesa.
                Configure em minutos. Resultados no primeiro dia.
              </p>
              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link
                  href="/dashboard"
                  className="glass-button-primary group inline-flex items-center gap-2.5 px-8 py-4 text-[0.95rem] font-semibold shadow-[0_14px_36px_rgba(30,215,96,0.25)]"
                >
                  Começar agora
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/login"
                  className="glass-button-secondary inline-flex items-center gap-2 px-8 py-4 text-[0.95rem] font-medium text-white/70"
                >
                  Fazer login
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════ FOOTER ═══════════════════════ */}
        <footer className="relative z-10 mx-auto max-w-[82rem] px-6 pb-10 pt-4 sm:px-8 lg:px-10">
          <div className="border-t border-white/6 pt-8">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
              <div className="flex items-center gap-4">
                <PlatformLogo mode="icon" size="sm" />
                <div>
                  <p className="text-sm font-semibold text-white/70">PagRecovery</p>
                  <p className="text-[0.7rem] text-white/30">Recuperação inteligente de pagamentos</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <Link href="/login" className="text-sm text-white/36 transition-colors hover:text-white/60">
                  Login
                </Link>
                <Link href="/onboarding" className="text-sm text-white/36 transition-colors hover:text-white/60">
                  Documentação
                </Link>
                <Link href="/connect" className="text-sm text-white/36 transition-colors hover:text-white/60">
                  Integrações
                </Link>
              </div>
            </div>
            <p className="mt-6 text-center font-mono text-[0.6rem] uppercase tracking-[0.2em] text-white/20">
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
    <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.32em] text-[var(--accent)]">
      {children}
    </p>
  );
}

function LiveMetric({
  value,
  label,
  icon: Icon,
}: {
  value: string;
  label: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4">
      <Icon className="h-4 w-4 text-[var(--accent)]/50" />
      <p className="text-[1.6rem] font-bold tracking-tight text-white sm:text-[1.85rem]">
        {value}
      </p>
      <p className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-white/40">
        {label}
      </p>
    </div>
  );
}

function ProofItem({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex items-center gap-2.5 text-white/32">
      <Icon className="h-4 w-4 text-[var(--accent)]/40" />
      <span className="text-[0.75rem] font-medium uppercase tracking-[0.1em]">
        {text}
      </span>
    </div>
  );
}

function StepCard({
  number,
  icon: Icon,
  title,
  description,
  accent,
}: {
  number: string;
  icon: LucideIcon;
  title: string;
  description: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`glass-inset glass-hover group rounded-[1.4rem] px-5 py-6 ${
        accent ? "border-[rgba(30,215,96,0.14)]" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-[0.95rem] border border-[rgba(30,215,96,0.16)] bg-[rgba(30,215,96,0.08)]">
          <Icon className="h-5 w-5 text-[var(--accent)]" />
        </div>
        <span className="font-mono text-[0.7rem] font-bold tracking-[0.12em] text-[var(--accent)]/30">
          {number}
        </span>
      </div>
      <h3 className="mt-5 text-[0.95rem] font-semibold text-white">{title}</h3>
      <p className="mt-2 text-[0.82rem] leading-6 text-white/46">{description}</p>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="glass-inset glass-hover group rounded-[1.4rem] px-5 py-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-[0.85rem] border border-[rgba(30,215,96,0.14)] bg-[rgba(30,215,96,0.07)]">
        <Icon className="h-[18px] w-[18px] text-[var(--accent)]" />
      </div>
      <h3 className="mt-4 text-[0.9rem] font-semibold text-white">{title}</h3>
      <p className="mt-1.5 text-[0.8rem] leading-[1.65] text-white/42">{description}</p>
    </div>
  );
}

function IntegrationStep({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4 rounded-[1.2rem] border border-white/6 bg-white/[0.03] px-5 py-4 backdrop-blur-sm">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[rgba(30,215,96,0.18)] bg-[rgba(30,215,96,0.08)] text-[0.75rem] font-bold text-[var(--accent)]">
        {step}
      </div>
      <div>
        <p className="text-[0.88rem] font-semibold text-white">{title}</p>
        <p className="mt-1 text-[0.78rem] leading-5 text-white/42">{description}</p>
      </div>
    </div>
  );
}
