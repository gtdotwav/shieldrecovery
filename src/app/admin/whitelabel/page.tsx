import Link from "next/link";
import {
  ArrowLeft,
  Globe,
  Layers,
  Plus,
  Trash2,
} from "lucide-react";

import {
  deleteWhitelabelProfileAction,
  saveWhitelabelProfileAction,
} from "@/app/actions/admin-actions";
import {
  PlatformAppPage,
  PlatformInset,
  PlatformMetricCard,
  PlatformPill,
  PlatformSurface,
} from "@/components/platform/platform-shell";
import { formatRelativeTime } from "@/lib/format";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";
import { GATEWAY_PROVIDERS } from "@/server/recovery/types";
import type { WhitelabelProfileRecord } from "@/server/recovery/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Whitelabel",
};

const PROVIDER_META: Record<
  string,
  { label: string; docsHint: string; baseHint: string }
> = {
  pagouai: {
    label: "PagouAi",
    docsHint: "https://docs.pagouai.com",
    baseHint: "https://api.pagouai.com",
  },
  superpay: {
    label: "SuperPay",
    docsHint: "https://docs.superpay.com.br",
    baseHint: "https://api.superpay.com.br",
  },
  stripe: {
    label: "Stripe",
    docsHint: "https://docs.stripe.com",
    baseHint: "https://api.stripe.com",
  },
  mercadopago: {
    label: "Mercado Pago",
    docsHint: "https://www.mercadopago.com.br/developers",
    baseHint: "https://api.mercadopago.com",
  },
  pagarme: {
    label: "Pagar.me",
    docsHint: "https://docs.pagar.me",
    baseHint: "https://api.pagar.me",
  },
  asaas: {
    label: "Asaas",
    docsHint: "https://docs.asaas.com",
    baseHint: "https://api.asaas.com/v3",
  },
  iugu: {
    label: "Iugu",
    docsHint: "https://dev.iugu.com",
    baseHint: "https://api.iugu.com/v1",
  },
  pagar_me: {
    label: "Pagar.me v5",
    docsHint: "https://docs.pagar.me",
    baseHint: "https://api.pagar.me/core/v5",
  },
  hotmart: {
    label: "Hotmart",
    docsHint: "https://developers.hotmart.com",
    baseHint: "https://developers.hotmart.com",
  },
  kiwify: {
    label: "Kiwify",
    docsHint: "https://docs.kiwify.com.br",
    baseHint: "https://api.kiwify.com.br",
  },
  eduzz: {
    label: "Eduzz",
    docsHint: "https://developers.eduzz.com",
    baseHint: "https://api.eduzz.com",
  },
  monetizze: {
    label: "Monetizze",
    docsHint: "https://api.monetizze.com.br/docs",
    baseHint: "https://api.monetizze.com.br/2.1",
  },
  braip: {
    label: "Braip",
    docsHint: "https://developers.braip.com",
    baseHint: "https://api.braip.com",
  },
  custom: {
    label: "Custom",
    docsHint: "",
    baseHint: "",
  },
};

type WhitelabelPageProps = {
  searchParams?: Promise<{
    status?: string;
    saved?: string;
    message?: string;
    edit?: string;
  }>;
};

