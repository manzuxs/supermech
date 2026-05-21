export type AgentStatus = 'idle' | 'thinking' | 'writing' | 'error';
export type SkillType = 'brainstorming' | 'writing-plans' | 'executing-plans';
export type NodeStatus = 'pending' | 'active' | 'accepted' | 'rejected' | 'done';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface WorkbenchMeta {
  projectName: string;
  sessionId?: string;
  activeSkill: SkillType | null;
  agentStatus: AgentStatus;
  branchName?: string;
  worktreePath?: string;
}

export interface CanvasNode {
  id: string;
  label: string;
  status: NodeStatus;
  progress: number;
  parentId: string | null;
  children: string[];
  metadata: Record<string, unknown>;
}

export interface CanvasEdge {
  from: string;
  to: string;
  label?: string;
}

export interface WorkbenchCanvas {
  skillType: SkillType;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  metadata?: Record<string, unknown>;
}

export interface FeedbackEntry {
  id: string;
  nodeId: string;
  text: string;
  rating?: number | null;
  section?: 'goal' | 'code' | 'test' | 'general' | null;
  stepIndex?: number | null;
  quickAction: string | null;
  createdAt: string;
  processedAt?: string;
}

export interface UIPreferences {
  theme: ThemeMode;
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  selectedNodeId: string | null;
}

export interface WorkbenchState {
  meta: WorkbenchMeta;
  canvas: WorkbenchCanvas;
  feedback: FeedbackEntry[];
  ui: UIPreferences;
}

export interface BrainstormPlanningReadiness {
  approvedNodeCount: number;
  unresolvedNodeCount: number;
  canEnterWritingPlans: boolean;
}

export function getBrainstormPlanningReadiness(nodes: CanvasNode[]): BrainstormPlanningReadiness {
  const approvedNodeCount = nodes.filter(
    (node) => node.status === 'accepted' || node.status === 'done',
  ).length;
  const unresolvedNodeCount = nodes.filter(
    (node) => node.status === 'pending' || node.status === 'active',
  ).length;

  return {
    approvedNodeCount,
    unresolvedNodeCount,
    canEnterWritingPlans: approvedNodeCount > 0 && unresolvedNodeCount === 0,
  };
}
