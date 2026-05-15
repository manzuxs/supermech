---
name: supermech-executing-plans
description: Execute implementation plans with quality gates. Update .supermech/state-executing-plans.json for the Supermech KanbanBoard to render.
---

# Visual Executing Plans

Write to `.supermech/state-executing-plans.json` to render a 3-column Kanban board with quality gates.

## State File

`.supermech/state-executing-plans.json`

## How It Works

1. Take tasks from the writing-plans plan
2. Execute one task at a time (`status: "active"`, max one at a time)
3. Report progress and execution events
4. Run quality gates (spec review, code quality) before marking done
5. User rates quality (1-5 stars) and can request re-plan

## Workflow

1. **Start execution** — set first task to `status: "active"`, `meta.activeSkill: "executing-plans"`
2. **Set execution phase** — `metadata.executionPhase`: `implementing → editing-files → running-tests → reviewing → idle`
3. **Run quality gates** — set gate statuses in `metadata.gateStates[]`
4. **Mark done** — task `status: "done"`, `progress: 1.0`
5. **Handle feedback** — user ratings in `feedback[]`; low ratings (1-2 stars) trigger re-plan
6. **Clear canvas** — set `meta.activeSkill: null` when all done

## State Schema

```json
{
  "meta": {
    "projectName": "string",
    "sessionId": "executing-plans",
    "activeSkill": "executing-plans",
    "agentStatus": "writing"
  },
  "canvas": {
    "skillType": "executing-plans",
    "nodes": [
      {
        "id": "string",
        "label": "task title",
        "status": "pending | active | done",
        "progress": 0.0,
        "parentId": null,
        "children": [],
        "metadata": {
          "goal": "what this task achieves",
          "executionPhase": "implementing | editing-files | running-tests | reviewing | idle",
          "activeFiles": ["src/file.ts"],
          "executionEvents": [
            {"kind": "phase | file | command | note", "message": "...", "timestamp": "...", "status": "info | success | error"}
          ],
          "gateStates": [
            {"type": "spec-review | code-quality", "status": "pending | running | passed | failed"}
          ],
          "qualityGates": [
            {"type": "spec-review | code-quality", "label": "...", "enabled": true, "required": true}
          ],
          "riskLevel": "low | medium | high"
        }
      }
    ],
    "edges": [{"from": "task-a", "to": "task-b"}]
  },
  "feedback": [],
  "ui": { "theme": "system", "leftSidebarOpen": true, "rightSidebarOpen": true, "selectedNodeId": null }
}
```

## Key Rules

- Only ONE task has `status: "active"` at a time
- `status` and `progress` are Agent-only — UI displays them, user can't change them
- Set `executionPhase` to signal what you're doing right now
- Low user ratings (1-2 stars) → user sees "Re-plan & Re-execute" button
- Quality gates are preset by `riskLevel`: `low` = disabled, `medium` = spec-review required, `high` = both required
- Gate types: `"spec-review"` and `"code-quality"`
