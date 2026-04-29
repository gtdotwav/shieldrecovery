# Backup, Disaster Recovery & Continuity Playbook

> **Status**: living document. Last updated 2026-04-29.
> **Owner**: platform engineering.
> **RTO target**: 1 hour. **RPO target**: 24 hours (database), 0 hours (object storage).

---

## 1. What we depend on

| Layer | Provider | Where the data lives | Backup posture |
|---|---|---|---|
| Application code | GitHub `gtdotwav/PAGRECOVERY` (mirrored to `gtdotwav/shieldrecovery`) | Two remotes, one Vercel deployment per remote | Git history is the source of truth |
| Edge / runtime | Vercel | Two projects: PagRecovery (auto-deploy from `origin/main`) + Shield Recovery (manual `vercel deploy --prod`) | Vercel keeps a rolling window of deployments — promote a prior one to roll back instantly |
| Database | Supabase (PostgreSQL) | One project per environment | **Automated nightly backups + Point-in-Time Recovery (PITR) when on Pro tier** |
| Object storage | Supabase Storage | Same project | Versioned bucket; deletion is soft for 30 days |
| Secrets | Vercel env vars + `.env.prod` (kept off git) | Vercel encrypted store | Re-source from password manager if lost |
| Third-party integrations | PagouAi, PagNet, WhatsApp Cloud, SendGrid, OpenAI, VAPI | Their side | Document key rotation procedures (Section 7) |

---

## 2. Backup schedule

### Database (Supabase)

- **Daily snapshot** at 02:00 BRT (configured automatically by Supabase Pro).
- **PITR** retention: 7 days on Pro, up to 30 days on Team plans. Verify in
  the Supabase dashboard → Database → Backups.
- **Manual snapshot before every destructive migration** (see `migrations/`).
  Take it via:
  ```bash
  pg_dump $DATABASE_URL > backups/$(date -u +%Y%m%dT%H%M%SZ)_pre_migration.sql.gz
  ```
- Keep the last three manual snapshots locally (encrypted) **and** uploaded to
  a private bucket controlled by the platform owner.

### Code

- Git is authoritative. Both remotes (`origin` + `shieldrecovery-origin`)
  store the canonical history. A team-wide audit before each release confirms
  that no untracked or unpushed branches hold critical fixes.

### Logs and observability

- Vercel keeps function logs for 14 days (Pro) / 24 hours (Hobby).
- Sentry retains events for 90 days (free tier) / 6 months (paid).
- For longer retention, ship structured logs to Logtail or Axiom (deferred —
  see `docs/OPORTUNIDADES_DE_MELHORIA.md` Onda 3).

---

## 3. Restore procedures

### 3.1 Roll back a deploy in Vercel (≤ 5 minutes)

1. Go to **Vercel → PagRecovery → Deployments**.
2. Find the last green deploy.
3. Click ⋯ → **Promote to Production**.
4. Confirm. The previous deploy goes back into rotation immediately.
5. Mirror the action in **Shield Recovery** if the bug also affected that
   deployment.

### 3.2 Restore the database to a point in time (≤ 30 minutes)

1. Open **Supabase → Database → Backups**.
2. Choose **Point-in-Time Recovery**.
3. Select the timestamp before the bad event (window measured in seconds).
4. Trigger the restore. Supabase creates a new project; promote it by
   swapping `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` in
   Vercel env vars.
5. Re-deploy (`vercel deploy --prod`) so the new env vars take effect.
6. Cross-check key invariants: row counts in `payments`, `recovery_leads`,
   `queue_jobs`, `messages` against the last known-good snapshot.
7. Re-enable cron jobs in `vercel.json` if they were paused during recovery.

### 3.3 Restore from a manual `pg_dump`

1. Provision a fresh Supabase project (or recover the existing one).
2. ```bash
   psql $RECOVERY_DATABASE_URL < backups/<file>.sql
   ```
3. Re-run the latest migrations to verify schema parity:
   ```bash
   supabase db push
   ```
