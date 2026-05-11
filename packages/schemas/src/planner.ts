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
