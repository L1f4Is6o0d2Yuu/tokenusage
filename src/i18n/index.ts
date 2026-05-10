import "server-only";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALES, type Dictionary, type Locale } from "./types";

export const LOCALE_COOKIE = "tokenusage-locale";

const dictionaryLoaders: Record<Locale, () => Promise<{ default: Dictionary }>> = {
  en: () => import("./dictionaries/en"),
  "zh-CN": () => import("./dictionaries/zh-CN"),
  "zh-TW": () => import("./dictionaries/zh-TW"),
  ja: () => import("./dictionaries/ja"),
  ko: () => import("./dictionaries/ko"),
  fr: () => import("./dictionaries/fr"),
  de: () => import("./dictionaries/de"),
  es: () => import("./dictionaries/es"),
  pt: () => import("./dictionaries/pt"),
  it: () => import("./dictionaries/it"),
  ru: () => import("./dictionaries/ru"),
};

function isLocale(v: string | undefined): v is Locale {
  return !!v && (LOCALES as readonly string[]).includes(v);
}

function pickFromAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  // Accept-Language: zh-CN,zh;q=0.9,en;q=0.8
  for (const part of header.split(",")) {
    const tag = part.split(";")[0].trim();
    if (isLocale(tag)) return tag;
    // Allow generic mapping zh → zh-CN
    if (tag === "zh") return "zh-CN";
    if (tag.startsWith("zh-")) return tag.toLowerCase().includes("tw") || tag.toLowerCase().includes("hk") ? "zh-TW" : "zh-CN";
    const base = tag.split("-")[0];
    if (isLocale(base)) return base as Locale;
  }
  return null;
}

export async function readLocale(): Promise<Locale> {
  const c = await cookies();
  const fromCookie = c.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;

  const h = await headers();
  return pickFromAcceptLanguage(h.get("accept-language")) ?? DEFAULT_LOCALE;
}

export async function getDictionary(locale?: Locale): Promise<Dictionary> {
  const l = locale ?? (await readLocale());
  const mod = await dictionaryLoaders[l]();
  return mod.default;
}
