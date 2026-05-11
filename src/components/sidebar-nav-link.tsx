"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SidebarNavLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "/";
  const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        "flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] font-medium transition-colors " +
        (active
          ? "bg-accent-soft text-accent"
          : "text-fg-muted hover:bg-bg-panel-2 hover:text-fg-default")
      }
    >
      <span className={active ? "text-accent" : "text-fg-faint"}>{children}</span>
      <span className="truncate">{label}</span>
    </Link>
  );
}
