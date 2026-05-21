import { z } from 'zod/v4';

// ── Core enums ──

export const agentStatusSchema = z.enum(['idle', 'thinking', 'writing', 'error']);
export const skillTypeSchema = z.string(); // extensible — any skill name is valid
export const nodeStatusSchema = z.enum(['pending', 'active', 'accepted', 'rejected', 'done']);
export const themeModeSchema = z.enum(['light', 'dark', 'system']);
export const gateTypeSchema = z.enum(['spec-review', 'code-quality']);
export const executionEventKindSchema = z.enum(['phase', 'file', 'command', 'review', 'note']);
export const executionEventStatusSchema = z.enum(['info', 'success', 'warning', 'error']);
export const executionFlowOrientationSchema = z.enum(['horizontal']);

export const executionOriginSchema = z.object({
  sourcePlanSessionId: z.string().min(1),
  sourceSkill: z.literal('writing-plans'),
  mode: z.enum(['subagent', 'inline']),
  hydratedAt: z.string().min(1),
});

// Phase C intentionally supports only these three run roles.
// Add new roles later through an explicit schema upgrade instead of widening to string now.
export const executionRunRoleSchema = z.enum(['implementer', 'spec-reviewer', 'code-reviewer']);

export const executionRunStatusSchema = z.enum([
  'queued',
  'running',
  'passed',
  'failed',
  'blocked',
]);

export const executionRunSchema = z.object({
  id: z.string().min(1),
  role: executionRunRoleSchema,
  status: executionRunStatusSchema,
  summary: z.string().optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
});

export const completionCheckItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  status: z.enum(['pending', 'passed', 'failed']),
  notes: z.string().optional(),
});

export const debugTraceItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  status: z.enum(['pending', 'active', 'resolved']),
  notes: z.string().optional(),
});

// ── Core objects ──

export const workbenchMetaSchema = z.object({
  projectName: z.string(),
  sessionId: z.string().optional(),
  activeSkill: skillTypeSchema.nullable(),
  agentStatus: agentStatusSchema,
});

export const canvasNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  status: nodeStatusSchema,
  progress: z.number().min(0).max(1),
  parentId: z.string().nullable(),
  children: z.array(z.string()),
  metadata: z.record(z.string(), z.unknown()),
});

export const canvasEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  label: z.string().optional(),
});

export const workbenchCanvasSchema = z.object({
  skillType: skillTypeSchema,
  nodes: z.array(canvasNodeSchema),
  edges: z.array(canvasEdgeSchema),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const feedbackEntrySchema = z.object({
  id: z.string(),
  nodeId: z.string(),
  text: z.string(),
  rating: z.number().min(1).max(5).nullable().optional(),
  section: z.enum(['goal', 'code', 'test', 'general']).nullable().optional(),
  stepIndex: z.number().int().nullable().optional(),
  quickAction: z.string().nullable(),
  createdAt: z.string(),
  processedAt: z.string().optional(),
});

export const uiPreferencesSchema = z.object({
  theme: themeModeSchema,
  leftSidebarOpen: z.boolean(),
  rightSidebarOpen: z.boolean(),
  selectedNodeId: z.string().nullable(),
});

// ── Skill-specific metadata ──

export const brainstormNodeMetadataSchema = z.object({
  description: z.string(),
  tags: z.array(z.string()),
});

export const brainstormSessionSchema = z.object({
  topic: z.string(),
  round: z.number().int(),
  totalRounds: z.number().int(),
  lastProcessedFeedbackAt: z.string().optional(),
});

export const qualityGateConfigSchema = z.object({
  type: gateTypeSchema,
  label: z.string(),
  enabled: z.boolean(),
  required: z.boolean(),
});

export const qualityGateStateSchema = z.object({
  type: gateTypeSchema,
  status: z.enum(['pending', 'running', 'passed', 'failed', 'skipped']),
  result: z.string().optional(),
  attemptedAt: z.string().optional(),
});

export const planStepFileSchema = z.object({
  path: z.string().min(1),
  type: z.enum(['create', 'modify', 'test', 'delete']),
  description: z.string().optional(),
});

export const implementationStepSchema = z.object({
  description: z.string().min(1),
  code: z.string().optional(),
  language: z.string().optional(),
  command: z.string().optional(),
  expectedOutput: z.string().optional(),
});

export const executionPhaseSchema = z.enum([
  'implementing',
  'editing-files',
  'running-tests',
  'reviewing',
  'fixing',
  'idle',
]);

export const planHeaderSchema = z.object({
  goal: z.string().min(1),
  architecture: z.string().min(1),
  techStack: z.array(z.string()).nonempty(),
  phases: z.array(z.object({ name: z.string(), description: z.string().optional() })).optional(),
});

export const executionEventSchema = z.object({
  kind: executionEventKindSchema,
  message: z.string().min(1),
  timestamp: z.string().min(1),
  status: executionEventStatusSchema.optional(),
  files: z.array(z.string().min(1)).optional(),
});

export const executionFlowStageSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  taskIds: z.array(z.string().min(1)),
});

