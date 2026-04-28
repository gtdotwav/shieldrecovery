/* ── Config ── */

const TAG = "[pagnet-withdraw]";

const PAGNET_API_BASE = "https://api.pagnetbrasil.com/v1";

function getKeys() {
  const sk = process.env.PAGNET_SECRET_KEY ?? "";
  const pk = process.env.PAGNET_PUBLIC_KEY ?? "";
  const wk = process.env.PAGNET_WITHDRAW_KEY ?? "";
  return { sk, pk, wk };
}

function authHeader(): string {
  const { sk } = getKeys();
  return "Basic " + Buffer.from(`${sk}:`).toString("base64");
}

function withdrawAuthHeader(): string {
  const { wk } = getKeys();
  return "Basic " + Buffer.from(`${wk}:`).toString("base64");
}

async function pagnetFetch<T>(
  path: string,
  init: RequestInit = {},
  useWithdrawKey = false,
): Promise<T> {
  const url = `${PAGNET_API_BASE}${path}`;
  const auth = useWithdrawKey ? withdrawAuthHeader() : authHeader();

  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });

  const body = await res.text();

  if (!res.ok) {
    console.error(TAG, "API error", { url, status: res.status, body });
    throw new Error(`PagNet ${res.status}: ${body}`);
  }

  return body ? JSON.parse(body) : ({} as T);
}

/* ── Types ── */

export type PixKeyType = "cpf" | "cnpj" | "email" | "phone" | "random_key";

export type WithdrawStatus =
  | "pending"
  | "processing"
  | "approved"
  | "completed"
  | "failed"
  | "cancelled";

export interface PagnetWithdraw {
  id: string | number;
  amount: number;
  status: WithdrawStatus;
  pixKey: string;
  pixKeyType: PixKeyType;
  description?: string;
  failReason?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface PagnetBalance {
  available: number;
  blocked: number;
  total: number;
}

export interface PagnetAntecipation {
  id: string | number;
  amount: number;
  fee: number;
  netAmount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWithdrawInput {
  amount: number;
  pixKey: string;
  pixKeyType: PixKeyType;
  description?: string;
}

export interface CreateAntecipationInput {
  amount: number;
}

export interface PaginatedList<T> {
  data: T[];
  total?: number;
  page?: number;
  limit?: number;
}

/* ── Withdraw operations ── */

export async function createWithdraw(
  input: CreateWithdrawInput,
): Promise<PagnetWithdraw> {
  console.info(TAG, "Creating withdraw", { amount: input.amount, pixKeyType: input.pixKeyType });

  return pagnetFetch<PagnetWithdraw>(
    "/withdraws",
    {
      method: "POST",
      body: JSON.stringify({
        amount: input.amount,
        bank_account: {
          type: "pix",
          pix_key: input.pixKey,
          pix_key_type: input.pixKeyType,
        },
        description: input.description,
      }),
    },
    true,
  );
}

export async function cancelWithdraw(
  id: string | number,
): Promise<PagnetWithdraw> {
  console.info(TAG, "Cancelling withdraw", { id });
  return pagnetFetch<PagnetWithdraw>(
    `/withdraws/${id}/cancel`,
    { method: "POST" },
    true,
  );
}

export async function findWithdraw(
  id: string | number,
): Promise<PagnetWithdraw> {
  return pagnetFetch<PagnetWithdraw>(`/withdraws/${id}`, {}, true);
}

export async function listWithdraws(
  params?: { page?: number; limit?: number; status?: string },
): Promise<PaginatedList<PagnetWithdraw>> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.status) qs.set("status", params.status);
  const query = qs.toString();
  return pagnetFetch<PaginatedList<PagnetWithdraw>>(
    `/withdraws${query ? `?${query}` : ""}`,
    {},
    true,
  );
}

/* ── Balance ── */

export async function getBalance(): Promise<PagnetBalance> {
  return pagnetFetch<PagnetBalance>("/balance");
}

/* ── Antecipation ── */

export async function createAntecipation(
  input: CreateAntecipationInput,
): Promise<PagnetAntecipation> {
  console.info(TAG, "Creating antecipation", { amount: input.amount });
  return pagnetFetch<PagnetAntecipation>("/antecipations", {
    method: "POST",
    body: JSON.stringify({ amount: input.amount }),
  });
}

export async function cancelAntecipation(
  id: string | number,
): Promise<PagnetAntecipation> {
  console.info(TAG, "Cancelling antecipation", { id });
  return pagnetFetch<PagnetAntecipation>(`/antecipations/${id}/cancel`, {
    method: "POST",
  });
}

export async function findAntecipation(
  id: string | number,
): Promise<PagnetAntecipation> {
  return pagnetFetch<PagnetAntecipation>(`/antecipations/${id}`);
}

export async function listAntecipations(
  params?: { page?: number; limit?: number },
): Promise<PaginatedList<PagnetAntecipation>> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  const query = qs.toString();
  return pagnetFetch<PaginatedList<PagnetAntecipation>>(
    `/antecipations${query ? `?${query}` : ""}`,
  );
}
