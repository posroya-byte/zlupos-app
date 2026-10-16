begin;

alter table public.tenants
  add column if not exists country_code text,
  add column if not exists currency text not null default 'EGP',
  add column if not exists timezone text not null default 'Africa/Cairo';

alter table public.branches
  add column if not exists country_code text,
  add column if not exists currency text not null default 'EGP',
  add column if not exists timezone text not null default 'Africa/Cairo';

alter table public.tenants drop constraint if exists tenants_status_check;
update public.tenants set status = 'trialing' where status = 'trialling';
alter table public.tenants
  add constraint tenants_status_check check (status in ('trialing', 'active', 'suspended', 'cancelled'));

alter table public.subscriptions drop constraint if exists subscriptions_status_check;
update public.subscriptions set status = 'trialing' where status = 'trialling';
alter table public.subscriptions
  add constraint subscriptions_status_check check (status in ('trialing', 'active', 'past_due', 'cancelled'));

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
revoke all on public.platform_admins from public, anon, authenticated;
grant all on public.platform_admins to service_role;

alter table public.sales add column if not exists request_key uuid;
alter table public.sales add column if not exists request_fingerprint text;
create unique index if not exists sales_idempotency_key_idx
  on public.sales (tenant_id, cashier_id, request_key)
  where request_key is not null;

revoke insert on public.sales, public.sale_items from public, anon, authenticated;
drop policy if exists sales_insert_tenant on public.sales;
drop policy if exists sale_items_insert_tenant on public.sale_items;

drop function if exists public.create_sale(uuid, text, jsonb);
create or replace function public.create_sale(
  p_branch_id uuid,
  p_payment_method text,
  p_items jsonb,
  p_request_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_tenant public.tenants%rowtype;
  v_subscription public.subscriptions%rowtype;
  v_sale public.sales%rowtype;
  v_sale_id uuid;
  v_created_at timestamptz;
  v_total numeric(12, 2) := 0;
  v_item jsonb;
  v_service public.services%rowtype;
  v_quantity integer;
  v_items jsonb;
  v_fingerprint text;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_request_key is null then
    raise exception 'Idempotency key required';
  end if;

  select * into v_profile from public.profiles where id = v_user_id;
  if not found or v_profile.role not in ('owner', 'manager', 'cashier') then
    raise exception 'Salon profile not found';
  end if;
  select * into v_tenant from public.tenants where id = v_profile.tenant_id;
  if not found then
    raise exception 'Tenant not found';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    v_tenant.id::text || ':' || v_user_id::text || ':' || p_request_key::text, 0
  ));

  v_fingerprint := md5(jsonb_build_object(
    'branch_id', p_branch_id,
    'payment_method', p_payment_method,
    'items', p_items
  )::text);

  select * into v_sale
  from public.sales
  where tenant_id = v_tenant.id
    and cashier_id = v_user_id
    and request_key = p_request_key;
  if found then
    if v_sale.request_fingerprint is distinct from v_fingerprint then
      raise exception 'Idempotency key was already used for a different sale';
    end if;
    select jsonb_agg(jsonb_build_object(
      'service_id', si.service_id,
      'name', si.service_name,
      'quantity', si.quantity,
      'unit_price', si.unit_price
    ) order by si.created_at, si.id) into v_items
    from public.sale_items si where si.sale_id = v_sale.id;
    return jsonb_build_object(
      'sale_id', v_sale.id,
      'total_amount', v_sale.total_amount,
      'created_at', v_sale.created_at,
      'items', v_items
    );
  end if;

  if v_tenant.status = 'trialing' then
    select * into v_subscription
    from public.subscriptions
    where tenant_id = v_tenant.id
    order by created_at desc
    limit 1;
    if not found or v_subscription.status <> 'trialing'
      or v_subscription.trial_ends_at <= now() or v_tenant.trial_ends_at <= now() then
      raise exception 'Subscription is not active';
    end if;
  elsif v_tenant.status = 'active' then
    select * into v_subscription
    from public.subscriptions
    where tenant_id = v_tenant.id
    order by created_at desc
    limit 1;
    if not found or v_subscription.status <> 'active'
      or v_subscription.current_period_ends_at is null
      or v_subscription.current_period_ends_at <= now() then
      raise exception 'Subscription is not active';
    end if;
  else
    raise exception 'Tenant is not active';
  end if;

  if p_payment_method not in ('cash', 'card') then
    raise exception 'Invalid payment method';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Sale must contain at least one item';
  end if;
  if not exists (
    select 1 from public.branches b
    where b.id = p_branch_id and b.tenant_id = v_tenant.id
  ) then
    raise exception 'Invalid branch';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(v_item) <> 'object'
      or coalesce(v_item->>'quantity', '') !~ '^[1-9][0-9]*$' then
      raise exception 'Invalid sale item';
    end if;
    v_quantity := (v_item->>'quantity')::integer;
    select * into v_service from public.services s
      where s.id = (v_item->>'service_id')::uuid
        and s.tenant_id = v_tenant.id
        and s.is_active
      for share;
    if not found then
      raise exception 'Service is unavailable';
    end if;
    v_total := v_total + v_service.price * v_quantity;
  end loop;

  insert into public.sales (
    tenant_id, branch_id, cashier_id, subtotal, discount, total, total_amount,
    payment_method, status, request_key, request_fingerprint
  ) values (
    v_tenant.id, p_branch_id, v_user_id, v_total, 0, v_total, v_total,
    p_payment_method, 'completed', p_request_key, v_fingerprint
  ) returning id, created_at into v_sale_id, v_created_at;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item->>'quantity')::integer;
    select * into v_service from public.services s
      where s.id = (v_item->>'service_id')::uuid
        and s.tenant_id = v_tenant.id
        and s.is_active
      for share;
    insert into public.sale_items (
      tenant_id, sale_id, service_id, service_name, quantity, unit_price, line_total
    ) values (
      v_tenant.id, v_sale_id, v_service.id, v_service.name, v_quantity,
      v_service.price, v_service.price * v_quantity
    );
  end loop;

  select jsonb_agg(jsonb_build_object(
    'service_id', si.service_id,
    'name', si.service_name,
    'quantity', si.quantity,
    'unit_price', si.unit_price
  ) order by si.created_at, si.id) into v_items
  from public.sale_items si where si.sale_id = v_sale_id;

  return jsonb_build_object(
    'sale_id', v_sale_id,
    'total_amount', v_total,
    'created_at', v_created_at,
    'items', v_items
  );
end;
$$;

revoke all on function public.create_sale(uuid, text, jsonb, uuid) from public, anon;
grant execute on function public.create_sale(uuid, text, jsonb, uuid) to authenticated;

commit;
