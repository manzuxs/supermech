import { existsSync, type FSWatcher, readFileSync, watch, writeFileSync } from 'node:fs';
import type { ServerResponse } from 'node:http';
import { join, resolve } from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';
import { createPlan, createSkill, ensureDir, ensureExecutingStateFromWritingState, listPlans, listSkills } from './session-manager.ts';
import { validateState } from '@supermech/schema';
import type { ExecutionMode } from '@supermech/schema';
import { createStateMiddleware } from './middleware.ts';

export interface WatcherPluginOptions {
  /** Optional explicit state file override. Prefer plan-scoped files under `basePlanDir`. */
  statePath?: string;
  /** Base directory containing plan directories. Defaults to `<root>/.supermech/`. */
  basePlanDir?: string;
}

const VIRTUAL_MODULE_ID = 'virtual:supermech/state';
const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`;

function readJSON(path: string): string {
  if (!existsSync(path)) return '{}';
  return readFileSync(path, 'utf-8');
}



export function supermechWatcherPlugin(options?: WatcherPluginOptions): Plugin {
  let baseDir: string; // .supermech/
  let currentPlan = 'default';
  let currentSkill = 'brainstorming';
  let statePath: string;
  let planDir: string; // {baseDir}/{currentPlan}/
  let server: ViteDevServer;
  let fileWatcher: FSWatcher | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const sseClients = new Set<ServerResponse>();

  function planDirectory(plan: string): string {
    return join(baseDir, plan);
  }

  function skillPath(plan: string, skill: string): string {
    return join(baseDir, plan, `state-${skill}.json`);
  }

  function updatePaths(): void {
    planDir = planDirectory(currentPlan);
    ensureDir(planDir);
    statePath = skillPath(currentPlan, currentSkill);
  }

  const state = () => JSON.parse(readJSON(statePath));

  function triggerHMR(): void {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_MODULE_ID);
      if (mod) {
        server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'custom', event: 'supermech:state-update', data: {} });
      }
      for (const client of sseClients) {
        client.write('data: update\n\n');
      }
    }, 150);
  }

  function startWatching(path: string): void {
    if (fileWatcher) fileWatcher.close();
    if (existsSync(path)) {
      fileWatcher = watch(path, (eventType) => {
        if (eventType !== 'change') return;
        triggerHMR();
      });
    }
  }

  function switchSkill(skill: string, mode?: ExecutionMode): void {
    currentSkill = skill;
    statePath = skillPath(currentPlan, skill);
    ensureDir(planDir);

    if (skill === 'executing-plans') {
      const next = ensureExecutingStateFromWritingState(planDir, mode ?? 'inline');
      writeFileSync(statePath, JSON.stringify(next, null, 2));
    } else if (!existsSync(statePath)) {
      createSkill(planDir, skill);
    }

    startWatching(statePath);
    const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_MODULE_ID);
    if (mod) {
      server.moduleGraph.invalidateModule(mod);
      server.ws.send({ type: 'custom', event: 'supermech:state-update', data: {} });
    }
  }

  function switchPlan(plan: string): void {
    currentPlan = plan;
    currentSkill = 'brainstorming';
    updatePaths();
    if (!existsSync(statePath)) {
      createSkill(planDir, currentSkill);
    }
    startWatching(statePath);
    const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_MODULE_ID);
    if (mod) {
      server.moduleGraph.invalidateModule(mod);
      server.ws.send({ type: 'custom', event: 'supermech:state-update', data: {} });
    }
  }

  return {
    name: 'supermech-watcher',
    enforce: 'pre',

    configResolved(config) {
      baseDir = options?.basePlanDir ?? resolve(config.root, '.supermech');
      updatePaths();
      if (options?.statePath) {
        statePath = options.statePath;
      }
    },

    configureServer(_server) {
      server = _server;

      if (!existsSync(statePath)) {
        createSkill(planDir, currentSkill);
      }
      fileWatcher = watch(statePath, (eventType) => {
        if (eventType !== 'change') return;
        triggerHMR();
      });

      server.middlewares.use('/__state/events', (req, res) => {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        });
        sseClients.add(res);
        // Send initial heartbeat
        res.write('data: connected\n\n');
        req.on('close', () => {
          sseClients.delete(res);
        });
      });

      server.middlewares.use('/__state', createStateMiddleware({
        baseDir,
        getStatePath: () => statePath,
        getPlanDir: () => planDir,
        getCurrentPlan: () => currentPlan,
        getCurrentSkill: () => currentSkill,
        state,
        writeState: (s) => writeFileSync(statePath, JSON.stringify(s, null, 2)),
        listPlans: () => listPlans(baseDir).map(p => p.planName),
        listSkills: () => listSkills(planDir).map(s => s.skill),
        createPlan: (plan) => createPlan(baseDir, plan),
        switchSkill,
        switchPlan,
        validate: validateState,
      }));
    },

    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) return RESOLVED_VIRTUAL_MODULE_ID;
    },

    load(id) {
      if (id === RESOLVED_VIRTUAL_MODULE_ID) {
        return `const s = ${readJSON(statePath)};
export default s;
if (import.meta.hot) {
  import.meta.hot.accept();
}`;
      }
    },
  };
}
