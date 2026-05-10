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
    <form ref={formRef} action={setThemeAction} className="flex items-center gap-2 text-xs">
      <label htmlFor="theme-select" className="text-muted-foreground">
        {labels.label}
      </label>
      <select
        id="theme-select"
        name="theme"
        defaultValue={active}
        disabled={pending}
        onChange={() => startTransition(() => formRef.current?.requestSubmit())}
        className="rounded border bg-background px-2 py-1 font-mono text-foreground"
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
