"use client";

import { Check, Minus, Plus, Printer, Search, ShoppingBag, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useTenantBranding } from "../TenantBrandingContext";

type Service = { id: string; name: string; category: string; price: number; tone: string; mark: string };
type CartLine = { service: Service; quantity: number };
type Receipt = { number: string; date: string; total: number; method: "cash" | "card"; lines: CartLine[] };
type SaleResult = {
  sale_id: string;
  total_amount: number;
  created_at: string;
  items: { service_id: string; name: string; quantity: number; unit_price: number }[];
};
const money = new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 });
const formatPrice = (value: number) => `${money.format(value)} ج.م`;

function serviceTone(category: string, index: number) {
  if (category.includes("شعر")) return ["sage", "rose", "amber", "blue"][index % 4];
  if (category.includes("أظافر")) return ["rose", "sage", "blue", "amber"][index % 4];
  return ["amber", "blue", "sage", "rose"][index % 4];
}

export default function PosPage() {
  const tenant = useTenantBranding();
  const [services, setServices] = useState<Service[]>([]);
  const [branchId, setBranchId] = useState("");
  const [branchName, setBranchName] = useState("الفرع الرئيسي");
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [category, setCategory] = useState("الكل");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [paidAmount, setPaidAmount] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadRegister() {
      setLoadingServices(true);
      setLoadError("");
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error("تعذر التحقق من حسابك.");

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("tenant_id")
          .eq("id", user.id)
          .single();
        if (profileError || !profile) throw new Error("تعذر تحميل بيانات مساحة العمل.");

        const [{ data: branch, error: branchError }, { data: rows, error: servicesError }] = await Promise.all([
          supabase.from("branches").select("id,name").eq("tenant_id", profile.tenant_id).eq("is_main", true).single(),
          supabase.from("services").select("id,name,category,price").eq("tenant_id", profile.tenant_id).eq("is_active", true).order("name"),
        ]);
        if (branchError || !branch) throw new Error("تعذر تحميل الفرع الرئيسي.");
        if (servicesError) throw new Error("تعذر تحميل قائمة الخدمات.");
        if (!active) return;

        setBranchId(branch.id);
        setBranchName(branch.name);
        setServices((rows ?? []).map((service, index) => ({
          ...service,
          price: Number(service.price),
          tone: serviceTone(service.category, index),
          mark: service.name.slice(0, 1),
        })));
      } catch (error) {
        console.error("POS register load failed", error);
        if (active) setLoadError(error instanceof Error ? error.message : "تعذر تحميل نقطة البيع.");
      } finally {
        if (active) setLoadingServices(false);
      }
    }

    void loadRegister();
    return () => { active = false; };
  }, []);

  const categories = useMemo(() => ["الكل", ...new Set(services.map((service) => service.category))], [services]);

  const visibleServices = useMemo(() => services.filter((service) =>
    (category === "الكل" || service.category === category) && service.name.includes(search.trim()),
  ), [category, search, services]);
  const subtotal = cart.reduce((sum, line) => sum + line.service.price * line.quantity, 0);
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);

  function addService(service: Service) {
    setCart((current) => {
      const existing = current.find((line) => line.service.id === service.id);
      return existing
        ? current.map((line) => line.service.id === service.id ? { ...line, quantity: line.quantity + 1 } : line)
        : [...current, { service, quantity: 1 }];
    });
  }

  function adjustQuantity(serviceId: string, amount: number) {
    setCart((current) => current.flatMap((line) => {
      if (line.service.id !== serviceId) return [line];
      const quantity = line.quantity + amount;
      return quantity > 0 ? [{ ...line, quantity }] : [];
    }));
  }

  function openPayment() {
    setPaidAmount(String(subtotal));
    setPaymentOpen(true);
  }

  async function completeSale() {
    if (!branchId || checkoutLoading) return;
    setCheckoutLoading(true);
    setCheckoutError("");
    try {
      const { data, error } = await getSupabaseBrowserClient().rpc("create_sale", {
        p_branch_id: branchId,
        p_payment_method: paymentMethod,
        p_items: cart.map(({ service, quantity }) => ({ service_id: service.id, quantity })),
      });
      if (error) throw error;
      const sale = data as SaleResult | null;
      if (!sale?.sale_id || !Array.isArray(sale.items)) throw new Error("تعذر تأكيد بيانات الإيصال.");

      setReceipt({
        number: `ZP-${sale.sale_id.slice(0, 8).toUpperCase()}`,
        date: new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(sale.created_at)),
        total: Number(sale.total_amount),
        method: paymentMethod,
        lines: sale.items.map((item) => {
          const service = cart.find((line) => line.service.id === item.service_id)?.service;
          return {
            service: { ...(service ?? { id: item.service_id, category: "", tone: "sage", mark: item.name.slice(0, 1) }), id: item.service_id, name: item.name, price: Number(item.unit_price) },
            quantity: item.quantity,
          };
        }),
      });
      setCart([]);
      setPaymentOpen(false);
    } catch (error) {
      console.error("POS checkout failed", error);
      setCheckoutError("تعذر حفظ عملية البيع. لم يتم إصدار الإيصال، يرجى المحاولة مرة أخرى.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  return (
    <section className="pos-page" dir="rtl">
      <div className="pos-heading">
        <div><p className="eyebrow">{branchName} <span className="heading-divider">/</span> الأربعاء ١٤ أكتوبر</p><h1>نقطة البيع</h1><p>أضيفي الخدمات إلى الفاتورة ثم أكملي عملية الدفع.</p></div>
        <div className="shift-status"><span className="shift-dot" /><span><small>الوردية الصباحية</small><strong>مفتوحة · ٩:٠٠ ص</strong></span></div>
      </div>

      <div className="pos-workspace">
        <section className="service-browser" aria-label="قائمة الخدمات">
          <div className="service-toolbar">
            <div className="category-tabs" role="tablist" aria-label="تصنيف الخدمات">
              {categories.map((item) => <button key={item} role="tab" aria-selected={category === item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}
            </div>
            <label className="service-search"><Search size={17} /><input aria-label="ابحثي عن خدمة" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحثي عن خدمة" /></label>
          </div>
          <div className="service-grid">
            {loadingServices && <p className="empty-services">جارٍ تحميل الخدمات...</p>}
            {loadError && <div className="empty-services" role="alert">{loadError} <button type="button" onClick={() => window.location.reload()}>إعادة المحاولة</button></div>}
            {!loadingServices && !loadError && visibleServices.map((service) => <button className="service-tile" type="button" key={service.id} onClick={() => addService(service)}>
              <span className={`service-mark ${service.tone}`}>{service.mark}</span>
              <span className="service-name">{service.name}</span>
              <span className="service-category">{service.category}</span>
              <span className="service-price">{formatPrice(service.price)}</span>
              <span className="service-add"><Plus size={15} /></span>
            </button>)}
            {!loadingServices && !loadError && visibleServices.length === 0 && <p className="empty-services">لا توجد خدمات بهذا الاسم.</p>}
          </div>
          <div className="service-footnote"><span className="service-footnote-mark"><ShoppingBag size={15} /></span><span>اختاري خدمة لإضافتها إلى الفاتورة</span><span className="service-total-count">{services.length} خدمات</span></div>
        </section>

        <aside className="cart-panel" aria-label="الفاتورة الحالية">
          <div className="cart-heading"><div><span className="cart-title">الفاتورة الحالية</span><span className="cart-number"># فاتورة جديدة</span></div><span className="cart-count">{String(cartCount).padStart(2, "0")}</span></div>
          <div className="customer-row"><span className="customer-avatar">ع</span><span><strong>عميلة نقدية</strong><small>بدون ملف عميلة</small></span><button type="button" aria-label="اختيار عميلة" title="اختيار عميلة">＋</button></div>
          <div className="cart-lines">
            {cart.length === 0 ? <div className="cart-empty"><span className="empty-bag"><ShoppingBag size={21} /></span><strong>الفاتورة فارغة</strong><small>اختاري خدمة من القائمة لإضافتها هنا.</small></div> : cart.map(({ service, quantity }) => <div className="cart-line" key={service.id}>
              <div className={`cart-line-mark ${service.tone}`}>{service.mark}</div>
              <div className="cart-line-copy"><strong>{service.name}</strong><small>{formatPrice(service.price)}</small></div>
              <div className="quantity-control"><button type="button" aria-label={`تقليل ${service.name}`} onClick={() => adjustQuantity(service.id, -1)}><Minus size={12} /></button><span>{quantity}</span><button type="button" aria-label={`زيادة ${service.name}`} onClick={() => adjustQuantity(service.id, 1)}><Plus size={12} /></button></div>
              <strong className="line-total">{formatPrice(service.price * quantity)}</strong>
            </div>)}
          </div>
          {cart.length > 0 && <button className="clear-cart" type="button" onClick={() => setCart([])}><Trash2 size={14} /> تفريغ الفاتورة</button>}
          <div className="cart-summary">
            <div><span>الإجمالي الفرعي</span><strong>{formatPrice(subtotal)}</strong></div>
            <div className="discount-row"><span>الخصم</span><button type="button" disabled>إضافة خصم</button></div>
            <div className="summary-total"><span>الإجمالي</span><strong>{formatPrice(subtotal)}</strong></div>
            <button className="checkout-button" type="button" disabled={!cart.length} onClick={openPayment}>الدفع <span>{formatPrice(subtotal)}</span><span className="checkout-arrow"><ArrowLeftIcon /></span></button>
            <p className="checkout-note">الأسعار تشمل جميع الرسوم</p>
          </div>
        </aside>
      </div>

      {paymentOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPaymentOpen(false); }}>
        <section className="payment-modal" role="dialog" aria-modal="true" aria-labelledby="payment-title" dir="rtl">
          <header className="modal-heading"><div><span className="modal-kicker">فاتورة جديدة</span><h2 id="payment-title">إتمام الدفع</h2></div><button type="button" aria-label="إغلاق" onClick={() => setPaymentOpen(false)}><X size={19} /></button></header>
          <div className="payment-total"><span>المبلغ المستحق</span><strong>{formatPrice(subtotal)}</strong></div>
          <div className="payment-methods" role="group" aria-label="طريقة الدفع">
            <button type="button" className={paymentMethod === "cash" ? "selected" : ""} onClick={() => setPaymentMethod("cash")}><span className="method-symbol cash-symbol">ج</span><span><strong>نقداً</strong><small>دفع نقدي</small></span>{paymentMethod === "cash" && <Check size={17} />}</button>
            <button type="button" className={paymentMethod === "card" ? "selected" : ""} onClick={() => setPaymentMethod("card")}><span className="method-symbol card-symbol">▤</span><span><strong>بطاقة</strong><small>بطاقة بنكية</small></span>{paymentMethod === "card" && <Check size={17} />}</button>
          </div>
          {paymentMethod === "cash" && <label className="field paid-field"><span>المبلغ المستلم</span><div><input type="number" min={subtotal} value={paidAmount} onChange={(event) => setPaidAmount(event.target.value)} /><span>ج.م</span></div><small>الباقي للعميلة: {formatPrice(Math.max(0, Number(paidAmount) - subtotal))}</small></label>}
          {checkoutError && <p className="form-error" role="alert">{checkoutError}</p>}
          <button className="modal-confirm" type="button" disabled={checkoutLoading || (paymentMethod === "cash" && Number(paidAmount) < subtotal)} onClick={completeSale}>{checkoutLoading ? "جارٍ حفظ العملية..." : <>تأكيد الدفع <span>{formatPrice(subtotal)}</span></>}</button>
          <p className="modal-secure">سيتم إصدار إيصال بعد تأكيد العملية.</p>
        </section>
      </div>}

      {receipt && <div className="modal-backdrop receipt-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setReceipt(null); }}>
        <section className="receipt-modal" role="dialog" aria-modal="true" aria-labelledby="receipt-title" dir="rtl">
          <button className="receipt-close" type="button" aria-label="إغلاق الإيصال" onClick={() => setReceipt(null)}><X size={19} /></button>
          <div className="receipt-print">
            <div className="receipt-brand-logo" style={{ backgroundColor: tenant.primaryColor }}>{tenant.logoUrl ? <Image src={tenant.logoUrl} alt={tenant.name} width={43} height={43} unoptimized /> : <span>{tenant.name.slice(0, 1)}</span>}</div>
            <p className="receipt-kicker">{tenant.name}</p><h2 id="receipt-title">إيصال دفع</h2>
            <div className="receipt-meta"><span>{receipt.number}</span><span>{receipt.date}</span></div>
            <div className="receipt-rule" />
            {receipt.lines.map(({ service, quantity }) => <div className="receipt-line" key={service.id}><span>{service.name} × {quantity}</span><strong>{formatPrice(service.price * quantity)}</strong></div>)}
            <div className="receipt-rule" />
            <div className="receipt-line receipt-total"><span>الإجمالي</span><strong>{formatPrice(receipt.total)}</strong></div>
            <div className="receipt-method">طريقة الدفع: {receipt.method === "cash" ? "نقداً" : "بطاقة"}</div>
            <p className="receipt-thanks">شكراً لزيارتكِ، نتمنى لكِ يوماً جميلاً</p>
          </div>
          <div className="receipt-actions"><button type="button" className="receipt-print-button" onClick={() => window.print()}><Printer size={17} /> طباعة الإيصال</button><button type="button" className="receipt-done" onClick={() => setReceipt(null)}>تم <Check size={16} /></button></div>
        </section>
      </div>}
    </section>
  );
}

function ArrowLeftIcon() {
  return <span aria-hidden="true">←</span>;
}