import "server-only";
import { openServerDb } from "./server-db";
import { resolveUsageCost } from "./pricing";
import { isCloudflareRuntime } from "./runtime";

// Period buckets the leaderboard supports. Keeping the same vocabulary
// as the dashboard (today / 7d / 30d / all) so users don't have to
// learn two systems.
export type LeaderboardPeriod = "today" | "7d" | "30d" | "all";

export type LeaderboardRow = {
  rank: number;
  userId: number;
  username: string;
  isAdmin: boolean;
  // Honors users.show_on_leaderboard. When false, the page should
  // render this row as `Anon #<id>` for everyone except the viewer
  // who matches `userId`. The raw username stays in the field so the
  // viewer can still recognize themselves.
  showOnLeaderboard: boolean;
  totalCost: number;
  totalTokens: number;
  sessionCount: number;
  // Frozen tier index so the page can render a consistent badge
  // without re-running the lookup per row in the React component.
  tierIdx: number;
};

// Tier ladder. Index → { label, emoji, min spend ($) in the period }.
// PUA-flavored names that match the taglines/encouragement corpus
// tone — every tier is a tiny mood-board.
export const LEADERBOARD_TIERS = [
  { idx: 0, label: "划水冠军", emoji: "🥱", min: 0 },
  { idx: 1, label: "新手村村民", emoji: "🐣", min: 0.01 },
  { idx: 2, label: "见习巫师", emoji: "🪄", min: 2 },
  { idx: 3, label: "中级炼金师", emoji: "⚗️", min: 10 },
  { idx: 4, label: "资深点金者", emoji: "🪙", min: 30 },
  { idx: 5, label: "AI 高手", emoji: "🔥", min: 100 },
  { idx: 6, label: "AI 大魔王", emoji: "👑", min: 300 },
  { idx: 7, label: "令人发指", emoji: "🚨", min: 1000 },
] as const;

export function tierFor(cost: number): (typeof LEADERBOARD_TIERS)[number] {
  // Walk from the top — first threshold the cost clears wins.
  for (let i = LEADERBOARD_TIERS.length - 1; i >= 0; i--) {
    if (cost >= LEADERBOARD_TIERS[i].min) return LEADERBOARD_TIERS[i];
  }
  return LEADERBOARD_TIERS[0];
}

// Returns a [startMs, endMs] window in epoch ms for the given period,
// anchored to the server's local clock (good enough — the dashboard's
// daily buckets use the same anchor).
function periodWindow(period: LeaderboardPeriod, now: Date): { from: number; to: number } {
  const to = now.getTime();
  if (period === "all") return { from: 0, to };
  if (period === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { from: start.getTime(), to };
  }
  const days = period === "7d" ? 7 : 30;
  return { from: to - days * 24 * 60 * 60 * 1000, to };
}

