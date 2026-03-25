import { LockKeyhole, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { loginAction } from "@/app/actions/auth-actions";
import { ShieldRecoveryLogo } from "@/components/platform/shield-recovery-logo";
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(2,132,199,0.08),transparent_22rem),linear-gradient(180deg,#fafbfc_0%,#f3f5f8_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full gap-6 rounded-[2rem] border border-black/[0.06] bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] xl:grid-cols-[1.05fr_0.95fr] xl:p-6">
          <section className="rounded-[1.6rem] bg-[linear-gradient(180deg,#141414_0%,#121826_100%)] p-6 text-white sm:p-8">
            <ShieldRecoveryLogo size="lg" emphasis="strong" className="bg-transparent shadow-none ring-0" />

            <div className="mt-10 max-w-lg">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-sky-400">
                Acesso protegido
              </p>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Plataforma privada para operacao de recovery.
              </h1>
              <p className="mt-4 text-sm leading-7 text-white/70">
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
            <div className="w-full rounded-[1.6rem] border border-black/[0.06] bg-[#fbfbfc] p-5 sm:p-6">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-sky-500">
                Entrar
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#111827]">
                Acesse a operacao.
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#6b7280]">
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
                  className="inline-flex w-full items-center justify-center rounded-[1rem] bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-600"
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
    <div className="flex items-start gap-3 rounded-[1.1rem] border border-white/10 bg-white/5 px-4 py-4">
      <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-white/8">
        <Icon className="h-4.5 w-4.5 text-sky-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-1 text-sm leading-6 text-white/60">{description}</p>
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
      ? "border-red-200 bg-red-50 text-red-600"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-black/[0.06] bg-white text-[#374151]";

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
      <span className="text-sm font-medium text-[#111827]">{label}</span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-black/[0.08] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
      />
    </label>
  );
}
