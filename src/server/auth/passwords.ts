import { scryptSync, timingSafeEqual, randomBytes } from "node:crypto";

const LEGACY_NAMESPACE = "pagrecovery-seller-auth";
const SALT_LENGTH = 32;

function deriveKey(password: string, salt: Buffer) {
  return scryptSync(password, salt, 64);
}

/**
 * Hash a password with a random salt.
 * Returns "salt_hex:hash_hex" for storage.
 */
export function hashPlatformPassword(password: string) {
  const salt = randomBytes(SALT_LENGTH);
  const hash = deriveKey(password, salt);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

/**
 * Verify a password against a stored hash.
 * Supports both new format "salt:hash" and legacy format (plain hex with static salt).
 */
export function verifyPlatformPassword(password: string, storedHash: string) {
  if (!storedHash) {
    return false;
  }

  let incoming: Buffer;
  let stored: Buffer;

  if (storedHash.includes(":")) {
    // New format: "salt_hex:hash_hex"
    const [saltHex, hashHex] = storedHash.split(":");
    const salt = Buffer.from(saltHex, "hex");
    stored = Buffer.from(hashHex, "hex");
    incoming = deriveKey(password, salt);
  } else {
    // Legacy format: plain hex hash with static namespace salt
    stored = Buffer.from(storedHash, "hex");
    incoming = scryptSync(password, LEGACY_NAMESPACE, 64);
  }

  if (incoming.byteLength !== stored.byteLength) {
    return false;
  }

  return timingSafeEqual(incoming, stored);
}
