#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

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

function parseArgs(argv) {
  const skills = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--with-skills' && argv[i + 1]) {
      skills.push(...argv[i + 1].split(',').map((s) => s.trim()));
      i++;
    }
  }
  return { skills };
}

function init(cwd, options) {
  const { skills } = options;
  const supermechDir = join(cwd, '.supermech');
  const skillsDir = join(supermechDir, 'skills');

  mkdirSync(supermechDir, { recursive: true });
  mkdirSync(skillsDir, { recursive: true });

  writeFileSync(join(supermechDir, 'config.json'), JSON.stringify(DEFAULT_CONFIG, null, 2));

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

const cwd = process.cwd();
const args = parseArgs(process.argv.slice(2));
const result = init(cwd, args);

console.log(`Supermech initialized at ${result.dir}`);
if (result.skills.length > 0) {
  console.log(`Skills installed: ${result.skills.join(', ')}`);
}
console.log('Run `ls .supermech/` to see the files.');
