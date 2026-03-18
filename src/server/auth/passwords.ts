import { scryptSync, timingSafeEqual } from "node:crypto";

const PASSWORD_NAMESPACE = "shield-recovery-seller-auth";

function deriveKey(password: string) {
  return scryptSync(password, PASSWORD_NAMESPACE, 64);
}

export function hashPlatformPassword(password: string) {
  return deriveKey(password).toString("hex");
}

export function verifyPlatformPassword(password: string, hash: string) {
  if (!hash) {
    return false;
  }

  const incoming = deriveKey(password);
  const stored = Buffer.from(hash, "hex");

  if (incoming.byteLength !== stored.byteLength) {
    return false;
  }

  return timingSafeEqual(incoming, stored);
}
