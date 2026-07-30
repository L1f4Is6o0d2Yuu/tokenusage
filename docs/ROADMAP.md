---
name: tokenusage roadmap
description: 工作中文档（living doc）。当前迭代规划、待办任务、技术决策记录。每完成一项划掉，每识别新坑就加。
owner: roy
last_updated: 2026-05-21
status: active
---

# tokenusage 产品路线图

这是 **工作文档**，不是 marketing 用的 changelog。改动随时发生，提交一律带 `docs(roadmap):` 前缀方便追踪。已发版功能去看 `git log`，这里只记**还没做完**或**正在规划**的事。

---

## v0.28 — 轮询改推送（已完成）

**背景**：Cloudflare 一天 5.8 万请求，曲线全天几乎持平——典型的机器心跳，不是人。

拆下来主要是三块：

| 来源 | 改之前 | 改之后 |
|---|---|---|
| agent 长轮询 `/api/sync-wait` | 950 请求/天/agent（Node，靠服务端 hold 90s 限速）<br>**79,000 请求/天/agent（Workers，handler 立即返回，只剩 `sleep 1`）** | 0（空闲机器完全不发请求） |
| 每次 dashboard 打开自动同步 + 1Hz 轮询 `/api/sync-status` | 每次打开十几~几十个请求 | 取消自动同步；轮询降到 3s、隐藏标签页暂停 |
| `/install` 页 8s 自动刷新 | 450 请求/小时/标签页，无限期 | 30s，隐藏暂停，15 分钟后停 |

**新架构**：agent 每 30 秒扫一次本地源目录（`find -newer` 比对 `~/.tokenusage/last-sync.marker`，纯本地、零网络），
有变化才调 `POST /api/agent-checkin` 然后上传；否则每天签到一次。手动同步走排队——服务端记 `sync_requested_at`，
agent 下次签到时消费；要立刻同步就在本机跑 `tokenusage sync`。

**D1 写入才是真正的天花板**：免费额度 100k 行写入/天，而改之前每个 agent 请求要写 2 行
（`api_tokens.last_used_at` 无条件写 + `users.agent_version` 无条件写）。现在心跳每天最多写 1 次，
只有真实推送/手动同步才 force 写；`agent_version` 改成读后比对、值变了才写。

**兼容性**：`/api/sync-wait` 不能直接删也不能改成快速失败——老 agent 唯一的限速就是服务端那 90 秒 hold，
一旦快速返回它们会退化成 1 秒 1 次。所以两个 runtime 都保留 hold，等 agent 版本滚过 v0.28 再删。

**遗留**：`sync_requested_at` 只能在 agent 下次签到时送达，机器空闲时最长可能等到第二天的心跳。
真要秒级下推得上 Durable Object（每用户一个 DO + WebSocket），当时评估后没做。

---

## 0. 起因 / 为什么有这份文档

**2026-05-21 事件**：用户 `pipixiafacai2@gmail.com` 点击同步，前端进度条变红 5 秒后自动消失，用户和管理员都没拿到任何有效信号。

排查链路后定性：
- 服务端架构自 v0.27 起改为 **pull-based**——用户点同步 → server 写 `sync_requested_at` → 等 agent 长轮询 `/api/sync-wait`
  （v0.28 起改为 **push-based**：agent 监听本地文件变化后主动上传，`/api/sync-wait` 降级为老 agent 的兼容层，详见下方 v0.28 段落）
- 该用户的 agent 自 **2026-05-14 07:18 起从未与服务端通信**（`api_tokens.last_used_at` 卡住）。原因大概率是 Mac 重启后 agent 进程没自动起
- **服务端拿不到任何失败信号**：因为 agent 根本没来，所以 `audit_log` 里没失败记录；前端只能靠固定 60s 超时盲判，且 5s 后自动复位
- **管理员看不出哪些用户的 agent 已死**：成员表只显示 IP/Joined，没有 last-seen / agent version

这暴露三类系统性缺陷，下文按优先级展开。

---

## 1. 优先级矩阵

| Pillar | 主题 | 版本目标 | 状态 |
|---|---|---|---|
| **P0** | 可观测性 & 用户自救 | 本轮（无 agent 改动） | 🟡 进行中 |
| **P1** | 上传可靠性重构（NDJSON 流式） | v0.28 | ⚪ 规划中 |
| **P2** | Agent 端持久性（LaunchAgent / watchdog / 退避重连） | v0.29 | ⚪ 待评估 |
| **P3** | UX / 文案打磨 | 持续 | 🟢 滚动进行 |

