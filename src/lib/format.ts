export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatRelativeTime(value: string) {
  const hours = hoursSince(value);
  if (hours < 1) return "agora";
  if (hours < 24) return `${Math.floor(hours)}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
}

export function hoursSince(value: string) {
  return (Date.now() - new Date(value).getTime()) / 1000 / 60 / 60;
}

export function isWithinHours(value: string, hours: number) {
  return hoursSince(value) <= hours;
}
