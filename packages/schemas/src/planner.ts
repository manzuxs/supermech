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
