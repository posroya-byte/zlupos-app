create extension if not exists pgcrypto;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  primary_color text not null default '#1d6c52' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  owner_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'trialing' check (status in ('trialing', 'active', 'suspended', 'cancelled')),
  trial_ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  role text not null default 'owner' check (role in ('owner', 'manager', 'cashier')),
  created_at timestamptz not null default now()
);

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  address text,
  phone text,
  is_main boolean not null default false,
  created_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  category text not null,
  price numeric(12, 2) not null check (price >= 0),
  duration_minutes integer not null default 30 check (duration_minutes > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  customer_name text not null,
  customer_phone text,
  starts_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  branch_id uuid not null references public.branches(id) on delete restrict,
  cashier_id uuid not null references public.profiles(id) on delete restrict,
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  discount numeric(12, 2) not null default 0 check (discount >= 0),
  total numeric(12, 2) not null check (total >= 0),
  total_amount numeric(12, 2) not null check (total_amount >= 0),
  payment_method text not null check (payment_method in ('cash', 'card')),
  status text not null default 'completed' check (status in ('completed', 'refunded', 'voided')),
  created_at timestamptz not null default now()
);

alter table public.sales add column if not exists total_amount numeric(12, 2);
update public.sales set total_amount = total where total_amount is null;
alter table public.sales alter column total_amount set not null;
alter table public.sales add column if not exists status text not null default 'completed';
alter table public.sales drop constraint if exists sales_status_check;
alter table public.sales add constraint sales_status_check check (status in ('completed', 'refunded', 'voided'));

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  sale_id uuid not null references public.sales(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  service_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  line_total numeric(12, 2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  plan text not null check (plan in ('starter', 'growth', 'scale')),
  status text not null default 'trialing' check (status in ('trialing', 'active', 'past_due', 'cancelled')),
  starts_at timestamptz not null default now(),
  trial_ends_at timestamptz not null,
  current_period_ends_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists profiles_tenant_id_idx on public.profiles(tenant_id);
create index if not exists branches_tenant_id_idx on public.branches(tenant_id);
create index if not exists services_tenant_id_idx on public.services(tenant_id);
create index if not exists appointments_tenant_starts_at_idx on public.appointments(tenant_id, starts_at);
create index if not exists sales_tenant_created_at_idx on public.sales(tenant_id, created_at desc);
create index if not exists sale_items_sale_id_idx on public.sale_items(sale_id);
create index if not exists subscriptions_tenant_id_idx on public.subscriptions(tenant_id);

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.branches enable row level security;
alter table public.services enable row level security;
alter table public.appointments enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.subscriptions enable row level security;

grant select on public.profiles, public.branches, public.services to authenticated;
grant insert, select on public.sales, public.sale_items to authenticated;
grant select, insert, update, delete on public.appointments to authenticated;
grant insert, update, delete on public.services to authenticated;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));

drop policy if exists "branches_select_tenant" on public.branches;
create policy "branches_select_tenant" on public.branches
  for select to authenticated using (
    tenant_id = (select p.tenant_id from public.profiles p where p.id = (select auth.uid()))
  );

drop policy if exists "services_select_tenant" on public.services;
create policy "services_select_tenant" on public.services
  for select to authenticated using (
    tenant_id = (select p.tenant_id from public.profiles p where p.id = (select auth.uid()))
  );

drop policy if exists "services_manage_tenant" on public.services;
create policy "services_manage_tenant" on public.services
  for all to authenticated
  using (
    tenant_id = (select p.tenant_id from public.profiles p where p.id = (select auth.uid()))
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('owner', 'manager'))
  )
  with check (
    tenant_id = (select p.tenant_id from public.profiles p where p.id = (select auth.uid()))
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('owner', 'manager'))
  );

drop policy if exists "appointments_select_tenant" on public.appointments;
create policy "appointments_select_tenant" on public.appointments
  for select to authenticated using (
    tenant_id = (select p.tenant_id from public.profiles p where p.id = (select auth.uid()))
  );

drop policy if exists "appointments_insert_tenant" on public.appointments;
create policy "appointments_insert_tenant" on public.appointments
  for insert to authenticated with check (
    tenant_id = (select p.tenant_id from public.profiles p where p.id = (select auth.uid()))
    and exists (select 1 from public.branches b where b.id = branch_id and b.tenant_id = appointments.tenant_id)
    and exists (select 1 from public.services s where s.id = service_id and s.tenant_id = appointments.tenant_id)
  );

