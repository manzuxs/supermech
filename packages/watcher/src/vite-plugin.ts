import { existsSync, type FSWatcher, readFileSync, watch, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Plugin, ViteDevServer } from 'vite';
import { createPlan, createSkill, ensureDir, listPlans, listSkills } from './session-manager.ts';
import { validateState } from './validate.ts';

export interface WatcherPluginOptions {
  statePath?: string;
  /** Base directory containing plan directories. Defaults to `<root>/docs/superpowers-plus/`. */
  basePlanDir?: string;
}

const VIRTUAL_MODULE_ID = 'virtual:superpowers/state';
const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`;

function readJSON(path: string): string {
  if (!existsSync(path)) return '{}';
  return readFileSync(path, 'utf-8');
}

export function superpowersWatcherPlugin(options?: WatcherPluginOptions): Plugin {
  let baseDir: string; // docs/superpowers-plus/
  let currentPlan = 'default';
  let currentSkill = 'brainstorming';
  let statePath: string;
  let planDir: string; // {baseDir}/{currentPlan}/
  let server: ViteDevServer;
  let fileWatcher: FSWatcher | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

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
        server.ws.send({ type: 'custom', event: 'superpowers:state-update', data: {} });
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

  function switchSkill(skill: string): void {
    currentSkill = skill;
    statePath = skillPath(currentPlan, skill);
    if (!existsSync(statePath)) {
      createSkill(planDir, skill);
    }
    startWatching(statePath);
    const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_MODULE_ID);
    if (mod) {
      server.moduleGraph.invalidateModule(mod);
      server.ws.send({ type: 'custom', event: 'superpowers:state-update', data: {} });
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
      server.ws.send({ type: 'custom', event: 'superpowers:state-update', data: {} });
    }
  }

  function sendJSON(res: any, status: number, data: unknown): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  function parseBody(req: any): Promise<unknown> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk: string) => (body += chunk));
      req.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          reject(new Error('invalid JSON'));
        }
      });
    });
  }

  return {
    name: 'superpowers-watcher',
    enforce: 'pre',

    configResolved(config) {
      statePath = options?.statePath ?? resolve(config.root, 'state.json');
      baseDir = options?.basePlanDir ?? resolve(config.root, 'docs/superpowers-plus');
      updatePaths();
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

      server.middlewares.use('/__state', async (req, res, next) => {
        const url = req.url ?? '';

        try {
          // --- Plan management ---
          if (url.startsWith('/plans')) {
            const sub = url.replace('/plans', '') || '/';

            if (sub === '/' && req.method === 'GET') {
              const plans = listPlans(baseDir);
              const skills = listSkills(planDir);
              sendJSON(res, 200, {
                plans: plans.map((p) => p.planName),
                current: currentPlan,
                skills: skills.map((s) => s.skill),
                currentSkill,
              });
              return;
            }

            if (sub === '/switch' && req.method === 'POST') {
              const data: any = await parseBody(req);
              if (!data.plan) {
                sendJSON(res, 400, { ok: false, error: 'plan required' });
                return;
              }
              switchPlan(data.plan);
              const skills = listSkills(planDir);
              sendJSON(res, 200, {
                ok: true,
                plan: data.plan,
                skills: skills.map((s) => s.skill),
                currentSkill,
                state: state(),
              });
              return;
            }

            if (sub === '/create' && req.method === 'POST') {
              const data: any = await parseBody(req);
              if (!data.plan) {
                sendJSON(res, 400, { ok: false, error: 'plan required' });
                return;
              }
              createPlan(baseDir, data.plan);
              sendJSON(res, 200, { ok: true });
              return;
            }

            sendJSON(res, 404, { ok: false, error: 'plan endpoint not found' });
            return;
          }

          // --- Skill management ---
          if (url.startsWith('/skills')) {
            const sub = url.replace('/skills', '') || '/';

            if (sub === '/' && req.method === 'GET') {
              const skills = listSkills(planDir);
              sendJSON(res, 200, { skills: skills.map((s) => s.skill), current: currentSkill });
              return;
            }

            if (sub === '/switch' && req.method === 'POST') {
              const data: any = await parseBody(req);
              if (!data.skill) {
                sendJSON(res, 400, { ok: false, error: 'skill required' });
                return;
              }
              switchSkill(data.skill);
              sendJSON(res, 200, { ok: true, skill: data.skill, state: state() });
              return;
            }

            sendJSON(res, 404, { ok: false, error: 'skill endpoint not found' });
            return;
          }

          // --- Data endpoints ---
          if (req.method === 'GET') {
            sendJSON(res, 200, state());
            return;
          }

          if (req.method !== 'POST' && req.method !== 'PATCH') {
            return next();
          }

          const data: any = await parseBody(req);
          const s = state();

          if (url === '/select' && req.method === 'POST') {
            s.ui.selectedNodeId = data.nodeId ?? null;
          } else if (url === '/ui' && req.method === 'PATCH') {
            Object.assign(s.ui, data);
          } else if (url === '/feedback' && req.method === 'POST') {
            s.feedback.push({
              id: crypto.randomUUID(),
              nodeId: data.nodeId,
              text: data.text,
              rating: data.rating ?? undefined,
              section: data.section ?? null,
              stepIndex: data.stepIndex ?? null,
              quickAction: data.quickAction ?? null,
              createdAt: new Date().toISOString(),
            });
          } else if (url === '/node' && req.method === 'PATCH') {
            const idx = s.canvas.nodes.findIndex((n: { id: string }) => n.id === data.id);
            if (idx === -1) {
              sendJSON(res, 404, { ok: false, error: `node ${data.id} not found` });
              return;
            }
            Object.assign(s.canvas.nodes[idx], data);
          } else {
            sendJSON(res, 404, { ok: false, error: 'not found' });
            return;
          }

          const { valid, errors: validationErrors } = validateState(s);
          if (!valid) {
            console.error('[superpowers] state validation failed:', validationErrors.join('; '));
            s.meta.agentStatus = 'error' as const;
            s.feedback.push({
              id: crypto.randomUUID(),
              nodeId: '__global__',
              text: `State validation error: ${validationErrors.join('; ')}`,
              section: null,
              stepIndex: null,
              quickAction: null,
              createdAt: new Date().toISOString(),
            });
          }

          const raw = JSON.stringify(s, null, 2);
          writeFileSync(statePath, raw);
          sendJSON(res, 200, s);
        } catch (err) {
          sendJSON(res, 400, { ok: false, error: String(err) });
        }
      });
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
