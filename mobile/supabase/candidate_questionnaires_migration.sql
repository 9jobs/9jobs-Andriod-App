create table if not exists candidate_questionnaires (
  user_id text primary key references profiles(id) on delete cascade,
  full_name text not null,
  contact_number text not null,
  working_rights text not null,
  full_address text not null,
  date_of_birth date not null,
  gender text not null,
  expected_salary text not null,
  preferred_job_locations text[] not null default '{}',
  work_types text[] not null default '{}',
  notice_period text not null,
  preferred_roles text[] not null default '{}',
  resume_path text not null default '',
  resume_name text not null default '',
  visa_type text not null default '',
  visa_path text not null default '',
  visa_name text not null default '',
  enhanced_resume_path text not null default '',
  enhanced_resume_name text not null default '',
  enhanced_resume_updated_at timestamptz,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists candidate_questionnaires add column if not exists enhanced_resume_path text not null default '';
alter table if exists candidate_questionnaires add column if not exists enhanced_resume_name text not null default '';
alter table if exists candidate_questionnaires add column if not exists enhanced_resume_updated_at timestamptz;
alter table if exists candidate_questionnaires add column if not exists visa_type text not null default '';

create index if not exists idx_candidate_questionnaires_completed_at
  on candidate_questionnaires(completed_at desc);

alter table if exists candidate_questionnaires disable row level security;
