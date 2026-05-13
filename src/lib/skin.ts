export const SKINS = ["linear", "wise"] as const;
export type Skin = (typeof SKINS)[number];
export const DEFAULT_SKIN: Skin = "linear";
export const SKIN_COOKIE = "tokenusage-skin";

export function isSkin(v: string | undefined): v is Skin {
  return !!v && (SKINS as readonly string[]).includes(v);
}
