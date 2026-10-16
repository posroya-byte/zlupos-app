import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_TEST_URL;
const anonKey = process.env.SUPABASE_TEST_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;
const appUrl = process.env.SUPABASE_TEST_APP_URL;

if (!supabaseUrl || !anonKey || !serviceRoleKey || !appUrl) {
  throw new Error("Run this test through npm run test:supabase with dedicated test-only settings.");
}

const runId = randomUUID();
const logoDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==";
const createdEmails = [];
const createdUserIds = new Set();
const registrations = [];
const uploadedObjects = [];
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function createAnonClient() {
  return createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function createPassword() {
  return `Zlupos-${randomBytes(24).toString("base64url")}aA1!`;
}

async function registerSalon(label, includeLogo = false) {
  const email = `zlupos-it-${runId}-${label.toLowerCase()}@example.invalid`;
  const password = createPassword();
  const name = `ZLUPOS Integration ${runId} ${label}`;
  createdEmails.push(email);

  const response = await fetch(`${appUrl}/api/onboarding`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: `Integration Owner ${label}`,
      email,
      password,
      phone: "+20 1000000000",
      salonName: name,
      salonPhone: "+20 2000000000",
      address: "Automated integration test",
      country: "EG",
      currency: "EGP",
      timezone: "Africa/Cairo",
      primaryColor: "#1d6c52",
      plan: "starter",
      logoDataUrl: includeLogo ? logoDataUrl : null,
    }),
  });
  const responseBody = await response.json();
  assert.equal(response.ok, true, `Onboarding failed (${response.status}): ${responseBody.error ?? "unknown error"}`);

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id,tenant_id,role")
    .eq("email", email)
    .single();
  assert.equal(profileError, null, "The onboarding API must create the owner profile.");
  assert.equal(profile.role, "owner");
  createdUserIds.add(profile.id);

  const [{ data: tenant, error: tenantError }, { data: branch, error: branchError }, { data: subscription, error: subscriptionError }] = await Promise.all([
    admin.from("tenants").select("id,name,slug,owner_id,status,trial_ends_at,country_code,currency,timezone,logo_url").eq("id", profile.tenant_id).single(),
    admin.from("branches").select("id,tenant_id,country_code,currency,timezone").eq("tenant_id", profile.tenant_id).eq("is_main", true).single(),
    admin.from("subscriptions").select("tenant_id,plan,status,starts_at,trial_ends_at").eq("tenant_id", profile.tenant_id).single(),
  ]);
  assert.equal(tenantError, null);
  assert.equal(branchError, null);
  assert.equal(subscriptionError, null);
  assert.equal(tenant.owner_id, profile.id);
  assert.equal(tenant.name, name);
  assert.equal(tenant.country_code, "EG");
  assert.equal(tenant.currency, "EGP");
  assert.equal(tenant.timezone, "Africa/Cairo");
  assert.equal(branch.tenant_id, tenant.id);
  assert.equal(subscription.tenant_id, tenant.id);
  assert.equal(subscription.status, "trialing");
  assert.equal(subscription.plan, "starter");

  const owner = createAnonClient();
  const { data: authData, error: authError } = await owner.auth.signInWithPassword({ email, password });
  assert.equal(authError, null, "The owner must be able to sign in using the created credentials.");
  assert.equal(authData.user.id, profile.id);

  const registration = { email, password, profile, tenant, branch, owner };
  registrations.push(registration);

  if (includeLogo) {
    assert.ok(tenant.logo_url, "The logo URL must be stored on the tenant.");
    uploadedObjects.push(`${profile.id}/logo.png`);
    const logoResponse = await fetch(tenant.logo_url);
    assert.equal(logoResponse.status, 200, "Salon logos in the public bucket must be publicly readable.");
    assert.match(logoResponse.headers.get("content-type") ?? "", /^image\/png/i);
  }

  return registration;
}

