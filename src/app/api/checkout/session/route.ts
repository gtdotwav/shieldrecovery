import { NextResponse } from "next/server";

/** @deprecated Checkout is now a standalone platform. Use the checkout platform API directly. */
export async function POST() {
  return NextResponse.json(
    { error: "Deprecated. Use the standalone checkout platform API at CHECKOUT_PLATFORM_URL/api/v1/sessions" },
    { status: 410 },
  );
}
