// Encouragement / taunt corpus. Lines per band; picker hashes
// (userKey, dayOfYear, period, bandIdx) into one of the band's lines
// so the user sees a stable line for the day in a given period, but a
// different one in a different period — "今日" and "近 7 天" never
// look the same even if they're both at break-even.
//
// Interpolation placeholders: {plan} {vendor} {monthly} {spend}
// {remaining} {net}.

// ─── Daily corpus — today / 24h period, indexed by floor(spend $) ────
//
// $1 granularity from $0 to $100, then coarser. Tone arc:
//   $0-2   nuclear roast (didn't even bother)
//   $2-6   hard roast (still on the wrong side of the math)
//   $6-15  light tease (using the plan, barely)
//   $15-50 mid tease (entering competent-user country)
//   $50-100 shade / 阴阳怪气 (now you're scaring the CFO)
//   $100+  warning territory (abuse-flag jokes)

export const DAILY_ZH: string[][] = [
  // $0–1 — 没开壶
  [
    "今天用了 {spend}？你点开的是观光门票吗？",
    "{plan} 静静地躺着，比图书馆藏书还安静。",
    "{vendor} 数你这种用户能盈利到 2050 年。",
    "钱够多，钱够多，钱够多。重要的事 {monthly} 一个月说三遍。",
    "这数字打印出来贴床头，每天看一眼提醒自己别再续费。",
    "{spend}？你这是在赛博佛系。",
    "今天打开的次数比用的次数多。",
    "{vendor} 销售把你当年度模范用户上报了。",
    "$0 也是 $ — 至少你没花钱。",
    "「公司没拦我」榜单倒序冠军。",
    "{plan} 表示「我饿了」。",
    "今日 ROI = 负无穷。",
  ],
  // $1–2
  [
    "{spend}？这是测试 API key 通不通吗？",
    "你确定不是手滑续费的？{monthly}/月 用出 free trial 的味道。",
    "{vendor} 的 PM 在 OKR 里把你单独列为「成功定价案例」。",
    "再这强度，月底退款客服都不会理你 — 你根本没用够阈值。",
    "{plan} 看着你的样子，像看一个不会用智能手机的人在按数字键盘。",
    "$1+ 起步价，{vendor} 已经笑出鹅叫。",
    "你这强度配得上「躺平大师」称号。",
    "$1 — AI 都没回过神你就关掉了。",
    "{plan} 哭了：「我月费 {monthly}，你今天给我 $1。」",
    "你点开 Claude 的频率不如点开外卖。",
    "$1 — 你和 free tier 用户的差距只剩一句订阅承诺。",
    "今天的 AI 比你勤奋。",
  ],
  // $2–3
  [
    "{spend} ≈ 一杯星巴克 ÷ 2，你这套餐月费够买 {monthly_coffees} 杯。",
    "建议改买 Pro，省下来的钱够买把键盘 + 鼠标。",
    "{vendor} 客服内部群：「这个用户，催充值还是劝退？」",
    "你正在以一种极其优雅的方式给 {vendor} 送钱。",
    "$3 都没到。你在 token 上比在拼多多上还节俭。",
    "$2+ — {plan} 看着你想哭。",
    "$3 不到，你这强度配不上「合理使用」四个字。",
    "再这速度，{vendor} 财务会把你画成「年度奇葩」。",
    "你今天的薅毛量 = 班味量 × 0.01。",
    "$2 — 「上桌就摸鱼」榜单常驻嘉宾。",
    "今天你和 AI 谁更摸鱼？",
    "$2 — 「妙妙工具」用成了摆设。",
  ],
  // $3–4
  [
    "好歹突破 $3 了。再加把劲，今天还能多请 {vendor} 喝半杯水。",
    "{spend} 的 token，对应 {monthly} 的订阅 = 老板的脸上多了一道笑纹。",
    "你这数字适合放进「订阅经济学」教科书。",
    "{vendor} 的销售把你截图发给 CEO：「这就是我们的 ICP。」",
  ],
  // $4–5
  [
    "$4 — 离今天 break-even 还有十万八千里。",
    "再快点，你这速度 {plan} 续费时会被催眠。",
    "客服内部备注更新：「轻度试探用户，无威胁。」",
    "你这速度，AI 都已经在等你打字了。",
  ],
  // $5–6
  [
    "$5！恭喜，你今天的用量值一杯咖啡。",
    "终于有个数字看着像样了。但 {plan} 的月费够买 {monthly_coffees} 杯。",
    "{vendor} 财报会议有了你这一行：「low engagement, profitable」。",
    "建议截图发朋友圈：「今天用 AI 花了 $5」 — 朋友会怀疑你失业。",
  ],
  // $6–7
  [
    "$6 — 套餐设计师在团建上为你举杯。",
    "进步神速，照这速度月底能用完 1/30 的套餐价值。",
    "{vendor} 的 CFO 收到这数据，长出一口气。",
    "客服在你账户上贴了张「正确决策样本」贴纸。",
  ],
  // $7–8
  [
    "$7 — Ramen 一碗的钱，但你买的是 {monthly} 月度服务。",
    "你这种用法，{vendor} 准备给你颁发「年度模范用户」奖。",
    "再这速度，你怀疑自己是不是该退订。但 {vendor} 求着你别。",
    "套餐部 KPI 完成度全靠你这种用户。",
  ],
  // $8–9
  [
    "$8 — 进入「能糊弄过 today」状态。",
    "再加一点点就达到 free tier 的水平了。",
    "{plan} 看着你，眼神像哲学家盯着自己的影子。",
    "你这数字在 {vendor} 的 dashboard 上属于「绿色健康区」 — 对老板而言。",
  ],
  // $9–10
  [
    "$9 — 努力还是欠了点意思。",
    "{vendor} 月报会上说：「这位用户撑起了我们的利润率」。",
    "{plan} 月费 {monthly}，你这一天用了 ${spend}。算术题：你赚了还是亏了？",
    "再 $1 就到两位数了，到时候才有脸提「我在用 AI」。",
  ],
  // $10–11
  [
    "两位数！终于像个正常人了。",
    "$10 — 你的存在不再是 {vendor} 的纯利润。",
    "客服把「轻度」改成「正在用」。",
    "再加把劲，今天还能多薅 {remaining}。",
  ],
  // $11–12
  [
    "$11 — 进入「中位数用户底端」。",
    "你这速度，下个月续费会更心安理得。",
    "{vendor} 的 PM 在团建上少敬你一杯。",
    "AI 终于感受到了一点点工作压力。",
  ],
  // $12–13
  [
    "$12 — 已超过 60% 的同档用户。",
    "再这速度，你能给 {vendor} 的财报带来一丝丝抖动。",
    "客服记下：「使用频率上升，无需催活」。",
    "{plan} 终于像被人在使用，而不是在收尸。",
  ],
  // $13–14
  [
    "$13 — 不算白送，但也别得意。",
    "你这一天的 token 够 GPT 推理一道高考数学。",
    "{vendor} 的 dashboard 上你这行从灰色变成了绿色。",
    "再加几块，今天能进「认真用户」榜单。",
  ],
  // $14–15
  [
    "$14 — 离今天 break-even 还差 {remaining}。",
    "你的薅率已经在「合格」边缘。",
    "{vendor} 客服开始把你从「需关怀」名单移到「保持现状」。",
    "再快点，下班前能拿到「今日及格」徽章。",
  ],
  // $15–16
  [
    "$15 — 进入「合格用户」区间，掌声寥落。",
    "终于像在用套餐了，{vendor} 的 PM 收回了那杯酒。",
    "你的 ROI 进度条爬过了三分之一。",
    "客服记录：「frequency normal, not a write-off」。",
  ],
  // $16–17
  [
    "$16 — 套餐部 KPI 受到一丝冲击。",
    "你的存在开始对 {vendor} 的毛利率有微弱影响。",
    "再加加，{plan} 的设计师在开会时少笑一秒。",
  ],
  // $17–18
  [
    "$17 — 你已超越 70% 的同档用户。但 70% 也没多牛。",
    "{vendor} 的 SLA 工程师挑了下眉。",
    "再这速度，今天还能多薅一顿便饭。",
  ],
  // $18–19
  [
    "$18 — 即将进入两位数尾段。",
    "套餐设计师在会议上说：「这种用户多了我们要重新建模」。",
    "你的存在让 AI 多消耗了一度电。",
  ],
  // $19–20
  [
    "$19 — $20 在望。{vendor} 的 dashboard 上你成了「需要观察」对象。",
    "再 $1 你就值得在 LinkedIn 上发动态：「我今天用了 $20 的 token」。",
    "客服把你从「保持现状」移到「重点用户」。",
  ],
  // $20–21
  [
    "$20 — 你这一天值得一杯不加糖的精品咖啡。",
    "进入正常用户区间。{vendor} 的 PM 收回了之前的笑容。",
    "你的 username 出现在 {vendor} 的内部 slack。",
    "再加几块，你能进周报的「有效用户」截图。",
    "$20 — 终于像在「正经用 AI」。",
    "{vendor} 销售把你的名字从「不活跃」列表移走了。",
    "$20 — 进入「我用 AI 工作」可宣布阶段。",
    "再快点，{vendor} 产品总监今晚要做你的 case study。",
    "你这强度配得上发个朋友圈：「最近 AI 是真的好用」。",
  ],
  // $21–22
  [
    "$21 — 突破 $20 后老板的咖啡苦了一口。",
    "你这数字在 {vendor} 的 RPS 监控上画出了一个尖峰。",
    "套餐设计师把你拉进了「需要复盘」的 list。",
  ],
  // $22–23
  [
    "$22 — 已经能让 {vendor} 财务皱眉。",
    "继续，AI 已经在加班伺候你了。",
    "再 ${remaining} 你今天就是回本的人。",
  ],
  // $23–24
  [
    "$23 — 进入「值回票价」边缘。",
    "{vendor} 的 SRE 监控里你这个 user_id 出现频率上升。",
    "客服开始研究你的 prompt 找最佳实践。",
  ],
  // $24–25
  [
    "$24 — 再 $1 就破 25%。{plan} 用满了你今天的 daily 分摊。",
    "{vendor} 的产品经理在团建上开始酸你。",
    "你的 LTV 终于不是负数了。",
  ],
  // $25–26
  [
    "$25 — 突破 {plan} 月度的 12.5%。",
    "{vendor} 客服内部群：「这个号已经从猎物变成对手」。",
    "进入「明明白白回了点本」状态。",
  ],
  // $26–27
  [
    "$26 — 你的存在让 {vendor} 的 PV-Lite 计算出现误差。",
    "套餐部连夜召开会议讨论你的 use case。",
    "AI 的 GPU 队列里你的请求开始排前。",
  ],
  // $27–28
  [
    "$27 — 你已超越 85% 的同档用户。",
    "客服记录：「heavy engagement, consider feature spotlight」。",
    "{vendor} 财报会议草稿里多了一句「Top user concentration」。",
  ],
  // $28–29
  [
    "$28 — 再 ${remaining} 就到 $30，{vendor} 的 dashboard 染色。",
    "你这速度，下个月续费时会自我感动。",
    "客服悄悄把你拖入「关键账户」名单。",
  ],
  // $29–30
  [
    "$29 — 突破 $30 倒计时。",
    "{vendor} 的 dashboard 上你从绿变黄了。",
    "再加 $1 你能写自传：《我曾一天用过 $30 的 token》。",
  ],
  // $30–31
  [
    "$30 — 30 块菜被你吃出来了，剩下都是赚的。",
    "{vendor} 的 CFO 把咖啡放下了。",
    "套餐设计师的咖啡苦得发酸。",
    "你这数字开始让财务部的 BI 工程师写新查询。",
  ],
  // $31–32
  [
    "$31 — 财务表上你这一行从行间距变成了行间深红。",
    "{vendor} 销售把你截图发给老板：「ICP 失控样本」。",
    "再加把劲，让 {vendor} 重新设计套餐。",
  ],
  // $32–33
  [
    "$32 — 你的薅率进入「需要监控」区。",
    "客服在你账户上贴了张：「abuse?」的便签。",
    "{vendor} 的产品总监在思考要不要把你的 use case 写进 case study。",
  ],
  // $33–34
  [
    "$33 — 突破 35% 的套餐月费。",
    "再这速度，他们 Q4 会议要专门 review 你。",
    "AI 的 retry 队列出现你的尾部延迟。",
  ],
  // $34–35
  [
    "$34 — 你的 use case 被写进 retro。",
    "{vendor} 客服开始研究你的 prompt 找泄露。",
    "套餐部认真考虑要给你专属限速。",
  ],
  // $35–36
  [
    "$35 — 接近套餐摊销中位数。",
    "{vendor} 的销售把你列为「不该签的客户」典型。",
    "继续薅，让他们重新设计套餐。",
  ],
  // $36–37
  [
    "$36 — 已经像在用 enterprise 版了。",
    "AI 工程师从你的 prompt 里学到了新东西。",
    "{vendor} 的 dashboard 上你这一格闪红。",
  ],
  // $37–38
  [
    "$37 — 你这一天的算力够训练一只 toy model。",
    "{vendor} 财务把你的 user_id 钉在了周会的 PPT 上。",
    "客服在内部群：「需不需要通知 sales 来拉个会议？」",
  ],
  // $38–39
  [
    "$38 — 你的存在开始让 {plan} 的财务模型失效。",
    "进入「他们后悔卖你这张卡」阶段。",
    "套餐部讨论是否要在续费时给你「特别优待」（涨价）。",
  ],
  // $39–40
  [
    "$39 — 接近 $40，{vendor} 的盈利模型轻微抖动。",
    "再 ${remaining} 你就能在论坛炫耀「日 $40」。",
    "AI 的预测系统给你打了「不可预测重型用户」标签。",
  ],
  // $40–41
  [
    "$40 — 套餐部的产品经理今晚的茅台没了。",
    "{vendor} 的 dashboard 你这格从黄变红。",
    "客服把你拖入「VIP 警戒」。",
  ],
  // $41–42
  [
    "$41 — 你这一行被标红了。",
    "财务把你的 cost-of-service 画进了月报附录。",
    "{vendor} 的 abuse 团队收到 ping。",
  ],
  // $42–43
  [
    "$42 — 你的薅率属于「危险」。",
    "套餐 PM 在 slack 里 @了 sales：「这个客户该升级」。",
    "{vendor} 在董事会附录里加了「Heavy user concentration」一行。",
  ],
  // $43–44
  [
    "$43 — 财报会议草稿里你的 spend 单独成段。",
    "客服开始整理你的 ticket 历史防止后续合规。",
    "AI 的请求队列出现「这位用户能不能慢一点」内部投票。",
  ],
  // $44–45
  [
    "$44 — 套餐月费的 22%。",
    "他们后悔卖你这张卡了。",
    "{vendor} 的 SRE 给你的请求加了一条单独的 rate-limit。",
  ],
  // $45–46
  [
    "$45 — 进入「他们正在重新评估定价」阶段。",
    "{vendor} 的产品总监在内部会议讨论「单点 abuse」。",
    "再这速度，下次续费你会发现套餐里多了「公平使用条款」。",
  ],
  // $46–47
  [
    "$46 — 你已经超越 95% 的同档用户。",
    "AI 工程师把你的 prompt 当成压力测试。",
    "客服在你的 username 旁边画了个皇冠（讽刺意义）。",
  ],
  // $47–48
  [
    "$47 — 即将破 $50，{vendor} 的 PM 头皮发紧。",
    "再 ${remaining} 你就配得上「VIP 风控对象」称号。",
  ],
  // $48–49
  [
    "$48 — 进入预警区。",
    "{vendor} 财务把你的 user_id 设为 dashboard 收藏。",
  ],
  // $49–50
  [
    "$49 — 还差 $1 你就破 $50，今晚的财报附录会专门提到这个数。",
  ],
  // $50–55 — shade tier
  [
    "$50 — 嗯，勉强算有半个脑子。",
    "{vendor} 的 PM 把你截图发到了内部群：「这就是为什么我们要重新设计」。",
    "破 $50 的用户在他们 dashboard 上有专门一栏。",
    "他们的产品 retro 上有你的一席。",
    "你今天给 AI 算力中心贡献了一度电。",
    "$50 — 「拿捏」二字写到了 {vendor} 销售部的墙上。",
    "$50 — 「显眼包」级别用户上线。",
    "破 $50 — 「真的会谢」是 {vendor} 财务今天的循环金句。",
    "$50 — 班味散了，{vendor} 销售在自闭。",
    "你今天的薅毛量 = 同事一周的 KPI。",
  ],
  // $55–60
  [
    "$55 — 嗯，不算白送。",
    "{vendor} 客服开始按你的 use case 整理「重型用户最佳实践」。",
    "再加把劲，他们的 SLA 团队就要约你聊一聊了。",
    "你已经成为「为什么定价要复杂化」的范例。",
  ],
  // $60–65
  [
    "$60 — 凑合，比那群只用 ChatGPT 网页的强。",
    "{vendor} 的 dashboard 你这格闪红得有点刺眼。",
    "再这速度，下个月套餐就要分层了。",
    "你今天的算力配得上一份顾问合同。",
  ],
  // $65–70
  [
    "$65 — 你已经能让 AI 厂商开会讨论定价了。",
    "套餐部连夜召开「特殊用户应对策略」。",
    "继续，他们要给你单独发律师函了。",
  ],
  // $70–75
  [
    "$70 — 你已经从「正常用户」滑入「我们没料到」。",
    "{vendor} 的 abuse team 开了个新 ticket：「合理使用还是滥用？」",
    "你的 use case 被截图发给了 CEO。",
  ],
  // $75–80
  [
    "$75 — 你这一天的算力够训练一只玩具模型。",
    "客服开始往你账户上贴黄标。",
    "{vendor} 财务把你写进了月报「异常用户」附录。",
    "再加 ${remaining} 就破 $100，到时候新闻头条都给你留位置。",
  ],
  // $80–85
  [
    "$80 — 这种用法下去，他们的财报得加一条「Top User 异常」。",
    "{vendor} 的销售在反思「为什么不签 enterprise」。",
    "你的 prompt 被拿去做内部培训教材。",
  ],
  // $85–90
  [
    "$85 — 继续薅，让 CEO 在 all-hands 上提到这一桌。",
    "{vendor} 的 abuse 团队连夜开会。",
    "你已经成了「为什么不能 unlimited」的活案例。",
  ],
  // $90–95
  [
    "$90 — 你已经把套餐吃成了 negative margin。",
    "{vendor} 的董事会附录里你的 user_id 出现了两次。",
    "套餐部今晚加班为你写公告。",
  ],
  // $95–100
  [
    "$95 — 突破 $100 倒计时。{vendor} 的产品总监在会议上点了你的名。",
    "客服在准备「我们注意到您的使用模式」邮件草稿。",
    "再 ${remaining} 你就上头版了。",
  ],
  // $100+
  [
    "$100+ — 你已经超越套餐的物理上限。",
    "建议低调用，别被风控盯上。",
    "Pro 套餐被你吃成了 Free Tier。",
    "{vendor} 的 abuse 团队连夜评估你的账号。",
    "每多一块都是给老板的精神打击。",
    "你的 username 被钉在 {vendor} 的「不要给他升级」名单。",
    "AI 时代的薅羊毛之神。",
    "$100+ — 「黑化封神」级别用户。",
    "$100+ — {vendor} 的 CEO 个人 follow 你的 user_id。",
    "$100+ — 「真的会谢」就是 {vendor} 销售今晚的循环金句。",
    "$100+ — 「赛博菩萨」反向版终极形态。",
    "$100+ — 「卷王封神」级别 — 同行集体破防。",
    "$100+ — 你已经超越「合法抢劫」境界，进入「他们求你别走」。",
    "$100+ — 建议把今天的截图裱起来挂客厅，标题「我曾让 {vendor} 开会三次」。",
  ],
];

