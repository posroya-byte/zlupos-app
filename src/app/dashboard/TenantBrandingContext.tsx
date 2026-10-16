"use client";

import { createContext, useContext } from "react";
import type { TenantBranding } from "@/types/database";

export const TenantBrandingContext = createContext<TenantBranding>({
  id: "preview",
  name: "صالونك",
  logoUrl: null,
  primaryColor: "#1d6c52",
  currency: "EGP",
  timezone: "Africa/Cairo",
});

export function useTenantBranding() {
  return useContext(TenantBrandingContext);
}