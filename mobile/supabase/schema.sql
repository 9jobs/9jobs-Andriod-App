create table if not exists profiles (
  id uuid primary key,
  full_name text not null,
  headline text default '',
  location text default '',
  email text unique not null,
  dark_mode boolean default false,
  biometric boolean default false,
  weekly_goal text default ''
);

create table if not exists job_categories (
  id bigint generated always as identity primary key,
  name text unique not null
);

create table if not exists jobs (
  id text primary key,
  title text not null,
  company text not null,
  location text not null,
  salary text not null,
  category_id bigint references job_categories (id),
  posted_at text not null,
  match_score int not null,
  tags text[] not null default '{}',
  description text not null
);

create table if not exists saved_jobs (
  user_id uuid not null,
  job_id text not null references jobs (id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, job_id)
);

create table if not exists applications (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  job_id text not null references jobs (id) on delete cascade,
  status text not null default 'applied',
  created_at timestamptz default now()
);

create table if not exists user_preferences (
  user_id uuid primary key,
  dark_mode boolean default false,
  biometric boolean default false
);

insert into job_categories (name)
values ('Career Growth'), ('AI Resume'), ('Outreach'), ('Interview'), ('Remote')
on conflict (name) do nothing;
