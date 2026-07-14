-- Chat Feature Database Migration

-- 1. Drop existing messages table if it exists to redefine it
drop table if exists messages cascade;

-- 2. Create Conversations Table
create table if not exists conversations (
  id text primary key, -- client user_id
  client_id text not null,
  assigned_admin_id text,
  assigned_staff_id text,
  type text not null default 'support',
  status text not null default 'open', -- open | pending | resolved | closed
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

-- Ensure there is a unique constraint on client_id for type 'support'
create unique index if not exists idx_unique_client_support_conv on conversations (client_id) where type = 'support';

-- 3. Create Messages Table
create table if not exists messages (
  id bigint generated always as identity primary key,
  conversation_id text not null references conversations(id) on delete cascade,
  sender_id text not null,
  sender_role text not null, -- client | admin | staff
  recipient_id text,
  message_type text not null default 'text', -- text | image | document | system
  text text not null,
  attachment_url text,
  attachment_name text,
  attachment_mime_type text,
  attachment_size bigint,
  client_message_id text,
  reply_to_message_id bigint,
  status text not null default 'sent', -- sending | sent | delivered | seen | failed
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

-- 4. Create Chat Activity Logs Table
create table if not exists chat_activity_logs (
  id bigint generated always as identity primary key,
  conversation_id text not null references conversations(id) on delete cascade,
  performed_by text not null,
  action text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 5. Add Useful Indexes
create index if not exists idx_conversations_client_id on conversations (client_id);
create index if not exists idx_conversations_status on conversations (status);
create index if not exists idx_conversations_last_message_at on conversations (last_message_at desc);

create index if not exists idx_messages_conversation_id on messages (conversation_id);
create index if not exists idx_messages_created_at on messages (created_at);
create index if not exists idx_messages_status on messages (status);
create index if not exists idx_messages_client_message_id on messages (client_message_id);

create index if not exists idx_chat_logs_conversation_id on chat_activity_logs (conversation_id);

-- 6. Trigger to automatically handle new messages (Insert)
create or replace function handle_new_message()
returns trigger as $$
declare
  v_conv_id text;
begin
  v_conv_id := new.conversation_id;

  -- Ensure conversation exists
  insert into conversations (id, client_id, type, status, created_at, updated_at)
  values (v_conv_id, v_conv_id, 'support', 'open', now(), now())
  on conflict (id) do update
  set status = case when conversations.status = 'closed' or conversations.status = 'resolved' then 'open' else conversations.status end,
      updated_at = now();

  -- Update last message details and unread counts
  update conversations
  set last_message_id = new.id,
      last_message_text = new.text,
      last_message_at = new.created_at,
      last_message_sender_id = new.sender_id,
      admin_unread_count = case when new.sender_role = 'client' then admin_unread_count + 1 else admin_unread_count end,
      client_unread_count = case when new.sender_role = 'admin' or new.sender_role = 'staff' then client_unread_count + 1 else client_unread_count end,
      updated_at = now()
  where id = v_conv_id;

  -- Log activity
  insert into chat_activity_logs (conversation_id, performed_by, action, metadata)
  values (v_conv_id, new.sender_id, 'message_sent', jsonb_build_object('message_id', new.id));

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_handle_new_message on messages;
create trigger trg_handle_new_message
after insert on messages
for each row
execute function handle_new_message();

-- 7. Trigger to automatically handle message updates (seen/delivered logs)
create or replace function handle_message_update()
returns trigger as $$
begin
  if old.seen_at is null and new.seen_at is not null then
    insert into chat_activity_logs (conversation_id, performed_by, action, metadata)
    values (new.conversation_id, coalesce(new.recipient_id, 'system'), 'message_seen', jsonb_build_object('message_id', new.id));
  end if;
  
  if old.delivered_at is null and new.delivered_at is not null then
    insert into chat_activity_logs (conversation_id, performed_by, action, metadata)
    values (new.conversation_id, coalesce(new.recipient_id, 'system'), 'message_delivered', jsonb_build_object('message_id', new.id));
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_handle_message_update on messages;
create trigger trg_handle_message_update
after update on messages
for each row
execute function handle_message_update();

-- 8. Disable Row-Level Security for Preview Development
alter table conversations disable row level security;
alter table messages disable row level security;
alter table chat_activity_logs disable row level security;

-- 9. Enable Realtime Replication
alter publication supabase_realtime add table conversations;
alter publication supabase_realtime add table messages;
