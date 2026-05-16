create table if not exists public.message_email_notifications (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  last_message_id uuid null references public.messages(id) on delete set null,
  last_notified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (conversation_id, recipient_id)
);

create index if not exists message_email_notifications_recipient_last_notified_idx
  on public.message_email_notifications (recipient_id, last_notified_at desc);

alter table public.message_email_notifications enable row level security;

drop policy if exists "Message email notifications are readable by participants" on public.message_email_notifications;
create policy "Message email notifications are readable by participants"
  on public.message_email_notifications
  for select
  using (
    exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

drop policy if exists "Message email notifications are writable by participants" on public.message_email_notifications;
create policy "Message email notifications are writable by participants"
  on public.message_email_notifications
  for insert
  with check (
    exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

drop policy if exists "Message email notifications are updatable by participants" on public.message_email_notifications;
create policy "Message email notifications are updatable by participants"
  on public.message_email_notifications
  for update
  using (
    exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );
