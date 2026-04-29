/**
 * Embed tokens — short-lived HMAC-signed tokens for iframe embeds.
 * Flow: Partner calls POST /api/partner/v1/embed → receives token → iframes /embed/recovery?t=TOKEN
 */

const EMBED_TTL_SECONDS = 3600; // 1 hour

function getSecret() {
  const secret = process.env.PLATFORM_AUTH_SECRET?.trim();
  if (!secret) throw new Error("PLATFORM_AUTH_SECRET is not configured.");
  return `embed:${secret}`;
}

function encoder() {
  return new TextEncoder();
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): Uint8Array | null {
  try {
    const padded = str.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(padded);
    const arr = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
    return arr;
  } catch {
    return null;
  }
}

async function sign(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder().encode(value));
  return toBase64Url(new Uint8Array(sig));
}

async function verify(value: string, signature: string, secret: string): Promise<boolean> {
  const sigBytes = fromBase64Url(signature);
  if (!sigBytes) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  return crypto.subtle.verify("HMAC", key, sigBytes.buffer as ArrayBuffer, encoder().encode(value));
}

export type EmbedTokenPayload = {
  sellerKey: string;
  apiKeyId: string;
  exp: number;
};

export async function createEmbedToken(sellerKey: string, apiKeyId: string): Promise<string> {
  const payload: EmbedTokenPayload = {
    sellerKey,
    apiKeyId,
    exp: Math.floor(Date.now() / 1000) + EMBED_TTL_SECONDS,
  };

  const payloadB64 = toBase64Url(encoder().encode(JSON.stringify(payload)));
  const signature = await sign(payloadB64, getSecret());

  return `${payloadB64}.${signature}`;
}

export async function verifyEmbedToken(token: string): Promise<EmbedTokenPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadB64, signature] = parts;

  const isValid = await verify(payloadB64, signature, getSecret());
  if (!isValid) return null;

  const decoded = fromBase64Url(payloadB64);
  if (!decoded) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(decoded)) as EmbedTokenPayload;

    if (Math.floor(Date.now() / 1000) > payload.exp) return null;

    if (!payload.sellerKey || !payload.apiKeyId) return null;

    return payload;
  } catch {
    return null;
  }
}
