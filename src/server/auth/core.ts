const SESSION_COOKIE_NAME = "pagrecovery_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

const publicRoutePrefixes = [
  "/",
  "/login",
  "/quiz",
  "/privacy",
  "/terms",
  "/invite/",
  "/retry/",
  "/checkout/",
  "/api/checkout/",
  "/api/webhooks/",
  "/api/worker/",
  "/api/cron/",
  "/api/auth/token",
  "/api/calls/demo",
  "/api/health",
  "/webhooks/",
];

export type UserRole = "admin" | "seller" | "market";

type SessionPayload = {
  sub: string;
  role: UserRole;
  exp: number;
};

type CredentialSet = {
  adminEmail: string;
  adminPassword: string;
  sellerEmail: string;
  sellerPassword: string;
  sellerAgentName: string;
  marketEmail?: string;
  marketPassword?: string;
};

function getAuthConfig() {
  return {
    secret: process.env.PLATFORM_AUTH_SECRET?.trim() ?? "",
    primary: {
      adminEmail: process.env.PLATFORM_AUTH_EMAIL?.trim().toLowerCase() ?? "",
      adminPassword: process.env.PLATFORM_AUTH_PASSWORD?.trim() ?? "",
      sellerEmail: process.env.PLATFORM_SELLER_AUTH_EMAIL?.trim().toLowerCase() ?? "",
      sellerPassword: process.env.PLATFORM_SELLER_AUTH_PASSWORD?.trim() ?? "",
      sellerAgentName: process.env.PLATFORM_SELLER_AGENT_NAME?.trim() ?? "",
    } satisfies CredentialSet,
  };
}

function getAllCredentialSets(): CredentialSet[] {
  const { primary } = getAuthConfig();
  const sets: CredentialSet[] = [primary];

  const shieldAdmin = process.env.SHIELD_AUTH_EMAIL?.trim().toLowerCase();
  if (shieldAdmin) {
    sets.push({
      adminEmail: shieldAdmin,
      adminPassword: process.env.SHIELD_AUTH_PASSWORD?.trim() ?? "",
      sellerEmail: process.env.SHIELD_SELLER_AUTH_EMAIL?.trim().toLowerCase() ?? "",
      sellerPassword: process.env.SHIELD_SELLER_AUTH_PASSWORD?.trim() ?? "",
      sellerAgentName: process.env.SHIELD_SELLER_AGENT_NAME?.trim() ?? process.env.PLATFORM_SELLER_AGENT_NAME?.trim() ?? "",
    });
  }

  // Additional platform admins (from env vars)
  const extraAdminEmail = process.env.EXTRA_ADMIN_EMAIL?.trim().toLowerCase();
  const extraSellerEmail = process.env.EXTRA_SELLER_EMAIL?.trim().toLowerCase();
  const extraMarketEmail = process.env.MARKET_AUTH_EMAIL?.trim().toLowerCase();
  if (extraAdminEmail || extraSellerEmail || extraMarketEmail) {
    sets.push({
      adminEmail: extraAdminEmail ?? "",
      adminPassword: process.env.EXTRA_ADMIN_PASSWORD?.trim() ?? "",
      sellerEmail: extraSellerEmail ?? "",
      sellerPassword: process.env.EXTRA_SELLER_PASSWORD?.trim() ?? "",
      sellerAgentName: process.env.EXTRA_SELLER_AGENT_NAME?.trim() ?? "",
      marketEmail: extraMarketEmail,
      marketPassword: process.env.MARKET_AUTH_PASSWORD?.trim() ?? "",
    });
  }

  return sets;
}

const protectedPathRoles: Array<{ prefix: string; roles: UserRole[] }> = [
  { prefix: "/onboarding", roles: ["admin", "seller", "market"] },
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/dashboard", roles: ["admin", "seller", "market"] },
  { prefix: "/connect", roles: ["admin", "seller", "market"] },
  { prefix: "/calendar", roles: ["admin", "seller", "market"] },
  { prefix: "/inbox", roles: ["admin", "seller", "market"] },
  { prefix: "/test", roles: ["admin"] },
  { prefix: "/ai", roles: ["admin", "seller", "market"] },
  { prefix: "/leads", roles: ["admin", "seller", "market"] },
  { prefix: "/api/settings/connections", roles: ["admin"] },
  // /api/health is now a public route (no auth required)
  { prefix: "/api/import", roles: ["admin"] },
  { prefix: "/api/payments/retry", roles: ["admin"] },
  { prefix: "/api/analytics/recovery", roles: ["admin"] },
  { prefix: "/api/followups/contacts", roles: ["admin"] },
  { prefix: "/api/export", roles: ["admin"] },
  { prefix: "/api/leads", roles: ["admin", "seller", "market"] },
  { prefix: "/api/inbox", roles: ["admin", "seller", "market"] },
  { prefix: "/api/dashboard", roles: ["admin"] },
  { prefix: "/api/keys", roles: ["admin"] },
  { prefix: "/api/admin", roles: ["admin"] },
  { prefix: "/api/mobile", roles: ["admin", "seller", "market"] },
  { prefix: "/api/push", roles: ["admin", "seller", "market"] },
  { prefix: "/calling", roles: ["admin", "seller", "market"] },
  { prefix: "/api/calls", roles: ["admin", "seller", "market"] },
  { prefix: "/api/calendar", roles: ["admin", "seller", "market"] },
  { prefix: "/marketing", roles: ["admin", "market"] },
  { prefix: "/api/marketing", roles: ["admin", "market"] },
  { prefix: "/analytics/recovery", roles: ["admin"] },
  { prefix: "/followups/contacts", roles: ["admin"] },
  { prefix: "/imports/shield-transaction", roles: ["admin"] },
  { prefix: "/payments/retry", roles: ["admin"] },
  { prefix: "/health", roles: ["admin"] },
];

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function encoder() {
  return new TextEncoder();
}

