import { NextResponse } from "next/server";

/** @deprecated Checkout is now a standalone platform. Webhooks go directly to the checkout platform. */
export async function POST() {
  return NextResponse.json(
    { error: "Deprecated. Webhooks are handled by the standalone checkout platform." },
    { status: 410 },
  );
}
