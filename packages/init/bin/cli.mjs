#!/usr/bin/env node

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BUILTIN_SKILLS = ['brainstorming', 'writing-plans', 'executing-plans'];

const AGENT_DIRS = {
  claude: '.claude/skills',
  codex: '.codex/skills',
  gemini: '.gemini/skills',
  cursor: '.cursor/skills',
  windsurf: '.windsurf/skills',
  'claude-internal': '.claude-internal/skills',
};

const DEFAULT_CONFIG = {
  schemaVersion: 1,
  statePath: '.supermech',
};

function parseArgs(argv) {
  let skills = null; // null = all built-in
  let noSkills = false;
  let agents = ['claude', 'codex'];

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--with-skills' && argv[i + 1]) {
      skills = argv[i + 1].split(',').map((s) => s.trim());
      i++;
    } else if (argv[i] === '--agent' && argv[i + 1]) {
      const agentArg = argv[i + 1];
      if (agentArg === 'all') {
        agents = Object.keys(AGENT_DIRS);
      } else {
        agents = agentArg
          .split(',')
          .map((a) => a.trim())
          .filter((a) => AGENT_DIRS[a]);
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
  const skillsSrc = findSkillsDir();

  mkdirSync(supermechDir, { recursive: true });
  writeFileSync(join(supermechDir, 'config.json'), JSON.stringify(DEFAULT_CONFIG, null, 2));

  for (const skill of skills) {
    const skillSrc = join(skillsSrc, skill);

    // Copy to agent directories
    for (const agent of agents) {
      const agentSkillsDir = join(cwd, AGENT_DIRS[agent]);
      if (existsSync(skillSrc)) {
        copyDir(skillSrc, join(agentSkillsDir, `supermech-${skill}`));
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
console.log(
  `Agent directories: ${result.agents.map((a) => `${AGENT_DIRS[a]}/supermech-*`).join(', ')}`,
);
if (result.skills.length > 0) {
  console.log(`\nStart workbench: npx @supermech/cli`);
  console.log(
    `Your agent can now use skills from ${result.agents.length > 1 ? 'these directories' : 'this directory'}.`,
  );
}
