begin;
create schema if not exists admin_management;
revoke all on schema admin_management from public;
create table admin_management.owner_identity (
 singleton boolean primary key default true check(singleton), clerk_user_id text not null unique,
 issuer text not null, created_at timestamptz not null default now()
);
create function admin_management.protect_owner() returns trigger language plpgsql as $$
begin raise exception 'Protected owner identity is immutable'; end $$;
create trigger protected_owner before update or delete on admin_management.owner_identity for each row execute function admin_management.protect_owner();
create table admin_management.office_admins (
 id uuid primary key, clerk_user_id text unique, name text not null, email text not null unique check(email=lower(trim(email))),
 status text not null default 'disabled' check(status in ('active','disabled','revoked')),
 access_version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table admin_management.managed_clients (
 id uuid primary key, name text not null, email text, metadata jsonb not null default '{}',
 source_kind text not null default 'local' check(source_kind in ('local','existing')),
 status text not null default 'active' check(status in ('active','disabled','archived')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table admin_management.client_identity_links (
 client_id uuid primary key references admin_management.managed_clients(id),
 permanent_client_id text not null unique, clerk_user_id text unique,
 verified_by text not null, verified_at timestamptz not null default now()
);
create function admin_management.protect_link() returns trigger language plpgsql as $$
begin raise exception 'Verified identity links cannot be reassigned or deleted'; end $$;
create trigger protected_identity before update or delete on admin_management.client_identity_links for each row execute function admin_management.protect_link();
create table admin_management.admin_client_permissions (
 admin_id uuid not null references admin_management.office_admins(id), client_id uuid not null references admin_management.managed_clients(id),
 actions text[] not null default '{}', primary key(admin_id,client_id),
 check(actions <@ array['client.view','client.records.add','client.records.edit','client.records.archive','applications.view','applications.update','messages.view','jobs.manage']::text[])
);
create table admin_management.admin_invitations (
 id uuid primary key, admin_id uuid not null references admin_management.office_admins(id),
 email text not null, provider_id text unique, status text not null check(status in ('pending','sent','accepted','revoked')),
 created_at timestamptz not null default now()
);
create table admin_management.audit_events (
 id bigint generated always as identity primary key, actor text not null, action text not null,
 target text not null, before_value jsonb, after_value jsonb, occurred_at timestamptz not null default now()
);
create function admin_management.protect_audit() returns trigger language plpgsql as $$
begin raise exception 'Audit history is append-only'; end $$;
create trigger append_only_audit before update or delete on admin_management.audit_events for each row execute function admin_management.protect_audit();
create function admin_management.protect_owner_staff() returns trigger language plpgsql as $$
begin
 if exists(select 1 from admin_management.owner_identity where clerk_user_id=new.clerk_user_id) then raise exception 'Owner cannot be managed as Office Admin'; end if;
 return new;
end $$;
create trigger no_owner_staff before insert or update on admin_management.office_admins for each row execute function admin_management.protect_owner_staff();
revoke all on all tables in schema admin_management from public;
revoke all on all functions in schema admin_management from public;
commit;
