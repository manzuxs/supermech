# Supermech (Visual Workbench) 项目上下文与 Agent 规则

Supermech 是一个将终端驱动的 AI Agent 工作流升级为”数据驱动 + 视觉交互”的可视化工作台。它通过结构化 JSON 桥接 Agent 的逻辑输出与前端的实时渲染，实现思维导图、任务看板等可视化协作体验。

## 1. 架构与技术栈

项目采用 Monorepo 架构（pnpm workspaces + Turbo），主要包含以下部分：

- **逻辑层 (`skills/`)**: 定义 Agent 的行为规范，通过输出结构化 JSON 到 `state.json` 来驱动 UI。
- **展现层 (`apps/web/`)**: 基于 **React 18** 和 **Vite 6** 构建的前端应用，使用 **Tailwind CSS v4** 进行样式设计。
- **数据协议 (`packages/schemas/`)**: 使用 TypeScript 定义严格的 `WorkbenchState` 协议，确保 Agent 与 UI 的数据一致性。
- **基础设施 (`packages/watcher/`)**: 提供 Vite 插件和中间件，通过监听 `state.json` 文件变化并触发 HMR (Hot Module Replacement) 实现数据的实时热更新。

## 2. 核心数据流

1. **Agent (Gemini) -> JSON**: Agent 执行技能并将结果写入 `state.json`。
2. **JSON -> UI**: Vite 插件监测到文件变化，通知前端重绘。
3. **UI -> JSON**: 用户在界面上的操作（如点击、评分）通过 `/__state` API 写回 JSON。
4. **JSON -> Agent**: Agent 在下一轮对话中读取最新的 JSON 状态作为上下文。

## 3. 常用命令

- `pnpm dev:web`: 启动前端开发服务器 (localhost:5173)。
- `pnpm build`: 执行完整构建。
- `pnpm check:fix`: 使用 Biome 进行代码检查和格式化修复。
- `pnpm typecheck`: 执行 TypeScript 类型检查。
- `pnpm test`: (TODO: 待完善测试套件)

## 4. 开发约定

- **代码风格**: 使用 [Biome](https://biomejs.dev/) 进行格式化。
  - 缩进：2 空格。
  - 引号：JS/TS 使用单引号，JSX 使用双引号。
  - 分号：强制使用。
- **状态管理**: 前端通过 `WorkbenchContext` 管理状态，Agent 必须通过更新 `meta.activeSkill` 和 `canvas.skillType` 来激活对应的视图（如 `brainstorming` -> 思维导图，`writing-plans`/`executing-plans` -> 看板）。
- **节点状态**: 任务节点状态遵循 `pending | active | accepted | rejected | done` 的流转逻辑。
- **文件结构**:
  - `apps/web/src/components/visuals/`: 存放核心可视化组件（如 MindMap, KanbanBoard）。
  - `packages/schemas/src/`: 定义所有共享的类型定义。
- **重要文件**:
  - `state.json`: 全局状态单一事实来源。
  - `packages/schemas/src/workbench.ts`: 定义了整个工作台的核心数据结构 `WorkbenchState`。
  - `apps/web/src/context/WorkbenchContext.tsx`: 前端状态与 API 交互的核心逻辑。
  - `skills/`: 存放 Agent 的技能指令文档（SKILL.md），定义了 JSON 输出的规范。

## 5. Gemini CLI 项目规则

### 5.1 通用编辑规则

1. 只有当更改与用户请求直接相关时，才能编辑项目文件。
2. 未经用户明确批准，请勿重写整个现有文件。
3. 未经用户明确批准，请勿删除并重新创建文件。
4. 对于超过 300 行的文件，建议使用小的局部补丁，而不是整个文件替换。
5. 编辑前，请明确您计划修改的具体文件。
6. 编辑后，运行 `git diff --stat` 命令并汇总已更改的文件。
7. 如果更改影响超过 3 个不相关的文件，请停止操作并征求用户确认。

### 5.2 受保护文件策略

受保护文件并非禁止修改。但是在修改任何受保护文件之前，您必须停止操作并征求用户明确确认。

使用这个确切的确认格式：

> 此修改涉及受保护文件：`<文件路径>`。
> 修改原因：`<原因>`。
> 影响范围：`<影响>`。
> 是否允许修改？

**受保护的文件列表：**

* **Monorepo 根目录配置**: `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `turbo.json`, `biome.json`, `state.json`, `CLAUDE.md`, `GEMINI.md`
* **应用配置**: `apps/*/package.json`, `apps/*/vite.config.*`, `apps/*/next.config.*`, `apps/*/nuxt.config.*`, `apps/*/astro.config.*`, `apps/*/tailwind.config.*`, `apps/*/postcss.config.*`, `apps/*/uno.config.*`, `apps/*/tsconfig*.json`, `apps/*/biome.json`, `apps/*/.env*`, `apps/*/src/main.*`, `apps/*/src/App.*`, `apps/*/src/app.*`, `apps/*/src/layout.*`, `apps/*/src/router/**`, `apps/*/src/stores/**`, `apps/*/src/store/**`
* **全局样式、主题和布局文件**: `apps/*/src/styles/**`, `apps/*/src/assets/styles/**`, `apps/*/src/assets/css/**`, `apps/*/src/theme/**`, `apps/*/src/themes/**`, `apps/*/src/layout/**`, `apps/*/src/layouts/**`, `apps/*/src/components/layout/**`, `apps/*/src/index.css`, `apps/*/src/main.css`, `apps/*/src/global.css`, `apps/*/src/reset.css`, `apps/*/src/variables.*`, `apps/*/src/assets/variables.*`, `apps/*/src/assets/reset.*`, `apps/*/src/assets/global.*`, `apps/*/src/assets/theme.*`
* **共享包**: `packages/*/package.json`, `packages/*/src/index.*`, `packages/*/src/schema/**`, `packages/*/src/schemas/**`, `packages/*/src/types/**`, `packages/*/src/config/**`, `packages/*/tsconfig*.json`
* **技能和代理能力文件**: `skills/**`
* **文档权威来源**: `docs/项目需求文档.md`, `docs/UI 设计规范.md`, `docs/supermech/**`
* **代理指令文件**: `GEMINI.md`, `CLAUDE.md`, `AGENTS.md` (修改前需绝对确认)

### 5.3 前端 UI 规则

对于 UI 任务，建议修改与该任务相关的特定组件。

**建议：**
- 仅修改相关页面或组件。
- 使用局部作用域样式。
- 使用现有的设计标记。
- 重用现有的布局和主题约定。

**除非已确认，否则请避免：**
- 修改全局 CSS。
- 修改重置样式。
- 修改主题变量。
- 修改应用级布局。
- 修改共享组件样式。
- 修改 Tailwind、Vite、PostCSS、UnoCSS、Biome、Turbo 或工作区配置。

### 5.4 大文件规则

对于任何超过 300 行的文件：
1. 不要替换整个文件。
2. 不要使用全文件写入操作。
3. 使用小范围的针对性编辑。
4. 如果必须大幅重写文件，请先征得用户同意。
5. 修改后，报告新增和删除的行数。

### 5.5 依赖项规则

未经确认，请勿修改依赖项文件 (`package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` 等)。

如需更改依赖项：
1. 说明需要此依赖项的原因。
2. 说明此更改会影响根工作区还是子项目。
3. 在修改文件或运行安装命令之前，请先征得确认。
