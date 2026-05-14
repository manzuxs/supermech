import type { LucideIcon } from 'lucide-react';
import {
  CheckCircle2,
  Circle,
  Crosshair,
  Minus,
  PlayCircle,
  Plus,
  Star,
  XCircle,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CanvasEdge, CanvasNode, NodeStatus } from 'schemas';
import { useWorkbench } from '../../context/WorkbenchContext.tsx';

// ─── Constants ───

const NODE_W = 260;
const NODE_H = 150;
const H_GAP = 56;
const V_GAP = 160;
const PAD = 60;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.5;
const VIEWPORT_PAD_X = 48;
const VIEWPORT_PAD_Y = 40;

// ─── Types ───

interface FileInfo {
  path: string;
  type: string;
  description?: string;
}

interface DagNode {
  id: string;
  label: string;
  status: NodeStatus;
  goal: string;
  progress: number;
  level: number;
  x: number;
  y: number;
  files: FileInfo[];
  stepCount: number;
  rating: number;
  phase: string;
  phaseIndex: number;
}

interface EdgePath {
  from: { x: number; y: number };
  to: { x: number; y: number };
  label?: string;
}

// ─── Linear Status Config ───

const LINEAR_COLORS = {
  primary: '#5e6ad2',
  primaryHover: '#828fff',
  amber: '#d97706',
  success: '#27a644',
  destructive: '#ef4444',
  surface1: '#0f1011',
  surface2: '#141516',
  hairline: '#23252a',
  muted: '#8a8f98',
  foreground: '#f7f8f8',
} as const;

const STATUS_CONFIG: Record<NodeStatus, { border: string; accent: string; icon: LucideIcon }> = {
  pending: { border: LINEAR_COLORS.hairline, accent: LINEAR_COLORS.muted, icon: Circle },
  active: { border: LINEAR_COLORS.amber, accent: LINEAR_COLORS.amber, icon: PlayCircle },
  accepted: { border: LINEAR_COLORS.success, accent: LINEAR_COLORS.success, icon: CheckCircle2 },
  rejected: { border: LINEAR_COLORS.hairline, accent: LINEAR_COLORS.muted, icon: XCircle },
  done: { border: LINEAR_COLORS.primary, accent: LINEAR_COLORS.primary, icon: CheckCircle2 },
};

// ─── Phase Color Palette (for left strip) ───

const PHASE_COLORS = [
  '#5e6ad2', // primary lavender
  '#828fff', // primary hover
  '#7a7fad', // brand secure
  '#d97706', // amber
  '#27a644', // success
  '#8a8f98', // muted
] as const;

// ─── DAG Layout ───

function getPlanPhases(nodes: CanvasNode[], edges: CanvasEdge[]): string[] {
  // Extract unique phases from nodes in dependency order
  const phaseOrder: string[] = [];
  const seen = new Set<string>();
  // Topological-ish: collect phases in order of first appearance by DAG level
  const inEdges = new Map<string, string[]>();
  for (const n of nodes) inEdges.set(n.id, []);
  for (const e of edges) {
    inEdges.get(e.to)?.push(e.from);
  }
  // Sort by dependency depth
  const depth = new Map<string, number>();
  function dfs(id: string): number {
    if (depth.has(id)) return depth.get(id) ?? 0;
    const deps = inEdges.get(id) ?? [];
    const d = deps.length === 0 ? 0 : Math.max(...deps.map(dfs)) + 1;
    depth.set(id, d);
    return d;
  }
  for (const n of nodes) dfs(n.id);
  const sorted = [...nodes].sort((a, b) => (depth.get(a.id) ?? 0) - (depth.get(b.id) ?? 0));
  for (const n of sorted) {
    const phase = typeof n.metadata?.phase === 'string' ? n.metadata.phase : '';
    if (phase && !seen.has(phase)) {
      seen.add(phase);
      phaseOrder.push(phase);
    }
  }
  return phaseOrder;
}

