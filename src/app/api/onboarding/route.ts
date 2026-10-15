import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type { SubscriptionPlan } from "@/types/database";
import { countries, type CountryCode } from "../../onboarding/countries";

export const runtime = "nodejs";

const MAX_LOGO_BYTES = 3 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
const PLANS: SubscriptionPlan[] = ["starter", "growth", "scale"];

type OnboardingPayload = {
  fullName?: unknown;
  email?: unknown;
  password?: unknown;
  phone?: unknown;
  salonName?: unknown;
  salonPhone?: unknown;
  address?: unknown;
  country?: unknown;
  currency?: unknown;
  timezone?: unknown;
  primaryColor?: unknown;
  plan?: unknown;
  logoDataUrl?: unknown;
};

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let payload: OnboardingPayload;

  try {
    payload = (await request.json()) as OnboardingPayload;
  } catch {
    return fail("بيانات الطلب غير صالحة.");
  }

  const fullName = cleanText(payload.fullName, 100);
  const email = cleanText(payload.email, 254).toLowerCase();
  const password = typeof payload.password === "string" ? payload.password : "";
  const phone = cleanText(payload.phone, 32);
  const salonName = cleanText(payload.salonName, 120);
  const salonPhone = cleanText(payload.salonPhone, 32);
  const address = cleanText(payload.address, 240);
  const countryCode = payload.country;
  const primaryColor = cleanText(payload.primaryColor, 7);
  const plan = payload.plan;
  const logoDataUrl = payload.logoDataUrl;

  if (!fullName || !salonName || !phone || !salonPhone || !address) {
    return fail("يرجى إكمال جميع الحقول المطلوبة.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return fail("يرجى إدخال بريد إلكتروني صحيح.");
  }
  if (password.length < 8) {
    return fail("يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.");
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(primaryColor)) {
    return fail("اللون الأساسي غير صالح.");
  }
  if (typeof plan !== "string" || !PLANS.includes(plan as SubscriptionPlan)) {
    return fail("يرجى اختيار باقة صالحة.");
  }
  if (typeof countryCode !== "string" || !Object.prototype.hasOwnProperty.call(countries, countryCode)) {
    return fail("يرجى اختيار دولة صالحة.");
  }
  const country = countries[countryCode as CountryCode];
  if (payload.currency !== country.currencyCode || payload.timezone !== country.timezone) {
    return fail("إعدادات العملة والمنطقة الزمنية لا تطابق الدولة المختارة.");
  }

  let logo: { contentType: string; bytes: Buffer; extension: string } | null = null;
  if (logoDataUrl !== undefined && logoDataUrl !== null && logoDataUrl !== "") {
    if (typeof logoDataUrl !== "string") return fail("ملف الشعار غير صالح.");
    const match = logoDataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!match || !ALLOWED_LOGO_TYPES.includes(match[1] as (typeof ALLOWED_LOGO_TYPES)[number])) {
      return fail("ارفع شعاراً بصيغة PNG أو JPG أو WebP.");
    }
    const bytes = Buffer.from(match[2], "base64");
    if (!bytes.length || bytes.length > MAX_LOGO_BYTES) {
      return fail("يجب ألا يتجاوز حجم الشعار 3 ميجابايت.");
    }
    logo = {
      contentType: match[1],
      bytes,
      extension: match[1] === "image/jpeg" ? "jpg" : match[1].slice("image/".length),
    };
  }

  let admin: ReturnType<typeof getSupabaseAdminClient>;
  try {
    admin = getSupabaseAdminClient();
  } catch {
    return fail("إعدادات Supabase غير مكتملة على الخادم.", 503);
  }

  let userId: string | undefined;
  let tenantId: string | undefined;
  let branchId: string | undefined;
  let subscriptionId: string | undefined;
  let logoPath: string | undefined;

  try {
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone },
    });
    if (authError) {
      return fail(
        authError.message.toLowerCase().includes("already")
          ? "هذا البريد الإلكتروني مسجل بالفعل."
          : "تعذر إنشاء الحساب بهذا البريد الإلكتروني.",
        authError.message.toLowerCase().includes("already") ? 409 : 400,
      );
    }
    userId = authData.user.id;

    let logoUrl: string | null = null;
    if (logo) {
      const { data: bucket } = await admin.storage.getBucket("salon-assets");
      if (!bucket) {
        const { error: bucketError } = await admin.storage.createBucket("salon-assets", {
          public: true,
          fileSizeLimit: MAX_LOGO_BYTES,
          allowedMimeTypes: [...ALLOWED_LOGO_TYPES],
        });
        if (bucketError && !bucketError.message.toLowerCase().includes("already exists")) {
          throw bucketError;
        }
      }

      logoPath = `${userId}/logo.${logo.extension}`;
      const { error: uploadError } = await admin.storage
        .from("salon-assets")
        .upload(logoPath, logo.bytes, { contentType: logo.contentType, upsert: true });
      if (uploadError) throw uploadError;
      logoUrl = admin.storage.from("salon-assets").getPublicUrl(logoPath).data.publicUrl;
    }

    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const slug = `${salonName
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "salon"}-${userId.slice(0, 6)}`;

    const { data: tenant, error: tenantError } = await admin
      .from("tenants")
      .insert({
        name: salonName,
        slug,
        logo_url: logoUrl,
        primary_color: primaryColor,
        currency: country.currencyCode,
        timezone: country.timezone,
        owner_id: userId,
        status: "trialling",
        trial_ends_at: trialEndsAt,
      })
      .select("id")
      .single();
    if (tenantError) throw tenantError;
    tenantId = tenant.id;

    const { error: profileError } = await admin.from("profiles").insert({
      id: userId,
      tenant_id: tenantId,
      full_name: fullName,
      email,
      phone,
      role: "owner",
    });
    if (profileError) throw profileError;

    const { data: branch, error: branchError } = await admin
      .from("branches")
      .insert({
        tenant_id: tenantId,
        name: "الفرع الرئيسي",
        address,
        phone: salonPhone,
        currency: country.currencyCode,
        timezone: country.timezone,
        is_main: true,
      })
      .select("id")
      .single();
    if (branchError) throw branchError;
    branchId = branch.id;

    const { data: subscription, error: subscriptionError } = await admin
      .from("subscriptions")
      .insert({
        tenant_id: tenantId,
        plan,
        status: "trialling",
        starts_at: now.toISOString(),
        trial_ends_at: trialEndsAt,
      })
      .select("id")
      .single();
    if (subscriptionError) throw subscriptionError;
    subscriptionId = subscription.id;

    const response = NextResponse.json({ success: true });
    response.cookies.set(
      "zlupos_tenant",
      Buffer.from(JSON.stringify({ id: tenantId, name: salonName, logoUrl, primaryColor })).toString("base64url"),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 14 * 24 * 60 * 60,
      },
    );
    return response;
  } catch (error) {
    console.error("Onboarding failed", error);

    if (subscriptionId) await admin.from("subscriptions").delete().eq("id", subscriptionId);
    if (branchId) await admin.from("branches").delete().eq("id", branchId);
    if (tenantId) {
      await admin.from("profiles").delete().eq("tenant_id", tenantId);
      await admin.from("tenants").delete().eq("id", tenantId);
    }
    if (logoPath) await admin.storage.from("salon-assets").remove([logoPath]);
    if (userId) await admin.auth.admin.deleteUser(userId);

    return fail("تعذر إكمال إنشاء الحساب. تحقق من إعداد جداول Supabase ثم حاول مجدداً.", 500);
  }
}