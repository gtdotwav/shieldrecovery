import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * @deprecated Checkout is now hosted on the standalone checkout platform.
 * Redirect to the checkout platform URL.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ shortId: string }>;
}) {
  const { shortId } = await params;
  const checkoutUrl = process.env.CHECKOUT_PLATFORM_URL ?? "https://substratum.com.br";
  redirect(`${checkoutUrl}/c/${shortId}`);
}
