"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  LayoutDashboard,
  Trophy,
  CreditCard,
  Sparkles,
  Tags,
  KeyRound,
  Package,
  Users,
  Settings,
  ExternalLink,
  Share2,
  LogOut,
  Code2,
  Sun,
  Moon,
  Palette,
} from "lucide-react";
import { setThemeAction } from "@/app/theme-action";
import { setSkinAction } from "@/app/skin-action";
import { logoutAction } from "@/app/auth-actions";

// Small adapters so the palette can call the FormData-based server
// actions with a single string. Keeps the action signature unchanged
// (header forms still post FormData directly).
async function applyTheme(value: "light" | "dark" | "system"): Promise<void> {
  const fd = new FormData();
  fd.set("theme", value);
  await setThemeAction(fd);
  // The server action revalidates; force a class flip immediately so
  // there's no waiting for the navigation to repaint.
  const html = document.documentElement;
  if (value === "dark") html.classList.add("dark");
  else if (value === "light") html.classList.remove("dark");
  else {
    const prefersDark = window.matchMedia?.(
      "(prefers-color-scheme: dark)"
    ).matches;
    html.classList.toggle("dark", !!prefersDark);
  }
}
async function applySkin(value: "linear" | "wise"): Promise<void> {
  const fd = new FormData();
  fd.set("skin", value);
  await setSkinAction(fd);
  document.documentElement.setAttribute("data-skin", value);
}

// Cmd+K command palette. Three things make it feel native rather than a
// "feature we bolted on":
//   1. Opens on ⌘K / Ctrl+K, dismisses on Esc — both bound at window level
//      so the listener survives route changes.
//   2. cmdk handles fuzzy matching internally so the same query catches
//      both Chinese labels and English route names ("仪表盘" and
//      "dashboard").
//   3. Backdrop blur + pop-in animation match the rest of the app's motion
//      language (tu-pop-in).
//
// Items split by group: navigation, actions (share / sign-out),
// preferences (theme / skin). Each group is a cmdk Command.Group so
// keyboard nav respects the visual sections.

