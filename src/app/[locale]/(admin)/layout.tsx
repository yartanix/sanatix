import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  ShoppingBag,
  Store,
  Flag,
  Settings,
  Activity,
  LogOut,
  Shield,
} from "lucide-react";

const nav = [
  { href: "/admin",          label_ar: "لوحة التحكم",  label_en: "Dashboard",     Icon: LayoutDashboard },
  { href: "/admin/users",    label_ar: "المستخدمون",   label_en: "Users",         Icon: Users           },
  { href: "/admin/events",   label_ar: "الفعاليات",    label_en: "Events",        Icon: CalendarDays    },
  { href: "/admin/bookings", label_ar: "الحجوزات",     label_en: "Bookings",      Icon: ShoppingBag     },
  { href: "/admin/vendors",  label_ar: "الموردون",     label_en: "Vendors",       Icon: Store           },
  { href: "/admin/reports",  label_ar: "البلاغات",     label_en: "Reports",       Icon: Flag            },
  { href: "/admin/settings", label_ar: "الإعدادات",    label_en: "Settings",      Icon: Settings        },
  { href: "/admin/logs",     label_ar: "سجل النشاط",   label_en: "Activity Logs", Icon: Activity        },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const locale = await getLocale();
  const isRTL = locale === "ar";

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/login?next=/${locale}/admin`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    redirect(`/${locale}`);
  }

  return (
    <div
      className={`flex min-h-screen bg-[#F9F7F4] ${isRTL ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Sidebar */}
      <aside className="w-64 shrink-0 flex flex-col bg-[#1B4D4D] sticky top-0 h-screen overflow-y-auto">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#D4A574] rounded-lg">
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {isRTL ? "لوحة الإدارة" : "Admin Panel"}
              </p>
              <p className="text-xs text-white/50">Sanatix</p>
            </div>
          </div>
          <p className="text-xs text-white/40 mt-3 truncate">
            {profile.full_name || user.email}
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {nav.map(({ href, label_ar, label_en, Icon }) => (
            <Link
              key={href}
              href={href as "/organizer"}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/60 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Icon size={16} />
              {isRTL ? label_ar : label_en}
            </Link>
          ))}
        </nav>

        {/* Sign out */}
        <div className="p-3 border-t border-white/10">
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/50 hover:bg-white/10 hover:text-white transition-colors"
            >
              <LogOut size={16} />
              {isRTL ? "تسجيل الخروج" : "Sign out"}
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 overflow-auto">
        {/* Top bar */}
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-black/5 px-6 py-3.5 flex items-center justify-between">
          <div />
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#2C2C2C]/50">
              {isRTL ? "مرحباً،" : "Hello,"}{" "}
              <span className="font-medium text-[#2C2C2C]">
                {profile.full_name || user.email}
              </span>
            </span>
            <span className="px-2 py-0.5 bg-[#1B4D4D]/10 text-[#1B4D4D] text-xs font-medium rounded-full">
              {isRTL ? "مدير" : "Admin"}
            </span>
          </div>
        </header>

        <div className="p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
