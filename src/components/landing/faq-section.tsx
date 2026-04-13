"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";
import { platformBrand } from "@/lib/platform";

const b = platformBrand;

const faqs = [
  {
    q: "Como funciona exatamente?",
    a: "Você conecta seu gateway de pagamento via webhook. Quando um pagamento falha, nossa IA detecta em segundos, contata o cliente via WhatsApp com uma mensagem personalizada e envia um link de re-pagamento. O processo inteiro leva menos de 2 minutos.",
  },
  {
    q: "Quanto custa?",
    a: "Cobramos uma comissão apenas sobre pagamentos efetivamente recuperados. Sem taxa de setup, sem mensalidade, sem custo fixo. Você só paga quando ganha. Exemplo: se recuperamos R$1.000, a comissão é de R$150 (15%).",
  },
  {
    q: "Meus dados e dos meus clientes estão seguros?",
    a: "Sim. Usamos criptografia AES-256 em repouso e TLS 1.3 em trânsito. Somos compatíveis com LGPD e PCI-DSS. Seus dados nunca são compartilhados com terceiros. Tokens de sessão usam HMAC-SHA256 com rotação automática.",
  },
  {
    q: "Quais gateways são suportados?",
    a: "Pagou.ai, PagNet, BuckPay, SuperPay, e Stripe. Novos gateways podem ser integrados em menos de 48 horas via webhook padrão. Contate nosso time para integração customizada.",
  },
  {
    q: "O cliente não vai se sentir incomodado?",
    a: "Não. Respeitamos limites de frequência (frequency capping), horários comerciais, e o cliente pode sair da lista a qualquer momento (opt-out LGPD). A IA adapta o tom da mensagem ao perfil do cliente.",
  },
  {
    q: "Quanto tempo leva para começar?",
    a: "Menos de 30 minutos. Você cria a conta, configura o webhook do seu gateway, e nossa IA começa a monitorar imediatamente. Sem integração complexa, sem equipe técnica necessária.",
  },
  {
    q: "Posso cancelar a qualquer momento?",
    a: "Sim. Sem contrato de fidelidade, sem multa de cancelamento. Você pode pausar ou cancelar quando quiser pelo painel administrativo.",
  },
  {
    q: "Recebo relatórios e métricas?",
    a: "Sim. Dashboard em tempo real com taxa de recuperação, funil de conversão, breakdown por canal (WhatsApp, Email, Voz), histórico completo, e exportação CSV. Também temos app mobile com push notifications.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.a,
    },
  })),
};

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <>
      <div className="mx-auto max-w-[42rem] space-y-3">
        {faqs.map((faq, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl transition-colors duration-300"
            style={{
              border: `1px solid rgba(255,255,255,${open === i ? "0.08" : "0.04"})`,
              background: `rgba(${b.slug === "pagrecovery" ? "6,20,15" : "13,13,13"},${open === i ? "0.6" : "0.35"})`,
            }}
          >
            <button
              className="flex w-full items-center justify-between px-6 py-5 text-left transition-colors"
              onClick={() => setOpen(open === i ? null : i)}
            >
              <span className="pr-4 text-[0.88rem] font-semibold text-gray-200">
                {faq.q}
              </span>
              <motion.div
                animate={{ rotate: open === i ? 180 : 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="shrink-0"
              >
                <ChevronDown
                  className="h-4 w-4"
                  style={{ color: open === i ? b.accent : "rgb(107,114,128)" }}
                />
              </motion.div>
            </button>

            <AnimatePresence initial={false}>
              {open === i && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <p className="px-6 pb-5 text-[0.82rem] leading-[1.8] text-gray-400">
                    {faq.a}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
