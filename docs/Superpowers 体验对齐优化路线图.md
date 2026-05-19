# Superpowers 体验对齐优化路线图

## 1. 目标

这份路线图的目标不是继续扩更多页面，而是**最大化对齐 `superpowers` 的真实使用体验**。

这里的“体验对齐”指的是三件事同时成立：

1. 技能语义与原版一致
2. 阶段切换闭环与原版一致
3. 原版方法论约束在系统中真正生效，而不是只写在文档里

---

## 2. 当前判断

基于现有评估，当前三技能与 `superpowers` 的接近程度大致为：

- `brainstorming`：60% - 70%
- `writing-plans`：70% - 80%
- `executing-plans`：80% - 90%

最接近原版的是 `executing-plans`。  
差距最大的是 `brainstorming`。

因此优化顺序不应平均分配，而应优先修正“最影响整体工作流体验”的断点。

---

## 3. 优先级总览

| 优先级 | 主题 | 目标 |
| --- | --- | --- |
| P0 | 统一技能定义源 | 结束同一技能多版本语义漂移 |
| P0 | 修复 brainstorming 闭环 | 补齐原版最核心的设计阶段体验 |
| P1 | 打通 writing-plans 到 executing-plans 的 handoff | 恢复原版从计划到执行的顺滑切换 |
| P1 | 引入 subagent-driven-development 执行模式 | 对齐原版推荐执行方式 |
| P2 | 补齐 executing-plans 收尾工作流 | 接回分支收尾、验证、完成语义 |
| P2 | 强化系统级方法约束 | 让“技能原则”变成系统行为 |

---

## 4. Phase 1：统一技能定义源

### 4.1 问题

当前同一技能至少同时存在：

- `packages/init/skills/*`
- `skills/visual-*`
- `.supermech/skills/*`
- 以及部分 `.claude/skills/*` 副本

这导致：

- 同名技能存在不同终态定义
- 文档与 UI 约束可能互相冲突
- 用户实际体验依赖“用了哪一份技能文档”

### 4.2 优化目标

建立**单一技能真相源**。

建议：

- 选择 `packages/init/skills/*` 作为正式源
- 其他位置只保留生成副本或兼容副本
- 建立同步机制，禁止手工并行维护

### 4.3 验收标准

- 同一技能只保留一套正式流程定义
- brainstorming / writing-plans / executing-plans 的终态不再互相冲突
- 文档、前端、状态协议引用同一套技能语义

---

## 5. Phase 2：优先修复 brainstorming 体验

## 5.1 为什么先修 brainstorming

因为它是整个 `superpowers` 工作流的入口。

如果 brainstorming 不能提供原版那种：

- 逐轮澄清
- 明确批准
- 从设计自然进入计划

那么后面的计划和执行再强，也还是偏离原版体验。

### 5.2 当前主要差距

1. 原版 `Visual Companion` 机制缺失
2. `processedAt` 反馈消费闭环未落地
3. 缺少显式的设计审批动作
4. brainstorming 结束后的 transition 语义不稳定

### 5.3 具体优化建议

#### A. 恢复 Visual Companion 语义

不要求照搬原版实现，但至少要恢复原版能力边界：

- 是否需要视觉辅助应是一个显式判断
- 不是所有 brainstorming 都强制进 MindMap
- 视觉辅助应作为能力，而不是默认形态

#### B. 增加显式审批动作

给节点增加明确交互：

- `accept`
- `reject`
- `needs revision`

避免只靠自由文本让 agent 猜测审批意图。

#### C. 落地反馈消费状态

把 `processedAt` 或等价状态正式写入 schema、接口和 UI。

效果：

- agent 可以区分新反馈和已处理反馈
- UI 可以显示“待处理 / 已处理”
- brainstorming 可以真正形成逐轮推进闭环

#### D. 统一 brainstorming 的终态

推荐对齐原版：

- 设计完成并获批后
- 不直接清空
- 优先进入 `writing-plans`

只有当用户明确结束当前主题时，才回到空画布。

### 5.4 验收标准

- brainstorming 可显式批准/否决节点
- feedback 有真实“已处理”状态
- brainstorming 结束后可自然进入 writing-plans
- 视觉辅助能力的存在与否是可选择的，而不是隐式替代

---

## 6. Phase 3：打通 writing-plans → executing-plans handoff

### 6.1 当前问题

当前 `/execute` 的叙述存在，但主 UI 中并没有完全形成稳定 handoff。

同时还存在：

- 文档说依赖在 `edges[]`
- UI 实际却在部分地方读 `metadata.dependencies`

这会让“计划已完成，准备执行”的体验不一致。

### 6.2 优化目标

恢复原版从计划到执行的明确切换感。

### 6.3 具体优化建议

#### A. 让主输入入口真正支持 slash command

要求：

- 当前实际使用的输入入口支持 `/execute`
- 行为和文档一致
- 切换动作对用户可见且可理解

