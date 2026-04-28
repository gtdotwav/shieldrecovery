"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

import { requireAuthenticatedSession } from "@/server/auth/session";
import { appEnv } from "@/server/recovery/config";

function db() {
  return createClient(appEnv.supabaseUrl, appEnv.supabaseServiceRoleKey);
}

/* ── Types ── */

export interface PixContact {
  id: string;
  name: string;
  document: string | null;
  document_type: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  pix_contact_keys?: PixContactKey[];
}

export interface PixContactKey {
  id: string;
  contact_id: string;
  pix_key: string;
  pix_key_type: string;
  label: string | null;
  is_default: boolean;
  created_at: string;
}

/* ── List contacts ── */

export async function listContactsAction(search?: string) {
  await requireAuthenticatedSession(["admin"]);

  const supabase = db();
  let query = supabase
    .from("pix_contacts")
    .select("*, pix_contact_keys(*)")
    .order("updated_at", { ascending: false });

  if (search?.trim()) {
    const s = `%${search.trim()}%`;
    query = query.or(`name.ilike.${s},document.ilike.${s},email.ilike.${s},phone.ilike.${s}`);
  }

  const { data, error } = await query.limit(200);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data: (data ?? []) as PixContact[] };
}

/* ── Get single contact ── */

export async function getContactAction(id: string) {
  await requireAuthenticatedSession(["admin"]);

  const supabase = db();
  const { data, error } = await supabase
    .from("pix_contacts")
    .select("*, pix_contact_keys(*)")
    .eq("id", id)
    .single();

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data: data as PixContact };
}

/* ── Create contact ── */

export async function createContactAction(formData: FormData) {
  await requireAuthenticatedSession(["admin"]);

  const name = (formData.get("name") as string)?.trim();
  const document = (formData.get("document") as string)?.trim() || null;
  const documentType = (formData.get("documentType") as string)?.trim() || null;
  const email = (formData.get("email") as string)?.trim() || null;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;
  const tagsRaw = (formData.get("tags") as string)?.trim() || "";
  const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];

  // PIX key data
  const pixKey = (formData.get("pixKey") as string)?.trim() || null;
  const pixKeyType = (formData.get("pixKeyType") as string)?.trim() || null;
  const pixKeyLabel = (formData.get("pixKeyLabel") as string)?.trim() || null;

  if (!name) {
    return { ok: false as const, error: "Nome é obrigatório" };
  }

  const supabase = db();

  const { data: contact, error } = await supabase
    .from("pix_contacts")
    .insert({ name, document, document_type: documentType, email, phone, notes, tags })
    .select()
    .single();

  if (error) return { ok: false as const, error: error.message };

  // Add PIX key if provided
  if (pixKey && pixKeyType) {
    await supabase.from("pix_contact_keys").insert({
      contact_id: contact.id,
      pix_key: pixKey,
      pix_key_type: pixKeyType,
      label: pixKeyLabel,
      is_default: true,
    });
  }

  // Activity log
  await supabase.from("crm_activities").insert({
    contact_id: contact.id,
    type: "created",
    description: `Contato "${name}" criado`,
  });

  revalidatePath("/admin/crm");
  revalidatePath("/admin/withdraw");
  return { ok: true as const, data: contact };
}

/* ── Update contact ── */

export async function updateContactAction(id: string, formData: FormData) {
  await requireAuthenticatedSession(["admin"]);

  const name = (formData.get("name") as string)?.trim();
  const document = (formData.get("document") as string)?.trim() || null;
  const documentType = (formData.get("documentType") as string)?.trim() || null;
  const email = (formData.get("email") as string)?.trim() || null;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;
  const tagsRaw = (formData.get("tags") as string)?.trim() || "";
  const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];

  if (!name) {
    return { ok: false as const, error: "Nome é obrigatório" };
  }

  const supabase = db();

  const { error } = await supabase
    .from("pix_contacts")
    .update({ name, document, document_type: documentType, email, phone, notes, tags, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false as const, error: error.message };

  await supabase.from("crm_activities").insert({
    contact_id: id,
    type: "updated",
    description: `Contato "${name}" atualizado`,
  });

  revalidatePath("/admin/crm");
  return { ok: true as const };
}

/* ── Delete contact ── */

export async function deleteContactAction(id: string) {
  await requireAuthenticatedSession(["admin"]);

  const supabase = db();
  const { error } = await supabase.from("pix_contacts").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/crm");
  revalidatePath("/admin/withdraw");
  return { ok: true as const };
}

/* ── Add PIX key to contact ── */

export async function addPixKeyAction(formData: FormData) {
  await requireAuthenticatedSession(["admin"]);

  const contactId = (formData.get("contactId") as string)?.trim();
  const pixKey = (formData.get("pixKey") as string)?.trim();
  const pixKeyType = (formData.get("pixKeyType") as string)?.trim();
  const label = (formData.get("label") as string)?.trim() || null;
  const isDefault = formData.get("isDefault") === "true";

  if (!contactId || !pixKey || !pixKeyType) {
    return { ok: false as const, error: "Campos obrigatórios: contato, chave PIX, tipo" };
  }

  const supabase = db();

  // If setting as default, unset others
  if (isDefault) {
    await supabase
      .from("pix_contact_keys")
      .update({ is_default: false })
      .eq("contact_id", contactId);
  }

  const { error } = await supabase.from("pix_contact_keys").insert({
    contact_id: contactId,
    pix_key: pixKey,
    pix_key_type: pixKeyType,
    label,
    is_default: isDefault,
  });

  if (error) return { ok: false as const, error: error.message };

  await supabase.from("crm_activities").insert({
    contact_id: contactId,
    type: "pix_key_added",
    description: `Chave PIX ${pixKeyType} adicionada: ${pixKey}`,
  });

  revalidatePath("/admin/crm");
  revalidatePath("/admin/withdraw");
  return { ok: true as const };
}

/* ── Remove PIX key ── */

export async function removePixKeyAction(keyId: string) {
  await requireAuthenticatedSession(["admin"]);

  const supabase = db();
  const { error } = await supabase.from("pix_contact_keys").delete().eq("id", keyId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/crm");
  revalidatePath("/admin/withdraw");
  return { ok: true as const };
}

/* ── List activities for contact ── */

export async function listActivitiesAction(contactId: string) {
  await requireAuthenticatedSession(["admin"]);

  const supabase = db();
  const { data, error } = await supabase
    .from("crm_activities")
    .select("*")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data: data ?? [] };
}

/* ── Get contacts with PIX keys (for withdraw form selector) ── */

export async function getContactsForWithdrawAction() {
  await requireAuthenticatedSession(["admin"]);

  const supabase = db();
  const { data, error } = await supabase
    .from("pix_contacts")
    .select("id, name, document, pix_contact_keys(id, pix_key, pix_key_type, label, is_default)")
    .order("name");

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data: data ?? [] };
}