export async function loadLeaderboard(
  period: LeaderboardPeriod,
  now: Date = new Date()
): Promise<LeaderboardRow[]> {
  if (isCloudflareRuntime()) {
    const { loadLeaderboardD1 } = await import("./cloudflare-leaderboard");
    return loadLeaderboardD1(period, now);
  }
  const { from, to } = periodWindow(period, now);
  const db = openServerDb();
  try {
    // LEFT JOIN so a user with zero sessions in the window still shows
    // up (parked at the bottom on $0). That makes the "划水冠军" tier
    // populated and the page useful as a who's-active-this-week check.
    const rows = db
      .prepare(
        `
        SELECT
          u.id                    AS userId,
          u.username              AS username,
          u.is_admin              AS isAdmin,
          u.show_on_leaderboard   AS showOnLeaderboard,
          u.created_at            AS userCreatedAt,
          s.id                    AS sessionId,
          s.provider              AS provider,
          s.model                 AS model,
          s.input_tokens          AS inputTokens,
          s.output_tokens         AS outputTokens,
          s.cache_read_tokens     AS cacheReadTokens,
          s.cache_write_tokens    AS cacheWriteTokens,
          s.reasoning_tokens      AS reasoningTokens,
          s.cost_usd              AS costUsd,
          s.cost_status           AS costStatus
        FROM users u
        LEFT JOIN sessions_data s
          ON s.user_id = u.id
         AND s.started_at >= ?
         AND s.started_at <= ?
        WHERE u.activated_at IS NOT NULL
        ORDER BY u.created_at ASC
        `
      )
      .all(from, to) as Array<{
        userId: number;
        username: string;
        isAdmin: number;
        showOnLeaderboard: number;
        userCreatedAt: number;
        sessionId: number | null;
        provider: string | null;
        model: string | null;
        inputTokens: number | null;
        outputTokens: number | null;
        cacheReadTokens: number | null;
        cacheWriteTokens: number | null;
        reasoningTokens: number | null;
        costUsd: number | null;
        costStatus: string | null;
      }>;

    const byUser = new Map<
      number,
      Omit<LeaderboardRow, "rank" | "tierIdx"> & { userCreatedAt: number }
    >();
    for (const r of rows) {
      let row = byUser.get(r.userId);
      if (!row) {
        row = {
          userId: r.userId,
          username: r.username,
          isAdmin: r.isAdmin === 1,
          showOnLeaderboard: r.showOnLeaderboard === 1,
          totalCost: 0,
          totalTokens: 0,
          sessionCount: 0,
          userCreatedAt: r.userCreatedAt,
        };
        byUser.set(r.userId, row);
      }
      if (r.sessionId == null || r.provider == null) continue;

      const tokens = {
        input: r.inputTokens ?? 0,
        output: r.outputTokens ?? 0,
        cacheRead: r.cacheReadTokens ?? 0,
        cacheWrite: r.cacheWriteTokens ?? 0,
        reasoning: r.reasoningTokens ?? 0,
      };
      const resolvedCost = resolveUsageCost({
        provider: r.provider,
        model: r.model,
        costUsd: r.costUsd,
        costStatus: r.costStatus,
        tokens,
      });
      row.totalCost += resolvedCost.costUsd ?? 0;
      row.totalTokens += tokens.input + tokens.output + tokens.cacheRead + tokens.cacheWrite;
      row.sessionCount += 1;
    }

    return Array.from(byUser.values())
      .sort((a, b) => b.totalCost - a.totalCost || a.userCreatedAt - b.userCreatedAt)
      .map((r, i) => {
        const t = tierFor(r.totalCost);
        return {
          rank: i + 1,
          userId: r.userId,
          username: r.username,
          isAdmin: r.isAdmin,
          showOnLeaderboard: r.showOnLeaderboard,
          totalCost: r.totalCost,
          totalTokens: r.totalTokens,
          sessionCount: r.sessionCount,
          tierIdx: t.idx,
        };
      });
  } finally {
    db.close();
  }
}

