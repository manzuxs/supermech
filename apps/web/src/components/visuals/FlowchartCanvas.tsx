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
import type {
  CanvasEdge,
  CanvasNode,
  ExecutionFlow,
  ExecutionFlowStage,
  ExecutionFlowStageRelation,
  ExecutionFlowTaskRelation,
  NodeStatus,
} from 'schemas';
import { useWorkbench } from '../../context/WorkbenchContext.tsx';
import { getTaskMeta } from './DetailPanel.tsx';

const STAGE_W = 368;
const STAGE_MIN_H = 220;
const STAGE_GAP = 96;
const STAGE_HEADER_H = 82;
const STAGE_PAD_Y = 20;
const FLOW_RAIL_TOP_GAP = 18;
const FLOW_RAIL_BOTTOM_GAP = 18;
const FLOW_NODE_RADIUS = 9;
const TASK_W = 296;
const TASK_GAP = 22;
const PAD_X = 84;
const PAD_Y = 112;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.5;
const VIEWPORT_PAD_X = 72;
const VIEWPORT_PAD_Y = 64;

interface FileInfo {
  path: string;
  type: string;
  description?: string;
}

interface FlowTask {
  id: string;
  label: string;
  status: NodeStatus;
  goal: string;
  progress: number;
  files: FileInfo[];
  stepCount: number;
  rating: number;
  gateStates: Array<{ type: string; status: string }>;
  executionPhase: string;
  activeFiles: string[];
  latestEvent: string;
  x: number;
  y: number;
  h: number;
}

interface StageLayout {
  id: string;
  name: string;
  description?: string;
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  tasks: FlowTask[];
  flowStartY: number;
  flowEndY: number;
}

interface TaskLink {
  stageId: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  label?: string;
}

interface StageLink {
  from: { x: number; y: number };
  to: { x: number; y: number };
}

function shouldRenderLinkLabel(label?: string): boolean {
  if (!label) return false;
  return label.trim().toLowerCase() !== 'blocks';
}

const STATUS_CONFIG: Record<NodeStatus, { border: string; accent: string; icon: LucideIcon }> = {
  pending: {
    border: 'var(--execution-card-stroke-muted)',
    accent: 'var(--execution-status-pending)',
    icon: Circle,
  },
  active: {
    border: 'var(--execution-status-active)',
    accent: 'var(--execution-status-active)',
    icon: PlayCircle,
  },
  accepted: {
    border: 'var(--execution-status-accepted)',
    accent: 'var(--execution-status-accepted)',
    icon: CheckCircle2,
  },
  rejected: {
    border: 'var(--execution-card-stroke-muted)',
    accent: 'var(--execution-status-rejected)',
    icon: XCircle,
  },
  done: {
    border: 'var(--execution-status-done)',
    accent: 'var(--execution-status-done)',
    icon: CheckCircle2,
  },
};

const GATE_DOT_COLORS: Record<string, string> = {
  pending: 'var(--execution-card-stroke-muted)',
  running: 'var(--execution-status-active)',
  passed: 'var(--execution-status-accepted)',
  failed: '#ef4444',
  skipped: 'var(--muted-foreground)',
};

const GATE_LABELS: Record<string, string> = {
  'spec-review': 'SPEC',
  'code-quality': 'QUALITY',
};

const EXECUTION_PHASE_LABELS: Record<string, string> = {
  implementing: 'Implementing',
  'editing-files': 'Editing Files',
  'running-tests': 'Running Tests',
  reviewing: 'Reviewing',
  fixing: 'Fixing',
};

const FILE_BADGE_COLORS: Record<string, string> = {
  create:
    'border-[var(--execution-chip-border)] bg-[var(--execution-panel-accent-bg)] text-[var(--text-main)]',
  modify:
    'border-transparent bg-[color-mix(in_srgb,var(--execution-phase-3)_78%,transparent)] text-[var(--text-main)]',
  test:
    'border-transparent bg-[color-mix(in_srgb,var(--success)_18%,transparent)] text-[var(--success)]',
  delete:
    'border-transparent bg-[var(--execution-chip-muted-bg)] text-[var(--execution-chip-muted-fg)]',
};

function getExecutionFlow(state: ReturnType<typeof useWorkbench>['state']): ExecutionFlow | null {
  const meta = state.canvas.metadata as Record<string, unknown> | undefined;
  const flow = meta?.executionFlow;
  if (!flow || typeof flow !== 'object') return null;
  return flow as ExecutionFlow;
}