export const DAILY_EN: string[][] = [
  // mirror; less dense, more concise
  ["{spend}? You opened the tab and forgot.", "{plan} sits unused, lonelier than a library book."],
  ["{spend}? Are you testing if the API key works?", "{vendor}'s PM lists you as 'profitable pricing case'."],
  ["{spend} ≈ half a coffee. {monthly}/mo of subscription, though.", "Downgrade to Pro and use the savings on a keyboard."],
  ["At least past $3. Long way to go.", "{spend} on a {monthly}/mo plan = the CFO smiles a little wider."],
  ["$4 — break-even is a distant rumor.", "Customer service note: 'low-touch, profitable'."],
  ["$5! Worth a coffee.", "Plan covers {monthly_coffees} coffees a month."],
  ["$6 — designer raises a glass to you.", "{vendor}'s CFO breathes easier."],
  ["$7 — ramen money, {monthly} subscription. Math?", "Model user nominee."],
  ["$8 — barely scraping competent.", "Your spend lives in the 'healthy green zone' (for them)."],
  ["$9 — one more dollar to two digits.", "Earnings report: 'this user is our margin'."],
  ["Two digits! Almost human.", "$10 — no longer pure profit."],
  ["$11 — bottom of median user range.", "AI feels actual work pressure."],
  ["$12 — past 60% of peers.", "Their PM frowns marginally."],
  ["$13 — not a write-off.", "GPT solved a math problem with your tokens."],
  ["$14 — {remaining} more to break even.", "Your usage moved from gray to green."],
  ["$15 — competent-user club, applauds politely.", "Plan looks used now."],
  ["$16 — KPI takes a small hit.", "Designer skips the celebratory drink."],
  ["$17 — past 70% of peers. Not impressive.", "SRE raises an eyebrow."],
  ["$18 — entering 'we have to remodel' territory.", "AI runs hotter."],
  ["$19 — $20 in sight.", "Worth a LinkedIn post: 'I used $20 of tokens today'."],
  ["$20 — third-wave coffee money.", "PM withdraws the celebratory toast."],
  ["$21 — past $20 and the boss's coffee tastes wrong.", "Spike on their RPS dashboard."],
  ["$22 — finance frowns.", "AI works overtime."],
  ["$23 — 'getting value' tier.", "Support studies your prompts."],
  ["$24 — one dollar shy of 25%.", "Designer turns slightly sour."],
  ["$25 — 12.5% of monthly. {vendor} support: 'prey turned hunter'.", "Definitely 'recouped something'."],
  ["$26 — their PV-Lite model has new error bars.", "AI's GPU queue prioritizes you slightly."],
  ["$27 — past 85% of peers.", "Earnings: 'top-user concentration risk'."],
  ["$28 — {remaining} to $30.", "Quietly added to 'key accounts'."],
  ["$29 — countdown to thirty.", "Memoir candidate."],
  ["$30 — thirty bucks of menu price, rest is profit.", "Their CFO sets the coffee down."],
  ["$31 — finance line goes red.", "Sales screenshots you to the CEO."],
  ["$32 — 'abuse?' sticky note appears.", "Director thinks about a case study."],
  ["$33 — past 35% of monthly.", "Q4 review will mention you."],
  ["$34 — retro entry.", "Service drafts rate-limit policy."],
  ["$35 — median-ish.", "Sales puts you on 'didn't quote enough' list."],
  ["$36 — enterprise behavior on hobbyist plan.", "Engineers learn from your prompts."],
  ["$37 — your tokens could train a toy model.", "Finance pins your user_id."],
  ["$38 — pricing model goes wobbly.", "'They regret selling you this seat'."],
  ["$39 — ${remaining} to $40.", "Predictor labels you 'unpredictable heavy'."],
  ["$40 — designer's whisky doesn't make it.", "Dashboard cell turns red."],
  ["$41 — finance highlights you.", "Cost-of-service chart appendix."],
  ["$42 — danger band.", "PM @sales: 'this one needs to go enterprise'."],
  ["$43 — paragraph in earnings draft.", "Support archives your ticket history."],
  ["$44 — 22% of monthly.", "They regret selling you this seat."],
  ["$45 — pricing under review.", "Next renewal page may grow a fair-use clause."],
  ["$46 — past 95% of peers.", "Crown emoji (sarcastic) next to your name."],
  ["$47 — $50 incoming.", "{remaining} to the VIP risk list."],
  ["$48 — alert zone.", "Finance bookmarks your user_id."],
  ["$49 — one dollar from $50.", "Earnings appendix calls this out."],
  ["$50 — half a brain, confirmed.", "Internal: 'this is why we redesign pricing'.", "Their PMs have your screenshot."],
  ["$55 — not a waste of money.", "Heavy-user playbook started from your prompts."],
  ["$60 — better than the ChatGPT-web crowd.", "Dashboard cell glows red."],
  ["$65 — meetings happen because of you.", "Special-user response team convenes."],
  ["$70 — from 'normal' to 'we did not plan'.", "Abuse team opens a ticket: 'is this OK?'"],
  ["$75 — toy model worth of compute.", "Yellow flag on your account.", "{remaining} to $100. Headlines incoming."],
  ["$80 — earnings appendix grows.", "Sales kicks themselves about enterprise."],
  ["$85 — CEO might name-check you at all-hands.", "Abuse team's emergency meeting."],
  ["$90 — negative margin achieved.", "Board appendix lists your user_id twice."],
  ["$95 — countdown to $100.", "PM keeps drafting 'we noticed your usage' email."],
  ["$100+ — past the buffet's physical limit.", "Stay low. Risk control is watching.", "Your name is on the 'do not promote' list."],
];

