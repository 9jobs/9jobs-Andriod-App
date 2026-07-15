-- 9Jobs Database Schema
-- Safe additive migration for the current preview/live-sync setup.

create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1. Profiles (Clients, Admins, Staff)
create table if not exists profiles (
  id text primary key,
  full_name text not null,
  headline text default '',
  location text default '',
  email text unique not null,
  phone_number text default '',
  avatar_url text default 'https://randomuser.me/api/portraits/men/32.jpg',
  linkedin_url text default '',
  facebook_url text default '',
  instagram_url text default '',
  twitter_url text default '',
  dark_mode boolean default false,
  biometric boolean default false,
  push_notifications boolean default true,
  weekly_goal text default '',
  subscription_plan text default 'free',
  role text not null default 'client' check (role in ('client', 'admin', 'staff')),
  account_status text not null default 'active' check (account_status in ('active', 'inactive', 'suspended')),
  assigned_consultant_id text,
  profile_image text default '',
  timezone text not null default 'Australia/Melbourne',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles add column if not exists role text not null default 'client';
alter table profiles add column if not exists account_status text not null default 'active';
alter table profiles add column if not exists assigned_consultant_id text;
alter table profiles add column if not exists profile_image text default '';
alter table profiles add column if not exists timezone text not null default 'Australia/Melbourne';
alter table profiles add column if not exists updated_at timestamptz default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_role_check'
  ) then
    alter table profiles
      add constraint profiles_role_check
      check (role in ('client', 'admin', 'staff'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'profiles_account_status_check'
  ) then
    alter table profiles
      add constraint profiles_account_status_check
      check (account_status in ('active', 'inactive', 'suspended'));
  end if;
end
$$;

drop trigger if exists profiles_set_updated_at on profiles;
create trigger profiles_set_updated_at
before update on profiles
for each row
execute function set_updated_at();

-- 2. Admins
create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz default now()
);

-- 3. Job Categories
create table if not exists job_categories (
  id bigint generated always as identity primary key,
  name text unique not null
);

