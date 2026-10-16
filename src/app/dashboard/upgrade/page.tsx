import { cookies } from "next/headers";
import { ArrowUpRight } from "lucide-react";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

const plans = [
  { name: "Growth Plan", price: 399, description: "For salons ready to grow their daily operations." },
  { name: "Business Plan", price: 899, description: "For established salons managing a busier team." },
];

async function readTrialEndDate() {
  const cookieStore = await cookies();
  const tenantCookie = cookieStore.get("zlupos_tenant")?.value;
  if (!tenantCookie) return null;

  try {
    const tenant = JSON.parse(Buffer.from(tenantCookie, "base64url").toString("utf8")) as { id?: unknown };
    if (typeof tenant.id !== "string") return null;

    const { data } = await getSupabaseAdminClient()
      .from("subscriptions")
      .select("trial_ends_at")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return data?.trial_ends_at ?? null;
  } catch {
    return null;
  }
}

export default async function UpgradePage() {
  const trialEnd = await readTrialEndDate();
  const formattedTrialEnd = trialEnd
    ? new Intl.DateTimeFormat("en-EG", { dateStyle: "long" }).format(new Date(trialEnd))
    : null;

  return (
    <section dir="ltr" style={{ color: "#18231f", margin: "0 auto", maxWidth: 1040, padding: "28px 0 48px" }}>
      <header style={{ borderBottom: "1px solid #dfe6e2", marginBottom: 28, paddingBottom: 22 }}>
        <p style={{ color: "#b45309", fontSize: 13, fontWeight: 700, margin: "0 0 8px" }}>SUBSCRIPTION</p>
        <h1 style={{ fontSize: 30, lineHeight: 1.2, margin: "0 0 10px" }}>Subscription Expired</h1>
        <p style={{ color: "#59645f", lineHeight: 1.7, margin: 0 }}>
          {formattedTrialEnd
            ? `Your 30-day trial ended on ${formattedTrialEnd}.`
            : "Your 30-day trial has ended."} Choose a plan to restore access to your salon workspace.
        </p>
      </header>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))" }}>
        {plans.map((plan) => (
          <article key={plan.name} style={{ background: "#fff", border: "1px solid #dfe6e2", borderRadius: 6, padding: 22 }}>
            <h2 style={{ fontSize: 19, margin: "0 0 8px" }}>{plan.name}</h2>
            <p style={{ color: "#59645f", lineHeight: 1.6, minHeight: 48, margin: "0 0 18px" }}>{plan.description}</p>
            <p style={{ alignItems: "baseline", display: "flex", gap: 6, margin: "0 0 20px" }}>
              <strong style={{ fontSize: 32 }}>{plan.price}</strong>
              <span style={{ color: "#59645f" }}>EGP / month</span>
            </p>
            <a
              href={`mailto:support@zlupos.com?subject=${encodeURIComponent(`Upgrade to ${plan.name}`)}&body=${encodeURIComponent(`Please help activate the ${plan.name} plan (${plan.price} EGP/month) for my salon.\n\nSalon name: `)}`}
              style={{ alignItems: "center", background: "#1d6c52", borderRadius: 5, color: "#fff", display: "inline-flex", fontWeight: 700, gap: 8, padding: "11px 15px", textDecoration: "none" }}
            >
              Choose {plan.name} <ArrowUpRight size={16} />
            </a>
          </article>
        ))}
      </div>

      <section style={{ borderTop: "1px solid #dfe6e2", marginTop: 30, paddingTop: 22 }}>
        <h2 style={{ fontSize: 19, margin: "0 0 10px" }}>Payment and activation</h2>
        <p style={{ color: "#59645f", lineHeight: 1.75, margin: "0 0 14px" }}>
          Contact support to receive the current Bank Transfer or Instapay payment details. Send your salon name, selected plan, and payment confirmation. A Super Admin will verify the payment and activate your subscription manually.
        </p>
        <p style={{ background: "#edf4f0", borderRadius: 5, color: "#34443c", lineHeight: 1.75, margin: "0 0 18px", padding: "12px 14px" }}>
          WhatsApp: message ZLUPOS using the official support number provided by your account manager, and include your salon name and selected plan. Do not send payment to unverified numbers.
        </p>
        <a
          href="mailto:support@zlupos.com?subject=Subscription%20upgrade%20and%20payment%20details"
          style={{ color: "#1d6c52", fontWeight: 700, textDecoration: "underline", textUnderlineOffset: 3 }}
        >
          Request payment details from support
        </a>
      </section>
    </section>
  );
}