async function addService(owner, tenantId, name, price) {
  const { data, error } = await owner
    .from("services")
    .insert({ tenant_id: tenantId, name, category: "Integration", price, duration_minutes: 30 })
    .select("id,tenant_id,price")
    .single();
  assert.equal(error, null, "An owner must be able to add a service to their tenant.");
  return data;
}

async function invokeSale(owner, branchId, paymentMethod, items, requestKey) {
  const { data, error } = await owner.rpc("create_sale", {
    p_branch_id: branchId,
    p_payment_method: paymentMethod,
    p_items: items,
    p_request_key: requestKey,
  });
  return { data, error };
}

async function cleanupTestData() {
  const cleanupErrors = [];
  const profiles = [];
  for (const email of createdEmails) {
    const { data, error } = await admin.from("profiles").select("id,tenant_id,email").eq("email", email);
    if (error) cleanupErrors.push(error);
    profiles.push(...(data ?? []));
  }

  for (const objectPath of uploadedObjects) {
    const { error } = await admin.storage.from("salon-assets").remove([objectPath]);
    if (error) cleanupErrors.push(error);
  }

  const tenantIds = [...new Set(profiles.map((profile) => profile.tenant_id))];
  for (const tenantId of tenantIds) {
    const { data: tenant, error: tenantReadError } = await admin
      .from("tenants")
      .select("id,name,owner_id")
      .eq("id", tenantId)
      .single();
    if (tenantReadError) {
      cleanupErrors.push(tenantReadError);
      continue;
    }
    const matchingOwner = profiles.find((profile) => profile.tenant_id === tenantId && profile.id === tenant.owner_id);
    if (!matchingOwner || !tenant.name.startsWith(`ZLUPOS Integration ${runId} `)) {
      cleanupErrors.push(new Error("Cleanup refused a tenant that does not match this test run."));
      continue;
    }

    for (const table of ["appointments", "sale_items", "sales", "services", "branches", "subscriptions", "profiles"]) {
      const { error } = await admin.from(table).delete().eq("tenant_id", tenantId);
      if (error) cleanupErrors.push(error);
    }
    const { error: tenantDeleteError } = await admin.from("tenants").delete().eq("id", tenantId);
    if (tenantDeleteError) cleanupErrors.push(tenantDeleteError);
  }

  for (const userId of createdUserIds) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) cleanupErrors.push(error);
  }

  if (cleanupErrors.length) {
    throw new AggregateError(cleanupErrors, "Could not fully clean up isolated integration-test records.");
  }
}

