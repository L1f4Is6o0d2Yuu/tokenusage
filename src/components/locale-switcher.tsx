"use client";

import { useRef, useTransition } from "react";
import { LOCALE_NAMES, LOCALES, type Locale } from "@/i18n/types";
import { setLocaleAction } from "@/app/locale-action";

export function LocaleSwitcher({ active, label }: { active: Locale; label: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form ref={formRef} action={setLocaleAction} className="flex items-center gap-2 text-xs">
      <label htmlFor="locale-select" className="text-muted-foreground">
        {label}
      </label>
      <select
        id="locale-select"
        name="locale"
        defaultValue={active}
        disabled={pending}
        onChange={() => {
          startTransition(() => formRef.current?.requestSubmit());
        }}
        className="rounded border bg-background px-2 py-1 font-mono text-foreground"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {LOCALE_NAMES[l]}
          </option>
        ))}
      </select>
    </form>
  );
}