4. Run the smoke checklist (Section 5) before flipping traffic.

### 3.4 Recover a lost secret

1. Pull the secret from the team password manager (1Password vault
   "PagRecovery / Shield Recovery").
2. Re-set in Vercel: `vercel env add <NAME> production`.
3. Trigger a redeploy to load the env into the new function instances.

---

## 4. Cron / queue continuity

- Both crons run on Vercel: `/api/worker/run` (every minute), `/api/agent/orchestrate` (every 5 min).
- `claim_queue_jobs_atomic` (Postgres function) uses `FOR UPDATE SKIP LOCKED`
  so concurrent invocations cannot double-process. If you ever need to halt
  execution mid-incident:
  ```sql
  UPDATE queue_jobs SET status = 'paused' WHERE status = 'scheduled';
  ```
  Resume with the inverse update once the underlying issue is fixed.
- Permanent failures land in `dead_letter_jobs` (see migration
  `20260429_atomic_job_claim_and_dlq.sql`). Inspect with:
  ```sql
  SELECT job_type, count(*) FROM dead_letter_jobs
  WHERE archived_at > now() - interval '24 hours' GROUP BY 1;
  ```

---

## 5. Smoke checklist after any restore / deploy promotion

- [ ] `GET /api/health` returns `200` and the configured integrations.
- [ ] `GET /api/webhooks/pagouai` health check returns `{ ok: true }`.
- [ ] One deliberate test webhook is processed end-to-end (lead created in
      `recovery_leads`, message in `messages`, queue job in `queue_jobs`).
- [ ] Admin login works for at least one admin and one seller account.
- [ ] Cron run succeeds: `vercel cron run --prod /api/worker/run`.
- [ ] Sentry receives one fresh event (run the `/api/debug/sentry-test`
      endpoint or temporarily throw from a known-safe path).
- [ ] CORS preflight from the production app URL returns the expected
      `Access-Control-Allow-Origin` header (no fallback hit).

---

## 6. Communications template

When invoking DR, post in `#status` (or the equivalent partner channel):

> **PagRecovery — incident in progress.**
> Started: `<UTC timestamp>` · Trigger: `<short description>` · Impact:
> `<which surfaces are degraded>` · Mitigation: `<rolling back deploy /
> restoring database / rotating key>` · Next update in 15 min.

When restored, follow up with start-to-end timeline + RCA owner.

---

## 7. Key rotation drills

Run these quarterly so we never have to learn the procedure under pressure.

| Secret | Rotation steps | Effect on PagNet integration |
|---|---|---|
| `PAGOUAI_SECRET_KEY` | Generate new in PagouAi dashboard → update in Vercel env → redeploy → revoke old | Webhook delivery uses the same secret on both sides; coordinate with PagouAi/PagNet before rotating |
| `PAGNET_*_KEY` | Pull new keys from PagNet dashboard → update in Vercel env → redeploy → revoke old | Withdrawals fail until both sides match — schedule rotation during a maintenance window |
| `WEBHOOK_SECRET` (Shield Gateway HMAC) | Same flow; coordinate with the partner | Inbound webhooks are signed — partner must update simultaneously |
| `CRON_SECRET` / `WORKER_AUTH_TOKEN` | New value → set in Vercel env → wait for redeploy → only then drop the old | Internal only; no partner impact |
| `PLATFORM_AUTH_SECRET` | New value invalidates existing sessions; users will be forced to log in again | None to integrations; communicate to operators |
| `SUPABASE_SERVICE_ROLE_KEY` | Rotate in Supabase dashboard → update Vercel → redeploy | None to integrations |

---

## 8. Open follow-ups

- [ ] Wire up Logtail (or Axiom) once log retention beyond 14 days is needed.
- [ ] Add a quarterly chaos drill (planned restore exercise).
- [ ] Automate the smoke checklist into a single `/api/health/full` endpoint.
- [ ] Cross-region read-replica for the Supabase project once we cross
      multi-region SLAs (currently single-region is fine).
