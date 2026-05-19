# Phase 1：核心三技能协议收敛实施清单

## 1. 目标

Phase 1 的唯一目标是：

**把 `brainstorming`、`writing-plans`、`executing-plans` 这 3 个核心技能收敛成一套稳定、一致、可扩展的工作流协议。**

这一步不追求新增更多技能，不追求新画布，不追求大改 UI，而是先把后续所有迁移要依赖的底座做稳。

---

## 2. 范围

### 2.1 In Scope

- 统一核心术语
- 统一状态对象模型
- 收敛三技能状态结构
- 收敛 runtime / cli / web / skills 文档的协议实现
- 明确多计划目录模型
- 明确技能切换与状态生命周期
- 给执行态抽出后续可复用的运行模型

### 2.2 Out of Scope

- 新增第四个主画布
- 迁移 `systematic-debugging`
- 迁移 `subagent-driven-development`
- 迁移 `using-git-worktrees`
- 做对外产品化接入
- 全面重做 UI 设计

---

## 3. 完成定义

Phase 1 完成时，至少满足以下条件：

1. `schemas`、`runtime`、`cli`、`web`、`skills` 里对核心对象的命名一致。
2. 三技能都基于同一套 `plan / skill / run / task / feedback / gate / event` 语义。
3. 三技能在多计划目录下都能独立启动、切换、读写、恢复。
4. `executing-plans` 的执行态字段足够支撑后续接入 TDD、review、subagent。
5. 文档不再混用旧的单 `state.json` 叙述。
6. `pnpm typecheck`、`pnpm build` 通过，且静态检查问题数量明显收敛。

---

## 4. 任务总览

| 优先级 | 工作流 | 目标 |
| --- | --- | --- |
| P0 | 术语与协议模型统一 | 先统一说法，再统一实现 |
| P0 | 三技能状态结构收敛 | 让三个技能共享稳定骨架 |
| P0 | runtime / cli / web 行为对齐 | 消除状态路径与生命周期漂移 |
| P1 | 执行态模型抽象 | 给后续执行类技能做底座 |
| P1 | 技能模板与文档对齐 | 让 Agent 写出来的状态和前端读的是同一种东西 |
| P2 | 样例状态与质量治理 | 用样例和校验把协议固定下来 |

---

## 5. 详细任务

## Workstream A：统一核心术语与对象模型

### A1. 固化术语表

目标：

- 明确以下对象在项目中的唯一含义：
  - `workspace`
  - `plan`
  - `skill`
  - `run`
  - `task`
  - `feedback`
  - `gate`
  - `event`

建议产出：

- 在文档中新增术语表
- 后续 schema 注释与技能模板全部引用这套术语

验收：

- 不再混用 `session` 指代 `skill`
- 不再混用 `state file` 指代 `plan`

### A2. 统一最小状态骨架

目标：

- 定义三技能共享的最小状态结构

建议统一骨架：

```ts
{
  meta: {},
  canvas: {},
  feedback: [],
  ui: {}
}
```

其中：

- `meta` 放工作流上下文
- `canvas` 放技能主数据
- `feedback` 放用户回写
- `ui` 放前端偏好

验收：

- 三技能都使用同样的顶层结构
- 文档、schema、前端默认值完全一致

### A3. 明确 `meta` 语义

目标：

- 收敛 `meta` 字段，不再让同一字段承担多个概念

建议明确：

- `projectName`：用户可见的工作主题名
- `sessionId`：一次运行上下文的唯一标识，不再简单等于 skill 名
- `activeSkill`：当前激活的技能视图
- `agentStatus`：Agent 当前工作状态

待决策项：

- 是否新增 `planId`
- 是否新增 `runId`

验收：

- 所有默认 state 生成逻辑都遵循同一规则
- 不再出现 “`sessionId` 实际只是 skill 名称” 的歧义

---

## Workstream B：三技能状态结构收敛

### B1. Brainstorming 状态模型定稿

目标：

- 确认 `brainstorming` 的树状节点模型是 Phase 1 的稳定版本

重点字段：

- `nodes[]`
- `parentId`
- `children`
- `metadata.description`
- `metadata.tags`
- `status`
- `progress`

要确认的问题：

- 是否允许技能级 metadata
- 是否需要显式“已处理反馈”标记
- 是否要为设计批准状态保留统一节点状态语义

涉及文件：

