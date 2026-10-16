import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  if (request.nextUrl.pathname !== "/dashboard/upgrade") {
    const admin = getSupabaseAdminClient();
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: "Unable to verify subscription." }, { status: 503 });
    }

    if (!profile) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      return NextResponse.redirect(loginUrl);
    }

    const [{ data: tenant, error: tenantError }, { data: subscription, error: subscriptionError }] = await Promise.all([
      admin
        .from("tenants")
        .select("status,trial_ends_at")
        .eq("id", profile.tenant_id)
        .maybeSingle(),
      admin
        .from("subscriptions")
        .select("status,trial_ends_at,current_period_ends_at")
        .eq("tenant_id", profile.tenant_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (tenantError || subscriptionError) {
      return NextResponse.json({ error: "Unable to verify subscription." }, { status: 503 });
    }

    const now = Date.now();
    const tenantTrialEnd = tenant ? Date.parse(tenant.trial_ends_at) : Number.NaN;
    const subscriptionTrialEnd = subscription ? Date.parse(subscription.trial_ends_at) : Number.NaN;
    const paidPeriodEnd = subscription?.current_period_ends_at
      ? Date.parse(subscription.current_period_ends_at)
      : Number.NaN;
    const trialAllowed = tenant?.status === "trialing"
      && subscription?.status === "trialing"
      && Number.isFinite(tenantTrialEnd)
      && tenantTrialEnd > now
      && Number.isFinite(subscriptionTrialEnd)
      && subscriptionTrialEnd > now;
    const paidAllowed = tenant?.status === "active"
      && subscription?.status === "active"
      && Number.isFinite(paidPeriodEnd)
      && paidPeriodEnd > now;

    if (!trialAllowed && !paidAllowed) {
      const upgradeUrl = request.nextUrl.clone();
      upgradeUrl.pathname = "/dashboard/upgrade";
      upgradeUrl.search = "";
      const redirectResponse = NextResponse.redirect(upgradeUrl);
      response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
      return redirectResponse;
    }
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*"],
};