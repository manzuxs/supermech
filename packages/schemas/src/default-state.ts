import type { SkillType, ThemeMode, WorkbenchState } from './workbench.ts';

export interface DefaultWorkbenchStateOptions {
  projectName?: string;
  sessionId?: string;
  activeSkill?: SkillType | null;
  skillType?: SkillType;
  theme?: ThemeMode;
}

function normalizeSessionPart(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'project';
}

export function createSessionId(projectName: string, skillType: SkillType): string {
  return `${normalizeSessionPart(projectName)}--${skillType}`;
}

export function createDefaultWorkbenchState(
  options: DefaultWorkbenchStateOptions = {},
): WorkbenchState {
  const {
    skillType = 'brainstorming',
    projectName = 'My Project',
    sessionId = createSessionId(projectName, skillType),
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
