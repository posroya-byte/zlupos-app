"use client";

import { ArrowLeft, ArrowRight, Check, CheckCircle2, ImagePlus, LoaderCircle, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ChangeEvent } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { SubscriptionPlan } from "@/types/database";

const steps = ["بياناتك", "الصالون", "الهوية", "الباقة"];
const plans: { id: SubscriptionPlan; name: string; price: string; note: string; features: string[] }[] = [
  { id: "starter", name: "الأساسية", price: "مجاناً", note: "للبداية بهدوء", features: ["نقطة بيع واحدة", "فرع واحد", "تقارير يومية"] },
  { id: "growth", name: "النمو", price: "٣٩٩ ج.م", note: "الأكثر اختياراً", features: ["حتى ٣ فروع", "إدارة فريق", "تقارير متقدمة"] },
  { id: "scale", name: "الأعمال", price: "٨٩٩ ج.م", note: "للفرق الكبيرة", features: ["فروع غير محدودة", "صلاحيات مخصصة", "أولوية الدعم"] },
];

type FormValues = { fullName: string; email: string; password: string; phone: string; salonName: string; salonPhone: string; address: string };
const initialForm: FormValues = { fullName: "", email: "", password: "", phone: "", salonName: "", salonPhone: "", address: "" };

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [primaryColor, setPrimaryColor] = useState("#1d6c52");
  const [plan, setPlan] = useState<SubscriptionPlan>("growth");
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [logoName, setLogoName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function updateForm(field: keyof FormValues, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function canContinue() {
    if (step === 0) return Boolean(form.fullName && form.email && form.password.length >= 8 && form.phone);
    if (step === 1) return Boolean(form.salonName && form.salonPhone && form.address);
    return true;
  }

  function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return setError("اختاري صورة بصيغة PNG أو JPG أو WebP.");
    if (file.size > 3 * 1024 * 1024) return setError("يجب ألا يتجاوز حجم الصورة 3 ميجابايت.");
    setError("");
    setLogoName(file.name);
    const reader = new FileReader();
    reader.onload = () => setLogoDataUrl(String(reader.result));
    reader.onerror = () => setError("تعذر قراءة الصورة. حاولي اختيارها مرة أخرى.");
    reader.readAsDataURL(file);
  }

  async function submitOnboarding() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, primaryColor, plan, logoDataUrl: logoDataUrl || null }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "تعذر إنشاء الحساب.");
      const { error: signInError } = await getSupabaseBrowserClient().auth.signInWithPassword({
        email: form.email.trim(),
        password: form.password,
      });
      if (signInError) throw new Error("تم إنشاء الحساب، لكن تعذر تسجيل الدخول تلقائياً. حاولي تسجيل الدخول.");
      router.push("/dashboard/pos");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "حدث خطأ غير متوقع. حاولي مرة أخرى.");
      setSaving(false);
    }
  }

  return (
    <main className="onboarding-shell" dir="rtl">
      <aside className="onboarding-rail">
        <a className="brand-lockup" href="/onboarding" aria-label="ZLUPOS Production">
          <span className="brand-mark">Z</span><span><strong>ZLUPOS</strong><small>PRODUCTION</small></span>
        </a>
        <div className="rail-copy">
          <span className="eyebrow">كل تفاصيل صالونك، في مكان واحد</span>
          <h1>بداية مرتبة<br />ليوم أجمل.</h1>
          <p>نظام بسيط لإدارة المواعيد والمبيعات والفريق، حتى تركزي على تجربة عميلاتك.</p>
        </div>
        <div className="trial-stamp"><Sparkles size={17} aria-hidden="true" /><span><strong>١٤ يوماً</strong> تجربة كاملة، بلا رسوم</span></div>
        <div className="rail-footer"><span>مصمم لأصحاب الصالونات</span><span className="rail-dots" aria-hidden="true"><i /><i /><i /></span></div>
      </aside>

      <section className="onboarding-main">
        <header className="onboarding-topbar"><span>إنشاء مساحة عمل جديدة</span><span className="secure-note"><CheckCircle2 size={15} /> بياناتك محمية</span></header>
        <div className="wizard-wrap">
          <div className="wizard-heading">
            <div>
              <p className="eyebrow">الخطوة {String(step + 1).padStart(2, "0")} من ٠٤</p>
              <h2>{["أهلاً بكِ", "أخبرينا عن صالونك", "لمستك الخاصة", "اختاري نقطة البداية"][step]}</h2>
              <p className="wizard-subtitle">{[
                "نحتاج بعض التفاصيل لتجهيز حسابك.",
                "هذه المعلومات تظهر في إيصالاتك وإعدادات الفروع.",
                "أضيفي الشعار واللون الذي يعبّر عن علامتك.",
                "كل الباقات تبدأ بفترة تجربة مجانية لمدة ١٤ يوماً.",
              ][step]}</p>
            </div>
            <span className="step-counter">{step + 1}<span> / 4</span></span>
          </div>
          <div className="step-track" aria-label={`الخطوة ${step + 1} من 4`}>
            {steps.map((label, index) => <div className={`step-item ${index <= step ? "is-active" : ""}`} key={label}><span className="step-dot">{index < step ? <Check size={14} /> : index + 1}</span><span>{label}</span></div>)}
          </div>

          <div className="wizard-panel">
            {step === 0 && <div className="field-grid">
              <label className="field full-field"><span>الاسم الكامل</span><input autoComplete="name" value={form.fullName} onChange={(event) => updateForm("fullName", event.target.value)} placeholder="مثال: سارة محمود" /></label>
              <label className="field full-field"><span>البريد الإلكتروني</span><input type="email" autoComplete="email" dir="ltr" value={form.email} onChange={(event) => updateForm("email", event.target.value)} placeholder="name@example.com" /></label>
              <label className="field"><span>رقم الهاتف</span><input type="tel" autoComplete="tel" dir="ltr" value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} placeholder="01xxxxxxxxx" /></label>
              <label className="field"><span>كلمة المرور</span><input type="password" autoComplete="new-password" dir="ltr" value={form.password} onChange={(event) => updateForm("password", event.target.value)} placeholder="٨ أحرف على الأقل" /></label>
              <p className="field-hint full-field">استخدمي كلمة مرور قوية تحتوي على ٨ أحرف أو أكثر.</p>
            </div>}

            {step === 1 && <div className="field-grid">
              <label className="field full-field"><span>اسم الصالون</span><input value={form.salonName} onChange={(event) => updateForm("salonName", event.target.value)} placeholder="مثال: لافندر بيوتي" /></label>
              <label className="field"><span>هاتف الصالون</span><input type="tel" dir="ltr" value={form.salonPhone} onChange={(event) => updateForm("salonPhone", event.target.value)} placeholder="02xxxxxxxx" /></label>
              <label className="field"><span>عنوان الفرع الرئيسي</span><input value={form.address} onChange={(event) => updateForm("address", event.target.value)} placeholder="الحي، الشارع، المدينة" /></label>
              <div className="branch-note full-field"><span className="branch-note-icon">01</span><span><strong>فرعك الأول جاهز</strong><small>يمكنك إضافة فروع أخرى من لوحة التحكم.</small></span></div>
            </div>}

            {step === 2 && <div className="identity-grid">
              <div>
                <span className="field-label">شعار الصالون <small>اختياري</small></span>
                <label className={`logo-drop ${logoDataUrl ? "has-logo" : ""}`}>
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoChange} />
                  {logoDataUrl ? <>
                    <span className="logo-preview" style={{ backgroundImage: `url(${logoDataUrl})` }} />
                    <span className="logo-upload-copy"><strong>{logoName}</strong><small>اضغطي لاختيار صورة أخرى</small></span>
                    <button className="remove-logo" type="button" aria-label="إزالة الشعار" onClick={(event) => { event.preventDefault(); setLogoDataUrl(""); setLogoName(""); }}><X size={15} /></button>
                  </> : <><span className="upload-icon"><ImagePlus size={21} /></span><span className="logo-upload-copy"><strong>أضيفي شعارك هنا</strong><small>PNG أو JPG أو WebP، حتى ٣ ميجابايت</small></span></>}
                </label>
              </div>
              <div>
                <span className="field-label">اللون الأساسي</span>
                <div className="color-picker-row">
                  <label className="color-swatch" style={{ backgroundColor: primaryColor }}><input aria-label="اختيار اللون الأساسي" type="color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} /></label>
                  <input className="hex-input" aria-label="قيمة اللون" dir="ltr" value={primaryColor.toUpperCase()} onChange={(event) => { if (/^#[0-9a-fA-F]{0,6}$/.test(event.target.value)) setPrimaryColor(event.target.value); }} />
                  <span className="palette-label">اختاري لوناً</span>
                </div>
                <p className="field-hint color-hint">يظهر اللون في لوحة التحكم والإيصالات.</p>
              </div>
              <div className="brand-preview full-field">
                <div className="preview-logo" style={{ backgroundColor: primaryColor, backgroundImage: logoDataUrl ? `url(${logoDataUrl})` : undefined }}>{!logoDataUrl && <span>{form.salonName.trim().charAt(0) || "ز"}</span>}</div>
                <span><small>معاينة الهوية</small><strong>{form.salonName || "اسم صالونك"}</strong></span>
                <span className="preview-chip" style={{ backgroundColor: primaryColor }}>حجز موعد</span>
              </div>
            </div>}

            {step === 3 && <div className="plan-grid">
              {plans.map((item) => <button type="button" key={item.id} className={`plan-option ${plan === item.id ? "selected" : ""}`} onClick={() => setPlan(item.id)} aria-pressed={plan === item.id}>
                <span className="plan-choice"><span className="radio-dot">{plan === item.id && <i />}</span><span className="plan-note">{item.note}</span></span>
                <strong className="plan-name">{item.name}</strong><span className="plan-price">{item.price}<small>{item.id !== "starter" && " / شهرياً"}</small></span>
                <span className="plan-divider" /><span className="plan-features">{item.features.map((feature) => <span key={feature}><Check size={14} />{feature}</span>)}</span>
              </button>)}
              <div className="trial-banner full-field"><Sparkles size={18} /><span><strong>١٤ يوماً مجاناً</strong><small>لن يتم خصم أي مبلغ خلال فترة التجربة.</small></span><CheckCircle2 size={18} /></div>
            </div>}

            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="wizard-actions">
              {step > 0 ? <button className="back-button" type="button" onClick={() => { setError(""); setStep((current) => current - 1); }}><ArrowRight size={17} /> رجوع</button> : <span />}
              {step < 3 ? <button className="continue-button" type="button" disabled={!canContinue()} onClick={() => { setError(""); setStep((current) => current + 1); }}>متابعة <ArrowLeft size={17} /></button> : <button className="continue-button" type="button" disabled={saving} onClick={submitOnboarding}>{saving ? <><LoaderCircle className="spin" size={17} /> جارٍ تجهيز حسابك</> : <>إنشاء الحساب <ArrowLeft size={17} /></>}</button>}
            </div>
          </div>
          <p className="wizard-footnote">بإنشاء حسابك، أنت توافقين على شروط الاستخدام وسياسة الخصوصية.</p>
        </div>
        <footer className="onboarding-bottom"><span>© ٢٠٢٦ ZLUPOS Production</span><a href="mailto:support@zlupos.com">تحتاجين مساعدة؟</a></footer>
      </section>
    </main>
  );
}