#### B. 恢复执行模式选择

对齐原版体验：

- `Subagent-Driven`
- `Inline Execution`

用户在计划完成后应该做一次显式选择，而不是默认只能走一种。

#### C. 统一依赖表达

只保留一种正式依赖契约：

- 要么 `edges[]`
- 要么 `metadata.dependencies`

不能文档写一套、UI 读另一套。

#### D. 让计划完成态更明确

至少要有一个清晰的用户提示：

- 计划已完成
- 当前可进入执行
- 执行入口是什么
- 执行模式有哪些

### 6.4 验收标准

- `/execute` 在当前主 UI 入口真实生效
- 用户能明确选择执行模式
- 依赖关系在技能文档、schema 和 UI 中一致
- 计划到执行的切换没有隐藏语义

---

## 7. Phase 4：接入 subagent-driven-development

### 7.1 为什么这是关键

原版 `superpowers` 在执行阶段最推荐的，不是普通 inline 执行，而是 `subagent-driven-development`。

如果不把这套模式引入，当前 `executing-plans` 再可视化，也仍然和原版最佳体验有差距。

### 7.2 优化目标

让执行阶段支持两种运行语义：

- 原版 inline 执行
- 原版推荐的 subagent-driven-development

### 7.3 具体优化建议

#### A. 建立 run 级概念

为一个任务的执行引入更清晰的运行对象：

- implementer run
- spec review run
- code quality run

#### B. 将现有执行态映射到 subagent 流程

现有字段已经很适合承接：

- `executionPhase`
- `activeFiles`
- `executionEvents`
- `gateStates`

只需要补：

- run 角色
- run 状态
- run 结果摘要

#### C. 在 UI 上把“谁在做什么”展示出来

至少让用户看见：

- 当前是 implementer 还是 reviewer
- 当前是 spec review 还是 code quality review
- 当前任务卡在哪一步

### 7.4 验收标准

- executing-plans 可以表达 subagent 模式执行
- review 循环能被 UI 看见
- 用户能区分实现、评审、返工这三种状态

---

## 8. Phase 5：补齐执行收尾工作流

### 8.1 当前缺失

原版 `executing-plans` 最后会交给 `finishing-a-development-branch`。

当前 Supermech 的执行闭环更多停在：

- 任务完成
- 状态 idle
- 用户评分 / replan

这还不是工程交付闭环。

### 8.2 优化目标

恢复“执行完成后的正式收尾体验”。

### 8.3 具体优化建议

#### A. 接入 finishing 阶段

增加一个明确的收尾状态或面板，包含：

- 全量验证是否完成
- 分支是否可交付
- 是否需要额外 review
- 是否准备结束当前工作流

#### B. 增加 worktree / branch 上下文

如果想对齐原版体验，执行阶段最好显式显示：

- 当前分支
- 当前 worktree
- 是否在安全工作区中

#### C. 统一执行完成语义

当前执行完成后到底：

- 保留 `activeSkill`
- 还是清空画布

必须统一。

推荐：

- 完成后保留 `executing-plans`，供用户回看
- 用户显式确认结束后再退出

### 8.4 验收标准

- 执行完成后存在正式收尾阶段
- 用户能理解“任务做完”和“工作流完成”的区别
- 分支/工作区上下文清晰可见

---

## 9. Phase 6：把原版方法论变成系统约束

### 9.1 当前问题

很多原版原则还只存在于技能文档里，例如：

- 未批准前不实现
- gate 没过不能完成
- 任务必须有足够信息才能进入执行

如果这些不变成系统行为，体验仍会偏弱。

### 9.2 优化目标

让系统对关键方法论有真实约束。

### 9.3 建议约束

#### brainstorming

- 未批准前不可进入 writing-plans

#### writing-plans

- 缺少 `goal/files/implementationSteps/verificationSteps` 的任务不可视为有效

#### executing-plans

- 同时最多一个 `active` task
- gate 未通过不可进入完成态
- 校验失败不允许写回文件

### 9.4 验收标准

- 关键方法约束不是靠人记住，而是系统默认保证

---

## 10. 推荐执行顺序

建议按这个顺序推进：

1. 统一技能定义源
2. 修 brainstorming 闭环
3. 打通 writing-plans → executing-plans handoff
4. 接入 subagent-driven-development
5. 补齐 finishing-a-development-branch
6. 把关键方法论做成系统约束

原因：

- 先修入口和语义
- 再修主流程切换
- 再补高级执行模式
- 最后补完整工程闭环

---

## 11. 这条路线的核心判断

如果要最大化对齐 `superpowers`，不要先扩更多技能页面。

真正重要的是：

- **单一技能语义源**
- **明确阶段切换闭环**
- **把原版约束做成系统行为**

只要这三件事补齐，当前 Supermech 就会从“可视化工作台”更接近“可视化 superpowers 工作系统”。
