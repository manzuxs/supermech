<h1 align="center">Supermech</h1>

<p align="center">
  <em>Visual workbench for AI agent workflows.</em>
  <br>
  Structured JSON bridges agent logic to real-time visualizations — brainstorm, plan, execute, and review in a visual canvas.
</p>

<p align="center">
  <a href="#新人上手指南">新人上手指南</a> •
  <a href="#what-is-supermech">What is Supermech?</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#packages">Packages</a> •
  <a href="#development">Development</a>
</p>

---

## 新人上手指南

如果你是第一次接触 Supermech，按照下面的步骤操作，大约 **5 分钟** 就能跑通整个流程。

### 前提条件

- **Node.js 22+** — 在终端运行 `node -v` 确认版本
- **一个 AI Agent**（Claude Code / Cursor / Windsurf / Gemini CLI）— Supermech 是 agent 的"眼睛"，需要配合 agent 使用
- **pnpm**（仅开发 Supermech 本身时需要）

### 第一步：安装 Supermech 到你的项目

进入你的项目目录，执行：

```bash
cd your-project
npx @supermech/init
```

执行后，你会看到类似这样的输出：

```
Supermech initialized at /path/to/your-project/.supermech
Skills installed: brainstorming, writing-plans, executing-plans
Agent directories: .claude/skills/supermech-*
```

此时你的项目里多了这些文件和目录：

```
your-project/
├── .supermech/                        # ← Supermech 工作目录
│   ├── config.json                    #    工作区配置
│   └── skills/                        #    技能定义（agent 的"说明书"）
│       ├── brainstorming/             #    头脑风暴：生成思维导图
│       │   └── SKILL.md
│       ├── writing-plans/             #    编写计划：生成任务树
│       │   └── SKILL.md
│       └── executing-plans/           #    执行计划：看板跟踪进度
│           └── SKILL.md
└── .claude/skills/                    # ← Agent 自动发现的技能目录
    ├── supermech-brainstorming/
    ├── supermech-writing-plans/
    └── supermech-executing-plans/
```

> **`.supermech/` 是干嘛的？** 它是 Supermech 的数据目录。Agent 执行技能时，会把结构化结果写入 `.supermech/<话题>/state-<技能>.json`，前端再读取这个 JSON 渲染成可视化界面。整个过程不需要数据库、不需要后端服务，一个 JSON 文件就是全部。

> **`.claude/skills/` 是干嘛的？** 这是 Claude Code 的技能目录。Agent 启动时会扫描这个目录，发现 `supermech-*` 技能并加载。如果你用其他 agent（如 Cursor），可以通过 `--agent cursor` 参数安装到对应目录。

### 第二步：启动可视化工作台

```bash
npx @supermech/cli
```

你会看到：

```
Supermech workbench running at http://localhost:4388
```

在浏览器打开 `http://localhost:4388`，你会看到一个包含左侧栏、中央画布、右侧栏的界面。此时画布是空的——因为还没有 agent 创建任何内容。

### 第三步：让 Agent 使用技能

现在回到你的 AI Agent（如 Claude Code），直接开始一个话题。比如：

> "帮我分析一下用户登录模块的安全方案"

Agent 会自动调用 `supermech-brainstorming` 技能，在 `.supermech/` 下创建对应的 plan 目录和 state 文件：

```
.supermech/
└── 用户登录安全/                          # ← Agent 根据话题自动创建的 plan 目录
    └── state-brainstorming.json           # ← 结构化的头脑风暴结果
```

切回浏览器，工作台界面会实时更新——你会看到一棵思维导图，展示 Agent 的分析结果。左侧栏可以看到所有的 plan 和 skill，右侧栏可以查看节点详情、添加反馈。

### 第四步：完整的 Plan → Execute 流程

下面是一个完整的工作流示例：

**① 需求分析（brainstorming）**

在 Agent 中说：
> "分析用户认证模块，列出所有需要关注的方面"

Agent 执行 `supermech-brainstorming`，生成树状思维导图，涵盖安全、性能、UX 等维度。

**② 制定计划（writing-plans）**

分析完成后，对 Agent 说：
> "把这个分析结果转化为实现计划"

