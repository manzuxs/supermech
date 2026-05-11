export type AgentStatus = 'idle' | 'thinking' | 'writing' | 'error';
export type SkillType = 'brainstorming' | 'writing-plans' | 'executing-plans';
export type NodeStatus = 'pending' | 'active' | 'accepted' | 'rejected' | 'done';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface WorkbenchMeta {
  projectName: string;
  sessionId: string;
  activeSkill: SkillType | null;
  agentStatus: AgentStatus;
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
  section?: 'goal' | 'code' | 'test' | 'general';
  stepIndex?: number;
  quickAction: string | null;
  createdAt: string;
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
