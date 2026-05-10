import type { Dictionary } from "../types";

const zhTW: Dictionary = {
  meta: {
    title: "tokenusage",
    description: "本地優先的 AI 程式工具 token 用量儀表板",
  },
  header: {
    tagline: "統計你接入的 AI 工具的 token 花費 — 唯讀、純本地。",
  },
  language: { label: "語言" },
  period: {
    today: "今天",
    "24h": "近 24 小時",
    "7d": "近 7 天",
    "30d": "近 30 天",
    all: "全部",
    custom: "自訂",
    from: "起",
    to: "迄",
    apply: "套用",
  },
  banner: {
    readingFrom: "資料來源",
    noData: "未找到資料來源。",
    sampleBadge: "範例資料",
  },
  cards: {
    totalSpend: "總花費",
    totalTokens: "總 tokens",
    inputOutput: "輸入 / 輸出",
    cacheRead: "快取讀取",
    estimated: "估算",
    partialCost: "成本資料不完整",
    nonCache: "非快取",
    sessions: (n) => `${n} 個工作階段`,
    written: (f) => `${f} 已寫入`,
  },
  trend: {
    title: "每日趨勢",
    description: (p) => `按本地日彙總 — ${p}（左軸 tokens，右軸 USD）`,
    empty: "所選期間無資料。",
    yTokens: "Tokens",
    yCost: "成本",
  },
  topModels: {
    title: "熱門模型",
    description: "依總 token 數排序",
    empty: "本期間無用量。",
  },
  breakdown: {
    title: "依模型拆分",
    description:
      "依總 token 數排序。成本為 gateway 記錄的估算值，並非實際帳單。",
    columns: {
      provider: "Provider",
      model: "模型",
      sessions: "工作階段",
      input: "輸入",
      output: "輸出",
      cacheRW: "快取 讀/寫",
      reasoning: "推理",
      total: "合計",
      cost: "成本",
    },
    empty: "本期間無用量。",
    editPrices: "編輯價格",
    exportCsv: "匯出 CSV",
  },
  recent: {
    title: "最近工作階段",
    description: "本期間最新 10 筆 — 點擊查看詳情。",
    empty: "本期間無工作階段。",
    untitled: "（無標題）",
  },
  session: {
    back: "← 返回儀表板",
    untitled: "（無標題）",
    totalTokens: "總 tokens",
    cost: "成本",
    started: "開始時間",
    duration: "時長",
    stillOpen: "尚未結束",
    endedAt: (w) => `結束於 ${w}`,
    breakdownTitle: "Token 拆分",
    breakdownDescription: "由資料來源 adapter 在工作階段結束時記錄。",
    fields: {
      input: "輸入",
      output: "輸出",
      reasoning: "推理",
      cacheRead: "快取讀取",
      cacheWrite: "快取寫入",
      apiCalls: "API 呼叫次數",
    },
    costStatus: {
      estimated: "估算",
      unpriced: "無定價",
      unknown: "未知",
    },
  },
  prices: {
    back: "← 返回儀表板",
    title: "價格表",
    description:
      "編輯每個模型的 token 價格。單位為每 1M tokens 美元；Match 是不分大小寫的正則。",
    badges: {
      override: "覆寫已啟用",
      defaults: "預設",
      missing: "無價格檔",
    },
    saved: "已儲存。下次刷新儀表板時成本估算會更新。",
    resetDone: "覆寫已刪除，已回到內建預設值。",
    rulesTitle: "規則",
    rulesDescription:
      "規則依序比對，第一條命中為準。將某列的 match 留空可刪除；末尾空列用於新增。",
    columns: {
      match: "Match（正則）",
      input: "輸入",
      output: "輸出",
      cacheRead: "快取讀",
      cacheWrite: "快取寫",
      reasoning: "推理",
    },
    save: "儲存覆寫",
    resetTitle: "重設",
    resetDescription:
      "刪除 data/prices.json，回到 data/prices.default.json。",
    resetButton: "重設為預設",
  },
};

export default zhTW;
