do $$
declare
  target_email constant text := lower('REPLACE_WITH_TRUSTED_VERIFIED_EMAIL');
  target_user_id uuid;
begin
  if target_email = 'replace_with_trusted_verified_email' then
    raise exception 'Replace the placeholder with a verified, trusted operator email.';
  end if;

  select id into strict target_user_id
  from auth.users
  where lower(email) = target_email
    and email_confirmed_at is not null;

  insert into public.platform_admins (user_id)
  values (target_user_id)
  on conflict (user_id) do nothing;
end;
$$;