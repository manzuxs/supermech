# Supermech 整体计划：Superpowers 可视化迁移路线

> 说明：本文保留中期迁移方向，仍可作为规划参考；当前更高优先级的执行基线以 `README.md` 和 `docs/当前实施重规划.md` 为准，若说法冲突以后者为准。

## 1. 文档目的

这份文档用于统一当前阶段的真实目标、范围和实施顺序，作为后续产品设计、协议演进和技能迁移的总计划。

它替代“最初愿景文档”的部分假设，不再以单一 `state.json`、固定 `1920x1080` 画布或一比一复刻 `open-slide` 为约束。

---

## 2. 当前确认后的真实目标

### 2.1 核心目标

`Supermech` 的目标不是单纯做一个通用可视化画布，而是把 `superpowers` / `superpoweros` 这套 Agent 工作流产品化、可视化、可观察化。

系统需要做到：

1. Agent 继续遵循 `superpowers` 的工作方法。
2. Agent 把中间状态写入结构化 JSON。
3. 前端把这些状态渲染成可操作、可反馈、可追踪的界面。
4. 用户在 UI 上的反馈可以重新进入 Agent 工作流。

### 2.2 已确认的设计取舍

以下内容不再作为硬目标：

- 不再强制单一 `state.json`
- 不再强制 `1920x1080` 固定画布
- 不再把 `open-slide` 作为整体架构模板

以下内容作为当前有效方向：

- 支持多计划并行
- 使用自由缩放、自由平移的工作画布
- 只借鉴 `open-slide` 的反馈机制思想
- 执行计划视图采用卡片化流程图，而不是传统甘特图或简单看板

---

## 3. 产品定位

`Supermech` 当前应被定义为：

**一个面向 Agent 工作流的可视化操作台，而不是一个通用图形编辑器。**

它服务的对象不是“任何 JSON”，而是 `superpowers` 技能在不同阶段产出的结构化状态。

这意味着：

- 画布形态应服从技能语义
- 状态协议应围绕工作流设计
- UI 的价值重点在于“观察、反馈、切换、追踪、复盘”
- 不应为了形式统一而牺牲工作流表达能力

---

## 4. 范围定义

### 4.1 当前主范围

第一优先级是承接 `superpowers` 的主干工作流：

1. `brainstorming`
2. `writing-plans`
3. `executing-plans`

这三者构成从“设计”到“计划”再到“执行”的主链路，是当前产品的核心。

### 4.2 第二层范围

第二优先级不是新增大量独立画布，而是把关键执行方法嵌入主链路：

- `subagent-driven-development`
- `test-driven-development`
- `systematic-debugging`
- `requesting-code-review`
- `receiving-code-review`
- `verification-before-completion`

这些技能更适合作为：

- 执行阶段状态机
- 评审门禁
- 调试流程模板
- 执行事件流
- 子任务编排模型

而不是都单独做成新的主页面。

### 4.3 第三层范围

第三优先级是协作与环境技能的产品化承接：

- `using-git-worktrees`
- `dispatching-parallel-agents`
- `finishing-a-development-branch`
- `using-superpowers`
- `writing-skills`

这类技能更适合进入：

- 会话管理
- 分支与工作区管理
- 并行执行面板
- 最终交付检查面板
- 技能模板管理

---

## 5. 当前完成度判断

## 5.1 已有基础

当前仓库已经具备以下能力：

- 三个核心技能的可视化入口
- 基础状态协议与类型定义
- 本地状态文件读写与监听
- 前端反馈回写
- 多计划切换
- 技能切换
- 执行阶段、质量门禁、事件流等执行态展示

### 5.2 当前阶段判断

如果按“3 个核心技能的可视化工作台”衡量，项目已经进入可用原型阶段。

如果按“完整承接 superpowers 全技能体系”衡量，当前仍处于中期阶段，尚未完成技能编排层和协作层产品化。

### 5.3 当前主要缺口

当前最明显的缺口不是单个组件，而是以下系统能力：

