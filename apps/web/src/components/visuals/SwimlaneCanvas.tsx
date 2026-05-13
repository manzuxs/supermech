import { Clock, Crosshair, Minus, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CanvasNode, PlanHeader, PlanPhase, WorkbenchState } from 'schemas';
import { useWorkbench } from '../../context/WorkbenchContext.tsx';
import { getTaskMeta } from './DetailPanel.tsx';

// ─── Constants ───

const CARD_W = 220;
const CARD_H = 85;
const H_GAP = 32;
const LANE_MIN_W = 480;
const HEADER_H = 36;
const HEADER_BAR_W = 4;
const PAD_TOP = 24;
const PAD_LEFT = 32;
const PAD_RIGHT = 48;
const LANE_PAD_Y = 16;
const LANE_GAP = 12;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.5;
const VIEWPORT_PAD_X = 48;
const VIEWPORT_PAD_Y = 40;

const LANE_COLORS = [
  'var(--primary)',
  '#8b5cf6',
  'var(--success)',
  'var(--accent)',
  '#ec4899',
  '#06b6d4',
  '#f97316',
  '#6366f1',
];

// ─── Types ───

interface SwimTask {
  id: string;
  label: string;
  goal: string;
  estimatedMinutes: number | null;
  riskLevel: string | null;
  x: number;
  y: number;
}

interface SwimLane {
  name: string;
  y: number;
  height: number;
  width: number;
  tasks: SwimTask[];
}

interface Arrow {
  from: { x: number; y: number };
  to: { x: number; y: number };
}

// ─── Layout ───

function buildLayout(
  phases: PlanPhase[],
  nodes: CanvasNode[],
): { lanes: SwimLane[]; arrows: Arrow[]; taskPos: Map<string, { x: number; y: number }> } {
  const lanes: SwimLane[] = [];
  const taskPos = new Map<string, { x: number; y: number }>();
  let currentY = PAD_TOP;

  for (const phase of phases) {
    const phaseNodes = nodes.filter((n) => (getTaskMeta(n).phase as string) === phase.name);
    if (phaseNodes.length === 0) continue;

    const tasks: SwimTask[] = [];
    let bodyBottomY = currentY + HEADER_H + LANE_PAD_Y;

    phaseNodes.forEach((node, i) => {
      const meta = getTaskMeta(node);
      const x = PAD_LEFT + i * (CARD_W + H_GAP);
      const y = currentY + HEADER_H + LANE_PAD_Y;
      bodyBottomY = y + CARD_H + LANE_PAD_Y;
      const t: SwimTask = {
        id: node.id,
        label: node.label,
        goal: (meta.goal as string) || '',
        estimatedMinutes: (meta.estimatedMinutes as number) ?? null,
        riskLevel: (meta.riskLevel as string) ?? null,
        x,
        y,
      };
      tasks.push(t);
      taskPos.set(node.id, { x, y });
    });

    const laneW = Math.max(
      tasks.length * (CARD_W + H_GAP) - H_GAP + PAD_LEFT + PAD_RIGHT,
      LANE_MIN_W,
    );
    const laneH = bodyBottomY - currentY;

    lanes.push({ name: phase.name, y: currentY, height: laneH + LANE_PAD_Y, width: laneW, tasks });
    currentY += laneH + LANE_GAP;
  }

  // no-phase nodes → "Other" lane
  const noPhaseNodes = nodes.filter((n) => !(getTaskMeta(n).phase as string));
  if (noPhaseNodes.length > 0) {
    const tasks: SwimTask[] = [];
    let bodyBottomY = currentY + HEADER_H + LANE_PAD_Y;
    noPhaseNodes.forEach((node, i) => {
      const meta = getTaskMeta(node);
      const x = PAD_LEFT + i * (CARD_W + H_GAP);
      const y = currentY + HEADER_H + LANE_PAD_Y;
      bodyBottomY = y + CARD_H + LANE_PAD_Y;
      const t: SwimTask = {
        id: node.id,
        label: node.label,
        goal: (meta.goal as string) || '',
        estimatedMinutes: (meta.estimatedMinutes as number) ?? null,
        riskLevel: (meta.riskLevel as string) ?? null,
        x,
        y,
      };
      tasks.push(t);
      taskPos.set(node.id, { x, y });
    });
    const laneW = Math.max(
      tasks.length * (CARD_W + H_GAP) - H_GAP + PAD_LEFT + PAD_RIGHT,
      LANE_MIN_W,
    );
    const laneH = bodyBottomY - currentY;
    lanes.push({
      name: 'Other',
      y: currentY,
      height: laneH + LANE_PAD_Y,
      width: laneW,
      tasks,
    });
    currentY += laneH + LANE_GAP;
  }

  // Build dependency arrows
  const arrows: Arrow[] = [];
  for (const node of nodes) {
    const deps = (getTaskMeta(node).dependencies as string[]) ?? [];
    const targetPos = taskPos.get(node.id);
    if (!targetPos) continue;
    for (const depId of deps) {
      const sourcePos = taskPos.get(depId);
      if (!sourcePos) continue;
      arrows.push({ from: sourcePos, to: targetPos });
    }
  }

  return { lanes, arrows, taskPos };
}

