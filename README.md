# Growing Me · Clone-first 两层人生地图

Growing Me 是一个可以直接克隆到本地的 **AI 多轮访谈 + 人生地图可视化** 模板。Coding agent 读取仓库内的 Skill，和用户逐轮确认中心愿景、八个人生房间与每个房间的长期方向，并把结果写入本机的私人地图文件。已经打开的网站会自动读取该文件并刷新。

公开仓库只保存空白框架、虚构演示、Skill、Schema、代码、测试与部署说明；真实人生数据默认留在本机，不进入 Git。

当前阶段是 **shareable alpha**：核心对话、私有文件与双视图路径已经形成，但仍需要完整三模式回归、无障碍与移动端核验，以及非作者用户的独立试用。这里不把“能运行”描述成“已经成熟”。

## 一套引擎，三种体验

三个独立入口共用同一套界面引擎、Schema 和房间逻辑，但数据来源严格隔离：

| 模式 | 地址参数 | 数据来源 | 用途与边界 |
| --- | --- | --- | --- |
| Personal | `?mode=personal` | 本机 `private/life-grid-monthly.json` | 真实个人版本；网站只读，只有 coding agent 在用户明确确认后才能更新私人文件 |
| Example | `?mode=example` | 独立编写的完整虚构案例 | 教学与展示；八个房间和 64 个长期坐标均已填充；只读，不是作者或试用者资料的脱敏版，也不证明真实使用效果 |
| Blank | `?mode=blank` | 首次打开为空的起点 | 展示新用户尚未对话、尚未导入时的状态；导入后仅在当前浏览器保存，不借用 Example 或 Personal 的内容 |

这不是三个会逐渐漂移的仓库，也不是一个页面上的三个切换标签。Personal 是个人数据投影，Example 是自成一体的只读教学样本，Blank 是独立的新用户起点；用户从各自链接进入，页面不放一个醒目的全局模式切换器。Blank 的浏览器暂存不能变成 Personal 的权威文件；Example 不读取或写入任何个人地图。

当前公开打磨优先完整 Example：用户进入后直接看完一个内容完整的虚构案例，不在案例中插入 Blank 模板 CTA 或初始化选择。Blank 留给真正准备开始的新用户单独打开。

## 立即开始

```bash
git clone https://github.com/Jianan-Huang0609/growing-me-life-grid-starter.git
cd growing-me-life-grid-starter
./start
```

`./start` 会在需要时从空白模板初始化：

```text
private/life-grid-monthly.json
```

然后在仅本机可访问的地址启动网站。打开终端显示的 `/monthly/?mode=personal` 地址，再在当前仓库的 coding agent 会话中说：

> 请读取 `skills/growing-me-life-grid-monthly/SKILL.md`，从我的私人地图继续访谈。

第一次使用时，agent 会从“未来三到五年，你真正想过怎样的生活？”开始；继续使用时，它会先读取已有地图与 revision，再从尚未确认的部分继续。

空白私人地图不会预先替用户填写答案。要先了解完成后的颗粒度，可以打开虚构教学案例：

```text
http://127.0.0.1:4178/monthly/?mode=example&view=rooms
```

其中八个房间、64 个方向和三件当月行动均由项目独立编写，属于虚构教学情境；它不是作者真实地图的脱敏版，也不是实际用户完成了行动的证据。可以用它体验两层九宫格、房间长卷与方向工作台；Example 不会读取、覆盖或写入私人地图。新用户的空白起点则使用：

```text
http://127.0.0.1:4178/monthly/?mode=blank
```

Blank 第一次打开时没有预设的生活答案。页面上的“复制给 Coding Agent”目前优先引导用户克隆仓库、运行 `./start`，再进入 Personal 的私人文件流程；它**不会**自动把 Personal 文件同步回 Blank。只有 agent 无法访问本地文件、因而交付了经用户确认的完整 JSON，或用户已有完整 JSON 时，才在 Blank 手工导入查看。导入后的内容只暂存在**当前浏览器**。刷新或再次打开同一浏览器可能继续看到它，但换设备、清理浏览器数据或改用其他浏览器都可能失去这份暂存，重要内容应自行导出 JSON。不要把浏览器暂存当作唯一正本。

## 录制与试用这两个公开入口

- **先看 Example**：从九宫格看到中心愿景、八个房间；切到房间长卷，进入一扇门；打开一个长期方向，查看“输入 → 实践 → 输出 → 回看”；退出方向和房间，再回到九宫格。镜头里应持续标明“虚构教学案例”，不要把示例记录称为本人真实进展。
- **再看 Blank**：从空白九宫格起步，并查看房间视图的空态；复制给 Coding Agent 进入本地 Personal 主路径。如果要示范无文件权限下的手工导入，只导入专门制作的虚构测试 JSON。录制结束时展示导出和“当前浏览器暂存”的边界，不录入私人地图、其他会话或真实健康、关系、财务内容。

这两个入口演示的是“完成后的结构”与“开始时的状态”，不是同一个人的前后对照。录制前只以经审计的 [`docs/RECORDING-QA.md`](docs/RECORDING-QA.md) 和 [Flow 基线 JSON](docs/recording-flow-baseline-2026-09-19.json) 为检查清单；未经实际浏览器核验的转场、恢复和长期回流，不应在视频里宣称已经成功。

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
| 本地网站 | Personal / Example 只读呈现；Blank 可手工导入、在当前浏览器暂存并导出；提供双视图和同步错误提示 | 不直接改私人文件，不要求第二次确认，不成为另一份 Personal 权威 |

网站遇到暂时损坏或不合法的私人文件时，应保留最后一次合法画面并提示错误；文件修复后自动恢复。刷新页面后仍以私人文件为准。

## 产品阶段顺序

Growing Me 先把地图做好，再连接更复杂的系统：

1. **中心愿景与八个一级房间**：从用户原话形成彼此可区分的生活领域。
2. **每个房间的第二层方向**：每块先形成 4–6 个高置信候选，经用户校准后最多八项。
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

公共托管版本没有本机文件访问能力：Example 只读；Blank 可导入并在当前浏览器暂存、导出完整 JSON，再引导用户克隆到本地进入 Personal 流程。公共构建不包含 `private/`；浏览器暂存不是 Personal 的第二份权威，也不是跨设备备份。

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
  app.js / model.js                 只读投影与数据归一化
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
2. `?mode=example` 显示完整虚构地图；可打开房间和方向工作台；不会请求私人数据或写入个人存储。
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
