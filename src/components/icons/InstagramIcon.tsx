// lucide-react dropped all brand/social icons (Instagram, Twitter, Facebook, …) in its
// 1.0 release, so this fills the gap with a minimal line icon matching lucide's own
// stroke conventions (viewBox 0 0 24 24, stroke="currentColor", strokeWidth 2, round
// caps/joins) and prop shape (`size`, `className`), so it drops into existing call
// sites as a direct replacement for `import { Instagram } from "lucide-react"`.
interface InstagramIconProps {
  size?: number;
  className?: string;
}

export function InstagramIcon({ size = 16, className }: InstagramIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}
