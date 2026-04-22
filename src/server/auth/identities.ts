import {
  authenticateCredentials,
  getSellerAgentName,
  getSellerAgentProfile,
  type UserRole,
} from "@/server/auth/core";
import { verifyPlatformPassword } from "@/server/auth/passwords";
import { getStorageService } from "@/server/recovery/services/storage";
import { getPartnerStorageService } from "@/server/recovery/services/partner-storage";

type AuthenticatedIdentity = {
  email: string;
  role: UserRole;
  sellerAgentName?: string;
  sellerDisplayName?: string;
  partnerId?: string;
  partnerName?: string;
};

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

export async function authenticatePlatformUser(input: {
  email: string;
  password: string;
}): Promise<AuthenticatedIdentity | null> {
  const envUser = await authenticateCredentials(input);

  if (envUser) {
    return {
      ...envUser,
      sellerAgentName:
        envUser.role === "seller" ? getSellerAgentName() : undefined,
      sellerDisplayName:
        envUser.role === "seller" ? getSellerAgentProfile().name : undefined,
    };
  }

  const seller = await getStorageService().findSellerUserByEmail(input.email);

  if (!seller || !seller.active) {
    // Try partner user
    return authenticatePartnerUser(input);
  }

  if (!verifyPlatformPassword(input.password.trim(), seller.passwordHash)) {
    return null;
  }

  return {
    email: seller.email,
    role: "seller",
    sellerAgentName: seller.agentName,
    sellerDisplayName: seller.displayName,
  };
}

async function authenticatePartnerUser(input: {
  email: string;
  password: string;
}): Promise<AuthenticatedIdentity | null> {
  const partnerStorage = getPartnerStorageService();
  const partnerUser = await partnerStorage.findUserByEmail(input.email);

  if (!partnerUser || !partnerUser.active) {
    return null;
  }

  if (!verifyPlatformPassword(input.password.trim(), partnerUser.passwordHash)) {
    return null;
  }

  const profile = await partnerStorage.getProfile(partnerUser.partnerId);

  return {
    email: partnerUser.email,
    role: "partner",
    partnerId: partnerUser.partnerId,
    partnerName: profile?.name,
  };
}

export async function registerPartnerLogin(email: string) {
  await getPartnerStorageService().touchUserLogin(email);
}

export async function registerSellerLogin(email: string) {
  await getStorageService().touchSellerUserLogin(email);
}

export async function getSellerIdentityByEmail(email?: string | null) {
  const normalizedEmail = normalize(email);

  if (!normalizedEmail) {
    return null;
  }

  const seller = await getStorageService().findSellerUserByEmail(normalizedEmail);

  if (seller) {
    return {
      email: seller.email,
      displayName: seller.displayName,
      agentName: seller.agentName,
      active: seller.active,
    };
  }

  const fallback = getSellerAgentProfile();
  if (normalize(fallback.email) === normalizedEmail) {
    return {
      email: fallback.email ?? normalizedEmail,
      displayName: fallback.name || normalizedEmail,
      agentName: fallback.name || normalizedEmail,
      active: true,
    };
  }

  return null;
}

export async function canSessionAccessAgent(input: {
  role: UserRole;
  email?: string | null;
  assignedAgent?: string | null;
}) {
  if (input.role === "admin") {
    return true;
  }

  if (!input.assignedAgent) {
    return true;
  }

  const seller = await getSellerIdentityByEmail(input.email);

  if (!seller?.agentName) {
    return false;
  }

  return normalize(seller.agentName) === normalize(input.assignedAgent);
}
