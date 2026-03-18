import { SESSION_STATUS_LABELS } from "../constants";
import type { CheckoutSessionStatus } from "../types";

const STATUS_CONFIG: Record<
  string,
  { icon: string; color: string; bgColor: string; borderColor: string }
> = {
  paid: {
    icon: "✓",
    color: "text-green-700",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  failed: {
    icon: "✕",
    color: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
  expired: {
    icon: "⏱",
    color: "text-gray-500",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
  },
  abandoned: {
    icon: "—",
    color: "text-gray-400",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
  },
};

export function CheckoutStatus({
  status,
}: {
  status: CheckoutSessionStatus;
}) {
  const config = STATUS_CONFIG[status];
  if (!config) return null;

  const label = SESSION_STATUS_LABELS[status] ?? status;

  return (
    <div
      className={`rounded-2xl border ${config.borderColor} ${config.bgColor} p-8 text-center`}
    >
      <p className={`text-4xl ${config.color}`}>{config.icon}</p>
      <p className={`mt-3 text-lg font-semibold ${config.color}`}>{label}</p>
      {status === "paid" ? (
        <p className="mt-1 text-sm text-gray-500">
          Pagamento confirmado com sucesso!
        </p>
      ) : status === "expired" ? (
        <p className="mt-1 text-sm text-gray-500">
          Esta sessão expirou. Solicite um novo link de pagamento.
        </p>
      ) : status === "failed" ? (
        <p className="mt-1 text-sm text-gray-500">
          Houve um erro no pagamento. Tente novamente.
        </p>
      ) : null}
    </div>
  );
}
