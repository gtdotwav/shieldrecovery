"use client";

import { useEffect, useState, useTransition } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit2,
  Key,
  Loader2,
  Mail,
  Phone,
  Plus,
  Search,
  Send,
  Tag,
  Trash2,
  User,
  Users,
  X,
  XCircle,
} from "lucide-react";

import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  listContactsAction,
  createContactAction,
  updateContactAction,
  deleteContactAction,
  addPixKeyAction,
  removePixKeyAction,
  listActivitiesAction,
  type PixContact,
  type PixContactKey,
} from "@/app/actions/crm-actions";

const PIX_KEY_TYPES = [
  { value: "cpf", label: "CPF" },
  { value: "cnpj", label: "CNPJ" },
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefone" },
  { value: "random_key", label: "Chave aleatória" },
];

const DOC_TYPES = [
  { value: "cpf", label: "CPF" },
  { value: "cnpj", label: "CNPJ" },
];

const ACTIVITY_ICONS: Record<string, typeof User> = {
  created: Plus,
  updated: Edit2,
  pix_key_added: Key,
  withdraw: Send,
};

export function CrmPanel() {
  const [contacts, setContacts] = useState<PixContact[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activities, setActivities] = useState<Record<string, { type: string; description: string; created_at: string }[]>>({});
  const [showAddKey, setShowAddKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDoc, setFormDoc] = useState("");
  const [formDocType, setFormDocType] = useState("cpf");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formTags, setFormTags] = useState("");
  const [formPixKey, setFormPixKey] = useState("");
  const [formPixKeyType, setFormPixKeyType] = useState("cpf");
  const [formPixKeyLabel, setFormPixKeyLabel] = useState("");

  // Add key form
  const [newKeyValue, setNewKeyValue] = useState("");
  const [newKeyType, setNewKeyType] = useState("cpf");
  const [newKeyLabel, setNewKeyLabel] = useState("");

  async function refresh() {
    setLoading(true);
    const res = await listContactsAction(search);
    if (res.ok) setContacts(res.data);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => refresh(), 300);
    return () => clearTimeout(timer);
  }, [search]);

  function resetForm() {
    setFormName("");
    setFormDoc("");
    setFormDocType("cpf");
    setFormEmail("");
    setFormPhone("");
    setFormNotes("");
    setFormTags("");
    setFormPixKey("");
    setFormPixKeyType("cpf");
    setFormPixKeyLabel("");
    setEditingId(null);
  }

  function openEdit(contact: PixContact) {
    setFormName(contact.name);
    setFormDoc(contact.document ?? "");
    setFormDocType(contact.document_type ?? "cpf");
    setFormEmail(contact.email ?? "");
    setFormPhone(contact.phone ?? "");
    setFormNotes(contact.notes ?? "");
    setFormTags(contact.tags?.join(", ") ?? "");
    setEditingId(contact.id);
    setShowForm(true);
  }

  function handleSubmit() {
    setError("");
    setSuccess("");

    const fd = new FormData();
    fd.set("name", formName);
    fd.set("document", formDoc);
    fd.set("documentType", formDocType);
    fd.set("email", formEmail);
    fd.set("phone", formPhone);
    fd.set("notes", formNotes);
    fd.set("tags", formTags);

    if (!editingId) {
      fd.set("pixKey", formPixKey);
      fd.set("pixKeyType", formPixKeyType);
      fd.set("pixKeyLabel", formPixKeyLabel);
    }

    startTransition(async () => {
      const res = editingId
        ? await updateContactAction(editingId, fd)
        : await createContactAction(fd);

      if (res.ok) {
        setSuccess(editingId ? "Contato atualizado!" : "Contato criado!");
        setShowForm(false);
        resetForm();
        refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Remover este contato e todas as chaves PIX?")) return;

    startTransition(async () => {
      const res = await deleteContactAction(id);
      if (res.ok) {
        setSuccess("Contato removido");
        refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function handleAddKey(contactId: string) {
    if (!newKeyValue || !newKeyType) {
      setError("Preencha a chave PIX e o tipo");
      return;
    }

    const fd = new FormData();
    fd.set("contactId", contactId);
    fd.set("pixKey", newKeyValue);
    fd.set("pixKeyType", newKeyType);
    fd.set("label", newKeyLabel);
    fd.set("isDefault", "false");

    startTransition(async () => {
      const res = await addPixKeyAction(fd);
      if (res.ok) {
        setShowAddKey(null);
        setNewKeyValue("");
        setNewKeyType("cpf");
        setNewKeyLabel("");
        refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function handleRemoveKey(keyId: string) {
    if (!confirm("Remover esta chave PIX?")) return;

    startTransition(async () => {
      const res = await removePixKeyAction(keyId);
      if (res.ok) refresh();
      else setError(res.error);
    });
  }

  async function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!activities[id]) {
      const res = await listActivitiesAction(id);
      if (res.ok) {
        setActivities((prev) => ({ ...prev, [id]: res.data as { type: string; description: string; created_at: string }[] }));
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Messages ── */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          <XCircle className="h-4 w-4 shrink-0" />
          {error}
          <button type="button" onClick={() => setError("")} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
          <Check className="h-4 w-4 shrink-0" />
          {success}
          <button type="button" onClick={() => setSuccess("")} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* ── Search + Actions ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, CPF, e-mail..."
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] pl-10 pr-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400"
          />
        </div>
        <button
          type="button"
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancelar" : "Novo Contato"}
        </button>
      </div>

      {/* ── Create/Edit form ── */}
      {showForm && (
        <Surface className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-[var(--accent)]" />
            {editingId ? "Editar Contato" : "Novo Contato"}
          </h3>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label>Nome *</Label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Nome completo ou razão social"
                className={inputClass}
              />
            </div>
            <div>
              <Label>Tipo de Documento</Label>
              <select value={formDocType} onChange={(e) => setFormDocType(e.target.value)} className={inputClass}>
                {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <Label>Documento</Label>
              <input
                type="text"
                value={formDoc}
                onChange={(e) => setFormDoc(e.target.value)}
                placeholder={formDocType === "cpf" ? "000.000.000-00" : "00.000.000/0001-00"}
                className={inputClass}
              />
            </div>
            <div>
              <Label>E-mail</Label>
              <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="email@exemplo.com" className={inputClass} />
            </div>
            <div>
              <Label>Telefone</Label>
              <input type="text" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="(11) 99999-0000" className={inputClass} />
            </div>
            <div>
              <Label>Tags (separadas por vírgula)</Label>
              <input type="text" value={formTags} onChange={(e) => setFormTags(e.target.value)} placeholder="fornecedor, parceiro" className={inputClass} />
            </div>

            {/* PIX key (only on create) */}
            {!editingId && (
              <>
                <div className="sm:col-span-2 lg:col-span-3 border-t border-gray-100 dark:border-gray-800 pt-4 mt-2">
                  <p className="text-xs font-medium text-gray-500 mb-3 flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5" />
                    Chave PIX principal (opcional)
                  </p>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <Label>Tipo</Label>
                      <select value={formPixKeyType} onChange={(e) => setFormPixKeyType(e.target.value)} className={inputClass}>
                        {PIX_KEY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label>Chave</Label>
                      <input type="text" value={formPixKey} onChange={(e) => setFormPixKey(e.target.value)} placeholder="Chave PIX" className={inputClass} />
                    </div>
                    <div>
                      <Label>Apelido</Label>
                      <input type="text" value={formPixKeyLabel} onChange={(e) => setFormPixKeyLabel(e.target.value)} placeholder="Ex: Conta principal" className={inputClass} />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Notes */}
            <div className="sm:col-span-2 lg:col-span-3">
              <Label>Observações</Label>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Notas internas sobre o contato..."
                rows={3}
                className={cn(inputClass, "resize-none")}
              />
            </div>

            {/* Submit */}
            <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowForm(false); resetForm(); }}
                className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || !formName}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {editingId ? "Salvar" : "Criar Contato"}
              </button>
            </div>
          </div>
        </Surface>
      )}

      {/* ── Contact list ── */}
      {loading && !contacts.length ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Carregando...
        </div>
      ) : contacts.length === 0 ? (
        <Surface className="flex flex-col items-center justify-center py-12">
          <Users className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
          <p className="text-sm text-gray-400">Nenhum contato encontrado</p>
        </Surface>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <Surface key={contact.id} className="overflow-hidden">
              {/* ── Contact header ── */}
              <div className="px-5 py-4 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)]/10 text-[var(--accent)] font-semibold text-sm shrink-0">
                  {contact.name.slice(0, 2).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {contact.name}
                    </h4>
                    {contact.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[0.6rem] font-medium text-gray-500 dark:text-gray-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                    {contact.document && (
                      <span>{contact.document_type?.toUpperCase()}: {contact.document}</span>
                    )}
                    {contact.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {contact.email}
                      </span>
                    )}
                    {contact.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {contact.phone}
                      </span>
                    )}
                  </div>
                </div>

                {/* PIX keys count */}
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Key className="h-3.5 w-3.5" />
                  {contact.pix_contact_keys?.length ?? 0} chaves
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(contact)}
                    className="p-2 rounded-lg text-gray-400 hover:text-[var(--accent)] hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(contact.id)}
                    disabled={isPending}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleExpand(contact.id)}
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    {expandedId === contact.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* ── PIX keys row ── */}
              {(contact.pix_contact_keys?.length ?? 0) > 0 && (
                <div className="px-5 pb-3 flex flex-wrap gap-2">
                  {contact.pix_contact_keys!.map((k) => (
                    <div
                      key={k.id}
                      className={cn(
                        "group inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs",
                        k.is_default
                          ? "border-[var(--accent)]/30 bg-[var(--accent)]/5 text-[var(--accent)]"
                          : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#111] text-gray-600 dark:text-gray-400",
                      )}
                    >
                      <Key className="h-3 w-3 opacity-60" />
                      <span className="font-medium uppercase text-[0.6rem]">
                        {PIX_KEY_TYPES.find((t) => t.value === k.pix_key_type)?.label ?? k.pix_key_type}
                      </span>
                      <span className="font-mono">{k.pix_key}</span>
                      {k.label && <span className="text-gray-400">({k.label})</span>}
                      {k.is_default && <span className="text-[0.55rem] font-semibold uppercase ml-1">padrão</span>}
                      <button
                        type="button"
                        onClick={() => handleRemoveKey(k.id)}
                        className="opacity-0 group-hover:opacity-100 ml-1 text-red-400 hover:text-red-600 transition-opacity"
                        title="Remover chave"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowAddKey(showAddKey === contact.id ? null : contact.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 px-2.5 py-1.5 text-xs text-gray-400 hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    Chave
                  </button>
                </div>
              )}

              {/* No keys - add first */}
              {(contact.pix_contact_keys?.length ?? 0) === 0 && (
                <div className="px-5 pb-3">
                  <button
                    type="button"
                    onClick={() => setShowAddKey(showAddKey === contact.id ? null : contact.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 px-3 py-2 text-xs text-gray-400 hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar chave PIX
                  </button>
                </div>
              )}

              {/* ── Add key inline form ── */}
              {showAddKey === contact.id && (
                <div className="px-5 pb-4 border-t border-gray-100 dark:border-gray-800 pt-3">
                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <Label>Tipo</Label>
                      <select value={newKeyType} onChange={(e) => setNewKeyType(e.target.value)} className={cn(inputClass, "w-36")}>
                        {PIX_KEY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div className="flex-1 min-w-[12rem]">
                      <Label>Chave PIX</Label>
                      <input type="text" value={newKeyValue} onChange={(e) => setNewKeyValue(e.target.value)} placeholder="Chave PIX" className={inputClass} />
                    </div>
                    <div>
                      <Label>Apelido</Label>
                      <input type="text" value={newKeyLabel} onChange={(e) => setNewKeyLabel(e.target.value)} placeholder="Conta principal" className={cn(inputClass, "w-40")} />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddKey(contact.id)}
                      disabled={isPending}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-2.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                      Adicionar
                    </button>
                  </div>
                </div>
              )}

              {/* ── Expanded: notes + activities ── */}
              {expandedId === contact.id && (
                <div className="border-t border-gray-100 dark:border-gray-800 px-5 py-4">
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Notes */}
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Observações</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                        {contact.notes || "Sem observações"}
                      </p>
                    </div>

                    {/* Activity log */}
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Atividades recentes</p>
                      {activities[contact.id]?.length ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {activities[contact.id].map((act, i) => {
                            const Icon = ACTIVITY_ICONS[act.type] ?? Clock;
                            return (
                              <div key={i} className="flex items-start gap-2 text-xs">
                                <Icon className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
                                <div className="flex-1">
                                  <p className="text-gray-600 dark:text-gray-400">{act.description}</p>
                                  <p className="text-gray-300 dark:text-gray-600 text-[0.6rem] mt-0.5">
                                    {formatDateTime(act.created_at)}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">Nenhuma atividade registrada</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Surface>
          ))}
        </div>
      )}

      {/* ── Stats footer ── */}
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {contacts.length} contatos
        </span>
        <span className="flex items-center gap-1">
          <Key className="h-3.5 w-3.5" />
          {contacts.reduce((sum, c) => sum + (c.pix_contact_keys?.length ?? 0), 0)} chaves PIX
        </span>
      </div>
    </div>
  );
}

/* ── Helpers ── */

const inputClass =
  "w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111] px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
      {children}
    </label>
  );
}

function Surface({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a1a1a] transition-colors duration-300",
        className,
      )}
    >
      {children}
    </div>
  );
}