test("real Supabase onboarding, auth, tenant isolation, storage, and sales", async (suite) => {
  try {
    let salonA;
    let salonB;
    let serviceA;
    let serviceB;
    let employee;

    await suite.test("Next Proxy redirects unauthenticated dashboard access to login", async () => {
      const response = await fetch(`${appUrl}/dashboard/pos`, { redirect: "manual" });
      assert.equal(response.status, 307);
      assert.match(response.headers.get("location") ?? "", /\/login$/);
    });

    await suite.test("creates two salons and authenticates both owners", async () => {
      salonA = await registerSalon("A", true);
      salonB = await registerSalon("B");
      assert.notEqual(salonA.tenant.id, salonB.tenant.id);
      assert.notEqual(salonA.profile.id, salonB.profile.id);

      const { error: signOutError } = await salonB.owner.auth.signOut();
      assert.equal(signOutError, null);
      const { data: signedOutUser } = await salonB.owner.auth.getUser();
      assert.equal(signedOutUser.user, null);
      const { error: signInAgainError } = await salonB.owner.auth.signInWithPassword({
        email: salonB.email,
        password: salonB.password,
      });
      assert.equal(signInAgainError, null);

      const { data: bucket, error } = await admin.storage.getBucket("salon-assets");
      assert.equal(error, null);
      assert.equal(bucket.public, true);
      assert.ok(bucket.allowed_mime_types.includes("image/png"));
      assert.ok(bucket.file_size_limit <= 3 * 1024 * 1024);
    });

    await suite.test("enforces tenant-scoped reads and updates through PostgREST", async () => {
      serviceA = await addService(salonA.owner, salonA.tenant.id, `Service A ${runId}`, 50);
      serviceB = await addService(salonB.owner, salonB.tenant.id, `Service B ${runId}`, 80);

      const { data: foreignServices, error: readError } = await salonA.owner
        .from("services")
        .select("id")
        .eq("tenant_id", salonB.tenant.id);
      assert.equal(readError, null);
      assert.deepEqual(foreignServices, []);

      const { data: foreignUpdate, error: updateError } = await salonB.owner
        .from("services")
        .update({ price: 1 })
        .eq("id", serviceA.id)
        .select("id");
      assert.equal(updateError, null);
      assert.deepEqual(foreignUpdate, []);
      const { data: unchangedService, error: verifyError } = await admin
        .from("services")
        .select("price")
        .eq("id", serviceA.id)
        .single();
      assert.equal(verifyError, null);
      assert.equal(Number(unchangedService.price), 50);
    });

    await suite.test("denies platform-admin access to owners and salon employees", async () => {
      const employeeEmail = `zlupos-it-${runId}-cashier@example.invalid`;
      const employeePassword = createPassword();
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: employeeEmail,
        password: employeePassword,
        email_confirm: true,
      });
      assert.equal(createError, null);
      createdUserIds.add(created.user.id);

      const { error: profileError } = await admin.from("profiles").insert({
        id: created.user.id,
        tenant_id: salonA.tenant.id,
        full_name: "Integration Cashier",
        email: employeeEmail,
        role: "cashier",
      });
      assert.equal(profileError, null);

      employee = createAnonClient();
      const { error: loginError } = await employee.auth.signInWithPassword({ email: employeeEmail, password: employeePassword });
      assert.equal(loginError, null);

      for (const client of [salonA.owner, employee]) {
        const { data, error } = await client.from("platform_admins").select("user_id");
        assert.ok(error, "Salon users must not read the platform-admin allowlist.");
        assert.equal(data, null);
      }

      const unauthenticated = createAnonClient();
      const { error: rpcError } = await unauthenticated.rpc("create_sale", {
        p_branch_id: salonA.branch.id,
        p_payment_method: "cash",
        p_items: [{ service_id: serviceA.id, quantity: 1 }],
        p_request_key: randomUUID(),
      });
      assert.ok(rpcError, "Unauthenticated clients must not execute create_sale.");
    });

    await suite.test("stores cash and card sales using server-side service prices", async () => {
      const cashKey = randomUUID();
      const { data: cashSale, error: cashError } = await invokeSale(
        salonA.owner,
        salonA.branch.id,
        "cash",
        [{ service_id: serviceA.id, quantity: 2, unit_price: 0, line_total: 0 }],
        cashKey,
      );
      assert.equal(cashError, null);
      assert.equal(Number(cashSale.total_amount), 100);
      assert.equal(cashSale.items[0].unit_price, 50);

      const cardKey = randomUUID();
      const { data: cardSale, error: cardError } = await invokeSale(
        salonB.owner,
        salonB.branch.id,
        "card",
        [{ service_id: serviceB.id, quantity: 1, price: 0 }],
        cardKey,
      );
      assert.equal(cardError, null);
      assert.equal(Number(cardSale.total_amount), 80);

      const { data: foreignSales, error: salesReadError } = await salonA.owner
        .from("sales")
        .select("id")
        .eq("tenant_id", salonB.tenant.id);
      assert.equal(salesReadError, null);
      assert.deepEqual(foreignSales, []);
    });

    await suite.test("deduplicates concurrent retries sent by two Supabase clients", async () => {
      const ownerASecondConnection = createAnonClient();
      const { error: loginError } = await ownerASecondConnection.auth.signInWithPassword({
        email: salonA.email,
        password: salonA.password,
      });
      assert.equal(loginError, null);

      const requestKey = randomUUID();
      const items = [{ service_id: serviceA.id, quantity: 3 }];
      const callA = invokeSale(salonA.owner, salonA.branch.id, "cash", items, requestKey);
      const callB = invokeSale(ownerASecondConnection, salonA.branch.id, "cash", items, requestKey);
      const results = await Promise.all([callA, callB]);
      assert.equal(results[0].error, null);
      assert.equal(results[1].error, null);
      assert.equal(results[0].data.sale_id, results[1].data.sale_id);
      assert.equal(Number(results[0].data.total_amount), 150);

      const { data: matchingSales, error: salesError } = await admin
        .from("sales")
        .select("id")
        .eq("tenant_id", salonA.tenant.id)
        .eq("cashier_id", salonA.profile.id)
        .eq("request_key", requestKey);
      assert.equal(salesError, null);
      assert.equal(matchingSales.length, 1);

      const mismatchedRetry = await invokeSale(
        salonA.owner,
        salonA.branch.id,
        "cash",
        [{ service_id: serviceA.id, quantity: 1 }],
        requestKey,
      );
      assert.match(mismatchedRetry.error?.message ?? "", /different sale/i);
    });

    await suite.test("rejects expired and suspended tenants and allows a test-only reactivation", async () => {
      const expiredAt = new Date(Date.now() - 60_000).toISOString();
      const { error: tenantExpireError } = await admin.from("tenants")
        .update({ status: "trialing", trial_ends_at: expiredAt })
        .eq("id", salonA.tenant.id);
      assert.equal(tenantExpireError, null);
      const { error: subscriptionExpireError } = await admin.from("subscriptions")
        .update({ status: "trialing", trial_ends_at: expiredAt })
        .eq("tenant_id", salonA.tenant.id);
      assert.equal(subscriptionExpireError, null);

      const expiredSale = await invokeSale(salonA.owner, salonA.branch.id, "cash", [
        { service_id: serviceA.id, quantity: 1 },
      ], randomUUID());
      assert.match(expiredSale.error?.message ?? "", /subscription is not active/i);

      const futureAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const { error: suspendError } = await admin.from("tenants")
        .update({ status: "suspended", trial_ends_at: futureAt })
        .eq("id", salonA.tenant.id);
      assert.equal(suspendError, null);
      const { error: resetSubscriptionError } = await admin.from("subscriptions")
        .update({ status: "trialing", trial_ends_at: futureAt })
        .eq("tenant_id", salonA.tenant.id);
      assert.equal(resetSubscriptionError, null);

      const suspendedSale = await invokeSale(salonA.owner, salonA.branch.id, "cash", [
        { service_id: serviceA.id, quantity: 1 },
      ], randomUUID());
      assert.match(suspendedSale.error?.message ?? "", /tenant is not active/i);

      const { error: reactivateError } = await admin.from("tenants")
        .update({ status: "trialing" })
        .eq("id", salonA.tenant.id);
      assert.equal(reactivateError, null);
      const reactivatedSale = await invokeSale(salonA.owner, salonA.branch.id, "cash", [
        { service_id: serviceA.id, quantity: 1 },
      ], randomUUID());
      assert.equal(reactivatedSale.error, null);
      assert.equal(Number(reactivatedSale.data.total_amount), 50);
    });

    await suite.test("does not allow anonymous writes to the logo bucket", async () => {
      const path = `unauthorized-${runId}.png`;
      const { error } = await createAnonClient().storage.from("salon-assets").upload(
        path,
        Buffer.from(logoDataUrl.split(",")[1], "base64"),
        { contentType: "image/png" },
      );
      assert.ok(error, "A public-read bucket must not imply anonymous write access.");
      const { error: cleanupError } = await admin.storage.from("salon-assets").remove([path]);
      assert.equal(cleanupError, null);
    });
  } finally {
    await cleanupTestData();
  }
});