export default async function WhitelabelPage({
  searchParams,
}: WhitelabelPageProps) {
  await requireAuthenticatedSession(["admin"]);
  const params = (await searchParams) ?? {};
  const service = getPaymentRecoveryService();
  const profiles = await service.listWhitelabelProfiles();

  const editingId =
    typeof params.edit === "string" ? params.edit.trim() : null;
  const editingProfile = editingId
    ? profiles.find((p) => p.id === editingId) ?? null
    : null;

  const activeProfiles = profiles.filter((p) => p.active).length;
  const totalSellers = profiles.reduce((sum, p) => sum + p.sellersCount, 0);

  return (
    <PlatformAppPage
      currentPath="/admin"
      action={
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-xs font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-strong)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar ao admin
        </Link>
      }
    >
      <section className="grid gap-3 sm:grid-cols-3">
        <PlatformMetricCard
          icon={Layers}
          label="perfis criados"
          value={String(profiles.length)}
          subtitle={`${activeProfiles} ativos`}
        />
        <PlatformMetricCard
          icon={Globe}
          label="gateways distintos"
          value={String(
            new Set(profiles.map((p) => p.gatewayProvider)).size,
          )}
          subtitle="provedores mapeados"
        />
        <PlatformMetricCard
          icon={Globe}
          label="sellers vinculados"
          value={String(totalSellers)}
          subtitle="operando em whitelabel"
        />
      </section>

      {params.status ? (
        <PlatformSurface className="mt-5 p-4">
          <p className="text-sm font-medium text-[var(--foreground)]">
            {params.status === "ok"
              ? params.message || "Perfil salvo com sucesso."
              : params.message || "Nao foi possivel salvar."}
          </p>
          {params.saved ? (
            <p className="mt-1 text-sm text-[var(--muted)]">
              Perfil: {params.saved}
            </p>
          ) : null}
        </PlatformSurface>
      ) : null}

      <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_24rem]">
        <div className="space-y-5">
          <PlatformSurface className="p-5 sm:p-6">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
                  Whitelabel
                </p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-[var(--foreground)]">
                  Perfis de gateway
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Cada perfil define um provedor de pagamento. Sellers
                  vinculados herdam automaticamente a configuracao do gateway.
                </p>
              </div>
              <Link
                href="/admin/whitelabel?edit=new"
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--accent-strong)]"
              >
                <Plus className="h-3.5 w-3.5" />
                Novo perfil
              </Link>
            </div>

            {profiles.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] px-6 py-10 text-center">
                <Layers className="mx-auto h-8 w-8 text-[var(--muted)]" />
                <p className="mt-3 text-sm font-medium text-[var(--foreground)]">
                  Nenhum perfil whitelabel criado
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Crie o primeiro perfil para vincular sellers a um gateway.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {profiles.map((profile) => (
                  <ProfileRow
                    key={profile.id}
                    profile={profile}
                    isEditing={editingId === profile.id}
                  />
                ))}
              </div>
            )}
          </PlatformSurface>
        </div>

        <div className="space-y-4">
          {editingId ? (
            <ProfileForm profile={editingProfile} />
          ) : (
            <PlatformSurface className="p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                Instruções
              </p>
              <div className="mt-3 space-y-3 text-sm leading-6 text-[var(--muted)]">
                <p>
                  1. Crie um perfil whitelabel para cada gateway usado pelos
                  sellers.
                </p>
                <p>
                  2. No controle do seller (painel admin), vincule o perfil
                  whitelabel adequado.
                </p>
                <p>
                  3. O seller cola a API key do gateway em Integrações
                  (/connect). A plataforma sincroniza automaticamente.
                </p>
              </div>
            </PlatformSurface>
          )}

          <PlatformSurface className="p-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              Provedores suportados
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {GATEWAY_PROVIDERS.map((provider) => (
                <PlatformPill key={provider}>
                  {PROVIDER_META[provider]?.label ?? provider}
                </PlatformPill>
              ))}
            </div>
          </PlatformSurface>
        </div>
      </section>
    </PlatformAppPage>
  );
}

function ProfileRow({
  profile,
  isEditing,
}: {
  profile: WhitelabelProfileRecord;
  isEditing: boolean;
}) {
  const meta = PROVIDER_META[profile.gatewayProvider];
  return (
    <Link
      href={`/admin/whitelabel?edit=${profile.id}`}
      className={
        isEditing
          ? "block rounded-xl border border-[var(--accent)]/20 bg-[var(--accent-soft)]/60 px-4 py-4 transition-colors"
          : "block rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-4 transition-colors hover:bg-[var(--surface)]"
      }
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-base font-semibold text-[var(--foreground)]">
              {profile.name}
            </p>
            <PlatformPill>
              {meta?.label ?? profile.gatewayProvider}
            </PlatformPill>
            <PlatformPill>{profile.active ? "ativo" : "pausado"}</PlatformPill>
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">
            slug: {profile.slug} · {profile.sellersCount} seller
            {profile.sellersCount !== 1 ? "s" : ""} · atualizado{" "}
            {formatRelativeTime(profile.updatedAt)}
          </p>
        </div>
        {profile.brandAccent ? (
          <div
            className="h-6 w-6 rounded-full border border-[var(--border)]"
            style={{ backgroundColor: profile.brandAccent }}
          />
        ) : null}
      </div>
    </Link>
  );
}