function buildDagLayout(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  feedback: { nodeId: string; rating: number }[],
): { dagNodes: DagNode[]; paths: EdgePath[]; phaseOrder: string[]; activePhase: string } {
  if (nodes.length === 0) return { dagNodes: [], paths: [], phaseOrder: [], activePhase: '' };

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const inEdges = new Map<string, string[]>();
  const outEdges = new Map<string, string[]>();
  for (const n of nodes) {
    inEdges.set(n.id, []);
    outEdges.set(n.id, []);
  }
  for (const e of edges) {
    if (!nodeMap.has(e.from) || !nodeMap.has(e.to)) continue;
    inEdges.get(e.to)?.push(e.from);
    outEdges.get(e.from)?.push(e.to);
  }

  // Topological sort — longest-path layering
  const level = new Map<string, number>();
  const visited = new Set<string>();
  function dfs(id: string): number {
    if (visited.has(id)) return level.get(id) ?? 0;
    visited.add(id);
    const inE = inEdges.get(id) ?? [];
    const lvl = inE.length === 0 ? 0 : Math.max(...inE.map(dfs)) + 1;
    level.set(id, lvl);
    return lvl;
  }
  for (const n of nodes) dfs(n.id);

  // Phase ordering
  const phaseOrder = getPlanPhases(nodes, edges);

  // Determine active phase: the phase containing the first non-done task
  let activePhase = phaseOrder[phaseOrder.length - 1] || '';
  for (const p of phaseOrder) {
    const phaseTasks = nodes.filter((n) => {
      const phase = typeof n.metadata?.phase === 'string' ? n.metadata.phase : '';
      return phase === p;
    });
    const allDone = phaseTasks.length > 0 && phaseTasks.every((n) => n.status === 'done');
    if (!allDone) {
      activePhase = p;
      break;
    }
  }

  // Build rating map
  const ratingMap = new Map<string, number>();
  for (const fb of feedback) {
    if (fb.rating != null) {
      const existing = ratingMap.get(fb.nodeId) ?? 0;
      ratingMap.set(fb.nodeId, Math.max(existing, fb.rating));
    }
  }

  const byLevel = new Map<number, DagNode[]>();
  for (const n of nodes) {
    const lvl = level.get(n.id) ?? 0;
    if (!byLevel.has(lvl)) byLevel.set(lvl, []);
    const meta = n.metadata ?? {};
    const files = (meta.files as FileInfo[]) || [];
    const steps = (meta.implementationSteps as Array<unknown>) || [];

    // Try to get files from implementationSteps if not present (some agents put file paths in steps)
    const phase = (meta.phase as string) || '';
    const phaseIndex = phase ? phaseOrder.indexOf(phase) : -1;

    const levelNodes = byLevel.get(lvl);
    if (!levelNodes) continue;
    levelNodes.push({
      id: n.id,
      label: n.label,
      status: n.status,
      goal: (meta.goal as string) || '',
      progress: n.progress,
      level: lvl,
      x: 0,
      y: 0,
      files,
      stepCount: steps.length,
      rating: ratingMap.get(n.id) ?? 0,
      phase,
      phaseIndex: phaseIndex >= 0 ? phaseIndex : phaseOrder.length,
    });
  }

  // Position nodes
  const sortedLevels = [...byLevel.entries()].sort(([a], [b]) => a - b);
  let maxLevelW = 0;
  for (const [, items] of sortedLevels) {
    const totalW = items.length * NODE_W + (items.length - 1) * H_GAP;
    if (totalW > maxLevelW) maxLevelW = totalW;
  }
  maxLevelW = Math.max(maxLevelW, 400);

  const dagNodes: DagNode[] = [];
  for (const [lvl, items] of sortedLevels) {
    const totalW = items.length * NODE_W + (items.length - 1) * H_GAP;
    let startX = PAD + (maxLevelW - totalW) / 2;
    for (const item of items) {
      item.x = startX + NODE_W / 2;
      item.y = PAD + lvl * V_GAP;
      dagNodes.push(item);
      startX += NODE_W + H_GAP;
    }
  }

  // Edge paths
  const dagPos = new Map(dagNodes.map((n) => [n.id, { x: n.x, y: n.y }]));
  const paths: EdgePath[] = [];
  for (const e of edges) {
    const from = dagPos.get(e.from);
    const to = dagPos.get(e.to);
    if (!from || !to) continue;
    paths.push({ from, to, label: e.label });
  }

  return { dagNodes, paths, phaseOrder, activePhase };
}

