"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff } from "lucide-react";
import { authInputClass, authLabelClass } from "./AuthShell";

// Password input with a show/hide toggle.
//
// `autoComplete` is what lets a password manager tell a sign-in form
// ("current-password": fill the saved one) from a sign-up or reset form
// ("new-password": offer to generate one, never fill the old one).
export default function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  minLength,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  minLength?: number;
  hint?: string;
}) {
  const t = useTranslations();
  const [visible, setVisible] = useState(false);
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div>
      <label htmlFor={id} className={authLabelClass}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required
          minLength={minLength}
          aria-describedby={hintId}
          enterKeyHint="done"
          className={`${authInputClass} pe-12`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t("auth.hidePassword") : t("auth.showPassword")}
          aria-pressed={visible}
          aria-controls={id}
          className="absolute end-1 top-1/2 -translate-y-1/2 p-2.5 rounded-lg text-brand-ink/50 hover:text-brand-ink"
        >
          {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
        </button>
      </div>
      {hint && (
        <p id={hintId} className="text-xs text-brand-ink/50 mt-1.5">
          {hint}
        </p>
      )}
    </div>
  );
}
