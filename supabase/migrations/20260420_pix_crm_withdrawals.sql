-- PIX CRM: contacts and withdrawal history
-- Used by admin/withdraw and admin/crm pages

create table if not exists pix_contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  document text,
  document_type text check (document_type in ('cpf', 'cnpj')),
  email text,
  phone text,
  notes text,
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pix_contact_keys (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references pix_contacts(id) on delete cascade,
  pix_key text not null,
  pix_key_type text not null check (pix_key_type in ('cpf', 'cnpj', 'email', 'phone', 'random_key')),
  label text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_pix_contact_keys_contact on pix_contact_keys(contact_id);

create table if not exists withdraw_history (
  id uuid primary key default gen_random_uuid(),
  pagnet_withdraw_id text,
  contact_id uuid references pix_contacts(id) on delete set null,
  amount integer not null,
  pix_key text not null,
  pix_key_type text not null,
  status text not null default 'pending',
  description text,
  error_reason text,
  pagnet_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_withdraw_history_contact on withdraw_history(contact_id);
create index idx_withdraw_history_status on withdraw_history(status);
create index idx_withdraw_history_created on withdraw_history(created_at desc);

-- CRM activity log
create table if not exists crm_activities (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references pix_contacts(id) on delete cascade,
  type text not null,
  description text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_crm_activities_contact on crm_activities(contact_id);
create index idx_crm_activities_created on crm_activities(created_at desc);
