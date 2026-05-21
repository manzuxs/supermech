---
name: supermech-writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code. Writes structured plan to .supermech/<plan>/state-writing-plans.json for the Supermech PlanEditor to render.
---

# Visual Writing Plans

Write comprehensive implementation plans as structured JSON. Assume the engineer has zero context for the codebase and questionable taste. Document everything: which files to touch, code, tests, docs to reference, how to verify. DRY. YAGNI. TDD. Frequent commits.

**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."

## Plan Directory

Use the same plan directory created during brainstorming (e.g., `.supermech/<plan>/`). If there was no brainstorming session, create a new plan directory based on the user's request topic.

Write to: `.supermech/<plan>/state-writing-plans.json`

## Scope Check

If the spec covers multiple independent subsystems, suggest breaking into separate plans — one per subsystem. Each plan should produce working, testable software on its own.

## File Structure

Before defining tasks, map out which files will be created or modified and what each one is responsible for:

- Design units with clear boundaries and well-defined interfaces
- Each file should have one clear responsibility
- Prefer smaller, focused files over large ones that do too much
- In existing codebases, follow established patterns. If a file has grown unwieldy, a split is reasonable.

This structure informs task decomposition. Each task should produce self-contained changes.

## Bite-Sized Task Granularity

**Each task is one action (2-5 minutes):**
- "Write the failing test" — one task
- "Run it to make sure it fails" — one task
- "Implement the minimal code to pass" — one task
- "Run the tests — they pass" — one task
- "Commit" — one task

## No Placeholders

Every step must contain actual content. These are **plan failures** — never write them:
- "TBD", "TODO", "implement later", "fill in details"
- "Add appropriate error handling" / "add validation" / "handle edge cases"
- "Write tests for the above" (without actual test code)
- "Similar to Task N" (repeat the code — tasks may be read out of order)
- Steps that describe what to do without showing how

## Checklist

1. **Find or create plan directory** — reuse the brainstorming plan, or create a new one
2. **Map file structure** — list files to create/modify with their responsibilities
3. **Write PlanHeader** — goal, architecture, tech stack, phases → put in `canvas.metadata.planHeader`
4. **Define phases** — up to 4 logical phases (Setup, Core, Integration, Polish)
5. **Create task nodes** — each task has goal, files, implementation steps, verification steps, phase, risk level
6. **Define dependencies** — use `metadata.dependencies[]` for task ordering
7. **Self-review** — spec coverage, placeholder scan, type consistency (see below)
8. **Hand off to execution** — task statuses are `"pending"`, ready for executing-plans

## Self-Review

After writing the complete plan:

1. **Spec coverage:** Skim each requirement in the spec. Can you point to a task that implements it? List any gaps.
2. **Placeholder scan:** Search for red flags — any of the patterns from "No Placeholders". Fix them.
3. **Type consistency:** Do types, method signatures, and property names used in later tasks match what was defined earlier?

Fix issues inline and move on.

## Execution Handoff

After saving the plan, tell the user:

> "Plan written to `.supermech/<plan>/state-writing-plans.json`. Ready to execute with executing-plans skill."

## State Schema

Write to `.supermech/<plan>/state-writing-plans.json`:

```json
{
  "meta": {
    "projectName": "<plan-name>",
    "sessionId": "<plan-name>--writing-plans",
    "activeSkill": "writing-plans",
    "agentStatus": "writing"
  },
  "canvas": {
    "skillType": "writing-plans",
    "nodes": [
      {
        "id": "task-unique-id",
        "label": "short task title (3-8 words)",
        "status": "pending | active | done",
        "progress": 0.0,
        "parentId": null,
        "children": [],
        "metadata": {
          "goal": "what this task achieves",
          "files": [
            {"path": "src/feature/file.ts", "type": "create | modify | test | delete", "description": "what this file does"}
          ],
          "implementationSteps": [
            {"description": "step description", "code": "actual code", "command": "exact shell command", "expectedOutput": "..."}
          ],
          "verificationSteps": [
            {"description": "verification step"}
          ],
          "dependencies": ["other-task-id"],
          "phase": "Phase 1: Setup",
          "riskLevel": "low | medium | high",
          "estimatedMinutes": 30,
          "qualityGates": [
            {"type": "spec-review | code-quality", "label": "Spec Compliance", "enabled": true, "required": true}
          ]
        }
      }
    ],
    "metadata": {
      "planHeader": {
        "goal": "Build feature X with Y capability",
        "architecture": "2-3 sentences about the approach",
        "techStack": ["React 18", "TypeScript", "Express"],
        "phases": [
          {"name": "Phase 1: Setup", "description": "Project scaffolding and config"},
          {"name": "Phase 2: Core", "description": "Core logic implementation"}
        ]
      }
    }
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

- `status` and `progress` are Agent-only fields — UI displays them, user cannot change them
- `metadata.dependencies[]` define task dependencies for execution ordering
- PlanHeader goes in `canvas.metadata.planHeader`
- Keep `label` short (3-8 words), put details in `metadata`
- `sessionId` must stay stable for the current plan+skill file, e.g. `"<plan-name>--writing-plans"`
- `qualityGates` are preset by `riskLevel`: `low` = all disabled, `medium` = spec-review required, `high` = both required
- Reuse the same plan directory as brainstorming if one exists
