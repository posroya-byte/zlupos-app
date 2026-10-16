"use client";

import { BarChart3, CalendarDays, ChevronDown, CircleHelp, LayoutDashboard, LogOut, Scissors, Settings2, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import type { TenantBranding } from "@/types/database";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { TenantBrandingContext } from "./TenantBrandingContext";

const navigation = [
  { label: "نظرة عامة", href: "/dashboard", icon: LayoutDashboard },
  { label: "نقطة البيع", href: "/dashboard/pos", icon: ShoppingBag },
  { label: "المواعيد", href: "/dashboard/appointments", icon: CalendarDays },
  { label: "الخدمات", href: "/dashboard/services", icon: Scissors },
  { label: "التقارير", href: "/dashboard/reports", icon: BarChart3 },
];

export default function DashboardShell({ tenant, children }: { tenant: TenantBranding; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <TenantBrandingContext.Provider value={tenant}>
    <div className="dashboard-shell" dir="rtl" style={{ "--tenant-color": tenant.primaryColor } as React.CSSProperties}>
      <aside className="dashboard-sidebar">
        <Link className="dashboard-brand" href="/dashboard/pos">
          <span className="dashboard-logo"><Image src="/logo.svg" alt="ZLUPOS" width={32} height={32} /></span>
          <span><strong>{tenant.name}</strong><small>ZLUPOS PRODUCTION</small></span>
        </Link>
        <div className="sidebar-caption">مساحة العمل</div>
        <nav className="dashboard-nav" aria-label="التنقل الرئيسي">
          {navigation.map(({ label, href, icon: Icon }) => <Link key={href} href={href} className={`dashboard-nav-link ${pathname === href ? "active" : ""}`} aria-current={pathname === href ? "page" : undefined}>
            <Icon size={18} strokeWidth={1.8} /><span>{label}</span>{label === "المواعيد" && <i className="nav-count">٣</i>}
          </Link>)}
        </nav>
        <div className="sidebar-bottom">
          <Link href="/dashboard/settings" className="dashboard-nav-link"><Settings2 size={18} strokeWidth={1.8} /><span>الإعدادات</span></Link>
          <Link href="mailto:support@zlupos.com" className="dashboard-nav-link"><CircleHelp size={18} strokeWidth={1.8} /><span>المساعدة</span></Link>
          <div className="trial-mini"><span className="trial-mini-dot" /><span><strong>فترة التجربة</strong><small>متبقي ١٤ يوماً</small></span><ChevronDown size={15} /></div>
          <button className="sidebar-logout" type="button" onClick={async () => { await getSupabaseBrowserClient().auth.signOut(); router.replace("/login"); }}><LogOut size={16} /> الخروج</button>
        </div>
      </aside>
      <div className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-context"><a href="/dashboard" aria-label="ZLUPOS"><Image src="/logo.svg" alt="ZLUPOS" width={104} height={30} /></a><span className="header-kicker">إدارة الصالون</span><strong>{tenant.name}</strong></div>
          <div className="header-actions"><span className="branch-chip"><span /> الفرع الرئيسي</span><span className="header-date">الأربعاء، ١٤ أكتوبر ٢٠٢٦</span><span className="user-avatar">{tenant.name.slice(0, 1)}</span></div>
        </header>
        <main className="dashboard-content">{children}</main>
      </div>
    </div>
    </TenantBrandingContext.Provider>
  );
}