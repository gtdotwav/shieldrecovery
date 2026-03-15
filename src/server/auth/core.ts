const SESSION_COOKIE_NAME = "shield_recovery_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

const protectedPagePrefixes = [
  "/dashboard",
  "/connect",
  "/leads",
  "/inbox",
  "/test",
  "/ai",
];

const protectedRoutePrefixes = [
  "/api/",
  "/analytics/recovery",
  "/followups/contacts",
  "/imports/shield-transaction",
  "/payments/retry",
  "/health",
];

const publicRoutePrefixes = [
  "/",
  "/login",
  "/retry/",
  "/api/webhooks/",
  "/webhooks/",
];

type SessionPayload = {
  sub: string;
  exp: number;
};

function getAuthConfig() {
  return {
    email: process.env.PLATFORM_AUTH_EMAIL?.trim().toLowerCase() ?? "",
    password: process.env.PLATFORM_AUTH_PASSWORD?.trim() ?? "",
    secret: process.env.PLATFORM_AUTH_SECRET?.trim() ?? "",
  };
}

function encoder() {
  return new TextEncoder();
}

function toBase64Url(bytes: Uint8Array) {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  const binary = atob(`${normalized}${padding}`);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function importSigningKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    encoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signValue(value: string, secret: string) {
  const key = await importSigningKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder().encode(value));
  return toBase64Url(new Uint8Array(signature));
}

export function getSessionCookieName() {
  return SESSION_COOKIE_NAME;
}

export function getSessionTtlSeconds() {
  return SESSION_TTL_SECONDS;
}

export function isAuthConfigured() {
  const config = getAuthConfig();
  return Boolean(config.email && config.password && config.secret);
}

export async function authenticateCredentials(input: {
  email: string;
  password: string;
}) {
  const config = getAuthConfig();
  const email = input.email.trim().toLowerCase();
  const password = input.password.trim();

  return Boolean(
    config.email &&
      config.password &&
      config.secret &&
      email === config.email &&
      password === config.password,
  );
}

export async function createSessionToken(email: string) {
  const { secret } = getAuthConfig();
  if (!secret) {
    throw new Error("PLATFORM_AUTH_SECRET is not configured.");
  }

  const payload: SessionPayload = {
    sub: email.trim().toLowerCase(),
    exp: Date.now() + SESSION_TTL_SECONDS * 1000,
  };

  const payloadBase64 = toBase64Url(encoder().encode(JSON.stringify(payload)));
  const signature = await signValue(payloadBase64, secret);

  return `${payloadBase64}.${signature}`;
}

export async function verifySessionToken(token?: string | null) {
  if (!token) {
    return null;
  }

  const { secret } = getAuthConfig();
  if (!secret) {
    return null;
  }

  const [payloadBase64, signature] = token.split(".");
  if (!payloadBase64 || !signature) {
    return null;
  }

  try {
    const key = await importSigningKey(secret);
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(signature),
      encoder().encode(payloadBase64),
    );

    if (!isValid) {
      return null;
    }

    const payload = JSON.parse(
      new TextDecoder().decode(fromBase64Url(payloadBase64)),
    ) as SessionPayload;

    if (!payload.sub || !payload.exp || Date.now() > payload.exp) {
      return null;
    }

    return { email: payload.sub, expiresAt: payload.exp };
  } catch {
    return null;
  }
}

export function normalizeNextPath(input?: string | null) {
  if (!input || !input.startsWith("/") || input.startsWith("//")) {
    return "/dashboard";
  }

  if (input.startsWith("/login")) {
    return "/dashboard";
  }

  return input;
}

export function isPublicPath(pathname: string) {
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$/)
  ) {
    return true;
  }

  return publicRoutePrefixes.some((prefix) =>
    prefix === "/" ? pathname === "/" : pathname.startsWith(prefix),
  );
}

export function isProtectedPath(pathname: string) {
  if (isPublicPath(pathname)) {
    return false;
  }

  if (protectedPagePrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }

  if (protectedRoutePrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }

  return false;
}

export function isApiLikePath(pathname: string) {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/analytics/") ||
    pathname.startsWith("/followups/") ||
    pathname.startsWith("/imports/") ||
    pathname.startsWith("/payments/") ||
    pathname === "/health"
  );
}
