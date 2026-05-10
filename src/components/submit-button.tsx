"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

// Wraps a `<button type="submit">` so that, while the parent form's server
// action is in flight, the button is disabled and shows pending text. This
// stops the "double-click on a slow link generated 4 invite tokens" class of
// problem.
//
// Use exactly like a normal button — but place it inside a <form
// action={...}> so useFormStatus can pick up the pending state.
export function SubmitButton({
  children,
  pendingText,
  className,
  variant = "primary",
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  variant?: "primary" | "outline" | "danger";
}) {
  const { pending } = useFormStatus();
  const base =
    variant === "primary"
      ? "rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
      : variant === "danger"
        ? "rounded-md border border-amber-600 bg-background px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 dark:text-amber-300"
        : "rounded-md border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted";
  return (
    <button
      type="submit"
      aria-busy={pending}
      disabled={pending}
      className={cn(base, "disabled:cursor-not-allowed disabled:opacity-60", className)}
    >
      {pending ? (pendingText ?? "Working…") : children}
    </button>
  );
}
