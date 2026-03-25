import { LockKeyhole, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { loginAction } from "@/app/actions/auth-actions";
import { PlatformLogo } from "@/components/platform/platform-logo";
import { defaultPathForRole, isAuthConfigured } from "@/server/auth/core";
import { getAuthenticatedSession, resolvePostLoginPath } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Login | PagRecovery",
};

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    next?: string;
    logged_out?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {};
  const session = await getAuthenticatedSession();

  if (session) {
    redirect(defaultPathForRole(session.role));
  }

  const nextPath = resolvePostLoginPath(params.next);
  const authConfigured = isAuthConfigured();
  const invalidCredentials = params.error === "invalid";
  const configurationMissing = params.error === "config" || !authConfigured;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="glow-orb left-[-8rem] top-[-2rem] h-[22rem] w-[22rem] bg-[rgba(30,215,96,0.14)]" />
      <div className="glow-orb right-[-7rem] top-[12rem] h-[20rem] w-[20rem] bg-[rgba(15,164,122,0.14)]" />
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center justify-center">
        <div className="glass-panel qr-panel grid w-full gap-6 rounded-[2rem] p-5 shadow-[0_32px_90px_rgba(0,0,0,0.42)] xl:grid-cols-[1.08fr_0.92fr] xl:p-6">
          <section className="glass-inset qr-panel rounded-[1.6rem] p-6 text-white sm:p-8">
            <PlatformLogo size="lg" emphasis="strong" className="bg-transparent shadow-none ring-0" />

            <div className="mt-10 max-w-lg">
              <p className="font-mono text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-[var(--accent)]">
                Acesso protegido
              </p>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Plataforma privada para operacao de recovery.
              </h1>
              <p className="mt-4 text-sm leading-7 text-[rgba(255,255,255,0.66)]">
                O login protege CRM, conversas, integracoes e testes. Os
                webhooks publicos continuam funcionando para o gateway, mas o
                painel operacional agora exige sessao valida.
              </p>
            </div>

            <div className="mt-8 space-y-3">
              <FeatureRow
                icon={ShieldCheck}
                title="Sessão protegida"
                description="Acesso por cookie assinado e expiração automática."
              />
              <FeatureRow
                icon={LockKeyhole}
                title="Áreas internas isoladas"
                description="CRM, conversas, integrações e operação ficam sob login."
              />
            </div>
          </section>

          <section className="flex items-center">
            <div className="glass-inset w-full rounded-[1.6rem] p-5 sm:p-6">
              <p className="font-mono text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
                Entrar
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-white">
                Acesse a operacao.
              </h2>
              <p className="mt-2 text-sm leading-6 text-[rgba(255,255,255,0.58)]">
                O sistema identifica automaticamente se o acesso e de administrador ou seller.
              </p>

              {params.logged_out === "1" ? (
                <Notice tone="neutral">
                  Sessao encerrada com sucesso.
                </Notice>
              ) : null}

              {invalidCredentials ? (
                <Notice tone="error">
                  Email ou senha invalidos.
                </Notice>
              ) : null}

              {configurationMissing ? (
                <Notice tone="warning">
                  Login ainda nao configurado no ambiente. Defina
                  `PLATFORM_AUTH_EMAIL`, `PLATFORM_AUTH_PASSWORD` e
                  `PLATFORM_AUTH_SECRET`. Os sellers agora podem ser criados no
                  painel Admin; em desenvolvimento, o fallback por env continua
                  disponivel.
                </Notice>
              ) : null}

              <form action={loginAction} className="mt-6 space-y-4">
                <input type="hidden" name="next" value={nextPath} />

                <Field
                  label="Email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@pagrecovery.local"
                />

                <Field
                  label="Senha"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Sua senha"
                />

                <button
                  type="submit"
                  className="glass-button-primary inline-flex w-full items-center justify-center rounded-[1rem] px-4 py-3 text-sm font-semibold"
                >
                  Entrar na plataforma
                </button>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function FeatureRow({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof ShieldCheck;
  title: string;
  description: string;
}) {
  return (
    <div className="glass-inset flex items-start gap-3 rounded-[1.1rem] px-4 py-4">
      <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(30,215,96,0.18)] bg-[rgba(30,215,96,0.12)]">
        <Icon className="h-4.5 w-4.5 text-[var(--accent)]" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-1 text-sm leading-6 text-[rgba(255,255,255,0.58)]">{description}</p>
      </div>
    </div>
  );
}

function Notice({
  tone,
  children,
}: {
  tone: "neutral" | "error" | "warning";
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "error"
      ? "border-[rgba(255,122,116,0.18)] bg-[rgba(255,122,116,0.1)] text-[#ffbbb5]"
      : tone === "warning"
        ? "border-[rgba(248,210,106,0.18)] bg-[rgba(248,210,106,0.1)] text-[#f4dd93]"
        : "border-white/8 bg-white/5 text-[rgba(255,255,255,0.78)]";

  return (
    <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${toneClass}`}>
      {children}
    </div>
  );
}

function Field({
  label,
  name,
  type,
  autoComplete,
  placeholder,
}: {
  label: string;
  name: string;
  type: "email" | "password";
  autoComplete: string;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-[rgba(255,255,255,0.82)]">{label}</span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="glass-input mt-2 w-full rounded-2xl px-4 py-3 text-sm text-white placeholder:text-[rgba(255,255,255,0.34)]"
      />
    </label>
  );
}