function toBase64Url(bytes: Uint8Array) {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
    const binary = atob(`${normalized}${padding}`);
    const arr = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
    return arr;
  } catch {
    return null;
  }
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
  if (!config.secret) return false;
  const sets = getAllCredentialSets();
  return sets.some(
    (s) =>
      (s.adminEmail && s.adminPassword) ||
      (s.sellerEmail && s.sellerPassword),
  );
}

function constantTimeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const bufA = enc.encode(a);
  const bufB = enc.encode(b);
  if (bufA.length !== bufB.length) return false;
  let diff = 0;
  for (let i = 0; i < bufA.length; i++) diff |= bufA[i] ^ bufB[i];
  return diff === 0;
}

export async function authenticateCredentials(input: {
  email: string;
  password: string;
}) {
  const { secret } = getAuthConfig();
  if (!secret) return null;

  const email = normalizeEmail(input.email);
  const password = input.password.trim();

  // Always evaluate ALL credential sets with constant-time comparisons
  // for both email and password to prevent timing-based enumeration.
  let matched: { email: string; role: "admin" | "seller" | "market" } | null = null;

  for (const set of getAllCredentialSets()) {
    // Admin check — always run both comparisons
    if (set.adminEmail && set.adminPassword) {
      const emailMatch = constantTimeEqual(email, set.adminEmail);
      const passMatch = constantTimeEqual(password, set.adminPassword);
      if (emailMatch && passMatch) {
        matched = { email, role: "admin" as const };
      }
    }

    // Seller check
    if (set.sellerEmail && set.sellerPassword) {
      const emailMatch = constantTimeEqual(email, set.sellerEmail);
      const passMatch = constantTimeEqual(password, set.sellerPassword);
      if (emailMatch && passMatch) {
        matched = { email, role: "seller" as const };
      }
    }

    // Market check
    if (set.marketEmail && set.marketPassword) {
      const emailMatch = constantTimeEqual(email, set.marketEmail);
      const passMatch = constantTimeEqual(password, set.marketPassword);
      if (emailMatch && passMatch) {
        matched = { email, role: "market" as const };
      }
    }
  }

  return matched;
}

export async function createSessionToken(email: string, role: UserRole) {
  const { secret } = getAuthConfig();
  if (!secret) {
    throw new Error("PLATFORM_AUTH_SECRET is not configured.");
  }

  const payload: SessionPayload = {
    sub: normalizeEmail(email),
    role,
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
    const sigBytes = fromBase64Url(signature);
    const payloadBytes = fromBase64Url(payloadBase64);
    if (!sigBytes || !payloadBytes) return null;

    const key = await importSigningKey(secret);
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      encoder().encode(payloadBase64),
    );

    if (!isValid) {
      return null;
    }

    const payload = JSON.parse(
      new TextDecoder().decode(payloadBytes),
    ) as SessionPayload;

    if (
      !payload.sub ||
      !payload.exp ||
      !payload.role ||
      Date.now() > payload.exp
    ) {
      return null;
    }

    // Sliding session: flag refresh when past 50% of the 7-day TTL (> 3.5 days old)
    const sessionCreatedAt = payload.exp - SESSION_TTL_SECONDS * 1000;
    const halfTtlMs = (SESSION_TTL_SECONDS * 1000) / 2;
    const needsRefresh = Date.now() > sessionCreatedAt + halfTtlMs;

    return { email: payload.sub, role: payload.role, expiresAt: payload.exp, needsRefresh };
  } catch {
    return null;
  }
}

export function defaultPathForRole(role: UserRole) {
  if (role === "market") return "/marketing";
  return "/dashboard";
}

function normalizeName(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

export function getSellerAgentName() {
  return getAuthConfig().primary.sellerAgentName;
}

export function getSellerAgentProfile() {
  const { primary } = getAuthConfig();
  return {
    name: primary.sellerAgentName,
    email: primary.sellerEmail,
    phone: "",
  };
}

export function canRoleAccessAgent(
  role: UserRole,
  assignedAgent?: string | null,
  viewerAgentName?: string | null,
) {
  if (role === "admin") {
    return true;
  }

  const sellerAgentName = viewerAgentName ?? getSellerAgentName();
  if (!sellerAgentName) {
    return false;
  }

  if (!assignedAgent) {
    return false;
  }

  return normalizeName(assignedAgent) === normalizeName(sellerAgentName);
}

export function normalizeNextPath(input?: string | null, role?: UserRole) {
  if (!input || !input.startsWith("/") || input.startsWith("//")) {
    return role ? defaultPathForRole(role) : "/dashboard";
  }

  if (input.startsWith("/login")) {
    return role ? defaultPathForRole(role) : "/dashboard";
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

  return protectedPathRoles.some((entry) => pathname.startsWith(entry.prefix));
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

export function getAllowedRolesForPath(pathname: string): UserRole[] | null {
  const matched = protectedPathRoles.find((entry) => pathname.startsWith(entry.prefix));
  return matched?.roles ?? null;
}

export function isRoleAllowedForPath(pathname: string, role: UserRole) {
  const allowedRoles = getAllowedRolesForPath(pathname);
  if (!allowedRoles) {
    return true;
  }

  return allowedRoles.includes(role);
}
