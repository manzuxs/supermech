import type { UIPreferences, WorkbenchState } from '@supermech/schema';

export interface StateResponse extends WorkbenchState {}

export interface PlanListResponse {
  plans: string[];
  current: string | null;
  skills: string[];
  currentSkill: string;
}

export interface PlanSwitchResponse {
  ok: true;
  plan: string;
  skills: string[];
  currentSkill: string;
  state: WorkbenchState;
}

export interface SkillSwitchResponse {
  ok: true;
  skill: string;
  state: WorkbenchState;
}

export interface FeedbackRequest {
  nodeId: string;
  text: string;
  section?: 'goal' | 'code' | 'test' | 'general';
  stepIndex?: number;
  rating?: number;
  quickAction?: string | null;
}

export interface NodePatchRequest {
  id: string;
  status?: string;
  label?: string;
  progress?: number;
  metadata?: Record<string, unknown>;
}

export interface GateStateRequest {
  nodeId: string;
  type: string;
  status: string;
  result?: string;
}

export interface ExecutionPhaseRequest {
  nodeId: string;
  phase: string;
}

export interface RuntimeClient {
  getState(): Promise<StateResponse>;
  getPlans(): Promise<PlanListResponse>;
  switchPlan(plan: string): Promise<PlanSwitchResponse>;
  switchSkill(skill: string, mode?: 'subagent' | 'inline'): Promise<SkillSwitchResponse>;
  createPlan(plan: string): Promise<void>;
  renamePlan(from: string, to: string): Promise<void>;
  deletePlan(plan: string): Promise<void>;
  duplicatePlan(from: string, to: string): Promise<void>;
  exportPlan(plan: string): Promise<unknown>;
  importPlan(payload: unknown): Promise<void>;
  selectNode(nodeId: string | null): Promise<WorkbenchState>;
  updateUI(patch: Partial<UIPreferences>): Promise<WorkbenchState>;
  addFeedback(payload: FeedbackRequest): Promise<WorkbenchState>;
  markFeedbackProcessed(feedbackId: string): Promise<WorkbenchState>;
  updateNode(payload: NodePatchRequest): Promise<WorkbenchState>;
  updateGateState(payload: GateStateRequest): Promise<WorkbenchState>;
  updateExecutionPhase(payload: ExecutionPhaseRequest): Promise<WorkbenchState>;
  requestReplan(nodeId: string): Promise<WorkbenchState>;
}

async function fetchJSON(path: string, method: string, body?: unknown): Promise<unknown> {
  const res = await fetch(path, {
    method,
    headers: body != null ? { 'Content-Type': 'application/json' } : undefined,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error ?? 'request failed');
  return result;
}

export const httpRuntimeClient: RuntimeClient = {
  async getState() {
    const res = await fetch('/__state');
    return res.json();
  },

  async getPlans() {
    const res = await fetch('/__state/plans');
    return res.json();
  },

  async switchPlan(plan) {
    const result = (await fetchJSON('/__state/plans/switch', 'POST', { plan })) as PlanSwitchResponse;
    return result;
  },

  async switchSkill(skill, mode) {
    const body: Record<string, unknown> = { skill };
    if (mode) body.mode = mode;
    const result = (await fetchJSON('/__state/skills/switch', 'POST', body)) as SkillSwitchResponse;
    return result;
  },

  async createPlan(plan) {
    await fetchJSON('/__state/plans/create', 'POST', { plan });
  },

  async renamePlan(from, to) {
    await fetchJSON('/__state/plans/rename', 'POST', { from, to });
  },

  async deletePlan(plan) {
    await fetchJSON('/__state/plans/delete', 'POST', { plan });
  },

  async duplicatePlan(from, to) {
    await fetchJSON('/__state/plans/duplicate', 'POST', { from, to });
  },

  async exportPlan(plan) {
    const res = await fetch('/__state/plans/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
    return res.json();
  },

  async importPlan(payload) {
    await fetchJSON('/__state/plans/import', 'POST', payload);
  },

  async selectNode(nodeId) {
    return (await fetchJSON('/__state/select', 'POST', { nodeId })) as WorkbenchState;
  },

  async updateUI(patch) {
    return (await fetchJSON('/__state/ui', 'PATCH', patch)) as WorkbenchState;
  },

  async addFeedback(payload) {
    return (await fetchJSON('/__state/feedback', 'POST', {
      ...payload,
      quickAction: payload.quickAction ?? null,
    })) as WorkbenchState;
  },

  async markFeedbackProcessed(feedbackId) {
    return (await fetchJSON('/__state/feedback/process', 'POST', { feedbackId })) as WorkbenchState;
  },

  async updateNode(payload) {
    return (await fetchJSON('/__state/node', 'PATCH', payload)) as WorkbenchState;
  },

  async updateGateState(payload) {
    return (await fetchJSON('/__state/node/gate-state', 'PATCH', payload)) as WorkbenchState;
  },

  async updateExecutionPhase(payload) {
    return (await fetchJSON('/__state/node/execution-phase', 'PATCH', payload)) as WorkbenchState;
  },

  async requestReplan(nodeId) {
    return (await fetchJSON('/__state/replan', 'POST', { nodeId })) as WorkbenchState;
  },
};