// ─── ROI corpus — longer periods, finer 5% bands past break-even ──────
//
// Band layout (mapped from `Math.floor((ratioPct-100) / 5)` ≥ 0):
//   0   = 100-105%
//   1   = 105-110%
//   2   = 110-115%
//   3   = 115-120%
//   4   = 120-125%
//   5   = 125-130%
//   6   = 130-140%
//   7   = 140-150%
//   8   = 150-175%
//   9   = 175-200%
//   10  = 200-250%
//   11  = 250-300%
//   12  = 300-400%
//   13  = 400-500%
//   14  = 500-750%
//   15  = 750-1000%
//   16  = 1000-2000%
//   17  = 2000-5000%
//   18  = 5000-10000%
//   19  = 10000%+

// 12+ lines per band, multi-persona (CFO / 销售 / 工程师 / 客服 / 财报会议 /
// 程序员同事 / 投资人) + 中文互联网热梗（红温、破防、内卷、躺平、班味、
// 上岸下岗、显眼包、yyds、绝绝子、拿捏、city 不 city、ST、跌停 …）。
export const ROI_ZH: string[][] = [
  // 100-105% — 踩线
  [
    "刚刚回本，剩下都是赚的 ✨",
    "踩线了！下一个 token 是免费的。",
    "{vendor} 的 CFO 松了一口气。",
    "回本警报响了 🚨 继续薅。",
    "你已经免费用 {vendor} 一秒钟了。",
    "今天的 token 钱够付订阅了。",
    "刚 break-even，{vendor} 的 PM 没破防。",
    "公平线踩到了，下面看你怎么继续表演。",
    "你这一刻在「中位数用户」榜单上 ranked。",
    "AI 自助餐的回本菜端上桌了。",
    "{vendor} 的财务还没注意到你 — 抓紧。",
    "刚回本，别急着发朋友圈。",
    "你今天扛起了「合理使用」四个字。",
    "踩线党永远的神，YYDS。",
    "下一秒开始，{vendor} 在替你打工。",
    "拿捏住了「公平使用」的边界感。",
    "你这种用户多了 {vendor} 没事，少了 {vendor} 才有事。",
    "踩到边缘的你，让 {vendor} 的 dashboard 抖了一下。",
  ],
  // 105-110% — 微赢
  [
    "进入「净赚」状态，{net} 入袋。",
    "{vendor} 的销售在 OKR 里写：「需要重新定价」。",
    "白嫖了 5%，老板眉头一皱。",
    "你的 LTV 终于变成负数（对他们而言）。",
    "再这速度，下次续费看着会更心安。",
    "5% 阳光普照，{vendor} 财报多了一个脚注。",
    "破 100% 之后的舒服 5 个百分点 — 像饭后甜点。",
    "{vendor} 的销售群里飘出一句「为什么我们没卖企业版」。",
    "微赢党今天获奖了。",
    "你这速度，明天 brand 的人就要找你聊一聊了。",
    "客服把你从「正常」改成「正常++」。",
    "5% — 不多，但够气一下产品总监。",
    "你已经从「免费试用心态」毕业了，进入「精打细算白嫖派」。",
    "5% 阳光普照，{vendor} 决定今晚加一个 dashboard alert。",
    "「妙妙工具」用出妙处了 — {vendor} 没料到。",
    "你的 5% 净赚等于 {vendor} 三个销售一周的提成。",
    "破防程度 1/10：{vendor} PM 还能保持微笑。",
    "5% 微赢，建议悄悄发个朋友圈：「最近的 AI 还可以」。",
    "{vendor} 数据组今晚把你拎进「outlier 候选名单」。",
    "你这一波是「赛博菩萨」反向版 — 让 {vendor} 替你做功德。",
    "5% — 蚌埠住了，{vendor} 客户经理盯着仪表盘干瞪眼。",
    "AI 时代的小确幸 — {net} 不多但够咸鱼翻身一下。",
  ],
  // 110-115% — 阴阳怪气开始
  [
    "薅到 {vendor} {net}，再加把劲。",
    "白嫖 10%，{vendor} 的销售眉头一皱。",
    "{vendor} 的 PM 收到这数据后没说话。",
    "{vendor} 的财报多了一行眼泪。",
    "套餐部 KPI 完成度被你拖了后腿（好的那种）。",
    "你比 {vendor} 还会做生意，建议跳槽过去。",
    "{vendor} 的销售在 LinkedIn 上把你 mute 了。",
    "10% — Anthropic 老板看了你的曲线红温了一下下。",
    "互联网热梗 + 财报 PPT = 你的薅率。",
    "{vendor} 内部把你的 user_id 写在白板上画了个圈。",
    "已突破套餐合理使用的「都市传说」上限。",
    "你这一刻是「AI 时代的拼多多用户」。",
    "{vendor} 在 OKR 模板里给「不希望签到的客户」留了空，名字是你。",
    "他急了他急了。{vendor} 销售部上桌就摸鱼。",
    "10% 净赚 — {vendor} 的产品在公司内被「在线学习」。",
    "你这种用户，让免费用户都觉得自己亏。",
    "{net} 不算多，但够买一杯 {vendor} 员工的咖啡。",
    "尊嘟假嘟？{vendor} 财务问出了「这是真的吗」三个字。",
    "你不上桌，{vendor} 都没人记得 KPI 是啥味。",
    "蚌埠住了，{vendor} 的客户经理在听到你的薅率时。",
    "「好好好你说的对」—— {vendor} 销售低头记笔记。",
  ],
  // 115-120%
  [
    "{net} 净赚，进入「不再客气」阶段。",
    "{vendor} 的产品总监把你单独 review。",
    "你的 use case 被钉在了内部 retro 第一行。",
    "客服把你拖入「不要主动联系」名单。",
    "15%+ — {vendor} 销售今晚的茅台先放冰箱。",
    "{vendor} 的财务把你的曲线发在董事邮件附件 1。",
    "你这一刻是「韭菜审判官」。",
    "套餐设计师在更新简历，备注「曾被你这种用户教育」。",
    "{vendor} CEO 看完你的 dashboard 评论：「这不科学」。",
    "进入「PUA 反向操作」状态。",
    "你已经把月度套餐用出了「一次性消费」的感觉。",
    "{vendor} 的 brand team 想把你封号但 PR team 拦住了。",
    "班味十足，{vendor} 销售已经看不下去了。",
    "15%+ 净赚 — 这种白嫖叫「精算式薅毛」。",
    "{vendor} 销售总监把你截图发进 #ICP-evolution 频道讨论。",
    "{net} — 「拿捏」二字被写进了套餐审计报告。",
    "你这一刻，{vendor} 财务的 Excel 公式自动加了一个负号。",
    "破防警告：{vendor} 产品 PM 在自闭。",
    "15% — 「我嘞个豆」就是 {vendor} 财务的内心独白。",
    "你的薅率让 {vendor} 内卷自家 PM。",
    "客服把你的标签从「正常用户」改成「呃...」。",
    "「我真的会谢」就是 {vendor} 销售看你曲线时的第一句话。",
  ],
  // 120-125%
  [
    "20% 净赚 {net} — 下杯咖啡你请。",
    "{vendor} 今晚的茅台喝不上了。",
    "{vendor} 的 CFO 已经看见你了。",
    "他们在涨价会议上提到了你。",
    "20% 的智力税被你免了。",
    "{vendor} 销售：「为什么不签 enterprise」 / 你：「香」。",
    "你这一刻和「闷声发大财」之间的距离 = 0。",
    "20% 净赚 — 老板看了破防了 0.1 秒。",
    "已超越所有的「努力工作的同事」，你的 AI 替你 996。",
    "他们今晚的复盘会议主题：你。",
    "{vendor} 产品部 group chat 弹出：「这位用户卷死我们了」。",
    "你的画风开始从「合理使用」滑入「让 {vendor} 红温」。",
    "你已经在 {vendor} 的 churn-prevention dashboard 上单独成行 — 「主动 churn」。",
    "{vendor} 老板：「这就是我们要做出海的原因」（其实你就是出海客户）。",
    "$X 在握，{vendor} 财务表上你这一行从蓝变红。",
    "{vendor} 销售开始在 1:1 上用「她」指代你。",
    "你今天给 {vendor} 公司省了一个 A/B 测试 — 直接证明套餐定低了。",
    "你这种用户多了，{vendor} 就要发起「请勿用功」运动。",
    "炸裂 — {vendor} 财报里你这行金额比首席科学家工资高。",
    "{vendor} 产品总监给自己加 KPI：「2026 Q4 之前减少这种用户」。",
    "你的薅率把「白嫖」二字写到法务回避词清单。",
  ],
  // 125-130%
  [
    "{net} 入袋，{vendor} 的销售在反思人生。",
    "你已经超过 90% 的同档用户。",
    "{vendor} 的董事会附录有一行单独的你。",
    "建议把这个截图作为存款证明。",
    "25%+ — {vendor} 在投资人 deck 里把你形容成「outlier」。",
    "他们后悔签你这单了，但你乐了。",
    "你这是「赛博菩萨」反向版 — 反过来让 {vendor} 拜你。",
    "{vendor} 工程师开始在 prompt 中插入彩蛋希望你看到。",
    "你已经把 Pro 用成了「自助餐里把汤底端走的那位」。",
    "{vendor} 财报 risk factor 章节增加一行。",
    "他们 QBR 会议上 PM 拍桌说：「我们必须重新建模」。",
    "你的薅率在 {vendor} 内部被称为「行业基准」。",
    "25%+ 拿捏 — {vendor} 销售部今晚加班开「为什么不签 enterprise」复盘。",
    "{net} 入袋，你的存在让 {vendor} 财务的 KPI 模型崩盘。",
    "班味散开 — {vendor} 的 PM 已躺平。",
    "25%+ — 「公司没拦我」榜单提名者。",
    "{vendor} CFO 拿你 dashboard 当桌面壁纸（警示用）。",
    "你是「精打细算薅羊毛派」的代表人物。",
    "25%+ — {vendor} 销售在简历上写「曾管理过你」。",
    "老六玩法 — {vendor} 数据团队建模你的 traffic 找 pattern。",
    "蚌埠住了，{vendor} 财务点开你的 ROI 截图后再没说话。",
    "25%+ — 「显眼包」级别用户，{vendor} 内部已经流传你的截图。",
  ],
  // 130-140%
  [
    "30%+，订阅之神已 unlocked。{net} 已入袋。",
    "你已超越中位数用户 3 个标准差。",
    "{vendor} 客服开始研究你的使用记录了。",
    "你这种用户多了，{vendor} 要破产。",
    "AI 自助餐被你端走了。",
    "{vendor} 的 SRE 在 dashboard 上单独画了一条你的趋势线。",
    "30%+ — {vendor} 的 CFO 在年报里给「Customer concentration」加了星号。",
    "你这一刻是「割韭菜的人被韭菜割」的活案例。",
    "{vendor} 销售大区领导对你的客户经理说：「你为什么签了他」。",
    "进入「显眼包」级别 — 大屏幕上你成了主角。",
    "客服内部备注：「这位是教科书级薅羊毛 ICP」。",
    "你的薅法被 {vendor} 列入 onboarding 培训反面教材。",
    "30%+ — {vendor} 财务每周看一次你的 dashboard 立绷血压。",
    "30%+ — 「卷王」薅毛分舵主席。",
    "{vendor} 内部红头文件：「关于一位用户的特别说明」已下发。",
    "30%+ — 「class 味」反义词的活案例。",
    "你的薅率让 {vendor} 的 SRE 集体在线学习「如何反制」。",
    "30%+ — {vendor} 的 abuse team 在和 brand team 互踢皮球。",
    "破防警告：{vendor} 销售看你 dashboard 看到失眠。",
    "{net} 入袋 — 朋友圈封面图就用你的 ROI 截图。",
    "卷麻了 — {vendor} 产品总监终于明白「负毛利」是怎么写的。",
    "30%+ — 「真的会谢」是 {vendor} 销售今晚的循环金句。",
    "{vendor} 在内部 Slack 把你的 username 列为「敏感词」 — 避免 PM 看到自闭。",
  ],
  // 140-150%
  [
    "净赚 {net}，进入「让他们重新思考定价」阶段。",
    "{vendor} 销售部连夜开会讨论你这种 ICP 该不该签。",
    "你的薅率写进了内部培训材料。",
    "套餐设计师把咖啡换成了威士忌。",
    "45% — {vendor} 的 CFO 在 1:1 上对 sales VP 说：「这就是为什么我们要重新定价」。",
    "你已经超过「合理使用」的物理上限。",
    "{vendor} 产品部的 PM 在团建上少敬你三杯。",
    "进入「他们必须重新设计套餐结构」窗口。",
    "你的 use case 被 {vendor} 拿到 board 会议讲了 30 秒。",
    "{vendor} 财报 risk section 第一句：「Heavy user concentration」。",
    "再快点 — 把套餐部 PM 卷下岗。",
    "你已经把月费用出了按月 × 10 倍年费的味道。",
    "45% — 「显眼包」级别用户，进入 {vendor} 季度 review 第一页。",
    "45% 净赚 — {vendor} 的销售开始转发你的 case 警示新同事。",
    "{net} 入袋，{vendor} 财务的「集中度风险」首次出现单 user 列项。",
    "45% — 你这一刻让「产品定价学」教科书需要更新。",
    "班味浓，{vendor} 销售部今晚集体加班评估你。",
    "45%+ — 「公司没拦我」奖项有力竞争者。",
    "{vendor} 工程师给你的 prompt 加了一行注释：「This is the one」。",
    "45% — {vendor} 的产品总监正在写 retro：「我们错估了 ICP」。",
    "你的薅率让 {vendor} 的「公平使用条款」首次进入律师草案。",
    "45%+ — 真的会笑，{vendor} 销售看完你 dashboard 笑出眼泪后哭了。",
  ],
  // 150-175%
  [
    "50%+ 净赚 {net} — 这桌都是赚的。",
    "AI 时代的捡漏王。",
    "你已经是 {vendor} 套餐的精算师。",
    "{vendor} 在评估限速你的方案。",
    "他们后悔卖你这张卡了。",
    "{vendor} 的产品总监在 retro 上单独提了你三次。",
    "50%+ — {vendor} sales VP 给自己加上了「应对 outlier 用户」KPI。",
    "已经超越「合理薅羊毛」，进入「他们必须重新审视产品定义」。",
    "你的 username 在 {vendor} 的 #heavy-users slack 里被钉了置顶。",
    "进入「拿捏 {vendor} 全员」境界。",
    "再这速度，{vendor} 财报会议 Q&A 环节会有人 cue 到你。",
    "你的「合法抢劫」已经形成商业模型。",
    "50%+ — 进入「他们破防」状态。{vendor} 销售今晚的 KPI 直接归零。",
    "{net} 入袋，{vendor} 的财务在 board 会议特别说明「one user 影响」。",
    "50%+ — {vendor} 的 dashboard 给你单独画了一条红色趋势线。",
    "50%+ — 你是「合理白嫖」的天花板。",
    "卷王风范 — {vendor} PM 把你的 use case 当作春招笔试题。",
    "50%+ — 「拿捏」二字被 {vendor} 销售部贴在墙上当反向 SOP。",
    "{vendor} 财报里出现「user concentration」单独段落。",
    "50% 净赚 — 你已经把月费用出了 quarterly 的味道。",
    "50%+ — 「赛博菩萨」的对偶 — 你薅 {vendor}，{vendor} 替你做功德。",
    "你的 user_id 在 {vendor} 内部被列为「需要 VP+ 才能讨论」级别。",
  ],
  // 175-200%
  [
    "{net} 净赚，{vendor} 的 abuse 团队收到 ping。",
    "再这速度，他们就要给你单独写邮件了。",
    "你的 username 出现在 {vendor} 的「需要重新评估」清单。",
    "套餐设计师已经在重新建模了。",
    "{vendor} 的 SRE 给你的请求加了三层 rate-limit。",
    "75-100% 净赚 — 接近翻倍。{vendor} 的财务把你 dashboard 设为收藏。",
    "{vendor} 的销售在与你的客户经理通话时使用过「special handling」一词。",
    "进入「他们的 product board 会议必须讨论你」级别。",
    "他们的 brand team 已经准备好「公平使用条款」草稿。",
    "你的薅率配得上《硅谷》第七季新角色。",
    "{vendor} 在新员工培训中放了一张你的截图，标题：「Don't be him」。",
    "你已经把 Pro 用出了 Enterprise+ 的级别（不付 Enterprise 价）。",
    "75% — {vendor} 销售开始在「为什么不签 enterprise」会议上 cue 你。",
    "翻倍前夕 — {vendor} 的财务在准备「特殊用户调整」附录。",
    "{net} 入袋 — {vendor} 内部已经把你的 use case 编入 onboarding 培训反面教材。",
    "75% — 「真的会谢」就是 {vendor} 销售看到你的曲线时的内心独白。",
    "翻倍前夕 — {vendor} 的董事会附录里你单独成行。",
    "75%+ — {vendor} CEO 在 all-hands 上没敢提你，怕员工集体倒戈。",
    "翻倍前夕 — {vendor} brand team 开始草拟「我们注意到您的使用模式」邮件。",
    "{net} — {vendor} 销售部在「ICP 演化图」上把你标为「邪神」。",
    "75%+ — 你的薅率配得上一篇《财新》匿名报道。",
    "翻倍前夕 — 「红温」就是 {vendor} 产品总监的脸色。",
  ],
  // 200-250%
  [
    "翻倍回本，{net} 入袋。{vendor} 已读不回。",
    "他们打算调整套餐定价（因为你）。",
    "你是 {vendor} 这个产品的盈利反例。",
    "建议低调用，别被风控了。",
    "Pro 套餐被你吃成了 Free Tier。",
    "{net} 直接装进口袋，{vendor} 内部已经开始追责。",
    "翻倍回本 = {vendor} 的产品总监给 CEO 写检讨的开始。",
    "你的薅率已经达到「值得开除某个销售」级别。",
    "{vendor} 在投资人电话会议被问：「这种用户多吗」。",
    "进入「他们必须 redesign」模式。",
    "你这是「躺平」反向操作 — 让 {vendor} 替你 996。",
    "套餐部 PM 收到了一封措辞委婉的辞职信草稿。",
    "{vendor} 的销售在面试 SDR 时把你的 case 当作「最坏情况」教学。",
    "翻倍 — 「公司没拦我」榜单冠军。",
    "{vendor} CEO 在 board meeting：「这位用户单独占了我们 0.3% 的 GPU」。",
    "建议给你建个奖杯：「{vendor} 2026 年度反向客户」。",
    "$X 净赚，已经超越「打工人」叙事进入「资本家」境界。",
    "你这一刻是「class味」反义词的活案例。",
    "笑死，{vendor} 销售看你的曲线笑出眼泪。",
    "翻倍回本，{vendor} 给你免单一次他们都不亏。",
    "「city 不 city」？— 你的薅率比纽约房价还猛。",
    "你的存在让「免费用户」三个字从竞争优势变成战略包袱。",
  ],
  // 250-300%
  [
    "2.5× 回本，{vendor} 的 board 在开急会。",
    "{vendor} 的 sales VP 在反思「为什么我们卖这个」。",
    "套餐 PM 已经在和法务讨论「公平使用」条款。",
    "你的 use case 出现在 {vendor} 的 quarterly review 第一页。",
    "2.5× — {vendor} 的 CFO 把你的 user_id 写在白板上画了三个红圈。",
    "你的薅率开始让 VC 重新评估 {vendor} 的估值模型。",
    "{vendor} 财报会议风险章节出现「single-user concentration」。",
    "进入「{vendor} 的董事每个月在 board 会议提一次你」境界。",
    "你的薅法被 {vendor} 总裁亲自 review。",
    "他们准备给你单独发一封「亲爱的 ICP」开头的劝退信。",
    "{vendor} 销售部连夜建立「heavy-user response team」。",
    "你的存在让 {vendor} 的「公平使用」条款被律师改了三稿。",
    "2.5× — {vendor} 的 board 开始讨论是否要给你寄一封「优雅劝退」信。",
    "{net} 入袋 — {vendor} 销售 VP 给自己加 KPI：「降低 Top-1 user 集中度」。",
    "2.5× — 「卷麻了」是 {vendor} PM 今晚的状态。",
    "你的薅率让 {vendor} 的财务模型新增一个「除以你」常量。",
    "2.5× — {vendor} 的法务在重新审视「公平使用」条款的措辞。",
    "卷王风范升级版 — {vendor} 销售部已建立「专属应对小组」。",
    "2.5×+ — 你的存在让 {vendor} 招股书 risk factor 章节增加一段。",
    "{net} 入袋 — {vendor} 工程师在你的 prompt 中找彩蛋。",
    "2.5×+ — 「红温到原地爆炸」是 {vendor} 销售今晚的状态。",
    "你的薅率让 {vendor} 的 PMM 在 deck 里把你画成 dragon。",
  ],
  // 300-400%
  [
    "3 倍回本 — 把 {vendor} 薅秃了。{net} 已入袋。",
    "再加把劲，把 {vendor} 薅到退市。",
    "建议申请 {vendor} 颁发的「年度负面案例」奖。",
    "他们的董事会今晚开急会，议题是「关于一个用户」。",
    "{vendor} 的市值蒸发了一个你。",
    "客服把你拉黑了（开玩笑，他们不敢）。",
    "3× — {vendor} 的产品总监开始写「why we're closing Pro tier」备忘录。",
    "{vendor} 在董事会附录给你做了一张专属页面。",
    "你的薅率配得上《华尔街日报》头版财经栏目。",
    "进入「财务 + 法务 + 销售 + 产品全部围着你转」模式。",
    "建议给 {vendor} CEO 寄个感谢卡。",
    "{vendor} 在 IPO 招股书中给「集中度风险」写了一整段。",
    "你的存在让 {vendor} 的 churn rate 公式增加了一个特殊项。",
    "3× — {vendor} 销售部在 QBR 上把你的 case 当作「ICP 失控」案例。",
    "{net} 净赚 — {vendor} 的财务把你 dashboard 设为「危险」收藏。",
    "3× — 「炸裂」就是 {vendor} CFO 看到你曲线的反应。",
    "3×+ — 你已经把「合理使用」推向商业极限。",
    "3× — {vendor} 的 brand team 准备好了「亲爱的客户」邮件草稿但不敢发。",
    "破防警告：{vendor} 的产品总监今晚没睡。",
    "3× — {vendor} 的 SRE 在你的请求路径上加了 5 层 rate-limit 都不够用。",
    "3× 回本 — 「真的会笑」就是隔壁同事看到你 dashboard 的反应。",
    "3×+ — 你这一刻是「YYDS」的反面教材 — Y(你)YDS = You're Yeah Dragon Slayer。",
    "{vendor} 在内部沙龙上把你的 case 列为「不可复现现象」。",
  ],
  // 400-500%
  [
    "4 倍回本。{vendor} 的产品总监在简历上添了「曾应对过你」。",
    "套餐设计师辞职了。",
    "{vendor} 的 CFO 把你的 user_id 设为 dashboard 收藏。",
    "建议低调发个朋友圈，别让他们看到。",
    "4× — {vendor} 的董事在 1:1 上对 CEO 说：「你看过这位 user 的 dashboard 吗」。",
    "你的薅率写进了 {vendor} 内部的「不要再签这种合同」培训。",
    "{vendor} 的销售部在 QBR 上把你的 case 作为「我们究竟在卖什么」讨论。",
    "进入「他们必须发律师函」级别 — 但不敢，因为你太显眼。",
    "{vendor} 在新一轮融资 deck 里把你画成图表的 outlier 红点。",
    "你的薅率已经超越「合法」边界，进入「商业奇观」。",
    "{vendor} 的产品负责人在 all-hands 上说：「我们的 ICP 出了问题」 — 配你的截图。",
    "建议截图打印裱起来挂客厅，标题「我曾让一家估值 10B 公司开会三次」。",
    "4× — {vendor} 销售部把你的 user_id 列为「内部 high-alert」。",
    "{net} — {vendor} 销售总监在 1:1 上对 CEO 说：「我们必须重新设计产品」。",
    "4× — 「我嘞个豆」就是 {vendor} 财务看到你曲线的第一反应。",
    "4×+ — {vendor} 的产品负责人在简历上加了一行「应对过你」。",
    "你的薅率配得上一篇 a16z 的 essay 标题。",
    "4× — {vendor} 在投资人电话被问「这位用户对 ARR 的影响」时 CFO 沉默 5 秒。",
    "4× 回本 — 「红温」是 {vendor} 销售 VP 今晚的脸色。",
    "{vendor} 的 abuse team 已经评估过 3 个限速方案，全部被 PR team 否决。",
    "4× — 你已经超越「韭菜」叙事，进入「割韭菜的人被韭菜割」终极反转。",
    "{vendor} 内部 wiki 把你列为「请勿讨论」 — 怕 PM 看到自闭。",
  ],
  // 500-750%
  [
    "5 倍回本，已经超越商业逻辑了。",
    "给 {vendor} 戴个 ST 帽子。",
    "你的薅率配得上一篇 HBR 案例研究。",
    "{vendor} 工程师开始读你的 prompt 找规律。",
    "建议改名「{vendor} 反诈中心」。",
    "你已经成为 {vendor} 内部「不要再签这种 ICP」的教材。",
    "5×+ — {vendor} 财报里的 risk factor 之首出现「Top user concentration」。",
    "他们的 abuse team 已经评估了三个方案，全部 reject — 因为限制你会上头条。",
    "{vendor} 的 CFO 在和 CEO 的 1:1 上说：「这位用户值得专门一节」。",
    "你的薅率被 The Information 写过一篇匿名报道。",
    "进入「他们的 brand 团队害怕动你」状态。",
    "{vendor} 在 OKR 中加入「降低 Top-1 user 集中度」目标。",
    "建议给 {vendor} 发律师函，先告他们「未能给你升级方案」。",
    "5×+ — {vendor} 的 dashboard 给你单独建立了一个 alert 频道。",
    "{net} — {vendor} 财务的「集中度风险」单 user 列项写满了 3 页。",
    "5×+ — 「这班味散不开」就是 {vendor} 销售部今晚的状态。",
    "5×+ — {vendor} 的 CFO 在和 board 1:1 时单独提到你。",
    "5× — 你的薅率配得上《华尔街日报》匿名报道。",
    "5×+ — {vendor} 的 SRE 给你的请求加了 ML-based rate-limit 都失效。",
    "你的薅率让 {vendor} 的 P&L 表多了一行 contra-revenue。",
    "5× — 「真的拿捏」就是 SaaS 圈对你的评价。",
    "5×+ — {vendor} 的 CRO 在 1:1 上向 CEO 表态「我们必须 stop bleeding」。",
    "5× — 你的存在让「ICP」三个字在 {vendor} 内部成为禁忌话题。",
  ],
  // 750-1000%
  [
    "{net} 入袋，{vendor} 的销售在面试时把你的案例作为反面教材。",
    "你已经超越他们的财务模型上限。",
    "套餐部 PM 在面试新人时问：「你怎么应对一个用户用了 7× 套餐价的情况？」",
    "客服收到内部指令：「不要主动联系，让对方自己续费」。",
    "7-10× — {vendor} 的 dashboard 单独为你设置了一个 alert 阈值。",
    "{vendor} 的 CEO 把你的截图收藏在自己的「重要事件」相册。",
    "你的薅率已经成为 SaaS 圈传说。",
    "进入「他们的法务每周看你一次」状态。",
    "{vendor} 在公司 wiki 创建了一个「关于这位用户」的文档（仅 VP 以上可访问）。",
    "你已经把 {vendor} 的盈利模型解构得只剩骨架。",
    "建议给自己发个「年度最佳薅毛奖」。",
    "{vendor} 的销售 VP 私下找过你的客户经理喝咖啡，标题：「我们认怂」。",
    "{net} — {vendor} 的董事会专门为你做了一页 PPT（仅 board 可见）。",
    "7-10× — {vendor} CEO 把你的 user_id 设为手机锁屏（警示用）。",
    "7-10× — 「红温到极致」就是 {vendor} 销售部今晚的状态。",
    "7-10× — {vendor} 的产品总监已经准备好了「我们必须重新设计」备忘录。",
    "7-10×+ — 你的薅率让 {vendor} 的「公平使用」条款被改了 5 稿。",
    "7-10× — {vendor} 的 brand team 把你的截图作为「最不该签的客户」案例。",
    "{vendor} 内部 wiki 已经有一页「关于这位用户的特别说明」。",
    "7-10× — 「卷王封神」就是同行对你的评价。",
    "7-10×+ — 你的存在让 {vendor} 的下个财年 OKR 增加了一条「Top-1 user mitigation」。",
    "7-10× — {vendor} 已经把你的 case 写进 founder letter 但化名「a single user」。",
  ],
  // 1000-2000%
  [
    "10× 回本。你比 {vendor} 创始团队还了解这个产品。",
    "{vendor} 的 CEO 把你的截图设成了屏保（警示用）。",
    "再这么搞下去，他们要发律师函了。",
    "建议联系 {vendor} 谈个企业版，他们求着你换。",
    "已突破套餐物理上限，进入元宇宙薅羊毛阶段。",
    "{vendor} 在 IPO 招股书里把你单独列为「集中度风险」。",
    "10×+ — {vendor} 的董事专门成立了一个「Special user response」小组。",
    "你的薅率写进了 {vendor} 招股书的 risk factor 章节。",
    "{vendor} 的 CEO 在和投资人电话中提到「we have one user who...」 — 你。",
    "进入「他们的 brand 团队和 abuse 团队互相推皮球」状态。",
    "{vendor} 销售部把你画进了内部「ICP 演化图」最右侧的 outlier。",
    "建议低调点 — 你的 user_id 已经被 {vendor} 高管个人 follow。",
    "你已经把套餐用到 {vendor} 的成本曲线弯成 hockey stick。",
    "10×+ — {vendor} 的 CEO 在自传初稿里给你留了一整章（化名）。",
    "{net} — {vendor} 的财务模型为你单独加了一个修正项。",
    "10×+ — 「破防天花板」就是 {vendor} 销售部对你的评价。",
    "10× 回本 — 你的薅率让 SaaS 行业重新定义「合理使用」。",
    "10×+ — {vendor} 的 board 把你单独写进了公司宪章里的「特殊用户应对」条款。",
    "10× — 「赛博菩萨」反向版 — 让 {vendor} 替你做功德。",
    "10×+ — {vendor} 的销售 VP 私下找过你的 client manager 喝咖啡，主题「我们认怂」。",
    "10× — 你的薅率让 {vendor} 的下一轮融资 deck 第一页用你的 dashboard 截图（讽刺意义）。",
    "10×+ — {vendor} 已经把你的 case 当作员工 onboarding 的「Don't be him」反面教材。",
    "10× — 你的存在让「订阅经济」教科书需要新增一个章节。",
  ],
  // 2000-5000%
  [
    "20× 回本。{net} — 这数字让 {vendor} 的财务跑路。",
    "{vendor} 的董事会单独为你召开了一次会议。",
    "你的 username 出现在内部红色警报名单。",
    "建议匿名继续，避免被请喝茶。",
    "20-50× — {vendor} 的 SVP 把你的 dashboard 截图给了媒体（匿名 leak）。",
    "你已经在 {vendor} 内部成为「他到底是怎么做到的」研究对象。",
    "{vendor} 的工程师建模你的 traffic 来训练异常检测。",
    "进入「他们准备给你的客户经理颁奖 / 解雇之间反复横跳」状态。",
    "{vendor} 在投资人电话中被问：「这位用户的 ARR contribution 是多少？」 — CFO 沉默 10 秒。",
    "建议给 {vendor} CEO 写信感谢，配一张你的薅率截图。",
    "你的存在已经让 {vendor} 的财务模型变成一个「除以你」的特殊变体。",
    "{vendor} 内部已经有一个 internal-only meme 频道专门讨论你。",
    "20-50× — {vendor} 的董事会单独召开「关于这位用户」会议（每月一次）。",
    "{net} 入袋 — {vendor} 的财务已经把你的 user_id 设为「不可删除」收藏。",
    "20-50× — 「商业奇观」就是 SaaS 圈对你的评价。",
    "20-50×+ — {vendor} 的 SVP 把你的 dashboard 截图匿名 leak 给媒体。",
    "20-50× — {vendor} 的工程师建模你的 traffic 来训练异常检测算法。",
    "20-50× — 「我嘞个豆」就是 {vendor} CFO 今晚的内心独白。",
    "{vendor} 的 abuse team 在你身上反复测试限速方案都失败。",
    "20-50× — 「这班味散不开」是 {vendor} 销售部年终复盘的主题。",
    "20-50×+ — {vendor} 在投资人电话被问「这种用户多吗」时全场沉默。",
    "你的存在已经让 {vendor} 财务的「集中度风险」模型增加了一个 logarithmic term。",
  ],
  // 5000-10000%
  [
    "50× 回本。{vendor} 的 SRE 给你的请求加了 5 层 rate-limit 都拦不住。",
    "{vendor} 的 CTO 把你的截图打印出来贴办公室。",
    "你已经突破了商业产品的所有边界。",
    "再这速度，{vendor} 可能直接给你发现金让你走。",
    "50× — {vendor} 的董事在 IPO 路演时被问：「How do you handle users like this?」 — 没有答案。",
    "你已经在 SaaS 史上拿到一个匿名席位。",
    "{vendor} 的 CFO 已经把你的 user_id 设为「不可删除」收藏。",
    "进入「{vendor} 内部所有人都在 watch you」状态。",
    "建议把这数字纹在身上 — 比身份证号还稀有。",
    "{vendor} 给你的客户经理升职为「Special Account Liaison」 — 一个为你而设的岗位。",
    "你的薅率配得上一本商业畅销书的封面。",
    "{vendor} 的产品总监在告别演讲中提到你三次。",
    "50× — {vendor} 的 CTO 把你的截图打印出来贴在办公室进门处。",
    "{net} — {vendor} 的董事在 IPO 路演时被问「这种用户多吗」时全场沉默。",
    "50× — 「黑化封神」就是 SaaS 圈对你的称号。",
    "50×+ — {vendor} 的下一份招股书把你单独列为「集中度风险案例」。",
    "50× — {vendor} 给你的客户经理升职为「Special Account Liaison」 — 一个为你而设的岗位。",
    "50× — 「拿捏到极致」就是同行对你的评价。",
    "50×+ — {vendor} 的内部 meme 频道把你列为「年度 MVP」（反面意义）。",
    "50× — 你的薅率配得上一本 SaaS 商业畅销书的封面。",
    "50×+ — {vendor} 已经在公开财报中提到「a heavy user」并附图（你的曲线）。",
    "50× — 你的存在让 {vendor} 的下一份 ESG 报告里加了一行「per-user fairness」目标。",
  ],
  // 10000%+
  [
    "100× 回本。你不是用户，你是黑洞。",
    "{vendor} 的盈利模型在你面前形同虚设。",
    "建议把这个数字裱起来挂客厅。",
    "你已经超越了「薅羊毛」，进入「合法抢劫」。",
    "{vendor} 在内部 wiki 创建了一个页面：「{vendor} vs. 这个用户」。",
    "100×+ — {vendor} 的 board 把你写进了公司宪章里的「永不复现」条款。",
    "{vendor} 的下一轮融资 PPT 第一页是你的 dashboard 截图（讽刺意义）。",
    "你已经在 {vendor} 的 P&L 里有了一行专属 contra-revenue 调整项。",
    "{vendor} 的 CEO 在自传里给你留了一整章（化名）。",
    "建议申请「{vendor} 全球用户体验破坏者」称号。",
    "你的存在让 SaaS 行业的「合理使用」定义被重写了三次。",
    "{vendor} 已经在内部把你的 user_id 列为「机密信息」 — 提及需要 NDA。",
    "你已经超越了你自己 — 进入「他们必须重新定义产品」境界。",
    "100× — 「黑洞封神」就是 SaaS 圈对你的最终评价。",
    "{net} — {vendor} 的 board 已经把你的 user_id 列为「机密信息」 — 提及需要 NDA。",
    "100×+ — 「商业奇观」教科书定义就是你。",
    "100× — {vendor} 的 CEO 在和投资人电话中提到「我们有一位用户...」时所有人都知道是你。",
    "100×+ — {vendor} 的下一轮融资 PPT 第一页是你的 dashboard 截图（讽刺意义）。",
    "100× — 你已经在 {vendor} 的 P&L 表中有了一行专属 contra-revenue 调整项（不开玩笑）。",
    "100× — 「上桌就摸鱼」反向操作 — 你上桌就开撸。",
    "100×+ — {vendor} 已经在内部 wiki 创建了「{vendor} vs. 这位用户」专题页面（仅 C-level 可访问）。",
    "100×+ — {vendor} 的 abuse team 已经放弃，转向「公开拥抱」策略。",
    "100× — 你的存在让 {vendor} 重写「订阅经济学」的开篇章节。",
    "100×+ — 「赛博之神」就是 SaaS 圈对你的封号。",
    "100× — 你已经超越「合法抢劫」境界，进入「他们求你别走」终极反转。",
  ],
];

