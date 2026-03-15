import { LockKeyhole, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { loginAction } from "@/app/actions/auth-actions";
import { ShieldRecoveryLogo } from "@/components/platform/shield-recovery-logo";
import { isAuthConfigured } from "@/server/auth/core";
import { getAuthenticatedSession, resolvePostLoginPath } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Login | Shield Recovery",
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
    redirect("/dashboard");
  }

  const nextPath = resolvePostLoginPath(params.next);
  const authConfigured = isAuthConfigured();
  const invalidCredentials = params.error === "invalid";
  const configurationMissing = params.error === "config" || !authConfigured;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fff3e8_0%,#ffffff_38%,#f5f6f8_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full gap-6 rounded-[2rem] border border-black/[0.06] bg-white/92 p-5 shadow-[0_30px_90px_rgba(15,23,42,0.10)] backdrop-blur xl:grid-cols-[1.1fr_0.9fr] xl:p-6">
          <section className="rounded-[1.6rem] bg-[linear-gradient(180deg,#141414_0%,#0f172a_100%)] p-6 text-white sm:p-8">
            <ShieldRecoveryLogo />

            <div className="mt-10 max-w-lg">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-orange-400">
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

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <FeatureCard
                icon={ShieldCheck}
                title="Sessao protegida"
                description="Acesso por cookie assinado e expiracao automatica."
              />
              <FeatureCard
                icon={LockKeyhole}
                title="Areas internas isoladas"
                description="Dashboard, CRM, Inbox, Connect e Testes ficam protegidos."
              />
            </div>
          </section>

          <section className="flex items-center">
            <div className="w-full rounded-[1.6rem] border border-black/[0.06] bg-[#fcfcfd] p-5 sm:p-6">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-orange-500">
                Entrar
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#111827]">
                Acesse a operacao.
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#6b7280]">
                Use as credenciais de administrador configuradas no ambiente.
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
                  `PLATFORM_AUTH_SECRET`.
                </Notice>
              ) : null}

              <form action={loginAction} className="mt-6 space-y-4">
                <input type="hidden" name="next" value={nextPath} />

                <Field
                  label="Email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@shieldrecovery.local"
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
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
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

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof ShieldCheck;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <Icon className="h-5 w-5 text-orange-400" />
      <p className="mt-4 text-sm font-semibold text-white">{title}</p>
      <p className="mt-1 text-sm leading-6 text-white/60">{description}</p>
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
        className="mt-2 w-full rounded-2xl border border-black/[0.08] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
      />
    </label>
  );
}
