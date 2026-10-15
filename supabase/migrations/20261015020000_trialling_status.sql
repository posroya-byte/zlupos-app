alter table public.tenants drop constraint if exists tenants_status_check;
alter table public.tenants
  add constraint tenants_status_check check (status in ('trialing', 'trialling', 'active', 'suspended', 'cancelled'));

alter table public.subscriptions drop constraint if exists subscriptions_status_check;
alter table public.subscriptions
  add constraint subscriptions_status_check check (status in ('trialing', 'trialling', 'active', 'past_due', 'cancelled'));