Agent 执行 `supermech-writing-plans`，将分析结果转化为带 TDD 步骤、文件列表、质量门禁的任务树。你可以在 PlanEditor 视图中看到完整的任务依赖关系。

**③ 执行计划（executing-plans）**

对 Agent 说：
> "开始执行计划"

Agent 执行 `supermech-executing-plans`，任务显示在看板视图的三列中（Pending → Active → Done）。Agent 逐个执行任务，自动更新状态。你可以在右侧面板对完成的任务打分（1-5 星）。

**④ 反馈闭环**

在执行过程中，你可以随时在 UI 中点击节点添加反馈意见。Agent 下一轮执行时会读取这些反馈并据此调整。

### CLI 参数参考

| 参数 | 作用 | 示例 |
|------|------|------|
| （无参数） | 安装全部 3 个技能到 Claude Code | `npx @supermech/init` |
| `--with-skills <列表>` | 只安装指定技能，逗号分隔 | `npx @supermech/init --with-skills brainstorming` |
| `--no-skills` | 不安装技能，只创建 .supermech/ 和 config.json | `npx @supermech/init --no-skills` |
| `--agent <名称>` | 安装到指定 agent 目录 | `npx @supermech/init --agent cursor` |
| `--agent all` | 安装到所有支持的 agent | `npx @supermech/init --agent all` |

支持的 agent：`claude`（默认）、`codex`、`gemini`、`cursor`、`windsurf`、`claude-internal`。

### 常见问题

**Q: 执行 `npx @supermech/init` 报错？**

确保 Node.js 版本 >= 22：`node -v`。如果版本过低，用 nvm 切换：
```bash
nvm install 22
nvm use 22
```

**Q: Agent 没有自动使用 Supermech 技能？**

检查 `.claude/skills/` 目录下是否有 `supermech-*` 子目录。如果没有，重新执行 `npx @supermech/init`。如果用的是其他 agent，确认 `--agent` 参数是否正确。

**Q: 工作台页面打开后是空的？**

正常。工作台只在 agent 创建了 plan 和 state 文件后才有内容。先在 agent 中发起一个话题，切回浏览器就能看到实时更新。

**Q: 可以在一个项目中管理多个 plan 吗？**

可以。每次和 agent 讨论不同话题，agent 会自动在 `.supermech/` 下创建不同的 plan 目录。工作台左侧栏会列出所有 plan，点击即可切换。

### 三个技能分别做什么？

| 技能 | 可视化视图 | 什么时候用 |
|------|-----------|-----------|
| `brainstorming` | 思维导图（树状 SVG） | 需求分析、方案探索、头脑风暴 |
| `writing-plans` | 计划编辑器（树 + 详情面板） | 将想法转化为可执行的任务计划 |
| `executing-plans` | 看板（3 列拖拽） | 跟踪执行进度、质量门禁、评分 |

三个技能是**独立的**，不是强制流水线。你可以只用 brainstorming 做分析，也可以跳过前两步直接用 executing-plans。

---

## What is Supermech?

Supermech transforms agent-driven workflows from terminal/Markdown interactions into a **data-driven visual platform**. Agents write structured JSON → the frontend renders real-time visualizations → user feedback writes back to JSON for the next agent iteration.

It's designed as a **low-invasion sidecar**: any project (Node, Python, Go, or otherwise) can add a `.supermech/` directory and immediately begin using Supermech skills.

### Current Baseline

This `README` and [`docs/当前实施重规划.md`](/Users/macxm/service/codex/superpowers-plus/docs/当前实施重规划.md) are the current execution baseline.

- The primary state model is plan-scoped, skill-scoped files: `.supermech/<plan>/state-<skill>.json`
- `sessionId` identifies a run/session context and must not be treated as the skill name
- Historical docs may still mention a single `state.json`, fixed canvas assumptions, or older dependency-field drafts; treat those as background unless restated here

### Current Skills

| Skill | View | Purpose |
|-------|------|---------|
| **brainstorming** | MindMap (SVG tree) | Socratic design exploration → structured decisions |
| **writing-plans** | PlanEditor (tree + detail) | Implementation plans with TDD steps and quality gates |
| **executing-plans** | FlowchartCanvas + DetailPanel | Execution with run/review/debug/completion semantics, subagent/inline modes |

