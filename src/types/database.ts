export type TenantStatus = "trialing" | "active" | "suspended" | "cancelled";
export type SubscriptionPlan = "starter" | "growth" | "scale";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  country_code: string | null;
  currency: string;
  timezone: string;
  owner_id: string;
  status: TenantStatus;
  trial_ends_at: string;
  created_at: string;
}

export interface Profile {
  id: string;
  tenant_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: "owner" | "manager" | "cashier";
  created_at: string;
}

export interface Branch {
  id: string;
  tenant_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  country_code: string | null;
  currency: string;
  timezone: string;
  is_main: boolean;
  created_at: string;
}

export interface Service {
  id: string;
  tenant_id: string;
  name: string;
  category: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
}

export interface Sale {
  id: string;
  tenant_id: string;
  branch_id: string;
  cashier_id: string;
  subtotal: number;
  discount: number;
  total: number;
  total_amount: number;
  payment_method: "cash" | "card";
  status: "completed" | "refunded" | "voided";
  created_at: string;
}

export interface Subscription {
  id: string;
  tenant_id: string;
  plan: SubscriptionPlan;
  status: "trialing" | "active" | "past_due" | "cancelled";
  starts_at: string;
  trial_ends_at: string;
  current_period_ends_at: string | null;
}

export interface TenantBranding {
  id: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  currency: string;
  timezone: string;
}