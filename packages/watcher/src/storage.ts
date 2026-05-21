import type { FSWatcher } from 'node:fs';
import { existsSync, watch as fsWatch, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { validateState } from '@supermech/schema';
import { listPlans as smListPlans, listSkills as smListSkills } from './session-manager.ts';

export interface RuntimeConfig {
  /** Base directory for state files. Defaults to `.supermech`. */
  statePath?: string;
  /** Current plan subdirectory (optional). When set, reads/writes from `<statePath>/<plan>/`. */
  currentPlan?: string | null;
}

export interface StateWatcher {
  close: () => void;
}

function resolveStatePath(basePath: string, skill: string, plan?: string | null): string {
  const dir = plan ? join(basePath, plan) : basePath;
  return join(dir, `state-${skill}.json`);
}

/** Ensure a directory exists. */
export function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/**
 * Read a skill's state file.
 * @returns parsed JSON state, or null if file doesn't exist or is invalid.
 */
export function readState(skill: string, config: RuntimeConfig = {}): unknown | null {
  const basePath = resolve(config.statePath ?? '.supermech');
  const path = resolveStatePath(basePath, skill, config.currentPlan);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Write a skill's state file.
 */
export function writeState(skill: string, data: unknown, config: RuntimeConfig = {}): void {
  const basePath = resolve(config.statePath ?? '.supermech');
  const path = resolveStatePath(basePath, skill, config.currentPlan);
  const dir = join(path, '..');
  const result = validateState(data);
  if (!result.valid) {
    throw new Error(`Invalid state for skill "${skill}": ${result.errors.join('; ')}`);
  }
  ensureDir(dir);
  writeFileSync(path, JSON.stringify(data, null, 2));
}

/**
 * Watch a skill's state file for changes.
 * Returns a watcher that can be closed.
 */
export function watchState(
  skill: string,
  onChange: () => void,
  config: RuntimeConfig = {},
): StateWatcher {
  const basePath = resolve(config.statePath ?? '.supermech');
  const path = resolveStatePath(basePath, skill, config.currentPlan);
  let watcher: FSWatcher | null = null;

  if (existsSync(path)) {
    watcher = fsWatch(path, (eventType) => {
      if (eventType !== 'change') return;
      onChange();
    });
  }

  return {
    close: () => {
      if (watcher) watcher.close();
    },
  };
}

/**
 * List available skill state files in the current context.
 * Returns skill names (without `state-` prefix or `.json` extension).
 */
export function listSkillNames(config: RuntimeConfig = {}): string[] {
  const basePath = resolve(config.statePath ?? '.supermech');
  const dir = config.currentPlan ? join(basePath, config.currentPlan) : basePath;
  return smListSkills(dir).map((s) => s.skill);
}

/** List plan subdirectories under the state path. */
export function listPlans(config: RuntimeConfig = {}): string[] {
  const basePath = resolve(config.statePath ?? '.supermech');
  return smListPlans(basePath).map((p) => p.planName);
}
