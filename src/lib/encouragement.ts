// Encouragement line library — one line shown when the user is "in
// profit" on their subscription. Lines are bucketed by 10% bands past
// 100% so we can crank up the irreverence as they get further ahead.
//
// Picker is deterministic per (userId, day, band) so refresh doesn't
// shuffle the line.

const BANDS: Record<string, string[][]> = {
  zh: [
    [
      // 0: 100-109%
      "刚刚回本，剩下都是赚的 ✨",
      "踩线了！下一个 token 是免费的",
      "正好打平，老板还没亏",
      "今天的 token 钱够付订阅了",
      "回本警报响了 🚨 继续",
    ],
    [
      // 110-119%
      "回本 10%，老板眉头一皱",
      "已经在白嫖 10% 了",
      "你比 OpenAI 还会做生意",
      "Anthropic 的财报多了一行眼泪",
      "白菜价的 token，敞开吃",
    ],
    [
      // 120-129%
      "20% 净赚，下一杯咖啡你请",
      "老板今晚的茅台喝不上了",
      "AI 公司的 CFO 已经看见你了",
      "他们在涨价会议上提到了你",
      "20% 的智力税被你免了",
    ],
    [
      // 130-149%
      "30%+，订阅之神已 unlocked",
      "你已超越中位数用户 3 个标准差",
      "客服开始研究你的使用记录了",
      "你这种用户多了，他们要破产",
      "AI 自助餐被你端走了",
    ],
    [
      // 150-199%
      "50%+ 净赚 — 这桌都是赚的",
      "AI 时代的捡漏王",
      "你已经是套餐的精算师",
      "公司在评估限速你的方案",
      "他们后悔卖你这张卡了",
    ],
    [
      // 200%+
      "翻倍回本 — 老板已读不回",
      "他们打算调整套餐定价（因为你）",
      "你是这个产品的盈利反例",
      "建议低调用，别被风控了",
      "Pro 套餐被你吃成了 Free Tier",
    ],
  ],
  en: [
    [
      "Back to even — everything from here is profit ✨",
      "Break-even crossed. Next token's on the house.",
      "Plan's paid for. Keep going.",
      "Today's tokens just covered the subscription.",
    ],
    [
      "10% in the green. CFO frowns slightly.",
      "Free-tier mindset on a Pro plan.",
      "10% past your money's worth.",
    ],
    [
      "20% profit — coffee's on you.",
      "Their pricing team has a tab open with your name.",
      "20% smart-tax dodged.",
    ],
    [
      "30%+. Subscription god mode unlocked.",
      "Median user is 3 sigma behind you.",
      "Support reads your usage logs for fun.",
    ],
    [
      "50%+ — table's gone.",
      "An AI-era arbitrage king.",
      "You're the actuary of subscription value.",
    ],
    [
      "2× recovered. They're already redesigning the tier.",
      "Living counterexample to their margins.",
      "Pro became Free Tier in your hands.",
    ],
  ],
};

// Tiny string hash so the line picker is deterministic without pulling
// crypto into the client bundle. djb2.
function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

export function pickEncouragement(
  band: number,
  locale: string,
  userKey: string | number
): string | null {
  if (band < 0) return null;
  const langKey = locale.startsWith("zh") ? "zh" : "en";
  const bands = BANDS[langKey];
  const idx = Math.min(band, bands.length - 1);
  const pool = bands[idx];
  if (pool.length === 0) return null;
  // Day-of-year so the line is stable for the whole day, fresh tomorrow.
  const now = new Date();
  const doy = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86_400_000
  );
  const pick = djb2(`${userKey}:${doy}:${idx}`) % pool.length;
  return pool[pick];
}
