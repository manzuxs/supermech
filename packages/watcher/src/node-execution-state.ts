import type {
  CompletionCheckItem,
  DebugTraceItem,
  ExecutionPhase,
  ExecutionRun,
  GateStatus,
  GateType,
  WorkbenchState,
} from '@supermech/schema';
import {
  applyNodeDebugTraceUpdate,
  applyNodeExecutionPhase,
  applyNodeGateState,
  applyNodeRunUpdate,
  resetNodeExecutionState,
} from './execution-state.ts';

type WorkbenchNode = WorkbenchState['canvas']['nodes'][number];

export function requireStateNode(state: WorkbenchState, nodeId: string): WorkbenchNode {
  const node = state.canvas.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) {
    throw new Error(`node ${nodeId} not found`);
  }
  return node;
}

export function applyStateNodeGateState(
  state: WorkbenchState,
  nodeId: string,
  type: GateType,
  status: GateStatus,
  result?: string,
): void {
  applyNodeGateState(requireStateNode(state, nodeId), type, status, result);
}

export function applyStateNodeExecutionPhase(
  state: WorkbenchState,
  nodeId: string,
  phase: ExecutionPhase,
): void {
  applyNodeExecutionPhase(requireStateNode(state, nodeId), phase);
}

export function resetStateNodeForReplan(state: WorkbenchState, nodeId: string): void {
  const node = requireStateNode(state, nodeId);
  node.status = 'pending';
  node.progress = 0;
  resetNodeExecutionState(node);
}

export function applyStateNodeRunUpdate(
  state: WorkbenchState,
  nodeId: string,
  update: ExecutionRun,
): void {
  applyNodeRunUpdate(requireStateNode(state, nodeId), update);
}

export function applyStateNodeDebugTraceUpdate(
  state: WorkbenchState,
  nodeId: string,
  item: DebugTraceItem,
): void {
  applyNodeDebugTraceUpdate(requireStateNode(state, nodeId), item);
}

function ensureCanvasMetadata(state: WorkbenchState): Record<string, unknown> {
  if (!state.canvas.metadata || typeof state.canvas.metadata !== 'object') {
    state.canvas.metadata = {};
  }
  return state.canvas.metadata;
}

function readCompletionChecks(metadata: Record<string, unknown>): CompletionCheckItem[] {
  if (!Array.isArray(metadata.completionChecks)) return [];
  return metadata.completionChecks.filter((value): value is CompletionCheckItem => {
    return (
      !!value && typeof value === 'object' && typeof (value as CompletionCheckItem).id === 'string'
    );
  });
}

export function applyStateCompletionCheckUpdate(
  state: WorkbenchState,
  item: CompletionCheckItem,
): void {
  const metadata = ensureCanvasMetadata(state);
  const checks = readCompletionChecks(metadata);
  const existing = checks.find((check) => check.id === item.id);
  if (existing) Object.assign(existing, item);
  else checks.push(item);
  metadata.completionChecks = checks;
}