// Corpora deliberately overlap with the header tagline pool so the
// voice stays consistent — tieba/V2EX/职场 阴阳怪气 with internet-CN
// cadence. Pools are sized so that the rotation step (see pickFlavor)
// produces five distinct picks across five consecutive page refreshes.
const TAUNTS = [
  // — 工位 / 同事对比 —
  "再不烧点 token 就被同事甩开了",
  "你这名次，对得起你的工位吗",
  "全公司就你 AI 用得最少",
  "同事卷成狗，你卷成冷板凳",
  "同事在卷模型，你在卷下班点",
  "你这班是怎么上的，token 这么少",
  "一天烧的不够同事一顿外卖钱",
  "你这点 token 在工位上抬不起头",
  "同事开 8 个窗口在跑，你开了 8 个微信",
  "AI 都替你同事写完了，你在写啥",
  "你这进度，工位大屏上一打开全场沉默",
  "工位上的鼠标键盘已经在投诉你",
  // — 老板 / HR / 绩效 —
  "不烧 token 是不是不想升职",
  "你这 token 量配不上你的工资",
  "HR 都不忍心问你的绩效",
  "你说你忙？token 不会撒谎",
  "你这 token 数，建议换个行业",
  "你这数据传上来都觉得跌份儿",
  "老板看到你这数据，今晚加菜",
  "你这绩效，年终奖直接归零",
  "HR 已经把你工号拿出来抖三抖",
  "老板说不用你出方案了，他自己想",
  "你这 token 量，建议主动谈降薪",
  "老板的 OpenAI 账单一栏找不到你",
  // — prompt / 水平嘲讽 —
  "你这 prompt 一看就没读过书",
  "你的 prompt 比相亲简历还敷衍",
  "AI 都救不动你这水平",
  "AI 都用不明白，怎么混的",
  "你这 token 烧得跟你写的代码一样平庸",
  "你不是在用 AI，是在让 AI 看你瞎写",
  "你 prompt 写得跟提工单一样客气",
  "你跟 AI 对话像个外人，AI 也回得跟个外人",
  "你的 prompt 一句一逗号，AI 都断片",
  "AI 看你这问题，建议你去问百度",
  "你这水平，连 prompt 都要别人 review",
  "AI 都觉得你应该回炉重造",
  // — 厂商反向感谢 —
  "上桌就摸鱼，AI 厂商反手给你颁奖",
  "你这点 token 量，OpenAI 懒得给你画像",
  "给 OpenAI 送钱都送不到大门口",
  "Anthropic 财报里没你这一行",
  "AI 厂商不缺你这点钱，但你应该缺工作了",
  "GPT 看你这用量，主动给你退订",
  "OpenAI 把你列入「劝退用户」名单",
  "Anthropic 销售看到你，扭头去喝茶",
  "你这用量，OpenAI 服务器都没注意你登录过",
  "Cursor 团队为你开了讨论组：要不要清退",
  // — 通用酸言酸语 —
  "你这格局，AI 都带不动",
  "都什么时代了还不烧 token",
  "节俭过头叫抠门，到这份儿叫摆烂",
  "你这强度，AI 比你还闲",
  "建议你卸载这个 dashboard，省得我难受",
  "你这 token 数让我反思人生",
  "你这数据不是用量，是劝退说明",
  "你这 token 量在 dashboard 上显得很委屈",
  "看不下去了，你别再传数据了",
  "你这数据让 dashboard 都开始小心翼翼",
  // — 时代 / 行业焦虑 —
  "时代抛弃你的时候，连 token 都不愿意理你",
  "AGI 来的时候你大概率第一波被替换",
  "别人在卷 AI，你在卷工龄",
  "AI 进化得比你快，你这速度跟不上",
  "你这进度，被 AI 替代是迟早的事",
  "AI 不是来抢你饭碗的，是来收尸的",
  "AI 时代不缺懒人，缺的是肯烧 token 的人",
  "AGI 还没到，你已经掉队了",
  // — 简历 / 升职 / 加薪 —
  "你这 token 量写进简历都是减分项",
  "面试官看了你的 token 数，礼貌地结束了对话",
  "猎头看到你这个数，电话挂得比谁都快",
  "升职答辩你就拿这个 token 上 PPT 吗",
  "你这 token 量配不上你的 title",
  "建议你简历里别写「熟练使用 AI 工具」",
  "下次 1on1 你这个 token 量先解释下",
  "升职名单上没你，token 榜单上也没你",
  // — 摸鱼 / 划水 —
  "摸鱼摸到 token 都不发的地步，已经是行为艺术",
  "你这摸鱼水平，建议申报非物质文化遗产",
  "划水划到 dashboard 都嫌弃你",
  "你这种摸鱼，AI 替你打卡都打得不情愿",
  "你不是在工作，你在工位上养老",
  "你这 token 量，工时不到 1 小时是吧",
  "你的 dashboard 比 ChatGPT 的弹窗都安静",
  "工位还在，灵魂已经下班",
  // — KPI / OKR / 绩效复盘 —
  "你的 KPI 已经被 token 数出卖了",
  "OKR 没完成？看看你的 token 数就懂了",
  "你的 KPI 就这？建议提前发离职信",
  "你这 token 量，OKR 评级直接 P 0",
  "季度复盘你这一栏可以省了，没数据",
  "KPI 系统识别你这个用量都觉得耻辱",
  "OKR 写得跟散文一样，token 数写得跟段子一样",
  "你的 OKR 是「学会摸鱼」吧",
  "Token 不撒谎，撒谎的是你说的「最近很忙」",
  "再这么少烧下去，连摸鱼的资格都没了",
  // — 小红书风 —
  "姐妹这 token 数说出去丢人吗",
  "谁懂啊家人们，对面工位连 prompt 都不会写",
  "救命，又遇到一个 token 数低到尘埃里的",
  "凡尔赛文学：我也想烧 token，但 AI 嫌我穷",
  "刚刷到隔壁烧 10B，回头看自己……",
  "出片率 0，token 用量也 0，恭喜你",
  "姐妹这 token 数，AI 都不给你拍立得",
  "宝宝你这数据是给谁看的",
  "今日份废柴 token 用量打卡",
  "笔记标题：如何在大厂用最少 token 摸鱼第 100 天",
  "OOTD 没有，token 用量也没有",
  "刚加完班，对，是嘴上加完的",
  "工位拍照精致，token 数惨不忍睹",
  "求助贴：怎么让 AI 看到我这 token 数还继续陪聊",
  "姐妹来 D 一下这位的 token 数，是真的吗",
  // — 贴吧风 —
  "笑死，这 token 数还好意思上榜",
  "破防了，真有人 30 天就烧这点",
  "兄弟你不是装的吧",
  "勿喷，但是这 token 真的有点低",
  "刚才那个 token 上的吧友我还在笑",
  "支持一下，但是 token 少一点",
  "建议吧主精分，这 token 不配在我吧",
  "回首页吧",
  "兄弟，AI 圈不欢迎你这种",
  "技不如人，token 不如狗",
  "云用户实锤",
  "这 token 是云充值的吧",
  "顶不动，太抽象了",
  "破案了，他根本没在用 AI",
  "建议 ban，浪费 dashboard 资源",
  "顶起，让大家看看什么叫真摆烂",
  "顶顶顶顶顶顶不上去",
  "我严重怀疑你这 token 是模拟器跑的",
  "你这 token 数有点 cpu 了",
  // — 微博风 —
  "建议直接立法禁止这种 token 量",
  "建议拘留 24 小时",
  "建议直接给老板举报",
  "建议你这种员工开个专场",
  "天塌了，原来真的有人这么少",
  "笑不活了，这 token 数图我能存一年",
  "建议把这 token 量做成表情包",
  "这 token 数适合做反面教材",
  "转发这只 token，你这一周不会摸鱼",
  "建议拉条横幅警示后人",
  "建议 OpenAI 给你颁个『最佳节俭奖』",
  "建议你回家种田",
  "建议你重新检查工号",
  "原来真的有人能把 AI 用成这样",
  "原来 AI 还能这么省，长见识了",
  "微博热搜建议加这个 token 数",
  "建议 12345 接你电话先问问 token 数",
  // — 虎扑风 —
  "兄弟们这 token 数你们见过吗",
  "卧槽，这 token 是真人在跑吗",
  "JR 们评价一下，这 token 数算 nba 几号秀",
  "纯纯路人甲水平",
  "这 token 数连饮水机管理员都不配",
  "兄弟你这数据是不是搞错位数了",
  "兄弟你这 token，体测 100 米全场最慢",
  "看了你这 token，我退役了",
  "兄弟我替你尴尬",
  "兄弟你这 token 配不上你的 ID",
  "JR 别拦我，我想给他唱国歌",
  "下饭啊，token 数比下饭视频还下饭",
  "教练，他不会用 AI",
  "兄弟下去吧，下个赛季再来",
  "你这水平打 CBA 都嫌弃",
  // — 职场酸 / 通用追加 —
  "你这 token 量，HR 看了想给你换岗",
  "建议 P 字头改 N 字头：N 卷",
  "你这 token 数想 P6 升 P7？做梦",
  "你这种 token 量配不上你的 badge",
  "工号没换，态度没换，token 也没换",
  "建议你下午茶时间申请双倍",
  "建议老板给你换台没 AI 的电脑省点钱",
  "你这工位摆个仙人掌都比你活跃",
  "工卡都觉得贴你身上很跌份",
  "你这 token，CPU 都比你忙",
  "建议直接转岗保洁，至少有 KPI",
  "你这 token 数让团队配股都掉价",
  "建议团建别叫你了，省得拖累整体气场",
  "公司 wiki 里你的页面比 token 还冷清",
  "建议你下个月别开周会，省得 token 数被点名",
  "你这 token 数让 OKR 评审会议主动延期",
  "公司 dashboard 默认隐藏你这一行",
  "你的 token 数像 60 分万岁的那种",
  "你这 token 量在团队群里发出来都嫌不专业",
  "周报里你这 token 数自己都不好意思贴",
  "实习生都比你能造",
  "你这 token 量让见习生都开始指点你",
  "看了你的数据，HR 想重新审视你的 base",
  "AI 的事情交给真在用 AI 的人吧",
  "你这种用法，AI 都得寄个分手信",
  "你的 token 数比公司食堂的青菜还寡淡",
  "建议给你绩效改成『参与奖』",
  "工位摆放整齐，token 寥寥无几",
  "你这种 token 量，岗位描述里建议加『勿扰 AI』",
  "你这一周烧的 AI，够 ChatGPT 写一首打油诗",
  "建议简历上把『使用 AI』改成『路过 AI』",
  // — 群嘲 / 段子 —
  "AI 看到你都开始反思自己是不是太贵了",
  "你的 token 数已经是个段子素材",
  "你这 token 量做成 emoji 包能火",
  "你这种用户，AI 看你像电视机看 50 岁观众",
  "建议下次 token 不要凑整数，凑也凑不出",
  "AI 跟你聊天感觉自己在做志愿者",
  "你这种用法叫 AI 慈善",
  "你跟 AI 处对象，AI 都觉得你不上心",
  "AI 看你 token 数，感觉自己被冷暴力",
  "AI 加班的时候没排到你这一栏",
  "你这 token 量，AI 都开始劝你换专业",
  "AI 表示：算了，你忙吧",
  "你这 token，让 AI 觉得自己被冷落",
  "AI 都开始反向催你",
  "AI 给你写邮件都嫌字数多",
  "AI 已经给你打上『淡人』标签",
  "AI 看你 token 数：你确定不是网页爬虫吗",
  "AI 表示：哥们你是真没活儿",
  "AI 终于体会到了什么叫『空虚』",
  // — 摸鱼 / 工时 —
  "你工时填的飞起，token 像睡着了",
  "你的工时和 token 数是反比例函数",
  "上班 9 小时，AI 召唤 2 次",
  "上班看手机的时间比看 AI 多",
  "工时 8 小时，token 像 8 分钟",
  "工时考核优秀，token 考核稀烂",
  "工时表写得跟战报一样，token 数像阵亡名单",
  "工时填了，输出在哪呢",
  "你这工时是给空气填的吗",
  "你的 dashboard 比工时表还干净",
  // — 老板 / 高管视角 —
  "老板看了想把你这块业务外包",
  "老板说今年 OKR 把你这部分砍了",
  "你的 token 让老板对 AI 都失望了",
  "老板让你下周开始坐机房旁边",
  "老板说预算别给你了，留给真用的人",
  "VP 都开始过问你的 token 数",
  "总监周会拿你 token 数当背景音",
  "你这 token 量让 CEO 开始反思团队招聘标准",
  "老板说这种 token 量他自己都不好意思看",
  // — 厂商 / 模型方 —
  "Claude 看你 token，建议你试试 Bing",
  "GPT 看你 token 数，主动给你打折",
  "Gemini 看了你的 prompt，跑去给 Bard 上香",
  "DeepSeek 都觉得你不够格当他用户",
  "Qwen 把你列入观察名单",
  "Cursor 团队会议提到你都是 case study",
  "Codex 看了你 prompt 想集体罢工",
  // — 网络流行梗 —
  "你这数据，纯纯电子古董",
  "你这 token 量是 PV 还是 UV",
  "建议你这 token 数做 NFT",
  "你这 token 是不是被 ddos 了，连查都查不到",
  "你这 token 量是 web 1.0 水平",
  "你这 token 数让人想起拨号上网",
  "你这 token 数跟我 Windows XP 一样老",
  "你这 token 数像在 BB 机上跑的",
  "你这种用量，赛博菩萨在看",
  "你这种 token 数，赛博空间都嫌弃",
  // — 比较句 / 反差 —
  "你 token 烧的少，废话倒是多",
  "你 prompt 比代码还多，输出比鸟蛋还少",
  "你工位上的杯子换得比 token 还勤",
  "你换工位的速度比烧 token 还快",
  "你打卡比 prompt 快",
  "你 token 数比游戏机 BIOS 版本号还低",
  "AI 跟你聊天聊得比中老年聊天群还慢",
  "你 token 数比你简历上的项目数都少",
  "你 token 数跟你升职次数一样寒酸",
  "你 token 数比你年终奖系数还低",
  // — dashboard / 系统拟人 —
  "dashboard 看你这一行眼皮都不抬",
  "dashboard 都开始想给你定制空状态了",
  "dashboard 的图表替你委屈",
  "dashboard 显示『暂无数据』，我看其实是『暂无脸』",
  "数据库都不愿意给你建索引",
  "数据库读你这一行像读垃圾邮件",
  "你这条记录在 SQLite 里都嫌占空间",
  "服务器看你 token 量都开始考虑早点关机",
  // — 段位 / 游戏梗 —
  "AI 等级评估：青铜五",
  "你这 token 量，连白银都进不了",
  "你这种用户 ELO 都没你 token 高",
  "AI 训练数据排名你倒数",
  "你这种水平，AI 在 1v1 都让你三个 token",
  "AI 副本里你是替补的替补",
  "AI 工会通报：建议清退",
  "你这种 token 量，AI 圈段位定级失败",
  // — 杂项酸 —
  "建议你这 token 量改投煤气表",
  "你 token 用量比加油站滴漏还少",
  "你 token 用量像水龙头关不紧的那种漏",
  "你 token 量跟过期酸奶一样无味",
  "你这 token 量是给 AI 配置的咸鱼",
  "你 token 用量比公交月票还死板",
  "你这 token 量像北京沙尘，一阵就过",
  "你 token 数比脱发面积都收敛",
  "你 token 数比朋友圈点赞数还可怜",
  "你 token 用量像奶茶里那颗薄荷，可有可无",
];

