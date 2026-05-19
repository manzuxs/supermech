import type {
  ExecutionPhase,
  GateStatus,
  GateType,
  WorkbenchState,
} from '@supermech/schema';
import {
  applyNodeExecutionPhase,
  applyNodeGateState,
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