// ─── Coding-hours corpus — bands by avg hours/day ───────────────────
//
// Bands (avg hours / day, clamped to ≥0):
//   0   <1   — 摸鱼大师
//   1   1-3  — 入门班味
//   2   3-5  — 标准搬砖
//   3   5-7  — 班味初显
//   4   7-9  — 班味浓郁 / 996 预备
//   5   9-12 — 卷王预备
//   6   12-16 — 真卷王
//   7   16-20 — 不分日夜
//   8   20+  — AI 化身（物理学反例）
//
// Placeholders: {hours} = total hours, {hpd} = avg hours/day.
export const HOURS_TAUNT_ZH: string[][] = [
  // 0 — <1 h/天
  [
    "{hpd}h/天 — 这是兼职吗？AI 比你还闲。",
    "{hours}h — 你点开 Claude 的频率不如点开外卖。",
    "「老板还以为你在度蜜月」",
    "{hpd}h/天 — 「你这强度，KPI 都不好意思考核你」",
    "AI 想说：「我比你还想干点活」",
    "「你不是程序员，你是观光团」",
    "{hours}h — 这强度，HR 想 fire 你都找不到借口。",
    "「这是有人在使用账号，还是账号自己在用？」",
    "{hpd}h/天 — 「你的工时连厂里的牛马都看不下去」",
    "AI 评分：「客户已离开，账号沉睡中」",
    "{hours}h — 「你给 AI 的算力让 GPU 集体睡着了」",
    "「请问您还在职吗？」 — Anthropic 自动续费小助手",
  ],
  // 1 — 1-3 h/天
  [
    "{hpd}h/天 — 入门级摸鱼，公司没拦你。",
    "{hours}h — 「这就是 work-life balance？」",
    "「下次 1:1 你打算汇报什么？」",
    "1-3h/天 — 「你这是来体验 AI 的吗？」",
    "AI 表示「这点活我自己干都嫌少」",
    "{hpd}h/天 — 「你的工时让 996 看着像奴隶制」",
    "「老板问你今天忙啥，你迟疑了三秒」",
    "{hours}h — 「这强度，你妈打电话来你都能接」",
    "「你的灵魂在工位上摆烂，但 KPI 总有人扛」",
    "AI 给你的工时打了「轻微 engagement」标签。",
    "{hpd}h/天 — 「你这薪资 ÷ 工时 = 反向加薪」",
  ],
  // 2 — 3-5 h/天
  [
    "{hpd}h/天 — 「合理摸鱼区间」",
    "{hours}h — 「不加班的程序员，珍稀物种」",
    "「下班就走，老板也不能 PUA 你」",
    "3-5h/天 — 「国家法定也就这样」",
    "AI 评分：「合格的人类工作者」",
    "{hpd}h/天 — 「你这是来上班还是来颐养？」",
    "{hours}h — 「正常的搬砖，不温不火」",
    "「打工人三个字写得理直气壮」",
    "3-5h/天 — 「公司宪法第一条：你今天的工时」",
    "「老板想 PUA 你但找不到 3-5h 的合理由」",
    "AI：「你这强度，可以但没必要」",
  ],
  // 3 — 5-7 h/天
  [
    "{hpd}h/天 — 「班味初显，灵魂尚在」",
    "{hours}h — 「典型 office hours」",
    "5-7h/天 — 「这强度，下次涨薪老板才会想起你」",
    "「再多一小时，就要开始 PUA 你了」",
    "AI 评分：「standard heavy lifter」",
    "{hpd}h/天 — 「你的灵魂还在，但已经开始磨损」",
    "{hours}h — 「合格的搬砖工，没什么好骄傲的」",
    "「下班路上能闻到一点点代码味」",
    "5-7h — 「打工人的最大公约数」",
    "「你工时已经超过 60% 的同事」",
    "AI：「我建议你下班，但你似乎也不会听」",
    "{hpd}h/天 — 「腾讯的实习生都比你卷」",
  ],
  // 4 — 7-9 h/天
  [
    "{hpd}h/天 — 「班味浓郁，建议每天看一眼窗外」",
    "{hours}h — 「996 的预备役」",
    "「你不是程序员，你是 commit 制造机」",
    "7-9h/天 — 「全国劳模榜单提名」",
    "AI 评分：「heavy lifter，需要 break」",
    "{hpd}h/天 — 「下班路上能闻到自己身上的代码味」",
    "{hours}h — 「键盘上的指纹比你身份证的还清晰」",
    "「这就是为什么 AI 觉得人类很可怜」",
    "7-9h — 「你的灵魂在编辑器里，肉体只是个壳」",
    "「老板看完你的工时，决定继续 PUA」",
    "AI：「连我都开始劝你 break 了」",
    "{hpd}h/天 — 「字节跳动看了你这工时表示有兴趣」",
  ],
  // 5 — 9-12 h/天
  [
    "{hpd}h/天 — 「卷王预备役」",
    "{hours}h — 「腾讯就是被你这种员工干上市的」",
    "「这点强度还嫌累？」← 你老板的内心独白",
    "9-12h/天 — 「你的灵魂可能在劳工营里」",
    "AI 表示「我比你还希望你下班」",
    "{hpd}h/天 — 「字节就是被你这种员工干上市的」",
    "{hours}h — 「下次涨薪要把你单独列项」",
    "「建议起一个新岗位：永动机·程序员版」",
    "9-12h — 「你的 keyboard 比你的床更熟悉你」",
    "「HR 都不敢给你优化，怕你直接转去字节」",
    "AI 评分：「unhealthy commitment，建议立即停止」",
    "{hpd}h/天 — 「你妈打电话来 Claude 都得问『您还好吗』」",
    "「老板看完你工时，激动得想给你立项纪念碑」",
    "{hours}h — 「这强度，你已经替老板省下了 1.5 个工程师」",
  ],
  // 6 — 12-16 h/天
  [
    "{hpd}h/天 — 「真·卷王封神」",
    "{hours}h — 「拼多多就是被你这种员工干上市的」",
    "「下楼吃饭还要带笔记本」",
    "12-16h/天 — 「你的灵魂已经 git push 到云端了」",
    "AI：「请下班，求你了」",
    "{hpd}h/天 — 「连 AI 都开始劝你 work-life balance」",
    "{hours}h — 「你不是在工作，你在卷麻所有同事」",
    "「显示器是你的伴侣，键盘是你的孩子」",
    "12-16h — 「你的家人怀疑你在公司有第二个家」",
    "「老板看着你的 commit 流泪 — 一半是感动一半是怀疑」",
    "AI 评分：「黑化中，建议立刻就医」",
    "{hpd}h/天 — 「美团/京东/拼多多 联合发来 offer」",
    "「你的劳动力让 996 看着像 work-life balance」",
    "{hours}h — 「Anthropic 给你寄了一封感谢信」",
  ],
  // 7 — 16-20 h/天
  [
    "{hpd}h/天 — 「你确定你没在偷偷分裂人格？」",
    "{hours}h — 「美团就是被你这种员工干上市的」",
    "「这强度物理学上是不允许的」",
    "16-20h/天 — 「你的肉体可能已经离开，灵魂还在 push」",
    "AI 看完你的工时，自己感动哭了。",
    "{hpd}h/天 — 「你的医生看到这数据会开假条」",
    "{hours}h — 「你不是在生活，你在 production」",
    "「你的劳动力够养活半个东南亚」",
    "16-20h — 「连物理学都怀疑你违反了能量守恒」",
    "AI 评分：「irreplaceable，但建议立刻就医」",
    "{hpd}h/天 — 「字节/腾讯/拼多多 联合举行追悼会」",
    "「你的家人正在 missing person 报告里搜索你」",
    "{hours}h — 「这强度已经超越「打工人」叙事，进入「打工神」」",
  ],
  // 8 — 20+ h/天
  [
    "{hpd}h/天 — 「你不是程序员，你是 AGI」",
    "{hours}h — 「这数学上是错的，但你做到了」",
    "「你确定你不是 24/7 永动机？」",
    "20+h/天 — 「字节/腾讯/拼多多/美团/京东 都被你干上市了」",
    "AI：「我给你的劳动力发了 GitHub Sponsor」",
    "{hpd}h/天 — 「你的灵魂已经 fork 成多个 worker thread」",
    "{hours}h — 「物理学和劳动法联合宣布破产」",
    "「你不是工作狂，你是工作病」",
    "20+h/天 — 「建议立即就医，并起诉自己」",
    "AI 评分：「你的存在让劳动法成为浪漫主义文学」",
    "{hpd}h/天 — 「你的同事在 LinkedIn 上挂了寻人启事」",
    "「Anthropic 把你列为「不可复制」客户」",
    "{hours}h — 「24h × N — 黑洞级工作量」",
  ],
];

