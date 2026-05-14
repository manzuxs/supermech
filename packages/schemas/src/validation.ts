import { z } from 'zod/v4';

// ── Core enums ──

export const agentStatusSchema = z.enum(['idle', 'thinking', 'writing', 'error']);
export const skillTypeSchema = z.string(); // extensible — any skill name is valid
export const nodeStatusSchema = z.enum(['pending', 'active', 'accepted', 'rejected', 'done']);
export const themeModeSchema = z.enum(['light', 'dark', 'system']);

// ── Core objects ──

export const workbenchMetaSchema = z.object({
  projectName: z.string(),
  sessionId: z.string(),
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
  rating: z.number().min(1).max(5).optional(),
  section: z.enum(['goal', 'code', 'test', 'general']).optional(),
  stepIndex: z.number().int().optional(),
  quickAction: z.string().nullable(),
  createdAt: z.string(),
});

export const uiPreferencesSchema = z.object({
  theme: themeModeSchema,
  leftSidebarOpen: z.boolean(),
  rightSidebarOpen: z.boolean(),
  selectedNodeId: z.string().nullable(),
});

export const workbenchStateSchema = z.object({
  meta: workbenchMetaSchema,
  canvas: workbenchCanvasSchema,
  feedback: z.array(feedbackEntrySchema),
  ui: uiPreferencesSchema,
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
  type: z.string(),
  label: z.string(),
  enabled: z.boolean(),
  required: z.boolean(),
});

export const qualityGateStateSchema = z.object({
  type: z.string(),
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
  phases: z
    .array(z.object({ name: z.string(), description: z.string().optional() }))
    .optional(),
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
  const errors = result.error.issues.map((e) => {
    const path = e.path.join('.');
    return path ? `${path}: ${e.message}` : e.message;
  });
  return { valid: false, errors };
}

// Partial validation — validate just the data for a specific skill
export function validateSkillState(data: unknown, skill: string): ValidationResult {
  return validateState(data, skill);
}
