export function formatCurrency(value: number) {
  if (!Number.isFinite(value)) {
    return "R$ 0,00";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value / 100);
}

export function formatDateTime(value: string) {
  const date = safeDate(value);

  if (!date) {
    return "sem data";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatRelativeTime(value: string) {
  const hours = hoursSince(value);
  if (!Number.isFinite(hours)) return "sem data";
  if (hours < 1) return "agora";
  if (hours < 24) return `${Math.floor(hours)}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
}

export function hoursSince(value: string) {
  const date = safeDate(value);

  if (!date) {
    return Number.NaN;
  }

  return (Date.now() - date.getTime()) / 1000 / 60 / 60;
}

export function isWithinHours(value: string, hours: number) {
  return hoursSince(value) <= hours;
}

function safeDate(value: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}
