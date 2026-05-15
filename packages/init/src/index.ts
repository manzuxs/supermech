import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BUILTIN_SKILLS = ['brainstorming', 'writing-plans', 'executing-plans'];

const AGENT_DIRS: Record<string, string> = {
  claude: '.claude/skills',
  gemini: '.gemini/skills',
  cursor: '.cursor/skills',
  windsurf: '.windsurf/skills',
  'claude-internal': '.claude-internal/skills',
};

export interface InitOptions {
  cwd?: string;
  skills?: string[];
  agents?: string[];
}

const DEFAULT_CONFIG = {
  schemaVersion: 1,
  statePath: '.supermech',
  skillsPath: '.supermech/skills',
};

function findSkillsDir(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const bundled = resolve(__dirname, '../skills');
  if (existsSync(bundled)) return bundled;
  const dev = resolve(__dirname, '../../skills');
  if (existsSync(dev)) return dev;
  return bundled;
}

function copyDir(src: string, dest: string): void {
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

/** Initialize a `.supermech/` directory in the target project. */
export function initProject(options: InitOptions = {}): { dir: string; skills: string[]; agents: string[] } {
  const cwd = options.cwd ?? process.cwd();
  const skills = options.skills ?? BUILTIN_SKILLS;
  const agents = options.agents ?? ['claude'];

  const supermechDir = join(cwd, '.supermech');
  const skillsDir = join(supermechDir, 'skills');
  const skillsSrc = findSkillsDir();

  mkdirSync(supermechDir, { recursive: true });
  mkdirSync(skillsDir, { recursive: true });

  writeFileSync(join(supermechDir, 'config.json'), JSON.stringify(DEFAULT_CONFIG, null, 2));

  for (const skill of skills) {
    // Copy SKILL.md to .supermech/skills/
    const skillSrc = join(skillsSrc, skill);
    if (existsSync(skillSrc)) {
      copyDir(skillSrc, join(skillsDir, skill));
    }

    // Copy to agent directories
    for (const agent of agents) {
      const dir = AGENT_DIRS[agent];
      if (!dir) continue;
      const agentSkillDir = join(cwd, dir, `supermech-${skill}`);
      if (existsSync(skillSrc)) {
        copyDir(skillSrc, agentSkillDir);
      }
    }
  }

  return { dir: supermechDir, skills, agents };
}
