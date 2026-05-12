const VALID_STATUSES = new Set(['pending', 'active', 'accepted', 'rejected', 'done']);
const VALID_SKILL_TYPES = new Set(['brainstorming', 'writing-plans', 'executing-plans']);
const VALID_AGENT_STATUSES = new Set(['idle', 'thinking', 'writing', 'error']);
const VALID_THEMES = new Set(['light', 'dark', 'system']);
const VALID_FILE_TYPES = new Set(['create', 'modify', 'test', 'delete']);

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function errs(path: string, msg: string): string {
  return `${path}: ${msg}`;
}

export function validateState(data: unknown): ValidationResult {
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['state must be an object'] };
  }
  const s = data as Record<string, unknown>;

  const errors: string[] = [];

  // ── meta ──
  const meta = s.meta as Record<string, unknown> | undefined;
  if (!meta || typeof meta !== 'object') {
    errors.push(errs('meta', 'missing or not an object'));
  } else {
    if (typeof meta.projectName !== 'string')
      errors.push(errs('meta.projectName', 'must be a string'));
    if (typeof meta.sessionId !== 'string') errors.push(errs('meta.sessionId', 'must be a string'));
    if (!VALID_AGENT_STATUSES.has(meta.agentStatus as string)) {
      errors.push(
        errs('meta.agentStatus', `must be one of ${[...VALID_AGENT_STATUSES].join(', ')}`),
      );
    }
  }

  // ── canvas ──
  const canvas = s.canvas as Record<string, unknown> | undefined;
  if (!canvas || typeof canvas !== 'object') {
    errors.push(errs('canvas', 'missing or not an object'));
    // can't proceed without canvas
    return { valid: false, errors };
  }

  if (!VALID_SKILL_TYPES.has(canvas.skillType as string)) {
    errors.push(errs('canvas.skillType', `must be one of ${[...VALID_SKILL_TYPES].join(', ')}`));
  }

  // ── nodes ──
  const nodes = canvas.nodes as unknown[];
  if (!Array.isArray(nodes)) {
    errors.push(errs('canvas.nodes', 'must be an array'));
  } else {
    const ids = new Set<string>();
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i] as Record<string, unknown> | undefined;
      const prefix = `canvas.nodes[${i}]`;

      if (!n || typeof n !== 'object') {
        errors.push(errs(`${prefix}`, 'must be an object'));
        continue;
      }

      if (typeof n.id !== 'string' || !n.id) errors.push(errs(`${prefix}.id`, 'required string'));
      if (typeof n.label !== 'string' || !n.label)
        errors.push(errs(`${prefix}.label`, 'required string'));

      if (n.id && typeof n.id === 'string') {
        if (ids.has(n.id)) errors.push(errs(`${prefix}.id`, `duplicate id "${n.id}"`));
        ids.add(n.id);
      }

      if (!VALID_STATUSES.has(n.status as string)) {
        errors.push(errs(`${prefix}.status`, `must be one of ${[...VALID_STATUSES].join(', ')}`));
      }

      if (typeof n.progress !== 'number' || n.progress < 0 || n.progress > 1) {
        errors.push(errs(`${prefix}.progress`, 'must be a number between 0 and 1'));
      }

      // metadata deep checks
      const meta = n.metadata as Record<string, unknown> | undefined;
      if (meta && typeof meta === 'object') {
        if (meta.goal !== undefined && typeof meta.goal !== 'string') {
          errors.push(errs(`${prefix}.metadata.goal`, 'must be a string'));
        }

        const files = meta.files;
        if (files !== undefined) {
          if (!Array.isArray(files)) {
            errors.push(errs(`${prefix}.metadata.files`, 'must be an array'));
          } else {
            for (let j = 0; j < files.length; j++) {
              const f = files[j] as Record<string, unknown> | undefined;
              if (!f || typeof f !== 'object') {
                errors.push(errs(`${prefix}.metadata.files[${j}]`, 'must be an object'));
                continue;
              }
              if (typeof f.path !== 'string' || !f.path) {
                errors.push(errs(`${prefix}.metadata.files[${j}].path`, 'required string'));
              }
              if (f.type && !VALID_FILE_TYPES.has(f.type as string)) {
                errors.push(
                  errs(
                    `${prefix}.metadata.files[${j}].type`,
                    `must be one of ${[...VALID_FILE_TYPES].join(', ')}`,
                  ),
                );
              }
            }
          }
        }

        for (const stepsKey of ['implementationSteps', 'verificationSteps'] as const) {
          const steps = meta[stepsKey];
          if (steps !== undefined) {
            if (!Array.isArray(steps)) {
              errors.push(errs(`${prefix}.metadata.${stepsKey}`, 'must be an array'));
            } else {
              for (let j = 0; j < steps.length; j++) {
                const step = steps[j] as Record<string, unknown> | undefined;
                if (!step || typeof step !== 'object') {
                  errors.push(errs(`${prefix}.metadata.${stepsKey}[${j}]`, 'must be an object'));
                  continue;
                }
                if (typeof step.description !== 'string' || !step.description) {
                  errors.push(
                    errs(`${prefix}.metadata.${stepsKey}[${j}].description`, 'required string'),
                  );
                }
              }
            }
          }
        }
      }
    }
  }

  // ── edges ──
  const edges = canvas.edges as unknown[];
  if (!Array.isArray(edges)) {
    errors.push(errs('canvas.edges', 'must be an array'));
  } else {
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i] as Record<string, unknown> | undefined;
      const prefix = `canvas.edges[${i}]`;
      if (!e || typeof e !== 'object') {
        errors.push(errs(`${prefix}`, 'must be an object'));
        continue;
      }
      if (typeof e.from !== 'string' || !e.from)
        errors.push(errs(`${prefix}.from`, 'required string'));
      if (typeof e.to !== 'string' || !e.to) errors.push(errs(`${prefix}.to`, 'required string'));
    }
  }

  // ── ui ──
  const ui = s.ui as Record<string, unknown> | undefined;
  if (!ui || typeof ui !== 'object') {
    errors.push(errs('ui', 'missing or not an object'));
  } else {
    if (ui.theme && !VALID_THEMES.has(ui.theme as string)) {
      errors.push(errs('ui.theme', `must be one of ${[...VALID_THEMES].join(', ')}`));
    }
  }

  // ── feedback ──
  const feedback = s.feedback as unknown[];
  if (!Array.isArray(feedback)) {
    errors.push(errs('feedback', 'must be an array'));
  } else {
    for (let i = 0; i < feedback.length; i++) {
      const fb = feedback[i] as Record<string, unknown> | undefined;
      if (!fb || typeof fb !== 'object') {
        errors.push(errs(`feedback[${i}]`, 'must be an object'));
        continue;
      }
      if (typeof fb.nodeId !== 'string')
        errors.push(errs(`feedback[${i}].nodeId`, 'required string'));
      if (typeof fb.text !== 'string') errors.push(errs(`feedback[${i}].text`, 'required string'));
      if (
        fb.rating !== undefined &&
        (typeof fb.rating !== 'number' || fb.rating < 1 || fb.rating > 5)
      ) {
        errors.push(errs(`feedback[${i}].rating`, 'must be a number between 1 and 5'));
      }
    }
  }

  // ── PlanHeader phase consistency ──
  const canvasMeta = canvas.metadata as Record<string, unknown> | undefined;
  const planHeader = canvasMeta?.planHeader as Record<string, unknown> | undefined;
  if (planHeader && typeof planHeader === 'object') {
    if (typeof planHeader.goal !== 'string' || !planHeader.goal) {
      errors.push(errs('canvas.metadata.planHeader.goal', 'required string'));
    }
    if (typeof planHeader.architecture !== 'string' || !planHeader.architecture) {
      errors.push(errs('canvas.metadata.planHeader.architecture', 'required string'));
    }
    if (!Array.isArray(planHeader.techStack) || planHeader.techStack.length === 0) {
      errors.push(errs('canvas.metadata.planHeader.techStack', 'required non-empty array'));
    }

    const planPhases = planHeader.phases as Array<Record<string, unknown>> | undefined;
    if (planPhases) {
      const phaseNames = new Set(planPhases.map((p) => String(p.name ?? '')));
      if (Array.isArray(nodes)) {
        const usedPhases = new Set<string>();
        for (const n of nodes) {
          const nm = (n as Record<string, unknown>)?.metadata as
            | Record<string, unknown>
            | undefined;
          const phase = nm?.phase as string | undefined;
          if (phase) usedPhases.add(phase);
        }
        for (const p of usedPhases) {
          if (!phaseNames.has(p)) {
            errors.push(
              errs(
                'canvas.metadata.planHeader.phases',
                `task references phase "${p}" not defined in PlanHeader`,
              ),
            );
          }
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
