import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import {
  LayoutDashboard, Store, MessageSquare, Star, LogOut, Zap,
} from "lucide-react";

const nav = [
  { href: "/vendor",           label_ar: "لوحة التحكم",   label_en: "Dashboard",  Icon: LayoutDashboard },
  { href: "/vendor/profile",   label_ar: "ملفي التجاري",  label_en: "Profile",    Icon: Store           },
  { href: "/vendor/inquiries", label_ar: "الاستفسارات",   label_en: "Inquiries",  Icon: MessageSquare   },
  { href: "/vendor/reviews",   label_ar: "التقييمات",     label_en: "Reviews",    Icon: Star            },
];

type NavItem = { href: string; label_ar: string; label_en: string; Icon: React.ElementType };

// Mirrors (organizer)/layout.tsx's gating pattern exactly — role-gated
// at the layout level, not per-page, so a new page under /vendor is
// safe by default.
export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const locale = await getLocale();
  const isRTL = locale === "ar";

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/" + locale + "/login?next=/" + locale + "/vendor");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "supplier" && profile.role !== "admin")) {
    redirect("/" + locale);
  }

  const sidebarClass = "flex min-h-screen bg-[#0a0a0a] " + (isRTL ? "flex-row-reverse" : "flex-row");

  return (
    <div className={sidebarClass}>
      <aside className="w-60 shrink-0 flex flex-col bg-[#111] border-r border-white/8 sticky top-0 h-screen">
        <div className="px-4 py-5 border-b border-white/8">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-amber-400" />
            <span className="text-sm font-semibold text-white tracking-wide">
              {isRTL ? "مركز الموردين" : "Supplier Hub"}
            </span>
          </div>
          <p className="text-xs text-white/40 mt-1 truncate">
            {profile.full_name || user.email}
          </p>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {nav.map(function (item) {
            const navItem = item as NavItem;
            return (
              <Link
                key={navItem.href}
                href={navItem.href as "/vendor"}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/60 hover:bg-white/5 hover:text-white transition-colors"
              >
                <navItem.Icon size={15} />
                {isRTL ? navItem.label_ar : navItem.label_en}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/8">
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/60 hover:bg-white/5 hover:text-white transition-colors"
            >
              <LogOut size={15} />
              {isRTL ? "تسجيل الخروج" : "Sign out"}
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-6 md:p-8">{children}</main>
    </div>
  );
}
