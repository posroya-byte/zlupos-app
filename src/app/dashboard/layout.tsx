import { cookies } from "next/headers";
import DashboardShell from "./DashboardShell";
import type { TenantBranding } from "@/types/database";

function readTenantBranding(): TenantBranding {
  const fallback: TenantBranding = { id: "preview", name: "صالونك", logoUrl: null, primaryColor: "#1d6c52" };
  const value = cookies().get("zlupos_tenant")?.value;
  if (!value) return fallback;

  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as TenantBranding;
    if (typeof parsed.name === "string" && typeof parsed.primaryColor === "string") return parsed;
  } catch {
    return fallback;
  }
  return fallback;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell tenant={readTenantBranding()}>{children}</DashboardShell>;
}