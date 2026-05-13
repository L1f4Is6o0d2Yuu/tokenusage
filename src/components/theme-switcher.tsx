"use client";

import { useRef, useTransition } from "react";
import { THEMES, type Theme } from "@/lib/theme";
import { setThemeAction } from "@/app/theme-action";

export function ThemeSwitcher({
  active,
  labels,
}: {
  active: Theme;
  labels: { label: string; light: string; dark: string; system: string };
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      action={setThemeAction}
      className="grid grid-cols-[3.5rem_1fr] items-center gap-2 text-xs"
    >
      <label htmlFor="theme-select" className="text-fg-muted">
        {labels.label}
      </label>
      <select
        key={active}
        id="theme-select"
        name="theme"
        defaultValue={active}
        disabled={pending}
        onChange={() => startTransition(() => formRef.current?.requestSubmit())}
        className="w-full min-w-0 rounded border border-border-subtle bg-bg-input px-2 py-1 font-mono text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40"
      >
        {THEMES.map((t) => (
          <option key={t} value={t}>
            {t === "light" ? labels.light : t === "dark" ? labels.dark : labels.system}
          </option>
        ))}
      </select>
    </form>
  );
}
