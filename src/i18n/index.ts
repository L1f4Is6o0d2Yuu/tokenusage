import "server-only";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALES, type Dictionary, type Locale } from "./types";

export const LOCALE_COOKIE = "tokenusage-locale";

const dictionaryLoaders: Record<Locale, () => Promise<{ default: Dictionary }>> = {
  en: () => import("./dictionaries/en.json"),
  "zh-CN": () => import("./dictionaries/zh-CN.json"),
  "zh-TW": () => import("./dictionaries/zh-TW.json"),
  ja: () => import("./dictionaries/ja.json"),
  ko: () => import("./dictionaries/ko.json"),
  fr: () => import("./dictionaries/fr.json"),
  de: () => import("./dictionaries/de.json"),
  es: () => import("./dictionaries/es.json"),
  pt: () => import("./dictionaries/pt.json"),
  it: () => import("./dictionaries/it.json"),
  ru: () => import("./dictionaries/ru.json"),
};

function isLocale(v: string | undefined): v is Locale {
  return !!v && (LOCALES as readonly string[]).includes(v);
}

function pickFromAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  for (const part of header.split(",")) {
    const tag = part.split(";")[0].trim();
    if (isLocale(tag)) return tag;
    if (tag === "zh") return "zh-CN";
    if (tag.startsWith("zh-"))
      return tag.toLowerCase().includes("tw") || tag.toLowerCase().includes("hk")
        ? "zh-TW"
        : "zh-CN";
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