type Item = {
  label: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  // Either a route to push, or an arbitrary action.
  href?: string;
  action?: () => void | Promise<void>;
  // Inline keyword pool so the same row matches multiple languages.
  keywords?: string[];
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isToggle =
        (e.key === "k" || e.key === "K") &&
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        !e.altKey;
      if (isToggle) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const close = () => setOpen(false);

  // Items list. Held in the component (not at module scope) so router
  // closures stay fresh per render and the action closures can call
  // close() before navigating without a stale reference.
  const groups: { heading: string; items: Item[] }[] = [
    {
      heading: "前往",
      items: [
        {
          label: "看板",
          hint: "dashboard · 主页",
          icon: LayoutDashboard,
          href: "/dashboard",
          keywords: ["dashboard", "home", "主页", "kanban"],
        },
        {
          label: "排行榜",
          hint: "leaderboard · 卷王名单",
          icon: Trophy,
          href: "/leaderboard",
          keywords: ["leaderboard", "rank", "ranking", "排名"],
        },
        {
          label: "订阅套餐",
          hint: "subscriptions · 月费 vs PAYG",
          icon: CreditCard,
          href: "/subscriptions",
          keywords: ["subscription", "plan", "billing", "套餐", "付费"],
        },
        {
          label: "模型库",
          hint: "models · 全模型价目",
          icon: Sparkles,
          href: "/models",
          keywords: ["models", "ai", "claude", "gpt", "模型"],
        },
        {
          label: "定价",
          hint: "prices · 按提供商汇总",
          icon: Tags,
          href: "/prices",
          keywords: ["price", "pricing", "定价"],
        },
        {
          label: "Agent / Tokens",
          hint: "agent install · API token",
          icon: KeyRound,
          href: "/tokens",
          keywords: ["agent", "install", "token", "api"],
        },
        {
          label: "安装 Agent",
          hint: "install · brew or curl",
          icon: Package,
          href: "/install",
          keywords: ["install", "agent", "brew", "curl", "安装"],
        },
        {
          label: "成员管理",
          hint: "users · 仅 admin",
          icon: Users,
          href: "/users",
          keywords: ["users", "admin", "成员"],
        },
        {
          label: "关于",
          hint: "about · 项目介绍",
          icon: Settings,
          href: "/about",
          keywords: ["about", "info", "关于"],
        },
      ],
    },
    {
      heading: "动作",
      items: [
        {
          label: "分享本周战绩",
          hint: "share 7d · 新开标签",
          icon: Share2,
          href: "/api/share/7d",
          keywords: ["share", "poster", "分享"],
        },
        {
          label: "退出登录",
          hint: "logout · 当前账户",
          icon: LogOut,
          action: async () => {
            close();
            await logoutAction();
            router.push("/login");
          },
        },
        {
          label: "项目 GitHub",
          hint: "L1f4Is6o0d2Yuu/tokenusage",
          icon: Code2,
          action: () => {
            close();
            window.open(
              "https://github.com/L1f4Is6o0d2Yuu/tokenusage",
              "_blank",
              "noopener"
            );
          },
        },
      ],
    },
    {
      heading: "外观",
      items: [
        {
          label: "切到浅色",
          hint: "theme · light",
          icon: Sun,
          action: async () => {
            close();
            await applyTheme("light");
          },
        },
        {
          label: "切到深色",
          hint: "theme · dark",
          icon: Moon,
          action: async () => {
            close();
            await applyTheme("dark");
          },
        },
        {
          label: "跟随系统",
          hint: "theme · system",
          icon: Palette,
          action: async () => {
            close();
            await applyTheme("system");
          },
        },
        {
          label: "皮肤：Linear",
          hint: "skin · linear (默认)",
          icon: Palette,
          action: async () => {
            close();
            await applySkin("linear");
          },
        },
        {
          label: "皮肤：Wise",
          hint: "skin · wise",
          icon: Palette,
          action: async () => {
            close();
            await applySkin("wise");
          },
        },
      ],
    },
  ];

  return (
    <>
      {open && (
        <div
          aria-hidden
          onClick={close}
          className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm tu-fade-in"
        />
      )}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed left-1/2 top-[18%] z-50 w-[min(640px,calc(100vw-32px))] -translate-x-1/2 tu-pop-in"
        >
          <Command
            label="命令面板"
            className="overflow-hidden rounded-xl border border-border-subtle bg-bg-panel shadow-2xl"
          >
            <div className="border-b border-border-subtle px-3 py-2">
              <Command.Input
                autoFocus
                placeholder="输入命令、页面、模型... ( ⌘K 关闭 )"
                className="w-full bg-transparent py-2 text-sm text-foreground outline-none placeholder:text-fg-muted"
              />
            </div>
            <Command.List className="max-h-[50vh] overflow-y-auto p-2">
              <Command.Empty className="px-3 py-6 text-center text-sm text-fg-muted">
                没找到。试试别的关键词？
              </Command.Empty>
              {groups.map((group) => (
                <Command.Group
                  key={group.heading}
                  heading={
                    <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-fg-faint">
                      {group.heading}
                    </div>
                  }
                >
                  {group.items.map((it) => {
                    const Icon = it.icon;
                    return (
                      <Command.Item
                        key={`${group.heading}:${it.label}`}
                        keywords={it.keywords}
                        value={`${group.heading} ${it.label} ${(it.keywords ?? []).join(" ")} ${it.hint ?? ""}`}
                        onSelect={() => {
                          if (it.href) {
                            close();
                            if (it.href.startsWith("/api/")) {
                              window.open(it.href, "_blank", "noopener");
                            } else {
                              router.push(it.href);
                            }
                          } else if (it.action) {
                            it.action();
                          }
                        }}
                        className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-100 data-[selected=true]:bg-accent-soft data-[selected=true]:text-foreground"
                      >
                        <Icon className="h-4 w-4 text-fg-muted" />
                        <span className="flex-1 truncate text-foreground">
                          {it.label}
                        </span>
                        {it.hint && (
                          <span className="truncate text-[11px] text-fg-faint">
                            {it.hint}
                          </span>
                        )}
                        {it.href?.startsWith("/api/") && (
                          <ExternalLink className="h-3 w-3 text-fg-faint" />
                        )}
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              ))}
            </Command.List>
            <div className="flex items-center justify-between gap-3 border-t border-border-subtle bg-bg-panel-2/50 px-3 py-2 text-[11px] text-fg-faint">
              <span>
                <kbd className="rounded border border-border-subtle bg-bg-panel px-1.5 py-0.5 font-mono text-[10px]">
                  ↑↓
                </kbd>{" "}
                选择 ·{" "}
                <kbd className="rounded border border-border-subtle bg-bg-panel px-1.5 py-0.5 font-mono text-[10px]">
                  ↵
                </kbd>{" "}
                打开 ·{" "}
                <kbd className="rounded border border-border-subtle bg-bg-panel px-1.5 py-0.5 font-mono text-[10px]">
                  Esc
                </kbd>{" "}
                关闭
              </span>
              <span>
                ⌘K · tokenusage
              </span>
            </div>
          </Command>
        </div>
      )}
    </>
  );
}
