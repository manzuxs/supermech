// src/server.ts
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, watch } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";

// ../watcher/src/vite-plugin.ts
var VIRTUAL_MODULE_ID = "virtual:supermech/state";
var RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`;

// ../watcher/src/middleware.ts
function sendJSON(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}
function parseBody(req) {
  return new Promise((resolve2) => {
    let body = "";
    req.on("data", (chunk) => body += chunk);
    req.on("end", () => {
      try {
        resolve2(JSON.parse(body));
      } catch {
        resolve2(null);
      }
    });
  });
}
function createStateMiddleware(cfg) {
  return async (req, res, next) => {
    const url = req.url ?? "";
    try {
      if (url.startsWith("/plans")) {
        const sub = url.replace("/plans", "") || "/";
        if (sub === "/" && req.method === "GET") {
          const plans = cfg.listPlans();
          const skills = cfg.listSkills();
          sendJSON(res, 200, {
            plans,
            current: cfg.currentPlan,
            skills,
            currentSkill: cfg.currentSkill
          });
          return;
        }
        if (sub === "/switch" && req.method === "POST") {
          const data2 = await parseBody(req);
          if (!data2.plan) {
            sendJSON(res, 400, { ok: false, error: "plan required" });
            return;
          }
          cfg.switchPlan(data2.plan);
          const skills = cfg.listSkills();
          sendJSON(res, 200, {
            ok: true,
            plan: data2.plan,
            skills,
            currentSkill: cfg.currentSkill,
            state: cfg.state()
          });
          return;
        }
        if (sub === "/create" && req.method === "POST") {
          const data2 = await parseBody(req);
          if (!data2.plan) {
            sendJSON(res, 400, { ok: false, error: "plan required" });
            return;
          }
          cfg.createPlan(data2.plan);
          sendJSON(res, 200, { ok: true });
          return;
        }
        sendJSON(res, 404, { ok: false, error: "plan endpoint not found" });
        return;
      }
      if (url.startsWith("/skills")) {
        const sub = url.replace("/skills", "") || "/";
        if (sub === "/" && req.method === "GET") {
          const skills = cfg.listSkills();
          sendJSON(res, 200, { skills, current: cfg.currentSkill });
          return;
        }
        if (sub === "/switch" && req.method === "POST") {
          const data2 = await parseBody(req);
          if (!data2.skill) {
            sendJSON(res, 400, { ok: false, error: "skill required" });
            return;
          }
          cfg.switchSkill(data2.skill);
          sendJSON(res, 200, { ok: true, skill: data2.skill, state: cfg.state() });
          return;
        }
        sendJSON(res, 404, { ok: false, error: "skill endpoint not found" });
        return;
      }
      if (req.method === "GET") {
        sendJSON(res, 200, cfg.state());
        return;
      }
      if (req.method !== "POST" && req.method !== "PATCH") {
        next();
        return;
      }
      const data = await parseBody(req);
      const s = cfg.state();
      if (url === "/select" && req.method === "POST") {
        s.ui.selectedNodeId = data.nodeId ?? null;
      } else if (url === "/ui" && req.method === "PATCH") {
        Object.assign(s.ui, data);
      } else if (url === "/feedback" && req.method === "POST") {
        s.feedback.push({
          id: crypto.randomUUID(),
          nodeId: data.nodeId,
          text: data.text,
          rating: data.rating ?? void 0,
          section: data.section ?? null,
          stepIndex: data.stepIndex ?? null,
          quickAction: data.quickAction ?? null,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      } else if (url === "/node" && req.method === "PATCH") {
        const idx = s.canvas.nodes.findIndex((n) => n.id === data.id);
        if (idx === -1) {
          sendJSON(res, 404, { ok: false, error: `node ${data.id} not found` });
          return;
        }
        Object.assign(s.canvas.nodes[idx], data);
      } else if (url === "/node/gate-state" && req.method === "PATCH") {
        const { nodeId, type, status, result } = data;
        if (!nodeId || !type || !status) {
          sendJSON(res, 400, { ok: false, error: "nodeId, type, status required" });
          return;
        }
        const node = s.canvas.nodes.find((n) => n.id === nodeId);
        if (!node) {
          sendJSON(res, 404, { ok: false, error: `node ${nodeId} not found` });
          return;
        }
        const meta = node.metadata ?? {};
        const gateStates = meta.gateStates ?? [];
        const existing = gateStates.find((g) => g.type === type);
        if (existing) {
          existing.status = status;
          if (result !== void 0) existing.result = result;
          existing.attemptedAt = (/* @__PURE__ */ new Date()).toISOString();
        } else {
          gateStates.push({ type, status, result, attemptedAt: (/* @__PURE__ */ new Date()).toISOString() });
        }
        meta.gateStates = gateStates;
      } else if (url === "/node/execution-phase" && req.method === "PATCH") {
        const { nodeId, phase } = data;
        if (!nodeId || !phase) {
          sendJSON(res, 400, { ok: false, error: "nodeId, phase required" });
          return;
        }
        const node = s.canvas.nodes.find((n) => n.id === nodeId);
        if (!node) {
          sendJSON(res, 404, { ok: false, error: `node ${nodeId} not found` });
          return;
        }
        const meta = node.metadata ?? {};
        meta.executionPhase = phase;
      } else if (url === "/replan" && req.method === "POST") {
        const { nodeId } = data;
        if (!nodeId) {
          sendJSON(res, 400, { ok: false, error: "nodeId required" });
          return;
        }
        const node = s.canvas.nodes.find((n) => n.id === nodeId);
        if (!node) {
          sendJSON(res, 404, { ok: false, error: `node ${nodeId} not found` });
          return;
        }
        node.status = "pending";
        node.progress = 0;
        const meta = node.metadata ?? {};
        meta.executionPhase = "idle";
        meta.gateStates = [];
        s.feedback.push({
          id: crypto.randomUUID(),
          nodeId,
          text: "User requested re-plan. Please review and re-execute this task.",
          rating: null,
          section: null,
          stepIndex: null,
          quickAction: "replan",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      } else {
        sendJSON(res, 404, { ok: false, error: "not found" });
        return;
      }
      const { valid, errors: validationErrors } = cfg.validate(s);
      if (!valid) {
        console.error("[supermech] state validation failed:", validationErrors.join("; "));
        s.meta.agentStatus = "error";
        s.feedback.push({
          id: crypto.randomUUID(),
          nodeId: "__global__",
          text: `State validation error: ${validationErrors.join("; ")}`,
          section: null,
          stepIndex: null,
          quickAction: null,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      cfg.writeState(s);
      sendJSON(res, 200, s);
    } catch (err) {
      sendJSON(res, 400, { ok: false, error: String(err) });
    }
  };
}

// src/server.ts
function findWebDist() {
  const dirname = import.meta.dirname ?? fileURLToPath(new URL(".", import.meta.url));
  const dev = resolve(dirname, "../../../apps/web/dist");
  if (existsSync(join(dev, "index.html"))) return dev;
  const local = resolve(dirname, "../web");
  return local;
}
function stateFilePath(baseDir, plan, skill) {
  return plan ? join(baseDir, plan, `state-${skill}.json`) : join(baseDir, `state-${skill}.json`);
}
function planDirectory(baseDir, plan) {
  return join(baseDir, plan);
}
async function startServer(options = {}) {
  const port = options.port ?? 4388;
  const cwd = options.cwd ?? process.cwd();
  const baseDir = resolve(cwd, options.baseDir ?? ".supermech");
  if (!existsSync(baseDir)) mkdirSync(baseDir, { recursive: true });
  const app = express();
  const sseClients = /* @__PURE__ */ new Set();
  let currentPlan = null;
  let currentSkill = "brainstorming";
  let planDir = baseDir;
  let statePath = stateFilePath(baseDir, null, currentSkill);
  function ensureDir3(path) {
    if (!existsSync(path)) mkdirSync(path, { recursive: true });
  }
  function readState2() {
    try {
      ensureDir3(planDir);
      if (!existsSync(statePath)) return createDefaultState(currentSkill);
      return JSON.parse(readFileSync(statePath, "utf-8"));
    } catch {
      return createDefaultState(currentSkill);
    }
  }
  function writeStateInternal(data) {
    ensureDir3(planDir);
    writeFileSync(statePath, JSON.stringify(data, null, 2));
  }
  function createDefaultState(skill) {
    return {
      meta: { projectName: "My Project", sessionId: skill, activeSkill: skill, agentStatus: "idle" },
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
    statePath = stateFilePath(baseDir, currentPlan, skill);
    ensureDir3(planDir);
    if (!existsSync(statePath)) writeStateInternal(createDefaultState(skill));
    startWatching(statePath);
  }
  function switchPlan(plan) {
    currentPlan = plan;
    currentSkill = "brainstorming";
    planDir = planDirectory(baseDir, plan);
    statePath = stateFilePath(baseDir, plan, "brainstorming");
    ensureDir3(planDir);
    if (!existsSync(statePath)) writeStateInternal(createDefaultState("brainstorming"));
    startWatching(statePath);
  }
  ensureDir3(planDir);
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
    currentPlan: currentPlan ?? "default",
    currentSkill,
    state: readState2,
    writeState: writeStateInternal,
    listPlans: () => {
      try {
        return readdirSync(baseDir, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith(".") && d.name !== "skills").map((d) => d.name);
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
      ensureDir3(planDirectory(baseDir, plan));
    },
    switchSkill,
    switchPlan,
    validate: () => ({ valid: true, errors: [] })
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
