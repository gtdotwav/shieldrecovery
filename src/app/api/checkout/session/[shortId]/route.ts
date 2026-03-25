import { NextResponse } from "next/server";

/** @deprecated Checkout is now a standalone platform. */
export async function GET() {
  return NextResponse.json(
    { error: "Deprecated. Use the standalone checkout platform API." },
    { status: 410 },
  );
}