function getBounds(dagNodes: DagNode[]) {
  if (dagNodes.length === 0)
    return { minX: 0, minY: 0, maxX: 800, maxY: 600, width: 800, height: 600 };
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (const n of dagNodes) {
    const l = n.x - NODE_W / 2;
    const r = n.x + NODE_W / 2;
    const t = n.y - NODE_H / 2;
    const b = n.y + NODE_H / 2;
    if (l < minX) minX = l;
    if (r > maxX) maxX = r;
    if (t < minY) minY = t;
    if (b > maxY) maxY = b;
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

function arrowPath(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const x1 = from.x;
  const y1 = from.y + NODE_H / 2;
  const x2 = to.x;
  const y2 = to.y - NODE_H / 2;
  if (Math.abs(y2 - y1) < 10) {
    const cx = (x1 + x2) / 2;
    return `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
  }
  const cy = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`;
}

// ─── File Badge ───

const FILE_BADGE_COLORS: Record<string, string> = {
  create: 'bg-[#5e6ad2]/10 text-[#5e6ad2]',
  modify: 'bg-[#d97706]/10 text-[#d97706]',
  test: 'bg-[#27a644]/10 text-[#27a644]',
  delete: 'bg-[#8a8f98]/10 text-[#8a8f98]',
};

function FileBadge({ file }: { file: FileInfo }) {
  const colorClass =
    FILE_BADGE_COLORS[file.type] ?? 'bg-[var(--border)]/30 text-[var(--muted-foreground)]';
  const shortPath = file.path.length > 22 ? `${file.path.slice(0, 20)}…` : file.path;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-[2px] text-[9px] font-mono leading-tight ${colorClass}`}
      title={file.path}
    >
      <span className="font-bold uppercase opacity-70">{file.type}</span>
      <span className="opacity-80">{shortPath}</span>
    </span>
  );
}

// ─── Rating Stars ───

function RatingStars({ rating, size = 12 }: { rating: number; size?: number }) {
  if (rating === 0) return null;
  return (
    <span className="inline-flex items-center gap-[1px]">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          fill={star <= rating ? '#d97706' : 'none'}
          stroke={star <= rating ? '#d97706' : '#23252a'}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}

// ─── Component ───

interface FlowchartCanvasProps {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

export default function FlowchartCanvas({ nodes, edges }: FlowchartCanvasProps) {
  const { t } = useTranslation();
  const { state, updateUI } = useWorkbench();

  const feedbackRatings = state.feedback
    .filter((f): f is typeof f & { rating: number } => f.rating != null)
    .map((f) => ({ nodeId: f.nodeId, rating: f.rating }));

  const { dagNodes, paths, phaseOrder, activePhase } = buildDagLayout(
    nodes,
    edges,
    feedbackRatings,
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const layoutSig = dagNodes.map((n) => `${n.id}:${n.level}`).join('|');

  function fitToView(forceK?: number) {
    const el = containerRef.current;
    if (!el || dagNodes.length === 0) return;
    const rect = el.getBoundingClientRect();
    const bounds = getBounds(dagNodes);

    let nextK = forceK;
    if (nextK === undefined) {
      const aw = Math.max(rect.width - VIEWPORT_PAD_X * 2, 1);
      const ah = Math.max(rect.height - VIEWPORT_PAD_Y * 2, 1);
      nextK = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, Math.min(aw / bounds.width, ah / bounds.height)),
      );
    }

    setTransform({
      x: (rect.width - bounds.width * nextK) / 2 - bounds.minX * nextK,
      y: (rect.height - bounds.height * nextK) / 2 - bounds.minY * nextK,
      k: nextK,
    });
  }

  function scaleAtPoint(anchorX: number, anchorY: number, nextK: number) {
    setTransform((prev) => {
      const clampedK = Math.min(Math.max(nextK, MIN_ZOOM), MAX_ZOOM);
      const dx = (anchorX - prev.x) / prev.k;
      const dy = (anchorY - prev.y) / prev.k;
      return { x: anchorX - dx * clampedK, y: anchorY - dy * clampedK, k: clampedK };
    });
  }

  function stepZoom(dir: 'in' | 'out') {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const factor = dir === 'in' ? 1.15 : 1 / 1.15;
    scaleAtPoint(rect.width / 2, rect.height / 2, transform.k * factor);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fitToView(1);
  }, [layoutSig]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleWheelRaw = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const delta = -e.deltaY;
        const factor = 1.1 ** (delta / 100);
        const rect = el.getBoundingClientRect();
        scaleAtPoint(e.clientX - rect.left, e.clientY - rect.top, transform.k * factor);
      } else {
        setTransform((prev) => ({ ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
      }
    };
    el.addEventListener('wheel', handleWheelRaw, { passive: false });
    return () => el.removeEventListener('wheel', handleWheelRaw);
  }, [transform.k]);

  const selectedId = state.ui.selectedNodeId;

  if (dagNodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-[var(--text-main)] opacity-50">
        {t('editor.emptyTasks')}
      </div>
    );
  }

  // ── Mouse handling ──

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('[data-card]')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setTransform((prev) => ({ ...prev, x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }));
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleBgClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    if ((e.target as HTMLElement).closest('[data-card]')) return;
    updateUI({ selectedNodeId: null, rightSidebarOpen: false });
  };

  // ── Render ──

  return (
    <div
      ref={containerRef}
      className={`canvas-dot-grid relative h-full w-full overflow-hidden select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleBgClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleBgClick(e);
      }}
      style={{
        backgroundPosition: `${transform.x}px ${transform.y}px`,
        backgroundSize: `${24 * transform.k}px ${24 * transform.k}px`,
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,var(--bg-main)_0%,transparent_44%)] opacity-28" />

      <svg width="100%" height="100%" style={{ display: 'block', overflow: 'hidden' }}>
        <defs>
          <marker
            id="fc-arrowhead"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--border)" />
          </marker>
        </defs>

        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
          {/* Edges */}
          {paths.map((p) => (
            <path
              key={`${p.from.x}-${p.from.y}-${p.to.x}-${p.to.y}`}
              d={arrowPath(p.from, p.to)}
              fill="none"
              stroke="var(--border)"
              strokeWidth={1.5}
              markerEnd="url(#fc-arrowhead)"
              opacity={0.5}
            />
          ))}

          {/* Edges: label (only show when zoomed in enough) */}
          {paths
            .filter((p) => p.label && transform.k > 0.6)
            .map((p) => (
              <text
                key={`elbl-${p.from.x}-${p.from.y}-${p.to.x}-${p.to.y}`}
                x={(p.from.x + p.to.x) / 2}
                y={(p.from.y + p.to.y) / 2 - 8}
                textAnchor="middle"
                fill="var(--muted-foreground)"
                fontSize={9}
                fontFamily="Inter, sans-serif"
                opacity={0.6}
              >
                {p.label}
              </text>
            ))}

          {/* Nodes */}
          {dagNodes.map((n) => {
            const config = STATUS_CONFIG[n.status];
            const isSelected = n.id === selectedId;
            const isActive = n.status === 'active';
            const isRejected = n.status === 'rejected';
            const isDone = n.status === 'done';
            const StatusIcon = config.icon;
            const phaseColor =
              n.phaseIndex >= 0 && n.phaseIndex < PHASE_COLORS.length
                ? PHASE_COLORS[n.phaseIndex]
                : LINEAR_COLORS.muted;
            const isFuturePhase =
              n.phase &&
              activePhase &&
              n.phase !== activePhase &&
              phaseOrder.indexOf(n.phase) > phaseOrder.indexOf(activePhase);
            const opacityVal = isFuturePhase && !isActive ? 0.4 : 1;

            return (
              <g
                key={n.id}
                data-card
                onClick={(e) => {
                  e.stopPropagation();
                  updateUI({ selectedNodeId: n.id, rightSidebarOpen: true });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.stopPropagation();
                    updateUI({ selectedNodeId: n.id, rightSidebarOpen: true });
                  }
                }}
                className="group cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-2 rounded-lg"
                role="button"
                tabIndex={0}
              >
                {/* Selection glow */}
                {isSelected && (
                  <rect
                    x={n.x - NODE_W / 2 - 5}
                    y={n.y - NODE_H / 2 - 5}
                    width={NODE_W + 10}
                    height={NODE_H + 10}
                    rx={14}
                    ry={14}
                    fill="color-mix(in srgb, var(--primary) 10%, transparent)"
                  />
                )}

                {/* Card body */}
                <rect
                  x={n.x - NODE_W / 2}
                  y={n.y - NODE_H / 2}
                  width={NODE_W}
                  height={NODE_H}
                  rx={10}
                  ry={10}
                  fill={isActive ? 'var(--surface-2)' : 'var(--surface-1)'}
                  stroke={isSelected ? '#5e6ad2' : isActive ? '#d97706' : config.border}
                  strokeWidth={isSelected ? 2 : isActive ? 1.5 : 1}
                  className={
                    isActive
                      ? 'processing-node'
                      : 'transition-colors duration-200 group-hover:stroke-[#5e6ad2]/40'
                  }
                  filter="drop-shadow(0 2px 4px rgb(0 0 0 / 0.06))"
                  opacity={opacityVal}
                />

                {/* Phase color strip (left edge) */}
                {n.phase && (
                  <rect
                    x={n.x - NODE_W / 2 + 0}
                    y={n.y - NODE_H / 2 + 0}
                    width={4}
                    height={NODE_H}
                    rx={0}
                    ry={0}
                    fill={n.phase === activePhase ? phaseColor : 'var(--border)'}
                    opacity={n.phase === activePhase ? 0.8 : 0.3}
                    style={{ clipPath: 'inset(0 round 10px 0 0 10px)' }}
                  />
                )}

                {/* Phase label chip */}
                {n.phase && n.phase === activePhase && (
                  <foreignObject
                    x={n.x - NODE_W / 2 + 12}
                    y={n.y - NODE_H / 2 + 8}
                    width={120}
                    height={18}
                  >
                    <span
                      className="inline-flex items-center rounded px-1.5 py-[1px] text-[8px] font-bold uppercase tracking-wider"
                      style={{ backgroundColor: '#5e6ad2', color: '#ffffff', opacity: 0.85 }}
                    >
                      {n.phase}
                    </span>
                  </foreignObject>
                )}

                {/* ── Content ── */}
                <foreignObject
                  x={n.x - NODE_W / 2 + 12}
                  y={n.y - NODE_H / 2 + 30}
                  width={NODE_W - 24}
                  height={NODE_H - 38}
                  style={{ pointerEvents: 'none' }}
                >
                  <div
                    className="flex h-full w-full flex-col gap-0.5"
                    style={{ opacity: opacityVal }}
                  >
                    {/* Row 1: Icon + Label + Progress */}
                    <div className="flex items-center gap-2 min-w-0">
                      <StatusIcon
                        size={14}
                        strokeWidth={2.5}
                        className="shrink-0"
                        style={{ color: isActive ? '#d97706' : isDone ? '#5e6ad2' : config.accent }}
                      />
                      <span
                        className={`min-w-0 flex-1 truncate text-[13px] font-bold leading-5 ${isRejected ? 'line-through' : ''}`}
                        style={{
                          color: isActive ? '#f7f8f8' : isDone ? '#5e6ad2' : 'var(--text-main)',
                        }}
                      >
                        {n.label}
                      </span>
                      {n.progress > 0 && (
                        <span
                          className="shrink-0 text-[10px] font-semibold tabular-nums"
                          style={{ color: isActive ? '#d97706' : 'var(--muted-foreground)' }}
                        >
                          {Math.round(n.progress * 100)}%
                        </span>
                      )}
                    </div>

                    {/* Row 2: Goal (1 line) */}
                    {n.goal && (
                      <div className="mt-0.5 text-[11px] leading-relaxed line-clamp-1 text-[var(--muted-foreground)]">
                        {n.goal}
                      </div>
                    )}

                    {/* Row 3: Step count */}
                    {n.stepCount > 0 && (
                      <div className="text-[10px] text-[var(--muted-foreground)] opacity-60">
                        {n.stepCount} {n.stepCount === 1 ? 'step' : 'steps'}
                      </div>
                    )}

                    {/* Row 4: File badges */}
                    {n.files.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {n.files.slice(0, 3).map((f) => (
                          <FileBadge key={f.path} file={f} />
                        ))}
                        {n.files.length > 3 && (
                          <span className="text-[9px] text-[var(--muted-foreground)] opacity-50">
                            +{n.files.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Row 5: Rating stars (only for done/accepted with rating) */}
                    {n.rating > 0 && (
                      <div className="mt-auto">
                        <RatingStars rating={n.rating} size={11} />
                      </div>
                    )}
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Zoom HUD */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2">
        <div className="rounded-full border border-[var(--border)] bg-[var(--bg-main)]/88 px-3 py-1 text-[11px] font-medium text-[var(--text-main)] shadow-sm backdrop-blur">
          {Math.round(transform.k * 100)}%
        </div>
        <div className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-main)]/88 p-1 shadow-sm backdrop-blur">
          <button
            type="button"
            onClick={() => stepZoom('out')}
            title={t('canvas.zoomOut')}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-main)] opacity-70 transition hover:bg-[var(--border)]/50 hover:opacity-100"
          >
            <Minus size={14} />
          </button>
          <button
            type="button"
            onClick={() => stepZoom('in')}
            title={t('canvas.zoomIn')}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-main)] opacity-70 transition hover:bg-[var(--border)]/50 hover:opacity-100"
          >
            <Plus size={14} />
          </button>
          <button
            type="button"
            onClick={() => fitToView()}
            title={t('canvas.fitView')}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-main)] opacity-70 transition hover:bg-[var(--border)]/50 hover:opacity-100"
          >
            <Crosshair size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
