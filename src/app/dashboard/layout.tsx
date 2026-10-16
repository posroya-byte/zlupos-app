import { cookies } from "next/headers";
import DashboardShell from "./DashboardShell";
import type { TenantBranding } from "@/types/database";

async function readTenantBranding(): Promise<TenantBranding> {
  const fallback: TenantBranding = {
    id: "preview",
    name: "صالونك",
    logoUrl: null,
    primaryColor: "#1d6c52",
    currency: "EGP",
    timezone: "Africa/Cairo",
  };
  const cookieStore = await cookies();
  const value = cookieStore.get("zlupos_tenant")?.value;
  if (!value) return fallback;

  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<TenantBranding>;
    if (typeof parsed.name === "string" && typeof parsed.primaryColor === "string") {
      return {
        ...fallback,
        ...parsed,
        currency: typeof parsed.currency === "string" ? parsed.currency : fallback.currency,
        timezone: typeof parsed.timezone === "string" ? parsed.timezone : fallback.timezone,
      };
    }
  } catch {
    return fallback;
  }
  return fallback;
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const tenant = await readTenantBranding();
  return <DashboardShell tenant={tenant}>{children}</DashboardShell>;
}