Skills are **independent** — not a pipeline. Use only what you need.

`writing-plans` is the execution handoff point. Choosing an execution mode should create or hydrate `state-executing-plans.json` from the current plan.

**Phase C** adds run/review/debug/completion semantics to `executing-plans` instead of creating new top-level canvases. Execution runs (`implementer`, `spec-reviewer`, `code-reviewer`) track who did what, debug traces surface investigation steps per task, and completion checks gate the finish-ready signal at canvas level.

---

## How It Works

```
Agent (Brain)          React Frontend (Canvas)
    │                        │
    │   writes state file    │
    ├───────────────────────►│  Vite plugin → HMR → re-render
    │                        │
    │  ◄─────────────────────┤  User action → middleware → write state file
    │   reads feedback       │
```

**Data flow:**

1. **Agent → JSON**: Agent executes a skill and writes structured JSON to `.supermech/<plan>/state-<skill>.json`
2. **JSON → UI**: The Vite plugin watches the file → invalidates the virtual module → sends HMR event → React Context re-fetches via GET
3. **UI → JSON**: User interacts (clicks, rates, annotates) → Context calls middleware API → middleware writes the update to file
4. **JSON → Agent**: Agent reads the state file on the next iteration, including any new `feedback[]` entries

### Directory Layout

```
.supermech/                     # Standard product directory (config + skills + plan-scoped state)
├── config.json                 # Workspace configuration (optional)
├── skills/                     # Agent discovers skills by listing this directory
│   ├── visual-brainstorming/   #   SKILL.md defines behavior
│   ├── visual-writing-plans/
│   └── visual-executing-plans/
└── 用户认证/                    # One plan directory per work topic
    ├── state-brainstorming.json
    ├── state-writing-plans.json
    └── state-executing-plans.json

packages/
├── schemas/                    # @supermech/schema — types + runtime validation
├── watcher/                    # @supermech/runtime — file I/O + Vite plugin
└── init/                       # @supermech/init — project initializer

apps/web/                       # React frontend (Vite + React 18 + Tailwind v4)
```

---

## Packages

Supermech is published as three npm packages, each independently usable:

| Package | Description |
|---------|-------------|
| [`@supermech/schema`](./packages/schemas/) | TypeScript types + zod schemas for `WorkbenchState`. Validates state files at runtime. Zero dependencies. |
| [`@supermech/runtime`](./packages/watcher/) | `readState()` / `writeState()` / `watchState()` for agent scripts. Includes a Vite plugin for the workbench UI. |
| [`@supermech/init`](./packages/init/) | `initProject()` to bootstrap `.supermech/` directory in any project. |

---

## Development

```bash
git clone <repo>
cd supermech
pnpm install
pnpm dev:web    # Start workbench at localhost:5173
pnpm typecheck  # TypeScript check across all packages
pnpm check      # Biome lint + format
pnpm check:fix  # Auto-fix issues
```

### Project Structure

```
apps/web/          — React workbench (Vite + React 18 + Tailwind v4 + i18n)
packages/schemas/  — @supermech/schema: types + zod validation
packages/watcher/  — @supermech/runtime: file I/O + Vite plugin
packages/init/     — @supermech/init: project initializer
skills/            — Legacy skill definitions (migrating to .supermech/skills/)
docs/              — Product docs and sample state snapshots
```

---

## Architecture

- **No build step for packages** — TypeScript sources consumed directly (workspace resolution)
- **State file as protocol** — JSON file is the single source of truth; no database, no service
- **HMR-driven UI** — Vite plugin watches file changes and pushes to React via custom HMR events
- **Plan-scoped states** — Optional plan subdirectories for parallel work contexts
- **Extensible skills** — Add a skill by creating `.supermech/skills/<name>/SKILL.md`; no framework changes needed

---

## Design Principles

1. **Low invasion** — A `.supermech/` directory and a few JSON files is all a project needs. No framework lock-in.
2. **Skill independence** — Skills are not a pipeline. Use only what you need.
3. **Agent-owned state** — The agent controls status transitions; the UI provides visualization and feedback.
4. **Runtime validation** — Every state mutation is validated against the schema before write.

---

## License

[MIT](./LICENSE)