1. 核心语义仍不完全统一
2. 技能扩展模型还不是标准插件化渲染
3. 执行类辅助技能尚未系统嵌入
4. 调试、评审、分支、并行代理等协作流程还没有产品化界面
5. 文档、技能模板、协议实现之间仍有漂移

---

## 6. 迁移原则

### 6.1 不追求“一技能一画布”

不是所有 `superpowers` 技能都需要独立主界面。

迁移原则应为：

- 主流程技能：做主画布
- 执行方法技能：嵌入现有主流程
- 环境协作技能：做控制面板或状态面板

### 6.2 优先迁移“语义”，而不是“文案”

迁移重点不是复刻原 `SKILL.md` 的文本，而是保留其工作方法：

- 何时进入该阶段
- 阶段内要遵守什么约束
- 产生什么状态
- 如何被用户反馈打断或修正

### 6.3 优先可观察性

对执行类技能，最重要的不是漂亮的画布，而是以下问题能否被回答：

- Agent 现在在做什么
- 为什么停住了
- 正在改哪些文件
- 当前是在实现、测试、评审还是修复
- 哪个 review gate 没过
- 用户应当在哪里反馈

### 6.4 协议先于组件

每增加一个技能能力，优先顺序应为：

1. 明确状态语义
2. 定义 TypeScript / schema
3. 明确 Agent 读写约定
4. 再做前端视图

---

## 7. 目标架构

建议把未来架构收敛为四层：

### 7.1 Workflow Layer

定义技能生命周期与阶段切换：

- brainstorming
- writing-plans
- executing-plans
- review
- debugging
- completion

### 7.2 State Protocol Layer

统一工作台协议对象：

- workspace
- plan
- skill
- run
- task
- feedback
- review gate
- execution event

### 7.3 Runtime Layer

负责：

- 状态文件定位与读写
- 多计划扫描与切换
- 状态校验
- 事件分发
- 前端数据接口

### 7.4 Presentation Layer

负责：

- 主画布渲染
- 右侧反馈与详情
- 会话切换
- 运行状态追踪
- review/debug/parallel 等辅助面板

---

## 8. 分阶段实施计划

## Phase 0：语义收敛与计划冻结

目标：

- 明确当前产品定义
- 终止继续被旧愿景文档牵引
- 形成统一术语

交付物：

- 本整体计划文档
- 统一术语表
- 现状与目标差距清单

验收标准：

- 团队内部统一使用 `plan / skill / run / feedback / gate / event` 语义
- 后续文档不再混用旧的单 `state.json` 叙述

## Phase 1：把核心 3 技能做稳

目标：

- 把 `brainstorming`、`writing-plans`、`executing-plans` 变成稳定主流程

重点工作：

1. 清理协议漂移
2. 明确每个技能的输入、输出、切换条件
3. 明确多计划目录模型
4. 补齐当前视图与状态协议的一致性
5. 收紧 lint / check / 构建质量

交付物：

- 稳定版三技能协议
- 稳定版三技能 UI
- 稳定版技能模板

验收标准：

- 三技能都能独立从空状态启动
- 三技能都能读写反馈
- 三技能之间切换不会丢关键状态
- 类型检查、构建、静态检查达到可接受水平

## Phase 2：把执行方法技能嵌入主流程

目标：

- 让 `executing-plans` 不只是展示任务，而是真正承接 `superpowers` 的执行方法

重点迁移对象：

- `subagent-driven-development`
- `test-driven-development`
- `systematic-debugging`
- `requesting-code-review`
- `receiving-code-review`
- `verification-before-completion`

具体方向：

1. 把 TDD 变成任务步骤与执行阶段约束
2. 把 spec review / code review 变成标准 gate
3. 把 debugging 变成可视调查流
4. 把 subagent 执行结果变成 run/task event 流
5. 把 completion verification 纳入交付前检查

交付物：

- 扩展执行协议
- review/debug/run 面板
- 子代理执行状态模型

验收标准：

- 执行视图可以表达“实现-测试-评审-修复”的完整闭环
- 用户能区分任务完成、任务通过 review、任务待修复这几种状态
- 子代理或并行执行结果可回写到同一工作台语义中

