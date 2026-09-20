# 月度人生地图输出与写入契约

格式版本为 `1.2.0-monthly`。执行前完整读取同目录的 `life-grid-monthly.schema.json`。

## 权威与模式

Clone-first 模式下，`private/life-grid-monthly.json` 是唯一正式地图。Coding agent 是唯一写入者；网站通过本地只读接口呈现它，不维护第二份权威，也不要求网页再次确认。

只有当前环境无法访问仓库文件、但已取得完整当前地图及 Schema 时，才使用“完整 JSON 输出 → 用户手动导入”的兜底路径。初次纯聊天可以先访谈，在当前聊天整理可复制但未持久化的候选摘要；没有完整数据契约时，不承诺可导入 JSON。

## 字段边界

- `meta.revision` 必须是非负整数。每次成功写入恰好增加一；不能因重试或回读再次增加。
- `meta.updated_at` 使用本次实际写入时间。
- `center` 保存未来三到五年的中心愿景。
- `dimensions` 最多八项；未讨论的维度可以不生成。
- `dimension.scene_id` 是可选空间语法：`career-route`、`creator-gallery`、`ai-constellation`、`health-vitals`、`love-book`、`finance-ledger`、`life-cabinet`、`family-album`。它只决定呈现，不得据此编造人生内容。
- 每个维度的 `support_factors` 最多八项，保存长期方向而不是待办。
- `periods` 按 `YYYY-MM` 保存月份；每月 `todos` 最多八项，但不要求填满。
- `todo.direction_id` 只有在事项明确承接同一维度内的长期方向时才填写；无法判断时省略。
- `todo.plan` 是准备怎么做，`done_definition` 是完成或验证标准，`status` 是实际状态，`records` 是真实发生的记录。
- `source_quote` 只保存用户真实说过的话；AI 概括放入 `summary`。
- 继续旧地图时必须保留稳定 id、未修改字段和未知字段。
- 旧版 `support_factors` 不得自动转换为 `todos`；需要兼容时原样放入 `legacy_support_factors`。

## Clone-first 写入协议

1. 读取完整私人文件并记录基线 revision。
2. 在对话中展示候选变化，不先写权威文件；用户明确确认具体变化，模糊认可不算确认。
3. 保留稳定 id、未修改字段和未知字段，在完整候选中应用最小变化，设置 `updated_at`，并令候选 revision 恰好等于基线加一。
4. 把完整候选写入与权威文件相同的 `private/` 目录，使用唯一临时文件名。此时不得覆盖 `private/life-grid-monthly.json`。
5. 严格校验临时文件本身：原始 JSON 可解析，符合 Schema、月度模型、id、引用、状态与数量约束，revision 恰好加一。不得先默认、强制转换、删除或修复字段，再把修复后的对象当作校验通过。
6. 校验通过后，立刻重读权威文件并比较 revision。只要不等于基线，就终止事务；不能 rename、合并或覆盖。
7. 无冲突时，把同目录临时文件原子 rename 到 `private/life-grid-monthly.json`。禁止直接在权威路径上逐步写入。
8. 从权威路径回读，重新严格校验 revision 与预期字段。只有这一步成功，文件事务才完成。

任一 rename 前步骤失败都必须让权威文件保持原样。原子 rename 失败时，旧文件必须仍可使用；rename 后回读失败时视为结果未知，不得再覆盖、盲目重试或声称成功。临时文件存在或校验通过都不构成成功。

完成文件回读后，使用：“私人文件已更新并回读 Rn；页面在本地服务和页面仍开启时会自动刷新。”这只证明文件事务成功。只有直接检查仍在运行的浏览器，并确认页面实际显示该 revision 后，才可另说：“已在浏览器验证页面显示 Rn。”

用户明确要求保存未定稿内容时，可写为 `candidate`；写入行为本身不构成 `confirmed`。方向退休、事项完成及敏感健康或财务结论都需要单独明确确认。

## 写入前检查

- 顶层包含 `meta`、`center`、`dimensions`。
- `meta.version` 为 `1.2.0-monthly`，revision 为非负整数。
- 维度和每个维度的长期方向均不超过八项。
- 同一层 id 不重复，已有 id 保持稳定。
- 月份格式正确，事项标题非空，状态值合法，记录文本非空。
- `direction_id` 指向同一维度中真实存在的长期方向。
- 本轮未确认的内容没有被升级或改写。

结构校验不能证明人生方向真实；用户的明确确认才是语义确认门。

## 无文件权限兜底

无法读取或写入私人文件、但能取得完整当前地图及 Schema 时，输出一份完整 JSON，而不是补丁。它必须包含当前整张地图、保留所有未修改内容和稳定 id，并把 `meta.revision` 设置为输入 revision 加一。输出前完成同样的结构检查，并明确告诉用户：文件和网站尚未被自动更新，需要手动导入。如果当前地图或 Schema 缺失，只返回可继续讨论的候选摘要，并引导用户在本地仓库继续，不能把摘要伪装成可导入文件。

不要默认输出完整私人地图到聊天。它只用于无文件权限的手动导入，或用户明确要求的备份。

## 暂不启用

`DOMAIN_RECEIPT_v1`、站点写入工具、跨 Session 读取、项目回流、OpenClaw、Wiki、账号、云同步和远程写入不属于当前 clone-first 主路径。相关文件可以保留为未来设计材料，但本 Skill 不调用、不创建，也不声称它们已经接通。
