export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];
export const DEFAULT_THEME: Theme = "system";
export const THEME_COOKIE = "tokenusage-theme";

export function isTheme(v: string | undefined): v is Theme {
  return !!v && (THEMES as readonly string[]).includes(v);
}
