import Image from "next/image";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name?: string | null;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: { container: "w-7 h-7", text: "text-xs" },
  md: { container: "w-9 h-9", text: "text-sm" },
  lg: { container: "w-12 h-12", text: "text-base" },
};

function getInitials(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function getColor(name?: string | null): string {
  const colors = [
    "bg-[#1B4D4D] text-white",
    "bg-[#D4A574] text-white",
    "bg-blue-500 text-white",
    "bg-purple-500 text-white",
    "bg-emerald-500 text-white",
    "bg-rose-500 text-white",
  ];
  if (!name) return colors[0];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

export default function UserAvatar({ name, avatarUrl, size = "md", className }: UserAvatarProps) {
  const { container, text } = sizeMap[size];

  if (avatarUrl) {
    return (
      <div className={cn("relative rounded-full overflow-hidden shrink-0", container, className)}>
        <Image src={avatarUrl} alt={name ?? "User"} fill className="object-cover" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-semibold shrink-0",
        container,
        text,
        getColor(name),
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}
