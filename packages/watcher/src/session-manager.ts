import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { basename, join } from 'node:path';
import { createDefaultWorkbenchState } from '@supermech/schema';
import { validateState } from './validate.ts';

export interface PlanInfo {
  planName: string;
  dir: string;
}

export interface SkillInfo {
  skill: string;
  filePath: string;
}

export function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/** List plans = subdirectories under baseDir */
export function listPlans(baseDir: string): PlanInfo[] {
  ensureDir(baseDir);
  try {
    return readdirSync(baseDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
      .map((d) => ({ planName: d.name, dir: join(baseDir, d.name) }));
  } catch {
    return [];
  }
}

/** List skill files (state-*.json) within a plan directory */
export function listSkills(planDir: string): SkillInfo[] {
  ensureDir(planDir);
  try {
    return readdirSync(planDir)
      .filter((f) => /^state-.+\.json$/.test(f))
      .map((f) => ({ skill: f.replace(/^state-(.+)\.json$/, '$1'), filePath: join(planDir, f) }));
  } catch {
    return [];
  }
}

export function readSkill(planDir: string, skill: string): unknown | null {
  const path = join(planDir, `state-${skill}.json`);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

export function writeSkill(planDir: string, skill: string, state: unknown): void {
  const result = validateState(state);
  if (!result.valid) {
    throw new Error(`Invalid state for skill "${skill}": ${result.errors.join('; ')}`);
  }
  writeFileSync(join(planDir, `state-${skill}.json`), JSON.stringify(state, null, 2));
}

export function deleteSkill(planDir: string, skill: string): boolean {
  const path = join(planDir, `state-${skill}.json`);
  if (!existsSync(path)) return false;
  unlinkSync(path);
  return true;
}

/** Create a new plan directory */
export function createPlan(baseDir: string, planName: string): void {
  ensureDir(join(baseDir, planName));
}

/** Create a skill file with default state */
export function createSkill(planDir: string, skill: string): unknown {
  const typedSkill = skill as 'brainstorming' | 'writing-plans' | 'executing-plans';
  const state = createDefaultWorkbenchState({
    projectName: basename(planDir),
    sessionId: skill,
    activeSkill: typedSkill,
    skillType: typedSkill,
  });
  writeSkill(planDir, skill, state);
  return state;
}

export function skillFilePath(planDir: string, skill: string): string {
  return join(planDir, `state-${skill}.json`);
}