- `packages/schemas/src/workbench.ts`
- `packages/schemas/src/validation.ts`
- `skills/visual-brainstorming/SKILL.md`
- `packages/init/skills/brainstorming/SKILL.md`

验收：

- Brainstorming 的节点树模型稳定
- 反馈处理规则和节点状态规则在文档与实现中一致

### B2. Writing Plans 状态模型定稿

目标：

- 确认 `writing-plans` 作为结构化计划协议的稳定版本

重点字段：

- `canvas.metadata.planHeader`
- `metadata.goal`
- `metadata.phase`
- `metadata.files`
- `metadata.implementationSteps`
- `metadata.verificationSteps`
- `edges`

要确认的问题：

- `edges` 是否继续保留为依赖表达
- `dependencies` 与 `edges` 是否重复
- `qualityGates` 是否作为所有任务的标准字段

涉及文件：

- `packages/schemas/src/planner.ts`
- `packages/schemas/src/validation.ts`
- `skills/visual-writing-plans/SKILL.md`
- `packages/init/skills/writing-plans/SKILL.md`

验收：

- 新计划只使用一种依赖表达方式
- 所有任务的最小字段集清晰可判定

### B3. Executing Plans 状态模型定稿

目标：

- 把 `executing-plans` 变成 Phase 1 后续扩展的核心底座

重点字段：

- `executionFlow`
- `executionPhase`
- `activeFiles`
- `executionEvents`
- `qualityGates`
- `gateStates`
- `feedback.rating`
- `feedback.quickAction`

要确认的问题：

- `executionFlow` 是否为唯一布局真相
- `canvas.edges` 在 executing 中是否仅兼容保留
- `event` 是否需要独立类型层
- `run` 是否需要进入 state 顶层或 metadata

涉及文件：

- `packages/schemas/src/planner.ts`
- `packages/schemas/src/validation.ts`
- `apps/web/src/components/visuals/FlowchartCanvas.tsx`
- `skills/visual-executing-plans/SKILL.md`
- `packages/init/skills/executing-plans/SKILL.md`

验收：

- 执行态字段能表达“实现、测试、评审、修复、重试、重计划”
- 后续接入 review / TDD 时不需要推翻当前模型

---

## Workstream C：runtime / cli / web 行为对齐

### C1. 统一状态目录模型

目标：

- 明确当前正式目录模型

建议作为正式模型：

```text
.supermech/<plan>/state-<skill>.json
```

要清理的问题：

- `docs/supermech` 是否继续只作为样例目录
- 开发态 Vite 插件是否继续依赖 `docs/supermech`
- 根 `state.json` 是否仅保留兼容层，不再作为主协议

涉及文件：

- `apps/web/vite.config.ts`
- `packages/watcher/src/storage.ts`
- `packages/watcher/src/vite-plugin.ts`
- `packages/cli/src/server.ts`
- `README.md`

验收：

- 开发态和 CLI 模式使用同一正式目录模型
- 样例目录和真实运行目录的角色边界清楚

### C2. 统一默认 state 生成逻辑

目标：

- runtime、vite plugin、cli server 生成的默认 state 一致

当前风险：

- 多处有默认 state
- 不同入口生成的初始 `meta` / `canvas` 语义可能不同

涉及文件：

- `packages/watcher/src/storage.ts`
- `packages/watcher/src/session-manager.ts`
- `packages/watcher/src/vite-plugin.ts`
- `packages/cli/src/server.ts`
- `apps/web/src/context/WorkbenchContext.tsx`

验收：

- 默认 state 只保留单一来源或单一规则
- 任意入口创建的新 plan / 新 skill 都生成同样的初始结构

### C3. 统一校验入口

目标：

- 不再存在“schema 一套、runtime 手写一套、cli 又跳过校验”的局面

当前问题：

- `packages/schemas` 有 zod 校验
- `packages/watcher` 有手写 `validate.ts`
- `packages/cli` 里当前 validate 形同绕过

建议：

- 确定唯一权威校验实现
- 其他层只调用，不再重复维护一套规则

涉及文件：

- `packages/schemas/src/validation.ts`
- `packages/watcher/src/validate.ts`
- `packages/watcher/src/vite-plugin.ts`
- `packages/cli/src/server.ts`

验收：

- 只有一套权威协议校验
- CLI、开发态、中间层写入前都能得到一致结果

### C4. 统一技能切换语义

目标：

- 让 `activeSkill`、`currentSkill`、`canvas.skillType` 的边界明确

要确认的问题：

