// src/server.ts
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, watch } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { createStateMiddleware } from "@supermech/runtime";
function findWebDist() {
  const dirname = import.meta.dirname ?? fileURLToPath(new URL(".", import.meta.url));
  const dev = resolve(dirname, "../../../apps/web/dist");
  if (existsSync(join(dev, "index.html"))) return dev;
  const local = resolve(dirname, "../web");
  return local;
}
async function startServer(options = {}) {
  const port = options.port ?? 4388;
  const cwd = options.cwd ?? process.cwd();
  const baseDir = resolve(cwd, options.baseDir ?? "docs/supermech");
  if (!existsSync(baseDir)) mkdirSync(baseDir, { recursive: true });
  const app = express();
  const sseClients = /* @__PURE__ */ new Set();
  let currentPlan = "default";
  let currentSkill = "brainstorming";
  let planDir = join(baseDir, currentPlan);
  let statePath = join(baseDir, currentPlan, "state-brainstorming.json");
  function ensurePlanDir() {
    if (!existsSync(planDir)) mkdirSync(planDir, { recursive: true });
  }
  function readState() {
    try {
      ensurePlanDir();
      if (!existsSync(statePath)) return createDefaultState(currentSkill);
      return JSON.parse(readFileSync(statePath, "utf-8"));
    } catch {
      return createDefaultState(currentSkill);
    }
  }
  function writeStateInternal(data) {
    ensurePlanDir();
    writeFileSync(statePath, JSON.stringify(data, null, 2));
  }
  function createDefaultState(skill) {
    return {
      meta: { projectName: "My Project", sessionId: skill, activeSkill: null, agentStatus: "idle" },
      canvas: { skillType: skill, nodes: [], edges: [] },
      feedback: [],
      ui: { theme: "system", leftSidebarOpen: true, rightSidebarOpen: true, selectedNodeId: null }
    };
  }
  function notifySSE() {
    for (const client of sseClients) {
      client.write("data: update\n\n");
    }
  }
  let fileWatcher = null;
  function startWatching(path) {
    if (fileWatcher) fileWatcher.close();
    if (existsSync(path)) {
      fileWatcher = watch(path, () => {
        notifySSE();
      });
    }
  }
  function switchSkill(skill) {
    currentSkill = skill;
    statePath = join(baseDir, currentPlan, `state-${skill}.json`);
    ensurePlanDir();
    if (!existsSync(statePath)) writeStateInternal(createDefaultState(skill));
    startWatching(statePath);
  }
  function switchPlan(plan) {
    currentPlan = plan;
    currentSkill = "brainstorming";
    planDir = join(baseDir, plan);
    statePath = join(baseDir, plan, "state-brainstorming.json");
    ensurePlanDir();
    if (!existsSync(statePath)) writeStateInternal(createDefaultState("brainstorming"));
    startWatching(statePath);
  }
  ensurePlanDir();
  if (!existsSync(statePath)) writeStateInternal(createDefaultState(currentSkill));
  startWatching(statePath);
  app.get("/__state/events", (req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    });
    sseClients.add(res);
    res.write("data: connected\n\n");
    req.on("close", () => sseClients.delete(res));
  });
  app.use("/__state", createStateMiddleware({
    baseDir,
    statePath,
    planDir,
    currentPlan,
    currentSkill,
    state: readState,
    writeState: writeStateInternal,
    listPlans: () => {
      try {
        return readdirSync(baseDir, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith(".")).map((d) => d.name);
      } catch {
        return [];
      }
    },
    listSkills: () => {
      try {
        return readdirSync(planDir).filter((f) => /^state-.+\.json$/.test(f)).map((f) => f.replace(/^state-(.+)\.json$/, "$1"));
      } catch {
        return [];
      }
    },
    createPlan: (plan) => {
      const dir = join(baseDir, plan);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    },
    switchSkill,
    switchPlan,
    validate: (s) => {
      return { valid: true, errors: [] };
    }
  }));
  const webDist = findWebDist();
  app.use(express.static(webDist));
  app.use((req, res, next) => {
    if (req.path.startsWith("/__state")) return next();
    if (req.path.includes(".") && !req.path.endsWith(".html")) return next();
    res.sendFile(join(webDist, "index.html"));
  });
  const httpServer = await new Promise((resolve2) => {
    const s = app.listen(port, "127.0.0.1", () => resolve2(s));
  });
  return {
    url: `http://localhost:${port}`,
    port,
    close: () => {
      if (fileWatcher) fileWatcher.close();
      httpServer.close();
    }
  };
}
export {
  startServer
};