function calculateTaskHeight(task: Pick<
  FlowTask,
  'label' | 'goal' | 'files' | 'stepCount' | 'gateStates' | 'executionPhase' | 'activeFiles' | 'latestEvent' | 'rating'
>): number {
  let height = 116;

  const titleLines = Math.max(1, Math.ceil(task.label.length / 22));
  height += titleLines * 20;

  if (task.goal) {
    const goalLines = Math.max(1, Math.ceil(task.goal.length / 34));
    height += Math.min(goalLines, 3) * 16;
  }

  if (task.executionPhase && task.executionPhase !== 'idle') height += 22;
  if (task.activeFiles.length > 0 || task.latestEvent) height += 18;
  if (task.stepCount > 0) height += 18;
  if (task.files.length > 0) height += 26 + Math.min(task.files.length, 2) * 16;
  if (task.gateStates.length > 0) height += 22;
  if (task.rating > 0) height += 18;

  return Math.max(height, 160);
}

function getPrimaryStageRelations(flow: ExecutionFlow): ExecutionFlowStageRelation[] {
  const sequential: ExecutionFlowStageRelation[] = [];
  for (let i = 0; i < flow.stages.length - 1; i++) {
    sequential.push({
      fromStageId: flow.stages[i].id,
      toStageId: flow.stages[i + 1].id,
    });
  }
  return sequential;
}

function getTaskRelations(flow: ExecutionFlow, stage: ExecutionFlowStage): ExecutionFlowTaskRelation[] {
  const relations = (flow.taskRelations ?? []).filter((relation) =>
    stage.taskIds.includes(relation.fromTaskId) && stage.taskIds.includes(relation.toTaskId)
  );

  if (relations.length > 0) return relations;

  const sequential: ExecutionFlowTaskRelation[] = [];
  for (let i = 0; i < stage.taskIds.length - 1; i++) {
    sequential.push({
      fromTaskId: stage.taskIds[i],
      toTaskId: stage.taskIds[i + 1],
    });
  }
  return sequential;
}

