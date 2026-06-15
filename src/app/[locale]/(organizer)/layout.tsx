import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import {
  LayoutDashboard, CalendarDays, Settings, LogOut, Zap,
} from "lucide-react";

const nav = [
  { href: "/organizer",          label_ar: "لوحة التحكم",  label_en: "Dashboard",  Icon: LayoutDashboard },
  { href: "/organizer/events",   label_ar: "الفعاليات",    label_en: "Events",     Icon: CalendarDays   },
  { href: "/organizer/settings", label_ar: "الإعدادات",    label_en: "Settings",   Icon: Settings       },
];

type NavItem = { href: string; label_ar: string; label_en: string; Icon: React.ElementType };

export default async function OrganizerLayout({
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

  if (!user) redirect("/" + locale + "/login?next=/" + locale + "/organizer");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, username")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "organizer" && profile.role !== "admin")) {
    redirect("/" + locale);
  }

  const sidebarClass = "flex min-h-screen bg-[#0a0a0a] " + (isRTL ? "flex-row-reverse" : "flex-row");

  return (
    <div className={sidebarClass}>
      {/* Sidebar */}
      <aside className="w-60 shrink-0 flex flex-col bg-[#111] border-r border-white/8 sticky top-0 h-screen">
        {/* Logo / brand */}
        <div className="px-4 py-5 border-b border-white/8">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-amber-400" />
            <span className="text-sm font-semibold text-white tracking-wide">
              {isRTL ? "مركز المنظمين" : "Organizer Hub"}
            </span>
          </div>
          <p className="text-xs text-white/40 mt-1 truncate">
            {profile.full_name || profile.username || user.email}
          </p>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {nav.map(function(item) {
            const navItem = item as NavItem;
            return (
              <Link
                key={navItem.href}
                href={navItem.href as "/organizer"}
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

      {/* Main */}
      <main className="flex-1 min-w-0 p-6 md:p-8">{children}</main>
    </div>
  );
}
