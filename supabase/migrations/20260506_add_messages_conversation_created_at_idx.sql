create index if not exists messages_conversation_created_at_desc_idx
  on public.messages (conversation_id, created_at desc);
