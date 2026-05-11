begin;

select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'ecf2d5ca-cd7e-4a40-a339-9f257b60f836', true);
set local role authenticated;

select count(*) as before_rows_count
from public.messages
where conversation_id = '710f1f94-ce1e-49c6-a5f5-455466915810'
  and recipient_id = 'ecf2d5ca-cd7e-4a40-a339-9f257b60f836'
  and read_at is null;

with updated as (
  update public.messages
  set read_at = now()
  where conversation_id = '710f1f94-ce1e-49c6-a5f5-455466915810'
    and recipient_id = 'ecf2d5ca-cd7e-4a40-a339-9f257b60f836'
    and read_at is null
  returning id
)
select count(*) as affected_rows
from updated;

select count(*) as after_rows_count
from public.messages
where conversation_id = '710f1f94-ce1e-49c6-a5f5-455466915810'
  and recipient_id = 'ecf2d5ca-cd7e-4a40-a339-9f257b60f836'
  and read_at is null;

commit;
