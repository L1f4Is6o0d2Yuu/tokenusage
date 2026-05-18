import "server-only";

// Per-locale corpora of header taglines. Server-side picks one at random
// on each render so a page refresh feels like a small surprise instead of
// reading the same line forever. Tone: PUA / interrogation-room comedy —
// the joke only lands when it's obviously deadpan, not literal.
//
// Keep entries short (one line on a 320px screen). Use the locale's own
// punctuation conventions: full-width 。? in CJK, ASCII . ? in latin.

const ZH_CN = [
  // "举报 / AI 警察" 题材
  "举报：今天又有人没认真用 AI",
  "你的 AI 使用率经举报已记录在案",
  "AI 警察突袭检查：你今天 token 花得不够",
  "收到群众举报：你又只输入了 200 字",
  "群众来信反映：你这周根本没用 AI",
  "警告：检测到 AI 使用率严重偏低",
  "上次同步显示：你在偷懒",
  // 大厂 PUA 题材
  "你这格局，AI 也带不动",
  "你这思路就有问题，AI 都救不了",
  "格局打开，token 烧起来",
  "我不是 PUA 你，是这 token 数据 PUA 你",
  "讲道理你说不过我，烧 token 你也烧不过我",
  "你这不是没能力，是没态度用 AI",
  "你这是在逃避 AI 的问题",
  "我看你最近 token 状态不对啊",
  "态度问题不是技术问题",
  // 嘲讽水平 / 没文化
  "你这 token 量，是没钱还是没文化？",
  "AI 都用不明白，怎么混的",
  "你的 prompt 写得跟小学作文似的",
  "Claude 用不会，GPT 也用不会，你到底会啥？",
  "都 2026 年了你还在百度，丢不丢人",
  "我看你这 prompt，初中生水平",
  "AI 都比你聪明，你混什么 IT",
  "你这水平，建议从'你好 ChatGPT'开始学起",
  "你这 token 烧得，跟你写的代码一样平庸",
  "AI 帮你都帮不动，可见你有多平庸",
  "你这 prompt 一看就没读过书",
  // 对比羞辱
  "我同事一天烧 $300 在 AI 上，你呢？",
  "我同事娃都会用 Claude 了，你呢？",
  "全公司就你 AI 用得最少",
  "看你 token，再看看 ChatGPT 重度用户，不害臊吗？",
  "你的同事昨天烧光了月度配额，你呢",
  // 工作压力题材
  "这点 token 花费，对得起你的工资吗",
  "你这 token 数配不上你的工资",
  "不烧 token 是不是不想升职",
  "一天 $5 都用不掉，确定不裁吗",
  "老板看到你的 token 用量哭了",
  "今日 AI 工时未达标，请加班补足",
  "你这 token 量，建议回炉重造",
  "你这 token 数，我建议你换个行业",
  "AI 时代你这水平就别出来丢人了",
  "今天 token 不达标，请你写一份反思报告",
  // 玩梗 / 网络流行
  "醒醒吧，2026 年了还有人不用 AI",
  "你不是在用 AI，你是在浪费 AI",
  "都用 AI 了你还慢得跟蜗牛似的",
  "你以为 AI 是摆设吗？",
  "你这是在用 AI 还是在被 AI 嫌弃？",
  "AI 都开源了，你这水平还没开窍",
  "都什么时代了还有人不烧 token，给爷整不会了",
  "你这 AI 用量，配不上 tokenusage 这个仪表盘",
  "建议你卸载这个 dashboard，省得我难受",
  "昨天 token 花得不够，今天还划水？",
  "看你这 token 量，我不信你今天工作了",
  "周五还不冲 token，你想干嘛？",
  "你说你忙？token 不会撒谎",
];

const ZH_TW = [
  "舉報：今天又有人沒認真用 AI",
  "你的 AI 使用率經舉報已記錄在案",
  "AI 警察突襲檢查：你今天 token 花得不夠",
  "收到群眾舉報：你又只輸入了 200 字",
  "警告：偵測到 AI 使用率嚴重偏低",
  "你這格局，AI 也帶不動",
  "你這思路就有問題，AI 都救不了",
  "我不是 PUA 你，是這 token 數據 PUA 你",
  "你這 token 量，是沒錢還是沒文化？",
  "AI 都用不明白，怎麼混的",
  "你的 prompt 寫得跟小學作文似的",
  "都 2026 年了你還在 Google 找答案，丟不丟人",
  "AI 都比你聰明，你混什麼 IT",
  "我同事一天燒 $300 在 AI 上，你呢？",
  "全公司就你 AI 用得最少",
  "這點 token 花費，對得起你的薪水嗎",
  "不燒 token 是不是不想升職",
  "一天 $5 都用不掉，確定不裁嗎",
  "老闆看到你的 token 用量哭了",
  "醒醒吧，2026 年了還有人不用 AI",
  "你不是在用 AI，你是在浪費 AI",
  "你以為 AI 是擺設嗎？",
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
