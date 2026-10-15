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

  const status = tenant.status === "suspended" ? "active" : "suspended";
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
    .select("trial_ends_at")
    .eq("id", tenantId)
    .single();

  if (tenantError || !tenant) redirect("/admin");

  const trialEnd = new Date(tenant.trial_ends_at);
  const baseDate = Number.isNaN(trialEnd.getTime()) || trialEnd < new Date() ? new Date() : trialEnd;
  baseDate.setDate(baseDate.getDate() + 14);

  const { error } = await admin
    .from("tenants")
    .update({ trial_ends_at: baseDate.toISOString() })
    .eq("id", tenantId);
  if (error) throw new Error("Could not extend the trial.");

  revalidatePath("/admin");
  redirect("/admin");
}