## Phase 3：协作与环境编排产品化

目标：

- 承接 `superpowers` 的协作与环境技能

重点迁移对象：

- `using-git-worktrees`
- `dispatching-parallel-agents`
- `finishing-a-development-branch`

具体方向：

1. 增加 worktree / branch 上下文展示
2. 增加 parallel agent run 列表
3. 增加最终交付检查面板
4. 增加阶段性 completion checklist

交付物：

- 协作控制面板
- 并行运行态面板
- 分支收尾状态面板

验收标准：

- 用户能看见当前工作在哪个分支 / worktree
- 并行任务有独立状态与回收路径
- 最终收尾动作有可视检查列表

## Phase 4：扩展与外部接入能力

目标：

- 把 `Supermech` 从本仓库实现提升为可复用产品底座

重点工作：

1. 稳定 schema / runtime / web 边界
2. 明确技能模板分发方式
3. 设计技能注册与渲染扩展点
4. 做 sidecar 模式的外部接入文档

交付物：

- 产品化接入方案落地版
- 对外接入文档
- 可扩展技能注册机制

验收标准：

- 新仓库可以用最少步骤接入
- 新技能可以以最小改动接入现有工作台
- 运行协议和前端渲染不再强耦合仓库路径

---

## 9. 技能迁移映射建议

| superpowers 技能 | 迁移方式 | 优先级 |
| --- | --- | --- |
| `brainstorming` | 独立主画布 | P0 |
| `writing-plans` | 独立主画布 | P0 |
| `executing-plans` | 独立主画布 | P0 |
| `subagent-driven-development` | 嵌入执行编排层 | P1 |
| `test-driven-development` | 嵌入计划与执行步骤约束 | P1 |
| `systematic-debugging` | 嵌入调试流程面板 | P1 |
| `requesting-code-review` | 嵌入 review gate / reviewer run | P1 |
| `receiving-code-review` | 嵌入 review 反馈流 | P1 |
| `verification-before-completion` | 嵌入交付前检查 | P1 |
| `using-git-worktrees` | 协作控制面板 | P2 |
| `dispatching-parallel-agents` | 并行运行面板 | P2 |
| `finishing-a-development-branch` | 收尾与发布面板 | P2 |
| `using-superpowers` | 文档/引导，不做主界面 | P3 |
| `writing-skills` | 模板系统或文档工具 | P3 |

---

## 10. 关键风险

### 10.1 过度追求“技能一一对应界面”

风险：

- 产生过多低价值页面
- 破坏主流程一致性

应对：

- 只给主流程技能独立画布
- 其他技能优先做嵌入能力

### 10.2 协议继续漂移

风险：

- Agent 写法、前端读法、文档说法持续不一致

应对：

- 所有新能力先补 schema
- 关键状态字段有单一语义定义

### 10.3 UI 先行、语义滞后

风险：

- 做出很多界面，但无法稳定承接 Agent 工作流

应对：

- 所有新视图必须先有状态模型和读写约定

### 10.4 执行编排复杂度被低估

风险：

- `subagent-driven-development`、review、debug、completion 彼此耦合，后期返工大

应对：

- 先把运行状态对象抽象出来
- 先让它们共用一套 `run / gate / event` 模型

---

## 11. 近期建议行动

建议接下来按以下顺序推进：

1. 统一术语和状态协议文档
2. 对当前三技能做一次“协议与实现一致性”清理
3. 设计执行编排扩展模型
4. 先迁 `subagent-driven-development` 与 `test-driven-development`
5. 再迁 review / debugging / completion

---

## 12. 本文档的判断结论

当前 `Supermech` 已经成功搭起了 `superpowers` 主干工作流的可视化基础，但距离“完整承接 superpowers 全套技能体系”仍有明显差距。

正确路线不是继续横向增加很多新画布，而是：

**以 3 个核心技能为主骨架，把执行方法、评审方法、调试方法和协作方法逐步吸纳进统一工作流模型。**

这条路线更符合产品目标，也更有机会真正把 `superpowers` 从“提示词技能集”升级成“可视化工作系统”。
