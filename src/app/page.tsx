import {
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  CreditCard,
  Layers3,
  Scissors,
  ShieldCheck,
  Sparkles,
  Store,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const features: { title: string; description: string; icon: LucideIcon; tint: string }[] = [
  { title: "نقطة بيع سريعة", description: "أضيفي الخدمات والمنتجات، أتمّي الدفع، واطبعي الإيصال من شاشة واحدة.", icon: CreditCard, tint: "mint" },
  { title: "إدارة المواعيد والعملاء", description: "رتّبي جدول اليوم واحتفظي بتفاصيل الزيارات وتفضيلات كل عميلة.", icon: CalendarDays, tint: "blue" },
  { title: "حسابات الموظفين والعمولات", description: "تابعي أداء الفريق واحتسبي العمولات بوضوح ومن دون جداول متفرقة.", icon: UsersRound, tint: "peach" },
  { title: "تقارير الأرباح والورديات", description: "أرقام المبيعات والمصروفات والورديات أمامك لحظة بلحظة.", icon: BarChart3, tint: "lilac" },
  { title: "دعم الفروع المتعددة", description: "أديري كل فروعك وراجعي أداءها من مساحة عمل واحدة.", icon: Layers3, tint: "yellow" },
];

const plans = [
  { id: "starter", name: "الأساسية", price: "مجاناً", suffix: "خلال التجربة", description: "لبداية مرتبة لصالونك", features: ["نقطة بيع واحدة", "فرع واحد", "تقارير يومية"], featured: false },
  { id: "growth", name: "النمو", price: "٣٩٩ ج.م", suffix: "شهرياً أو ما يعادلها", description: "لفريق يخطط للتوسع", features: ["حتى ٣ فروع", "إدارة الفريق", "تقارير متقدمة"], featured: true },
  { id: "scale", name: "الأعمال", price: "٨٩٩ ج.م", suffix: "شهرياً أو ما يعادلها", description: "لعمليات متعددة الفروع", features: ["فروع غير محدودة", "صلاحيات مخصصة", "أولوية الدعم"], featured: false },
];

const faqs = [
  { question: "هل أحتاج إلى جهاز خاص لاستخدام ZLUPOS؟", answer: "لا، يمكنك استخدام النظام من المتصفح على الكمبيوتر أو الجهاز اللوحي، مع توصيل ملحقات البيع المتوافقة عند الحاجة." },
  { question: "هل يمكنني تجربة النظام قبل الاشتراك؟", answer: "نعم، ابدئي بتجربة مجانية لمدة ٣٠ يوماً، من دون رسوم خلال فترة التجربة." },
  { question: "هل أستطيع إدارة أكثر من فرع؟", answer: "نعم، تدعم باقتا النمو والأعمال إدارة عدة فروع من لوحة تحكم واحدة." },
  { question: "كيف أختار العملة والمنطقة الزمنية؟", answer: "يقترح ZLUPOS إعدادات الدولة تلقائياً عند التسجيل، ويمكنك مراجعتها قبل إنشاء مساحة العمل." },
];

const styles = `
  :root { --zl-ink:#132b25; --zl-muted:#65766e; --zl-green:#10b981; --zl-deep:#059669; --zl-paper:#f5f8f4; --zl-line:#dce7df; }
  * { box-sizing:border-box; }
  html { scroll-behavior:smooth; }
  body { margin:0; background:var(--zl-paper); color:var(--zl-ink); font-family:"Noto Sans Arabic","Segoe UI",Tahoma,sans-serif; }
  .zl-page { overflow:hidden; background:radial-gradient(ellipse at 77% 10%,rgba(16,185,129,.11),transparent 32%),radial-gradient(ellipse at 9% 35%,rgba(90,172,255,.08),transparent 26%),#f7faf6; }
  .zl-container { width:min(1160px,calc(100% - 48px)); margin-inline:auto; }
  .zl-header { position:relative; z-index:2; display:flex; align-items:center; justify-content:space-between; gap:28px; min-height:82px; border-bottom:1px solid rgba(19,43,37,.08); }
  .zl-logo img { display:block; width:154px; height:auto; }
  .zl-nav { display:flex; align-items:center; gap:34px; }
  .zl-nav a,.zl-login { color:#476157; text-decoration:none; font-size:14px; font-weight:700; transition:color .2s; }
  .zl-nav a:hover,.zl-login:hover { color:var(--zl-deep); }
  .zl-actions { display:flex; align-items:center; gap:12px; }
  .zl-login { padding:11px 8px; }
  .zl-button { display:inline-flex; align-items:center; justify-content:center; gap:9px; min-height:46px; padding:0 19px; border:1px solid transparent; border-radius:8px; background:var(--zl-green); color:#fff; text-decoration:none; font-size:14px; font-weight:800; box-shadow:0 9px 22px rgba(5,150,105,.17); transition:background .2s,transform .2s,box-shadow .2s; }
  .zl-button:hover { background:var(--zl-deep); transform:translateY(-2px); box-shadow:0 12px 28px rgba(5,150,105,.22); }
  .zl-button.secondary { color:var(--zl-ink); background:#fff; border-color:#cfddd3; box-shadow:none; }
  .zl-button.secondary:hover { color:var(--zl-deep); background:#f0faf4; }
  .zl-hero { position:relative; display:grid; grid-template-columns:1fr 1.03fr; align-items:center; gap:66px; min-height:610px; padding-block:66px 76px; }
  .zl-hero-copy { position:relative; z-index:1; animation:zl-rise .65s ease both; }
  .zl-eyebrow { display:inline-flex; align-items:center; gap:8px; margin:0 0 20px; color:#05845d; font-size:13px; font-weight:800; }
  .zl-eyebrow:before { width:24px; height:2px; background:var(--zl-green); content:""; }
  .zl-hero h1 { max-width:570px; margin:0; font-size:clamp(38px,5vw,58px); line-height:1.35; font-weight:900; letter-spacing:0; }
  .zl-hero h1 em { color:var(--zl-deep); font-style:normal; }
  .zl-lead { max-width:520px; margin:18px 0 27px; color:#61766c; font-size:17px; line-height:1.95; }
  .zl-hero-buttons { display:flex; flex-wrap:wrap; gap:12px; }
  .zl-social-proof { display:flex; align-items:center; gap:12px; margin-top:30px; color:#62756b; font-size:12px; }
  .zl-proof-dots { display:flex; direction:ltr; }
  .zl-proof-dots i { display:grid; width:28px; height:28px; margin-left:-7px; place-items:center; border:2px solid var(--zl-paper); border-radius:50%; background:#e4b09a; color:#fff; font-size:10px; font-style:normal; }
  .zl-proof-dots i:nth-child(2) { background:#4f8f78; }.zl-proof-dots i:nth-child(3) { background:#dba95e; }.zl-proof-dots i:nth-child(4) { background:#7895bd; }
  .zl-hero-visual { position:relative; min-height:430px; display:grid; place-items:center; animation:zl-rise .8s .12s ease both; }
  .zl-visual-halo { position:absolute; width:min(92%,470px); aspect-ratio:1; border-radius:50%; background:radial-gradient(circle at 46% 42%,#e5fbef 0,#edf8ee 44%,rgba(220,245,230,.35) 65%,transparent 66%); }
  .zl-orbit { position:absolute; width:420px; max-width:90%; aspect-ratio:1; border:1px dashed rgba(5,150,105,.23); border-radius:50%; transform:rotate(-17deg); }
  .zl-orbit:before,.zl-orbit:after { position:absolute; width:11px; height:11px; border:3px solid #fff; border-radius:50%; background:#12b981; box-shadow:0 2px 8px #7ab69a; content:""; }
  .zl-orbit:before { top:49px; right:57px; }.zl-orbit:after { bottom:66px; left:40px; background:#e99074; }
  .zl-pos { position:relative; z-index:1; width:min(100%,450px); padding:19px; border:1px solid #e0eae2; border-radius:12px; background:rgba(255,255,255,.96); box-shadow:0 28px 75px rgba(27,77,56,.15); transform:rotate(-2.5deg); }
  .zl-pos-top { display:flex; align-items:center; justify-content:space-between; padding-bottom:15px; border-bottom:1px solid #edf1ed; }
  .zl-pos-brand { display:flex; align-items:center; gap:9px; font-size:13px; font-weight:900; }
  .zl-pos-icon { display:grid; width:31px; height:31px; place-items:center; border-radius:8px; background:#e4f8ed; color:#079b6a; }
  .zl-pos-state { display:flex; align-items:center; gap:6px; color:#718179; font-size:10px; }
  .zl-pos-state i { width:7px; height:7px; border-radius:50%; background:#11b981; }
  .zl-pos-body { display:grid; grid-template-columns:1fr 142px; gap:14px; padding-top:17px; }
  .zl-pos-title { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; font-size:12px; font-weight:800; }
  .zl-pos-title small { color:#8a9990; font-size:10px; font-weight:500; }
  .zl-service { display:flex; align-items:center; gap:10px; margin-top:8px; padding:9px; border:1px solid #edf1ed; border-radius:8px; }
  .zl-service-pic { display:grid; width:37px; height:37px; flex:none; place-items:center; border-radius:7px; background:#f8e5d9; color:#b76647; }
  .zl-service:nth-of-type(3) .zl-service-pic { background:#e2f4eb; color:#258760; }.zl-service:nth-of-type(4) .zl-service-pic { background:#e6eafa; color:#6676bd; }
  .zl-service-name { display:grid; gap:4px; font-size:10px; font-weight:800; }.zl-service-name small { color:#89978f; font-size:9px; font-weight:500; }
  .zl-service-price { margin-inline-start:auto; white-space:nowrap; font-size:10px; font-weight:800; }
  .zl-receipt { align-self:start; padding:13px 11px; border-radius:8px; background:#f5f8f5; }
  .zl-receipt h3 { margin:0 0 13px; font-size:11px; }.zl-receipt-line { display:flex; justify-content:space-between; margin:9px 0; color:#718078; font-size:9px; }
  .zl-receipt-total { display:flex; justify-content:space-between; margin-top:12px; padding-top:10px; border-top:1px dashed #cbd9cf; font-size:11px; font-weight:900; }
  .zl-pay { display:block; width:100%; margin-top:14px; padding:10px 5px; border:0; border-radius:6px; background:#0aa875; color:#fff; font:inherit; font-size:10px; font-weight:800; }
  .zl-floating { position:absolute; z-index:2; display:flex; align-items:center; gap:10px; padding:12px 15px; border:1px solid rgba(219,232,221,.9); border-radius:9px; background:#fff; box-shadow:0 14px 34px rgba(38,82,59,.12); }
  .zl-floating.revenue { top:45px; right:-8px; }.zl-floating.calendar { bottom:35px; left:-2px; }
  .zl-floating-icon { display:grid; width:34px; height:34px; place-items:center; border-radius:8px; background:#e4f7ed; color:#0aa875; }
  .zl-floating span { display:grid; gap:3px; font-size:10px; font-weight:800; }.zl-floating small { color:#829087; font-size:9px; font-weight:500; }
  .zl-section { padding-block:82px; }.zl-section-head { max-width:650px; margin:0 auto 39px; text-align:center; }.zl-section-head .zl-eyebrow { justify-content:center; }.zl-section-head h2 { margin:0; font-size:34px; line-height:1.45; }.zl-section-head p { margin:10px 0 0; color:var(--zl-muted); font-size:15px; line-height:1.9; }
  .zl-features { border-top:1px solid rgba(19,43,37,.07); background:rgba(255,255,255,.58); }
  .zl-feature-grid { display:grid; grid-template-columns:repeat(6,1fr); gap:14px; }
  .zl-feature { grid-column:span 2; min-height:198px; padding:24px 22px; border:1px solid #e2ebe3; border-radius:9px; background:#fff; transition:transform .2s,border-color .2s,box-shadow .2s; }
  .zl-feature:nth-child(4) { grid-column:2 / span 2; }.zl-feature:nth-child(5) { grid-column:4 / span 2; }
  .zl-feature:hover { transform:translateY(-4px); border-color:#aadcc1; box-shadow:0 15px 32px rgba(25,83,53,.07); }
  .zl-feature-icon { display:grid; width:43px; height:43px; margin-bottom:18px; place-items:center; border-radius:9px; }.zl-feature-icon.mint { background:#e3f8ee;color:#07885e; }.zl-feature-icon.blue { background:#e7f1ff;color:#3978c6; }.zl-feature-icon.peach { background:#fff0e8;color:#ca7652; }.zl-feature-icon.lilac { background:#f0edff;color:#7465b6; }.zl-feature-icon.yellow { background:#fff6df;color:#bb8e29; }
  .zl-feature h3 { margin:0 0 8px; font-size:17px; }.zl-feature p { margin:0; color:#6a7c72; font-size:13px; line-height:1.85; }
  .zl-pricing { position:relative; background:linear-gradient(145deg,#edf7f0,#f6f8f1 62%,#fdf4eb); }.zl-pricing:before { position:absolute; top:0; right:0; width:100%; height:100%; background-image:radial-gradient(rgba(34,111,76,.09) .7px,transparent .7px); background-size:17px 17px; opacity:.35; content:""; pointer-events:none; }
  .zl-pricing .zl-container { position:relative; }.zl-plan-grid { display:grid; grid-template-columns:repeat(3,1fr); align-items:stretch; gap:16px; max-width:990px; margin:auto; }
  .zl-plan { position:relative; display:flex; flex-direction:column; min-height:405px; padding:27px 25px 23px; border:1px solid #dce7df; border-radius:10px; background:#fff; }
  .zl-plan.featured { border:2px solid #13ad79; box-shadow:0 18px 42px rgba(10,142,94,.12); transform:translateY(-9px); }.zl-plan-badge { position:absolute; top:-13px; right:20px; padding:5px 12px; border-radius:20px; background:#10a976; color:#fff; font-size:11px; font-weight:800; }
  .zl-plan h3 { margin:0; font-size:20px; }.zl-plan-desc { margin:7px 0 20px; color:#75847a; font-size:12px; }
  .zl-price { margin:0; font-size:31px; font-weight:900; }.zl-price small { display:block; margin-top:5px; color:#809087; font-size:11px; font-weight:500; }
  .zl-plan-rule { height:1px; margin:20px 0 15px; background:#e8eee9; }.zl-plan-list { display:grid; gap:12px; margin:0 0 22px; padding:0; list-style:none; }.zl-plan-list li { display:flex; align-items:center; gap:9px; color:#52665b; font-size:13px; }.zl-plan-list svg { color:#0ca873; }
  .zl-plan .zl-button { width:100%; margin-top:auto; }.zl-plan .zl-button.secondary { border-color:#d7e2d9; }
  .zl-faq { background:#fff; }.zl-faq-grid { display:grid; grid-template-columns:.8fr 1.2fr; gap:70px; align-items:start; }.zl-faq-intro h2 { margin:0 0 12px; font-size:32px; line-height:1.45; }.zl-faq-intro p { color:#718078; font-size:14px; line-height:1.9; }.zl-faq-list { border-top:1px solid #e3ebe4; }.zl-faq-list details { border-bottom:1px solid #e3ebe4; }.zl-faq-list summary { display:flex; align-items:center; justify-content:space-between; gap:15px; padding:19px 0; cursor:pointer; font-size:15px; font-weight:800; list-style:none; }.zl-faq-list summary::-webkit-details-marker { display:none; }.zl-faq-list summary svg { flex:none; color:#73847a; transition:transform .2s; }.zl-faq-list details[open] summary svg { transform:rotate(180deg); color:#059669; }.zl-faq-list details p { max-width:590px; margin:-5px 0 19px; color:#697b71; font-size:13px; line-height:1.9; }
  .zl-bottom-cta { position:relative; overflow:hidden; padding-block:56px; background:#123e31; color:#fff; }.zl-bottom-cta:after { position:absolute; top:-150px; left:8%; width:360px; height:360px; border:1px solid rgba(255,255,255,.1); border-radius:50%; box-shadow:0 0 0 36px rgba(255,255,255,.025),0 0 0 72px rgba(255,255,255,.02); content:""; }.zl-cta-inner { position:relative; z-index:1; display:flex; align-items:center; justify-content:space-between; gap:28px; }.zl-cta-inner h2 { margin:0; font-size:29px; }.zl-cta-inner p { margin:8px 0 0; color:#c3d9ce; font-size:14px; }.zl-cta-inner .zl-button { flex:none; color:#124431; background:#d2f8df; box-shadow:none; }.zl-cta-inner .zl-button:hover { background:white; }
  .zl-footer { padding-block:35px 24px; background:#0d3027; color:#e0eee5; }.zl-footer-main { display:flex; justify-content:space-between; gap:32px; padding-bottom:27px; }.zl-footer-brand img { width:145px; filter:brightness(0) invert(1); }.zl-footer-brand p { max-width:300px; color:#a9c2b4; font-size:12px; line-height:1.9; }.zl-footer-links { display:flex; flex-wrap:wrap; gap:22px; align-content:start; }.zl-footer-links a { color:#d0e2d7; font-size:12px; text-decoration:none; }.zl-footer-links a:hover { color:#72e2ae; }.zl-footer-meta { display:flex; justify-content:space-between; gap:20px; padding-top:18px; border-top:1px solid rgba(255,255,255,.13); color:#93b0a0; font-size:11px; }
  @keyframes zl-rise { from { opacity:0; transform:translateY(13px); } to { opacity:1; transform:translateY(0); } }
  @media (max-width:900px) { .zl-nav { gap:18px; }.zl-hero { gap:26px; }.zl-hero h1 { font-size:43px; }.zl-floating.revenue { right:-6px; }.zl-pos-body { grid-template-columns:1fr 120px; }.zl-faq-grid { gap:35px; } }
  @media (max-width:680px) { .zl-container { width:min(100% - 32px,520px); }.zl-header { min-height:70px; gap:10px; }.zl-logo img { width:118px; }.zl-nav { display:none; }.zl-actions { gap:6px; }.zl-login { font-size:12px; }.zl-header .zl-button { min-height:40px; padding-inline:11px; font-size:11px; }.zl-hero { grid-template-columns:1fr; gap:22px; min-height:0; padding-block:54px 50px; }.zl-hero-copy { order:0; }.zl-hero h1 { max-width:500px; font-size:38px; }.zl-lead { font-size:15px; }.zl-hero-visual { min-height:365px; order:1; }.zl-pos { width:min(100% - 12px,430px); padding:13px; }.zl-pos-body { grid-template-columns:1fr 115px; gap:8px; }.zl-service { padding:7px 5px; gap:6px; }.zl-service-pic { width:31px;height:31px; }.zl-floating.revenue { top:8px; right:-3px; }.zl-floating.calendar { bottom:0; left:-2px; }.zl-floating { padding:9px 11px; }.zl-orbit { width:340px; }.zl-section { padding-block:61px; }.zl-section-head h2 { font-size:27px; }.zl-section-head p { font-size:13px; }.zl-feature-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }.zl-feature,.zl-feature:nth-child(4),.zl-feature:nth-child(5) { grid-column:auto; min-height:205px; padding:18px 15px; }.zl-feature:last-child { grid-column:1 / -1; min-height:170px; }.zl-feature h3 { font-size:15px; }.zl-feature p { font-size:12px; }.zl-plan-grid { grid-template-columns:1fr; gap:16px; max-width:410px; }.zl-plan { min-height:0; padding:24px 21px 20px; }.zl-plan.featured { transform:none; margin-top:8px; }.zl-plan-list { margin-bottom:20px; }.zl-faq-grid { grid-template-columns:1fr; gap:20px; }.zl-faq-intro h2 { font-size:27px; }.zl-faq-list summary { font-size:14px; }.zl-bottom-cta { padding-block:42px; }.zl-cta-inner { align-items:flex-start; flex-direction:column; }.zl-cta-inner h2 { font-size:24px; }.zl-footer-main,.zl-footer-meta { flex-direction:column; }.zl-footer-links { gap:15px 19px; }.zl-footer-meta { gap:8px; } }
  @media (prefers-reduced-motion:reduce) { *,*:before,*:after { scroll-behavior:auto!important; animation-duration:.01ms!important; transition-duration:.01ms!important; } }
`;

export default function Home() {
  return (
    <div className="zl-page" dir="rtl" lang="ar">
      <style>{styles}</style>
      <header className="zl-header zl-container">
        <Link className="zl-logo" href="/" aria-label="ZLUPOS الصفحة الرئيسية"><Image src="/logo.svg" alt="ZLUPOS" width={154} height={43} priority /></Link>
        <nav className="zl-nav" aria-label="التنقل الرئيسي"><a href="#features">المميزات</a><a href="#pricing">الباقات</a><a href="#faq">الأسئلة الشائعة</a></nav>
        <div className="zl-actions"><a className="zl-login" href="/login">تسجيل الدخول</a><a className="zl-button" href="/onboarding">ابدأ تجربة 30 يوماً مجاناً</a></div>
      </header>

      <main>
        <section className="zl-hero zl-container">
          <div className="zl-hero-copy">
            <p className="zl-eyebrow"><Sparkles size={15} /> إدارة أذكى، ووقت أكثر لعميلاتك</p>
            <h1>أسرع وأذكى نظام لإدارة الصالونات <em>ونقاط البيع</em></h1>
            <p className="zl-lead">كل ما تحتاجه لإدارة المواعيد، المبيعات، عمالة الصالون، والعمولات في مكان واحد.</p>
            <div className="zl-hero-buttons"><a className="zl-button" href="/onboarding">ابدأ تجربتك المجانية (30 يوماً) <span aria-hidden="true">←</span></a><a className="zl-button secondary" href="#pricing">شاهد الباقات <span aria-hidden="true">↓</span></a></div>
            <div className="zl-social-proof"><span className="zl-proof-dots" aria-hidden="true"><i>ن</i><i>ل</i><i>م</i><i>س</i></span><span>كل تفاصيل صالونك، واضحة في مكان واحد</span></div>
          </div>
          <div className="zl-hero-visual" aria-label="معاينة شاشة نقطة البيع">
            <div className="zl-visual-halo" /><div className="zl-orbit" />
            <div className="zl-floating revenue"><span className="zl-floating-icon"><BarChart3 size={17} /></span><span>مبيعات اليوم<small>٨٬٤٥٠ ج.م&nbsp; <b style={{ color: "#0b9a6c" }}>+١٢٪</b></small></span></div>
            <div className="zl-pos">
              <div className="zl-pos-top"><div className="zl-pos-brand"><span className="zl-pos-icon"><Store size={17} /></span> نقطة البيع</div><span className="zl-pos-state"><i /> متصل الآن</span></div>
              <div className="zl-pos-body">
                <div><div className="zl-pos-title">الخدمات <small>الثلاثاء، ١٤ أكتوبر</small></div>
                  <div className="zl-service"><span className="zl-service-pic"><Scissors size={17} /></span><span className="zl-service-name">قص وتصفيف<small>٤٥ دقيقة</small></span><span className="zl-service-price">٢٥٠ ج.م</span></div>
                  <div className="zl-service"><span className="zl-service-pic"><Sparkles size={17} /></span><span className="zl-service-name">عناية بالشعر<small>٦٠ دقيقة</small></span><span className="zl-service-price">٤٠٠ ج.م</span></div>
                  <div className="zl-service"><span className="zl-service-pic"><ShieldCheck size={17} /></span><span className="zl-service-name">باقة العناية<small>منتج · ١ قطعة</small></span><span className="zl-service-price">١٨٠ ج.م</span></div>
                </div>
                <aside className="zl-receipt"><h3>ملخص الفاتورة</h3><div className="zl-receipt-line"><span>الخدمات</span><span>٦٥٠</span></div><div className="zl-receipt-line"><span>المنتجات</span><span>١٨٠</span></div><div className="zl-receipt-line"><span>الخصم</span><span>−٤٠</span></div><div className="zl-receipt-total"><span>الإجمالي</span><span>٧٩٠ ج.م</span></div><button className="zl-pay" type="button">إتمام الدفع</button></aside>
              </div>
            </div>
            <div className="zl-floating calendar"><span className="zl-floating-icon" style={{ background: "#fff0e8", color: "#ca7652" }}><CalendarDays size={17} /></span><span>موعد جديد<small>اليوم · ١١:٣٠ ص</small></span></div>
          </div>
        </section>

        <section className="zl-section zl-features" id="features">
          <div className="zl-container"><div className="zl-section-head"><p className="zl-eyebrow">كل شيء في مكانه</p><h2>تشغيل يومك بسلاسة، من أول موعد لآخر وردية</h2><p>أدوات عملية تساعدك على متابعة التفاصيل واتخاذ قرارات أوضح، مهما كان حجم فريقك.</p></div>
            <div className="zl-feature-grid">{features.map(({ title, description, icon: Icon, tint }) => <article className="zl-feature" key={title}><span className={`zl-feature-icon ${tint}`}><Icon size={21} /></span><h3>{title}</h3><p>{description}</p></article>)}</div>
          </div>
        </section>

        <section className="zl-section zl-pricing" id="pricing">
          <div className="zl-container"><div className="zl-section-head"><p className="zl-eyebrow">باقات واضحة</p><h2>اختاري الباقة التي تناسب خطوتك القادمة</h2><p>ابدئي بتجربة كاملة لمدة ٣٠ يوماً، ثم اختاري ما يناسب صالونك.</p></div>
            <div className="zl-plan-grid">{plans.map((item) => <article className={`zl-plan ${item.featured ? "featured" : ""}`} key={item.id}>{item.featured && <span className="zl-plan-badge">الأكثر اختياراً</span>}<h3>{item.name}</h3><p className="zl-plan-desc">{item.description}</p><p className="zl-price">{item.price}<small>{item.suffix}</small></p><div className="zl-plan-rule" /><ul className="zl-plan-list">{item.features.map((feature) => <li key={feature}><Check size={16} />{feature}</li>)}</ul><a className={`zl-button ${item.featured ? "" : "secondary"}`} href={`/onboarding?plan=${item.id}`}>اختر الباقة</a></article>)}</div>
          </div>
        </section>

        <section className="zl-section zl-faq" id="faq">
          <div className="zl-container zl-faq-grid"><div className="zl-faq-intro"><p className="zl-eyebrow"><CircleHelp size={15} /> إجابات سريعة</p><h2>أسئلة تساعدك على البدء</h2><p>هل لديك سؤال آخر؟ فريقنا جاهز لمساعدتك في اختيار الإعداد المناسب.</p><a className="zl-button secondary" href="mailto:support@zlupos.com">تواصلي مع فريقنا</a></div>
            <div className="zl-faq-list">{faqs.map((item) => <details key={item.question}><summary>{item.question}<ChevronDown size={18} /></summary><p>{item.answer}</p></details>)}</div>
          </div>
        </section>

        <section className="zl-bottom-cta"><div className="zl-container zl-cta-inner"><div><h2>صالونك يستحق بداية أسهل</h2><p>ابدئي اليوم، واكتشفي تجربة إدارة متكاملة لمدة ٣٠ يوماً.</p></div><a className="zl-button" href="/onboarding">ابدئي التجربة المجانية <span aria-hidden="true">←</span></a></div></section>
      </main>

      <footer className="zl-footer"><div className="zl-container"><div className="zl-footer-main"><div className="zl-footer-brand"><Link href="/" aria-label="ZLUPOS"><Image src="/logo.svg" alt="ZLUPOS" width={145} height={41} /></Link><p>منصة إدارة الصالونات ونقاط البيع، لتكون تفاصيل عملك أوضح ويومك أسهل.</p></div><nav className="zl-footer-links" aria-label="روابط إضافية"><a href="#features">المميزات</a><a href="#pricing">الباقات</a><a href="#faq">الأسئلة الشائعة</a><a href="/privacy">سياسة الخصوصية</a><a href="/terms">شروط الاستخدام</a><a href="mailto:support@zlupos.com">تواصلي معنا</a></nav></div><div className="zl-footer-meta"><span>© ٢٠٢٦ ZLUPOS. جميع الحقوق محفوظة.</span><span>مصمم لأصحاب الصالونات في المنطقة العربية</span></div></div></footer>
    </div>
  );
}