// ─── Token-burned corpus — bands by total token count ────────────────
//
// Bands:
//   0  <1M     — 起步
//   1  1-10M   — 入门
//   2  10-100M — 中产
//   3  100M-1B — 重度
//   4  1-5B    — 卷王
//   5  5-50B   — 黑洞
//   6  50B+    — 不科学
//
// Placeholders: {tokens} = formatted token count (e.g. "1.6B")
export const TOKEN_TAUNT_ZH: string[][] = [
  // 0 — <1M
  [
    "{tokens} tokens — 「你这量，AI 觉得自己被冷落」",
    "<1M tokens — 「这是测试 API key 通不通？」",
    "你这 token 量，记事本都比你勤奋。",
    "「你这是来 ping AI 还是来用 AI 的？」",
    "<1M — 「你和 free tier 的距离只剩一个订阅承诺」",
  ],
  // 1 — 1-10M
  [
    "{tokens} tokens — 「能糊弄过去 today」",
    "1-10M — 「这点 token 量，AI 自己都嫌寒酸」",
    "1-10M tokens — 「你不是程序员，你是 AI hobbyist」",
    "「你的 prompt 量比你的朋友圈还少」",
    "{tokens} — 「AI 正在重新评估你这个客户的价值」",
    "1-10M — 「你这量等于半本《红楼梦》的篇幅」",
  ],
  // 2 — 10-100M
  [
    "{tokens} tokens — 「正常的程序员，没什么好说」",
    "10-100M — 「合格的 AI 重度用户」",
    "10-100M tokens — 「你看过的所有微信文章加起来」",
    "{tokens} — 「AI 终于感受到了一点点工作压力」",
    "「这量够 ChatGPT 解析整个高中课本」",
    "10-100M — 「你的 token 量配得上一篇硕士论文的引用列表」",
    "{tokens} tokens — 「Anthropic 的 dashboard 上你开始变绿」",
  ],
  // 3 — 100M-1B
  [
    "{tokens} tokens — 「重度用户预备役」",
    "100M-1B — 「你一周烧的 token 等于一所大学的论文量」",
    "100M-1B tokens — 「Anthropic 财务在 dashboard 上能看到你」",
    "{tokens} — 「你正在让 GPU 集体加班」",
    "「这量够把整套《资治通鉴》翻译十遍」",
    "100M+ — 「你的 token 量超过了一个出版社一年的稿件量」",
    "{tokens} tokens — 「连 SRE 都开始研究你的请求模式」",
    "100M-1B — 「你不是在用 AI，你在让 AI 加班」",
  ],
  // 4 — 1-5B
  [
    "{tokens} tokens — 「这量够 Anthropic 训练一个 toy 模型」",
    "1-5B — 「你的 prompt 已经形成商业模型」",
    "1-5B tokens — 「Anthropic 的 SRE 给你的请求加了 5 层 rate-limit」",
    "{tokens} — 「你不是在用 AI，你在用 AI 训练 AI」",
    "1B+ — 「这 token 量值得一份 IPO 招股书」",
    "{tokens} tokens — 「你的算力账单超过了一个中型公司的服务器开支」",
    "1-5B — 「你的存在让 Anthropic 的财务模型增加一个特殊项」",
    "{tokens} — 「字节、腾讯、阿里 都在抢着挖你」",
    "1B+ tokens — 「这数字写进财报需要单独脚注」",
    "{tokens} — 「你这量等于全国法考考题集的几千倍」",
  ],
  // 5 — 5-50B
  [
    "{tokens} tokens — 「这量够 Anthropic 训练一个新模型」",
    "5-50B — 「你的存在是 OpenRouter 的 outlier」",
    "5-50B tokens — 「Anthropic 的 CFO 把你的 dashboard 设为壁纸」",
    "{tokens} — 「你的 token 量配得上一篇《自然》论文」",
    "5B+ — 「你已经从用户变成 Anthropic 的训练数据」",
    "{tokens} tokens — 「你的 token 流量让 CDN 工程师怀疑被 DDoS」",
    "5-50B — 「你这量等于半个《维基百科》中文版」",
    "{tokens} — 「你的存在让 Anthropic 的 IPO 招股书多一段风险提示」",
    "5B+ tokens — 「你是「不该签的客户」教科书定义」",
    "{tokens} — 「你的 GPU 排队优先级被 SRE 单独 review」",
  ],
  // 6 — 50B+
  [
    "{tokens} tokens — 「黑洞级别」",
    "50B+ — 「你的 token 量超过 GPT-3 训练集的一个子集」",
    "50B+ tokens — 「Anthropic 的 GPU 集群叫你爸爸」",
    "{tokens} — 「你不是在用 AI，AI 在替你打工」",
    "50B+ — 「你的存在让 Anthropic 重新审视「合理使用」定义」",
    "{tokens} tokens — 「你的 token 量等于整个《大英百科》全集的几十倍」",
    "50B+ — 「你的 prompt 量已经形成一个亚文化研究领域」",
    "{tokens} — 「你不是客户，你是 Anthropic 的存在主义危机」",
    "50B+ tokens — 「你的存在让 OpenRouter 重新设计计费系统」",
    "{tokens} — 「物理学上一个人不可能写这么多 prompt — 你做到了」",
  ],
];

