"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "./auth";

export async function toggleTenantStatus(formData: FormData) {
  const tenantId = String(formData.get("tenantId") ?? "");
  if (!tenantId) redirect("/admin");

  const admin = await requireSuperAdmin();
  const { data: tenant, error: tenantError } = await admin
    .from("tenants")
    .select("status")
    .eq("id", tenantId)
    .single();

  if (tenantError || !tenant) redirect("/admin");

  let status = "suspended";
  if (tenant.status === "suspended") {
    const { data: subscription, error: subscriptionError } = await admin
      .from("subscriptions")
      .select("status,trial_ends_at,current_period_ends_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subscriptionError || !subscription) redirect("/admin");

    const now = Date.now();
    const trialEnd = Date.parse(subscription.trial_ends_at);
    const periodEnd = subscription.current_period_ends_at
      ? Date.parse(subscription.current_period_ends_at)
      : Number.NaN;
    if (subscription.status === "trialing" && Number.isFinite(trialEnd) && trialEnd > now) {
      status = "trialing";
    } else if (subscription.status === "active" && Number.isFinite(periodEnd) && periodEnd > now) {
      status = "active";
    } else {
      redirect("/admin");
    }
  }

  const { error } = await admin.from("tenants").update({ status }).eq("id", tenantId);
  if (error) throw new Error("Could not update salon status.");

  revalidatePath("/admin");
  redirect("/admin");
}

export async function extendTenantTrial(formData: FormData) {
  const tenantId = String(formData.get("tenantId") ?? "");
  if (!tenantId) redirect("/admin");

  const admin = await requireSuperAdmin();
  const { data: tenant, error: tenantError } = await admin
    .from("tenants")
    .select("status,trial_ends_at")
    .eq("id", tenantId)
    .single();

  if (tenantError || !tenant || tenant.status !== "trialing") redirect("/admin");

  const { data: subscription, error: subscriptionError } = await admin
    .from("subscriptions")
    .select("id,status,trial_ends_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (subscriptionError || !subscription || subscription.status !== "trialing") redirect("/admin");

  const trialEnd = new Date(subscription.trial_ends_at);
  const baseDate = Number.isNaN(trialEnd.getTime()) || trialEnd < new Date() ? new Date() : trialEnd;
  baseDate.setDate(baseDate.getDate() + 14);
  const extendedTrialEnd = baseDate.toISOString();

  const { error: tenantUpdateError } = await admin
    .from("tenants")
    .update({ trial_ends_at: extendedTrialEnd })
    .eq("id", tenantId);
  if (tenantUpdateError) throw new Error("Could not update the salon trial date.");

  const { error: subscriptionUpdateError } = await admin
    .from("subscriptions")
    .update({ trial_ends_at: extendedTrialEnd })
    .eq("id", subscription.id)
    .eq("tenant_id", tenantId);
  if (subscriptionUpdateError) throw new Error("Could not extend the trial.");

  revalidatePath("/admin");
  redirect("/admin");
}