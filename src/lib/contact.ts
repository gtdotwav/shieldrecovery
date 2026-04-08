export const UNKNOWN_EMAIL = "unknown@pagrecovery.local";
export const NOT_PROVIDED = "not_provided";

export function hasPhone(value: string) {
  return value !== NOT_PROVIDED && value.replace(/\D/g, "").length >= 10;
}

export function hasReachableChannel(phone: string, email: string) {
  return hasPhone(phone) || (Boolean(email) && email !== UNKNOWN_EMAIL);
}

export function pickBestContact(phone: string, email: string) {
  if (hasPhone(phone)) return phone;
  if (email && email !== UNKNOWN_EMAIL) return email;
  return "Sem contato";
}

export function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 13) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  return value;
}
