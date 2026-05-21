import type { IncomingMessage, ServerResponse } from 'node:http';
import type {
  ExecutionMode,
  ExecutionPhase,
  GateStatus,
  GateType,
  WorkbenchState,
} from '@supermech/schema';
import {
  completionCheckItemSchema,
  debugTraceItemSchema,
  executionRunSchema,
} from '@supermech/schema';
import {
  applyStateCompletionCheckUpdate,
  applyStateNodeDebugTraceUpdate,
  applyStateNodeExecutionPhase,
  applyStateNodeGateState,
  applyStateNodeRunUpdate,
  resetStateNodeForReplan,
} from './node-execution-state.ts';

export interface MiddlewareConfig {
  /** Base directory for plan-based state files. */
  baseDir: string;
  /** Resolves to the current state file path. */
  getStatePath: () => string;
  /** Resolves to the current plan directory. */
  getPlanDir: () => string;
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
  switchSkill: (skill: string, mode?: ExecutionMode) => void;
  /** Switch to a different plan (updates internal state). */
  switchPlan: (plan: string) => void;
  /** Current plan name. */
  getCurrentPlan: () => string | null;
  /** Current skill name. */
  getCurrentSkill: () => string;
  /** Validate state and return errors. */
  validate: (s: unknown) => { valid: boolean; errors: string[] };
}

function sendJSON(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function buildValidationErrorResponse(
  method: string | undefined,
  path: string,
  validationErrors: string[],
) {
  return {
    ok: false,
    error: 'state validation failed',
    code: 'STATE_VALIDATION_FAILED',
    details: {
      method: method ?? 'UNKNOWN',
      path,
      validationErrors,
    },
  };
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
            current: cfg.getCurrentPlan(),
            skills,
            currentSkill: cfg.getCurrentSkill(),
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
            currentSkill: cfg.getCurrentSkill(),
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
          sendJSON(res, 200, { skills, current: cfg.getCurrentSkill() });
          return;
        }

        if (sub === '/switch' && req.method === 'POST') {
          const data: any = await parseBody(req);
          if (!data.skill) {
            sendJSON(res, 400, { ok: false, error: 'skill required' });
            return;
          }
          const skill = typeof data.skill === 'string' ? data.skill : '';
          const mode = data?.mode === 'subagent' || data?.mode === 'inline' ? data.mode : undefined;

          if (skill === 'executing-plans') {
            try {
              cfg.switchSkill(skill, mode);
            } catch (error) {
              if (
                error instanceof Error &&
                error.message === 'WRITING_PLAN_REQUIRED_FOR_EXECUTION'
              ) {
                sendJSON(res, 409, {
                  ok: false,
                  error: 'writing-plans state required before entering executing-plans',
                  code: 'WRITING_PLAN_REQUIRED_FOR_EXECUTION',
                });
                return;
              }
              throw error;
            }
            sendJSON(res, 200, { ok: true, skill, mode, state: cfg.state() });
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
      const s = structuredClone(cfg.state() as unknown as WorkbenchState);

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
      } else if (url === '/feedback/process' && req.method === 'POST') {
        const { feedbackId } = data;
        if (!feedbackId) {
          sendJSON(res, 400, { ok: false, error: 'feedbackId required' });
          return;
        }
        const feedbackEntry = s.feedback.find((entry) => entry.id === feedbackId);
        if (!feedbackEntry) {
          sendJSON(res, 404, { ok: false, error: `feedback ${feedbackId} not found` });
          return;
        }
        feedbackEntry.processedAt = new Date().toISOString();
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
          rating: undefined,
          quickAction: 'replan',
          createdAt: new Date().toISOString(),
        });
      } else if (url === '/node/run' && req.method === 'PATCH') {
        const { nodeId, run } = data;
        if (!nodeId || !run) {
          sendJSON(res, 400, { ok: false, error: 'nodeId and run required' });
          return;
        }
        const parsed = executionRunSchema.safeParse(run);
        if (!parsed.success) {
          sendJSON(res, 400, { ok: false, error: 'invalid run payload' });
          return;
        }
        try {
          applyStateNodeRunUpdate(s, nodeId, parsed.data);
        } catch (error) {
          sendJSON(res, 404, { ok: false, error: `node ${nodeId} not found` });
          return;
        }
      } else if (url === '/node/debug-trace' && req.method === 'PATCH') {
        const { nodeId, item } = data;
        if (!nodeId || !item) {
          sendJSON(res, 400, { ok: false, error: 'nodeId and item required' });
          return;
        }
        const parsed = debugTraceItemSchema.safeParse(item);
        if (!parsed.success) {
          sendJSON(res, 400, { ok: false, error: 'invalid debug trace payload' });
          return;
        }
        try {
          applyStateNodeDebugTraceUpdate(s, nodeId, parsed.data);
        } catch (error) {
          sendJSON(res, 404, { ok: false, error: `node ${nodeId} not found` });
          return;
        }
      } else if (url === '/completion-check' && req.method === 'PATCH') {
        const { item } = data;
        if (!item) {
          sendJSON(res, 400, { ok: false, error: 'item required' });
          return;
        }
        const parsed = completionCheckItemSchema.safeParse(item);
        if (!parsed.success) {
          sendJSON(res, 400, { ok: false, error: 'invalid completion check payload' });
          return;
        }
        applyStateCompletionCheckUpdate(s, parsed.data);
      } else {
        sendJSON(res, 404, { ok: false, error: 'not found' });
        return;
      }

      const { valid, errors: validationErrors } = cfg.validate(s);
      if (!valid) {
        console.error('[supermech] state validation failed:', {
          method: req.method ?? 'UNKNOWN',
          path: url,
          plan: cfg.getCurrentPlan(),
          skill: cfg.getCurrentSkill(),
          validationErrors,
        });
        sendJSON(res, 422, buildValidationErrorResponse(req.method, url, validationErrors));
        return;
      }

      cfg.writeState(s);
      sendJSON(res, 200, s);
    } catch (err) {
      sendJSON(res, 400, { ok: false, error: String(err) });
    }
  };
}