const PRAISES = [
  // — 卷王 / 重度用户认证 —
  "卷王在此",
  "AI 重度依赖症典型样本，请勿打扰",
  "你这进度让同事压力山大",
  "硅基生命之友",
  "AI 厂商最喜欢的那种用户",
  "稳定输出，资本家最爱",
  "这才叫真把 AI 当生产力，不是当玩具",
  "卷王中的卷王",
  "你这强度，工位 7×24 营业",
  "AI 跟你一起加班，加得心服口服",
  "你这状态，AI 都怕你不睡",
  "看完你的数据，dashboard 自动竖大拇指",
  // — 钱货比颠覆 —
  "你的 token 用量在替全组发电",
  "再烧下去要被纳入年度财报了",
  "单月薅出一台 MacBook，神之化身",
  "已锁定本月加薪名额",
  "薅毛量已申报 OpenAI 优秀客户奖",
  "已被 OpenAI 列入「亏麻了」名单",
  "你一周烧的够一辆电动车首付",
  "API 价值比你月薪还狠",
  "薅得 OpenAI 财务半夜冷汗",
  "你这 ROI 老板看了想跟你合伙",
  // — 同事 / 厂商破防 —
  "AI 厂商财务半夜起来加班",
  "套餐部 OKR 因你集体破防",
  "同事打开你的 dashboard，回去重新写简历",
  "卷出新高度，AI 厂商销售跪求你下调",
  "同事看到你的 token 数，开始默默学 prompt",
  "OpenAI 把你拉入 VIP 群，群名「请高抬贵手」",
  "Anthropic CSM 周报里专门有你的章节",
  "AI 厂商运维监控你这一只 IP 的负载",
  "同事拉你进群求带飞",
  "全公司 dashboard 上你的进度条最长",
  // — 调侃式吹捧 —
  "别人 996，你 996 给 AI 当老板",
  "建议公司单独给你配台 H100",
  "OpenAI 看你日均 token 陷入沉思",
  "你这种用法叫做 AI 通灵",
  "你已经活成了 AI 厂商的目标用户画像",
  "AI 替你写代码写到凌晨，你还在加 prompt",
  "你不是程序员，你是 AGI 的人间代理人",
  "建议把你这个工位申报为生产力奇观",
  "AI 厂商看你的工位想搬台咖啡机过去",
  "你的 token 量已经能跑一次小型选举",
  // — 简历加分 —
  "下次简历直接写「AI 工具年度十大用户」",
  "猎头电话已经打到你工位",
  "面试官看到你的 token 数当场签 offer",
  "升职答辩可以省了，直接给你 P 加一档",
  "你这数据，能换大厂 SP offer",
  "简历挂出来，HR 排队找你",
  "猎头群里你就是行业活招牌",
  "你的 token 数已经是个职位描述",
  // — 老板视角 —
  "老板看到你这数据，决定给团队多招人",
  "老板说你这种员工再来 10 个都不嫌多",
  "老板把你的工位升级成独立办公室",
  "你这 ROI 让老板半夜笑醒",
  "老板在董事会上拿你的数据做 demo",
  "老板说预算线为你单独提一档",
  // — 厂商视角 —
  "OpenAI 提前给你寄了圣诞贺卡",
  "Anthropic 想请你做用户案例",
  "Cursor 想请你做封面用户",
  "OpenAI 客服把你设为「不敢得罪」标签",
  "AI 厂商的销售总监个人添加了你微信",
  "硅谷 VC 看你的 dashboard，准备投你",
  // — 小红书风 —
  "姐妹这 token 数我爱了",
  "你这 token 用量我家人看了都说牛",
  "求 D 求 D，这就是卷王本卷",
  "宝宝你这数据出片率拉满",
  "笔记标题：如何用 AI 烧出年终奖",
  "OOTD 不重要，token 量才重要",
  "刷到大佬，记得点赞",
  "刚跟同事说你 token 数，他全公司炫耀",
  "凡尔赛文学开篇：我们这种重度用户……",
  "宝子这一周烧的 AI，够我打三场嘴仗",
  "种草成功，要烧成你这种",
  "求复刻同款 prompt",
  "宝子这一周烧的 token，够我朋友圈晒三个月",
  "种草成功，求同款 prompt",
  "姐妹我对你只剩仰望",
  "刚跟我闺蜜安利了你",
  "OOTD 没拍，token 已经拉满",
  "宝子这种 token 量我服气",
  // — 贴吧风 —
  "兄 dei 真爹",
  "顶顶顶，让大家看看什么叫认真",
  "我宣布这是本月最佳",
  "实锤老六，AI 圈第一卷",
  "贴吧之光",
  "兄弟接好，这 token 数我先膜为敬",
  "兄弟你不是人，你是 AI 的儿子",
  "封神了",
  "破纪录，全吧顶礼膜拜",
  "建议加精，置顶一年",
  "封了，封了，封王了",
  "卷王无可争议",
  "顶礼膜拜，AI 圈第一狠人",
  "拜托收下我的膝盖",
  // — 微博风 —
  "建议直接给个院士",
  "建议媒体跟踪报道",
  "建议入选年度十大事件",
  "建议这 token 数申报世界纪录",
  "建议教科书收录",
  "建议把你拍成纪录片",
  "建议这种 token 量入选感动中国",
  "建议你做主流媒体的封面",
  "建议你竞选行业代言",
  "热搜建议加你这个 ID",
  "建议这种 token 量编成传记",
  "建议年度感动人物候选",
  "建议入选 AI 时代风云人物",
  "建议你接受央视采访",
  // — 虎扑风 —
  "兄弟这 token 数 MVP 实锤",
  "状元秀级别",
  "兄弟你这水平 nba 都拿不动",
  "JR 们鼓掌，这才叫卷王",
  "兄弟你这 token，全场最佳",
  "兄弟你这 token 数已经是名人堂级别",
  "兄弟你这 token 数比保罗助攻还稳",
  "兄弟你这水平虎扑必置顶",
  "顶配 MVP，无可挑剔",
  "兄弟下半场我替你举牌",
  // — 职场 / 老板视角 —
  "你这 token 量让团队配股都掉价（好的那种）",
  "你这种员工老板做梦都想再来 10 个",
  "你这种 token 量已经成为团队 KPI 锚点",
  "老板把你定为新的内推标杆",
  "VP 周报里专门留出一栏写你的进度",
  "全公司 OKR 评审都以你为模板",
  "HR 想用你的简历做内部培训",
  "老板说预算给你单独再加一档",
  "你的工位被列为内部参观点",
  "公司 wiki 首页置顶你的页面",
  "你的 OKR 完成度是其他人想都不敢想的",
  "团建直接以你为主角",
  "周会主持人开场就是『先看 XX 的进度』",
  "你的工号已经成了团队吉祥物",
  // — 厂商视角 —
  "Cursor CEO 想约你吃饭",
  "Anthropic 客户成功团队为你定制周报",
  "OpenAI 财务半夜起来对账",
  "Gemini PM 想找你做用户访谈",
  "DeepSeek 团队会议每周提到你三次",
  "Claude 把你设为优先级最高的用户",
  "Codex 的工程师专门维护你的 prompt",
  // — AI 段子 —
  "AI 看你 prompt 像看老朋友",
  "AI 加班的时候第一个想到你",
  "AI 在跟你互相成全",
  "AI 给你写邮件主动加签名档",
  "AI 看你 token 数都开始想请教",
  "AI 给你专门留了 token 预算",
  "AI 把你的 ID 写进 Easter Egg",
  "AI 群里你是 VIP，群名『请勿打扰大佬』",
  // — 网络梗 / 比较 —
  "你 token 数已经是赛博菩萨级",
  "你 token 数是 web 4.0 水平",
  "你这 token 量在 OpenAI 内部叫做『现象级』",
  "你 token 数比 GitHub trending 还火",
  "你这种用户像 Linux kernel maintainer",
  "你 token 数能跑一个小型联邦学习",
  "你这 token 数是行业风向标",
  // — dashboard / 系统拟人 —
  "dashboard 见你这一行直接全屏播放",
  "数据库专门为你优化索引",
  "服务器看你 token 量都开始多上 cpu",
  "Sentry 看你 token 数没报错，主动来道喜",
  // — 段位 / 游戏 —
  "AI 圈王者段位都嫌不够",
  "AI 段位评级直接超神",
  "你这 token 量 ELO 拉满",
  "AI 训练数据榜你领先三个身位",
  "AI 副本里你单刷 BOSS",
  "AI 工会通告：请向 XX 学习",
  // — 财务 / 估值 —
  "你的 token 估值已经能 IPO",
  "你这 ROI 让 VC 半夜来敲门",
  "你这 token 量已经超过一些 SaaS 公司收入",
  "你的 token 数是某些初创公司的活路",
  "AI 厂商的财报里你贡献了三位数",
  "你的 token 价值已经写进华尔街研报",
  // — 通用爆吹 —
  "你这 token 量，建议申请非物质文化遗产",
  "你这进度，已经超出地表速度",
  "你这种用户是 AI 时代的稀有矿",
  "你 token 数已成为业内传说",
  "你是 token 经济学里的常数",
  "AI 厂商的销售总监想跟你做朋友",
  "你的 dashboard 是新人入职第一课",
  "你这 token 量直接定义 SOTA",
  "你的 prompt 直接进了培训手册",
  "你这 token 量已经能影响 GDP",
  // — 续：行业地位 / 圈内传说 —
  "AI 进化论里你被写进里程碑章节",
  "你 token 量决定了团队下季度的扩招方案",
  "你这种用户老板做规划都按你来",
  "你的 prompt 已经在 OpenAI 内部传阅",
  "你这 token 量让 dashboard 默认放大显示",
  "你工位上的咖啡杯都开始有粉丝",
  "AI 客服把你拉成 7×24 优先级",
  "你的 token 数在硅谷已经是个 inside joke",
  "你这 token 数让全栈工程师都开始反思",
  "AI 看你的 prompt，准备给你出书",
  "你的 dashboard 已经被同行裱起来贴墙",
  "AI 厂商内推群里你是隐形 boss",
];