P0 本轮全部做完，P1/P2 单独立项发版。

---

## 2. P0 — 可观测性 & 用户自救

**目标**：管理员能一眼看出谁掉线，普通用户能自己发现自己掉线，所有失败都留痕。

### TU-OBS-01 — 成员表加 `Last seen` + `Agent 版本` 列
- **背景**：admin 现在只能看到 Last IP / Joined，看不到谁的 agent 还活着
- **改动**：
  - `listUsers()` 增加 `lastSeenAt`（取 `MAX(api_tokens.last_used_at)` per user）和 `agentVersion`（已有字段 `users.agent_version`）
  - `/users` 页面成员表加两列；Last seen 用相对时间 + 颜色点（绿 <5min / 黄 <24h / 灰 >24h / 红 >7d）
  - i18n key 加 `columnLastSeen`、`columnAgentVersion`
- **验收**：admin 进 /users 能立刻看到 `pipixiafacai2` 是灰点 + "7d ago"
- **状态**：⚪ 待开工

### TU-OBS-02 — 上传失败落 `audit_log`
- **背景**：`/api/upload` 的 catch 路径目前只 `console.error` + 返 JSON 给客户端，**失败永远不会进 audit_log**——所以 audit 里只有成功的样本，对排查 0 用
- **改动**：
  - `src/app/api/upload/route.ts` 的 catch 块加 `recordAudit({ action: "upload_failed", meta: { reason, bytes, agentVersion, ... } })`
  - 新增 action 类型：`upload_failed`、`sync_requested`、`agent_pull`（agent 拉到任务时记一条）
- **验收**：手工触发 413 / 500 / tar 解压失败，都能在 audit_log 里查到
- **状态**：⚪ 待开工

### TU-OBS-03 — Admin 用户日志页 `/users/[id]/log`
- **背景**：现在没办法看一个用户的事件流，只能 sqlite3 直连
- **改动**：
  - 新页面 `src/app/(app)/users/[id]/log/page.tsx`，admin-only，倒序展示该用户最近 50/100 条 `audit_log`，meta JSON 可展开
  - 成员表每行加 "Logs" 链接
  - 顺手把 user 的 `lastSeenAt` / `agentVersion` / `lastUploadedAt` / `syncRequestedAt` 摆头部，作为快速摘要
- **验收**：点 `pipixiafacai2` 的 Logs 链接能看到他今天 10:17 的 sync_requested 但没有任何 upload / upload_failed 跟进
- **状态**：⚪ 待开工

### TU-OBS-04 — Dashboard "agent 离线"横幅
- **背景**：用户根本不知道自己的 agent 死了；他点同步等结果，结果是石沉大海
- **改动**：
  - dashboard 首屏顶部，如果 `now - lastSeenAt > 24h`，渲染红色横幅 "你的 agent 已经 X 天没上报了，[点这里看如何修复 →]"
  - 链接落到 `/install#troubleshoot`（新 anchor）
- **验收**：以 `pipixiafacai2` 身份登录能立刻看到横幅
- **状态**：⚪ 待开工

### TU-OBS-05 — 同步按钮的前置在线检查
- **背景**：现在点同步根本不检查 agent 是否在线，发完就傻等 60s
- **改动**：
  - `SyncControl` 触发前 fetch `/api/sync-status`，如果 `now - lastSeenAt > 5min`，直接 `sonner toast` "agent 不在线，请检查本机进程"，不发请求
  - `sync-status` 端点返回字段增加 `agentLastSeenAt`
- **验收**：离线用户点同步立刻看到 toast，不会进 60s 假等待
- **状态**：⚪ 待开工

### TU-OBS-06 — SyncControl 用 `uploadStartedAt` 替代固定 60s 超时
- **背景**：`uploadStartedAt` / `uploadTotalBytes` 已经在数据流里了（`sync-state.ts:15-16`、`/api/upload-progress`），但 `SyncControl` 没用——所以 300MB 的健康首传到 60s 就被误判为失败
- **改动**：
  - `src/components/sync-control.tsx` 的 poll 循环读 `uploadStartedAt` / `uploadTotalBytes`
  - 超时改为弹性：只要 server 看到 agent 正在传，按 `bytes/s` 估算总耗时，没到估算时长不触发 timeout
  - 进度条 progress 改为读真实进度（已传 bytes / 总 bytes）而不是时间假爬
