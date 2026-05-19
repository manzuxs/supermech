import type { ExecutionPhase, GateStatus, GateType, QualityGateState } from '@supermech/schema';

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