- `activeSkill` 是“当前页面模式”还是“当前 Agent 正在进行的技能”
- `canvas.skillType` 是否必须始终等于当前文件所属 skill
- 前端切 skill 时是否创建新文件还是读取已有文件

涉及文件：

- `apps/web/src/context/WorkbenchContext.tsx`
- `apps/web/src/App.tsx`
- `packages/watcher/src/vite-plugin.ts`
- `packages/cli/src/server.ts`

验收：

- 用户切 skill、Agent 切 skill、前端初始化 skill 的语义统一

---

## Workstream D：执行态抽象，为后续执行类技能做底座

### D1. 抽出标准 `gate` 模型

目标：

- 让 `spec-review` / `code-quality` 只是 gate 的具体实例

后续可承接：

- review
- verification-before-completion
- debugging checkpoints

验收：

- gate 类型定义清楚
- gate 状态流清楚

### D2. 抽出标准 `event` 模型

目标：

- 把 `executionEvents` 升级为后续所有执行类技能都能复用的事件流

至少能表达：

- phase change
- file touched
- command run
- review started / passed / failed
- note / warning / blocked

验收：

- 后续 `subagent-driven-development` 可以直接复用

### D3. 预留 `run` 语义

目标：

- 为“单个 Agent 执行过程”预留统一对象语义

说明：

- Phase 1 不一定要完整实现 `run` 持久化
- 但至少要决定它是否进入 `meta` / `canvas.metadata` / 顶层结构

验收：

- 文档层明确 `run` 的位置和未来用途

---

## Workstream E：技能模板与文档对齐

### E1. 收敛 `skills/visual-*` 与 `packages/init/skills/*`

目标：

- 让仓库内技能模板和发布出去的技能模板表达同一套协议

当前风险：

- 仓库根 `skills/` 和 `packages/init/skills/` 存在迁移差异

验收：

- 同一技能不存在两套不同协议叙述

### E2. 更新 README 与总计划文档引用

目标：

- 让顶层文档说的是当前真实架构

验收：

- README 不再把旧模型写成正式运行模型
- `docs/` 里的计划、产品化方案、整体计划彼此不冲突

---

## Workstream F：样例状态与工程质量治理

### F1. 收敛样例状态文件

目标：

- 把 `docs/supermech/*` 里的样例状态升级成“协议样本”

用途：

- 前端回归
- 协议演示
- 新技能设计参考

验收：

- 每个样例都能通过正式校验

### F2. 收敛静态检查噪声

目标：

- 至少让协议相关改动不会继续淹没在大量噪声里

建议：

- 先处理核心目录
- 明确 `biome` 应检查和应忽略的目录

验收：

- `pnpm check` 问题数量显著下降
- 协议改动的新增问题可被识别

---

## 6. 推荐执行顺序

建议按以下顺序推进：

1. A1 / A2 / A3
2. C1 / C2 / C3 / C4
3. B1 / B2 / B3
4. D1 / D2 / D3
5. E1 / E2
6. F1 / F2

原因：

- 先统一术语，再统一目录和校验，再稳定三技能，再为扩展预留抽象。

---

## 7. 第一批最值得立刻开工的任务

如果只选最值得马上开始的 5 件事，建议是：

1. 明确正式状态目录模型，结束 `.supermech` 与 `docs/supermech` 双轨漂移。
2. 确定唯一权威校验实现，结束 schema / runtime / cli 各自为政。
3. 定稿 `meta` 语义，尤其是 `sessionId`、`activeSkill`。
4. 定稿 `executing-plans` 的 `gate` 与 `event` 模型。
5. 对齐 `skills/visual-*` 与 `packages/init/skills/*` 的协议叙述。

---

## 8. 验收命令

Phase 1 执行过程中，每轮都至少要验证：

```bash
pnpm typecheck
pnpm build
pnpm check
```

另外建议补一个协议层验证清单：

1. 新建 plan
2. 切换 brainstorming
3. 写入 brainstorming state
4. 切到 writing-plans
5. 切到 executing-plans
6. 写入 feedback / gate / event
7. 重启后恢复状态

---

## 9. 最终结果预期

Phase 1 结束后，`Supermech` 不应该只是“有 3 个页面”，而应该成为：

**一个拥有稳定三技能主流程、统一协议、统一运行模型、可继续承接更多 superpowers 技能的工作台底座。**

只有做到这一步，后面迁移 `TDD`、`debugging`、`subagent-driven-development` 才会是加法，而不是返工。
