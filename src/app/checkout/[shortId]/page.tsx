import { getCheckoutService } from "@/server/checkout";
import { CheckoutPage } from "@checkout/components/checkout-page";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ shortId: string }>;
}) {
  const { shortId } = await params;
  const service = getCheckoutService();
  const data = await service.getSession(shortId);

  return <CheckoutPage data={data} />;
}
