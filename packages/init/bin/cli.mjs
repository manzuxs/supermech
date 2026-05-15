#!/usr/bin/env node

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BUILTIN_SKILLS = ['brainstorming', 'writing-plans', 'executing-plans'];

const AGENT_DIRS = {
  claude: '.claude/skills',
  gemini: '.gemini/skills',
  cursor: '.cursor/skills',
  windsurf: '.windsurf/skills',
  'claude-internal': '.claude-internal/skills',
};

const DEFAULT_CONFIG = {
  schemaVersion: 1,
  statePath: '.supermech',
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
  let skills = null; // null = all built-in
  let noSkills = false;
  let agents = ['claude']; // default: claude

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--with-skills' && argv[i + 1]) {
      skills = argv[i + 1].split(',').map((s) => s.trim());
      i++;
    } else if (argv[i] === '--agent' && argv[i + 1]) {
      const agentArg = argv[i + 1];
      if (agentArg === 'all') {
        agents = Object.keys(AGENT_DIRS);
      } else {
        agents = agentArg.split(',').map((a) => a.trim()).filter((a) => AGENT_DIRS[a]);
      }
      i++;
    } else if (argv[i] === '--no-skills') {
      noSkills = true;
    }
  }

  if (noSkills) return { skills: [], agents };
  return { skills: skills ?? BUILTIN_SKILLS, agents };
}

function findSkillsDir() {
  // Bundled: ../skills/ relative to this file
  const bundled = resolve(__dirname, '../skills');
  if (existsSync(bundled)) return bundled;
  // Dev: skills/ relative to package root
  const dev = resolve(__dirname, '../../skills');
  if (existsSync(dev)) return dev;
  return bundled;
}

function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    if (statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      writeFileSync(destPath, readFileSync(srcPath));
    }
  }
}

function init(cwd, options) {
  const { skills, agents } = options;
  const supermechDir = join(cwd, '.supermech');
  const skillsDir = join(supermechDir, 'skills');
  const skillsSrc = findSkillsDir();

  mkdirSync(supermechDir, { recursive: true });
  mkdirSync(skillsDir, { recursive: true });

  writeFileSync(join(supermechDir, 'config.json'), JSON.stringify(DEFAULT_CONFIG, null, 2));

  for (const skill of skills) {
    // Create state file
    const state = {
      ...DEFAULT_STATE_META,
      meta: { ...DEFAULT_STATE_META.meta, sessionId: skill },
      canvas: { ...DEFAULT_STATE_META.canvas, skillType: skill },
    };
    writeFileSync(join(supermechDir, `state-${skill}.json`), JSON.stringify(state, null, 2));

    // Copy SKILL.md to .supermech/skills/
    const skillSrc = join(skillsSrc, skill);
    if (existsSync(skillSrc)) {
      copyDir(skillSrc, join(skillsDir, skill));
    }

    // Copy to agent directories
    for (const agent of agents) {
      const agentSkillsDir = join(cwd, AGENT_DIRS[agent]);
      const agentSkillDir = join(agentSkillsDir, `supermech-${skill}`);
      if (existsSync(skillSrc)) {
        copyDir(skillSrc, agentSkillDir);
      }
    }
  }

  return { dir: supermechDir, skills, agents };
}

const cwd = process.cwd();
const args = parseArgs(process.argv.slice(2));
const result = init(cwd, args);

console.log(`Supermech initialized at ${result.dir}`);
console.log(`Skills installed: ${result.skills.join(', ')}`);
console.log(`Agent directories: ${result.agents.map((a) => `${AGENT_DIRS[a]}/supermech-*`).join(', ')}`);
if (result.skills.length > 0) {
  console.log(`\nStart workbench: npx @supermech/cli`);
  console.log(`Your agent can now use skills from ${result.agents.length > 1 ? 'these directories' : 'this directory'}.`);
}
