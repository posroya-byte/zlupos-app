import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migration = await readFile(
  new URL("../migrations/20261015030000_stabilize_tenant_access_and_sales.sql", import.meta.url),
  "utf8",
);
const previousMigrations = await Promise.all([
  readFile(new URL("../migrations/20261015000000_init.sql", import.meta.url), "utf8"),
  readFile(new URL("../migrations/20261015010000_onboarding_service_role_grants.sql", import.meta.url), "utf8"),
  readFile(new URL("../migrations/20261015020000_trialling_status.sql", import.meta.url), "utf8"),
]);
const schemaSource = await readFile(new URL("../schema.sql", import.meta.url), "utf8");
const adminProvisioning = await readFile(
  new URL("../operations/provision_platform_admin.sql", import.meta.url),
  "utf8",
);

const ids = {
  ownerA: "00000000-0000-4000-8000-000000000001",
  ownerB: "00000000-0000-4000-8000-000000000002",
  platformAdmin: "00000000-0000-4000-8000-000000000003",
  tenantA: "10000000-0000-4000-8000-000000000001",
  tenantB: "10000000-0000-4000-8000-000000000002",
  branchA: "20000000-0000-4000-8000-000000000001",
  branchB: "20000000-0000-4000-8000-000000000002",
  serviceA: "30000000-0000-4000-8000-000000000001",
  serviceB: "30000000-0000-4000-8000-000000000002",
  saleKey: "40000000-0000-4000-8000-000000000001",
  cardKey: "40000000-0000-4000-8000-000000000002",
  rollbackKey: "40000000-0000-4000-8000-000000000003",
  retryKey: "40000000-0000-4000-8000-000000000007",
};

const bootstrap = `
create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid
language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
`;

const seedData = `
insert into auth.users (id) values
  ('${ids.ownerA}'), ('${ids.ownerB}'), ('${ids.platformAdmin}');
insert into public.tenants (id, name, slug, owner_id, status, trial_ends_at) values
  ('${ids.tenantA}', 'Test Salon A', 'test-a', '${ids.ownerA}', 'trialling', now() + interval '30 days'),
  ('${ids.tenantB}', 'Test Salon B', 'test-b', '${ids.ownerB}', 'trialling', now() + interval '30 days');
insert into public.profiles (id, tenant_id, full_name, email, role) values
  ('${ids.ownerA}', '${ids.tenantA}', 'Owner A', 'owner-a@test.invalid', 'owner'),
  ('${ids.ownerB}', '${ids.tenantB}', 'Owner B', 'owner-b@test.invalid', 'owner');
insert into public.branches (id, tenant_id, name, is_main) values
  ('${ids.branchA}', '${ids.tenantA}', 'Main A', true),
  ('${ids.branchB}', '${ids.tenantB}', 'Main B', true);
insert into public.services (id, tenant_id, name, category, price) values
  ('${ids.serviceA}', '${ids.tenantA}', 'Service A', 'Test', 50),
  ('${ids.serviceB}', '${ids.tenantB}', 'Service B', 'Test', 80);
insert into public.subscriptions (tenant_id, plan, status, starts_at, trial_ends_at) values
  ('${ids.tenantA}', 'starter', 'trialling', now(), now() + interval '30 days'),
  ('${ids.tenantB}', 'starter', 'trialling', now(), now() + interval '30 days');
`;

function withoutPgcryptoExtension(sql) {
  return sql.replace(/^create extension if not exists pgcrypto;\s*/im, "");
}

const db = new PGlite();

async function asUser(userId, action) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId]);
  await db.exec("set role authenticated");
  try {
    return await action();
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}

async function createSale(userId, branchId, paymentMethod, items, requestKey) {
  return asUser(userId, async () => {
    const result = await db.query(
      "select public.create_sale($1::uuid, $2, $3::jsonb, $4::uuid) as sale",
      [branchId, paymentMethod, JSON.stringify(items), requestKey],
    );
    return result.rows[0].sale;
  });
}

