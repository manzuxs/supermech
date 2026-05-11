# Superpowers+ — Visual Workbench

Monorepo: terminal/Markdown-driven agent workfloW upgraded to a data-driven visual platform. Agent outputs structured JSON → React frontend renders real-time visualizations → user feedback writes back to JSON.

## Architecture

```
Agent (Brain)          React Frontend (Canvas)
    │                        │
    │   写入 state.json       │
    ├───────────────────────►│  Vite plugin → HMR → re-render
    │                        │
    │  ◄─────────────────────┤  User action → middleware → write state.json
    │   下一轮读取反馈        │
```

Three layers:
- **Logic** — skills in `skills/` that write structured JSON to `state.json`
- **Data protocol** — `packages/schemas/` TypeScript types for `WorkbenchState`
- **Presentation** — `apps/web/` React app rendering MindMap or KanbanBoard

## Directory Structure

```
apps/web/                       # React frontend (Vite + React 18 + Tailwind v4)
├── src/
│   ├── main.tsx                # Entry: ThemeProvider + WorkbenchProvider
│   ├── App.tsx                 # 5-zone grid layout
│   ├── styles.css              # Tailwind v4 + CSS variables (light/dark)
│   ├── components/layout/      # Header, LeftSidebar, CenterCanvas, RightSidebar, Footer, ThemeToggle
│   ├── components/visuals/     # MindMap (brainstorming), KanbanBoard (plans)
│   ├── context/WorkbenchContext.tsx  # React Context: state + API calls + session management
│   ├── lib/i18n.ts             # i18next init
│   ├── locales/                # en.json, zh.json
│   └── env.d.ts                # virtual:superpowers/state declaration
├── index.html
├── vite.config.ts              # React + Tailwind + superpowersWatcherPlugin
└── tsconfig.json

packages/
├── schemas/src/                # Shared TypeScript types
│   ├── workbench.ts            # WorkbenchState, CanvasNode, CanvasEdge, FeedbackEntry
│   ├── brainstorm.ts           # BrainstormNodeMetadata
│   └── planner.ts              # PlanStepMetadata
├── watcher/src/
│   ├── vite-plugin.ts          # Vite plugin: virtual module + middleware + session management
│   └── session-manager.ts      # Session file CRUD utilities

skills/
├── visual-brainstorming/       # Agent skill: outputs tree nodes to state.json
├── visual-writing-plans/       # Agent skill: outputs plan tasks as Kanban nodes
└── visual-executing-plans/     # Agent skill: updates task status/progress in real-time

state.json                      # Single source of truth (or state-<sessionId>.json for sessions)
```

## Data Flow

1. **Agent → JSON**: Agent modifies `state.json` (or `state-<sessionId>.json`)
2. **JSON → UI**: Vite plugin watches file → invalidates virtual module → sends HMR custom event → Context re-fetches via GET
3. **UI → JSON**: User clicks/feedback → Context calls middleware API → middleware writes file, returns updated state
4. **JSON → Agent**: Agent reads state.json next iteration (via file or GET endpoint)

## API Endpoints (Vite middleware at `/__state`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/__state` | GET | Read current state |
| `/__state/select` | POST | Set selectedNodeId |
| `/__state/ui` | PATCH | Update UI prefs |
| `/__state/feedback` | POST | Add feedback entry |
| `/__state/node` | PATCH | Update node (status, progress, label) |
| `/__state/sessions` | GET | List sessions + current ID |
| `/__state/sessions` | POST | Create session `{sessionId}` |
| `/__state/sessions/switch` | POST | Switch session `{sessionId}` |
| `/__state/sessions/rename` | PATCH | Rename session `{sessionId, newLabel}` |
| `/__state/sessions/delete` | POST | Delete session `{sessionId}` |

## State Schema (`WorkbenchState`)

```typescript
interface WorkbenchState {
  meta:     { projectName, sessionId, activeSkill, agentStatus }
  canvas:   { skillType, nodes: CanvasNode[], edges: CanvasEdge[] }
  feedback: FeedbackEntry[]
  ui:       { theme, leftSidebarOpen, rightSidebarOpen, selectedNodeId }
}
```

`CanvasNode.status`: `pending | active | accepted | rejected | done`

## Available Skills

| Skill | Renders As | Purpose |
|-------|-----------|---------|
| `visual-brainstorming` | MindMap (SVG tree) | Explore ideas, propose approaches, design |
| `visual-writing-plans` | KanbanBoard (3-column) | Write implementation plans as task cards |
| `visual-executing-plans` | KanbanBoard (3-column) | Execute plans, update progress in real-time |

## Commands

```bash
pnpm dev:web       # Start Vite dev server at localhost:5173
pnpm typecheck     # tsc --noEmit for all packages
pnpm check         # biome check .
pnpm check:fix     # biome check --write .
pnpm build         # turbo run build
```

## Conventions

- `state.json` at workspace root is the default session. Sessions create `state-<sessionId>.json`
- Agent sets `meta.activeSkill` to enable canvas rendering (`null` = idle)
- Agent sets `canvas.skillType` to choose MindMap vs KanbanBoard
- Node status drives visual state (accepted=green, rejected=gray+strikethrough, active=breathing animation)
- MindMap uses `parentId`/`children` for tree hierarchy
- KanbanBoard uses `edges[]` for dependency tracking
- Use `metadata.description` for long-form content, `label` for short titles (3-8 words)
- Renaming a session only changes the UI label, not the Agent's internal sessionId
