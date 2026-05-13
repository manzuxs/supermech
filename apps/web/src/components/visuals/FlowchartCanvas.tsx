import {
  CheckCircle2,
  Circle,
  Crosshair,
  Minus,
  PlayCircle,
  Plus,
  XCircle,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CanvasEdge, CanvasNode, NodeStatus } from 'schemas';
import { useWorkbench } from '../../context/WorkbenchContext.tsx';
import { getTaskMeta } from './DetailPanel.tsx';

// ─── Constants ───

const NODE_W = 200;
const NODE_H = 80;
const H_GAP = 48;
const V_GAP = 120;
const PAD = 40;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.5;
const VIEWPORT_PAD_X = 48;
const VIEWPORT_PAD_Y = 40;

// ─── Types ───

interface DagNode {
  id: string;
  label: string;
  status: NodeStatus;
  goal: string;
  progress: number;
  level: number;
  x: number;
  y: number;
}

interface EdgePath {
  from: { x: number; y: number };
  to: { x: number; y: number };
}

// ─── Status config ───

const STATUS_CONFIG: Record<NodeStatus, { bg: string; border: string; text: string; icon: any }> = {
  pending: { bg: 'var(--bg-canvas)', border: 'var(--border)', text: 'var(--text-main)', icon: Circle },
  active: {
    bg: 'color-mix(in srgb, var(--accent) 5%, var(--bg-canvas))',
    border: 'var(--accent)',
    text: 'var(--text-main)',
    icon: PlayCircle,
  },
  accepted: {
    bg: 'color-mix(in srgb, var(--success) 8%, var(--bg-canvas))',
    border: 'var(--success)',
    text: 'var(--success)',
    icon: CheckCircle2,
  },
  rejected: { bg: 'var(--bg-canvas)', border: 'var(--border)', text: 'var(--muted-foreground)', icon: XCircle },
  done: {
    bg: 'color-mix(in srgb, var(--primary) 8%, var(--bg-canvas))',
    border: 'var(--primary)',
    text: 'var(--primary)',
    icon: CheckCircle2,
  },
};

// ─── DAG Layout ───

function buildDagLayout(nodes: CanvasNode[], edges: CanvasEdge[]): { dagNodes: DagNode[]; paths: EdgePath[] } {
  if (nodes.length === 0) return { dagNodes: [], paths: [] };

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

  // Topological sort to assign levels (longest-path layering)
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

  // Group by level
  const byLevel = new Map<number, DagNode[]>();
  for (const n of nodes) {
    const lvl = level.get(n.id) ?? 0;
    if (!byLevel.has(lvl)) byLevel.set(lvl, []);
    const meta = getTaskMeta(n);
    byLevel.get(lvl)!.push({
      id: n.id,
      label: n.label,
      status: n.status,
      goal: (meta.goal as string) || '',
      progress: n.progress,
      level: lvl,
      x: 0,
      y: 0,
    });
  }

  // Position nodes within each level
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

  // Build edge paths
  const dagPos = new Map(dagNodes.map((n) => [n.id, { x: n.x, y: n.y }]));
  const paths: EdgePath[] = [];
  for (const e of edges) {
    const from = dagPos.get(e.from);
    const to = dagPos.get(e.to);
    if (!from || !to) continue;
    paths.push({ from, to });
  }

  return { dagNodes, paths };
}

