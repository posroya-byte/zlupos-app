import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function requireSuperAdmin() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/dashboard");

  const admin = getSupabaseAdminClient();
  const { data: platformAdmin, error: platformAdminError } = await admin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .single();

  if (platformAdminError || !platformAdmin) redirect("/dashboard");

  return admin;
}