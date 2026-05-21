export type GateType = 'spec-review' | 'code-quality';

export type GateStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped';

export interface QualityGateConfig {
  type: GateType;
  label: string;
  enabled: boolean;
  required: boolean;
}

export interface QualityGateState {
  type: GateType;
  status: GateStatus;
  result?: string;
  attemptedAt?: string;
}

export interface PlanStepFile {
  path: string;
  type: 'create' | 'modify' | 'test' | 'delete';
  description?: string;
}

export interface ImplementationStep {
  description: string;
  code?: string;
  language?: string;
  command?: string;
  expectedOutput?: string;
}

export type ExecutionPhase =
  | 'implementing'
  | 'editing-files'
  | 'running-tests'
  | 'reviewing'
  | 'fixing'
  | 'idle';

export type ExecutionEventKind = 'phase' | 'file' | 'command' | 'review' | 'note';

export type ExecutionEventStatus = 'info' | 'success' | 'warning' | 'error';

export interface ExecutionEvent {
  kind: ExecutionEventKind;
  message: string;
  timestamp: string;
  status?: ExecutionEventStatus;
  files?: string[];
}

export type ExecutionRunRole = 'implementer' | 'spec-reviewer' | 'code-reviewer';

export type ExecutionRunStatus = 'queued' | 'running' | 'passed' | 'failed' | 'blocked';

export interface ExecutionRun {
  id: string;
  role: ExecutionRunRole;
  status: ExecutionRunStatus;
  summary?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface CompletionCheckItem {
  id: string;
  label: string;
  status: 'pending' | 'passed' | 'failed';
  notes?: string;
}

export interface DebugTraceItem {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'resolved';
  notes?: string;
}

export interface PlanTaskMetadata {
  goal?: string;
  files?: PlanStepFile[];
  implementationSteps?: ImplementationStep[];
  verificationSteps?: ImplementationStep[];
  dependencies?: string[];
  estimatedMinutes?: number;
  assignee?: string;
  phase?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  qualityGates?: QualityGateConfig[];
  gateStates?: QualityGateState[];
  executionPhase?: ExecutionPhase;
  activeFiles?: string[];
  executionEvents?: ExecutionEvent[];
  runs?: ExecutionRun[];
  debugTrace?: DebugTraceItem[];
}

export type PlanTaskRiskLevel = NonNullable<PlanTaskMetadata['riskLevel']>;

export type PlanTaskExecutionMetadata = Pick<
  PlanTaskMetadata,
  | 'goal'
  | 'files'
  | 'implementationSteps'
  | 'verificationSteps'
  | 'phase'
  | 'riskLevel'
  | 'qualityGates'
  | 'gateStates'
  | 'executionPhase'
  | 'activeFiles'
  | 'executionEvents'
  | 'runs'
  | 'debugTrace'
>;

export type PlanTaskExecutionMetadataPatch = Partial<PlanTaskExecutionMetadata>;
export type ExecutionQualityGates = QualityGateConfig[];
export type ExecutionGateStates = QualityGateState[];
export type ExecutionEventList = ExecutionEvent[];

export interface ResolvedPlanTaskExecutionMetadata {
  goal?: string;
  files: PlanStepFile[];
  implementationSteps: ImplementationStep[];
  verificationSteps: ImplementationStep[];
  qualityGates: QualityGateConfig[];
  gateStates: QualityGateState[];
  executionPhase?: ExecutionPhase;
  activeFiles: string[];
  executionEvents: ExecutionEvent[];
}

export interface PlanPhase {
  name: string;
  description?: string;
}

export interface PlanHeader {
  goal: string;
  architecture: string;
  techStack: string[];
  phases?: PlanPhase[];
}

export interface PlanSession {
  phase: string;
  totalSteps: number;
  completedSteps: number;
}

export type ExecutionFlowOrientation = 'horizontal';

export interface ExecutionFlowStage {
  id: string;
  name: string;
  description?: string;
  taskIds: string[];
}

export interface ExecutionFlowStageRelation {
  fromStageId: string;
  toStageId: string;
  label?: string;
}

export interface ExecutionFlowTaskRelation {
  fromTaskId: string;
  toTaskId: string;
  label?: string;
}

export interface ExecutionFlow {
  orientation: ExecutionFlowOrientation;
  stages: ExecutionFlowStage[];
  stageRelations?: ExecutionFlowStageRelation[];
  taskRelations?: ExecutionFlowTaskRelation[];
}

export interface ExecutionCanvasMetadata {
  executionFlow?: ExecutionFlow;
  executionOrigin?: ExecutionOrigin;
  completionChecks?: CompletionCheckItem[];
}

export type ExecutionMode = 'subagent' | 'inline';

export interface ExecutionOrigin {
  sourcePlanSessionId: string;
  sourceSkill: 'writing-plans';
  mode: ExecutionMode;
  hydratedAt: string;
}

export function definePlanTaskExecutionMetadata<T extends PlanTaskExecutionMetadata>(
  metadata: T,
): T {
  return metadata;
}

export function defineExecutionCanvasMetadata<T extends ExecutionCanvasMetadata>(metadata: T): T {
  return metadata;
}

export function defineQualityGateConfig<T extends QualityGateConfig>(gate: T): T {
  return gate;
}

export function defineQualityGateState<T extends QualityGateState>(gateState: T): T {
  return gateState;
}

export function defineExecutionEvent<T extends ExecutionEvent>(event: T): T {
  return event;
}

export function defineExecutionFlow<T extends ExecutionFlow>(flow: T): T {
  return flow;
}
