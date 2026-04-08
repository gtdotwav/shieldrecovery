import Link from "next/link";
import { ArrowLeft, ArrowRight, Copy } from "lucide-react";

import {
  PlatformAppPage,
  PlatformPill,
  PlatformSurface,
} from "@/components/platform/platform-shell";
import { CopyButton } from "@/components/ui/copy-button";
import { platformBrand, buildGatewayWebhookPath } from "@/lib/platform";
import { getSellerIdentityByEmail } from "@/server/auth/identities";
import { requireAuthenticatedSession } from "@/server/auth/session";
import { getConnectionSettingsService } from "@/server/recovery/services/connection-settings-service";

export const metadata = {
  title: "Documentacao da API",
};

const BASE_DOMAIN = process.env.NEXT_PUBLIC_APP_URL || "https://pagrecovery.com";

export default async function ConnectDocsPage() {
  const session = await requireAuthenticatedSession(["admin", "seller", "market"]);
  const settingsService = getConnectionSettingsService();
  const runtimeSettings = await settingsService.getRuntimeSettings();
  const sellerIdentity =
    session.role === "seller"
      ? await getSellerIdentityByEmail(session.email)
      : null;

  const sellerKey =
    sellerIdentity?.agentName ?? sellerIdentity?.displayName ?? null;
  const webhookPath = buildGatewayWebhookPath(sellerKey);
  const webhookUrl = `${BASE_DOMAIN}${webhookPath}`;
  const whatsappWebhookUrl = `${BASE_DOMAIN}/api/webhooks/whatsapp`;

  return (
    <PlatformAppPage
      currentPath="/connect"
      action={
        <Link
          href="/connect"
          className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] dark:border-white/10 bg-white dark:bg-[#1a1a1a] px-3.5 py-1.5 text-xs font-semibold text-gray-900 dark:text-gray-100 transition-colors hover:bg-gray-50 dark:hover:bg-[#222]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar
        </Link>
      }
    >
      {/* Header */}
      <PlatformSurface className="p-5 sm:p-6">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-green-600">
          Documentacao da API
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-[1.95rem]">
          Integre seu gateway com a {platformBrand.name}.
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">
          A {platformBrand.name} recebe webhooks de pagamento do seu gateway e cuida de
          todo o processo de recuperacao — contato com o cliente, follow-up
          automatico via WhatsApp e relatorios. Voce so precisa apontar os
          webhooks para a URL abaixo.
        </p>
      </PlatformSurface>

      {/* Quick start */}
      <PlatformSurface className="mt-5 p-5 sm:p-6">
        <SectionTitle number="1" title="Sua URL de webhook" />
        <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
          Configure seu gateway para enviar webhooks de pagamento para esta URL.
          Todos os eventos chegam aqui e a plataforma decide automaticamente
          quando iniciar a recuperacao.
        </p>
        <div className="mt-4 rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-gray-50 dark:bg-[#111] px-4 py-4">
          <p className="break-all font-mono text-sm leading-7 text-gray-900 dark:text-gray-100">
            {webhookUrl}
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <CopyButton value={webhookUrl} />
        </div>
        <div className="mt-4 rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-gray-50 dark:bg-[#111] px-4 py-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
          Metodo: <span className="font-medium text-gray-900 dark:text-gray-100">POST</span> | Content-Type:{" "}
          <span className="font-medium text-gray-900 dark:text-gray-100">application/json</span> | Sem autenticacao necessaria — basta enviar o JSON.
        </div>
      </PlatformSurface>

      {/* Como funciona */}
      <PlatformSurface className="mt-5 p-5 sm:p-6">
        <SectionTitle number="2" title="Como funciona" />
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <StepCard
            step="1"
            title="Webhook recebido"
            description="Seu gateway envia um evento de pagamento (falha, recusa ou expiracao) para a URL acima."
          />
          <StepCard
            step="2"
            title="Recuperacao automatica"
            description={`A ${platformBrand.name} identifica o cliente, cria um lead e inicia contato via WhatsApp com link de pagamento.`}
          />
          <StepCard
            step="3"
            title="Follow-up inteligente"
            description="A IA faz follow-up automatico, oferece metodos alternativos e acompanha ate a conversao ou fechamento."
          />
        </div>
      </PlatformSurface>

      {/* Eventos suportados */}
      <PlatformSurface className="mt-5 p-5 sm:p-6">
        <SectionTitle number="3" title="Eventos suportados" />
        <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
          O endpoint aceita qualquer evento de pagamento. A recuperacao e
          disparada automaticamente para os eventos marcados abaixo.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/[0.06] dark:border-white/[0.06] text-left">
                <th className="pb-3 pr-4 font-semibold text-gray-900 dark:text-white">event_type</th>
                <th className="pb-3 pr-4 font-semibold text-gray-900 dark:text-white">Descricao</th>
                <th className="pb-3 font-semibold text-gray-900 dark:text-white">Acao</th>
              </tr>
            </thead>
            <tbody className="text-gray-500 dark:text-gray-400">
              <EventRow type="payment_failed" desc="Pagamento falhou" action="Inicia recuperacao" recoverable />
              <EventRow type="payment_refused" desc="Pagamento recusado pelo emissor" action="Inicia recuperacao" recoverable />
              <EventRow type="payment_expired" desc="Pagamento expirou sem conclusao" action="Inicia recuperacao" recoverable />
              <EventRow type="payment_succeeded" desc="Pagamento aprovado" action="Marca lead como recuperado" />
              <EventRow type="payment_created" desc="Pagamento criado" action="Registra no sistema" />
              <EventRow type="payment_pending" desc="Aguardando pagamento" action="Registra no sistema" />
              <EventRow type="payment_canceled" desc="Pagamento cancelado" action="Registra no sistema" />
              <EventRow type="payment_refunded" desc="Pagamento estornado" action="Registra no sistema" />
              <EventRow type="payment_chargeback" desc="Chargeback recebido" action="Registra no sistema" />
            </tbody>
          </table>
        </div>
        <div className="mt-4 rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-gray-50 dark:bg-[#111] px-4 py-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
          O campo <Code>event_type</Code> e opcional. Se nao enviado, o sistema infere pelo campo <Code>status</Code> do pagamento.
          Valores como <Code>failed</Code>, <Code>refused</Code>, <Code>declined</Code>, <Code>expired</Code> sao reconhecidos automaticamente.
        </div>
      </PlatformSurface>

      {/* Payload completo */}
      <PlatformSurface className="mt-5 p-5 sm:p-6">
        <SectionTitle number="4" title="Payload do webhook" />
        <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
          Envie um <Code>POST</Code> com o JSON abaixo. Campos marcados com * sao obrigatorios.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/[0.06] dark:border-white/[0.06] text-left">
                <th className="pb-3 pr-4 font-semibold text-gray-900 dark:text-white">Campo</th>
                <th className="pb-3 pr-4 font-semibold text-gray-900 dark:text-white">Tipo</th>
                <th className="pb-3 font-semibold text-gray-900 dark:text-white">Descricao</th>
              </tr>
            </thead>
            <tbody className="text-gray-500 dark:text-gray-400">
              <FieldRow field="event_type" type="string" desc="Tipo do evento (ex: payment_failed). Opcional — inferido pelo status." />
              <FieldRow field="payment.id *" type="string" desc="ID unico da transacao no seu gateway" />
              <FieldRow field="payment.order_id" type="string" desc="ID do pedido (referencia interna)" />
              <FieldRow field="payment.amount *" type="number" desc="Valor em centavos (19900 = R$ 199,00)" />
              <FieldRow field="payment.currency" type="string" desc="Moeda (padrao: BRL)" />
              <FieldRow field="payment.method *" type="string" desc="pix | credit_card | boleto" />
              <FieldRow field="payment.status *" type="string" desc="failed | refused | expired | paid | pending" />
              <FieldRow field="payment.failure_code" type="string" desc="Codigo do erro (ex: insufficient_funds, card_declined)" />
              <FieldRow field="customer.name *" type="string" desc="Nome completo do cliente" />
              <FieldRow field="customer.email" type="string" desc="Email do cliente" />
              <FieldRow field="customer.phone *" type="string" desc="WhatsApp com DDI (5511999998888)" />
              <FieldRow field="customer.cpf" type="string" desc="CPF do cliente (somente numeros)" />
              <FieldRow field="metadata.product" type="string" desc="Nome do produto ou plano" />
            </tbody>
          </table>
        </div>
      </PlatformSurface>

      {/* Exemplos */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <PlatformSurface className="p-5">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-green-600">
            Exemplo PIX
          </p>
          <h3 className="mt-2 text-[1.05rem] font-semibold text-gray-900 dark:text-white">Pagamento PIX que falhou</h3>
          <CodeBlock>{`POST ${webhookUrl}
Content-Type: application/json

{
  "event_type": "payment_failed",
  "payment": {
    "id": "pix_9f8a7b6c",
    "order_id": "pedido_1234",
    "amount": 29900,
    "method": "pix",
    "status": "expired"
  },
  "customer": {
    "name": "Maria Santos",
    "phone": "5511988887777",
    "cpf": "98765432100"
  },
  "metadata": {
    "product": "Assinatura Mensal"
  }
}`}</CodeBlock>
        </PlatformSurface>

        <PlatformSurface className="p-5">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-green-600">
            Exemplo Cartao
          </p>
          <h3 className="mt-2 text-[1.05rem] font-semibold text-gray-900 dark:text-white">Cartao recusado</h3>
          <CodeBlock>{`POST ${webhookUrl}
Content-Type: application/json

{
  "event_type": "payment_refused",
  "payment": {
    "id": "card_x1y2z3",
    "order_id": "pedido_5678",
    "amount": 49900,
    "method": "credit_card",
    "status": "refused",
    "failure_code": "card_declined"
  },
  "customer": {
    "name": "Carlos Oliveira",
    "email": "carlos@email.com",
    "phone": "5521977776666",
    "cpf": "11122233344"
  },
  "metadata": {
    "product": "Plano Anual"
  }
}`}</CodeBlock>
        </PlatformSurface>
      </div>

      {/* Resposta */}
      <PlatformSurface className="mt-5 p-5 sm:p-6">
        <SectionTitle number="5" title="Resposta do webhook" />
        <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
          O endpoint sempre retorna <Code>200 OK</Code> com um JSON indicando o resultado.
        </p>
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Sucesso (evento novo)</p>
            <CodeBlock>{`{
  "ok": true,
  "accepted": true,
  "queued": true,
  "webhook_id": "pix_9f8a7b6c::seller",
  "event_type": "payment_failed",
  "seller_key": "seller"
}`}</CodeBlock>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Duplicado (ja recebido)</p>
            <CodeBlock>{`{
  "ok": true,
  "duplicate": true,
  "accepted": false,
  "webhook_id": "pix_9f8a7b6c::seller",
  "event_type": "payment_failed"
}`}</CodeBlock>
          </div>
        </div>
      </PlatformSurface>

      {/* Teste rapido */}
      <PlatformSurface className="mt-5 p-5 sm:p-6">
        <SectionTitle number="6" title="Teste rapido com cURL" />
        <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
          Cole este comando no terminal para testar a integracao imediatamente.
        </p>
        <CodeBlock>{`curl -X POST ${webhookUrl} \\
  -H "Content-Type: application/json" \\
  -d '{
    "payment": {
      "id": "teste_001",
      "amount": 9900,
      "method": "pix",
      "status": "failed"
    },
    "customer": {
      "name": "Teste ${platformBrand.name}",
      "phone": "5511999990000",
      "cpf": "00000000000"
    }
  }'`}</CodeBlock>
      </PlatformSurface>

      {/* Compatibilidade */}
      <PlatformSurface className="mt-5 p-5 sm:p-6">
        <SectionTitle number="7" title="Compatibilidade de gateways" />
        <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
          O normalizer da {platformBrand.name} e flexivel e reconhece payloads de diversos gateways
          brasileiros. Os campos sao mapeados automaticamente:
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/[0.06] dark:border-white/[0.06] text-left">
                <th className="pb-3 pr-4 font-semibold text-gray-900 dark:text-white">Seu campo</th>
                <th className="pb-3 font-semibold text-gray-900 dark:text-white">Alternativas aceitas</th>
              </tr>
            </thead>
            <tbody className="text-gray-500 dark:text-gray-400">
              <MappingRow field="payment.id" alternatives="id, payment_id, transaction_id, transactionId, secureId" />
              <MappingRow field="payment.amount" alternatives="amount, total_amount, paid_amount, paidAmount" />
              <MappingRow field="payment.method" alternatives="method, paymentMethod, payment_method, method_id" />
              <MappingRow field="payment.status" alternatives="status (em qualquer nivel do JSON)" />
              <MappingRow field="customer.name" alternatives="name, customer_name, buyer_name" />
              <MappingRow field="customer.email" alternatives="email, buyer_email" />
              <MappingRow field="customer.phone" alternatives="phone, mobile, mobilePhone, buyer_phone" />
              <MappingRow field="customer.cpf" alternatives="cpf, document, cnpj, tax_id, taxId, buyer_document" />
              <MappingRow field="event_type" alternatives="event_type, type, eventName, event, eventType" />
            </tbody>
          </table>
        </div>
        <div className="mt-4 rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-gray-50 dark:bg-[#111] px-4 py-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
          Se o seu gateway envia o payload em um formato diferente, o sistema tenta extrair
          os dados de objetos aninhados como <Code>data</Code>, <Code>payment</Code>,{" "}
          <Code>customer</Code>, <Code>buyer</Code> e <Code>metadata</Code>.
        </div>
      </PlatformSurface>

      {/* O que a plataforma faz */}
      <PlatformSurface className="mt-5 p-5 sm:p-6">
        <SectionTitle number="8" title={`O que a ${platformBrand.name} faz por voce`} />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <FeatureItem title="Contato automatico" desc="Envia mensagem no WhatsApp do cliente em segundos apos a falha." />
          <FeatureItem title="Link de pagamento" desc="Gera link PIX ou cartao para o cliente pagar na hora." />
          <FeatureItem title="Follow-up com IA" desc="A IA faz follow-up inteligente respeitando horario e contexto." />
          <FeatureItem title="Multiplos metodos" desc="Se PIX falhou, oferece cartao. Se cartao falhou, oferece PIX." />
          <FeatureItem title="Deduplicacao" desc="Webhooks duplicados sao ignorados automaticamente — pode reenviar sem medo." />
          <FeatureItem title="Relatorios em tempo real" desc="Acompanhe taxas de recuperacao, leads ativos e conversoes no dashboard." />
        </div>
      </PlatformSurface>

      {/* Suporte */}
      <PlatformSurface className="mt-5 p-5 sm:p-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Precisa de ajuda com a integracao?</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Se o seu gateway tem um formato diferente, entre em contato que adaptamos o normalizer.
            </p>
          </div>
          <Link
            href="/connect"
            className="inline-flex items-center gap-1.5 rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700"
          >
            Voltar as integracoes
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </PlatformSurface>
    </PlatformAppPage>
  );
}

/* -- Helper components -- */

function SectionTitle({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">
        {number}
      </span>
      <h2 className="text-[1.15rem] font-semibold tracking-tight text-gray-900 dark:text-white">{title}</h2>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-gray-50 dark:bg-[#111] p-4">
      <p className="text-xs font-bold text-green-600">Passo {step}</p>
      <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
      <p className="mt-1.5 text-sm leading-6 text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-gray-100 dark:bg-[#222] px-1.5 py-0.5 text-gray-900 dark:text-gray-100">
      {children}
    </code>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="mt-3 rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-[#1a1a2e] p-4 text-sm leading-6">
      <pre className="overflow-x-auto text-[#c8ccd4]">{children}</pre>
    </div>
  );
}

function EventRow({
  type,
  desc,
  action,
  recoverable,
}: {
  type: string;
  desc: string;
  action: string;
  recoverable?: boolean;
}) {
  return (
    <tr className="border-b border-black/[0.04] dark:border-white/[0.04]">
      <td className="py-2.5 pr-4 font-mono text-xs text-gray-900 dark:text-gray-100">{type}</td>
      <td className="py-2.5 pr-4">{desc}</td>
      <td className="py-2.5">
        {recoverable ? (
          <span className="rounded-full bg-green-50 dark:bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-400">
            {action}
          </span>
        ) : (
          <span className="text-xs">{action}</span>
        )}
      </td>
    </tr>
  );
}

function FieldRow({
  field,
  type,
  desc,
}: {
  field: string;
  type: string;
  desc: string;
}) {
  const required = field.includes("*");
  const cleanField = field.replace(" *", "");
  return (
    <tr className="border-b border-black/[0.04] dark:border-white/[0.04]">
      <td className="py-2.5 pr-4">
        <span className="font-mono text-xs text-gray-900 dark:text-gray-100">{cleanField}</span>
        {required ? <span className="ml-1 text-xs text-red-500">*</span> : null}
      </td>
      <td className="py-2.5 pr-4 font-mono text-xs text-gray-400 dark:text-gray-500">{type}</td>
      <td className="py-2.5 text-sm">{desc}</td>
    </tr>
  );
}

function MappingRow({
  field,
  alternatives,
}: {
  field: string;
  alternatives: string;
}) {
  return (
    <tr className="border-b border-black/[0.04] dark:border-white/[0.04]">
      <td className="py-2.5 pr-4 font-mono text-xs font-medium text-gray-900 dark:text-gray-100">{field}</td>
      <td className="py-2.5 font-mono text-xs text-gray-400 dark:text-gray-500">{alternatives}</td>
    </tr>
  );
}

function FeatureItem({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-gray-50 dark:bg-[#111] px-4 py-3">
      <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
      <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">{desc}</p>
    </div>
  );
}
