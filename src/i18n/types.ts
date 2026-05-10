export const LOCALES = [
  "en",
  "zh-CN",
  "zh-TW",
  "ja",
  "ko",
  "fr",
  "de",
  "es",
  "pt",
  "it",
  "ru",
] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  ja: "日本語",
  ko: "한국어",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
  pt: "Português",
  it: "Italiano",
  ru: "Русский",
};

export type Dictionary = {
  meta: {
    title: string;
    description: string;
  };
  header: {
    tagline: string;
  };
  language: {
    label: string;
  };
  period: {
    today: string;
    "24h": string;
    "7d": string;
    "30d": string;
    all: string;
    custom: string;
    from: string;
    to: string;
    apply: string;
  };
  banner: {
    readingFrom: string;
    noData: string;
    sampleBadge: string;
  };
  cards: {
    totalSpend: string;
    totalTokens: string;
    inputOutput: string;
    cacheRead: string;
    estimated: string;
    partialCost: string;
    nonCache: string;
    sessions: (n: string) => string;
    written: (formatted: string) => string;
  };
  trend: {
    title: string;
    description: (period: string) => string;
    empty: string;
    yTokens: string;
    yCost: string;
  };
  topModels: {
    title: string;
    description: string;
    empty: string;
  };
  breakdown: {
    title: string;
    description: string;
    columns: {
      provider: string;
      model: string;
      sessions: string;
      input: string;
      output: string;
      cacheRW: string;
      reasoning: string;
      total: string;
      cost: string;
    };
    empty: string;
    editPrices: string;
    exportCsv: string;
  };
  recent: {
    title: string;
    description: string;
    empty: string;
    untitled: string;
  };
  session: {
    back: string;
    untitled: string;
    totalTokens: string;
    cost: string;
    started: string;
    duration: string;
    stillOpen: string;
    endedAt: (when: string) => string;
    breakdownTitle: string;
    breakdownDescription: string;
    fields: {
      input: string;
      output: string;
      reasoning: string;
      cacheRead: string;
      cacheWrite: string;
      apiCalls: string;
    };
    costStatus: {
      estimated: string;
      unpriced: string;
      unknown: string;
    };
  };
  prices: {
    back: string;
    title: string;
    description: string;
    badges: {
      override: string;
      defaults: string;
      missing: string;
    };
    saved: string;
    resetDone: string;
    rulesTitle: string;
    rulesDescription: string;
    columns: {
      match: string;
      input: string;
      output: string;
      cacheRead: string;
      cacheWrite: string;
      reasoning: string;
    };
    save: string;
    resetTitle: string;
    resetDescription: string;
    resetButton: string;
  };
};