test("stabilization migration against isolated PostgreSQL", async (suite) => {
  try {
    await db.exec(bootstrap);
    await db.exec(withoutPgcryptoExtension(previousMigrations[0]));
    await db.exec(previousMigrations[1]);
    await db.exec(previousMigrations[2]);
    await db.exec(seedData);
    await db.exec(migration);

    await suite.test("normalizes legacy trial values without deleting tenant rows", async () => {
      const tenants = await db.query("select status from public.tenants order by slug");
      const subscriptions = await db.query("select status from public.subscriptions order by tenant_id");
      assert.deepEqual(tenants.rows.map((row) => row.status), ["trialing", "trialing"]);
      assert.deepEqual(subscriptions.rows.map((row) => row.status), ["trialing", "trialing"]);
      assert.equal((await db.query("select count(*)::int as count from public.tenants")).rows[0].count, 2);
    });

    await suite.test("is safe to re-run", async () => {
      await db.exec(migration);
      assert.equal((await db.query("select count(*)::int as count from public.tenants")).rows[0].count, 2);
      assert.equal((await db.query("select count(*)::int as count from public.platform_admins")).rows[0].count, 0);
    });

    await suite.test("enforces cross-tenant service reads and writes", async () => {
      const visibleToA = await asUser(ids.ownerA, () => db.query(
        "select id from public.services where id = $1", [ids.serviceB],
      ));
      assert.equal(visibleToA.rows.length, 0);

      const updatedByB = await asUser(ids.ownerB, () => db.query(
        "update public.services set price = 1 where id = $1 returning id", [ids.serviceA],
      ));
      assert.equal(updatedByB.rows.length, 0);

      await asUser(ids.ownerA, () => db.query(
        "insert into public.services (id, tenant_id, name, category, price) values ($1, $2, 'Added A', 'Test', 12)",
        ["30000000-0000-4000-8000-000000000003", ids.tenantA],
      ));
      assert.equal((await db.query("select price from public.services where id = $1", [ids.serviceA])).rows[0].price, "50.00");

    });

    await suite.test("stores cash and card sales with database-calculated prices", async () => {
      const cashSale = await createSale(ids.ownerA, ids.branchA, "cash", [
        { service_id: ids.serviceA, quantity: 2, unit_price: 0, line_total: 0 },
      ], ids.saleKey);
      assert.equal(Number(cashSale.total_amount), 100);
      assert.equal(cashSale.items[0].unit_price, 50);

      const cardSale = await createSale(ids.ownerB, ids.branchB, "card", [
        { service_id: ids.serviceB, quantity: 1, price: 0 },
      ], ids.cardKey);
      assert.equal(Number(cardSale.total_amount), 80);

      const methods = await db.query("select payment_method from public.sales order by tenant_id");
      assert.deepEqual(methods.rows.map((row) => row.payment_method), ["cash", "card"]);
      assert.equal((await db.query("select count(*)::int as count from public.sale_items")).rows[0].count, 2);

      const foreignSales = await asUser(ids.ownerA, () => db.query(
        "select id from public.sales where tenant_id = $1", [ids.tenantB],
      ));
      assert.equal(foreignSales.rows.length, 0);
    });

    await suite.test("returns the original invoice on a repeated request key", async () => {
      const first = await createSale(ids.ownerA, ids.branchA, "cash", [{ service_id: ids.serviceA, quantity: 2 }], ids.retryKey);
      const repeated = await createSale(ids.ownerA, ids.branchA, "cash", [{ service_id: ids.serviceA, quantity: 2 }], ids.retryKey);
      assert.equal(repeated.sale_id, first.sale_id);
      assert.equal((await db.query("select count(*)::int as count from public.sales where request_key = $1", [ids.retryKey])).rows[0].count, 1);
      await assert.rejects(
        createSale(ids.ownerA, ids.branchA, "cash", [{ service_id: ids.serviceA, quantity: 1 }], ids.retryKey),
        /different sale/,
      );
    });

    await suite.test("blocks direct invoice writes and platform-admin reads", async () => {
      await assert.rejects(asUser(ids.ownerA, () => db.query(
        `insert into public.sales (tenant_id, branch_id, cashier_id, subtotal, total, total_amount, payment_method)
         values ($1, $2, $3, 1, 1, 1, 'cash')`,
        [ids.tenantA, ids.branchA, ids.ownerA],
      )), /permission denied/);
      await assert.rejects(asUser(ids.ownerA, () => db.query("select * from public.platform_admins")), /permission denied/);
      await assert.rejects(db.query(
        "insert into public.profiles (id, tenant_id, full_name, email, role) values ($1, $2, 'Escalated', 'bad@test.invalid', 'super_admin')",
        [ids.platformAdmin, ids.tenantA],
      ), /check constraint/);

      await db.exec("reset role; set role anon");
      try {
        await assert.rejects(db.query(
          "select public.create_sale($1::uuid, 'cash', '[]'::jsonb, $2::uuid)",
          [ids.branchA, ids.saleKey],
        ), /permission denied/);
      } finally {
        await db.exec("reset role");
      }
    });

    await suite.test("rejects expired trials and suspended tenants, then permits valid reactivation", async () => {
      await db.exec(`update public.tenants set trial_ends_at = now() - interval '1 second' where id = '${ids.tenantA}';
        update public.subscriptions set trial_ends_at = now() - interval '1 second' where tenant_id = '${ids.tenantA}';`);
      await assert.rejects(
        createSale(ids.ownerA, ids.branchA, "cash", [{ service_id: ids.serviceA, quantity: 1 }], "40000000-0000-4000-8000-000000000004"),
        /Subscription is not active/,
      );

      await db.exec(`update public.tenants set status = 'suspended', trial_ends_at = now() + interval '30 days' where id = '${ids.tenantA}';
        update public.subscriptions set status = 'trialing', trial_ends_at = now() + interval '30 days' where tenant_id = '${ids.tenantA}';`);
      await assert.rejects(
        createSale(ids.ownerA, ids.branchA, "cash", [{ service_id: ids.serviceA, quantity: 1 }], "40000000-0000-4000-8000-000000000005"),
        /Tenant is not active/,
      );

      await db.exec(`update public.tenants set status = 'trialing' where id = '${ids.tenantA}'`);
      const sale = await createSale(ids.ownerA, ids.branchA, "cash", [{ service_id: ids.serviceA, quantity: 1 }], "40000000-0000-4000-8000-000000000006");
      assert.equal(Number(sale.total_amount), 50);
    });

    await suite.test("rolls back the invoice if inserting a line item fails", async () => {
      await db.exec(`
        create function public.reject_test_sale_item() returns trigger
        language plpgsql as $$ begin raise exception 'test line failure'; end $$;
        create trigger reject_test_sale_item before insert on public.sale_items
        for each row execute function public.reject_test_sale_item();
      `);
      const before = (await db.query("select count(*)::int as count from public.sales")).rows[0].count;
      await assert.rejects(
        createSale(ids.ownerA, ids.branchA, "cash", [{ service_id: ids.serviceA, quantity: 1 }], ids.rollbackKey),
        /test line failure/,
      );
      assert.equal((await db.query("select count(*)::int as count from public.sales")).rows[0].count, before);
      assert.equal((await db.query("select count(*)::int as count from public.sales where request_key = $1", [ids.rollbackKey])).rows[0].count, 0);
      await db.exec("drop trigger reject_test_sale_item on public.sale_items; drop function public.reject_test_sale_item()");
    });

    await suite.test("restricts RPC execution to authenticated clients", async () => {
      const grants = await db.query(`
        select grantee, privilege_type from information_schema.routine_privileges
        where routine_schema = 'public' and routine_name = 'create_sale'
      `);
      assert.ok(grants.rows.some((row) => row.grantee === "authenticated" && row.privilege_type === "EXECUTE"));
      assert.ok(!grants.rows.some((row) => row.grantee === "PUBLIC" && row.privilege_type === "EXECUTE"));
      assert.ok(!grants.rows.some((row) => row.grantee === "anon" && row.privilege_type === "EXECUTE"));
    });
  } finally {
    await db.close();
  }
});

