"use client";

import { useState, useId } from "react";
import { Eye, EyeOff } from "lucide-react";
import { checkPasswordPolicy, passwordStrength } from "@/lib/auth-validation";

const STRENGTH_LABELS = ["", "weak", "fair", "good", "strong"] as const;
const STRENGTH_COLORS = [
  "bg-bg-panel-2",
  "bg-danger",
  "bg-warning",
  "bg-accent",
  "bg-success",
] as const;

// Controlled password input with a reveal-eye toggle and (optional) live
// policy + strength feedback. Mirrors the server policy in
// @/lib/auth-validation so what the user sees matches what the server
// will accept.
//
// `showStrength={false}` collapses this to a plain password field with
// just the reveal eye — appropriate for login (the user already knows
// their password, no need to grade it).
export function PasswordField({
  name = "password",
  label,
  policyLabel,
  required = true,
  autoFocus = false,
  autoComplete = "new-password",
  showStrength = true,
  defaultValue = "",
}: {
  name?: string;
  label: string;
  policyLabel?: string;
  required?: boolean;
  autoFocus?: boolean;
  autoComplete?: string;
  showStrength?: boolean;
  defaultValue?: string;
}) {
  const id = useId();
  const [value, setValue] = useState(defaultValue);
  const [revealed, setRevealed] = useState(false);
  const strength = passwordStrength(value);
  const policy = checkPasswordPolicy(value);
  const showFeedback = showStrength && value.length > 0;

  return (
    <div>
      <label className="text-xs text-fg-muted" htmlFor={id}>
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={id}
          name={name}
          type={revealed ? "text" : "password"}
          required={required}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          minLength={showStrength ? 8 : undefined}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded border border-border-subtle bg-bg-input px-3 py-2 pr-9 font-mono text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
        />
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          aria-label={revealed ? "Hide password" : "Show password"}
          aria-pressed={revealed}
          tabIndex={-1}
          className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-fg-muted transition-colors hover:text-fg-default focus:text-accent focus:outline-none"
        >
          {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {showFeedback && (
        <div className="mt-2 space-y-1">
          <div
            className="flex gap-1"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={4}
            aria-valuenow={strength}
          >
            {[1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= strength ? STRENGTH_COLORS[strength] : "bg-bg-panel-2"
                }`}
              />
            ))}
          </div>
          <p className="text-[11px] text-fg-muted">
            {policy.ok ? (
              <>
                <span className="text-fg-default">{STRENGTH_LABELS[strength]}</span>
                {strength < 4 && (
                  <> — {policyLabel ?? "tip: longer + mixed case + a symbol pushes you to strong"}</>
                )}
              </>
            ) : policy.reason === "too-short" ? (
              "at least 8 characters"
            ) : policy.reason === "missing-letter" ? (
              "must contain a letter"
            ) : (
              "must contain a digit"
            )}
          </p>
        </div>
      )}
    </div>
  );
}
