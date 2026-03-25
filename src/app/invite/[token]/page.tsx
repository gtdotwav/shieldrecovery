import Link from "next/link";
import { ArrowRight, KeyRound, UserRound } from "lucide-react";

import { completeSellerInviteAction } from "@/app/actions/seller-invite-actions";
import { ShieldRecoveryLogo } from "@/components/platform/shield-recovery-logo";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Convite | PagRecovery",
};

type InvitePageProps = {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ error?: string }>;
};

export default async function SellerInvitePage({
  params,
  searchParams,
}: InvitePageProps) {
  const { token } = await params;
  const query = (await searchParams) ?? {};
  const invite = await getPaymentRecoveryService().getSellerInviteByToken(token);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(2,132,199,0.08),transparent_22rem),linear-gradient(180deg,#fafbfc_0%,#f3f5f8_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full gap-6 rounded-[2rem] border border-black/[0.06] bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] xl:grid-cols-[1.05fr_0.95fr] xl:p-6">
          <section className="rounded-[1.6rem] bg-[linear-gradient(180deg,#141414_0%,#121826_100%)] p-6 text-white sm:p-8">
            <ShieldRecoveryLogo size="lg" emphasis="strong" className="bg-transparent shadow-none ring-0" />

            <div className="mt-10 max-w-lg">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-sky-400">
                Convite para seller
              </p>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Finalize seu acesso e entre na operação.
              </h1>
              <p className="mt-4 text-sm leading-7 text-white/70">
                Você recebe um link único, completa os seus dados e entra direto
                no CRM e nas automações liberadas para a sua carteira.
              </p>
            </div>

            <div className="mt-8 space-y-3">
              <FeatureRow
                icon={UserRound}
                title="Seu próprio acesso"
                description="Cada seller entra com conta própria e carteira vinculada."
              />
              <FeatureRow
                icon={KeyRound}
                title="Setup guiado"
                description="Você preenche nome, agente e senha em um único passo."
              />
            </div>
          </section>

          <section className="flex items-center">
            <div className="w-full rounded-[1.6rem] border border-black/[0.06] bg-[#fbfbfc] p-5 sm:p-6">
              {!invite ? (
                <InviteState
                  title="Convite não encontrado."
                  description="Peça ao admin para gerar um novo link de convite."
                />
              ) : invite.status === "accepted" ? (
                <InviteState
                  title="Este convite já foi usado."
                  description="Seu acesso já foi criado. Entre normalmente na plataforma."
                  action={
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-1.5 rounded-[1rem] bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-600"
                    >
                      Ir para login
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  }
                />
              ) : invite.expired || invite.status === "revoked" ? (
                <InviteState
                  title="Convite indisponível."
                  description="Esse link expirou ou foi encerrado. Peça um novo convite ao admin."
                />
              ) : (
                <>
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-sky-500">
                    Completar acesso
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#111827]">
                    {invite.suggestedDisplayName || invite.email}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#6b7280]">
                    Convite enviado para {invite.email}. Se quiser, ajuste o nome
                    operacional e o agente antes de entrar.
                  </p>

                  {query.error === "password" ? (
                    <Notice>
                      A senha precisa ter pelo menos 8 caracteres.
                    </Notice>
                  ) : null}

                  {query.error === "confirm" ? (
                    <Notice>
                      A confirmação da senha não bateu.
                    </Notice>
                  ) : null}

                  {query.error === "expired" || query.error === "inactive" || query.error === "invalid" ? (
                    <Notice>
                      Esse convite não está mais disponível. Peça um novo link ao admin.
                    </Notice>
                  ) : null}

                  <form action={completeSellerInviteAction} className="mt-6 space-y-4">
                    <input type="hidden" name="token" value={invite.token} />

                    <Field
                      label="Email"
                      name="email_view"
                      type="email"
                      defaultValue={invite.email}
                      disabled
                    />
                    <Field
                      label="Nome"
                      name="displayName"
                      defaultValue={invite.suggestedDisplayName || ""}
                      placeholder="Como você quer aparecer"
                    />
                    <Field
                      label="Agente"
                      name="agentName"
                      defaultValue={invite.agentName || invite.suggestedDisplayName || ""}
                      placeholder="Nome operacional"
                    />
                    <Field
                      label="Senha"
                      name="password"
                      type="password"
                      defaultValue=""
                      placeholder="Crie sua senha"
                    />
                    <Field
                      label="Confirmar senha"
                      name="confirmPassword"
                      type="password"
                      defaultValue=""
                      placeholder="Repita a senha"
                    />

                    <button
                      type="submit"
                      className="inline-flex w-full items-center justify-center rounded-[1rem] bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-600"
                    >
                      Criar acesso e entrar
                    </button>
                  </form>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function InviteState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-sky-500">
        Convite
      </p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#111827]">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-[#6b7280]">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

function FeatureRow({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof UserRound;
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
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
      {children}
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  disabled = false,
}: {
  label: string;
  name: string;
  type?: "text" | "email" | "password";
  defaultValue: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-[#111827]">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        disabled={disabled}
        className="mt-2 w-full rounded-2xl border border-black/[0.08] bg-white px-4 py-3 text-sm text-[#111827] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-sky-300 focus:ring-2 focus:ring-sky-100 disabled:bg-[#f3f4f6] disabled:text-[#6b7280]"
      />
    </label>
  );
}
