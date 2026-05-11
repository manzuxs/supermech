export interface PlanStepMetadata {
  description: string;
  dependencies: string[];
  estimatedMinutes: number;
  assignee?: string;
}

export interface PlanSession {
  phase: string;
  totalSteps: number;
  completedSteps: number;
}
