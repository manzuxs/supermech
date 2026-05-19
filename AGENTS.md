# Supermech — Visual Workbench

Agent outputs structured JSON → React frontend renders real-time visualizations → user feedback writes back to JSON.

## Quick Reference

```bash
npx @supermech/init          # Bootstrap .supermech/ + install skills to .claude/skills/
npx @supermech/cli            # Start standalone workbench server
pnpm dev:web                  # Dev: Vite + HMR at localhost:5173
pnpm typecheck                # tsc --noEmit across all packages
```

## Published Packages

| Package | Purpose |
|---------|---------|
| `@supermech/schema` | TS types + `validateState()` |
| `@supermech/runtime` | `readState()` / `writeState()` / `watchState()` + Vite plugin + middleware |
| `@supermech/init` | `npx @supermech/init` bootstrap + skill installation |
| `@supermech/cli` | `npx @supermech/cli` standalone workbench server |

## State Files

```
.supermech/<plan>/state-<skill>.json    # Agent writes per-skill state in plan directories
.supermech/config.json                  # Project configuration
.supermech/skills/<skill>/SKILL.md      # Skill definitions (agent discovers by listing)
```

Plans are auto-created by the agent based on the user's request topic. CLI detects them automatically. No user management needed.

## How It Works

1. Agent creates `.supermech/<plan>/state-<skill>.json` with structured WorkbenchState JSON
2. CLI server watches file → pushes SSE event → UI re-fetches via `GET /__state`
3. User interacts in UI → POST/PATCH to `/__state/*` → middleware writes file
4. Agent reads `feedback[]` on next iteration

## Skills

| Skill | View | File |
|-------|------|------|
| `supermech-brainstorming` | MindMap | `.supermech/<plan>/state-brainstorming.json` |
| `supermech-writing-plans` | PlanEditor | `.supermech/<plan>/state-writing-plans.json` |
| `supermech-executing-plans` | KanbanBoard | `.supermech/<plan>/state-executing-plans.json` |

Skills are independent. Any skill can be used without the others.
`meta.activeSkill` controls which view renders. `null` = idle canvas.
