"use client";

import { useRef, useTransition } from "react";
import { SKINS, type Skin } from "@/lib/skin";
import { setSkinAction } from "@/app/skin-action";

// Sister to ThemeSwitcher — same form-action shape so they read as a
// pair in the sidebar settings stack.
export function SkinSwitcher({
  active,
  labels,
}: {
  active: Skin;
  labels: { label: string; linear: string; wise: string };
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      action={setSkinAction}
      className="grid grid-cols-[3.5rem_1fr] items-center gap-2 text-xs"
    >
      <label htmlFor="skin-select" className="text-fg-muted">
        {labels.label}
      </label>
      <select
        id="skin-select"
        name="skin"
        defaultValue={active}
        disabled={pending}
        onChange={() => startTransition(() => formRef.current?.requestSubmit())}
        className="w-full min-w-0 rounded border border-border-subtle bg-bg-input px-2 py-1 font-mono text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40"
      >
        {SKINS.map((s) => (
          <option key={s} value={s}>
            {s === "linear" ? labels.linear : labels.wise}
          </option>
        ))}
      </select>
    </form>
  );
}
