#!/usr/bin/env node

const args = process.argv.slice(2);
const limitArg = args.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.slice("--limit=".length)) : undefined;

const baseUrl =
  process.env.WORKER_RUN_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "http://127.0.0.1:3001";
const token =
  process.env.WORKER_AUTH_TOKEN?.trim() ?? process.env.CRON_SECRET?.trim() ?? "";

const url = new URL("/api/worker/run", baseUrl);

if (Number.isFinite(limit) && limit && limit > 0) {
  url.searchParams.set("limit", String(Math.floor(limit)));
}

const headers = {
  "content-type": "application/json",
  ...(token ? { authorization: `Bearer ${token}` } : {}),
};

const response = await fetch(url, {
  method: "POST",
  headers,
});

const raw = await response.text();

if (!response.ok) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        status: response.status,
        statusText: response.statusText,
        url: url.toString(),
        body: raw,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

try {
  const parsed = JSON.parse(raw);
  console.log(JSON.stringify(parsed, null, 2));
} catch {
  console.log(raw);
}