function buildLayout(
  flow: ExecutionFlow,
  nodes: CanvasNode[],
  feedback: { nodeId: string; rating: number }[],
): {
  stages: StageLayout[];
  taskLinks: TaskLink[];
  stageLinks: StageLink[];
} {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const ratingMap = new Map<string, number>();
  for (const fb of feedback) {
    ratingMap.set(fb.nodeId, Math.max(ratingMap.get(fb.nodeId) ?? 0, fb.rating));
  }

  const stageDrafts = flow.stages.map((stage, index) => {
    const tasks: FlowTask[] = [];
    const stageX = PAD_X + index * (STAGE_W + STAGE_GAP);
    const taskX = stageX + (STAGE_W - TASK_W) / 2;
    const flowStartY = PAD_Y + STAGE_HEADER_H + STAGE_PAD_Y + FLOW_RAIL_TOP_GAP;
    let currentY = flowStartY + FLOW_NODE_RADIUS + 18;

    for (const taskId of stage.taskIds) {
      const node = nodeMap.get(taskId);
      if (!node) continue;
      const meta = getTaskMeta(node);
      const files = (meta.files as FileInfo[] | undefined) ?? [];
      const steps = (meta.implementationSteps as Array<unknown> | undefined) ?? [];
      const gateStates = (meta.gateStates as Array<{ type: string; status: string }> | undefined) ?? [];
      const executionPhase = (meta.executionPhase as string | undefined) ?? '';
      const activeFiles = (meta.activeFiles as string[] | undefined) ?? [];
      const executionEvents =
        (meta.executionEvents as Array<{ message?: string }> | undefined) ?? [];
      const latestEvent =
        executionEvents.length > 0
          ? (executionEvents[executionEvents.length - 1]?.message ?? '')
          : '';
      const goal = ((meta.goal as string | undefined) ?? (meta.description as string | undefined) ?? '').trim();

      const task: FlowTask = {
        id: node.id,
        label: node.label,
        status: node.status,
        goal,
        progress: node.progress,
        files,
        stepCount: steps.length,
        rating: ratingMap.get(node.id) ?? 0,
        gateStates,
        executionPhase,
        activeFiles,
        latestEvent,
        x: taskX,
        y: currentY,
        h: 0,
      };
      task.h = calculateTaskHeight(task);
      tasks.push(task);
      currentY += task.h + TASK_GAP;
    }

    const flowEndY = tasks.length > 0
      ? tasks[tasks.length - 1].y + tasks[tasks.length - 1].h + FLOW_RAIL_BOTTOM_GAP
      : flowStartY + 110;

    return {
      stage,
      x: stageX,
      naturalHeight: Math.max(
        STAGE_MIN_H,
        flowEndY - PAD_Y + STAGE_PAD_Y,
      ),
      tasks,
      flowStartY,
      flowEndY,
    };
  });

  const stages: StageLayout[] = stageDrafts.map(({ stage, x, naturalHeight, tasks, flowStartY, flowEndY }, index) => ({
    id: stage.id,
    name: stage.name,
    description: stage.description,
    index,
    x,
    y: PAD_Y,
    width: STAGE_W,
    height: naturalHeight,
    tasks,
    flowStartY,
    flowEndY,
  }));

  const taskCenterMap = new Map<string, { x: number; y: number; topY: number; bottomY: number }>();
  for (const stage of stages) {
    for (const task of stage.tasks) {
      taskCenterMap.set(task.id, {
        x: task.x + TASK_W / 2,
        y: task.y + task.h / 2,
        topY: task.y,
        bottomY: task.y + task.h,
      });
    }
  }

  const taskLinks: TaskLink[] = [];
  for (const stage of flow.stages) {
    const relations = getTaskRelations(flow, stage);
    for (const relation of relations) {
      const from = taskCenterMap.get(relation.fromTaskId);
      const to = taskCenterMap.get(relation.toTaskId);
      if (!from || !to) continue;
      taskLinks.push({
        stageId: stage.id,
        from: { x: from.x, y: from.bottomY },
        to: { x: to.x, y: to.topY },
        label: relation.label,
      });
    }
  }

  const stageMap = new Map(stages.map((stage) => [stage.id, stage]));
  const stageLinks: StageLink[] = [];
  for (const relation of getPrimaryStageRelations(flow)) {
    const fromStage = stageMap.get(relation.fromStageId);
    const toStage = stageMap.get(relation.toStageId);
    if (!fromStage || !toStage) continue;
    stageLinks.push({
      from: {
        x: fromStage.x + fromStage.width,
        y: fromStage.y + STAGE_HEADER_H / 2,
      },
      to: {
        x: toStage.x,
        y: toStage.y + STAGE_HEADER_H / 2,
      },
    });
  }

  return { stages, taskLinks, stageLinks };
}

