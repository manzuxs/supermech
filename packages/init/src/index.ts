import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BUILTIN_SKILLS = ['brainstorming', 'writing-plans', 'executing-plans'];

export interface InitOptions {
  /** Target directory (defaults to cwd). */
  cwd?: string;
  /** Skills to install (e.g., ['brainstorming', 'writing-plans']). */
  skills?: string[];
}

const DEFAULT_CONFIG = {
  schemaVersion: 1,
  statePath: '.supermech/state',
  skillsPath: '.supermech/skills',
  currentPlan: null,
};

const DEFAULT_STATE_META = {
  meta: {
    projectName: 'My Project',
    sessionId: 'default',
    activeSkill: null,
    agentStatus: 'idle',
  },
  canvas: {
    skillType: 'brainstorming',
    nodes: [],
    edges: [],
  },
  feedback: [],
  ui: {
    theme: 'system',
    leftSidebarOpen: true,
    rightSidebarOpen: true,
    selectedNodeId: null,
  },
};

/** Initialize a `.supermech/` directory in the target project. */
export function initProject(options: InitOptions = {}): { dir: string; skills: string[] } {
  const cwd = options.cwd ?? process.cwd();
  const skills = options.skills ?? BUILTIN_SKILLS;

  const supermechDir = join(cwd, '.supermech');
  const skillsDir = join(supermechDir, 'skills');

  // Create directories
  mkdirSync(supermechDir, { recursive: true });
  mkdirSync(skillsDir, { recursive: true });

  // Write config
  writeFileSync(join(supermechDir, 'config.json'), JSON.stringify(DEFAULT_CONFIG, null, 2));

  // Create initial state files for requested skills
  for (const skill of skills) {
    const state = {
      ...DEFAULT_STATE_META,
      meta: { ...DEFAULT_STATE_META.meta, sessionId: skill },
      canvas: { ...DEFAULT_STATE_META.canvas, skillType: skill },
    };
    writeFileSync(join(supermechDir, `state-${skill}.json`), JSON.stringify(state, null, 2));
  }

  return { dir: supermechDir, skills };
}
