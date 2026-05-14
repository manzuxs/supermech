# Supermech (Visual Workbench) 项目上下文与 Agent 规则

Supermech 是一个将终端驱动的 AI Agent 工作流升级为"数据驱动 + 视觉交互"的可视化工作台。它通过结构化 JSON 桥接 Agent 的逻辑输出与前端的实时渲染，实现思维导图、任务看板等可视化协作体验。

## 1. 架构与技术栈

项目采用 Monorepo 架构（pnpm workspaces + Turbo），主要包含以下部分：

- **逻辑层 (`.supermech/skills/`)**: 定义 Agent 的行为规范，通过输出结构化 JSON 到 `state-<skill>.json` 来驱动 UI。
- **展现层 (`apps/web/`)**: 基于 **React 18** 和 **Vite 6** 构建的前端应用，使用 **Tailwind CSS v4** 进行样式设计。
- **数据协议 (`@supermech/schema`)**: 使用 TypeScript + zod 定义 `WorkbenchState` 协议，并提供 `validateState()` 运行时校验。
- **运行时 (`@supermech/runtime`)**: 提供 `readState()` / `writeState()` / `watchState()` 等文件 I/O API，以及可选的 Vite 插件。
- **初始化工具 (`@supermech/init`)**: `initProject()` 一键初始化 `.supermech/` 目录。

## 2. 核心数据流

1. **Agent -> JSON**: Agent 执行技能并将结果写入 `.supermech/state-<skill>.json`。
2. **JSON -> UI**: Vite 插件监测到文件变化，通知前端重绘。
3. **UI -> JSON**: 用户在界面上的操作通过 `/__state` API 写回 JSON。
4. **JSON -> Agent**: Agent 在下一轮对话中读取最新的 JSON 状态作为上下文。

## 3. 常用命令

- `pnpm dev:web`: 启动前端开发服务器 (localhost:5173)。
- `pnpm typecheck`: TypeScript 类型检查（覆盖全部 4 个包）。
- `pnpm check`: Biome 代码检查。

## 4. 关键目录与包

```
.supermech/
├── config.json              # 工作区配置
├── skills/                  # Agent 技能目录（可发现）
└── state-<skill>.json       # 会话状态文件

packages/schemas/  →  @supermech/schema    # 类型定义 + zod 校验
packages/watcher/  →  @supermech/runtime   # 文件 I/O + Vite 插件
packages/init/     →  @supermech/init      # 项目初始化
```

## 5. Agent 操作规范

### 写入状态
Agent 必须将结构化的 JSON 写入 `.supermech/state-<skill>.json`。文件路径决定了 UI 渲染的视图类型。

- `brainstorming` → 思维导图视图
- `writing-plans` → 计划编辑器视图
- `executing-plans` → 看板视图

### 读取反馈
`feedback[]` 数组中包含用户反馈。Agent 应在每次迭代中检查该数组。

### 技能发现
Agent 通过读取 `.supermech/skills/` 目录发现可用技能。每个子目录包含 SKILL.md 定义技能行为。
技能之间**相互独立**，不是管线关系。可以只使用 writing-plans 而不需要 brainstorming。

### Plan 作用域（可选）
设置 `currentPlan` 可以将状态文件限定到子目录：
`.supermech/<plan>/state-<skill>.json`
用于管理多个并行工作上下文（如"需求A"和"需求B"）。

## 6. 外部项目接入方式

```bash
npm install @supermech/schema @supermech/runtime
npx @supermech/init --with-skills brainstorming,writing-plans,executing-plans
```

然后 Agent 就可以：

```typescript
import { readState, writeState } from '@supermech/runtime';
import { validateState } from '@supermech/schema';

writeState('brainstorming', { ... });
const state = readState('brainstorming');
validateState(state);
```

## 7. 开发约定

- **状态文件**: `.supermech/state-<skill>.json`（根 `state.json` 为兼容遗留数据）
- **技能发现**: `.supermech/skills/<name>/SKILL.md` — 添加技能 = 添加目录
- **Plan**: 可选分组，非强制
- **节点状态**: `pending | active | accepted | rejected | done`
- **状态所有权**: 状态流转由 Agent 控制，UI 不做修改

## 8. 受保护文件

- `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json`, `biome.json`
- `state.json`, `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`
- `apps/*/package.json`, `apps/*/vite.config.*`, `apps/*/tsconfig*.json`
- `apps/web/src/main.tsx`, `apps/web/src/App.tsx`
- `apps/web/src/styles/**`
- `packages/*/package.json`, `packages/*/src/index.*`
- `skills/**`
- `docs/项目需求文档.md`, `docs/UI 设计规范.md`, `docs/supermech/**`
