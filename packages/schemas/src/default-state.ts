import type { SkillType, ThemeMode, WorkbenchState } from './workbench.ts';

export interface DefaultWorkbenchStateOptions {
  projectName?: string;
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
    activeSkill = null,
    theme = 'system',
  } = options;

  return {
    meta: {
      projectName,
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