function getBounds(lanes: SwimLane[]) {
  if (lanes.length === 0)
    return { minX: 0, minY: 0, maxX: 800, maxY: 600, width: 800, height: 600 };

  // Compute from card positions, not from lane background widths
  let minX = Infinity;
  let maxX = -Infinity;
  for (const lane of lanes) {
    for (const t of lane.tasks) {
      const left = t.x - CARD_W / 2;
      const right = t.x + CARD_W / 2;
      if (left < minX) minX = left;
      if (right > maxX) maxX = right;
    }
  }
  // Fallback if no tasks
  if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 800, maxY: 600, width: 800, height: 600 };

  const last = lanes[lanes.length - 1];
  const maxY = last.y + last.height;
  return { minX, minY: 0, maxX, maxY, width: maxX - minX, height: maxY };
}

function arrowPath(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const x1 = from.x + CARD_W / 2;
  const y1 = from.y;
  const x2 = to.x - CARD_W / 2;
  const y2 = to.y;
  if (Math.abs(y2 - y1) < 10) {
    // Same lane — horizontal bezier
    const cx = (x1 + x2) / 2;
    return `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
  }
  // Cross-lane — S-curve
  const cy = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`;
}

// ─── Component ───

function getPlanHeader(s: WorkbenchState): PlanHeader | null {
  if (!s.canvas.metadata) return null;
  return (s.canvas.metadata.planHeader as PlanHeader) ?? null;
}

export default function SwimlaneCanvas() {
  const { state, updateUI } = useWorkbench();
  const { nodes } = state.canvas;
  const planHeader = getPlanHeader(state);
  const phases = planHeader?.phases ?? [];
  const { lanes, arrows } = buildLayout(phases, nodes);
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const layoutSig = lanes.map((l) => `${l.name}:${l.tasks.length}`).join('|');

  function fitToView() {
    const el = containerRef.current;
    if (!el || lanes.length === 0) return;
    const rect = el.getBoundingClientRect();
    const bounds = getBounds(lanes);
    const aw = Math.max(rect.width - VIEWPORT_PAD_X * 2, 1);
    const ah = Math.max(rect.height - VIEWPORT_PAD_Y * 2, 1);
    const nextK = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, Math.min(aw / bounds.width, ah / bounds.height)),
    );
    setTransform({
      x: (rect.width - bounds.width * nextK) / 2,
      y: (rect.height - bounds.height * nextK) / 2,
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
    fitToView();
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

  if (nodes.length === 0) {
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
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          handleBgClick(e);
        }
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
            id="swim-arrowhead"
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
          {/* Swimlanes */}
          {lanes.map((lane, idx) => (
            <g key={lane.name}>
              {/* Lane background */}
              <rect
                x={-PAD_LEFT}
                y={lane.y - LANE_PAD_Y}
                width={lane.width + PAD_LEFT + PAD_RIGHT + 80}
                height={lane.height}
                rx={10}
                ry={10}
                fill="color-mix(in srgb, var(--bg-main) 60%, var(--bg-canvas))"
                stroke="var(--border)"
                strokeWidth={1}
              />
              {/* Header bar */}
              <rect
                x={-PAD_LEFT}
                y={lane.y - LANE_PAD_Y}
                width={HEADER_BAR_W}
                height={HEADER_H}
                rx={2}
                ry={2}
                fill={LANE_COLORS[idx % LANE_COLORS.length]}
              />
              <text
                x={-PAD_LEFT + HEADER_BAR_W + 10}
                y={lane.y - LANE_PAD_Y + HEADER_H / 2 + 1}
                fontSize={12}
                fontWeight={700}
                fill="var(--text-main)"
                dominantBaseline="middle"
              >
                {lane.name === 'Other' ? t('editor.otherTasks') : lane.name}
              </text>
              <text
                x={-PAD_LEFT + HEADER_BAR_W + 10 + lane.name.length * 8 + 6}
                y={lane.y - LANE_PAD_Y + HEADER_H / 2 + 1}
                fontSize={10}
                fontWeight={500}
                fill="var(--text-main)"
                dominantBaseline="middle"
                opacity={0.4}
              >
                {lane.tasks.length === 1
                  ? `(${lane.tasks.length} ${t('editor.task')})`
                  : `(${lane.tasks.length} ${t('editor.tasks')})`}
              </text>
            </g>
          ))}

          {/* Arrows */}
          {arrows.map((a, i) => (
            <path
              key={i}
              d={arrowPath(a.from, a.to)}
              fill="none"
              stroke="var(--border)"
              strokeWidth={1.5}
              markerEnd="url(#swim-arrowhead)"
              opacity={0.6}
            />
          ))}

          {/* Task Cards */}
          {lanes.map((lane) =>
            lane.tasks.map((task) => {
              const isSelected = task.id === selectedId;

              return (
                <g
                  key={task.id}
                  data-card
                  onClick={(e) => {
                    e.stopPropagation();
                    updateUI({ selectedNodeId: task.id, rightSidebarOpen: true });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.stopPropagation();
                      updateUI({ selectedNodeId: task.id, rightSidebarOpen: true });
                    }
                  }}
                  className="group cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-2 rounded-lg"
                  role="button"
                  tabIndex={0}
                >
                  {/* Selection glow */}
                  {isSelected && (
                    <rect
                      x={task.x - CARD_W / 2 - 4}
                      y={task.y - CARD_H / 2 - 4}
                      width={CARD_W + 8}
                      height={CARD_H + 8}
                      rx={14}
                      ry={14}
                      fill="color-mix(in srgb, var(--primary) 8%, transparent)"
                    />
                  )}

                  {/* Card body */}
                  <rect
                    x={task.x - CARD_W / 2}
                    y={task.y - CARD_H / 2}
                    width={CARD_W}
                    height={CARD_H}
                    rx={10}
                    ry={10}
                    fill="var(--bg-canvas)"
                    stroke={isSelected ? 'var(--primary)' : 'var(--border)'}
                    strokeWidth={isSelected ? 2 : 1}
                    className="transition-colors duration-200 group-hover:stroke-primary/40"
                    filter="drop-shadow(0 2px 4px rgb(0 0 0 / 0.04))"
                  />

                  {/* Card content */}
                  <foreignObject
                    x={task.x - CARD_W / 2}
                    y={task.y - CARD_H / 2}
                    width={CARD_W}
                    height={CARD_H}
                    style={{ pointerEvents: 'none' }}
                  >
                    <div className="relative flex h-full w-full flex-col overflow-hidden p-3">
                      {/* Label row */}
                      <div className="flex min-w-0 items-start gap-2">
                        <span className="min-w-0 flex-1 truncate text-[13px] font-bold leading-5 text-[var(--text-main)]">
                          {task.label}
                        </span>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {task.estimatedMinutes && (
                            <span className="flex items-center gap-0.5 text-[9px] font-semibold text-[var(--text-main)] opacity-50">
                              <Clock size={9} />
                              {task.estimatedMinutes}m
                            </span>
                          )}
                          {task.riskLevel && (
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{
                                backgroundColor:
                                  task.riskLevel === 'high'
                                    ? 'var(--destructive)'
                                    : task.riskLevel === 'medium'
                                      ? 'var(--accent)'
                                      : 'var(--success)',
                              }}
                            />
                          )}
                        </div>
                      </div>

                      {/* Goal text */}
                      {task.goal && (
                        <div className="mt-1 text-[11px] leading-relaxed line-clamp-1 text-[var(--text-main)] opacity-62">
                          {task.goal}
                        </div>
                      )}
                    </div>
                  </foreignObject>
                </g>
              );
            }),
          )}
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
            onClick={fitToView}
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