export const executionFlowStageRelationSchema = z.object({
  fromStageId: z.string().min(1),
  toStageId: z.string().min(1),
  label: z.string().optional(),
});

export const executionFlowTaskRelationSchema = z.object({
  fromTaskId: z.string().min(1),
  toTaskId: z.string().min(1),
  label: z.string().optional(),
});

export const executionFlowSchema = z.object({
  orientation: executionFlowOrientationSchema,
  stages: z.array(executionFlowStageSchema),
  stageRelations: z.array(executionFlowStageRelationSchema).optional(),
  taskRelations: z.array(executionFlowTaskRelationSchema).optional(),
});

const implementationStepsSchema = z.array(implementationStepSchema);
const planStepFilesSchema = z.array(planStepFileSchema);
const qualityGateConfigListSchema = z.array(qualityGateConfigSchema);
const qualityGateStateListSchema = z.array(qualityGateStateSchema);
const executionEventsSchema = z.array(executionEventSchema);
const executionRunsSchema = z.array(executionRunSchema);
const debugTraceItemsSchema = z.array(debugTraceItemSchema);
const completionCheckItemsSchema = z.array(completionCheckItemSchema);

function pushIssues(
  ctx: z.RefinementCtx,
  basePath: Array<string | number>,
  issues: Array<{ path: PropertyKey[]; message: string }>,
) {
  for (const issue of issues) {
    ctx.addIssue({
      code: 'custom',
      path: [
        ...basePath,
        ...issue.path.filter(
          (part): part is string | number => typeof part === 'string' || typeof part === 'number',
        ),
      ],
      message: issue.message,
    });
  }
}

const workbenchStateBaseSchema = z.object({
  meta: workbenchMetaSchema,
  canvas: workbenchCanvasSchema,
  feedback: z.array(feedbackEntrySchema),
  ui: uiPreferencesSchema,
});

