# Growing Me · 用对话建立两层人生地图

Growing Me 把多轮对话和可视化地图放在同一个开源仓库里：AI 逐问探索，用户确认中心愿景、生活房间与长期方向；在克隆后的本地流程中，网站会呈现已确认的内容。它目前是 **shareable alpha**，适合演示和试用；完整移动端、无障碍与非作者用户的独立验收仍在进行，不宜称为成熟产品。

## 公开入口：先选一条路径

- [Growing Me 开始页](https://jianan-huang0609.github.io/growing-me-life-grid-starter/)——选择演示、复制 Prompt、下载 Skill 或打开空白起点；根页不再自动跳到案例。
- [打开完整 Example：房间长卷](https://jianan-huang0609.github.io/growing-me-life-grid-starter/monthly/?mode=example&view=rooms)——录视频建议直接用这个链接，不需要克隆。八个房间与长期方向是独立编写的**虚构教学案例**，不是作者真实数据的脱敏版。
- [打开 Blank：新用户的空白起点](https://jianan-huang0609.github.io/growing-me-life-grid-starter/monthly/?mode=blank&view=grid)——这是另一条独立链接，不会把 Example 的内容带进来。

Example 可以从长廊推门进入房间，点击一个方向打开工作台，临时修改目标、反面校准、输入、实践、输出、前进证据描述与回看，也可试填本月行动。修改只在当前页面可见：**刷新或重置即还原；导出仍是原始虚构案例，不包含试填。** 这适合展示交互，不是长期保存个人地图的入口，也不能把示例记录当作真实进展。

## 开始自己的地图：Prompt + Skill + 本地网站

想直接拿给 coding agent 试，可以在[开始页](https://jianan-huang0609.github.io/growing-me-life-grid-starter/)复制 Prompt，或阅读 [Prompt 原文](skills/growing-me-life-grid-monthly/references/life-grid-monthly-prompt.md)；想看完整访谈与安全写入规则，读 [Growing Me Skill](skills/growing-me-life-grid-monthly/SKILL.md)，或[下载完整 Skill 包](https://jianan-huang0609.github.io/growing-me-life-grid-starter/downloads/growing-me-life-grid-monthly-skill.zip)。Prompt 是对话入口，Skill 是访谈与写入规则；它们不会仅凭一段聊天自动把内容保存到公开 Example。

要让自己确认的地图持续保存在本机，并边聊边更新本地网站，在终端运行：

```bash
git clone https://github.com/Jianan-Huang0609/growing-me-life-grid-starter.git
cd growing-me-life-grid-starter
./start
```

把终端给出的 `/monthly/?mode=personal` 地址打开，在**这个仓库目录**中的 coding agent 会话里发送：

> 请先读取 `AGENTS.md` 和 `skills/growing-me-life-grid-monthly/SKILL.md`，再读取 `private/life-grid-monthly.json`。请从我的人生地图开始或继续访谈，一次只问一个问题；把归纳先作为候选，等我确认具体变化后再按 Skill 写入并回读私人文件。

无需先把 Skill 安装成插件：在仓库目录里让 agent 读取上述文件即可。若你用的 coding agent 支持本地 Skills，也可下载 ZIP，解压后把整个 `growing-me-life-grid-monthly` 文件夹放进它支持的 Skills 目录，再显式调用该 Skill；要更新这份网站，agent 仍须能访问你克隆的仓库与本地私人文件。

`./start` 在首次运行时创建空白的 `private/life-grid-monthly.json`，并只在本机启动网站。之后 agent 会先读取已有内容，避免反复从头问；每次保存都要经过用户对具体变化的明确确认。真实数据默认只在这个 Git 忽略的私人文件里，公开网站不能读取它。

如果暂时不能克隆，可以在公开开始页复制独立访谈 Prompt，与 AI 先聊出自己的候选地图。这是 **chat-only** 路径：AI 无法仅凭这段 Prompt 更新你本机的私人文件或公开网站。需要在网页查看结果时，先让 AI 取得网站 Schema 与当前完整地图，再经你明确确认后交付**完整合法 JSON**，手工导入 Blank；没有这些材料时先保留候选摘要，不把它冒充可导入文件。Blank 只在当前浏览器暂存，不会同步到本地 Personal，也不是跨设备备份，重要内容要自己导出。

## 三个入口的边界

| 入口 | 内容来源 | 是否会持续保存试填 |
| --- | --- | --- |
| Personal（`?mode=personal`） | 本机 `private/life-grid-monthly.json` | agent 在用户明确确认后更新私人文件；网站只读 |
| Example（`?mode=example`） | 独立编写的虚构案例 | 否；刷新还原，导出原始案例 |
| Blank（`?mode=blank`） | 首次打开为空 | 明确导入后只在当前浏览器暂存；需自行导出备份 |

三个入口共用一套界面，但数据严格隔离。公开仓库与部署只包含空白框架、虚构案例、Skill、Schema、代码和文档，不包含 `private/`。视频里可用 Example 展示“看全地图 → 推门进入房间 → 打开方向工作台 → 临时试填 → 刷新还原”，结尾再给观众 Prompt、Skill 与 Blank 链接。录制前请用 [`docs/RECORDING-QA.md`](docs/RECORDING-QA.md) 对照实际浏览器检查；不要宣称尚未验证的转场、恢复或长期回流已成功。

## 真正的闭环

Clone-first 主路径固定为：

```text
clone
  → ./start
  → agent 读取 private/life-grid-monthly.json
  → 多轮访谈，一次一个问题
  → 展示候选，等待用户明确确认
  → 重读最新 revision，只写确认内容
  → revision + 1
  → 校验完整地图并回读
  → 页面仍开启时，在 1–2 秒内刷新只读投影
```

“还不错”“可以想想”不等于确认。Agent 必须让用户知道准备写入什么，并在明确确认后才修改私人文件。如果用户明确要求保存未完成草稿，可以写成 `candidate`，但不能冒充 `confirmed`。

每次写入前，agent 都要重新读取当前文件。如果 revision 已变化，就先处理冲突，不能让旧上下文覆盖新决定。每次成功写入只增加一个 revision；只有结构校验通过、原子替换和文件回读结果都吻合后，agent 才能说“私人文件已更新并回读”。只有实际检查浏览器后，才能进一步说页面已经显示该 revision。

## 谁负责什么

| 部件 | 负责 | 不负责 |
| --- | --- | --- |
| Life Grid Skill | 开场、逐问、归类、候选生成、确认语义、文件写入协议 | 不替用户确认，不保存另一份地图 |
| Coding agent 会话 | 读取私人文件、访谈、展示候选、在确认后完成一次受控写入与回读 | 不扫描其他会话，不自动创建项目或后台任务 |
| `private/life-grid-monthly.json` | 当前人生地图的唯一权威、稳定 id、revision | 不进入 Git，不公开部署 |
| 本地网站 | Personal 只读呈现；Example 保持原始虚构样本不变，但可在方向工作台及本月行动里临时试填、刷新还原；Blank 可手工导入、在当前浏览器暂存并导出；提供双视图和同步错误提示 | 不直接改私人文件，不将 Example 试填持久化，不要求第二次确认，不成为另一份 Personal 权威 |

网站遇到暂时损坏或不合法的私人文件时，应保留最后一次合法画面并提示错误；文件修复后自动恢复。刷新页面后仍以私人文件为准。

## 产品阶段顺序

Growing Me 先把地图做好，再连接更复杂的系统：

1. **中心愿景与最多八个一级房间**：从用户原话形成彼此可区分的生活领域。
2. **每个房间的第二层方向**：先形成自然出现的少数高置信候选，经用户校准后最多八项。
3. **全局自省**：检查遗漏、重叠、空泛词，以及指标、工具和项目是否占错层。
4. **双视图与八种房间语法**：同一模式中的同一份数据同时进入两层九宫格和房间长卷；不同房间可以用登山路线、创作画廊、知识实验台、生命树、共同生活之书、账本与桥、生活收藏屋、关系相册等空间语法。
5. **小规模运行层**：只选少量月度重点、行动和真实记录，不把 64 个方向变成 64 项打卡。
6. **以后再设计连接**：Agent、跨 Session、Codex 项目、OpenClaw、Wiki、账号、云同步与远程写入不属于当前 clone-first 切片。

八格是上限，不是填表 KPI。没有谈到的内容可以空白；视图和动画不能反过来替用户创造人生内容。

## 两种视图，同一份数据

```text
人生总盘：中心愿景 + 8 个人生房间
  └─ 打开一个房间
       └─ 第二层：这个房间最多 8 个长期方向
            └─ 以后运行：少量本月行动与真实记录
```

- **两层九宫格**用于快速看全、比较和校准。
- **房间长卷**用八种不同空间语法帮助用户进入一个生活领域。
- **方向工作台**查看一个长期方向的目标与后续记录。

在 Personal 模式中，三者读取同一份私人地图，不维护平行副本；Example 与 Blank 复用相同呈现逻辑，但绝不混用数据。64 个位置是长期坐标系，不是 64 项同时推进的任务。一个方向可以告诉用户“持续观察什么、练习什么、留下什么证据、何时复盘”，本月只需选择少量行动。

## 数据与确认边界

当前格式版本是 `1.2.0-monthly`：

- `meta.revision`：非负整数；每次成功写入恰好加一。
- `center`：未来三到五年的中心愿景。
- `dimensions`：最多八个人生房间。
- `support_factors`：每个房间最多八个长期方向，不是待办。
- `scene_id`：房间空间语法，只控制呈现，不决定人生内容。
- `periods[].todos`：后续月份行动。
- `todo.direction_id`：仅在行动明确承接同房间的长期方向时使用。
- `source_quote`：用户原话；AI 概括写入 `summary`。

方向状态为 `raw`、`candidate`、`confirmed`、`retired`。计划、完成状态和真实记录必须分开；AI 建议不能自动变成经历或完成证明。

Schema 位于：

- [`monthly/life-grid-monthly.schema.json`](monthly/life-grid-monthly.schema.json)
- [`skills/growing-me-life-grid-monthly/references/life-grid-monthly.schema.json`](skills/growing-me-life-grid-monthly/references/life-grid-monthly.schema.json)

格式校验只能证明 JSON 可读，不能证明人生判断真实；用户的明确确认才是语义确认门。

## 没有文件权限时的兼容方案

普通 chat、远程环境或受限 agent 无法访问仓库文件时，才退回完整 JSON：

1. 用户把当前完整地图提供给 AI；
2. AI 完成对话并等待明确确认；
3. AI 输出一份保留旧字段和稳定 id 的完整 `life-grid-monthly.json`；
4. 用户手工导入网站并自行导出备份。

这只是兼容和备份路径。可以访问本地文件时，不应要求用户在每轮复制整份 JSON，也不应让浏览器 localStorage 与私人文件同时成为权威。

公共托管版本没有本机文件访问能力：Example 可在当前页面临时修改、补入方向工作台各板块内容，并辅助试填本月行动；刷新即还原，导出仍是原始虚构案例。Blank 可导入并在当前浏览器暂存、导出完整 JSON，再引导用户克隆到本地进入 Personal 流程。公共构建不包含 `private/`；浏览器暂存不是 Personal 的第二份权威，也不是跨设备备份。

## 隐私边界

`.gitignore` 会排除 `private/`。真实健康、关系、财务、家庭资料，以及其他会话全文、Cookie、Token、密钥和远程凭据，都不应进入仓库、构建目录、截图或日志。

本地只读接口只允许 loopback 访问，并且不能把 `.git/`、`private/` 或任意本机路径作为静态文件暴露。私人地图发布、账号系统、跨设备同步和远程写入均不在当前范围内。

## 项目结构

```text
start                               clone-first 启动入口
private/life-grid-monthly.json      本机唯一私人地图，Git 忽略
templates/blank-life-grid-monthly.json
                                    首次启动使用的空白模板

monthly/
  index.html / styles.css           两层九宫格与八个房间
  app.js / model.js                 私人文件只读投影、案例工作台与行动试填、数据归一化
  life-grid-monthly.schema.json     页面数据契约

skills/growing-me-life-grid-monthly/
  SKILL.md                          Coding agent 入口
  references/                       对话、访谈、输出契约与 Schema

scripts/start-local.mjs             无第三方依赖的本地只读服务
scripts/build-static.sh             公共静态构建；不得包含 private/
tests/                              公开数据边界与本地服务检查
```

当前产品主路径与房间体验以 `/monthly/` 为准。公开仓库从审核过的文件白名单生成，不包含开发仓库较早的原型、私人文件或旧 Git 历史；后续更新也应继续检查公开文件边界。

项目以 [MIT License](LICENSE) 开源。公开模板可以复用和改造；用户填入的私人地图仍只属于用户本人，不随代码授权或发布。

## 验证

最小可运行检查：

1. `./start` 只绑定 loopback，并能打开 `?mode=personal`。
2. `?mode=example` 显示完整虚构地图；可进入房间和方向工作台，在目标、反面校准、输入、实践、输出、前进证据描述与回看板块修改或补入内容，并辅助试填本月行动；刷新或重置后回到原案例，导出仍是原始案例；不会请求私人 API、写入私人文件或浏览器存储。
3. 新浏览器首次打开 `?mode=blank` 时严格空白；导入后只读取 Blank 自己的浏览器暂存，不出现 Example 卡片、私人文件或上一入口残留。
4. Personal 在合法文件更新后读取新 revision；遇到非法文件时保留最后合法画面；修复后恢复。
5. 分别打开三个独立入口并刷新时不串数据；页面不依赖一个可见的全局模式切换器；导出、键盘与移动端路径分别检查。
6. Skill 包可解压，公共构建不含 `private/`，公开快照也不带开发仓库旧历史。

基础检查：

```bash
node --check monthly/app.js
node --check monthly/model.js
node --check scripts/start-local.mjs
node --test \
  tests/public-release.test.cjs \
  tests/local-server.test.cjs
```

验证私人文件能被月度模型读取：

```bash
node -e "const fs=require('node:fs');const model=require('./monthly/model.js');model.assertCanonicalMonthly(JSON.parse(fs.readFileSync('private/life-grid-monthly.json','utf8')));console.log('life-grid canonical')"
```

重建并检查 Skill 包与公共构建：

```bash
sh scripts/package-monthly-skill.sh
unzip -t downloads/growing-me-life-grid-monthly-skill.zip
sh scripts/build-static.sh
find dist -path '*private*' -print
```

最后一条应没有输出。测试通过、构建成功或远端提交存在，都不能替代一次真实流程验证：fresh clone → `./start` → 写入 revision 更高的合法私人地图 → 网站自动刷新 → 非法 JSON 时保留最后合法画面 → 修复后恢复。