- **验收**：模拟 200MB tar，bar 不再红，且数值合理
- **状态**：⚪ 待开工

### TU-OBS-07 — Telegram 告警接 `upload_failed` + 长期离线
- **背景**：现在只有容器健康挂掉才告警，业务层失败完全静默
- **改动**：
  - `recordAudit` 看到 `action === "upload_failed"` 时调 Telegram bot 推一条
  - 新增 cron（或 server-side 定时器）：每天扫一次 `lastSeenAt > 7d` 的 active user，汇总推一条
- **验收**：故意让一次 upload 抛错，5s 内收到 TG 通知
- **状态**：⚪ 待开工

### TU-OBS-08 — UI 错误态持久化
- **背景**：`SyncControl` 的 timeout 5s 后自动清掉，用户没盯着就错过
- **改动**：
  - timeout / failed 状态不自动消失，改为可手动 dismiss 的 sonner toast + 持久 "重试" 按钮
  - 配合 TU-OBS-02 的失败 audit，toast 上展示具体原因（"agent 未响应" / "服务端 413: payload too large" / "tar 解压失败"）
- **验收**：失败后用户离开页面再回来还能看到上次失败提示直到 dismiss
- **状态**：⚪ 待开工（依赖 TU-OBS-02）

---

## 3. P1 — 上传可靠性重构（v0.28）

**目标**：彻底摆脱"500MB 整包 tar"模型，改成可续传、可观察、可分片的流式协议。

### TU-UPLOAD-01 — NDJSON 流式上传协议
- **背景**：当前协议把整个 `~/.claude/projects`、codex sessions、hermes.db 打成一个 tar.gz 整包 POST，撞 Cloudflare 100MB body cap、500MB MAX_BYTES、60s 网络抖动就要重传一切。v0.26 的 slim 把 300MB → 15MB 治标不治本
- **新协议**：
  - Agent 端解析 JSONL，**只把 `UsageRecord[]` 序列化成 NDJSON 流**，每条一行 JSON
  - `POST /api/upload/ndjson`，server 端 `for await (chunk of body)` 上来一条 upsert 一条
  - Agent 维护 cursor `{lastIngestedAt, providerCursors}`，每条 ack 后推进；下次续传从 cursor 开始
  - 无整包概念，每条记录几百字节，不撞任何 body cap
- **要做的事**：
  - 服务端 `/api/upload/ndjson` 路由（流式 reader）
  - 服务端 `audit_log` 增加 `ndjson_chunk`、`ndjson_complete` 行为
  - 客户端 cursor 表 `upload_cursors`（per-user, per-provider, last_external_id, last_ingested_at）
  - Agent 端 hermes / codex / claude-code 三个 parser 搬到 agent 仓库
  - 协议 versioning header `X-Upload-Protocol: ndjson-v1`
  - 兼容期：server 同时支持 tar.gz（v0.27 老 agent）和 ndjson（v0.28+）
- **验收**：
  - 网络断 5s 重连续传不会丢/重数据
  - 单条上传从 100MB 量级 → 单条 <1KB
  - audit_log 能展示每个 chunk 的进度
- **状态**：⚪ 规划中
- **预估**：agent 端 1 天 + server 端 1 天 + 灰度发版 1 天

### TU-UPLOAD-02 — Agent 仓库提取 parsers
- **背景**：当前 hermes / codex / claude-code 三个 parser 跑在 server，**因为 agent 只上传原始文件**。NDJSON 协议要求 agent 端 parse
- **改动**：
  - `src/lib/adapters/*` 三个 parser 提取成独立 npm 包 `@tokenusage/adapters`（或 monorepo workspace）
  - server 和 agent 共享同一份依赖
- **状态**：⚪ TU-UPLOAD-01 的子任务

### TU-UPLOAD-03 — 老 agent 强制升级路径
- **背景**：tar.gz 协议过渡期不能太长，否则 server 要维护两条路径
- **改动**：
  - Dashboard 检测到 `agentVersion < 0.28` 时给软提醒 "建议升级"
  - 90 天后改为硬提示
  - 180 天后下线 `/api/upload`（tar.gz），只保留 ndjson
- **状态**：⚪ 待评估

---

## 4. P2 — Agent 端持久性（v0.29）

**目标**：用户重启 Mac 不需要管，agent 自己醒过来；agent 崩了 30s 内自己起。

