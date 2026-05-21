import type {
  CompletionCheckItem,
  DebugTraceItem,
  ExecutionCanvasMetadata,
  ExecutionEvent,
  ExecutionFlow,
  ExecutionOrigin,
  ExecutionPhase,
  ExecutionRun,
  ImplementationStep,
  ParallelAgentRun,
  PlanStepFile,
  QualityGateConfig,
  QualityGateState,
  ResolvedPlanTaskExecutionMetadata,
} from './planner.ts';
import {
  completionCheckItemSchema,
  debugTraceItemSchema,
  executionEventSchema,
  executionFlowSchema,
  executionOriginSchema,
  executionPhaseSchema,
  executionRunSchema,
  implementationStepSchema,
  parallelRunSchema,
  planStepFileSchema,
  qualityGateConfigSchema,
  qualityGateStateSchema,
} from './validation.ts';

type MetadataRecord = Record<string, unknown>;

function asRecord(value: unknown): MetadataRecord | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  return value as MetadataRecord;
}

function parseItem<T>(
  schema: { safeParse(value: unknown): { success: true; data: T } | { success: false } },
  value: unknown,
): T | undefined {
  const result = schema.safeParse(value);
  return result.success ? result.data : undefined;
}

function parseList<T>(value: unknown, parse: (item: unknown) => T | undefined): T[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const items: T[] = [];
  for (const item of value) {
    const parsed = parse(item);
    if (parsed !== undefined) {
      items.push(parsed);
    }
  }
  return items;
}

function parseStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

export function getPlanTaskGoal(metadata: unknown): string | undefined {
  const record = asRecord(metadata);
  if (!record) {
    return undefined;
  }

  const goal = typeof record.goal === 'string' ? record.goal.trim() : '';
  if (goal.length > 0) {
    return goal;
  }

  const description = typeof record.description === 'string' ? record.description.trim() : '';
  return description.length > 0 ? description : undefined;
}

export function getPlanTaskFiles(metadata: unknown): PlanStepFile[] {
  return parseList(asRecord(metadata)?.files, (item) => parseItem(planStepFileSchema, item));
}

export function getPlanTaskImplementationSteps(metadata: unknown): ImplementationStep[] {
  return parseList(asRecord(metadata)?.implementationSteps, (item) =>
    parseItem(implementationStepSchema, item),
  );
}

export function getPlanTaskVerificationSteps(metadata: unknown): ImplementationStep[] {
  return parseList(asRecord(metadata)?.verificationSteps, (item) =>
    parseItem(implementationStepSchema, item),
  );
}

export function getPlanTaskDependencies(metadata: unknown): string[] {
  return parseStringList(asRecord(metadata)?.dependencies);
}

export function getPlanTaskQualityGates(metadata: unknown): QualityGateConfig[] {
  return parseList(asRecord(metadata)?.qualityGates, (item) =>
    parseItem(qualityGateConfigSchema, item),
  );
}

export function getPlanTaskGateStates(metadata: unknown): QualityGateState[] {
  return parseList(asRecord(metadata)?.gateStates, (item) =>
    parseItem(qualityGateStateSchema, item),
  );
}

export function getPlanTaskExecutionPhase(metadata: unknown): ExecutionPhase | undefined {
  return parseItem(executionPhaseSchema, asRecord(metadata)?.executionPhase);
}

export function getPlanTaskActiveFiles(metadata: unknown): string[] {
  return parseStringList(asRecord(metadata)?.activeFiles);
}

export function getPlanTaskExecutionEvents(metadata: unknown): ExecutionEvent[] {
  return parseList(asRecord(metadata)?.executionEvents, (item) =>
    parseItem(executionEventSchema, item),
  );
}

export function getResolvedPlanTaskExecutionMetadata(
  metadata: unknown,
): ResolvedPlanTaskExecutionMetadata {
  return {
    goal: getPlanTaskGoal(metadata),
    files: getPlanTaskFiles(metadata),
    implementationSteps: getPlanTaskImplementationSteps(metadata),
    verificationSteps: getPlanTaskVerificationSteps(metadata),
    qualityGates: getPlanTaskQualityGates(metadata),
    gateStates: getPlanTaskGateStates(metadata),
    executionPhase: getPlanTaskExecutionPhase(metadata),
    activeFiles: getPlanTaskActiveFiles(metadata),
    executionEvents: getPlanTaskExecutionEvents(metadata),
  };
}

export function getExecutionFlow(metadata: unknown): ExecutionFlow | undefined {
  return parseItem(executionFlowSchema, asRecord(metadata)?.executionFlow);
}

export function getExecutionOrigin(metadata: unknown): ExecutionOrigin | undefined {
  return parseItem(executionOriginSchema, asRecord(metadata)?.executionOrigin);
}

export function getPlanTaskRuns(metadata: unknown): ExecutionRun[] {
  return parseList(asRecord(metadata)?.runs, (item) => parseItem(executionRunSchema, item));
}

export function getCompletionChecks(metadata: unknown): CompletionCheckItem[] {
  return parseList(asRecord(metadata)?.completionChecks, (item) =>
    parseItem(completionCheckItemSchema, item),
  );
}

export function getPlanTaskDebugTrace(metadata: unknown): DebugTraceItem[] {
  return parseList(asRecord(metadata)?.debugTrace, (item) => parseItem(debugTraceItemSchema, item));
}

export function getParallelRuns(metadata: unknown): ParallelAgentRun[] {
  return parseList(asRecord(metadata)?.parallelRuns, (item) =>
    parseItem(parallelRunSchema, item),
  );
}

export function getResolvedExecutionCanvasMetadata(metadata: unknown): ExecutionCanvasMetadata {
  return {
    executionFlow: getExecutionFlow(metadata),
    executionOrigin: getExecutionOrigin(metadata),
    completionChecks: getCompletionChecks(metadata),
    parallelRuns: getParallelRuns(metadata),
  };
}
