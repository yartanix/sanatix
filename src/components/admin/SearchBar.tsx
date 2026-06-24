"use client";

import { Search, X } from "lucide-react";
import { useState, useEffect } from "react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = "Search...",
  className,
}: SearchBarProps) {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => onChange(local), 350);
    return () => clearTimeout(timer);
  }, [local, onChange]);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  return (
    <div className={`relative ${className ?? ""}`}>
      <Search
        size={15}
        className="absolute start-3.5 top-1/2 -translate-y-1/2 text-[#2C2C2C]/35 pointer-events-none"
      />
      <input
        type="text"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className="w-full ps-10 pe-9 py-2.5 rounded-xl border border-black/10 bg-white text-sm text-[#2C2C2C] placeholder:text-[#2C2C2C]/35 focus:outline-none focus:ring-2 focus:ring-[#1B4D4D]/20 focus:border-[#1B4D4D]/30 transition-colors"
      />
      {local && (
        <button
          onClick={() => { setLocal(""); onChange(""); }}
          className="absolute end-3 top-1/2 -translate-y-1/2 text-[#2C2C2C]/35 hover:text-[#2C2C2C] transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
