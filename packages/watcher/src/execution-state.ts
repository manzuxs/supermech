import type {
  DebugTraceItem,
  ExecutionPhase,
  ExecutionRun,
  GateStatus,
  GateType,
  QualityGateState,
} from '@supermech/schema';

interface MutableNodeLike {
  metadata?: Record<string, unknown>;
}

function ensureMetadata(node: MutableNodeLike): Record<string, unknown> {
  if (!node.metadata || typeof node.metadata !== 'object') {
    node.metadata = {};
  }
  return node.metadata;
}

function readGateStates(metadata: Record<string, unknown>): QualityGateState[] {
  if (!Array.isArray(metadata.gateStates)) {
    return [];
  }

  return metadata.gateStates.filter((value): value is QualityGateState => {
    if (!value || typeof value !== 'object') return false;
    const gateState = value as Record<string, unknown>;
    return typeof gateState.type === 'string' && typeof gateState.status === 'string';
  });
}

function readRuns(metadata: Record<string, unknown>): ExecutionRun[] {
  if (!Array.isArray(metadata.runs)) return [];
  return metadata.runs.filter((value): value is ExecutionRun => {
    return !!value && typeof value === 'object' && typeof (value as ExecutionRun).id === 'string';
  });
}

function readDebugTrace(metadata: Record<string, unknown>): DebugTraceItem[] {
  if (!Array.isArray(metadata.debugTrace)) return [];
  return metadata.debugTrace.filter((value): value is DebugTraceItem => {
    return !!value && typeof value === 'object' && typeof (value as DebugTraceItem).id === 'string';
  });
}

export function applyNodeRunUpdate(node: MutableNodeLike, update: ExecutionRun): void {
  const metadata = ensureMetadata(node);
  const runs = readRuns(metadata);
  const existing = runs.find((run) => run.id === update.id);
  if (existing) Object.assign(existing, update);
  else runs.push(update);
  metadata.runs = runs;
}

export function applyNodeDebugTraceUpdate(node: MutableNodeLike, item: DebugTraceItem): void {
  const metadata = ensureMetadata(node);
  const trace = readDebugTrace(metadata);
  const existing = trace.find((entry) => entry.id === item.id);
  if (existing) Object.assign(existing, item);
  else trace.push(item);
  metadata.debugTrace = trace;
}

export function applyNodeGateState(
  node: MutableNodeLike,
  type: GateType,
  status: GateStatus,
  result?: string,
): void {
  const metadata = ensureMetadata(node);
  const gateStates = readGateStates(metadata);
  const existing = gateStates.find((gateState) => gateState.type === type);

  if (existing) {
    existing.status = status;
    if (result !== undefined) existing.result = result;
    existing.attemptedAt = new Date().toISOString();
  } else {
    gateStates.push({ type, status, result, attemptedAt: new Date().toISOString() });
  }

  metadata.gateStates = gateStates;
}

export function applyNodeExecutionPhase(node: MutableNodeLike, phase: ExecutionPhase): void {
  const metadata = ensureMetadata(node);
  metadata.executionPhase = phase;
}

export function resetNodeExecutionState(node: MutableNodeLike): void {
  const metadata = ensureMetadata(node);
  metadata.executionPhase = 'idle';
  metadata.gateStates = [];
}
