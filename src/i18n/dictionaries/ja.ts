import type { Dictionary } from "../types";

const ja: Dictionary = {
  meta: {
    title: "tokenusage",
    description: "AI コーディングツール向けのローカルファースト・トークン使用量ダッシュボード",
  },
  header: {
    tagline: "AI ツール全体のトークン消費を一望 — 読み取り専用・ローカル完結。",
  },
  language: { label: "言語" },
  period: {
    today: "今日",
    "24h": "過去 24 時間",
    "7d": "過去 7 日",
    "30d": "過去 30 日",
    all: "すべて",
    custom: "カスタム",
    from: "開始",
    to: "終了",
    apply: "適用",
  },
  banner: {
    readingFrom: "データソース",
    noData: "データソースが見つかりません。",
    sampleBadge: "サンプルデータ",
  },
  cards: {
    totalSpend: "合計コスト",
    totalTokens: "合計トークン",
    inputOutput: "入力 / 出力",
    cacheRead: "キャッシュ読み取り",
    estimated: "推定",
    partialCost: "コストデータが不完全",
    nonCache: "非キャッシュ",
    sessions: (n) => `${n} セッション`,
    written: (f) => `${f} 書き込み`,
  },
  trend: {
    title: "日別推移",
    description: (p) => `ローカル日別 — ${p}（左軸 トークン、右軸 USD）`,
    empty: "選択された期間にデータがありません。",
    yTokens: "トークン",
    yCost: "コスト",
  },
  topModels: {
    title: "上位モデル",
    description: "合計トークン順",
    empty: "この期間に利用なし。",
  },
  breakdown: {
    title: "モデル別内訳",
    description:
      "合計トークン順。コストはゲートウェイの記録に基づく推定値で、請求書ではありません。",
    columns: {
      provider: "Provider",
      model: "モデル",
      sessions: "セッション",
      input: "入力",
      output: "出力",
      cacheRW: "キャッシュ R/W",
      reasoning: "推論",
      total: "合計",
      cost: "コスト",
    },
    empty: "この期間に利用なし。",
    editPrices: "価格を編集",
    exportCsv: "CSV エクスポート",
  },
  recent: {
    title: "最近のセッション",
    description: "この期間の最新 10 件 — クリックで詳細表示。",
    empty: "この期間にセッションなし。",
    untitled: "（無題のセッション）",
  },
  session: {
    back: "← ダッシュボードに戻る",
    untitled: "（無題のセッション）",
    totalTokens: "合計トークン",
    cost: "コスト",
    started: "開始",
    duration: "所要時間",
    stillOpen: "進行中",
    endedAt: (w) => `終了 ${w}`,
    breakdownTitle: "トークン内訳",
    breakdownDescription: "ソースアダプタがセッション終了時に記録。",
    fields: {
      input: "入力",
      output: "出力",
      reasoning: "推論",
      cacheRead: "キャッシュ読み取り",
      cacheWrite: "キャッシュ書き込み",
      apiCalls: "API 呼び出し数",
    },
    costStatus: {
      estimated: "推定",
      unpriced: "価格未定",
      unknown: "不明",
    },
  },
  prices: {
    back: "← ダッシュボードに戻る",
    title: "価格表",
    description:
      "モデル別のトークン価格を編集。単位は USD / 1M トークン。Match はモデル名に対する大文字小文字を区別しない正規表現。",
    badges: {
      override: "オーバーライド有効",
      defaults: "デフォルト",
      missing: "価格ファイルなし",
    },
    saved: "保存しました。次回ダッシュボード読み込み時にコスト推定が更新されます。",
    resetDone: "オーバーライドを削除し、同梱のデフォルトに戻しました。",
    rulesTitle: "ルール",
    rulesDescription:
      "ルールは順に評価され、最初に一致したものが採用されます。match を空欄にすると削除。末尾の空行は新規追加用。",
    columns: {
      match: "Match（正規表現）",
      input: "入力",
      output: "出力",
      cacheRead: "キャッシュ R",
      cacheWrite: "キャッシュ W",
      reasoning: "推論",
    },
    save: "オーバーライドを保存",
    resetTitle: "リセット",
    resetDescription:
      "data/prices.json を削除し data/prices.default.json に戻ります。",
    resetButton: "デフォルトに戻す",
  },
};

export default ja;
