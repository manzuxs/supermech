import {
  CheckCircle2,
  Clock,
  Code,
  Crosshair,
  FileText,
  ListChecks,
  Minus,
  Plus,
  Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CanvasNode, PlanHeader, PlanPhase, WorkbenchState } from 'schemas';
import { useWorkbench } from '../../context/WorkbenchContext.tsx';
import { getTaskMeta } from './DetailPanel.tsx';

// ─── Plan Summary Overlay ───

function PlanSummary({ header }: { header: PlanHeader | null }) {
  const { t } = useTranslation();
  if (!header) return null;

  return (
    <div className="absolute top-6 left-6 z-10 w-72 rounded-xl border border-[var(--border)] bg-[var(--surface-1)]/80 p-5 shadow-2xl backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
          <Zap size={16} />
        </div>
        <h2 className="text-[14px] font-bold tracking-tight text-[var(--foreground)]">
          {t('editor.planSummary')}
        </h2>
      </div>

      <div className="space-y-4">
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
            <CheckCircle2 size={10} />
            {t('editor.primaryGoal')}
          </div>
          <p className="text-[13px] leading-relaxed text-[var(--foreground)] opacity-90">
            {header.goal}
          </p>
        </div>

        {header.architecture && (
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
              <Code size={10} />
              {t('editor.architecture')}
            </div>
            <p className="text-[12px] leading-relaxed text-[var(--muted-foreground)]">
              {header.architecture}
            </p>
          </div>
        )}

        {header.techStack && header.techStack.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {header.techStack.map((tech) => (
              <span
                key={tech}
                className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--foreground)]"
              >
                {tech}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Constants ───

const CARD_W = 280;
const CARD_H = 400;
const H_GAP = 32;
const LANE_MIN_W = 640;
const HEADER_H = 40;
const HEADER_BAR_W = 3;
const PAD_TOP = 40;
const PAD_LEFT = 32;
const PAD_RIGHT = 48;
const LANE_PAD_Y = 24;
const LANE_GAP = 16;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.5;
const VIEWPORT_PAD_X = 64;
const VIEWPORT_PAD_Y = 64;

const LANE_COLORS = [
  '#5e6ad2', // Linear Lavender
  '#8b5cf6',
  '#27a644', // Success Green
  '#f59e0b', // Amber
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
  assignee: string | null;
  stepsCount: number;
  filesCount: number;
  steps: any[];
  files: any[];
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

      const steps = (meta.implementationSteps as any[]) ?? [];
      const files = (meta.files as any[]) ?? [];

      const t: SwimTask = {
        id: node.id,
        label: node.label,
        goal: (meta.goal as string) || (meta.description as string) || '',
        estimatedMinutes: (meta.estimatedMinutes as number) ?? null,
        riskLevel: (meta.riskLevel as string) ?? null,
        assignee: (meta.assignee as string) ?? null,
        stepsCount: steps.length,
        filesCount: files.length,
        steps,
        files,
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

      const steps = (meta.implementationSteps as any[]) ?? [];
      const files = (meta.files as any[]) ?? [];

      const t: SwimTask = {
        id: node.id,
        label: node.label,
        goal: (meta.goal as string) || (meta.description as string) || '',
        estimatedMinutes: (meta.estimatedMinutes as number) ?? null,
        riskLevel: (meta.riskLevel as string) ?? null,
        assignee: (meta.assignee as string) ?? null,
        stepsCount: steps.length,
        filesCount: files.length,
        steps,
        files,
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
      const left = t.x;
      const right = t.x + CARD_W;
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
  const x1 = from.x + CARD_W;
  const y1 = from.y + CARD_H / 2;
  const x2 = to.x;
  const y2 = to.y + CARD_H / 2;

  if (Math.abs(y2 - y1) < 10) {
    // Same lane — horizontal bezier
    const cx = (x1 + x2) / 2;
    return `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
  }
  // Cross-lane — standard bezier curve
  const cx1 = x1 + (x2 - x1) * 0.5;
  const cx2 = x1 + (x2 - x1) * 0.5;
  return `M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`;
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

  function fitToView(forceK?: number) {
    const el = containerRef.current;
    if (!el || lanes.length === 0) return;
    const rect = el.getBoundingClientRect();
    const bounds = getBounds(lanes);

    const summaryOffset = planHeader ? 320 : 0; // w-72 (288px) + padding
    const safeWidth = Math.max(rect.width - summaryOffset, 100);

    let nextK = forceK;
    if (nextK === undefined) {
      const aw = Math.max(safeWidth - VIEWPORT_PAD_X * 2, 1);
      const ah = Math.max(rect.height - VIEWPORT_PAD_Y * 2, 1);
      nextK = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, Math.min(aw / bounds.width, ah / bounds.height)),
      );
    }

    // Center within the safe area (right of the summary panel)
    const centerX = summaryOffset + safeWidth / 2;

    setTransform({
      x: centerX - (bounds.width * nextK) / 2 - bounds.minX * nextK,
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
    fitToView(1); // Default to 100%
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
      className={`canvas-dot-grid relative h-full w-full overflow-hidden select-none bg-[var(--background)] ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
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
      <PlanSummary header={planHeader} />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,var(--surface-1)_0%,transparent_60%)] opacity-40" />
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
                x={0}
                y={lane.y - LANE_PAD_Y}
                width={lane.width}
                height={lane.height}
                rx={16}
                ry={16}
                fill="none"
                stroke="var(--border)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                opacity={0.5}
              />
              {/* Header bar */}
              <rect
                x={0}
                y={lane.y - LANE_PAD_Y}
                width={HEADER_BAR_W}
                height={HEADER_H}
                rx={1.5}
                ry={1.5}
                fill={LANE_COLORS[idx % LANE_COLORS.length]}
              />
              <text
                x={HEADER_BAR_W + 12}
                y={lane.y - LANE_PAD_Y + HEADER_H / 2}
                fill="var(--foreground)"
                dominantBaseline="middle"
              >
                <tspan
                  fontSize={12}
                  fontWeight={700}
                  className="uppercase tracking-[0.1em] opacity-60"
                >
                  {lane.name === 'Other' ? t('editor.otherTasks') : lane.name}
                </tspan>
                <tspan dx={12} fontSize={11} fontWeight={600} opacity={0.3}>
                  {lane.tasks.length === 1
                    ? `${lane.tasks.length} ${t('editor.task')}`
                    : `${lane.tasks.length} ${t('editor.tasks')}`}
                </tspan>
              </text>
            </g>
          ))}

          {/* Arrows */}
          {arrows.map((a, i) => {
            const pathStr = arrowPath(a.from, a.to);
            return (
              <g key={i}>
                {/* Glow layer */}
                <path
                  d={pathStr}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth={3}
                  className="opacity-10"
                  style={{ filter: 'blur(3px)' }}
                />
                <path
                  d={pathStr}
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth={1.5}
                  markerEnd="url(#swim-arrowhead)"
                  opacity={0.8}
                />
              </g>
            );
          })}

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
                  className="group cursor-pointer outline-none"
                  role="button"
                  tabIndex={0}
                >
                  {/* Selection glow */}
                  {isSelected && (
                    <rect
                      x={task.x - 2}
                      y={task.y - 2}
                      width={CARD_W + 4}
                      height={CARD_H + 4}
                      rx={14}
                      ry={14}
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      className="opacity-50"
                    />
                  )}

                  {/* Card body */}
                  <rect
                    x={task.x}
                    y={task.y}
                    width={CARD_W}
                    height={CARD_H}
                    rx={12}
                    ry={12}
                    fill={isSelected ? 'var(--surface-2)' : 'var(--surface-1)'}
                    stroke={isSelected ? 'var(--primary)' : 'var(--border)'}
                    strokeWidth={isSelected ? 2 : 1.5}
                    className="transition-all duration-200 group-hover:stroke-[var(--primary-hover)] group-hover:fill-[var(--surface-2)]"
                    style={{
                      filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5))'
                    }}
                  />

                  {/* Card content */}
                  <foreignObject
                    x={task.x}
                    y={task.y}
                    width={CARD_W}
                    height={CARD_H}
                    style={{ pointerEvents: 'none' }}
                  >
                    <div className="relative flex h-full w-full flex-col p-4">
                      {/* Top row: Status & Risk */}
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-2 w-2 rounded-full ${
                              task.riskLevel === 'high'
                                ? 'bg-destructive'
                                : task.riskLevel === 'medium'
                                  ? 'bg-[var(--amber)]'
                                  : 'bg-[var(--success)]'
                            }`}
                          />
                          {task.riskLevel && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                              {task.riskLevel}
                            </span>
                          )}
                        </div>
                        {task.estimatedMinutes && (
                          <div className="flex items-center gap-1 text-[10px] font-medium text-[var(--muted-foreground)]">
                            <Clock size={10} />
                            <span>{task.estimatedMinutes}m</span>
                          </div>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="mb-2 block line-clamp-2 text-[14px] font-extrabold leading-tight text-[var(--foreground)]" style={{ lineHeight: '1.5' }}>
                        {task.label}
                      </h3>

                      {/* Goal text */}
                      {task.goal && (
                        <p className="mb-4 text-[11px] leading-relaxed text-[var(--muted-foreground)] line-clamp-3" style={{ fontWeight: 500 }}>
                          {task.goal}
                        </p>
                      )}

                      <div className="flex-1 space-y-4 overflow-hidden">
                        {/* Steps Preview */}
                        {task.steps.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] opacity-50">
                              <Code size={10} />
                              <span>{t('editor.codeSteps')}</span>
                            </div>
                            <div className="space-y-1">
                              {task.steps.slice(0, 3).map((step, i) => (
                                <div
                                  key={i}
                                  className="flex items-start gap-2 rounded-md bg-[var(--surface-3)]/30 px-2 py-1.5"
                                >
                                  <span className="mt-0.5 flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[7px] font-bold text-white">
                                    {i + 1}
                                  </span>
                                  <span className="line-clamp-2 text-[10px] leading-snug text-[var(--foreground)] opacity-80">
                                    {step.description}
                                  </span>
                                </div>
                              ))}
                              {task.steps.length > 3 && (
                                <div className="pl-5 text-[9px] text-[var(--muted-foreground)] opacity-50">
                                  + {task.steps.length - 3} more steps
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Files Preview */}
                        {task.files.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] opacity-50">
                              <FileText size={10} />
                              <span>{t('editor.files')}</span>
                            </div>
                            <div className="space-y-1">
                              {task.files.slice(0, 3).map((file, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-2)]/50 px-2 py-1"
                                >
                                  <span className="text-[8px] font-bold uppercase text-[var(--primary)] opacity-70">
                                    {file.type}
                                  </span>
                                  <span className="truncate font-mono text-[9px] text-[var(--foreground)] opacity-70">
                                    {file.path.split('/').pop()}
                                  </span>
                                </div>
                              ))}
                              {task.files.length > 3 && (
                                <div className="text-[9px] text-[var(--muted-foreground)] opacity-50">
                                  + {task.files.length - 3} more files
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="mt-4 flex shrink-0 items-center justify-between border-t border-[var(--border)] pt-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-[10px] text-[var(--muted-foreground)]">
                            <FileText size={10} />
                            <span>{task.filesCount}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-[var(--muted-foreground)]">
                            <ListChecks size={10} />
                            <span>{task.stepsCount}</span>
                          </div>
                        </div>
                        {task.assignee && (
                          <div className="rounded bg-[var(--surface-3)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                            {task.assignee}
                          </div>
                        )}
                      </div>
                    </div>
                  </foreignObject>
                </g>
              );
            }),
          )}
        </g>
      </svg>

      {/* Zoom HUD */}
      <div className="absolute right-6 bottom-6 flex items-center gap-2">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)]/80 px-3 py-1.5 text-[11px] font-bold tracking-tight text-[var(--foreground)] shadow-xl backdrop-blur-md">
          {Math.round(transform.k * 100)}%
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-1)]/80 p-1 shadow-xl backdrop-blur-md">
          <button
            type="button"
            onClick={() => stepZoom('out')}
            title={t('canvas.zoomOut')}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted-foreground)] transition hover:bg-[var(--surface-3)] hover:text-[var(--foreground)]"
          >
            <Minus size={14} />
          </button>
          <button
            type="button"
            onClick={() => stepZoom('in')}
            title={t('canvas.zoomIn')}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted-foreground)] transition hover:bg-[var(--surface-3)] hover:text-[var(--foreground)]"
          >
            <Plus size={14} />
          </button>
          <button
            type="button"
            onClick={() => fitToView()}
            title={t('canvas.fitView')}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted-foreground)] transition hover:bg-[var(--surface-3)] hover:text-[var(--foreground)]"
          >
            <Crosshair size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
