import { useTranslations } from "next-intl";
import Navbar from "@/components/layout/Navbar";
import { Calendar, Ticket, Store, TrendingUp, Bell, Settings, Plus } from "lucide-react";

const stats = [
  { label: "My Bookings",    value: "0",  icon: Ticket,     color: "text-brand-gold" },
  { label: "Saved Events",   value: "0",  icon: Calendar,   color: "text-blue-500" },
  { label: "Following",      value: "0",  icon: Store,      color: "text-purple-500" },
  { label: "Notifications",  value: "0",  icon: Bell,       color: "text-green-500" },
];

const quickActions = [
  { label: "Browse Events",    href: "/events",       icon: Calendar, primary: false },
  { label: "Find Vendors",     href: "/vendors",      icon: Store,    primary: false },
  { label: "Create Event",     href: "/events/new",   icon: Plus,     primary: true  },
];

export default function DashboardPage() {
  const t = useTranslations();

  return (
    <div className="min-h-screen bg-brand-warm-white">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Welcome */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-medium text-brand-midnight mb-1">
              Welcome back 👋
            </h1>
            <p className="text-sm text-brand-ink/50">Here's what's happening on Sanatix</p>
          </div>
          <button className="p-2.5 rounded-xl border border-black/8 bg-white hover:bg-brand-sand transition-colors">
            <Settings size={18} className="text-brand-ink/60" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-black/5 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-brand-ink/50">{stat.label}</span>
                <stat.icon size={16} className={stat.color} />
              </div>
              <p className="text-2xl font-medium text-brand-midnight">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-3 mb-10">
          {quickActions.map((action) => (
            <a
              key={action.label}
              href={action.href}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-colors ${
                action.primary
                  ? "bg-brand-gold text-white hover:bg-brand-gold/90"
                  : "bg-white border border-black/10 text-brand-ink/70 hover:bg-brand-sand"
              }`}
            >
              <action.icon size={14} />
              {action.label}
            </a>
          ))}
        </div>

        {/* Two column layout */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* Upcoming bookings */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-black/5 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-medium text-brand-midnight">Upcoming Bookings</h2>
              <a href="/bookings" className="text-xs text-brand-gold hover:underline">View all</a>
            </div>
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-brand-sand flex items-center justify-center mb-4">
                <Ticket size={22} className="text-brand-ink/30" />
              </div>
              <p className="text-sm text-brand-ink/50 mb-3">No upcoming bookings yet</p>
              <a
                href="/events"
                className="text-sm text-brand-gold hover:underline font-medium"
              >
                Browse events →
              </a>
            </div>
          </div>

          {/* Trending events */}
          <div className="bg-white rounded-2xl border border-black/5 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-medium text-brand-midnight">Trending</h2>
              <TrendingUp size={15} className="text-brand-gold" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-12 h-12 rounded-xl bg-brand-sand shrink-0" />
                  <div className="flex-1 space-y-1.5 py-1">
                    <div className="h-3 bg-brand-sand rounded w-4/5" />
                    <div className="h-2.5 bg-brand-sand rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
