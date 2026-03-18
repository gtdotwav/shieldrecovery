import type { CheckoutSession } from "../types";

export function CheckoutSummary({ session }: { session: CheckoutSession }) {
  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: session.currency,
    }).format(v);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
        Resumo
      </p>
      <p className="mt-2 text-lg font-semibold text-gray-900">
        {session.description}
      </p>
      <p className="mt-1 text-2xl font-bold text-gray-900">
        {fmt(session.amount)}
      </p>
      <div className="mt-3 space-y-1 text-sm text-gray-500">
        <p>{session.customerName}</p>
        {session.customerEmail ? <p>{session.customerEmail}</p> : null}
      </div>
    </div>
  );
}
