import { KeyRound, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { loginAction } from "@/app/actions/auth-actions";
import { PlatformLogo } from "@/components/platform/platform-logo";
import { platformBrand } from "@/lib/platform";
import { isAuthConfigured } from "@/server/auth/core";
import { getAuthenticatedSession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `Partner Login | ${platformBrand.name}`,
};

type PartnerLoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function PartnerLoginPage({
  searchParams,
}: PartnerLoginPageProps) {
  const params = (await searchParams) ?? {};
  const session = await getAuthenticatedSession();

  if (session?.role === "partner") {
    redirect("/partner");
  }
  if (session) {
    redirect("/dashboard");
  }

  const invalidCredentials = params.error === "invalid";
  const configMissing = !isAuthConfigured();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0d0d0d] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-xl items-center justify-center">
        <div className="w-full rounded-[2rem] border border-gray-800 bg-[#111111] p-5 shadow-[0_32px_90px_rgba(0,0,0,0.42)] sm:p-8">
          <PlatformLogo
            size="lg"
            emphasis="strong"
            className="bg-transparent shadow-none ring-0"
          />

          <div className="mt-8">
            <p className="font-mono text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
              Portal do Parceiro
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-white">
              Acesse o painel da sua integração.
            </h1>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Acompanhe recuperações, tenants e performance da sua integração
              com a {platformBrand.name}.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex items-start gap-3 rounded-[1.1rem] border border-gray-800 bg-[#0d0d0d] px-4 py-3">
              <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)]/10">
                <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Dados isolados</p>
                <p className="text-xs text-gray-500">
                  Cada parceiro vê apenas os dados dos seus tenants.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-[1.1rem] border border-gray-800 bg-[#0d0d0d] px-4 py-3">
              <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)]/10">
                <KeyRound className="h-4 w-4 text-[var(--accent)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">API key por tenant</p>
                <p className="text-xs text-gray-500">
                  Cada tenant recebe uma chave própria para integração.
                </p>
              </div>
            </div>
          </div>

          {invalidCredentials ? (
            <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              Email ou senha inválidos.
            </div>
          ) : null}

          {configMissing ? (
            <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
              Autenticação não configurada no ambiente.
            </div>
          ) : null}

          <form action={loginAction} className="mt-6 space-y-4">
            <input type="hidden" name="next" value="/partner" />

            <label className="block">
              <span className="text-sm font-medium text-gray-300">Email</span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="parceiro@empresa.com"
                required
                className="mt-2 w-full rounded-2xl border border-gray-700 bg-[#0d0d0d] px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:border-[var(--accent)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/20"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-300">Senha</span>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Sua senha"
                required
                className="mt-2 w-full rounded-2xl border border-gray-700 bg-[#0d0d0d] px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:border-[var(--accent)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/20"
              />
            </label>

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-[1rem] bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-strong)]"
            >
              Entrar no portal
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
