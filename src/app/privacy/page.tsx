import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { platformBrand } from "@/lib/platform";

export const metadata = {
  title: "Política de Privacidade",
};

export default function PrivacyPage() {
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
        <ShieldCheck className="h-6 w-6 text-[var(--accent)]" />
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Política de Privacidade
        </h1>
      </div>

      <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
        Última atualização: 29 de março de 2026
      </p>

      <article className="mt-10 space-y-8 text-[0.92rem] leading-7 text-gray-600 dark:text-gray-400">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">1. Introdução</h2>
          <p className="mt-3">
            A {b.name} Tecnologia (&quot;nós&quot;, &quot;nosso&quot;) está comprometida em proteger a privacidade dos dados pessoais
            dos nossos usuários. Esta política descreve como coletamos, usamos, armazenamos e protegemos suas informações
            em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">2. Dados coletados</h2>
          <p className="mt-3">Coletamos apenas os dados estritamente necessários para a operação da plataforma:</p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Dados de pagamentos falhados recebidos via webhook do seu gateway (nome, email, telefone, valor).</li>
            <li>Dados de autenticação (email e senha criptografada) para acesso ao painel.</li>
            <li>Registros de interações de recuperação (mensagens enviadas, ligações, status do lead).</li>
            <li>Dados de navegação (cookies de sessão) para manter sua autenticação.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">3. Uso dos dados</h2>
          <p className="mt-3">Utilizamos os dados exclusivamente para:</p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Executar o fluxo de recuperação de pagamentos (WhatsApp, email, call center IA).</li>
            <li>Gerar analytics e relatórios no dashboard.</li>
            <li>Manter a segurança e integridade da plataforma.</li>
          </ul>
          <p className="mt-3">
            Não vendemos, compartilhamos ou utilizamos seus dados para fins de publicidade ou marketing de terceiros.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">4. Armazenamento e segurança</h2>
          <p className="mt-3">
            Os dados são armazenados em infraestrutura cloud segura (Supabase/AWS) com criptografia em trânsito (TLS)
            e em repouso. Senhas são armazenadas com hash scrypt. Tokens de sessão utilizam HMAC-SHA256.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">5. Seus direitos (LGPD)</h2>
          <p className="mt-3">Conforme a LGPD, você tem direito a:</p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Solicitar acesso aos seus dados pessoais.</li>
            <li>Solicitar correção de dados incompletos ou desatualizados.</li>
            <li>Solicitar exclusão dos seus dados pessoais.</li>
            <li>Revogar o consentimento para uso dos dados.</li>
          </ul>
          <p className="mt-3">
            Para exercer qualquer um desses direitos, entre em contato pelo email{" "}
            <a href="mailto:contato@pagrecovery.com" className="font-medium text-[var(--accent)] hover:underline">
              contato@pagrecovery.com
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">6. Retenção de dados</h2>
          <p className="mt-3">
            Mantemos os dados de recuperação enquanto sua conta estiver ativa. Dados de leads e pagamentos são
            retidos por até 12 meses após a conclusão do processo de recuperação, salvo obrigação legal em contrário.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">7. Contato</h2>
          <p className="mt-3">
            Para dúvidas sobre esta política, entre em contato:{" "}
            <a href="mailto:contato@pagrecovery.com" className="font-medium text-[var(--accent)] hover:underline">
              contato@pagrecovery.com
            </a>
          </p>
        </section>
      </article>
    </main>
  );
}