function ProfileForm({
  profile,
}: {
  profile: WhitelabelProfileRecord | null;
}) {
  const isNew = !profile;
  const defaultProvider = profile?.gatewayProvider ?? "custom";
  const meta = PROVIDER_META[defaultProvider];

  return (
    <PlatformSurface className="p-5">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
        <p className="text-sm font-semibold text-[var(--foreground)]">
          {isNew ? "Novo perfil whitelabel" : `Editar: ${profile.name}`}
        </p>
        <Link
          href="/admin/whitelabel"
          className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          Cancelar
        </Link>
      </div>

      <form action={saveWhitelabelProfileAction} className="mt-4 space-y-4">
        {profile ? (
          <input type="hidden" name="id" value={profile.id} />
        ) : null}

        <FormField
          label="Nome do perfil"
          name="name"
          defaultValue={profile?.name ?? ""}
          placeholder="Ex.: PagRecovery Stripe"
          required
        />

        <FormField
          label="Slug"
          name="slug"
          defaultValue={profile?.slug ?? ""}
          placeholder="auto-gerado se vazio"
        />

        <label className="block space-y-1">
          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            Provedor do gateway
          </span>
          <select
            name="gatewayProvider"
            defaultValue={defaultProvider}
            className="w-full rounded-[0.95rem] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
          >
            {GATEWAY_PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {PROVIDER_META[p]?.label ?? p}
              </option>
            ))}
          </select>
        </label>

        <PlatformInset className="space-y-3 p-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            Endpoints do gateway
          </p>
          <FormField
            label="Base URL da API"
            name="gatewayBaseUrl"
            defaultValue={profile?.gatewayBaseUrl ?? meta?.baseHint ?? ""}
            placeholder={meta?.baseHint || "https://api.provider.com"}
          />
          <FormField
            label="URL da documentação"
            name="gatewayDocsUrl"
            defaultValue={profile?.gatewayDocsUrl ?? meta?.docsHint ?? ""}
            placeholder={meta?.docsHint || "https://docs.provider.com"}
          />
          <FormField
            label="Webhook path"
            name="gatewayWebhookPath"
            defaultValue={profile?.gatewayWebhookPath ?? ""}
            placeholder="/api/webhooks/provider"
          />
        </PlatformInset>

        <PlatformInset className="space-y-3 p-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            Checkout
          </p>
          <FormField
            label="Checkout URL"
            name="checkoutUrl"
            defaultValue={profile?.checkoutUrl ?? ""}
            placeholder="https://checkout.exemplo.com"
          />
          <FormField
            label="Checkout API Key"
            name="checkoutApiKey"
            defaultValue={profile?.checkoutApiKey ?? ""}
            placeholder="sk_live_..."
          />
        </PlatformInset>

        <PlatformInset className="space-y-3 p-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            Marca
          </p>
          <FormField
            label="Cor accent (hex)"
            name="brandAccent"
            defaultValue={profile?.brandAccent ?? ""}
            placeholder="#22c55e"
          />
          <FormField
            label="Logo URL"
            name="brandLogo"
            defaultValue={profile?.brandLogo ?? ""}
            placeholder="https://cdn.exemplo.com/logo.svg"
          />
        </PlatformInset>

        <label className="block space-y-1">
          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            Observações
          </span>
          <textarea
            name="notes"
            defaultValue={profile?.notes ?? ""}
            placeholder="Contexto interno sobre este perfil."
            rows={2}
            className="w-full rounded-[1rem] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)]"
          />
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="active"
            defaultChecked={profile?.active ?? true}
            className="h-4 w-4 rounded border-[var(--border)] text-[var(--accent)]"
          />
          <span className="text-sm text-[var(--foreground)]">Perfil ativo</span>
        </label>

        <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
          {profile ? (
            <form action={deleteWhitelabelProfileAction}>
              <input type="hidden" name="id" value={profile.id} />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                <Trash2 className="h-3 w-3" />
                Remover
              </button>
            </form>
          ) : (
            <span />
          )}
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-strong)]"
          >
            {isNew ? "Criar perfil" : "Salvar alterações"}
          </button>
        </div>
      </form>
    </PlatformSurface>
  );
}

function FormField({
  label,
  name,
  defaultValue,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
        {label}
      </span>
      <input
        type="text"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-[0.95rem] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]/60 transition focus:border-[var(--accent)]"
      />
    </label>
  );
}
