import { requireAuthenticatedSession } from "@/server/auth/session";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuthenticatedSession(["admin", "market"]);
  return <>{children}</>;
}
