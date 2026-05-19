import type { SkillType, ThemeMode, WorkbenchState } from './workbench.ts';

export interface DefaultWorkbenchStateOptions {
  projectName?: string;
  sessionId?: string;
  activeSkill?: SkillType | null;
  skillType?: SkillType;
  theme?: ThemeMode;
}

export function createDefaultWorkbenchState(
  options: DefaultWorkbenchStateOptions = {},
): WorkbenchState {
  const {
    skillType = 'brainstorming',
    projectName = 'My Project',
    sessionId = skillType,
    activeSkill = null,
    theme = 'system',
  } = options;

  return {
    meta: {
      projectName,
      sessionId,
      activeSkill,
      agentStatus: 'idle',
    },
    canvas: {
      skillType,
      nodes: [],
      edges: [],
    },
    feedback: [],
    ui: {
      theme,
      leftSidebarOpen: true,
      rightSidebarOpen: true,
      selectedNodeId: null,
    },
  };
}
