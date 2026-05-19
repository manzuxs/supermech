import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, watch } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ServerResponse } from 'node:http';
import express from 'express';
import { createStateMiddleware, validateState } from '@supermech/runtime';
import { createDefaultWorkbenchState } from '@supermech/schema';

function findWebDist(): string {
  const dirname = import.meta.dirname ?? fileURLToPath(new URL('.', import.meta.url));
  const dev = resolve(dirname, '../../../apps/web/dist');
  if (existsSync(join(dev, 'index.html'))) return dev;
  const local = resolve(dirname, '../web');
  return local;
}

export interface ServerOptions {
  port?: number;
  cwd?: string;
  baseDir?: string;
  noOpen?: boolean;
}

function stateFilePath(baseDir: string, plan: string | null, skill: string): string {
  return plan ? join(baseDir, plan, `state-${skill}.json`) : join(baseDir, `state-${skill}.json`);
}

/** Detect plan directories under baseDir. Excludes skills/ and dot-directories. */
function detectPlans(baseDir: string): string[] {
  try {
    return readdirSync(baseDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('.') && d.name !== 'skills')
      .map((d) => d.name)
      .sort((a, b) => {
        // Sort by modification time, newest first
        const aStat = statSync(join(baseDir, a));
        const bStat = statSync(join(baseDir, b));
        return bStat.mtimeMs - aStat.mtimeMs;
      });
  } catch {
    return [];
  }
}

export async function startServer(options: ServerOptions = {}) {
  const port = options.port ?? 4388;
  const cwd = options.cwd ?? process.cwd();
  const baseDir = resolve(cwd, options.baseDir ?? '.supermech');

  if (!existsSync(baseDir)) mkdirSync(baseDir, { recursive: true });

  const app = express();
  const sseClients = new Set<ServerResponse>();

  // Detect plans from .supermech/ subdirectories
  const plans = detectPlans(baseDir);
  // Default to the most recently modified plan, or null if none
  let currentPlan: string | null = plans[0] ?? null;
  let currentSkill = 'brainstorming';
  let planDir = currentPlan ? join(baseDir, currentPlan) : baseDir;
  let statePath = stateFilePath(baseDir, currentPlan, currentSkill);

  function ensureDir(path: string) {
    if (!existsSync(path)) mkdirSync(path, { recursive: true });
  }

  function refreshPlans(): string[] {
    return detectPlans(baseDir);
  }

  function readState(): Record<string, unknown> {
    try {
      ensureDir(planDir);
      if (!existsSync(statePath)) return createDefaultState(currentSkill);
      return JSON.parse(readFileSync(statePath, 'utf-8'));
    } catch {
      return createDefaultState(currentSkill);
    }
  }

  function writeStateInternal(data: unknown) {
    ensureDir(planDir);
    writeFileSync(statePath, JSON.stringify(data, null, 2));
  }

  function createDefaultState(skill: string): Record<string, unknown> {
    const typedSkill = skill as 'brainstorming' | 'writing-plans' | 'executing-plans';
    return createDefaultWorkbenchState({
      projectName: currentPlan ?? 'My Project',
      sessionId: skill,
      activeSkill: typedSkill,
      skillType: typedSkill,
    }) as unknown as Record<string, unknown>;
  }

  function notifySSE() {
    for (const client of sseClients) {
      client.write('data: update\n\n');
    }
  }

  let fileWatcher: ReturnType<typeof watch> | null = null;
  function startWatching(path: string) {
    if (fileWatcher) fileWatcher.close();
    if (existsSync(path)) {
      fileWatcher = watch(path, () => notifySSE());
    }
  }

  function switchSkill(skill: string) {
    currentSkill = skill;
    statePath = stateFilePath(baseDir, currentPlan, skill);
    ensureDir(planDir);
    if (!existsSync(statePath)) writeStateInternal(createDefaultState(skill));
    startWatching(statePath);
  }

  function switchPlan(plan: string) {
    currentPlan = plan;
    currentSkill = 'brainstorming';
    planDir = join(baseDir, plan);
    statePath = stateFilePath(baseDir, plan, 'brainstorming');
    ensureDir(planDir);
    if (!existsSync(statePath)) writeStateInternal(createDefaultState('brainstorming'));
    startWatching(statePath);
  }

  if (currentPlan) {
    ensureDir(planDir);
    if (!existsSync(statePath)) writeStateInternal(createDefaultState(currentSkill));
    startWatching(statePath);
  }

  // SSE endpoint
  app.get('/__state/events', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    sseClients.add(res);
    res.write('data: connected\n\n');
    req.on('close', () => sseClients.delete(res));
  });

  // State middleware
  app.use('/__state', createStateMiddleware({
    baseDir,
    statePath,
    planDir,
    currentPlan: currentPlan ?? '',
    currentSkill,
    state: readState,
    writeState: writeStateInternal,
    listPlans: () => refreshPlans(),
    listSkills: () => {
      try {
        return readdirSync(planDir)
          .filter((f) => /^state-.+\.json$/.test(f))
          .map((f) => f.replace(/^state-(.+)\.json$/, '$1'));
      } catch {
        return [];
      }
    },
    createPlan: (plan: string) => {
      ensureDir(join(baseDir, plan));
    },
    switchSkill,
    switchPlan,
    validate: validateState,
  }));

  // Serve static files
  const webDist = findWebDist();
  app.use(express.static(webDist));

  // SPA fallback
  app.use((req, res, next) => {
    if (req.path.startsWith('/__state')) return next();
    if (req.path.includes('.') && !req.path.endsWith('.html')) return next();
    res.sendFile(join(webDist, 'index.html'));
  });

  const httpServer = await new Promise<any>((resolve) => {
    const s = app.listen(port, '127.0.0.1', () => resolve(s));
  });

  return {
    url: `http://localhost:${port}`,
    port,
    close: () => {
      if (fileWatcher) fileWatcher.close();
      httpServer.close();
    },
  };
}
