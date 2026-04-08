import Link from "next/link";
import { ArrowLeft, FileCheck } from "lucide-react";

import { platformBrand } from "@/lib/platform";

export const metadata = {
  title: "Termos de Uso",
};

export default function TermsPage() {
  const b = platformBrand;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-8 sm:py-20">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-[var(--accent)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar
      </Link>

      <div className="mt-8 flex items-center gap-3">
        <FileCheck className="h-6 w-6 text-[var(--accent)]" />
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Termos de Uso
        </h1>
      </div>

      <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
        Última atualização: 29 de março de 2026
      </p>

      <article className="mt-10 space-y-8 text-[0.92rem] leading-7 text-gray-600 dark:text-gray-400">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">1. Aceitação dos termos</h2>
          <p className="mt-3">
            Ao acessar e utilizar a plataforma {b.name}, você concorda com estes Termos de Uso.
            Se não concordar com qualquer parte destes termos, não utilize a plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">2. Descrição do serviço</h2>
          <p className="mt-3">
            A {b.name} é uma plataforma de recuperação autônoma de pagamentos que utiliza inteligência artificial,
            WhatsApp automatizado e call center de agentes IA para recuperar pagamentos falhados em nome do contratante.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">3. Responsabilidades do contratante</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Configurar corretamente os webhooks do gateway de pagamento.</li>
            <li>Manter os dados de acesso em sigilo.</li>
            <li>Garantir que possui autorização para contatar os clientes cujos pagamentos falharam.</li>
            <li>Cumprir as regulamentações aplicáveis ao seu setor de atuação.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">4. Responsabilidades da {b.name}</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Manter a plataforma operacional e segura.</li>
            <li>Processar os dados conforme a LGPD e nossa Política de Privacidade.</li>
            <li>Executar o fluxo de recuperação conforme configurado pelo contratante.</li>
            <li>Fornecer suporte técnico durante o horário comercial.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">5. Modelo de cobrança</h2>
          <p className="mt-3">
            A {b.name} opera em modelo de comissão sobre recuperação. O percentual é definido durante o onboarding
            com base no volume da operação. Não há taxas de setup, mensalidade ou custos ocultos.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">6. Limitação de responsabilidade</h2>
          <p className="mt-3">
            A {b.name} não se responsabiliza por falhas no gateway de pagamento, indisponibilidade de
            serviços de terceiros (WhatsApp, provedores de voz) ou por decisões do cliente final de não
            efetuar o pagamento. A plataforma atua como facilitadora do processo de recuperação.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">7. Propriedade intelectual</h2>
          <p className="mt-3">
            Todo o conteúdo, código, design e funcionalidades da plataforma {b.name} são de propriedade
            exclusiva da {b.name} Tecnologia. O uso da plataforma não concede ao contratante qualquer
            direito de propriedade intelectual sobre a mesma.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">8. Rescisão</h2>
          <p className="mt-3">
            Qualquer uma das partes pode rescindir o uso da plataforma a qualquer momento.
            Dados serão retidos conforme descrito na Política de Privacidade.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">9. Contato</h2>
          <p className="mt-3">
            Para dúvidas sobre estes termos:{" "}
            <a href={`mailto:${b.contactEmail}`} className="font-medium text-[var(--accent)] hover:underline">
              {b.contactEmail}
            </a>
          </p>
        </section>
      </article>
    </main>
  );
}
