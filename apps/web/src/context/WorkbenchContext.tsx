import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import {
  type CanvasNode,
  createDefaultWorkbenchState,
  type ExecutionPhase,
  type GateStatus,
  type GateType,
  type PlanTaskExecutionMetadataPatch,
  type UIPreferences,
  type WorkbenchState,
} from '@supermech/schema';
import { registerCommand } from '../lib/commands.ts';

export interface FeedbackParams {
  nodeId: string;
  text: string;
  section?: 'goal' | 'code' | 'test' | 'general';
  stepIndex?: number;
  rating?: number;
  quickAction?: string;
}

type JSONRecord = Record<string, unknown>;

type WorkbenchNodeMetadataPatch = PlanTaskExecutionMetadataPatch & JSONRecord;

type WorkbenchNodePatch = Pick<CanvasNode, 'status' | 'label' | 'progress'> & {
  metadata?: WorkbenchNodeMetadataPatch;
};

type GateStateUpdatePayload = {
  nodeId: string;
  type: GateType;
  status: GateStatus;
  result?: string;
};

type ExecutionPhaseUpdatePayload = {
  nodeId: string;
  phase: ExecutionPhase;
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
  switchSkill: (skill: string) => Promise<void>;
  createPlan: (plan: string) => Promise<void>;
  updateGateState: (
    nodeId: string,
    type: GateType,
    status: GateStatus,
    result?: string,
  ) => Promise<void>;
  updateExecutionPhase: (nodeId: string, phase: ExecutionPhase) => Promise<void>;
  requestReplan: (nodeId: string) => Promise<void>;
}

const WorkbenchCtx = createContext<WorkbenchContextValue | null>(null);

const DEFAULT_STATE: WorkbenchState = createDefaultWorkbenchState({
  projectName: '',
  sessionId: '',
  activeSkill: null,
  skillType: 'brainstorming',
});

export function WorkbenchProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorkbenchState>(DEFAULT_STATE);
  const [plans, setPlans] = useState<string[]>([]);
  const [currentPlan, setCurrentPlan] = useState('default');
  const [skills, setSkills] = useState<string[]>([]);
  const [currentSkill, setCurrentSkill] = useState('brainstorming');

  const fetchMeta = useCallback(async () => {
    try {
      const res = await fetch('/__state/plans');
      const data = await res.json();
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
    fetch('/__state')
      .then((r) => r.json())
      .then(setState)
      .catch(() => {});
    fetchMeta();

    registerCommand({
      name: 'execute',
      aliases: ['start', 'run'],
      description: 'Switch to execution mode',
      run: () => switchSkill('executing-plans'),
    });

    let evtSource: EventSource | null = null;
    try {
      evtSource = new EventSource('/__state/events');
      evtSource.onmessage = () => {
        fetch('/__state')
          .then((r) => r.json())
          .then(setState);
        fetchMeta();
      };
    } catch {
      // SSE not available — fall back to HMR
    }

    // Keep HMR listener as additional fallback in dev mode
    if (import.meta.hot) {
      import.meta.hot.on('supermech:state-update', async () => {
        const res = await fetch('/__state');
        const updated = await res.json();
        setState(updated);
        fetchMeta();
      });
    }

    return () => {
      if (evtSource) evtSource.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchMeta]);

  async function callAPI(path: string, method: string, data: JSONRecord) {
    const res = await fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error ?? 'request failed');
    setState(result);
  }

  async function switchPlan(plan: string) {
    const res = await fetch('/__state/plans/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error ?? 'switch plan failed');
    setCurrentPlan(plan);
    setSkills(result.skills ?? []);
    setCurrentSkill(result.currentSkill ?? 'brainstorming');
    setState(result.state);
  }

  async function switchSkill(skill: string) {
    const res = await fetch('/__state/skills/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skill }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error ?? 'switch skill failed');
    setCurrentSkill(skill);
    setState(result.state);
  }

  async function createPlan(plan: string) {
    await fetch('/__state/plans/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
    await switchPlan(plan);
    await fetchMeta();
  }

  const value: WorkbenchContextValue = {
    state,
    plans,
    currentPlan,
    skills,
    currentSkill,
    selectNode: (nodeId) => callAPI('/__state/select', 'POST', { nodeId }),
    updateUI: (patch) => callAPI('/__state/ui', 'PATCH', patch),
    addFeedback: (params) =>
      callAPI('/__state/feedback', 'POST', { ...params, quickAction: params.quickAction ?? null }),
    markFeedbackProcessed: (feedbackId) =>
      callAPI('/__state/feedback/process', 'POST', { feedbackId }),
    updateNode: (id, patch) => callAPI('/__state/node', 'PATCH', { id, ...patch }),
    switchPlan,
    switchSkill,
    createPlan,
    updateGateState: (nodeId, type, status, result) =>
      callAPI('/__state/node/gate-state', 'PATCH', {
        nodeId,
        type,
        status,
        result,
      } satisfies GateStateUpdatePayload),
    updateExecutionPhase: (nodeId, phase) =>
      callAPI('/__state/node/execution-phase', 'PATCH', {
        nodeId,
        phase,
      } satisfies ExecutionPhaseUpdatePayload),
    requestReplan: (nodeId) => callAPI('/__state/replan', 'POST', { nodeId }),
  };

  return <WorkbenchCtx.Provider value={value}>{children}</WorkbenchCtx.Provider>;
}

export function useWorkbench(): WorkbenchContextValue {
  const ctx = useContext(WorkbenchCtx);
  if (!ctx) throw new Error('useWorkbench must be used within WorkbenchProvider');
  return ctx;
}