test("schema.sql matches the migration and is re-applicable", async () => {
  const schemaDb = new PGlite();
  try {
    await schemaDb.exec(bootstrap);
    const executableSchema = withoutPgcryptoExtension(schemaSource);
    await schemaDb.exec(executableSchema);
    await schemaDb.exec(executableSchema);

    const security = await schemaDb.query(`
      select p.prosecdef as security_definer, p.proconfig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'create_sale'
    `);
    assert.equal(security.rows.length, 1);
    assert.equal(security.rows[0].security_definer, true);
    assert.ok(security.rows[0].proconfig.includes('search_path=""'));

    const privileges = await schemaDb.query(`
      select has_table_privilege('authenticated', 'public.sales', 'INSERT') as can_insert_sales,
        has_table_privilege('authenticated', 'public.sale_items', 'INSERT') as can_insert_items,
        has_function_privilege('anon', 'public.create_sale(uuid,text,jsonb,uuid)', 'EXECUTE') as anon_can_execute
    `);
    assert.deepEqual(privileges.rows[0], {
      can_insert_sales: false,
      can_insert_items: false,
      anon_can_execute: false,
    });

    const rls = await schemaDb.query(`
      select relrowsecurity from pg_class where oid = 'public.platform_admins'::regclass
    `);
    assert.equal(rls.rows[0].relrowsecurity, true);
  } finally {
    await schemaDb.close();
  }
});