export const workbenchStateSchema = workbenchStateBaseSchema.superRefine((state, ctx) => {
  const nodeIds = new Set<string>();

  for (let i = 0; i < state.canvas.nodes.length; i++) {
    const node = state.canvas.nodes[i];

    if (nodeIds.has(node.id)) {
      ctx.addIssue({
        code: 'custom',
        path: ['canvas', 'nodes', i, 'id'],
        message: `duplicate id "${node.id}"`,
      });
    } else {
      nodeIds.add(node.id);
    }

    const metadata = node.metadata;

    if (metadata.goal !== undefined && typeof metadata.goal !== 'string') {
      ctx.addIssue({
        code: 'custom',
        path: ['canvas', 'nodes', i, 'metadata', 'goal'],
        message: 'must be a string',
      });
    }

    if (metadata.files !== undefined) {
      const result = planStepFilesSchema.safeParse(metadata.files);
      if (!result.success) {
        pushIssues(ctx, ['canvas', 'nodes', i, 'metadata', 'files'], result.error.issues);
      }
    }

    if (metadata.implementationSteps !== undefined) {
      const result = implementationStepsSchema.safeParse(metadata.implementationSteps);
      if (!result.success) {
        pushIssues(
          ctx,
          ['canvas', 'nodes', i, 'metadata', 'implementationSteps'],
          result.error.issues,
        );
      }
    }

    if (metadata.verificationSteps !== undefined) {
      const result = implementationStepsSchema.safeParse(metadata.verificationSteps);
      if (!result.success) {
        pushIssues(
          ctx,
          ['canvas', 'nodes', i, 'metadata', 'verificationSteps'],
          result.error.issues,
        );
      }
    }

    if (metadata.qualityGates !== undefined) {
      const result = qualityGateConfigListSchema.safeParse(metadata.qualityGates);
      if (!result.success) {
        pushIssues(ctx, ['canvas', 'nodes', i, 'metadata', 'qualityGates'], result.error.issues);
      }
    }

    if (metadata.gateStates !== undefined) {
      const result = qualityGateStateListSchema.safeParse(metadata.gateStates);
      if (!result.success) {
        pushIssues(ctx, ['canvas', 'nodes', i, 'metadata', 'gateStates'], result.error.issues);
      }
    }

    if (metadata.executionPhase !== undefined) {
      const result = executionPhaseSchema.safeParse(metadata.executionPhase);
      if (!result.success) {
        pushIssues(ctx, ['canvas', 'nodes', i, 'metadata', 'executionPhase'], result.error.issues);
      }
    }

    if (metadata.activeFiles !== undefined) {
      const result = z.array(z.string().min(1)).safeParse(metadata.activeFiles);
      if (!result.success) {
        pushIssues(ctx, ['canvas', 'nodes', i, 'metadata', 'activeFiles'], result.error.issues);
      }
    }

    if (metadata.executionEvents !== undefined) {
      const result = executionEventsSchema.safeParse(metadata.executionEvents);
      if (!result.success) {
        pushIssues(ctx, ['canvas', 'nodes', i, 'metadata', 'executionEvents'], result.error.issues);
      }
    }

    if (metadata.runs !== undefined) {
      const result = executionRunsSchema.safeParse(metadata.runs);
      if (!result.success) {
        pushIssues(ctx, ['canvas', 'nodes', i, 'metadata', 'runs'], result.error.issues);
      }
    }

    if (metadata.debugTrace !== undefined) {
      const result = debugTraceItemsSchema.safeParse(metadata.debugTrace);
      if (!result.success) {
        pushIssues(ctx, ['canvas', 'nodes', i, 'metadata', 'debugTrace'], result.error.issues);
      }
    }
  }

  const planHeader = state.canvas.metadata?.planHeader;
  if (planHeader !== undefined) {
    const result = planHeaderSchema.safeParse(planHeader);
    if (!result.success) {
      pushIssues(ctx, ['canvas', 'metadata', 'planHeader'], result.error.issues);
    } else {
      const phaseNames = new Set((result.data.phases ?? []).map((phase) => phase.name));
      if (phaseNames.size > 0) {
        for (let i = 0; i < state.canvas.nodes.length; i++) {
          const phase = state.canvas.nodes[i].metadata.phase;
          if (typeof phase === 'string' && !phaseNames.has(phase)) {
            ctx.addIssue({
              code: 'custom',
              path: ['canvas', 'nodes', i, 'metadata', 'phase'],
              message: `references phase "${phase}" not defined in planHeader.phases`,
            });
          }
        }
      }
    }
  }

  const executionFlow = state.canvas.metadata?.executionFlow;
  if (executionFlow !== undefined) {
    const result = executionFlowSchema.safeParse(executionFlow);
    if (!result.success) {
      pushIssues(ctx, ['canvas', 'metadata', 'executionFlow'], result.error.issues);
    } else {
      const stageIds = new Set<string>();

      for (let i = 0; i < result.data.stages.length; i++) {
        const stage = result.data.stages[i];
        if (stageIds.has(stage.id)) {
          ctx.addIssue({
            code: 'custom',
            path: ['canvas', 'metadata', 'executionFlow', 'stages', i, 'id'],
            message: `duplicate id "${stage.id}"`,
          });
        } else {
          stageIds.add(stage.id);
        }

        for (let j = 0; j < stage.taskIds.length; j++) {
          const taskId = stage.taskIds[j];
          if (!nodeIds.has(taskId)) {
            ctx.addIssue({
              code: 'custom',
              path: ['canvas', 'metadata', 'executionFlow', 'stages', i, 'taskIds', j],
              message: `references unknown node "${taskId}"`,
            });
          }
        }
      }

      for (let i = 0; i < (result.data.stageRelations ?? []).length; i++) {
        const relation = result.data.stageRelations?.[i];
        if (!relation) continue;
        if (!stageIds.has(relation.fromStageId)) {
          ctx.addIssue({
            code: 'custom',
            path: ['canvas', 'metadata', 'executionFlow', 'stageRelations', i, 'fromStageId'],
            message: `references unknown stage "${relation.fromStageId}"`,
          });
        }
        if (!stageIds.has(relation.toStageId)) {
          ctx.addIssue({
            code: 'custom',
            path: ['canvas', 'metadata', 'executionFlow', 'stageRelations', i, 'toStageId'],
            message: `references unknown stage "${relation.toStageId}"`,
          });
        }
      }

      for (let i = 0; i < (result.data.taskRelations ?? []).length; i++) {
        const relation = result.data.taskRelations?.[i];
        if (!relation) continue;
        if (!nodeIds.has(relation.fromTaskId)) {
          ctx.addIssue({
            code: 'custom',
            path: ['canvas', 'metadata', 'executionFlow', 'taskRelations', i, 'fromTaskId'],
            message: `references unknown node "${relation.fromTaskId}"`,
          });
        }
        if (!nodeIds.has(relation.toTaskId)) {
          ctx.addIssue({
            code: 'custom',
            path: ['canvas', 'metadata', 'executionFlow', 'taskRelations', i, 'toTaskId'],
            message: `references unknown node "${relation.toTaskId}"`,
          });
        }
      }
    }
  }

  const executionOrigin = state.canvas.metadata?.executionOrigin;
  if (executionOrigin !== undefined) {
    const result = executionOriginSchema.safeParse(executionOrigin);
    if (!result.success) {
      pushIssues(ctx, ['canvas', 'metadata', 'executionOrigin'], result.error.issues);
    }
  }

  const completionChecks = state.canvas.metadata?.completionChecks;
  if (completionChecks !== undefined) {
    const result = completionCheckItemsSchema.safeParse(completionChecks);
    if (!result.success) {
      pushIssues(ctx, ['canvas', 'metadata', 'completionChecks'], result.error.issues);
    }
  }
});

// ── Validation result ──

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateState(data: unknown, _skill?: string): ValidationResult {
  const result = workbenchStateSchema.safeParse(data);
  if (result.success) {
    return { valid: true, errors: [] };
  }
  const errors = result.error.issues.map((issue) => {
    const path = issue.path.join('.');
    return path ? `${path}: ${issue.message}` : issue.message;
  });
  return { valid: false, errors };
}

// Partial validation — validate just the data for a specific skill
export function validateSkillState(data: unknown, skill: string): ValidationResult {
  return validateState(data, skill);
}
