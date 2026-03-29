"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { platformBrand } from "@/lib/platform";

const b = platformBrand;

const faqs = [
  {
    q: "Como funciona a recuperação automática?",
    a: "Quando um pagamento falha, o webhook captura o evento em tempo real. A IA analisa o contexto — valor, método, histórico do cliente — e envia uma mensagem personalizada via WhatsApp com link de pagamento. Se o cliente não responder, o Call Center IA liga automaticamente. Tudo sem intervenção humana, 24/7.",
  },
  {
    q: "Preciso de equipe técnica para integrar?",
    a: "Não. Basta configurar o webhook do seu gateway para apontar para a nossa URL. O processo leva menos de 5 minutos e não requer nenhuma linha de código. Oferecemos suporte dedicado durante todo o onboarding.",
  },
  {
    q: "Quais gateways de pagamento são suportados?",
    a: "Suportamos os principais gateways do mercado, com novos sendo adicionados continuamente. Nossa API é universal — se o seu gateway envia webhooks, podemos integrá-lo. A integração é via REST API padrão.",
  },
  {
    q: "O cliente não vai se sentir incomodado?",
    a: "Não. Nossas mensagens são contextuais e enviadas no momento certo — logo após a falha, quando o cliente ainda tem intenção de compra. Não é cobrança genérica, é um lembrete inteligente. A taxa de bloqueio é inferior a 0.3%.",
  },
  {
    q: "Meus dados e os dos clientes estão seguros?",
    a: "Sim. Nunca armazenamos dados de cartão — operamos apenas com tokens e links de pagamento. Infraestrutura protegida com criptografia AES-256, isolamento de dados por tenant (RLS) e conformidade total com LGPD e PCI-DSS.",
  },
  {
    q: "Quanto custa?",
    a: "Setup e onboarding são gratuitos. O modelo é 100% baseado em performance — você só paga uma porcentagem sobre a receita efetivamente recuperada. Sem taxa fixa, sem mensalidade, sem contrato mínimo. Se não recuperarmos, você não paga nada.",
  },
  {
    q: "Funciona com Pix, boleto e cartão?",
    a: "Sim. A plataforma gera links de pagamento que aceitam múltiplos métodos. Se o cartão falhou, o cliente pode pagar via Pix instantâneo ou gerar um novo boleto — tudo pelo mesmo link, sem fricção.",
  },
  {
    q: "Qual o tempo médio de recuperação?",
    a: "O primeiro contato acontece em até 2 minutos após a falha. Em média, 68% das recuperações ocorrem nos primeiros 30 minutos, enquanto o cliente ainda tem a intenção de compra ativa.",
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
