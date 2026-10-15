import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function middleware(request: NextRequest) {
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

    const { data: subscription, error: subscriptionError } = profile
      ? await admin
          .from("subscriptions")
          .select("status,trial_ends_at")
          .eq("tenant_id", profile.tenant_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null, error: null };

    if (subscriptionError) {
      return NextResponse.json({ error: "Unable to verify subscription." }, { status: 503 });
    }

    const trialEndsAt = subscription ? Date.parse(subscription.trial_ends_at) : Number.NaN;
    const trialExpired = !subscription || (
      subscription.status !== "active" &&
      (!Number.isFinite(trialEndsAt) || trialEndsAt <= Date.now())
    );

    if (trialExpired) {
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