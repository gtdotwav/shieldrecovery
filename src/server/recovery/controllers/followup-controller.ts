import { NextResponse } from "next/server";

import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";

export async function handleFollowUpContacts() {
  try {
    const contacts = await getPaymentRecoveryService().getFollowUpContacts();

    return NextResponse.json(
      {
        total: contacts.length,
        contacts,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Contacts unavailable.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
