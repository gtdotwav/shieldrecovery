import { LockKeyhole, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { loginAction } from "@/app/actions/auth-actions";
import { PlatformLogo } from "@/components/platform/platform-logo";
import { platformBrand } from "@/lib/platform";
import { defaultPathForRole, isAuthConfigured } from "@/server/auth/core";
import { getAuthenticatedSession, resolvePostLoginPath } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `Login | ${platformBrand.name}`,
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
    <div className="relative min-h-screen overflow-hidden bg-[#0d0d0d] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full gap-6 rounded-[2rem] border border-gray-800 bg-[#111111] p-5 shadow-[0_32px_90px_rgba(0,0,0,0.42)] xl:grid-cols-[1.08fr_0.92fr] xl:p-6">
          <section className="rounded-[1.6rem] border border-gray-800 bg-[#0d0d0d] p-6 text-white sm:p-8">
            <PlatformLogo size="lg" emphasis="strong" className="bg-transparent shadow-none ring-0" />

            <div className="mt-10 max-w-lg">
              <p className="font-mono text-[0.72rem] font-semibold uppercase tracking-[0.32em] text-[var(--accent)]">
                Acesso protegido
              </p>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Plataforma privada para operacao de recovery.
              </h1>
              <p className="mt-4 text-sm leading-7 text-gray-400">
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
            <div className="w-full rounded-[1.6rem] border border-gray-800 bg-[#0d0d0d] p-5 sm:p-6">
              <p className="font-mono text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
                Entrar
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-white">
                Acesse a operacao.
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-500">
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
                  placeholder="seu@email.com"
            required
                />

                <Field
                  label="Senha"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Sua senha"
            required
                />

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-[1rem] bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-strong)]"
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
    <div className="flex items-start gap-3 rounded-[1.1rem] border border-gray-800 bg-[#111111] px-4 py-4">
      <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--accent-soft)] bg-[var(--accent)]/10">
        <Icon className="h-4.5 w-4.5 text-[var(--accent)]" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-1 text-sm leading-6 text-gray-500">{description}</p>
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
      ? "border-red-500/20 bg-red-500/10 text-red-300"
      : tone === "warning"
        ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
        : "border-gray-700 bg-gray-800 text-gray-300";

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
  required,
}: {
  label: string;
  name: string;
  type: "email" | "password";
  autoComplete: string;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-300">{label}</span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required={required}
        className="mt-2 w-full rounded-2xl border border-gray-700 bg-[#111111] px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:border-[var(--accent)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/20"
      />
    </label>
  );
}