-- 4. Jobs / Opportunities
create table if not exists jobs (
  id text primary key,
  title text not null,
  company text not null,
  location text not null,
  salary text not null,
  job_type text not null default 'Full-time',
  job_link text default '',
  category_id bigint references job_categories (id) on delete set null,
  posted_at text not null,
  match_score int not null default 80,
  tags text[] not null default '{}',
  description text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table jobs add column if not exists updated_at timestamptz default now();
alter table jobs add column if not exists job_link text default '';

drop trigger if exists jobs_set_updated_at on jobs;
create trigger jobs_set_updated_at
before update on jobs
for each row
execute function set_updated_at();

-- 5. Saved Jobs
create table if not exists saved_jobs (
  user_id text not null references profiles (id) on delete cascade,
  job_id text not null references jobs (id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, job_id)
);

-- 6. Job Applications / Tracker
create table if not exists applications (
  id bigint generated always as identity primary key,
  user_id text not null references profiles (id) on delete cascade,
  job_id text not null references jobs (id) on delete cascade,
  status text not null default 'applied',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table applications add column if not exists client_id text;
alter table applications add column if not exists created_by_admin_id text;
alter table applications add column if not exists company_name text default '';
alter table applications add column if not exists job_title text default '';
alter table applications add column if not exists job_location text default '';
alter table applications add column if not exists state text default '';
alter table applications add column if not exists country text default 'Australia';
alter table applications add column if not exists work_type text default '';
alter table applications add column if not exists employment_type text default '';
alter table applications add column if not exists source text default '';
alter table applications add column if not exists source_url text default '';
alter table applications add column if not exists job_reference_number text default '';
alter table applications add column if not exists application_date timestamptz;
alter table applications add column if not exists applied_at timestamptz;
alter table applications add column if not exists current_stage text default '';
alter table applications add column if not exists priority text default 'medium';
alter table applications add column if not exists salary_range text default '';
alter table applications add column if not exists recruiter_name text default '';
alter table applications add column if not exists recruiter_email text default '';
alter table applications add column if not exists recruiter_phone text default '';
alter table applications add column if not exists hiring_manager_name text default '';
alter table applications add column if not exists hiring_manager_email text default '';
alter table applications add column if not exists job_description text default '';
alter table applications add column if not exists notes text default '';
alter table applications add column if not exists next_action text default '';
alter table applications add column if not exists next_action_date timestamptz;
alter table applications add column if not exists follow_up_required boolean default false;
alter table applications add column if not exists is_saved boolean default false;
alter table applications add column if not exists is_active boolean default true;
alter table applications add column if not exists rejection_reason text default '';
alter table applications add column if not exists offer_amount numeric(12,2);
alter table applications add column if not exists offer_received_at timestamptz;
alter table applications add column if not exists hired_at timestamptz;
alter table applications add column if not exists updated_at timestamptz default now();

update applications
set
  client_id = coalesce(client_id, user_id),
  company_name = case when company_name = '' then coalesce((select company from jobs where jobs.id = applications.job_id), '') else company_name end,
  job_title = case when job_title = '' then coalesce((select title from jobs where jobs.id = applications.job_id), '') else job_title end,
  job_location = case when job_location = '' then coalesce((select location from jobs where jobs.id = applications.job_id), '') else job_location end,
  salary_range = case when salary_range = '' then coalesce((select salary from jobs where jobs.id = applications.job_id), '') else salary_range end,
  work_type = case when work_type = '' then coalesce((select job_type from jobs where jobs.id = applications.job_id), '') else work_type end,
  employment_type = case when employment_type = '' then coalesce((select job_type from jobs where jobs.id = applications.job_id), '') else employment_type end,
  job_description = case when job_description = '' then coalesce((select description from jobs where jobs.id = applications.job_id), '') else job_description end,
  application_date = coalesce(application_date, created_at),
  applied_at = coalesce(applied_at, created_at),
  current_stage = case when current_stage = '' then status else current_stage end,
  is_saved = coalesce(is_saved, status = 'saved'),
  is_active = coalesce(is_active, status not in ('hired', 'rejected', 'withdrawn', 'closed')),
  updated_at = coalesce(updated_at, created_at);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'applications_status_check'
  ) then
    alter table applications
      add constraint applications_status_check
      check (
        status in (
          'draft',
          'saved',
          'applied',
          'under_review',
          'recruiter_contacted',
          'shortlisted',
          'phone_interview',
          'video_interview',
          'face_to_face_interview',
          'interview_scheduled',
          'interview_completed',
          'second_interview',
          'reference_check',
          'offer_received',
          'hired',
          'rejected',
          'withdrawn',
          'closed',
          'contacted',
          'interviewing',
          'offer'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'applications_priority_check'
  ) then
    alter table applications
      add constraint applications_priority_check
      check (priority in ('low', 'medium', 'high', 'urgent'));
  end if;
end
$$;

drop trigger if exists applications_set_updated_at on applications;
create trigger applications_set_updated_at
before update on applications
for each row
execute function set_updated_at();

-- 7. Interviews
create table if not exists interviews (
  id bigint generated always as identity primary key,
  client_id text not null,
  application_id bigint not null references applications (id) on delete cascade,
  interview_type text not null check (interview_type in ('phone', 'video', 'face_to_face', 'assessment', 'technical', 'hr', 'final')),
  interview_round text default '',
  interview_date timestamptz not null,
  start_time text default '',
  end_time text default '',
  timezone text not null default 'Australia/Melbourne',
  meeting_link text default '',
  location text default '',
  interviewer_name text default '',
  interviewer_email text default '',
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled', 'rescheduled', 'no_show')),
  result text default '',
  questions_asked text[] not null default '{}',
  client_feedback text default '',
  admin_notes text default '',
  reminder_enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists interviews_set_updated_at on interviews;
create trigger interviews_set_updated_at
before update on interviews
for each row
execute function set_updated_at();

-- 8. Follow-ups
create table if not exists follow_ups (
  id bigint generated always as identity primary key,
  client_id text not null,
  application_id bigint not null references applications (id) on delete cascade,
  follow_up_type text default 'email',
  due_date timestamptz not null,
  completed_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'due', 'overdue', 'completed', 'cancelled')),
  contact_person text default '',
  contact_email text default '',
  contact_phone text default '',
  message text default '',
  notes text default '',
  created_by text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists follow_ups_set_updated_at on follow_ups;
create trigger follow_ups_set_updated_at
before update on follow_ups
for each row
execute function set_updated_at();

-- 9. Recruiter Contacts
create table if not exists recruiter_contacts (
  id bigint generated always as identity primary key,
  client_id text not null,
  application_id bigint references applications (id) on delete cascade,
  recruiter_name text default '',
  company_name text default '',
  email text default '',
  phone text default '',
  linkedin_url text default '',
  contact_method text not null default 'email' check (contact_method in ('email', 'phone', 'linkedin', 'whatsapp', 'other')),
  contact_date timestamptz default now(),
  response_status text not null default 'no_response' check (response_status in ('no_response', 'replied', 'interested', 'interview_requested', 'not_interested')),
  response_date timestamptz,
  notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table recruiter_contacts add column if not exists linkedin_url text default '';

drop trigger if exists recruiter_contacts_set_updated_at on recruiter_contacts;
create trigger recruiter_contacts_set_updated_at
before update on recruiter_contacts
for each row
execute function set_updated_at();

-- 10. Cold Emails
create table if not exists cold_emails (
  id bigint generated always as identity primary key,
  client_id text not null,
  application_id bigint references applications (id) on delete set null,
  recipient_name text default '',
  recipient_email text not null default '',
  company_name text default '',
  subject text not null default '',
  message text not null default '',
  sent_at timestamptz,
  delivery_status text not null default 'draft',
  response_status text not null default 'no_response',
  response_at timestamptz,
  created_by text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists cold_emails_set_updated_at on cold_emails;
create trigger cold_emails_set_updated_at
before update on cold_emails
for each row
execute function set_updated_at();

-- 11. Client Scores
create table if not exists client_scores (
  id bigint generated always as identity primary key,
  client_id text not null,
  application_id bigint references applications (id) on delete set null,
  ats_score int check (ats_score between 0 and 100),
  ai_match_score int check (ai_match_score between 0 and 100),
  resume_version text default '',
  score_reason text default '',
  recommendations text[] not null default '{}',
  calculated_at timestamptz default now(),
  updated_by text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

drop trigger if exists client_scores_set_updated_at on client_scores;
create trigger client_scores_set_updated_at
before update on client_scores
for each row
execute function set_updated_at();

-- 12. Activity Logs
create table if not exists activity_logs (
  id bigint generated always as identity primary key,
  client_id text not null,
  application_id bigint references applications (id) on delete set null,
  performed_by text default '',
  activity_type text not null,
  title text not null,
  description text default '',
  old_value jsonb,
  new_value jsonb,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 13. Real-time Messages / Chat
create table if not exists conversations (
  id text primary key, -- client user_id
  client_id text not null,
  assigned_admin_id text,
  assigned_staff_id text,
  type text not null default 'support',
  status text not null default 'open',
  last_message_id bigint,
  last_message_text text,
  last_message_at timestamptz,
  last_message_sender_id text,
  client_unread_count integer not null default 0,
  admin_unread_count integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  closed_at timestamptz
);

create table if not exists messages (
  id bigint generated always as identity primary key,
  conversation_id text not null references conversations(id) on delete cascade,
  sender_id text not null,
  sender_role text not null, -- client | admin | staff
  recipient_id text,
  message_type text not null default 'text',
  text text not null,
  attachment_url text,
  attachment_name text,
  attachment_mime_type text,
  attachment_size bigint,
  client_message_id text,
  reply_to_message_id bigint,
  status text not null default 'sent',
  sent_at timestamptz default now(),
  delivered_at timestamptz,
  seen_at timestamptz,
  edited_at timestamptz,
  deleted_at timestamptz,
  is_deleted boolean not null default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists chat_activity_logs (
  id bigint generated always as identity primary key,
  conversation_id text not null references conversations(id) on delete cascade,
  performed_by text not null,
  action text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 14. Managed Services
create table if not exists services (
  id text primary key,
  title text not null,
  description text not null,
  status text not null default 'active',
  visibility boolean default true,
  created_at timestamptz default now()
);

-- 15. Managed Pricing Plans
create table if not exists success_stories (
  id text primary key,
  name text not null,
  position text not null,
  year text not null default 'Recent',
  message text not null,
  story_rate int not null default 5,
  photo_url text default '',
  display_order int not null default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 16. Managed Pricing Plans
create table if not exists pricing_plans (
  id text primary key,
  name text not null,
  price text not null,
  features text[] not null default '{}',
  created_at timestamptz default now()
);

-- 17. User Subscriptions
create table if not exists user_subscriptions (
  user_id text primary key references profiles (id) on delete cascade,
  plan_id text references pricing_plans (id) on delete set null,
  status text not null default 'active',
  expires_at timestamptz,
  created_at timestamptz default now()
);

-- 18. Push Notifications
create table if not exists notifications (
  id bigint generated always as identity primary key,
  title text not null,
  body text not null,
  user_id text references profiles (id) on delete cascade,
  status text not null default 'sent',
  sent_at timestamptz default now()
);

-- 19. Resume Scores
create table if not exists resume_scores (
  user_id text primary key references profiles (id) on delete cascade,
  score int not null default 0,
  suggestions text[] not null default '{}',
  notes text default '',
  updated_at timestamptz default now()
);

-- 20. System Settings
create table if not exists system_settings (
  id bigint primary key default 1,
  maintenance_mode boolean default false,
  push_notifications_enabled boolean default true,
  dark_mode_override boolean default false,
  constraint single_row check (id = 1)
);

insert into system_settings (id, maintenance_mode, push_notifications_enabled, dark_mode_override)
values (1, false, true, false)
on conflict (id) do nothing;

-- Seed Initial Data
insert into job_categories (name)
values ('Career Growth'), ('AI Resume'), ('Outreach'), ('Interview'), ('Remote')
on conflict (name) do nothing;

insert into services (id, title, description, status, visibility) values
('resume-intelligence', 'Resume Intelligence', 'AI-powered resume scanning and scoring engine.', 'active', true),
('hiring-manager-outreach', 'Hiring Manager Outreach', 'Direct outreach service to reach hiring managers directly.', 'active', true),
('interview-prep', 'Interview Prep', 'Personalized mock interviews and feedback.', 'active', true),
('job-tracker', 'Job Tracker', 'Advanced job application tracking pipeline.', 'active', true),
('success-stories', 'Success Stories', 'Read how other candidates landed top offers.', 'active', true)
on conflict (id) do nothing;

insert into success_stories (id, name, position, year, message, story_rate, photo_url, display_order, is_active) values
('story_jasmine_park', 'Jasmine Park', 'Barista -> UX Designer at Apple', '4 months', '"9Jobs helped me land my dream role. The resume AI was a game-changer."', 5, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80', 1, true),
('story_david_okonkwo', 'David Okonkwo', 'Marketing -> PM at Stripe', '6 months', '"The interview prep feature alone is worth 10x the subscription cost."', 5, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80', 2, true),
('story_sarah_jenkins', 'Sarah Jenkins', 'Customer Support -> CSM at Slack', '3 months', '"The automated outreach saved me hundreds of hours. I got 5 interviews in 2 weeks!"', 5, 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=120&h=120&q=80', 3, true)
on conflict (id) do nothing;

insert into pricing_plans (id, name, price, features) values
('free', 'Free Starter', '$0/month', array['Basic job search', '1 Resume score scan', 'Saved jobs']),
('pro', 'Pro Candidate', '$999/month', array['Unlimited jobs', 'AI resume intelligence', 'Hiring manager outreach', 'Priority support']),
('elite', 'Elite Premium', '$2999/month', array['Everything in Pro', 'Mock interviews', 'Dedicated career coach', 'Resume writing service'])
on conflict (id) do nothing;

-- Backfill client-level scores from legacy resume_scores if possible.
insert into client_scores (client_id, ats_score, ai_match_score, score_reason, recommendations, calculated_at, updated_by)
select
  rs.user_id,
  greatest(0, least(rs.score, 100)),
  null,
  coalesce(rs.notes, ''),
  coalesce(rs.suggestions, '{}'),
  coalesce(rs.updated_at, now()),
  'schema-backfill'
from resume_scores rs
where not exists (
  select 1
  from client_scores cs
  where cs.client_id = rs.user_id
);

-- Useful indexes
create index if not exists idx_profiles_role on profiles (role);
create index if not exists idx_profiles_account_status on profiles (account_status);
create index if not exists idx_profiles_assigned_consultant on profiles (assigned_consultant_id);

create index if not exists idx_applications_client_id on applications (client_id);
create index if not exists idx_applications_application_id on applications (id);
create index if not exists idx_applications_client_status on applications (client_id, status);
create index if not exists idx_applications_client_application_date on applications (client_id, application_date);
create index if not exists idx_applications_client_created_at on applications (client_id, created_at);
create index if not exists idx_applications_client_active on applications (client_id, is_active);
create index if not exists idx_applications_next_action_date on applications (next_action_date);

create index if not exists idx_interviews_client_id on interviews (client_id);
create index if not exists idx_interviews_application_id on interviews (application_id);
create index if not exists idx_interviews_interview_date on interviews (interview_date);

create index if not exists idx_follow_ups_client_id on follow_ups (client_id);
create index if not exists idx_follow_ups_application_id on follow_ups (application_id);
create index if not exists idx_follow_ups_due_date on follow_ups (due_date);

create index if not exists idx_recruiter_contacts_client_id on recruiter_contacts (client_id);
create index if not exists idx_recruiter_contacts_application_id on recruiter_contacts (application_id);
create index if not exists idx_recruiter_contacts_email on recruiter_contacts (email);

create index if not exists idx_cold_emails_client_id on cold_emails (client_id);
create index if not exists idx_cold_emails_application_id on cold_emails (application_id);
create index if not exists idx_cold_emails_sent_at on cold_emails (sent_at);

create index if not exists idx_client_scores_client_id on client_scores (client_id);
create index if not exists idx_client_scores_application_id on client_scores (application_id);
create index if not exists idx_client_scores_calculated_at on client_scores (calculated_at desc);

create index if not exists idx_activity_logs_client_id on activity_logs (client_id);
create index if not exists idx_activity_logs_application_id on activity_logs (application_id);
create index if not exists idx_activity_logs_created_at on activity_logs (created_at desc);

-- Preview access for the current local architecture.
alter table if exists profiles disable row level security;
alter table if exists admins disable row level security;
alter table if exists job_categories disable row level security;
alter table if exists jobs disable row level security;
alter table if exists saved_jobs disable row level security;
alter table if exists applications disable row level security;
alter table if exists interviews disable row level security;
alter table if exists follow_ups disable row level security;
alter table if exists recruiter_contacts disable row level security;
alter table if exists cold_emails disable row level security;
alter table if exists client_scores disable row level security;
alter table if exists activity_logs disable row level security;
alter table if exists conversations disable row level security;
alter table if exists messages disable row level security;
alter table if exists chat_activity_logs disable row level security;
alter table if exists services disable row level security;
alter table if exists success_stories disable row level security;
alter table if exists pricing_plans disable row level security;
alter table if exists user_subscriptions disable row level security;
alter table if exists notifications disable row level security;
alter table if exists resume_scores disable row level security;
alter table if exists system_settings disable row level security;
