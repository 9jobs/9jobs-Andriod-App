create extension if not exists pgcrypto;

create table if not exists public.website_admin_records (
  -- Mongo ObjectIds are retained as IDs, preserving URLs and JSON contracts.
  id text primary key,
  model text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists website_admin_records_model_created_idx
  on public.website_admin_records (model, created_at desc);
create index if not exists website_admin_records_payload_gin_idx
  on public.website_admin_records using gin (payload);

alter table public.website_admin_records enable row level security;

insert into storage.buckets (id, name, public)
values ('agreement-files', 'agreement-files', false)
on conflict (id) do nothing;