test("migration failure leaves pre-migration schema and data intact after rollback", async () => {
  const rollbackDb = new PGlite();
  try {
    await rollbackDb.exec(bootstrap);
    await rollbackDb.exec(withoutPgcryptoExtension(previousMigrations[0]));
    await rollbackDb.exec(previousMigrations[1]);
    await rollbackDb.exec(previousMigrations[2]);
    await rollbackDb.exec(seedData);
    await rollbackDb.exec(`
      create view public.legacy_sale_dependency as
      select public.create_sale(null::uuid, 'cash', '[]'::jsonb) as result;
    `);

    await assert.rejects(rollbackDb.exec(migration), /objects depend on it/);
    await rollbackDb.exec("rollback");

    assert.equal((await rollbackDb.query(
      "select count(*)::int as count from public.tenants where status = 'trialling'",
    )).rows[0].count, 2);
    assert.equal((await rollbackDb.query(`
      select count(*)::int as count from information_schema.columns
      where table_schema = 'public' and table_name = 'tenants' and column_name = 'country_code'
    `)).rows[0].count, 0);
    assert.equal((await rollbackDb.query(`
      select count(*)::int as count from information_schema.tables
      where table_schema = 'public' and table_name = 'platform_admins'
    `)).rows[0].count, 0);
    assert.equal((await rollbackDb.query(
      "select count(*)::int as count from public.services",
    )).rows[0].count, 2);
  } finally {
    await rollbackDb.close();
  }
});

test("platform-admin provisioning requires one confirmed operator and is repeatable", async () => {
  const adminDb = new PGlite();
  const confirmedEmail = "trusted-operator@test.invalid";
  try {
    await adminDb.exec(`
      create schema auth;
      create table auth.users (
        id uuid primary key,
        email text unique,
        email_confirmed_at timestamptz
      );
      create table public.platform_admins (
        user_id uuid primary key references auth.users(id),
        created_at timestamptz not null default now()
      );
      insert into auth.users values
        ('00000000-0000-4000-8000-000000000010', '${confirmedEmail}', now()),
        ('00000000-0000-4000-8000-000000000011', 'unconfirmed@test.invalid', null);
    `);

    const confirmedScript = adminProvisioning.replace("REPLACE_WITH_TRUSTED_VERIFIED_EMAIL", confirmedEmail);
    await adminDb.exec(confirmedScript);
    await adminDb.exec(confirmedScript);
    assert.equal((await adminDb.query("select count(*)::int as count from public.platform_admins")).rows[0].count, 1);

    const unconfirmedScript = adminProvisioning.replace("REPLACE_WITH_TRUSTED_VERIFIED_EMAIL", "unconfirmed@test.invalid");
    await assert.rejects(adminDb.exec(unconfirmedScript), /query returned no rows/);
    assert.equal((await adminDb.query("select count(*)::int as count from public.platform_admins")).rows[0].count, 1);
  } finally {
    await adminDb.close();
  }
});