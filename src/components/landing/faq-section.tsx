"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";
import { platformBrand } from "@/lib/platform";

const b = platformBrand;

const faqs = [
  {
    q: "Como funciona a recuperação?",
    a: "Quando um pagamento falha, o webhook captura o evento em tempo real. A IA analisa o contexto e envia uma mensagem personalizada via WhatsApp com link de pagamento. Se não houver resposta, o Call Center IA liga automaticamente. Tudo sem intervenção humana, 24/7.",
  },
  {
    q: "Preciso de equipe técnica para integrar?",
    a: "Não. Basta configurar o webhook do seu gateway para apontar para a nossa URL. O processo leva poucos minutos e não requer código. Oferecemos suporte durante todo o onboarding.",
  },
  {
    q: "Quais gateways são suportados?",
    a: "Suportamos os principais gateways do mercado brasileiro. Nossa API é universal — se o seu gateway envia webhooks, podemos integrá-lo via REST API padrão.",
  },
  {
    q: "Quanto custa?",
    a: "Setup e onboarding são gratuitos. O modelo é 100% baseado em performance — você só paga uma porcentagem sobre a receita efetivamente recuperada. O percentual é definido no onboarding com base no seu volume. Sem resultado, sem custo.",
  },
  {
    q: "O cliente não vai se sentir incomodado?",
    a: "Não. As mensagens são contextuais e enviadas logo após a falha, quando o cliente ainda tem intenção de compra. Não é cobrança genérica — é um lembrete inteligente com link para finalizar o pagamento.",
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
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
  );
}
