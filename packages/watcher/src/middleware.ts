import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ExecutionPhase, GateStatus, GateType } from '@supermech/schema';
import {
  applyNodeExecutionPhase,
  applyNodeGateState,
  resetNodeExecutionState,
} from './execution-state.ts';

export interface MiddlewareConfig {
  /** Base directory for plan-based state files. */
  baseDir: string;
  /** Resolves to the current state file path. */
  statePath: string;
  /** Resolves to the current plan directory. */
  planDir: string;
  /** Reads current active state. */
  state: () => Record<string, unknown>;
  /** Writes the given object to the current state path. */
  writeState: (data: unknown) => void;
  /** List plans under baseDir. */
  listPlans: () => string[];
  /** List skill files under planDir. */
  listSkills: () => string[];
  /** Create a plan directory. */
  createPlan: (plan: string) => void;
  /** Switch to a different skill (updates internal state). */
  switchSkill: (skill: string) => void;
  /** Switch to a different plan (updates internal state). */
  switchPlan: (plan: string) => void;
  /** Current plan name. */
  currentPlan: string;
  /** Current skill name. */
  currentSkill: string;
  /** Validate state and return errors. */
  validate: (s: unknown) => { valid: boolean; errors: string[] };
}

function sendJSON(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function parseBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk: string) => (body += chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve(null);
      }
    });
  });
}

export function createStateMiddleware(cfg: MiddlewareConfig) {
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url ?? '';

    try {
      // --- Plan management ---
      if (url.startsWith('/plans')) {
        const sub = url.replace('/plans', '') || '/';

        if (sub === '/' && req.method === 'GET') {
          const plans = cfg.listPlans();
          const skills = cfg.listSkills();
          sendJSON(res, 200, {
            plans,
            current: cfg.currentPlan,
            skills,
            currentSkill: cfg.currentSkill,
          });
          return;
        }

        if (sub === '/switch' && req.method === 'POST') {
          const data: any = await parseBody(req);
          if (!data.plan) {
            sendJSON(res, 400, { ok: false, error: 'plan required' });
            return;
          }
          cfg.switchPlan(data.plan);
          const skills = cfg.listSkills();
          sendJSON(res, 200, {
            ok: true,
            plan: data.plan,
            skills,
            currentSkill: cfg.currentSkill,
            state: cfg.state(),
          });
          return;
        }

        if (sub === '/create' && req.method === 'POST') {
          const data: any = await parseBody(req);
          if (!data.plan) {
            sendJSON(res, 400, { ok: false, error: 'plan required' });
            return;
          }
          cfg.createPlan(data.plan);
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
          const skills = cfg.listSkills();
          sendJSON(res, 200, { skills, current: cfg.currentSkill });
          return;
        }

        if (sub === '/switch' && req.method === 'POST') {
          const data: any = await parseBody(req);
          if (!data.skill) {
            sendJSON(res, 400, { ok: false, error: 'skill required' });
            return;
          }
          cfg.switchSkill(data.skill);
          sendJSON(res, 200, { ok: true, skill: data.skill, state: cfg.state() });
          return;
        }

        sendJSON(res, 404, { ok: false, error: 'skill endpoint not found' });
        return;
      }

      // --- Data endpoints ---
      if (req.method === 'GET') {
        sendJSON(res, 200, cfg.state());
        return;
      }

      if (req.method !== 'POST' && req.method !== 'PATCH') {
        next();
        return;
      }

      const data: any = await parseBody(req);
      const s: Record<string, any> = cfg.state();

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
      } else if (url === '/node/gate-state' && req.method === 'PATCH') {
        const { nodeId, type, status, result } = data;
        if (!nodeId || !type || !status) {
          sendJSON(res, 400, { ok: false, error: 'nodeId, type, status required' });
          return;
        }
        const node = s.canvas.nodes.find((n: { id: string }) => n.id === nodeId);
        if (!node) {
          sendJSON(res, 404, { ok: false, error: `node ${nodeId} not found` });
          return;
        }
        applyNodeGateState(node, type as GateType, status as GateStatus, result);
      } else if (url === '/node/execution-phase' && req.method === 'PATCH') {
        const { nodeId, phase } = data;
        if (!nodeId || !phase) {
          sendJSON(res, 400, { ok: false, error: 'nodeId, phase required' });
          return;
        }
        const node = s.canvas.nodes.find((n: { id: string }) => n.id === nodeId);
        if (!node) {
          sendJSON(res, 404, { ok: false, error: `node ${nodeId} not found` });
          return;
        }
        applyNodeExecutionPhase(node, phase as ExecutionPhase);
      } else if (url === '/replan' && req.method === 'POST') {
        const { nodeId } = data;
        if (!nodeId) {
          sendJSON(res, 400, { ok: false, error: 'nodeId required' });
          return;
        }
        const node = s.canvas.nodes.find((n: { id: string }) => n.id === nodeId);
        if (!node) {
          sendJSON(res, 404, { ok: false, error: `node ${nodeId} not found` });
          return;
        }
        node.status = 'pending';
        node.progress = 0;
        resetNodeExecutionState(node);
        s.feedback.push({
          id: crypto.randomUUID(),
          nodeId,
          text: 'User requested re-plan. Please review and re-execute this task.',
          rating: null,
          section: null,
          stepIndex: null,
          quickAction: 'replan',
          createdAt: new Date().toISOString(),
        });
      } else {
        sendJSON(res, 404, { ok: false, error: 'not found' });
        return;
      }

      const { valid, errors: validationErrors } = cfg.validate(s);
      if (!valid) {
        console.error('[supermech] state validation failed:', validationErrors.join('; '));
        s.meta.agentStatus = 'error';
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

      cfg.writeState(s);
      sendJSON(res, 200, s);
    } catch (err) {
      sendJSON(res, 400, { ok: false, error: String(err) });
    }
  };
}
