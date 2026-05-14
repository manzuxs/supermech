---
name: visual-writing-plans
description: >-
  Write comprehensive implementation plans with structured, interactive UI rendering.
  Same process as standard writing-plans, but output is structured JSON with
  separate fields for goal, implementation steps, and verification steps —
  the PlanEditor renders these as a tree + tabbed detail panel.
---

# Visual Writing Plans

Same process as the standard `writing-plans` skill, but output is **structured JSON**.
The PlanEditor renders a two-panel view: a phase-grouped task tree on the left, and
a tabbed detail panel (Goal / Code Steps / Tests) on the right. This replaces the
flat Markdown document with a scannable, feedback-rich interface.

You write two things into `state.json`:

1. **PlanHeader** into `canvas.metadata.planHeader` — the overall plan context
2. **Task nodes** into `canvas.nodes[]` — each with structured `metadata`

---

## Output Format

### PlanHeader (written once at plan creation)

This provides the plan-level context displayed above the task tree.

```json
{
  "canvas": {
    "metadata": {
      "planHeader": {
        "goal": "Add user authentication with OAuth2 and JWT session management",
        "architecture": "Backend OAuth2 provider integration with Express middleware; frontend AuthContext wrapping React Router",
        "techStack": ["Express.js", "Passport.js", "React", "JWT"],
        "phases": [
          { "name": "Foundation", "description": "Core auth infrastructure" },
          { "name": "Integration", "description": "Provider-specific handlers" },
          { "name": "UI & Polish", "description": "Frontend auth flows and edge cases" }
        ]
      }
    }
  }
}
```

### Task Node (one per task)

Each task uses structured `metadata` with separate fields for goal, implementation
steps, files, and verification steps — no big `description` blob.

```json
{
  "id": "task-1",
  "label": "OAuth2 provider setup",
  "parentId": null,
  "children": [],
  "metadata": {
    "goal": "Configure Passport.js with Google OAuth2 strategy",
    "phase": "Foundation",
    "riskLevel": "medium",
    "estimatedMinutes": 15,
    "assignee": "backend",
    "files": [
      { "path": "src/auth/passport-config.ts", "type": "create", "description": "Passport strategy setup" },
      { "path": "src/auth/providers/google.ts", "type": "create", "description": "Google OAuth2 handler" },
      { "path": "tests/auth/google.test.ts", "type": "test" }
    ],
    "implementationSteps": [
      {
        "description": "Install passport and google-oauth20 packages",
        "code": "npm install passport passport-google-oauth20",
        "language": "bash"
      },
      {
        "description": "Create Passport strategy configuration",
        "code": "import passport from 'passport';\nimport { Strategy as GoogleStrategy } from 'passport-google-oauth20';\n\npassport.use(new GoogleStrategy({\n  clientID: process.env.GOOGLE_CLIENT_ID!,\n  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,\n  callbackURL: '/auth/google/callback',\n}, (accessToken, refreshToken, profile, done) => {\n  done(null, profile);\n}));",
        "language": "typescript"
      },
      {
        "description": "Mount Google auth routes",
        "code": "router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));\nrouter.get('/auth/google/callback', passport.authenticate('google', { session: false }), authCallback);",
        "language": "typescript"
      }
    ],
    "verificationSteps": [
      {
        "description": "Test that GET /auth/google redirects to Google",
        "command": "npx jest tests/auth/google.test.ts --verbose",
        "expectedOutput": "PASS  tests/auth/google.test.ts\n  ✓ redirects to Google OAuth (50 ms)"
      },
      {
        "description": "Test callback with valid code returns JWT",
        "code": "it('returns JWT on valid callback', async () => {\n  const res = await request(app).get('/auth/google/callback?code=valid');\n  expect(res.status).toBe(200);\n  expect(res.body.token).toBeDefined();\n});",
        "language": "typescript"
      }
    ]
  }
}
```

---

## Phase Grouping

Tasks that belong to the same subsystem or development phase should share the same
`metadata.phase` value. The PlanEditor groups tasks by phase in the left tree.

- Do not create more than 4 phases per plan
- Phase names from the PlanHeader should be reused in task metadata
- If a task spans phases, pick the phase where most of its code lives

---

## Dependencies

Use `edges[]` for task-level dependencies. The PlanEditor shows dependency labels
on each task in the tree.

```json
"edges": [
  { "from": "task-1", "to": "task-3", "label": "blocks" }
]
```

`from` = prerequisite, `to` = dependent. Multiple edges are allowed per task.

---

## Scope Check

Same as standard writing-plans: if the spec covers multiple independent subsystems,
break into separate plans.

---

## File Structure

List each file with its change type and a short description of its responsibility.

- `files.path` — exact file path relative to project root
- `files.type` — `create` | `modify` | `test` | `delete`
- `files.description` — one-line responsibility summary (omit for obvious files)

---

## Bite-Sized Task Granularity

Each `implementationStep` is one actionable unit (2–5 min), covering exactly one change:

```
Step example: "Create Passport strategy configuration"
  → includes the actual code, not "add config later"
Step example: "Mount Google auth routes"
  → includes the route handlers inline
```

Each step must contain either `code` (the snippet to write) or `command` (the command to run).

---

## No Placeholders

Same rule as standard writing-plans: every field must contain real content.

**Never acceptable:**
- `"goal": "TBD"` or empty string
- `"description": "Add error handling"` without specifics
- `"code": "// implement later"`
- `"verificationSteps": [{"description": "Write tests"}]` without test code or commands
- Steps that describe what to do without showing the code or command

---

## Quality Gate Presets

When creating task nodes, set `metadata.qualityGates` based on `riskLevel`:

| riskLevel | spec-review | code-quality |
|-----------|-------------|--------------|
| `low`     | disabled    | disabled     |
| `medium`  | enabled, required | disabled |
| `high`    | enabled, required | enabled, required |

Users can override these presets in the UI Detail Panel later.

```json
// Example: high risk task with both gates
{
  "riskLevel": "high",
  "qualityGates": [
    { "type": "spec-review", "label": "Spec Compliance Review", "enabled": true, "required": true },
    { "type": "code-quality", "label": "Code Quality Review", "enabled": true, "required": true }
  ]
}
```

Low risk tasks can omit `qualityGates` entirely.

---

## Execution Handoff

After writing the plan, tell the user:
> 计划已写好。确认无误后，请在底部的输入框中输入 **`/execute`** 进入执行模式。

The PlanEditor's feedback input will detect `/execute` and automatically switch to the executing-plans skill. The user does not need to manually switch skills.

Alternatively:
1. **Subagent-Driven (recommended)** — fresh subagent per task
2. **Visual Execution** — user runs `/execute` in the input

---

## Checklist

1. **Scope check** — single subsystem?
2. **PlanHeader** — goal, architecture, techStack, phases
3. **Phase groups** — assign each task a `phase` value
4. **Task nodes** — goal, files, implementationSteps, verificationSteps
5. **Dependencies** — `edges[]` between tasks
6. **Self-review** — no placeholders, consistent types, spec coverage
7. **Set activeSkill** — `meta.activeSkill: "writing-plans"`, `canvas.skillType: "writing-plans"`
8. **Execution handoff** — guide the user to type `/execute`

---

## Backward Compatibility

If reading an existing plan whose nodes use the old flat `description` format,
render it as-is (the PlanEditor falls back to displaying `metadata.description`
in the Goal tab). Only new or rewritten plans need the structured format.