drop policy if exists "appointments_update_tenant" on public.appointments;
create policy "appointments_update_tenant" on public.appointments
  for update to authenticated
  using (tenant_id = (select p.tenant_id from public.profiles p where p.id = (select auth.uid())))
  with check (
    tenant_id = (select p.tenant_id from public.profiles p where p.id = (select auth.uid()))
    and exists (select 1 from public.branches b where b.id = branch_id and b.tenant_id = appointments.tenant_id)
    and exists (select 1 from public.services s where s.id = service_id and s.tenant_id = appointments.tenant_id)
  );

drop policy if exists "appointments_delete_tenant" on public.appointments;
create policy "appointments_delete_tenant" on public.appointments
  for delete to authenticated using (
    tenant_id = (select p.tenant_id from public.profiles p where p.id = (select auth.uid()))
  );

drop policy if exists "sales_select_tenant" on public.sales;
create policy "sales_select_tenant" on public.sales
  for select to authenticated using (
    tenant_id = (select p.tenant_id from public.profiles p where p.id = (select auth.uid()))
  );

drop policy if exists "sales_insert_tenant" on public.sales;
create policy "sales_insert_tenant" on public.sales
  for insert to authenticated with check (
    tenant_id = (select p.tenant_id from public.profiles p where p.id = (select auth.uid()))
    and cashier_id = (select auth.uid())
    and exists (select 1 from public.branches b where b.id = branch_id and b.tenant_id = sales.tenant_id)
  );

drop policy if exists "sale_items_select_tenant" on public.sale_items;
create policy "sale_items_select_tenant" on public.sale_items
  for select to authenticated using (
    tenant_id = (select p.tenant_id from public.profiles p where p.id = (select auth.uid()))
  );

drop policy if exists "sale_items_insert_tenant" on public.sale_items;
create policy "sale_items_insert_tenant" on public.sale_items
  for insert to authenticated with check (
    tenant_id = (select p.tenant_id from public.profiles p where p.id = (select auth.uid()))
    and exists (
      select 1 from public.sales s
      where s.id = sale_id and s.tenant_id = sale_items.tenant_id
    )
    and exists (
      select 1 from public.services svc
      where svc.id = service_id and svc.tenant_id = sale_items.tenant_id
    )
  );

create or replace function public.create_sale(p_branch_id uuid, p_payment_method text, p_items jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_tenant_id uuid;
  v_sale_id uuid;
  v_created_at timestamptz;
  v_total numeric(12, 2) := 0;
  v_item jsonb;
  v_service public.services%rowtype;
  v_quantity integer;
  v_items jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select p.tenant_id into v_tenant_id from public.profiles p where p.id = v_user_id;
  if v_tenant_id is null then
    raise exception 'Tenant profile not found';
  end if;

  if p_payment_method not in ('cash', 'card') then
    raise exception 'Invalid payment method';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Sale must contain at least one item';
  end if;
  if not exists (select 1 from public.branches b where b.id = p_branch_id and b.tenant_id = v_tenant_id) then
    raise exception 'Invalid branch';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if coalesce(v_item->>'quantity', '') !~ '^[1-9][0-9]*$' then
      raise exception 'Invalid item quantity';
    end if;
    v_quantity := (v_item->>'quantity')::integer;
    select * into v_service from public.services s
      where s.id = (v_item->>'service_id')::uuid
        and s.tenant_id = v_tenant_id
        and s.is_active
      for share;
    if not found then
      raise exception 'Service is unavailable';
    end if;
    v_total := v_total + v_service.price * v_quantity;
  end loop;

  insert into public.sales (tenant_id, branch_id, cashier_id, subtotal, discount, total, total_amount, payment_method, status)
  values (v_tenant_id, p_branch_id, v_user_id, v_total, 0, v_total, v_total, p_payment_method, 'completed')
  returning id, created_at into v_sale_id, v_created_at;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item->>'quantity')::integer;
    select * into v_service from public.services s
      where s.id = (v_item->>'service_id')::uuid
        and s.tenant_id = v_tenant_id
        and s.is_active
      for share;
    insert into public.sale_items (tenant_id, sale_id, service_id, service_name, quantity, unit_price, line_total)
    values (v_tenant_id, v_sale_id, v_service.id, v_service.name, v_quantity, v_service.price, v_service.price * v_quantity);
  end loop;

  select jsonb_agg(jsonb_build_object(
    'service_id', si.service_id,
    'name', si.service_name,
    'quantity', si.quantity,
    'unit_price', si.unit_price
  )) into v_items
  from public.sale_items si where si.sale_id = v_sale_id;

  return jsonb_build_object(
    'sale_id', v_sale_id,
    'total_amount', v_total,
    'created_at', v_created_at,
    'items', v_items
  );
end;
$$;

revoke all on function public.create_sale(uuid, text, jsonb) from public;
grant execute on function public.create_sale(uuid, text, jsonb) to authenticated;