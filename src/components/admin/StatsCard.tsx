import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  color?: "teal" | "gold" | "green" | "red" | "blue";
  className?: string;
}

const colorMap = {
  teal:  { bg: "bg-[#1B4D4D]/10", icon: "text-[#1B4D4D]", badge: "bg-[#1B4D4D]/10 text-[#1B4D4D]" },
  gold:  { bg: "bg-[#D4A574]/10", icon: "text-[#D4A574]", badge: "bg-[#D4A574]/10 text-[#D4A574]" },
  green: { bg: "bg-emerald-50",   icon: "text-emerald-600", badge: "bg-emerald-50 text-emerald-600" },
  red:   { bg: "bg-red-50",       icon: "text-red-600",     badge: "bg-red-50 text-red-600" },
  blue:  { bg: "bg-blue-50",      icon: "text-blue-600",    badge: "bg-blue-50 text-blue-600" },
};

export default function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "teal",
  className,
}: StatsCardProps) {
  const colors = colorMap[color];

  return (
    <div className={cn("bg-white rounded-2xl border border-black/5 p-5 shadow-sm", className)}>
      <div className="flex items-start justify-between">
        <div className={cn("p-2.5 rounded-xl", colors.bg)}>
          <Icon size={20} className={colors.icon} />
        </div>
        {trend && (
          <span className={cn("text-xs font-medium px-2 py-1 rounded-full", colors.badge)}>
            {trend.value > 0 ? "+" : ""}{trend.value}% {trend.label}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-semibold text-[#2C2C2C]">{value}</p>
        <p className="text-sm font-medium text-[#2C2C2C] mt-0.5">{title}</p>
        {subtitle && (
          <p className="text-xs text-[#2C2C2C]/50 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