// pickFlavor — same pool, rotated by `rotation`. The step is chosen
// coprime to the pool size so 5 consecutive rotations yield 5 distinct
// indices. This is what makes the page guarantee a non-repeating
// taunt/praise for at least 5 page refreshes per row.
function pickFlavor(
  pool: readonly string[],
  seed: string,
  rotation: number,
): string {
  // Largest small prime that we know is coprime to both pool sizes
  // (which are intentionally not multiples of 17). Keep this in sync
  // when adding lines: avoid pool sizes that are multiples of 17.
  const step = 17;
  const base = hash(seed);
  const idx = (base + Math.abs(rotation) * step) % pool.length;
  return pool[idx];
}

function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

// Flip a user's "show me on the leaderboard" preference. Called from a
// server action triggered by the toggle on /leaderboard. We don't gate
// on isAdmin — it's the user's own row to manage.
export async function setShowOnLeaderboard(userId: number, show: boolean): Promise<void> {
  if (isCloudflareRuntime()) {
    const { setShowOnLeaderboardD1 } = await import("./cloudflare-leaderboard");
    return setShowOnLeaderboardD1(userId, show);
  }
  const db = openServerDb();
  try {
    db.prepare(
      `UPDATE users SET show_on_leaderboard = ? WHERE id = ?`
    ).run(show ? 1 : 0, userId);
  } finally {
    db.close();
  }
}

// Returns the display name for a row given the viewer. Honors the
// row's privacy preference: hidden rows show as `Anon #<id>` to
// everyone except the viewer themselves.
export function displayNameFor(
  row: LeaderboardRow,
  viewerId: number | null
): string {
  if (row.showOnLeaderboard || row.userId === viewerId) return row.username;
  return `Anon #${row.userId}`;
}

export function rowFlavor(
  row: LeaderboardRow,
  totalRows: number,
  period: LeaderboardPeriod,
  rotation: number = 0
): { text: string; mood: "praise" | "neutral" | "taunt" } {
  const isTop = row.rank <= Math.max(3, Math.floor(totalRows * 0.1));
  const isBottom =
    row.rank > totalRows - 3 || (row.totalCost < 1 && row.rank > 3);
  const seed = `${row.userId}|${period}`;
  if (isTop) {
    return { text: pickFlavor(PRAISES, seed, rotation), mood: "praise" };
  }
  if (isBottom) {
    return { text: pickFlavor(TAUNTS, seed, rotation), mood: "taunt" };
  }
  return { text: "", mood: "neutral" };
}
