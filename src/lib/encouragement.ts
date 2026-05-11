// Encouragement / taunt library — two distinct corpuses driven by the
// dashboard's ROI panel.
//
//   1. For "today" / "24h" periods, the line is keyed off *absolute*
//      USD spend in $3 steps. The tone shifts as the user climbs:
//        $0-6   → roast (hard)
//        $6-50  → tease (medium)
//        $50+   → shade ("还可以，勉强算有半个脑子")
//
//   2. For longer periods (7d / 30d / month / year / custom), the line
//      is keyed off the ROI band (each 10% past 100%) and can mention
//      the vendor and dollar amount they've extracted.
//
// All picks are deterministic per (userKey, dayOfYear, bandIdx) so the
// line is stable for the whole day and doesn't shuffle on refresh.

import type { PlanLite } from "@/lib/roi-client";

// ─── tiny utilities ─────────────────────────────────────────────────────

function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

function dayOfYear(): number {
  const now = new Date();
  return Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86_400_000
  );
}

function interp(s: string, vars: Record<string, string>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

function fmtUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

// Primary vendor for a portfolio = the vendor of the most expensive plan.
// We could also majority-vote by count but a $200 plan deserves more
// gravity than five $10 plans.
function primaryVendor(plans: PlanLite[]): string {
  if (plans.length === 0) return "AI";
  return plans.reduce((max, p) => (p.monthlyUsd > max.monthlyUsd ? p : max), plans[0]).vendor;
}

function primaryPlan(plans: PlanLite[]): PlanLite | null {
  if (plans.length === 0) return null;
  return plans.reduce((max, p) => (p.monthlyUsd > max.monthlyUsd ? p : max), plans[0]);
}

// ─── ZH-CN daily corpus (today / 24h, indexed by floor(spend / 3)) ─────

// Each entry is one line for a $3-wide band starting at index×$3.
// 30 bands cover $0 → $90 with $3 granularity; past that we recycle
// the last few "shade" lines.
//
// Variables: {plan} {monthly} {spend} {remaining}
const DAILY_ZH: string[] = [
  // $0-3 — brutal
  "{plan} 一个月 ${monthly}，你今天才 ${spend}。是钱多到撑了？",
  // $3-6 — still roast
  "${spend} 的 token，配 ${monthly}/月的套餐？建议改买 Pro，省下的钱够买个键盘。",
  // $6-9 — light tease starts
  "好歹动了。再用 ${remaining} 才回今天的本。",
  // $9-12
  "你这速度，套餐设计师在会议上把你列为「正确决策的样本」。",
  // $12-15
  "嗯，开始进入合格用户区间。",
  // $15-18
  "终于像个用套餐的人了。",
  // $18-21
  "Anthropic 客服记下了你的 username，备注：「这个不亏」。",
  // $21-24
  "再加把劲，今天还能多薅几顿。",
  // $24-27
  "你今天的薅率已经超过 80% 的同档用户。",
  // $27-30
  "$30 在望，老板的咖啡苦了一下。",
  // $30-33
  "30 块菜被你吃出来了，剩下都是赚的。",
  // $33-36
  "再快点，赶在他们涨价前。",
  // $36-39
  "你这种用户多了，套餐部得整改 KPI。",
  // $39-42
  "薅羊毛标兵奖提名中。",
  // $42-45
  "$42 — 财务表上你这一行被标红了。",
  // $45-48
  "再加 ${remaining} 就破 $50，让他们见识真正的力量。",
  // $48-51 — crossing into shade territory
  "还可以，勉强算有半个脑子。",
  // $51-54
  "嗯，不算白送。",
  // $54-57
  "凑合，比那群只用 ChatGPT 网页的强。",
  // $57-60
  "终于像样了，给你 70 分。",
  // $60-63
  "差不多了，下个月续费时会想起这一刻。",
  // $63-66
  "你的 use case 在他们的「重型用户」slack 频道里被截屏了。",
  // $66-69
  "这一天的菜，按零售价能开个小馆子。",
  // $69-72
  "${vendor} 内部已经在讨论是不是要给你单独限速。",
  // $72-75
  "你已经从「正常用户」滑入「我们没料到」。",
  // $75-78
  "破 $75，你这一天的算力够训练一只玩具模型了。",
  // $78-81
  "客服开始往你账户上贴黄标。",
  // $81-84
  "这种用法下去，他们的财报得加一条「Top User 异常」。",
  // $84-87
  "继续薅，让 CEO 在 all-hands 上提到这一桌。",
  // $87-90
  "$90 — 你已经把套餐吃成了 negative margin。",
  // $90+
  "每多一块都是给老板的精神打击。低调点。",
];

const DAILY_EN: string[] = [
  "{plan} costs ${monthly}/mo. You burned ${spend} today. Are you OK?",
  "${spend} of tokens on a ${monthly}/mo plan? Downgrade. Buy a keyboard with the savings.",
  "Movement. ${remaining} more to break even today.",
  "Subscription designer breathes easier.",
  "Entering competent user territory.",
  "You look like someone who uses their plan now.",
  "{vendor} support marked your account: 'profitable'.",
  "Push harder — there's still buffet left.",
  "Out-grazing 80% of users at your tier today.",
  "$30 in sight. The CFO frowns slightly.",
  "Thirty bucks of menu price. Anything past this is profit.",
  "Quicker — before the price hike.",
  "{vendor} reconsiders its tier definitions.",
  "Bargain-hunter of the day, nominated.",
  "$42 — your row got highlighted in red in their dashboard.",
  "${remaining} more to crack ${big}.",
  "Acceptable. Half a brain confirmed.",
  "Not a waste of money.",
  "Better than the people who only use the ChatGPT web app.",
  "Looking decent. 70/100.",
  "About to make next-renewal you smile.",
  "Your use case is being screenshotted in their #heavy-users channel.",
  "Today's tokens could open a small restaurant at retail.",
  "{vendor} internal: 'do we need to throttle this one?'",
  "Officially in the 'we did not plan for this' bucket.",
  "Past $75 — your day's compute could train a toy model.",
  "Support stuck a yellow flag on you.",
  "Their next earnings call will mention 'top-user anomalies'.",
  "Keep going — get yourself mentioned at all-hands.",
  "Negative margin achieved.",
  "Every dollar past here is psychic damage. Stay low.",
];

// ─── ZH-CN ROI bands (longer periods, indexed by 10% steps past 100%) ──

const ROI_ZH: string[][] = [
  // 100-109%
  [
    "刚刚回本，剩下都是赚的 ✨",
    "踩线了！下一个 token 是免费的。",
    "正好打平，{vendor} 的 CFO 松了一口气。",
    "回本警报响了 🚨 继续薅。",
    "你已经免费用 {vendor} 一秒钟了。",
  ],
  // 110-119%
  [
    "薅到 {vendor} {net}，再加把劲。",
    "白嫖 10%，{vendor} 的销售眉头一皱。",
    "你比 {vendor} 还会做生意。",
    "{vendor} 的财报多了一行眼泪。",
    "白菜价的 token，敞开吃。",
  ],
  // 120-129%
  [
    "20% 净赚 — 已经从 {vendor} 拿走 {net}。下杯咖啡你请。",
    "{vendor} 今晚的茅台喝不上了。",
    "{vendor} 的 CFO 已经看见你了。",
    "他们在涨价会议上提到了你。",
    "20% 的智力税被你免了。",
  ],
  // 130-149%
  [
    "30%+，订阅之神已 unlocked。{net} 已入袋。",
    "你已超越中位数用户 3 个标准差。",
    "{vendor} 客服开始研究你的使用记录了。",
    "你这种用户多了，{vendor} 要破产。",
    "AI 自助餐被你端走了。",
  ],
  // 150-199%
  [
    "50%+ 净赚 {net} — 这桌都是赚的。",
    "AI 时代的捡漏王。",
    "你已经是 {vendor} 套餐的精算师。",
    "{vendor} 在评估限速你的方案。",
    "他们后悔卖你这张卡了。",
  ],
  // 200-299%
  [
    "翻倍回本，{vendor} 已读不回。",
    "他们打算调整套餐定价（因为你）。",
    "你是 {vendor} 这个产品的盈利反例。",
    "建议低调用，别被风控了。",
    "Pro 套餐被你吃成了 Free Tier。",
    "${net} 直接装进口袋，{vendor} 内部已经开始追责。",
  ],
  // 300-499%
  [
    "3 倍回本 — 把 {vendor} 薅秃了。",
    "再加把劲，把 {vendor} 薅到退市。",
    "建议申请 {vendor} 颁发的「年度负面案例」奖。",
    "他们的董事会今晚开急会，议题是「关于一个用户」。",
    "{vendor} 的市值蒸发了一个你。",
  ],
  // 500-999%
  [
    "5 倍回本，已经超越商业逻辑了。",
    "给 {vendor} 戴个 ST 帽子。",
    "你的薅率配得上一篇 HBR 案例研究。",
    "{vendor} 工程师开始读你的 prompt 找规律。",
    "建议改名「{vendor} 反诈中心」。",
  ],
  // 1000%+
  [
    "10× 回本。你比 {vendor} 创始团队还了解这个产品。",
    "{vendor} 的 CEO 把你的截图设成了屏保（警示用）。",
    "再这么搞下去，他们要发律师函了。",
    "建议联系 {vendor} 谈个企业版，他们求着你换。",
    "已突破套餐物理上限，进入元宇宙薅羊毛阶段。",
  ],
];

const ROI_EN: string[][] = [
  [
    "Back to even — everything from here is profit ✨",
    "Break-even crossed. Next token's on the house.",
    "Plan's paid for. Keep going.",
    "{vendor}'s CFO just relaxed slightly.",
  ],
  [
    "{net} extracted from {vendor}. More?",
    "10% past your money's worth. {vendor}'s sales VP scowls.",
    "10% in the green.",
    "{vendor} earnings just gained a footnote.",
  ],
  [
    "20% profit. {net} pulled from {vendor}. Coffee's on you.",
    "{vendor}'s pricing team has a tab open with your name.",
    "20% smart-tax dodged.",
    "Mentioned by name at the price-hike meeting.",
  ],
  [
    "30%+. Subscription god mode. {net} in pocket.",
    "Median user is 3 sigma behind you.",
    "{vendor} support reads your usage logs.",
  ],
  [
    "50%+ — {net} clear profit.",
    "AI-era arbitrage king.",
    "You're the actuary of {vendor}'s plan.",
  ],
  [
    "2×. {vendor} read receipts disabled.",
    "Their next pricing redesign? Because of you.",
    "Living counterexample to {vendor}'s margins.",
    "Pro became Free Tier in your hands.",
    "{net} pocketed. {vendor} starts an internal review.",
  ],
  [
    "3× recovered. {vendor} stripped to the studs.",
    "Keep pushing — delist {vendor}.",
    "Nominee for {vendor}'s 'annual cautionary case' award.",
    "Their board met tonight. Topic: one user.",
  ],
  [
    "5× recovered. Slap an ST flag on {vendor}.",
    "Your extraction ratio deserves an HBR case study.",
    "{vendor} engineers read your prompts for patterns.",
  ],
  [
    "10× recovered. You know the product better than the founders.",
    "{vendor}'s CEO set your screenshot as a warning wallpaper.",
    "Lawyers might call.",
    "Time for an enterprise contract — they'll beg.",
    "Past the buffet's physical limit. Welcome to metaverse arbitrage.",
  ],
];

// ─── public API ─────────────────────────────────────────────────────────

export type EncouragementMessage = {
  text: string;
  tone: "roast" | "tease" | "shade" | "celebration";
};

// Daily-period taunt (today / 24h). Bands every $3, with a tone shift
// at $6 (roast → tease) and $48 (tease → shade).
export function pickDailyTaunt(
  apiSpendUsd: number,
  plans: PlanLite[],
  locale: string,
  userKey: number | string
): EncouragementMessage | null {
  const langKey = locale.startsWith("zh") ? "zh" : "en";
  const lib = langKey === "zh" ? DAILY_ZH : DAILY_EN;
  if (lib.length === 0) return null;

  const bandIdx = Math.max(0, Math.min(Math.floor(apiSpendUsd / 3), lib.length - 1));
  const tmpl = lib[bandIdx];
  const plan = primaryPlan(plans);
  const monthly = plan?.monthlyUsd ?? 0;
  const dailyTarget = monthly / 30;
  const remaining = Math.max(0, dailyTarget - apiSpendUsd);

  const text = interp(tmpl, {
    plan: plan?.name ?? (langKey === "zh" ? "套餐" : "your plan"),
    vendor: plan?.vendor ?? "AI",
    monthly: fmtUsd(monthly),
    spend: fmtUsd(apiSpendUsd),
    remaining: fmtUsd(remaining),
    big: "$50",
  });

  const tone: EncouragementMessage["tone"] =
    bandIdx <= 1 ? "roast" : bandIdx < 16 ? "tease" : "shade";
  return { text, tone };
}

// Long-period ROI line (anything other than today / 24h). Only fires
// at ratio >= 100%; the band determines which tier of escalation we
// pull from.
export function pickRoiLine(
  milestoneBand: number, // 0 = 100-109%, 1 = 110-119%, ...
  netUsd: number,
  plans: PlanLite[],
  locale: string,
  userKey: number | string
): EncouragementMessage | null {
  if (milestoneBand < 0) return null;
  const langKey = locale.startsWith("zh") ? "zh" : "en";
  const bands = langKey === "zh" ? ROI_ZH : ROI_EN;
  // Map 10% steps onto the available bands. 0=100-109%, 1=110-119%, 2=120-129%,
  // 3-4 -> band 3 (130-149%), 5-9 -> band 4 (150-199%), 10-19 -> band 5
  // (200-299%), 20-39 -> band 6 (300-499%), 40-89 -> band 7 (500-999%),
  // 90+ -> band 8 (1000%+).
  let mapped: number;
  if (milestoneBand <= 2) mapped = milestoneBand;
  else if (milestoneBand <= 4) mapped = 3;
  else if (milestoneBand <= 9) mapped = 4;
  else if (milestoneBand <= 19) mapped = 5;
  else if (milestoneBand <= 39) mapped = 6;
  else if (milestoneBand <= 89) mapped = 7;
  else mapped = 8;
  mapped = Math.min(mapped, bands.length - 1);

  const pool = bands[mapped];
  if (!pool || pool.length === 0) return null;

  const pickIdx = djb2(`${userKey}:${dayOfYear()}:${mapped}`) % pool.length;
  const tmpl = pool[pickIdx];
  const text = interp(tmpl, {
    vendor: primaryVendor(plans),
    net: fmtUsd(Math.max(0, netUsd)),
  });

  const tone: EncouragementMessage["tone"] =
    mapped <= 1 ? "celebration" : mapped <= 4 ? "tease" : "shade";
  return { text, tone };
}

// Back-compat shim — old call sites used pickEncouragement(band, locale, userKey).
// Routes to pickRoiLine with empty plan list so the line still emits.
export function pickEncouragement(
  band: number,
  locale: string,
  userKey: string | number
): string | null {
  const msg = pickRoiLine(band, 0, [], locale, userKey);
  return msg?.text ?? null;
}