### TU-AGENT-01 — LaunchAgent 自动安装 + KeepAlive
- **背景**：现在 brew 路径装了 plist，但非 brew 路径（脚本一键装、手动跑）的人**不会**有 LaunchAgent
- **改动**：
  - 所有安装路径统一调用 `install-launchagent.sh`，生成 `~/Library/LaunchAgents/online.tokenusage.agent.plist`
  - plist 必含 `KeepAlive=true`、`RunAtLoad=true`、`StandardErrorPath` 指到 `~/.tokenusage/logs/agent.err`
- **验收**：`pkill -9 tokenusage-agent` 后 30s 内自动起；重启 Mac 不需要手动操作
- **状态**：⚪ 规划中

### TU-AGENT-02 — 指数退避重连
- **背景**：长轮询断了一次可能就不再重试，今天的 case 一部分原因是 agent 失联后没人主动复活它
- **改动**：
  - 长轮询失败后 `delay = min(1s * 2^n, 5min)` 退避
  - 连续失败 12 次（约 1 小时）打日志 + 上报
- **状态**：⚪ 规划中

### TU-AGENT-03 — Agent 自检接口
- **背景**：用户找我们 debug 时基本只能靠 ssh 上他机器看日志，太重
- **改动**：
  - Agent 暴露本地 `localhost:7331/diag`（仅本机可访问）
  - 返 JSON：版本、上次 sync 时间、上次错误、本地 db 大小、launchctl 状态
  - dashboard `/install#troubleshoot` 教用户怎么贴这段输出过来
- **状态**：⚪ 待评估

---

## 5. P3 — UX / 文案打磨（持续）

滚动进行，本节只记**当下在改的**。已合并的回去看 `git log --grep='copy('`。

### TU-COPY-01 — 套餐区文案
- **状态**：✅ 完成（commit pending），标题改为 "月费还在自动续，你真用够本了吗"。tagline 暂保留原版。

### TU-COPY-02 — Onboarding "你的 agent 还活着吗" 提示
- **背景**：配合 TU-OBS-04 横幅，install 页要有对应的 troubleshoot 段落
- **改动**：
  - `/install` 页加 anchor `#troubleshoot`，列三种常见死法 + 复活命令
- **状态**：⚪ 待开工

---

## 6. 开放问题 / 未决（不承诺时间）

- **多区域 Caddy failover**：当前单点（107.175.224.212）。如果服务器挂，所有 agent 长轮询都会 timeout
- **Per-token rate limit**：现在按 IP 限，多个用户共享出口 IP（公司 / 家庭网络）会被误伤
- **Token rotation**：api_token 当前永不过期。建议加 90 天滚动 + 主动 revoke 入口
- **Agent pause/resume 从 agent 侧触发**：现在只能 dashboard 暂停；agent 端没有"我要停一下"的入口
- **审计日志保留策略**：audit_log 现在无限增长，需要定 retention（建议 90 天热数据 + 冷归档）

---

## 7. 决策记录（ADR-lite）

每次做了不直观的取舍记一条，避免下次自己看不懂。

### 2026-05-18 — pull-based vs push-based 同步
- **决策**：v0.27 改 pull
- **理由**：push 模式（agent 定时上传）下，用户改完代码立刻看 dashboard 永远是旧数据；pull 模式 dashboard 触发后秒级生效
- **代价**：agent 必须长在线，离线即静默失败 → 催生了 P0 全部任务

### 2026-05-12 — share PNG 客户端渲染
- **决策**：分享海报全部 html-to-image 在浏览器渲染，server 不参与
- **理由**：避免 server 跑 puppeteer / playwright 的内存压力；CJK 字体打包到客户端一次解决
- **代价**：浏览器 CPU 高一点；ios safari 历史有兼容坑（已修）

### 2026-05-11 — 客户端 aggregation
- **决策**：dashboard 的聚合 SQL → 改为客户端 worker
- **理由**：让 server 只做 ingest，dashboard 完全静态化方便缓存
- **代价**：首屏要拉全量原始数据，大用户首屏慢（已加 skeleton 缓解）

---

## 8. 怎么用这份文档

- **加任务**：在对应 Pillar 下新增一项，TU-XXX-NN 编号连续
- **改状态**：⚪ 待开工 / 🟡 进行中 / ✅ 完成 / ❌ 砍了
- **完成后**：保留条目 + 标 ✅ + 写实际 commit hash 在末尾，方便回溯。**不要删**
- **每周一次**：扫一遍未完成项，把"已经不重要的"标 ❌ + 一行原因
