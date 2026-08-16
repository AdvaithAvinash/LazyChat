-- RPCs for the two operations that need atomic SQL expressions (array
-- append, +1 increments) rather than a plain column overwrite from the
-- client. Both are SECURITY DEFINER but re-check membership internally so
-- they can't be used to touch a chat the caller isn't part of.

create or replace function public.increment_unread_counts(p_chat_id uuid, p_sender_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_sender_id <> auth.uid() then
    raise exception 'p_sender_id must match the calling user';
  end if;

  if not exists (
    select 1 from public.chat_members where chat_id = p_chat_id and user_id = auth.uid()
  ) then
    raise exception 'not a member of this chat';
  end if;

  update public.chat_members
  set unread_count = unread_count + 1
  where chat_id = p_chat_id and user_id <> p_sender_id;
end;
$$;

grant execute on function public.increment_unread_counts(uuid, uuid) to authenticated;

create or replace function public.mark_messages_read(p_message_ids uuid[], p_chat_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.chat_members where chat_id = p_chat_id and user_id = auth.uid()
  ) then
    raise exception 'not a member of this chat';
  end if;

  update public.messages
  set status = 'read',
      read_by = case
        when auth.uid() = any(read_by) then read_by
        else array_append(read_by, auth.uid())
      end
  where id = any(p_message_ids) and chat_id = p_chat_id;

  update public.chat_members
  set unread_count = 0
  where chat_id = p_chat_id and user_id = auth.uid();
end;
$$;

grant execute on function public.mark_messages_read(uuid[], uuid) to authenticated;
