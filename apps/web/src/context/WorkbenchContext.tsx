import {
  type CanvasNode,
  type CompletionCheckItem,
  createDefaultWorkbenchState,
  type DebugTraceItem,
  type ExecutionPhase,
  type ExecutionRun,
  type GateStatus,
  type GateType,
  type UIPreferences,
  type WorkbenchState,
} from '@supermech/schema';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { registerCommand } from '../lib/commands.ts';
import { httpRuntimeClient } from '../lib/runtime-client.ts';

export interface FeedbackParams {
  nodeId: string;
  text: string;
  section?: 'goal' | 'code' | 'test' | 'general';
  stepIndex?: number;
  rating?: number;
  quickAction?: string;
}

type WorkbenchNodePatch = Pick<CanvasNode, 'status' | 'label' | 'progress'> & {
  metadata?: Record<string, unknown>;
};

interface WorkbenchContextValue {
  state: WorkbenchState;
  plans: string[];
  currentPlan: string;
  skills: string[];
  currentSkill: string;
  selectNode: (nodeId: string | null) => Promise<void>;
  updateUI: (patch: Partial<UIPreferences>) => Promise<void>;
  addFeedback: (params: FeedbackParams) => Promise<void>;
  markFeedbackProcessed: (feedbackId: string) => Promise<void>;
  updateNode: (id: string, patch: Partial<WorkbenchNodePatch>) => Promise<void>;
  switchPlan: (plan: string) => Promise<void>;
  switchSkill: (skill: string, mode?: 'subagent' | 'inline') => Promise<void>;
  createPlan: (plan: string) => Promise<void>;
  updateGateState: (
    nodeId: string,
    type: GateType,
    status: GateStatus,
    result?: string,
  ) => Promise<void>;
  updateExecutionPhase: (nodeId: string, phase: ExecutionPhase) => Promise<void>;
  requestReplan: (nodeId: string) => Promise<void>;
  updateNodeRun: (nodeId: string, run: ExecutionRun) => Promise<void>;
  updateNodeDebugTrace: (nodeId: string, item: DebugTraceItem) => Promise<void>;
  updateCompletionCheck: (item: CompletionCheckItem) => Promise<void>;
  renamePlan: (from: string, to: string) => Promise<void>;
  deletePlan: (plan: string) => Promise<void>;
  duplicatePlan: (from: string, to: string) => Promise<void>;
  exportPlan: (plan: string) => Promise<unknown>;
  importPlan: (payload: unknown) => Promise<void>;
}

const WorkbenchCtx = createContext<WorkbenchContextValue | null>(null);

const DEFAULT_STATE: WorkbenchState = createDefaultWorkbenchState({
  projectName: '',
  activeSkill: null,
  skillType: 'brainstorming',
});

