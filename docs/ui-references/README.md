# UI 参考库（用于 tokenusage 大改版）

10 张候选，覆盖三类参考来源：
1. **直接对位**（LLM 可观测/计费类）：Helicone、Langfuse
2. **设计标杆**（产品 UI 美学的天花板）：Linear、Vercel、Stripe、Resend
3. **真·数据仪表盘**（与 tokenusage 形态最像）：Plausible、PostHog、Grafana、Tinybird

| #  | 项目       | 类别        | 关键看点                                                                |
|----|-----------|-------------|------------------------------------------------------------------------|
| 01 | Linear    | 设计标杆    | 极简侧栏、深色高对比、AAA 级排版、留白节奏                            |
| 02 | Vercel    | 设计标杆    | 黑白主调、强 logotype、卡片堆叠、密度合理                              |
| 03 | Stripe    | 设计标杆    | 渐变光感、数据卡片、精致动效（站点 hero）                              |
| 04 | Plausible | 数据仪表盘 ★ | 真实 live demo：顶部 KPI 条 + 大图表 + 双栏列表，**与 tokenusage 同形态** |
| 05 | PostHog   | 数据仪表盘    | 朋克插画 + 严肃图表的反差风格                                          |
| 06 | Grafana   | 数据仪表盘 ★ | 经典深色监控盘，密度极高，标杆中的标杆                                 |
| 07 | Helicone  | LLM 对位 ★  | YC 系 LLM 可观测，柔粉/蓝主色、卡片有圆角投影                          |
| 08 | Langfuse  | LLM 对位    | 开源 LLM tracing；这次只抓到了文档页（cookie banner 挡了首页）         |
| 09 | Tinybird  | 数据仪表盘    | 数据基础设施的高级品牌感、深色高饱和度                                 |
| 10 | Resend    | 设计标杆    | 开发者向产品的"性冷淡"美学典范、字体节奏极佳                          |

★ = 与我们项目形态最直接对位

## 你怎么选

回我一个数字（或多个）：「选 04」「04+06+10 混搭」「都不行，加点 X」。

选完后我会：
1. 拿那张图（或那个站）反编译 design tokens：色板、字号阶梯、行高、间距 scale、圆角、阴影、动效曲线
2. 落到 `src/app/globals.css` 或 tailwind 配置
3. 改造 `src/app/page.tsx` 等关键页面
