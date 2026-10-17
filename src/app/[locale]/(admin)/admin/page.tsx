import { createClient } from "@/lib/supabase/server";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Store, CalendarDays, Building2, ArrowRight, ArrowLeft } from "lucide-react";

export const metadata = { title: "Admin - Sanatix" };

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const locale = await getLocale();
  const isRTL = locale === "ar";
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  const [{ count: pendingVendors }, { count: agentEvents }, { count: agentVenues }] = await Promise.all([
    supabase.from("vendors").select("id", { count: "exact", head: true }).eq("is_verified", false),
    supabase.from("events").select("id", { count: "exact", head: true }).eq("agent_generated", true).eq("status", "published"),
    supabase.from("venues").select("id", { count: "exact", head: true }).eq("agent_generated", true).eq("is_published", true),
  ]);

  const cards = [
    {
      href: "/admin/vendors",
      label: isRTL ? "موردون بانتظار المراجعة" : "Vendors awaiting review",
      value: pendingVendors ?? 0,
      Icon: Store,
      accent: (pendingVendors ?? 0) > 0 ? "text-amber-500" : "text-brand-ink/40",
    },
    {
      href: "/admin/content",
      label: isRTL ? "فعاليات منشورة من الوكيل" : "Agent-published events",
      value: agentEvents ?? 0,
      Icon: CalendarDays,
      accent: "text-brand-ink/40",
    },
    {
      href: "/admin/content",
      label: isRTL ? "أماكن منشورة من الوكيل" : "Agent-published venues",
      value: agentVenues ?? 0,
      Icon: Building2,
      accent: "text-brand-ink/40",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">
          {isRTL ? "نظرة عامة" : "Overview"}
        </h1>
        <p className="text-sm text-white/40 mt-1">
          {isRTL
            ? "مراجعة الموردين الجدد والمحتوى الذي ينشره الوكيل تلقائيًا"
            : "Review new vendor applications and content the agent auto-published"}
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="bg-[#141414] rounded-2xl border border-white/8 p-5 hover:border-amber-400/30 transition-colors group"
          >
            <div className="flex items-start justify-between">
              <card.Icon size={18} className={card.accent} />
              <ArrowIcon size={14} className="text-white/20 group-hover:text-white/50 transition-colors" />
            </div>
            <p className="text-3xl font-semibold text-white mt-4">{card.value}</p>
            <p className="text-xs text-white/40 mt-1">{card.label}</p>
          </Link>
        ))}
      </div>

      <div className="bg-[#141414] rounded-2xl border border-white/8 p-5">
        <h2 className="text-sm font-medium text-white mb-2">
          {isRTL ? "كيف تعمل المراجعة" : "How moderation works"}
        </h2>
        <ul className="text-xs text-white/50 space-y-1.5 leading-relaxed">
          <li>
            {isRTL
              ? "الفعاليات والأماكن التي يجدها الوكيل تُنشر تلقائيًا — هذا القسم لسحب أي عنصر خاطئ، لا للموافقة المسبقة عليه."
              : "Agent-found events and venues publish automatically — this section is for pulling something wrong, not pre-approving it."}
          </li>
          <li>
            {isRTL
              ? "الموردون مختلفون: لا يظهرون للعامة إلا بعد موافقة يدوية هنا، سواء أضافهم الوكيل أو انضموا بأنفسهم."
              : "Vendors are different: they stay hidden from the public until verified here, whether the agent found them or they signed up themselves."}
          </li>
        </ul>
      </div>
    </div>
  );
}
