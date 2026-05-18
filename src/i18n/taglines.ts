import "server-only";

// Per-locale corpora of header taglines. Server-side picks one at random
// on each render so a page refresh feels like a small surprise instead of
// reading the same line forever. Tone: PUA / interrogation-room comedy —
// the joke only lands when it's obviously deadpan, not literal.
//
// Keep entries short (one line on a 320px screen). Use the locale's own
// punctuation conventions: full-width 。? in CJK, ASCII . ? in latin.

const ZH_CN = [
  "举报：今天又有人没认真用 AI",
  "你的 AI 使用率经举报已记录在案",
  "昨天 token 花得不够，今天还划水？",
  "看你这 token 量，我不信你今天工作了",
  "AI 警察突袭检查：你今天 token 花得不够",
  "收到群众举报：你又只输入了 200 字",
  "警告：检测到 AI 使用率严重偏低",
  "上次同步显示：你在偷懒",
  "这点 token 花费，对得起你的工资吗",
  "全公司就你 AI 用得最少",
  "不烧 token 是不是不想升职",
  "你今天 token 花得不到平均线",
  "一天 $5 都用不掉，确定不裁吗",
  "老板看到你的 token 用量哭了",
  "今日 AI 工时未达标，请加班补足",
  "别人在用 AI 加班，你在用 AI 看猫",
  "AI 工具买了，钱没花，工没干，怎么办",
  "你的同事一天烧 $300 在 AI 上，你呢",
  "周五还不冲 token，你想干嘛？",
  "今日 token 配额已到岗，你呢？",
];

const ZH_TW = [
  "舉報：今天又有人沒認真用 AI",
  "你的 AI 使用率經舉報已記錄在案",
  "昨天 token 花得不夠，今天還在划水？",
  "看你這 token 量，我不信你今天工作了",
  "AI 警察突襲檢查：你今天 token 花得不夠",
  "收到群眾舉報：你又只輸入了 200 字",
  "警告：偵測到 AI 使用率嚴重偏低",
  "上次同步顯示：你在偷懶",
  "這點 token 花費，對得起你的薪水嗎",
  "全公司就你 AI 用得最少",
  "不燒 token 是不是不想升職",
  "你今天 token 花得不到平均線",
  "一天 $5 都用不掉，確定不裁嗎",
  "老闆看到你的 token 用量哭了",
  "今日 AI 工時未達標，請加班補足",
  "別人在用 AI 加班，你在用 AI 看貓",
];

const EN = [
  "Report: another colleague isn't using AI today.",
  "Your AI usage has been reported and logged.",
  "Yesterday's tokens were light. Slacking again?",
  "Looking at your token count, I don't believe you worked today.",
  "AI Police surprise inspection: today's tokens are insufficient.",
  "Citizen report received: you typed 200 characters all day.",
  "Warning: critically low AI utilization detected.",
  "Last sync says: you've been slacking.",
  "These token costs — is this worth your salary?",
  "You burn the fewest tokens in the entire company.",
  "Not torching tokens? Do you not want a promotion?",
  "Your tokens today are below average.",
  "Can't even spend $5/day. Sure you don't need cutting?",
  "Your boss saw your token usage and wept.",
  "Daily AI quota under target — please put in overtime.",
];

const JA = [
  "通報：今日も AI を本気で使わない人がいます",
  "あなたの AI 利用率は通報され記録されました",
  "昨日のトークンが少なすぎる、今日もサボり？",
  "このトークン量、今日仕事したとは信じられません",
  "AI 警察、抜き打ち検査：今日のトークンが不足です",
  "警告：AI 使用率が著しく低下しています",
  "前回の同期記録：サボってますね",
];

const KO = [
  "신고: 오늘도 AI를 진지하게 안 쓰는 사람이 있어요",
  "당신의 AI 사용률은 신고되어 기록에 남았습니다",
  "어제 토큰이 부족했는데 오늘도 농땡이?",
  "이 토큰량 보니 오늘 일했다고 안 믿겨요",
  "AI 경찰 불시 점검: 오늘 토큰이 부족합니다",
  "경고: AI 활용도가 심각하게 낮습니다",
];

const ES = [
  "Reporte: alguien no está usando AI en serio hoy.",
  "Tu uso de AI ha sido reportado y registrado.",
  "Los tokens de ayer fueron pocos. ¿Vagueando otra vez?",
  "Mirando tus tokens, no creo que trabajaste hoy.",
  "Policía de AI, inspección sorpresa: tokens insuficientes.",
];

const FR = [
  "Signalement : encore quelqu'un qui n'utilise pas l'IA sérieusement.",
  "Votre usage de l'IA a été signalé et enregistré.",
  "Tokens d'hier insuffisants. Tu glandes encore ?",
  "Au vu de tes tokens, je ne crois pas que tu aies travaillé.",
  "Police IA, inspection surprise : tokens insuffisants.",
];

const DE = [
  "Meldung: schon wieder jemand, der die KI nicht ernst nimmt.",
  "Ihre KI-Nutzung wurde gemeldet und protokolliert.",
  "Gestern zu wenig Tokens. Schon wieder gebummelt?",
  "Bei deinem Token-Stand glaube ich nicht, dass du gearbeitet hast.",
];

const IT = [
  "Segnalazione: oggi qualcuno non sta usando l'IA sul serio.",
  "Il tuo uso dell'IA è stato segnalato e registrato.",
  "Token di ieri scarsi. Stai sfangando ancora?",
  "Visti i tuoi token, non credo tu abbia lavorato oggi.",
];

const PT = [
  "Denúncia: alguém não está levando a IA a sério hoje.",
  "Seu uso da IA foi denunciado e registrado.",
  "Tokens de ontem fracos. Enrolando de novo?",
  "Vendo seus tokens, não acredito que você trabalhou hoje.",
];

const RU = [
  "Сообщение: кто-то снова не относится к ИИ серьёзно.",
  "Ваше использование ИИ зарегистрировано.",
  "Вчера токенов мало. Опять лень?",
  "Глядя на ваши токены, не верю, что вы работали сегодня.",
];

const CORPORA: Record<string, string[]> = {
  "en": EN,
  "en-US": EN,
  "zh-CN": ZH_CN,
  "zh-Hans": ZH_CN,
  "zh-TW": ZH_TW,
  "zh-Hant": ZH_TW,
  "ja": JA,
  "ja-JP": JA,
  "ko": KO,
  "ko-KR": KO,
  "es": ES,
  "fr": FR,
  "de": DE,
  "it": IT,
  "pt": PT,
  "ru": RU,
};

// Picks a random tagline for the given locale. Falls back to English
// when the locale has no corpus (or no entries — shouldn't happen, but
// be defensive: a missing tagline shouldn't 500 the page).
export function pickTagline(locale: string): string {
  const corpus = CORPORA[locale] ?? CORPORA[locale.split("-")[0]] ?? EN;
  if (corpus.length === 0) return EN[0];
  const idx = Math.floor(Math.random() * corpus.length);
  return corpus[idx];
}