function getBounds(stages: StageLayout[]) {
  if (stages.length === 0) {
    return { minX: 0, minY: 0, maxX: 1200, maxY: 600, width: 1200, height: 600 };
  }

  const minX = stages[0].x;
  const minY = stages[0].y;
  const lastStage = stages[stages.length - 1];
  const maxX = lastStage.x + lastStage.width;
  const maxY = Math.max(...stages.map((stage) => stage.y + stage.height));
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

function stageRelationPath(from: { x: number; y: number }, to: { x: number; y: number }): string {
  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
}

function verticalFlowPath(from: { x: number; y: number }, to: { x: number; y: number }): string {
  return `M ${from.x} ${from.y} L ${from.x} ${to.y - 14} L ${to.x} ${to.y - 14} L ${to.x} ${to.y}`;
}

function stageStatus(tasks: FlowTask[]): NodeStatus {
  if (tasks.some((task) => task.status === 'active')) return 'active';
  if (tasks.length > 0 && tasks.every((task) => task.status === 'done' || task.status === 'accepted')) {
    return 'done';
  }
  if (tasks.some((task) => task.status === 'rejected')) return 'rejected';
  return 'pending';
}

function FileBadge({ file }: { file: FileInfo }) {
  const colorClass =
    FILE_BADGE_COLORS[file.type] ?? 'bg-[var(--border)]/30 text-[var(--muted-foreground)]';
  const shortPath = file.path.length > 26 ? `${file.path.slice(0, 24)}…` : file.path;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-[2px] text-[9px] font-mono leading-tight ${colorClass}`}
      title={file.path}
    >
      <span className="font-bold uppercase opacity-70">{file.type}</span>
      <span className="opacity-80">{shortPath}</span>
    </span>
  );
}

function RatingStars({ rating, size = 12 }: { rating: number; size?: number }) {
  if (rating === 0) return null;
  return (
    <span className="inline-flex items-center gap-[1px]">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          fill={star <= rating ? 'var(--execution-status-active)' : 'none'}
          stroke={
            star <= rating
              ? 'var(--execution-status-active)'
              : 'var(--execution-card-stroke-muted)'
          }
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}

function GateIndicator({ status }: { status: string }) {
  const color = GATE_DOT_COLORS[status] ?? 'var(--execution-card-stroke-muted)';
  return (
    <span
      className={`inline-block h-1.5 w-1.5 rounded-full ${status === 'running' ? 'animate-pulse' : ''}`}
      style={{ backgroundColor: color }}
    />
  );
}

function GateDots({ gateStates }: { gateStates: Array<{ type: string; status: string }> }) {
  if (gateStates.length === 0) return null;
  return (
    <div className="flex items-center gap-2">
      {gateStates.map((gateState) => (
        <div key={gateState.type} className="flex items-center gap-1">
          <GateIndicator status={gateState.status} />
          <span className="text-[8px] font-bold uppercase text-[var(--muted-foreground)] opacity-60">
            {GATE_LABELS[gateState.type] ?? gateState.type}
          </span>
        </div>
      ))}
    </div>
  );
}

function PhaseBadge({ phase }: { phase: string }) {
  const label = EXECUTION_PHASE_LABELS[phase];
  if (!label) return null;
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--execution-chip-border)]/15 bg-[var(--execution-chip-muted-bg)] px-2 py-[3px] text-[8px] font-bold uppercase tracking-[0.16em] text-[var(--text-main)]">
      {label}
    </span>
  );
}

function ActiveFileSummary({ activeFiles, latestEvent }: { activeFiles: string[]; latestEvent: string }) {
  if (activeFiles.length === 0 && !latestEvent) return null;
  return (
    <div className="mt-1 space-y-1">
      {activeFiles.length > 0 && (
        <code className="block truncate text-[9px] text-[var(--execution-status-active)] opacity-75">
          {activeFiles[0]}
          {activeFiles.length > 1 ? ` +${activeFiles.length - 1}` : ''}
        </code>
      )}
      {!activeFiles.length && latestEvent && (
        <div className="line-clamp-1 text-[9px] text-[var(--muted-foreground)] opacity-75">
          {latestEvent}
        </div>
      )}
    </div>
  );
}

interface FlowchartCanvasProps {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

export default function FlowchartCanvas({ nodes }: FlowchartCanvasProps) {
  const { t } = useTranslation();
  const { state, updateUI } = useWorkbench();
  const flow = getExecutionFlow(state);

  const feedbackRatings = state.feedback
    .filter((entry): entry is typeof entry & { rating: number } => entry.rating != null)
    .map((entry) => ({ nodeId: entry.nodeId, rating: entry.rating }));

  const layout = flow ? buildLayout(flow, nodes, feedbackRatings) : null;
  const containerRef = useRef<HTMLDivElement>(null);

  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);

  const layoutSig = layout
    ? layout.stages.map((stage) => `${stage.id}:${stage.tasks.length}`).join('|')
    : 'empty';

  function fitToView(forceK?: number) {
    const element = containerRef.current;
    if (!element || !layout) return;
    const rect = element.getBoundingClientRect();
    const bounds = getBounds(layout.stages);

    let nextK = forceK;
    if (nextK === undefined) {
      const availableWidth = Math.max(rect.width - VIEWPORT_PAD_X * 2, 1);
      const availableHeight = Math.max(rect.height - VIEWPORT_PAD_Y * 2, 1);
      nextK = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, Math.min(availableWidth / bounds.width, availableHeight / bounds.height)),
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
    const element = containerRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const factor = dir === 'in' ? 1.15 : 1 / 1.15;
    scaleAtPoint(rect.width / 2, rect.height / 2, transform.k * factor);
  }

  useEffect(() => {
    fitToView(1);
  }, [layoutSig]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const handleWheelRaw = (event: WheelEvent) => {
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        const delta = -event.deltaY;
        const factor = 1.1 ** (delta / 100);
        const rect = element.getBoundingClientRect();
        scaleAtPoint(event.clientX - rect.left, event.clientY - rect.top, transform.k * factor);
      } else {
        setTransform((prev) => ({ ...prev, x: prev.x - event.deltaX, y: prev.y - event.deltaY }));
      }
    };
    element.addEventListener('wheel', handleWheelRaw, { passive: false });
    return () => element.removeEventListener('wheel', handleWheelRaw);
  }, [transform.k]);

  const selectedId = state.ui.selectedNodeId;

  if (!flow || !layout) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-[13px] text-[var(--muted-foreground)]">
        Missing `executionFlow` metadata for executing plan. Regenerate the plan data.
      </div>
    );
  }

  const handleMouseDown = (event: React.MouseEvent) => {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest('[data-card]')) return;
    setIsDragging(true);
    setDragStart({ x: event.clientX - transform.x, y: event.clientY - transform.y });
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isDragging) return;
    setTransform((prev) => ({ ...prev, x: event.clientX - dragStart.x, y: event.clientY - dragStart.y }));
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleBgClick = (event: React.MouseEvent | React.KeyboardEvent) => {
    if ((event.target as HTMLElement).closest('[data-card]')) return;
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
      onKeyDown={(event) => {
        if (event.key === 'Enter') handleBgClick(event);
      }}
      style={{
        backgroundPosition: `${transform.x}px ${transform.y}px`,
        backgroundSize: `${24 * transform.k}px ${24 * transform.k}px`,
      }}
    >
      <svg width="100%" height="100%" style={{ display: 'block', overflow: 'hidden' }}>
        <defs>
          <marker
            id="flow-arrowhead"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--execution-link-stroke)" />
          </marker>
        </defs>

        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
          {layout.stageLinks.map((link, index) => {
            const pathStr = stageRelationPath(link.from, link.to);
            return (
              <g key={`stage-link-${index}`}>
                <path
                  d={pathStr}
                  fill="none"
                  stroke="var(--execution-link-glow)"
                  strokeWidth={3}
                  className="opacity-60"
                  style={{ filter: 'blur(3px)' }}
                />
                <path
                  d={pathStr}
                  fill="none"
                  stroke="var(--execution-link-stroke)"
                  strokeWidth={1.5}
                  markerEnd="url(#flow-arrowhead)"
                  opacity={0.9}
                />
              </g>
            );
          })}

          {layout.stages.map((stage) => {
            const status = stageStatus(stage.tasks);
            const statusConfig = STATUS_CONFIG[status];
            const stageTaskLinks = layout.taskLinks.filter((link) => link.stageId === stage.id);

            return (
              <g key={stage.id}>
                <rect
                  x={stage.x}
                  y={stage.y}
                  width={stage.width}
                  height={stage.height}
                  rx={28}
                  ry={28}
                  fill="var(--execution-panel-bg)"
                  stroke={status === 'active' ? 'var(--execution-status-active)' : 'var(--execution-panel-divider)'}
                  strokeWidth={status === 'active' ? 2 : 1.5}
                  style={{ filter: 'var(--execution-card-shadow)' }}
                />
                <rect
                  x={stage.x}
                  y={stage.y}
                  width={stage.width}
                  height={STAGE_HEADER_H}
                  rx={28}
                  ry={28}
                  fill="var(--execution-panel-subtle-bg)"
                />
                <rect
                  x={stage.x}
                  y={stage.y + STAGE_HEADER_H - 28}
                  width={stage.width}
                  height={28}
                  fill="var(--execution-panel-subtle-bg)"
                  stroke="none"
                />
                <foreignObject
                  x={stage.x + 20}
                  y={stage.y + 16}
                  width={stage.width - 40}
                  height={STAGE_HEADER_H - 20}
                >
                  <div className="flex h-full flex-col justify-between">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div
                          className="truncate text-[17px] font-bold text-[var(--text-main)]"
                          style={{ fontFamily: 'var(--font-display), sans-serif' }}
                        >
                          {stage.name}
                        </div>
                        {stage.description && (
                          <div className="mt-1 line-clamp-2 text-[11px] leading-5 text-[var(--muted-foreground)]">
                            {stage.description}
                          </div>
                        )}
                      </div>
                      <span
                        className="inline-flex shrink-0 items-center rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em]"
                        style={{
                          borderColor: statusConfig.border,
                          color: statusConfig.accent,
                          background: 'var(--execution-chip-muted-bg)',
                        }}
                      >
                        {stage.tasks.length} tasks
                      </span>
                    </div>
                  </div>
                </foreignObject>

                {stage.tasks.length > 0 && (
                  <>
                    <path
                      d={`M ${stage.x + stage.width / 2} ${stage.flowStartY} L ${stage.x + stage.width / 2} ${stage.flowEndY}`}
                      fill="none"
                      stroke="var(--execution-link-stroke)"
                      strokeWidth={1.25}
                      opacity={0.22}
                    />
                    <circle
                      cx={stage.x + stage.width / 2}
                      cy={stage.flowStartY}
                      r={FLOW_NODE_RADIUS}
                      fill="var(--execution-panel-bg)"
                      stroke="var(--execution-link-stroke)"
                      strokeWidth={1.5}
                    />
                    <circle
                      cx={stage.x + stage.width / 2}
                      cy={stage.flowEndY}
                      r={FLOW_NODE_RADIUS}
                      fill="var(--execution-panel-bg)"
                      stroke="var(--execution-link-stroke)"
                      strokeWidth={1.5}
                    />
                    {stageTaskLinks.map((link, index) => {
                      const pathStr = verticalFlowPath(link.from, link.to);
                      return (
                        <g key={`${stage.id}-task-link-${index}`}>
                          <path
                            d={pathStr}
                            fill="none"
                            stroke="var(--execution-link-stroke)"
                            strokeWidth={1.5}
                            markerEnd="url(#flow-arrowhead)"
                            opacity={0.78}
                          />
                          <circle
                            cx={link.from.x}
                            cy={link.from.y}
                            r={3}
                            fill="var(--execution-panel-bg)"
                            stroke="var(--execution-link-stroke)"
                            strokeWidth={1.25}
                          />
                          {shouldRenderLinkLabel(link.label) ? (
                            <foreignObject
                              x={link.from.x - 26}
                              y={(link.from.y + link.to.y) / 2 - 10}
                              width={52}
                              height={18}
                            >
                              <div className="inline-flex h-4 items-center justify-center rounded-full bg-[var(--execution-panel-bg)] px-1.5 text-[8px] font-bold uppercase tracking-[0.14em] text-[var(--muted-foreground)] shadow-sm">
                                {link.label}
                              </div>
                            </foreignObject>
                          ) : null}
                        </g>
                      );
                    })}
                  </>
                )}

                {stage.tasks.map((task) => {
                  const config = STATUS_CONFIG[task.status];
                  const isSelected = selectedId === task.id;
                  const isDone = task.status === 'done';
                  const isRejected = task.status === 'rejected';
                  const StatusIcon = config.icon;
                  const isFocused = focusedTaskId === task.id && !isSelected;

                  return (
                    <g
                      key={task.id}
                      data-card
                      onClick={(event) => {
                        event.stopPropagation();
                        updateUI({ selectedNodeId: task.id, rightSidebarOpen: true });
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          event.stopPropagation();
                          updateUI({ selectedNodeId: task.id, rightSidebarOpen: true });
                        }
                      }}
                      onFocus={() => setFocusedTaskId(task.id)}
                      onBlur={() => setFocusedTaskId((current) => (current === task.id ? null : current))}
                      aria-label={task.label}
                      className="group cursor-pointer outline-none"
                      role="button"
                      tabIndex={0}
                    >
                      {isFocused && (
                        <rect
                          x={task.x - 4}
                          y={task.y - 4}
                          width={TASK_W + 8}
                          height={task.h + 8}
                          rx={24}
                          ry={24}
                          fill="none"
                          stroke="var(--execution-card-stroke-hover)"
                          strokeWidth={2}
                          opacity={0.65}
                        />
                      )}
                      {isSelected && (
                        <rect
                          x={task.x - 4}
                          y={task.y - 4}
                          width={TASK_W + 8}
                          height={task.h + 8}
                          rx={24}
                          ry={24}
                          fill="color-mix(in srgb, var(--execution-card-stroke-hover) 10%, transparent)"
                        />
                      )}
                      <rect
                        x={task.x}
                        y={task.y}
                        width={TASK_W}
                        height={task.h}
                        rx={22}
                        ry={22}
                        fill={
                          isSelected
                            ? 'var(--execution-card-fill-emphasis)'
                            : task.status === 'active'
                              ? 'var(--execution-card-fill-active)'
                              : 'var(--execution-card-fill)'
                        }
                        stroke={
                          isSelected
                            ? 'var(--execution-card-stroke-hover)'
                            : task.status === 'active'
                              ? 'var(--execution-status-active)'
                              : config.border
                        }
                        strokeWidth={isSelected ? 2 : 1.5}
                        style={{ filter: 'var(--execution-card-shadow)' }}
                      />
                      <foreignObject
                        x={task.x + 14}
                        y={task.y + 14}
                        width={TASK_W - 28}
                        height={task.h - 20}
                        style={{ pointerEvents: 'none' }}
                      >
                        <div className="flex h-full flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <StatusIcon
                              size={14}
                              strokeWidth={2.4}
                              className="shrink-0"
                              style={{ color: isDone ? 'var(--execution-status-done)' : config.accent }}
                            />
                            <span
                              className={`min-w-0 flex-1 truncate text-[13px] font-extrabold ${isRejected ? 'line-through' : ''}`}
                              style={{
                                color: isDone ? 'var(--execution-status-done)' : 'var(--text-main)',
                                fontFamily: 'var(--font-display), sans-serif',
                              }}
                            >
                              {task.label}
                            </span>
                            {task.progress > 0 && (
                              <span className="shrink-0 text-[10px] font-semibold tabular-nums text-[var(--muted-foreground)]">
                                {Math.round(task.progress * 100)}%
                              </span>
                            )}
                          </div>

                          {task.goal && (
                            <div className="line-clamp-2 text-[11px] leading-relaxed text-[var(--muted-foreground)]">
                              {task.goal}
                            </div>
                          )}

                          {(task.executionPhase && task.executionPhase !== 'idle') ||
                          task.activeFiles.length > 0 ||
                          task.latestEvent ? (
                            <div className="mt-1">
                              {task.executionPhase && task.executionPhase !== 'idle' && (
                                <PhaseBadge phase={task.executionPhase} />
                              )}
                              <ActiveFileSummary
                                activeFiles={task.activeFiles}
                                latestEvent={task.latestEvent}
                              />
                            </div>
                          ) : null}

                          {task.stepCount > 0 && (
                            <div className="text-[10px] text-[var(--muted-foreground)] opacity-60">
                              {task.stepCount} {task.stepCount === 1 ? 'step' : 'steps'}
                            </div>
                          )}

                          {task.files.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {task.files.slice(0, 2).map((file) => (
                                <FileBadge key={file.path} file={file} />
                              ))}
                              {task.files.length > 2 && (
                                <span className="text-[9px] text-[var(--muted-foreground)] opacity-50">
                                  +{task.files.length - 2}
                                </span>
                              )}
                            </div>
                          )}

                          {task.gateStates.length > 0 && (
                            <div className="mt-auto pt-1">
                              <GateDots gateStates={task.gateStates} />
                            </div>
                          )}

                          {task.rating > 0 && (
                            <div className="mt-auto">
                              <RatingStars rating={task.rating} size={11} />
                            </div>
                          )}
                        </div>
                      </foreignObject>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </g>
      </svg>

      <div className="absolute bottom-4 right-4 flex items-center gap-2">
        <div className="rounded-full border border-[var(--border)] bg-[var(--bg-main)]/88 px-3 py-1 text-[11px] font-medium text-[var(--text-main)] shadow-sm backdrop-blur">
          {Math.round(transform.k * 100)}%
        </div>
        <div className="flex items-center gap-1 rounded-full border border-[var(--execution-chip-border)]/15 bg-[var(--execution-panel-bg)]/88 p-1 shadow-sm backdrop-blur">
          <button
            type="button"
            onClick={() => stepZoom('out')}
            title={t('canvas.zoomOut')}
            aria-label={t('canvas.zoomOut')}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-main)] opacity-70 transition hover:bg-[var(--border)]/50 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-2"
          >
            <Minus size={14} />
          </button>
          <button
            type="button"
            onClick={() => stepZoom('in')}
            title={t('canvas.zoomIn')}
            aria-label={t('canvas.zoomIn')}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-main)] opacity-70 transition hover:bg-[var(--border)]/50 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-2"
          >
            <Plus size={14} />
          </button>
          <button
            type="button"
            onClick={() => fitToView()}
            title={t('canvas.fitView')}
            aria-label={t('canvas.fitView')}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-main)] opacity-70 transition hover:bg-[var(--border)]/50 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-2"
          >
            <Crosshair size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
