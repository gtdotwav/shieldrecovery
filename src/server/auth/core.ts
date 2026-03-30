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
  "/webhooks/",
];

export type UserRole = "admin" | "seller";

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

  return sets;
}

const protectedPathRoles: Array<{ prefix: string; roles: UserRole[] }> = [
  { prefix: "/onboarding", roles: ["admin", "seller"] },
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/dashboard", roles: ["admin", "seller"] },
  { prefix: "/connect", roles: ["admin", "seller"] },
  { prefix: "/calendar", roles: ["admin", "seller"] },
  { prefix: "/inbox", roles: ["admin", "seller"] },
  { prefix: "/test", roles: ["admin"] },
  { prefix: "/ai", roles: ["admin", "seller"] },
  { prefix: "/leads", roles: ["admin", "seller"] },
  { prefix: "/api/settings/connections", roles: ["admin"] },
  { prefix: "/api/health", roles: ["admin"] },
  { prefix: "/api/import", roles: ["admin"] },
  { prefix: "/api/payments/retry", roles: ["admin"] },
  { prefix: "/api/analytics/recovery", roles: ["admin"] },
  { prefix: "/api/followups/contacts", roles: ["admin"] },
  { prefix: "/api/export", roles: ["admin"] },
  { prefix: "/api/leads", roles: ["admin", "seller"] },
  { prefix: "/api/inbox", roles: ["admin", "seller"] },
  { prefix: "/api/dashboard", roles: ["admin"] },
  { prefix: "/api/admin", roles: ["admin"] },
  { prefix: "/calling", roles: ["admin", "seller"] },
  { prefix: "/api/calls", roles: ["admin", "seller"] },
  { prefix: "/api/calendar", roles: ["admin", "seller"] },
  { prefix: "/analytics/recovery", roles: ["admin"] },
  { prefix: "/followups/contacts", roles: ["admin"] },
  { prefix: "/imports/shield-transaction", roles: ["admin"] },
  { prefix: "/payments/retry", roles: ["admin"] },
  { prefix: "/health", roles: ["admin"] },
];

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
  if (!config.secret) return false;
  const sets = getAllCredentialSets();
  return sets.some(
    (s) =>
      (s.adminEmail && s.adminPassword) ||
      (s.sellerEmail && s.sellerPassword),
  );
}

export async function authenticateCredentials(input: {
  email: string;
  password: string;
}) {
  const { secret } = getAuthConfig();
  if (!secret) return null;

  const email = input.email.trim().toLowerCase();
  const password = input.password.trim();

  for (const set of getAllCredentialSets()) {
    if (set.adminEmail && set.adminPassword && email === set.adminEmail && password === set.adminPassword) {
      return { email, role: "admin" as const };
    }
    if (set.sellerEmail && set.sellerPassword && email === set.sellerEmail && password === set.sellerPassword) {
      return { email, role: "seller" as const };
    }
  }

  return null;
}

export async function createSessionToken(email: string, role: UserRole) {
  const { secret } = getAuthConfig();
  if (!secret) {
    throw new Error("PLATFORM_AUTH_SECRET is not configured.");
  }

  const payload: SessionPayload = {
    sub: email.trim().toLowerCase(),
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

    if (
      !payload.sub ||
      !payload.exp ||
      !payload.role ||
      Date.now() > payload.exp
    ) {
      return null;
    }

    return { email: payload.sub, role: payload.role, expiresAt: payload.exp };
  } catch {
    return null;
  }
}

export function defaultPathForRole(role: UserRole) {
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
