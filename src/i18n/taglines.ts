import "server-only";

// Per-locale corpora of header taglines. Server-side picks one at random
// on each render so a page refresh feels like a small surprise instead of
// reading the same line forever. Tone: PUA / interrogation-room comedy —
// the joke only lands when it's obviously deadpan, not literal.
//
// Keep entries short (one line on a 320px screen). Use the locale's own
// punctuation conventions: full-width 。? in CJK, ASCII . ? in latin.

const ZH_CN = [
  // ─ 举报 / AI 警察 ─
  "举报：今天又有人没认真用 AI",
  "你的 AI 使用率经举报已记录在案",
  "AI 警察突袭检查：你今天 token 花得不够",
  "收到群众举报：你又只输入了 200 字",
  "群众来信反映：你这周根本没用 AI",
  "警告：检测到 AI 使用率严重偏低",
  "上次同步显示：你在偷懒",
  "AI 督察组建议把你列入观察名单",
  "今日例行抽查：未达基准 token，请配合调查",
  // ─ 大厂 PUA ─
  "你这格局，AI 也带不动",
  "你这思路就有问题，AI 都救不了",
  "格局打开，token 烧起来",
  "我不是 PUA 你，是这 token 数据 PUA 你",
  "讲道理你说不过我，烧 token 你也烧不过我",
  "你这不是没能力，是没态度用 AI",
  "你这是在逃避 AI 的问题",
  "我看你最近 token 状态不对啊",
  "态度问题不是技术问题",
  "想想你的初心：你来打字，是为了划水的吗",
  // ─ 嘲讽水平 / 没文化 ─
  "你这 token 量，是没钱还是没文化？",
  "AI 都用不明白，怎么混的",
  "你的 prompt 写得跟小学作文似的",
  "Claude 用不会，GPT 也用不会，你到底会啥？",
  "都 2026 年了你还在百度，丢不丢人",
  "我看你这 prompt，初中生水平",
  "AI 都比你聪明，你混什么 IT",
  "你这水平，建议从'你好 ChatGPT'开始学起",
  "你这 token 烧得，跟你写的代码一样平庸",
  "你这 prompt 一看就没读过书",
  "你给 AI 的 prompt 跟点外卖备注一个字数",
  "AI 看你的 prompt 都嫌脑细胞浪费",
  // ─ 对比羞辱 ─
  "我同事一天烧 $300 在 AI 上，你呢？",
  "我同事娃都会用 Claude 了，你呢？",
  "全公司就你 AI 用得最少",
  "看你 token，再看看 ChatGPT 重度用户，不害臊吗？",
  "你的同事昨天烧光了月度配额，你呢",
  "实习生今天的 token 量都比你多",
  "隔壁产品经理都比你会 prompt",
  // ─ 工作压力 / 老板戏码 ─
  "这点 token 花费，对得起你的工资吗",
  "你这 token 数配不上你的工资",
  "不烧 token 是不是不想升职",
  "一天 $5 都用不掉，确定不裁吗",
  "老板看到你的 token 用量哭了",
  "今日 AI 工时未达标，请加班补足",
  "你这 token 量，建议回炉重造",
  "你这 token 数，我建议你换个行业",
  "今天 token 不达标，请你写一份反思报告",
  "老板今早看了 dashboard 没说话，但你工位的椅子换矮了",
  "你的 token 量，老板还以为你在做 OKR 之外的事",
  "老板把你 dashboard 截图打印贴公告栏，作反面教材",
  "老板报销 token 钱时眼眶湿了 — 因为太少",
  "老板说他想要 KPI，你给他这数字，比他工资还小",
  "你的 token 量都比你的 KPI 完成度好看",
  // ─ 玩梗 / 网络流行 ─
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
  // ─ 占便宜 vs 被薅 ─
  "今天的 token 是你薅的，还是被薅的？",
  "看清楚你给谁打工：你给 Anthropic，还是 Anthropic 给你",
  "OpenAI 不怕你卷，怕你不卷",
  "你的 token 是 AI 的早餐，套餐费是 AI 的房贷",
  "Anthropic 比你妈还盼着你充钱",
  "按这进度，OpenAI 财报里有你的脚印",
  "AI 厂商怕的不是你薅，是你不薅",
  "薅 AI 这种事情，要么往死里薅，要么别上桌",
  "你这速度，AI 厂商销售下个月可以离职",
  "你不是用户，是 ARPU 黑洞",
  // ─ 套餐回本嘲讽 ─
  "套餐费已交，token 没烧 — 你在为信仰付费",
  "$200 套餐你用出 $5 的味道",
  "套餐买了不用，跟健身卡办了不去一个道理",
  "Pro 月费交得比 Plus 还心安 — 因为你根本没用够",
  "按这量，Free Tier 都嫌你浪费配额",
  "套餐回本？你回的是月经费",
  "你交的不是订阅费，是赎金",
  // ─ 卷王 / 班味 / 摸鱼 ─
  "班味浓得很，token 量稀得很",
  "你这上桌就摸鱼的样子，跟会议里那个静音同事一模一样",
  "卷王在隔壁烧成一片红，你这是雪花屏",
  "今日卷度排名：倒数",
  "你这强度叫'反卷'都嫌侮辱反卷",
  "昨天卷王说了句话，你今天还在咀嚼",
  "建议换个赛道 — 这赛道你跑不动",
  "卷得动的早卷飞了，你还在工位发呆",
  // ─ 上岸 / 失业 / HR ─
  "按你这 token 量，HR 都不用做选择题了",
  "你这数字一传上来，OKR 系统自动给你画了个圈",
  "下次裁员名单上，你这数字会自己说话",
  "裁员季快到了，token 量提一提，保命要紧",
  "还在试用期？这 token 数能让面试官皱眉",
  "年终评级出来前，token 量先把你评了",
  // ─ 朋友圈 / 公开处刑 ─
  "截图发朋友圈，让大家看看什么叫低耗能",
  "这数据敢发群里？群主直接踢人",
  "朋友圈都是卷王，你这数字发了等于自爆",
  "你的卷度水平不适合公开 — 求求别分享",
  "小红书 KOL 都不会接你 — 太丧了",
  // ─ 长辈 / 婚恋 ─
  "七大姑八大姨问你工资，别拿 token 量出来佐证",
  "相亲简历写「重度 AI 用户」？先把 token 量补上",
  "你妈知道你一天就烧这点 token 吗",
  "过年回家，亲戚问 AI 工资，token 量说出来太丢人",
  "对象说你最近忙，你拿这 dashboard 当证据？散了吧",
  // ─ AI 时代生存焦虑 ─
  "2026 年了，token 量低于平均还在做工程师",
  "AI 时代的'文盲'就是 token 用不上去",
  "你这强度，AGI 都不带你玩",
  "再不卷，硅基生命 2027 年就轮到你了",
  "AI 时代分两种人 — 卷 token 的和被 token 卷的，你属于后者",
  // ─ 他急了 / 红温系列 ─
  "OpenAI 急了，你倒不急",
  "AI 厂商红温了 — 你不烧他们做空",
  "销售红温了 — 你这 ARPU 拖了后腿",
  "PM 红温了 — 设计了那么多功能你一个没用到",
  // ─ 量化 / 数字感 ─
  "你今天烧的 token，连一个段子的字数都不够",
  "你这 token 数除以套餐月费 = ROI 负数",
  "你今天的 token 数 < 你写的微信字数",
  "按 ChatGPT 重度用户均值算，你这量 1 小时就该出现",
  "按行业平均，你这 token 量大约是新员工的 5%",
  // ─ 鸡汤反讽 / 自我安慰失败 ─
  "你说'我不需要 AI'，OK，下次面试别提自己 AI 工程师",
  "你说'我效率高不用 AI'，效率高的 token 量都高",
  "你说'今天没灵感'，AI 也没必要给你灵感",
  "你说'明天补'，明天就是明天，你忘了",
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
