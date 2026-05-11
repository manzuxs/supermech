---
name: visual-writing-plans
description: "Write comprehensive implementation plans with real-time Kanban visualization. Same detailed process as the standard writing-plans skill, but all task definitions are written to state.json for the workbench to render."
---

# Visual Writing Plans

Same process as the standard writing-plans skill, but output is **data-driven**. You write task definitions into `state.canvas.nodes` and the frontend renders a Kanban board. All tasks start as **pending** — status/progress updates belong to the executing-plans skill.

## Output Format

Write each task as a `CanvasNode` into `state.canvas.nodes`. Set `canvas.skillType: "writing-plans"` and `meta.activeSkill: "writing-plans"`.

```json
{
  "meta": { "activeSkill": "writing-plans", "agentStatus": "writing" },
  "canvas": {
    "skillType": "writing-plans",
    "nodes": [
      {
        "id": "task-1",
        "label": "Short task title (3-8 words)",
        "status": "pending",
        "progress": 0,
        "parentId": null,
        "children": [],
        "metadata": {
          "dependencies": [],
          "description": "Full task details including code examples, file paths, test commands",
          "estimatedMinutes": 5,
          "files": ["src/path/to/file.ts", "tests/path/to/test.ts"]
        }
      }
    ],
    "edges": [{ "from": "task-1", "to": "task-3", "label": "blocks" }]
  }
}
```

**Important:** You are DEFINING the plan, not executing it. All nodes start `status: "pending"`, `progress: 0`. Only the executing-plans skill changes these.

## Scope Check

If the spec covers multiple independent subsystems, it should have been broken into sub-project specs during brainstorming. If it wasn't, suggest breaking this into separate plans — one per subsystem. Each plan should produce working, testable software on its own.

## File Structure

Before defining tasks, map out which files will be created or modified and what each one is responsible for. Record this in each task's `metadata.files`.

- Design units with clear boundaries and well-defined interfaces
- Prefer smaller, focused files over large ones that do too much
- In existing codebases, follow established patterns

## Bite-Sized Task Granularity

**Each step is one action (2-5 minutes).** Break tasks down to this level. Record the full step details in `metadata.description`:

- "Write the failing test" — include the test code
- "Run it to make sure it fails" — include the command
- "Implement the minimal code to make the test pass" — include the code
- "Run the tests and make sure they pass" — include the command
- "Commit" — include the git commands

## Full Task Content in Description

Every `metadata.description` MUST contain the actual code, commands, and content the engineer needs — same standard as the original writing-plans skill. These are **never acceptable** in a description:

- "TBD", "TODO", "implement later", "fill in details"
- "Add appropriate error handling" (without specifics)
- "Write tests for the above" (without test code)
- "Similar to Task N" (repeat the code)
- Steps that describe what to do without showing how

## Dependencies

Use `edges[]` to express ordering. Each edge has `from` (dependency task) → `to` (dependent task). The Kanban board displays dependency labels on each card.

## Checklist

1. **Scope check** — is this one subsystem? If not, decompose
2. **File structure** — list files per task in `metadata.files`
3. **Write task nodes** — each with full code/content in `metadata.description`
4. **Add dependencies** — use `edges[]`
5. **Self-review** — check for placeholders, consistency, coverage
6. **Set activeSkill** — `meta.activeSkill: "writing-plans"` so the Kanban appears
7. **Execution handoff** — offer subagent-driven vs inline execution. If inline chosen, user will invoke visual-executing-plans separately.

## Status Mapping (for reference — only executing-plans changes these)

| NodeStatus | Kanban Column |
|------------|---------------|
| `pending`  | To Do |
| `active`   | In Progress |
| `done`     | Done |
| `accepted` | Done (reviewed) |