export function WorkbenchProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorkbenchState>(DEFAULT_STATE);
  const [plans, setPlans] = useState<string[]>([]);
  const [currentPlan, setCurrentPlan] = useState('default');
  const [skills, setSkills] = useState<string[]>([]);
  const [currentSkill, setCurrentSkill] = useState('brainstorming');

  const client = httpRuntimeClient;

  const fetchMeta = useCallback(async () => {
    try {
      const data = await client.getPlans();
      setPlans(data.plans ?? []);
      setCurrentPlan(data.current ?? 'default');
      setSkills(data.skills ?? []);
      setCurrentSkill(data.currentSkill ?? 'brainstorming');
    } catch {
      // server not ready
    }
  }, []);

  useEffect(() => {
    // Load initial state via HTTP
    client.getState().then(setState).catch(() => {});
    fetchMeta();

    registerCommand({
      name: 'execute-inline',
      aliases: ['execute', 'start', 'run'],
      description: 'Switch to execution mode (inline)',
      run: () => switchSkill('executing-plans', 'inline'),
    });

    registerCommand({
      name: 'execute-subagent',
      aliases: ['execute-subagents'],
      description: 'Prepare execution for subagent-driven delivery',
      run: () => switchSkill('executing-plans', 'subagent'),
    });

    let evtSource: EventSource | null = null;
    try {
      evtSource = new EventSource('/__state/events');
      evtSource.onmessage = () => {
        client.getState().then(setState);
        fetchMeta();
      };
    } catch {
      // SSE not available — fall back to HMR
    }

    // Keep HMR listener as additional fallback in dev mode
    if (import.meta.hot) {
      import.meta.hot.on('supermech:state-update', async () => {
        const updated = await client.getState();
        setState(updated);
        fetchMeta();
      });
    }

    return () => {
      if (evtSource) evtSource.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchMeta]);

  async function applyState(result: WorkbenchState) {
    setState(result);
  }

  async function switchPlan(plan: string) {
    const result = await client.switchPlan(plan);
    setCurrentPlan(plan);
    setSkills(result.skills ?? []);
    setCurrentSkill(result.currentSkill ?? 'brainstorming');
    setState(result.state);
  }

  async function switchSkill(skill: string, mode?: 'subagent' | 'inline') {
    const result = await client.switchSkill(skill, mode);
    setCurrentSkill(skill);
    setState(result.state);
  }

  async function createPlan(plan: string) {
    await client.createPlan(plan);
    await switchPlan(plan);
    await fetchMeta();
  }

  async function renamePlan(from: string, to: string) {
    await client.renamePlan(from, to);
    await fetchMeta();
  }

  async function deletePlan(plan: string) {
    await client.deletePlan(plan);
    await fetchMeta();
  }

  async function duplicatePlan(from: string, to: string) {
    await client.duplicatePlan(from, to);
    await fetchMeta();
  }

  async function exportPlan(plan: string) {
    return client.exportPlan(plan);
  }

  async function importPlan(payload: unknown) {
    await client.importPlan(payload);
    await fetchMeta();
  }

  const value: WorkbenchContextValue = {
    state,
    plans,
    currentPlan,
    skills,
    currentSkill,
    selectNode: async (nodeId) => applyState(await client.selectNode(nodeId)),
    updateUI: async (patch) => applyState(await client.updateUI(patch)),
    addFeedback: async (params) =>
      applyState(await client.addFeedback({ ...params, quickAction: params.quickAction ?? null })),
    markFeedbackProcessed: async (feedbackId) =>
      applyState(await client.markFeedbackProcessed(feedbackId)),
    updateNode: async (id, patch) =>
      applyState(await client.updateNode({ id, ...patch })),
    switchPlan,
    switchSkill,
    createPlan,
    updateGateState: async (nodeId, type, status, result) =>
      applyState(await client.updateGateState({ nodeId, type, status, result })),
    updateExecutionPhase: async (nodeId, phase) =>
      applyState(await client.updateExecutionPhase({ nodeId, phase })),
    requestReplan: async (nodeId) => applyState(await client.requestReplan(nodeId)),
    updateNodeRun: async (nodeId, run) => {
      const res = await fetch('/__state/node/run', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId, run }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? 'request failed');
      setState(result);
    },
    updateNodeDebugTrace: async (nodeId, item) => {
      const res = await fetch('/__state/node/debug-trace', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId, item }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? 'request failed');
      setState(result);
    },
    updateCompletionCheck: async (item) => {
      const res = await fetch('/__state/completion-check', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? 'request failed');
      setState(result);
    },
    renamePlan,
    deletePlan,
    duplicatePlan,
    exportPlan,
    importPlan,
  };

  return <WorkbenchCtx.Provider value={value}>{children}</WorkbenchCtx.Provider>;
}

export function useWorkbench(): WorkbenchContextValue {
  const ctx = useContext(WorkbenchCtx);
  if (!ctx) throw new Error('useWorkbench must be used within WorkbenchProvider');
  return ctx;
}
