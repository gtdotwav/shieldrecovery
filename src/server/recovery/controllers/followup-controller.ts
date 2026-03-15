import { NextResponse } from "next/server";

import { getPaymentRecoveryService } from "@/server/recovery/services/payment-recovery-service";

export async function handleFollowUpContacts() {
  const contacts = await getPaymentRecoveryService().getFollowUpContacts();

  return NextResponse.json(
    {
      total: contacts.length,
      contacts,
    },
    { status: 200 },
  );
}
