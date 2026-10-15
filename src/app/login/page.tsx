"use client";

import { ArrowLeft, LoaderCircle, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const { error: signInError } = await getSupabaseBrowserClient().auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) {
      setError("تعذر تسجيل الدخول. تحققي من البريد الإلكتروني وكلمة المرور.");
      setLoading(false);
      return;
    }
    router.replace("/dashboard/pos");
  }

  return (
    <main className="login-shell" dir="rtl">
      <aside className="login-rail">
        <a className="brand-lockup" href="/onboarding"><span className="brand-mark">Z</span><span><strong>ZLUPOS</strong><small>PRODUCTION</small></span></a>
        <div className="login-rail-copy"><span className="eyebrow">مساحة عملك في انتظارك</span><h1>عودتك،<br />بكل تفاصيلها.</h1><p>إدارة أكثر هدوءاً لصالونك تبدأ من هنا.</p></div>
      </aside>
      <section className="login-main">
        <div className="login-card">
          <span className="login-icon"><LockKeyhole size={19} /></span>
          <p className="eyebrow">ZLUPOS PRODUCTION</p>
          <h1>تسجيل الدخول</h1>
          <p className="login-subtitle">أدخلي بيانات حسابك للمتابعة إلى مساحة العمل.</p>
          <form onSubmit={signIn}>
            <label className="field"><span>البريد الإلكتروني</span><input type="email" autoComplete="email" dir="ltr" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /></label>
            <label className="field"><span>كلمة المرور</span><input type="password" autoComplete="current-password" dir="ltr" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="أدخلي كلمة المرور" /></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="continue-button login-submit" type="submit" disabled={loading}>{loading ? <><LoaderCircle className="spin" size={17} /> جارٍ التحقق</> : <>دخول <ArrowLeft size={17} /></>}</button>
          </form>
          <p className="login-register">ليس لديك حساب؟ <Link href="/onboarding">ابدئي تجربتك المجانية</Link></p>
        </div>
        <footer className="login-footer">© ٢٠٢٦ ZLUPOS Production</footer>
      </section>
    </main>
  );
}