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

// Strings with {placeholders} get filled in via interp() at call site.
// JSON-friendly so contributors can edit translations without touching TS.
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
  theme: {
    label: string;
    light: string;
    dark: string;
    system: string;
  };
  period: {
    today: string;
    "24h": string;
    "7d": string;
    "30d": string;
    month: string;
    year: string;
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
    spendInPeriod: string; // "{period} spend" — interp w/ t.period[active]
    tokensInPeriod: string; // "{period} tokens"
    inputOutput: string;
    cacheRead: string;
    cacheHitRate: string;
    cacheHit: string;
    cacheMiss: string;
    cacheWritten: string;
    estimated: string;
    partialCost: string;
    nonCache: string;
    sessions: string; // "{n} sessions"
    written: string; // "{f} written"
  };
  trend: {
    titleDay: string;
    titleMonth: string;
    description: string; // "... — {period}"
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
  priceTooltip: {
    priceTable: string;
    thisRow: string;
    total: string;
    input: string;
    output: string;
    cacheRead: string;
    cacheWrite: string;
    reasoning: string;
    perM: string;
  };
  about: {
    title: string;
    subtitle: string;
    back: string;
    trackedTitle: string;
    trackedIntro: string;
    colSource: string;
    colWhere: string;
    colWhat: string;
    untrackedTitle: string;
    untrackedIntro: string;
    costTitle: string;
    costIntro: string;
    costNote: string;
    dedupTitle: string;
    dedupIntro: string;
    privacyTitle: string;
    privacyIntro: string;
  };
  session: {
    back: string;
    untitled: string;
    totalTokens: string;
    cost: string;
    started: string;
    duration: string;
    stillOpen: string;
    endedAt: string; // "ended {when}"
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
  // ---- v0.15: previously-hardcoded English in dashboard chrome ----
  navHeader: {
    users: string;
    signOut: string;
    about: string;
  };
  // ---- v0.17: left sidebar ----
  nav: {
    workspace: string;
    account: string;
    dashboard: string;
    tokens: string;
    prices: string;
    users: string;
    about: string;
  };
  agent: {
    statusLive: string;
    statusPaused: string;
    statusOffline: string;
    statusNotInstalled: string;
    onlineSuffix: string;
    seenAgo: string; // "seen {when}"
    lastSeenAgo: string; // "last seen {when}"
    lastSyncedLabel: string;
    never: string;
    heartbeatLabel: string;
    manualOnly: string;
    syncNow: string;
    syncing: string;
    pauseTracking: string;
    pausing: string;
    resumeTracking: string;
    resuming: string;
    resumeFirstHint: string;
  };
  install: {
    generateCommand: string;
    generating: string;
    failedToGenerate: string;
    serverError: string;
    networkError: string;
    clipboardError: string;
    copyCommand: string;
    copied: string;
    pasteHintBrew: string;
    pasteHintCurl: string;
    tabBrew: string;
    tabCurl: string;
  };
  onboarding: {
    welcome: string; // "Welcome, {name} — let's get your data flowing"
    description: string;
    step1Title: string;
    step2Title: string;
    step2Body: string;
    installTitle: string;
    installSubtitle: string;
    statusTitle: string;
    stages: {
      token: string;
      heartbeat: string;
      upload: string;
      data: string;
    };
    diagnoseInitial: string;
    diagnoseNoHeartbeat: string;
    diagnoseNoUpload: string;
    diagnoseEmptyUpload: string;
  };
  tokensPage: {
    title: string;
    description: string;
    tokenCreatedTitle: string;
    tokenCreatedDescription: string;
    tokenCreatedHint: string;
    settingsSavedToast: string;
    syncSettingsTitle: string;
    syncSettingsDescription: string;
    heartbeatInterval: string;
    save: string;
    saving: string;
    addMachineTitle: string;
    addMachineDescription: string;
    advancedToggle: string;
    name: string;
    createToken: string;
    creating: string;
    existingTokens: string;
    noTokens: string;
    columnName: string;
    columnCreated: string;
    columnLastUsed: string;
    revoke: string;
    revoking: string;
    intervalOptions: {
      m1: string;
      m5: string;
      m10: string;
      m30: string;
      h1: string;
      manual: string;
    };
  };
  usersPage: {
    title: string;
    description: string;
    inviteCreatedTitle: string;
    inviteCreatedDescription: string;
    generateInviteTitle: string;
    generateInviteDescription: string;
    note: string;
    notePlaceholder: string;
    createInvite: string;
    creating: string;
    invitesTitle: string;
    noInvites: string;
    columnNote: string;
    columnCreated: string;
    columnExpires: string;
    columnStatus: string;
    statusOpen: string;
    statusUsed: string;
    statusExpired: string;
    revoke: string;
    revoking: string;
    editNote: string;
    membersTitle: string;
    columnUsername: string;
    columnEmail: string;
    columnJoined: string;
    columnIp: string;
    columnLocation: string;
    ipPingTooltip: string;
    badgeAdmin: string;
    copyLink: string;
    copied: string;
    copyError: string;
  };
  authForms: {
    signIn: string;
    signingIn: string;
    createAdmin: string;
    creatingAdmin: string;
    join: string;
    joining: string;
    emailOrUsername: string;
    username: string;
    email: string;
    emailOptional: string;
    password: string;
    passwordWith8Min: string;
    usernameOptionalWithDefault: string;
    signupTitle: string;
    loginTitle: string;
    inviteTitle: string;
    inviteUsed: string;
    inviteExpired: string;
    inviteInvalid: string;
    forgotPasswordLink: string;
    inviteCodeLabel: string;
    inviteCodePlaceholder: string;
    inviteCodeSubmit: string;
    inviteCodeMissing: string;
    noAccount: string;
    signUpNow: string;
    policyHint: string;
  };
  forgotPassword: {
    title: string;
    subtitle: string;
    email: string;
    submitLookup: string;
    submittingLookup: string;
    notFlagged: string;
    resetTitle: string;
    resetSubtitle: string;
    newPassword: string;
    policyHint: string;
    submitReset: string;
    submittingReset: string;
    backToLogin: string;
  };
  adminReset: {
    button: string;
    confirm: string;
    pending: string;
    pendingLabel: string;
    columnReset: string;
  };
};
