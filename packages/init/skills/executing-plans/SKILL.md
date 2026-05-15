---
name: supermech-executing-plans
description: Execute implementation plans from writing-plans. One task at a time with quality gates. Updates .supermech/<plan>/state-executing-plans.json for the Supermech KanbanBoard to render.
---

# Visual Executing Plans

Load a plan, review critically, execute all tasks one at a time through quality gates, report when complete.

**Announce at start:** "I'm using the executing-plans skill to implement this plan."

## Plan Directory

Use the same plan directory as writing-plans: `.supermech/<plan>/`. Read the existing task nodes from `state-writing-plans.json`, then write execution progress to `state-executing-plans.json`.

## The Process

### Step 1: Load and Review Plan

1. Read `.supermech/<plan>/state-writing-plans.json` to get the task list
2. Copy the task nodes into `.supermech/<plan>/state-executing-plans.json`
3. Review critically — identify any questions or concerns about the plan
4. If concerns: raise them with your human partner before starting
5. If no concerns: set `meta.activeSkill: "executing-plans"` and begin

### Step 2: Execute Tasks One at a Time

**Only ONE task has `status: "active"` at a time.**

For each task:
1. Set `status: "active"`, `metadata.executionPhase: "implementing"`
2. Follow each implementation step exactly
3. Update `metadata.executionPhase` as you progress: `implementing → editing-files → running-tests → reviewing`
4. Write execution events to `metadata.executionEvents[]`:
   - `kind: "phase"` for phase transitions
   - `kind: "file"` for file changes
   - `kind: "command"` for command runs
   - `kind: "note"` for observations
5. Run quality gates when in `reviewing` phase
6. After verification passes: set `status: "done"`, `progress: 1.0`
7. Move to next task

### Step 3: Quality Gates

Quality gates run at the `reviewing` phase. Gate statuses live in `metadata.gateStates[]`:

| Gate Type | Purpose |
|-----------|---------|
| `spec-review` | Verify implementation matches requirements |
| `code-quality` | Verify code is clean, tested, maintainable |

Gates are preset by `riskLevel`:
- `low`: all gates disabled
- `medium`: spec-review enabled + required
- `high`: both gates enabled + required

For each gate:
1. Set `status: "running"`
2. Run the review
3. Set `status: "passed"` or `status: "failed"`
4. If failed: fix the issues and re-run

## When to Stop and Ask for Help

**STOP executing immediately when:**
- You hit a blocker (missing dependency, test fails, instruction unclear)
- Plan has critical gaps preventing starting
- You don't understand an instruction
- Verification fails repeatedly after multiple attempts

**Ask for clarification rather than guessing.**

## When to Revisit Earlier Steps

- Partner updates the plan based on your feedback → return to Step 1
- Fundamental approach needs rethinking → return to brainstorming

**Don't force through blockers.** Stop and ask.

## User Feedback

After each task completes, the user can rate quality (1-5 stars) in the KanbanBoard. Low ratings (1-2 stars) trigger a **"Re-plan & Re-execute"** button, which resets the node to `status: "pending"` and adds a feedback entry with `quickAction: "replan"`.

## State Schema

Write to `.supermech/<plan>/state-executing-plans.json`:

```json
{
  "meta": {
    "projectName": "<plan-name>",
    "sessionId": "executing-plans",
    "activeSkill": "executing-plans",
    "agentStatus": "writing"
  },
  "canvas": {
    "skillType": "executing-plans",
    "nodes": [
      {
        "id": "task-unique-id",
        "label": "short task title",
        "status": "pending | active | done",
        "progress": 0.0,
        "parentId": null,
        "children": [],
        "metadata": {
          "goal": "what this task achieves",
          "executionPhase": "implementing | editing-files | running-tests | reviewing | idle",
          "activeFiles": ["src/currently-editing.ts"],
          "executionEvents": [
            {
              "kind": "phase | file | command | note",
              "message": "description of what happened",
              "timestamp": "ISO-8601",
              "status": "info | success | warning | error"
            }
          ],
          "gateStates": [
            {"type": "spec-review | code-quality", "status": "pending | running | passed | failed | skipped", "attemptedAt": "ISO-8601"}
          ],
          "qualityGates": [
            {"type": "spec-review | code-quality", "label": "Spec Compliance", "enabled": true, "required": true}
          ],
          "riskLevel": "low | medium | high"
        }
      }
    ],
    "edges": [
      {"from": "task-a", "to": "task-b"}
    ]
  },
  "feedback": [],
  "ui": {
    "theme": "system",
    "leftSidebarOpen": true,
    "rightSidebarOpen": true,
    "selectedNodeId": null
  }
}
```

## Key Rules

- Only ONE task has `status: "active"` at a time
- `status` and `progress` are Agent-only — UI displays them, user can't change them
- Set `executionPhase` to signal what you're doing right now
- Write `executionEvents[]` to build an execution trace
- Low user ratings (1-2 stars) → user sees "Re-plan & Re-execute" button
- Quality gates are preset by `riskLevel`; user can override in the UI
- Never start implementation on main/master without user consent
- `sessionId` must be `"executing-plans"`
- After all tasks done, set `meta.activeSkill: null`
