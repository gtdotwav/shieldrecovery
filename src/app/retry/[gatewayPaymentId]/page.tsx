type RetryPaymentPageProps = {
  params: Promise<{
    gatewayPaymentId: string;
  }>;
};

export default async function RetryPaymentPage({
  params,
}: RetryPaymentPageProps) {
  const { gatewayPaymentId } = await params;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
      <div className="w-full rounded-[2rem] border border-black/[0.08] bg-white p-8 shadow-[0_26px_120px_rgba(15,23,42,0.08)]">
        <p className="text-[0.72rem] uppercase tracking-[0.28em] text-[#ff6a00]">
          Reemissão de pagamento
        </p>
        <h1 className="mt-4 max-w-[14ch] text-4xl font-semibold tracking-tight text-[#1a1a2e]">
          O novo pagamento já foi preparado.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-[#717182]">
          Esta URL funciona como ponto de handoff do retry gerado pela Shield
          Recovery. O checkout final do gateway pode ser plugado aqui sem
          alterar o fluxo da operação.
        </p>

        <div className="mt-6 rounded-[1.25rem] border border-orange-100 bg-orange-50 px-5 py-4">
          <p className="text-[0.68rem] uppercase tracking-[0.18em] text-[#ff8d43]">
            gateway payment id
          </p>
          <p className="mt-2 break-all font-mono text-sm text-[#1a1a2e]">
            {gatewayPaymentId}
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-black/[0.06] bg-[#f9f9fb] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[#9ca3af]">
              Estado atual
            </p>
            <p className="mt-2 text-sm leading-6 text-[#374151]">
              O link foi emitido e está pronto para ser entregue ao cliente pelo
              canal de recovery.
            </p>
          </div>
          <div className="rounded-2xl border border-black/[0.06] bg-[#f9f9fb] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[#9ca3af]">
              Próximo passo
            </p>
            <p className="mt-2 text-sm leading-6 text-[#374151]">
              Assim que o checkout final estiver integrado, esta rota poderá
              redirecionar automaticamente para o pagamento reemitido.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
