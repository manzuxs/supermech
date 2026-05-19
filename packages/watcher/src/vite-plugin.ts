import { existsSync, type FSWatcher, readFileSync, watch, writeFileSync } from 'node:fs';
import type { ServerResponse } from 'node:http';
import { join, resolve } from 'node:path';
import type { ExecutionPhase, GateStatus, GateType, WorkbenchState } from '@supermech/schema';
import type { Plugin, ViteDevServer } from 'vite';
import {
  applyStateNodeExecutionPhase,
  applyStateNodeGateState,
  resetStateNodeForReplan,
} from './node-execution-state.ts';
import { createPlan, createSkill, ensureDir, listPlans, listSkills } from './session-manager.ts';
import { validateState } from './validate.ts';

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

function buildValidationErrorResponse(
  method: string | undefined,
  path: string,
  plan: string,
  skill: string,
  validationErrors: string[],
) {
  return {
    ok: false,
    error: 'state validation failed',
    code: 'STATE_VALIDATION_FAILED',
    details: {
      method: method ?? 'UNKNOWN',
      path,
      plan,
      skill,
      validationErrors,
    },
  };
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
          const s = state() as unknown as WorkbenchState;

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
              section: data.section ?? undefined,
              stepIndex: data.stepIndex ?? undefined,
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
          } else if (url === '/node/gate-state' && req.method === 'PATCH') {
            const { nodeId, type, status, result } = data;
            if (!nodeId || !type || !status) {
              sendJSON(res, 400, { ok: false, error: 'nodeId, type, status required' });
              return;
            }
            try {
              applyStateNodeGateState(s, nodeId, type as GateType, status as GateStatus, result);
            } catch (error) {
              sendJSON(res, 404, { ok: false, error: `node ${nodeId} not found` });
              return;
            }
          } else if (url === '/node/execution-phase' && req.method === 'PATCH') {
            const { nodeId, phase } = data;
            if (!nodeId || !phase) {
              sendJSON(res, 400, { ok: false, error: 'nodeId, phase required' });
              return;
            }
            try {
              applyStateNodeExecutionPhase(s, nodeId, phase as ExecutionPhase);
            } catch (error) {
              sendJSON(res, 404, { ok: false, error: `node ${nodeId} not found` });
              return;
            }
          } else if (url === '/replan' && req.method === 'POST') {
            const { nodeId } = data;
            if (!nodeId) {
              sendJSON(res, 400, { ok: false, error: 'nodeId required' });
              return;
            }
            try {
              resetStateNodeForReplan(s, nodeId);
            } catch (error) {
              sendJSON(res, 404, { ok: false, error: `node ${nodeId} not found` });
              return;
            }
            s.feedback.push({
              id: crypto.randomUUID(),
              nodeId,
              text: 'User requested re-plan. Please review and re-execute this task.',
              quickAction: 'replan',
              createdAt: new Date().toISOString(),
            });
          } else {
            sendJSON(res, 404, { ok: false, error: 'not found' });
            return;
          }

          const { valid, errors: validationErrors } = validateState(s);
          if (!valid) {
            console.error('[supermech] state validation failed:', {
              method: req.method ?? 'UNKNOWN',
              path: url,
              plan: currentPlan,
              skill: currentSkill,
              validationErrors,
            });
            sendJSON(
              res,
              422,
              buildValidationErrorResponse(
                req.method,
                url,
                currentPlan,
                currentSkill,
                validationErrors,
              ),
            );
            return;
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