function getBounds(dagNodes: DagNode[]) {
  if (dagNodes.length === 0) return { minX: 0, minY: 0, maxX: 800, maxY: 600, width: 800, height: 600 };
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
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

// ─── Component ───

interface FlowchartCanvasProps {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

export default function FlowchartCanvas({ nodes, edges }: FlowchartCanvasProps) {
  const { t } = useTranslation();
  const { state, updateUI } = useWorkbench();
  const { dagNodes, paths } = buildDagLayout(nodes, edges);
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
      nextK = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(aw / bounds.width, ah / bounds.height)));
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
  useEffect(() => { fitToView(1); }, [layoutSig]);

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

  return (
    <div
      ref={containerRef}
      className={`canvas-dot-grid relative h-full w-full overflow-hidden select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleBgClick}
      onKeyDown={(e) => { if (e.key === 'Enter') handleBgClick(e); }}
      style={{
        backgroundPosition: `${transform.x}px ${transform.y}px`,
        backgroundSize: `${24 * transform.k}px ${24 * transform.k}px`,
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,var(--bg-main)_0%,transparent_44%)] opacity-28" />
      <svg width="100%" height="100%" style={{ display: 'block', overflow: 'hidden' }}>
        <defs>
          <marker id="fc-arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--border)" />
          </marker>
        </defs>

        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
          {/* Edges */}
          {paths.map((p, i) => (
            <path
              key={i}
              d={arrowPath(p.from, p.to)}
              fill="none"
              stroke="var(--border)"
              strokeWidth={1.5}
              markerEnd="url(#fc-arrowhead)"
              opacity={0.6}
            />
          ))}

          {/* Nodes */}
          {dagNodes.map((n) => {
            const config = STATUS_CONFIG[n.status];
            const isSelected = n.id === selectedId;
            const isRejected = n.status === 'rejected';
            const isActive = n.status === 'active';
            const StatusIcon = config.icon;

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
                    x={n.x - NODE_W / 2 - 4}
                    y={n.y - NODE_H / 2 - 4}
                    width={NODE_W + 8}
                    height={NODE_H + 8}
                    rx={14}
                    ry={14}
                    fill="color-mix(in srgb, var(--primary) 8%, transparent)"
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
                  fill={config.bg}
                  stroke={isSelected ? 'var(--primary)' : isActive ? 'var(--accent)' : config.border}
                  strokeWidth={isSelected || isActive ? 2 : 1}
                  className={
                    isActive
                      ? 'processing-node'
                      : 'transition-colors duration-200 group-hover:stroke-primary/40'
                  }
                  filter="drop-shadow(0 2px 4px rgb(0 0 0 / 0.06))"
                />

                {/* Content */}
                <foreignObject
                  x={n.x - NODE_W / 2}
                  y={n.y - NODE_H / 2}
                  width={NODE_W}
                  height={NODE_H}
                  style={{ pointerEvents: 'none' }}
                >
                  <div className="relative flex h-full w-full flex-col overflow-hidden p-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <StatusIcon
                        size={14}
                        strokeWidth={2.5}
                        className="shrink-0"
                        style={{ color: isSelected ? 'var(--primary)' : config.border }}
                      />
                      <span
                        className={`min-w-0 flex-1 truncate text-[13px] font-bold leading-5 ${isRejected ? 'line-through' : ''}`}
                        style={{ color: config.text }}
                      >
                        {n.label}
                      </span>
                      {n.progress > 0 && (
                        <span
                          className="shrink-0 text-[10px] font-semibold tabular-nums"
                          style={{ color: config.text, opacity: 0.6 }}
                        >
                          {Math.round(n.progress * 100)}%
                        </span>
                      )}
                    </div>

                    {n.goal && (
                      <div
                        className="mt-1 text-[11px] leading-relaxed line-clamp-1"
                        style={{ color: config.text, opacity: 0.6 }}
                      >
                        {n.goal}
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
          <button type="button" onClick={() => stepZoom('out')} title={t('canvas.zoomOut')} className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-main)] opacity-70 transition hover:bg-[var(--border)]/50 hover:opacity-100">
            <Minus size={14} />
          </button>
          <button type="button" onClick={() => stepZoom('in')} title={t('canvas.zoomIn')} className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-main)] opacity-70 transition hover:bg-[var(--border)]/50 hover:opacity-100">
            <Plus size={14} />
          </button>
          <button type="button" onClick={() => fitToView()} title={t('canvas.fitView')} className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-main)] opacity-70 transition hover:bg-[var(--border)]/50 hover:opacity-100">
            <Crosshair size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
