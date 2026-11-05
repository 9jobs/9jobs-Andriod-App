begin;
create table admin_management.admin_approval_challenges (
 id uuid primary key,
 admin_id uuid not null references admin_management.office_admins(id),
 owner_user_id text not null,
 owner_email text not null,
 employee_email text not null,
 access_version integer not null,
 code_hash text not null,
 attempts integer not null default 0 check(attempts between 0 and 5),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null,
 consumed_at timestamptz,
 approved_at timestamptz,
 approved_version integer
);
create index admin_approval_owner_created on admin_management.admin_approval_challenges(owner_user_id,created_at desc);
create index admin_approval_admin_created on admin_management.admin_approval_challenges(admin_id,created_at desc);
commit;
