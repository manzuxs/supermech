const VALID_STATUSES = new Set(['pending', 'active', 'accepted', 'rejected', 'done']);
const VALID_SKILL_TYPES = new Set(['brainstorming', 'writing-plans', 'executing-plans']);
const VALID_AGENT_STATUSES = new Set(['idle', 'thinking', 'writing', 'error']);
const VALID_THEMES = new Set(['light', 'dark', 'system']);
const VALID_FILE_TYPES = new Set(['create', 'modify', 'test', 'delete']);
const VALID_GATE_TYPES = new Set(['spec-review', 'code-quality']);
const VALID_GATE_STATUSES = new Set(['pending', 'running', 'passed', 'failed', 'skipped']);
const VALID_EXECUTION_PHASES = new Set([
  'implementing',
  'editing-files',
  'running-tests',
  'reviewing',
  'fixing',
  'idle',
]);
const VALID_EXECUTION_EVENT_KINDS = new Set(['phase', 'file', 'command', 'review', 'note']);
const VALID_EXECUTION_EVENT_STATUSES = new Set(['info', 'success', 'warning', 'error']);
const VALID_EXECUTION_FLOW_ORIENTATIONS = new Set(['horizontal']);

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

        // qualityGates validation
        const qualityGates = meta.qualityGates;
        if (qualityGates !== undefined) {
          if (!Array.isArray(qualityGates)) {
            errors.push(errs(`${prefix}.metadata.qualityGates`, 'must be an array'));
          } else {
            for (let j = 0; j < qualityGates.length; j++) {
              const g = qualityGates[j] as Record<string, unknown> | undefined;
              if (!g || typeof g !== 'object') {
                errors.push(errs(`${prefix}.metadata.qualityGates[${j}]`, 'must be an object'));
                continue;
              }
              if (g.type && !VALID_GATE_TYPES.has(g.type as string)) {
                errors.push(
                  errs(
                    `${prefix}.metadata.qualityGates[${j}].type`,
                    `must be one of ${[...VALID_GATE_TYPES].join(', ')}`,
                  ),
                );
              }
              if (g.enabled !== undefined && typeof g.enabled !== 'boolean') {
                errors.push(
                  errs(`${prefix}.metadata.qualityGates[${j}].enabled`, 'must be a boolean'),
                );
              }
              if (g.required !== undefined && typeof g.required !== 'boolean') {
                errors.push(
                  errs(`${prefix}.metadata.qualityGates[${j}].required`, 'must be a boolean'),
                );
              }
            }
          }
        }

        // gateStates validation
        const gateStates = meta.gateStates;
        if (gateStates !== undefined) {
          if (!Array.isArray(gateStates)) {
            errors.push(errs(`${prefix}.metadata.gateStates`, 'must be an array'));
          } else {
            for (let j = 0; j < gateStates.length; j++) {
              const gs = gateStates[j] as Record<string, unknown> | undefined;
              if (!gs || typeof gs !== 'object') {
                errors.push(errs(`${prefix}.metadata.gateStates[${j}]`, 'must be an object'));
                continue;
              }
              if (gs.type && !VALID_GATE_TYPES.has(gs.type as string)) {
                errors.push(
                  errs(
                    `${prefix}.metadata.gateStates[${j}].type`,
                    `must be one of ${[...VALID_GATE_TYPES].join(', ')}`,
                  ),
                );
              }
              if (gs.status && !VALID_GATE_STATUSES.has(gs.status as string)) {
                errors.push(
                  errs(
                    `${prefix}.metadata.gateStates[${j}].status`,
                    `must be one of ${[...VALID_GATE_STATUSES].join(', ')}`,
                  ),
                );
              }
            }
          }
        }

        // executionPhase validation
        if (
          meta.executionPhase !== undefined &&
          !VALID_EXECUTION_PHASES.has(meta.executionPhase as string)
        ) {
          errors.push(
            errs(
              `${prefix}.metadata.executionPhase`,
              `must be one of ${[...VALID_EXECUTION_PHASES].join(', ')}`,
            ),
          );
        }

        const activeFiles = meta.activeFiles;
        if (activeFiles !== undefined) {
          if (!Array.isArray(activeFiles)) {
            errors.push(errs(`${prefix}.metadata.activeFiles`, 'must be an array'));
          } else {
            for (let j = 0; j < activeFiles.length; j++) {
              if (typeof activeFiles[j] !== 'string' || !activeFiles[j]) {
                errors.push(errs(`${prefix}.metadata.activeFiles[${j}]`, 'required string'));
              }
            }
          }
        }

        const executionEvents = meta.executionEvents;
        if (executionEvents !== undefined) {
          if (!Array.isArray(executionEvents)) {
            errors.push(errs(`${prefix}.metadata.executionEvents`, 'must be an array'));
          } else {
            for (let j = 0; j < executionEvents.length; j++) {
              const event = executionEvents[j] as Record<string, unknown> | undefined;
              if (!event || typeof event !== 'object') {
                errors.push(errs(`${prefix}.metadata.executionEvents[${j}]`, 'must be an object'));
                continue;
              }
              if (
                typeof event.kind !== 'string' ||
                !VALID_EXECUTION_EVENT_KINDS.has(event.kind as string)
              ) {
                errors.push(
                  errs(
                    `${prefix}.metadata.executionEvents[${j}].kind`,
                    `must be one of ${[...VALID_EXECUTION_EVENT_KINDS].join(', ')}`,
                  ),
                );
              }
              if (typeof event.message !== 'string' || !event.message) {
                errors.push(
                  errs(`${prefix}.metadata.executionEvents[${j}].message`, 'required string'),
                );
              }
              if (typeof event.timestamp !== 'string' || !event.timestamp) {
                errors.push(
                  errs(`${prefix}.metadata.executionEvents[${j}].timestamp`, 'required string'),
                );
              }
              if (
                event.status !== undefined &&
                (typeof event.status !== 'string' ||
                  !VALID_EXECUTION_EVENT_STATUSES.has(event.status as string))
              ) {
                errors.push(
                  errs(
                    `${prefix}.metadata.executionEvents[${j}].status`,
                    `must be one of ${[...VALID_EXECUTION_EVENT_STATUSES].join(', ')}`,
                  ),
                );
              }
              if (event.files !== undefined) {
                if (!Array.isArray(event.files)) {
                  errors.push(
                    errs(`${prefix}.metadata.executionEvents[${j}].files`, 'must be an array'),
                  );
                } else {
                  for (let k = 0; k < event.files.length; k++) {
                    if (typeof event.files[k] !== 'string' || !event.files[k]) {
                      errors.push(
                        errs(
                          `${prefix}.metadata.executionEvents[${j}].files[${k}]`,
                          'required string',
                        ),
                      );
                    }
                  }
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
  const nodeIds = Array.isArray(nodes)
    ? new Set(
        nodes
          .map((n) => (n as Record<string, unknown> | undefined)?.id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0),
      )
    : new Set<string>();
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

  const executionFlow = canvasMeta?.executionFlow as Record<string, unknown> | undefined;
  if (executionFlow && typeof executionFlow === 'object') {
    if (!VALID_EXECUTION_FLOW_ORIENTATIONS.has(executionFlow.orientation as string)) {
      errors.push(
        errs(
          'canvas.metadata.executionFlow.orientation',
          `must be one of ${[...VALID_EXECUTION_FLOW_ORIENTATIONS].join(', ')}`,
        ),
      );
    }

    const stages = executionFlow.stages as Array<Record<string, unknown>> | undefined;
    const stageIds = new Set<string>();

    if (!Array.isArray(stages) || stages.length === 0) {
      errors.push(errs('canvas.metadata.executionFlow.stages', 'required non-empty array'));
    } else {
      for (let i = 0; i < stages.length; i++) {
        const stage = stages[i];
        const prefix = `canvas.metadata.executionFlow.stages[${i}]`;
        if (!stage || typeof stage !== 'object') {
          errors.push(errs(prefix, 'must be an object'));
          continue;
        }
        if (typeof stage.id !== 'string' || !stage.id) {
          errors.push(errs(`${prefix}.id`, 'required string'));
        } else if (stageIds.has(stage.id)) {
          errors.push(errs(`${prefix}.id`, `duplicate id "${stage.id}"`));
        } else {
          stageIds.add(stage.id);
        }

        if (typeof stage.name !== 'string' || !stage.name) {
          errors.push(errs(`${prefix}.name`, 'required string'));
        }

        if (!Array.isArray(stage.taskIds)) {
          errors.push(errs(`${prefix}.taskIds`, 'must be an array'));
        } else {
          for (let j = 0; j < stage.taskIds.length; j++) {
            const taskId = stage.taskIds[j];
            if (typeof taskId !== 'string' || !taskId) {
              errors.push(errs(`${prefix}.taskIds[${j}]`, 'required string'));
              continue;
            }
            if (!nodeIds.has(taskId)) {
              errors.push(errs(`${prefix}.taskIds[${j}]`, `references unknown node "${taskId}"`));
            }
          }
        }
      }
    }

    const stageRelations = executionFlow.stageRelations as Array<Record<string, unknown>> | undefined;
    if (stageRelations !== undefined) {
      if (!Array.isArray(stageRelations)) {
        errors.push(errs('canvas.metadata.executionFlow.stageRelations', 'must be an array'));
      } else {
        for (let i = 0; i < stageRelations.length; i++) {
          const rel = stageRelations[i];
          const prefix = `canvas.metadata.executionFlow.stageRelations[${i}]`;
          if (!rel || typeof rel !== 'object') {
            errors.push(errs(prefix, 'must be an object'));
            continue;
          }
          if (typeof rel.fromStageId !== 'string' || !rel.fromStageId) {
            errors.push(errs(`${prefix}.fromStageId`, 'required string'));
          } else if (!stageIds.has(rel.fromStageId)) {
            errors.push(
              errs(`${prefix}.fromStageId`, `references unknown stage "${rel.fromStageId}"`),
            );
          }
          if (typeof rel.toStageId !== 'string' || !rel.toStageId) {
            errors.push(errs(`${prefix}.toStageId`, 'required string'));
          } else if (!stageIds.has(rel.toStageId)) {
            errors.push(errs(`${prefix}.toStageId`, `references unknown stage "${rel.toStageId}"`));
          }
        }
      }
    }

    const taskRelations = executionFlow.taskRelations as Array<Record<string, unknown>> | undefined;
    if (taskRelations !== undefined) {
      if (!Array.isArray(taskRelations)) {
        errors.push(errs('canvas.metadata.executionFlow.taskRelations', 'must be an array'));
      } else {
        for (let i = 0; i < taskRelations.length; i++) {
          const rel = taskRelations[i];
          const prefix = `canvas.metadata.executionFlow.taskRelations[${i}]`;
          if (!rel || typeof rel !== 'object') {
            errors.push(errs(prefix, 'must be an object'));
            continue;
          }
          if (typeof rel.fromTaskId !== 'string' || !rel.fromTaskId) {
            errors.push(errs(`${prefix}.fromTaskId`, 'required string'));
          } else if (!nodeIds.has(rel.fromTaskId)) {
            errors.push(errs(`${prefix}.fromTaskId`, `references unknown node "${rel.fromTaskId}"`));
          }
          if (typeof rel.toTaskId !== 'string' || !rel.toTaskId) {
            errors.push(errs(`${prefix}.toTaskId`, 'required string'));
          } else if (!nodeIds.has(rel.toTaskId)) {
            errors.push(errs(`${prefix}.toTaskId`, `references unknown node "${rel.toTaskId}"`));
          }
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