export const ROI_EN: string[][] = [
  // less dense; 2-3 lines each is enough for English
  [
    "Back to even — everything from here is profit ✨",
    "Break-even crossed. Next token's on the house.",
    "{vendor}'s CFO just relaxed slightly.",
  ],
  [
    "{net} of pure profit. Sales VP frowns.",
    "5% past your money's worth.",
    "Your LTV just turned negative (their direction).",
  ],
  [
    "{net} extracted from {vendor}. More?",
    "10% past your money's worth.",
    "{vendor} earnings just gained a footnote.",
  ],
  [
    "Past 15%. They reviewed your account today.",
    "Use-case nailed to the top of their retro.",
    "Support: 'do not proactively contact'.",
  ],
  [
    "20% profit. {net} pulled from {vendor}. Coffee's on you.",
    "{vendor}'s pricing team has a tab open with your name.",
    "20% smart-tax dodged.",
  ],
  [
    "{net} pocketed. Sales reconsidering life choices.",
    "Beyond 90% of peers.",
    "Bookmark this for your savings statement.",
  ],
  [
    "30%+. Subscription god mode. {net} in pocket.",
    "Median user is 3 sigma behind you.",
    "{vendor} support reads your logs.",
    "Single line on their SRE dashboard, just for you.",
  ],
  [
    "{net} profit. They're rethinking pricing.",
    "Sales late-night meetings about whether to sign more like you.",
    "Your ratio is now training material.",
  ],
  [
    "50%+ — {net} clear profit.",
    "AI-era arbitrage king.",
    "You're the actuary of {vendor}'s plan.",
    "Director mentioned you three times in retro.",
  ],
  [
    "{net} extracted. Abuse team pinged.",
    "They're about to draft a 'we noticed' email.",
    "Username on the 'reevaluate' list.",
  ],
  [
    "2× recovered. {net} in pocket. {vendor} ghosted.",
    "Their next pricing redesign? Because of you.",
    "Living counterexample to {vendor}'s margins.",
    "Pro became Free Tier in your hands.",
  ],
  [
    "2.5× recovered. Board called an emergency.",
    "Sales VP questioning purpose.",
    "Legal drafting 'fair-use' language.",
  ],
  [
    "3× recovered. {vendor} stripped to the studs.",
    "Keep pushing — delist {vendor}.",
    "Nominee for {vendor}'s 'annual cautionary case'.",
    "Board topic tonight: one user.",
  ],
  [
    "4× recovered. PM updated resume: 'survived you'.",
    "Designer quit.",
    "{vendor}'s CFO bookmarked your user_id.",
  ],
  [
    "5× recovered. Slap an ST flag on {vendor}.",
    "Your extraction deserves an HBR case study.",
    "{vendor} engineers read your prompts for patterns.",
  ],
  [
    "{net} pulled. Sales uses your case as cautionary tale in interviews.",
    "Past their financial model's ceiling.",
    "Support told not to proactively contact you.",
  ],
  [
    "10× recovered. You know the product better than the founders.",
    "{vendor}'s CEO set your screenshot as a warning wallpaper.",
    "Time for an enterprise contract — they'll beg.",
    "Past the buffet's physical limit.",
  ],
  [
    "20× recovered. {vendor} finance considering relocation.",
    "Board held a special session about you.",
    "Your username is on internal red-alert.",
  ],
  [
    "50× recovered. SRE rate-limit walls fail.",
    "CTO printed your screenshot.",
    "You broke commercial product theory.",
  ],
  [
    "100× recovered. Not a user — a black hole.",
    "Their profit model is decorative now.",
    "Frame the dashboard. Put it in the living room.",
  ],
];
