import type {
  CanvasNode,
  ExecutionCanvasMetadata,
  ExecutionEvent,
  ExecutionFlow,
  ExecutionFlowStage,
  ExecutionFlowStageRelation,
  ExecutionFlowTaskRelation,
  ExecutionPhase,
  NodeStatus,
  PlanStepFile,
  QualityGateState,
} from '@supermech/schema';
import {
  getCompletionChecks,
  getExecutionFlow as getExecutionFlowFromMetadata,
  getExecutionOrigin,
  getParallelRuns,
} from '@supermech/schema';
import {
  Crosshair,
  Minus,
  Plus,
  Star,
  Route,
  Filter,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorkbench } from '../../context/WorkbenchContext.tsx';
import { getTaskMeta } from './DetailPanel.tsx';

// 拼音/英文辅助转换器，为静态地铁站牌标签赋予微缩双语拼音细节
function getStationSublabel(label: string): string {
  const dict: Record<string, string> = {
    '设': 'SHE', '计': 'JI',
    '数': 'SHU', '据': 'JU', '库': 'KU',
    '校': 'XIAO', '验': 'YAN',
    '规': 'GUI', '则': 'ZE',
    '测': 'CE', '试': 'SHI',
    '用': 'YONG', '例': 'LI',
    '组': 'ZU', '件': 'JIAN',
    '运': 'YUN', '行': 'XING',
    '编': 'BIAN', '写': 'XIE',
    '部': 'BU', '署': 'SHU',
    '代': 'DAI', '码': 'MA',
    '实': 'SHI', '现': 'XIAN',
    '优': 'YOU', '化': 'HUA',
    '逻': 'LUO', '辑': 'JI',
    '架': 'JIA', '构': 'GOU',
    '检': 'JIAN', '查': 'CHA',
    '证': 'ZHENG',
    '模': 'MO', '型': 'XING',
    '创': 'CHUANG', '建': 'JIAN',
    '执': 'ZHI',
    '开': 'KAI', '发': 'FA',
    '工': 'GONG', '程': 'CHENG',
  };

  let pinyin = '';
  for (let i = 0; i < label.length; i++) {
    const char = label[i];
    if (dict[char]) {
      pinyin += dict[char] + ' ';
    } else {
      // 英文数字保持
      if (/[a-zA-Z0-9]/.test(char)) {
        pinyin += char;
      }
    }
  }

  pinyin = pinyin.trim();
  if (pinyin.length > 0) {
    return pinyin.toUpperCase();
  }

  // 兜底：处理为首字母大写
  return label.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}


// 基础布局常量（复用 FlowchartCanvas 坐标系以确保 100% 兼容性）
const STAGE_W = 368;
const STAGE_MIN_H = 220;
const STAGE_GAP = 96;
const STAGE_HEADER_H = 82;
const STAGE_PAD_Y = 20;
const FLOW_RAIL_TOP_GAP = 18;
const FLOW_RAIL_BOTTOM_GAP = 18;
const FLOW_NODE_RADIUS = 9;
const TASK_W = 296;
const TASK_GAP = 28; // 稍微拉开站距，使得地铁线更为舒展
const PAD_X = 84;
const PAD_Y = 112;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.5;
const VIEWPORT_PAD_X = 72;
const VIEWPORT_PAD_Y = 64;

// 地铁线路分类与色彩系统
type SubwayLineType = 'logic' | 'dev' | 'qa' | 'ops';

const LINE_CONFIG: Record<SubwayLineType, { color: string; label: string; lineNameKey: string; shortNameKey: string }> = {
  logic: {
    color: '#ff9f43', // 活力橙 (Orange Line)
    label: 'Logic & Schema Line',
    lineNameKey: 'canvas.orangeLine',
    shortNameKey: 'canvas.orangeLineShort',
  },
  dev: {
    color: '#228be6', // 科技蓝 (Blue Line)
    label: 'Feature & Dev Line',
    lineNameKey: 'canvas.blueLine',
    shortNameKey: 'canvas.blueLineShort',
  },
  qa: {
    color: '#40c057', // 安全绿 (Green Line)
    label: 'Testing & Quality Line',
    lineNameKey: 'canvas.greenLine',
    shortNameKey: 'canvas.greenLineShort',
  },
  ops: {
    color: '#ae3ec9', // 运维紫 (Purple Line)
    label: 'Ops & Delivery Line',
    lineNameKey: 'canvas.purpleLine',
    shortNameKey: 'canvas.purpleLineShort',
  },
};

// 站点的横向偏置，产生蜿蜒错落的轨道交通视觉感
const LINE_OFFSETS: Record<SubwayLineType, number> = {
  logic: -50,
  dev: 0,
  qa: 50,
  ops: -25,
};

interface FileInfo extends PlanStepFile {}

interface MetroTask {
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
  lineType: SubwayLineType;
  x: number; // 原始卡片X
  y: number; // 原始卡片Y
  h: number; // 原始卡片H
  stationX: number; // 地铁站精细定位X
  stationY: number; // 地铁站精细定位Y
}

interface MetroStageLayout {
  id: string;
  name: string;
  description?: string;
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  tasks: MetroTask[];
  flowStartY: number;
  flowEndY: number;
  hubX: number; // 换乘中心X
  hubY: number; // 换乘中心Y
  stage: ExecutionFlowStage;
}

interface MetroLink {
  from: { x: number; y: number };
  to: { x: number; y: number };
  lineType: SubwayLineType;
  isActive: boolean;
}

interface StageLink {
  from: { x: number; y: number };
  to: { x: number; y: number };
}

// 自动根据任务特征分类地铁线路
function classifySubwayLine(label: string, files: FileInfo[]): SubwayLineType {
  const lowerLabel = label.toLowerCase();
  const filesStr = files.map((f) => f.path.toLowerCase()).join(' ');

  if (
    lowerLabel.includes('schema') ||
    lowerLabel.includes('validation') ||
    lowerLabel.includes('db') ||
    lowerLabel.includes('zod') ||
    lowerLabel.includes('model') ||
    filesStr.includes('schema') ||
    filesStr.includes('validation') ||
    filesStr.includes('zod')
  ) {
    return 'logic';
  }

  if (
    lowerLabel.includes('test') ||
    lowerLabel.includes('qa') ||
    lowerLabel.includes('spec') ||
    lowerLabel.includes('lint') ||
    lowerLabel.includes('check') ||
    filesStr.includes('test') ||
    filesStr.includes('spec') ||
    filesStr.includes('lint')
  ) {
    return 'qa';
  }

  if (
    lowerLabel.includes('skill') ||
    lowerLabel.includes('agent') ||
    lowerLabel.includes('doc') ||
    lowerLabel.includes('readme') ||
    lowerLabel.includes('publish') ||
    lowerLabel.includes('deploy') ||
    filesStr.includes('skill') ||
    filesStr.includes('doc') ||
    filesStr.includes('readme')
  ) {
    return 'ops';
  }

  return 'dev';
}

function calculateTaskHeight(task: Pick<MetroTask, 'label' | 'goal' | 'files' | 'stepCount' | 'gateStates' | 'executionPhase' | 'activeFiles' | 'latestEvent' | 'rating'>): number {
  let height = 84;
  const titleLines = Math.max(1, Math.ceil(task.label.length / 22));
  height += titleLines * 18;

  if (task.goal) {
    const goalLines = Math.max(1, Math.ceil(task.goal.length / 34));
    height += Math.min(goalLines, 3) * 15;
  }

  if (task.executionPhase && task.executionPhase !== 'idle') height += 20;
  if (task.activeFiles.length > 0 || task.latestEvent) height += 16;
  if (task.stepCount > 0) height += 16;
  if (task.files.length > 0) height += 22 + Math.min(task.files.length, 2) * 14;
  if (task.gateStates.length > 0) height += 18;
  if (task.rating > 0) height += 16;

  return Math.max(height, 116);
}

function getCanvasExecutionMeta(metadata: Record<string, unknown> | undefined): ExecutionCanvasMetadata {
  return {
    executionFlow: getExecutionFlowFromMetadata(metadata),
    executionOrigin: getExecutionOrigin(metadata),
    parallelRuns: getParallelRuns(metadata),
  };
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
  const relations = (flow.taskRelations ?? []).filter(
    (relation) =>
      stage.taskIds.includes(relation.fromTaskId) && stage.taskIds.includes(relation.toTaskId),
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

// 核心地铁布局构建器
function buildMetroLayout(
  flow: ExecutionFlow,
  nodes: CanvasNode[],
  feedback: { nodeId: string; rating: number }[],
): {
  stages: MetroStageLayout[];
  metroLinks: MetroLink[];
  stageLinks: StageLink[];
} {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const ratingMap = new Map<string, number>();
  for (const fb of feedback) {
    ratingMap.set(fb.nodeId, Math.max(ratingMap.get(fb.nodeId) ?? 0, fb.rating));
  }

  const stageDrafts = flow.stages.map((stage, index) => {
    const tasks: MetroTask[] = [];
    const stageX = PAD_X + index * (STAGE_W + STAGE_GAP);
    const taskX = stageX + (STAGE_W - TASK_W) / 2;
    const flowStartY = PAD_Y + STAGE_HEADER_H + STAGE_PAD_Y + FLOW_RAIL_TOP_GAP;
    let currentY = flowStartY + FLOW_NODE_RADIUS + 18;

    for (const taskId of stage.taskIds) {
      const node = nodeMap.get(taskId);
      if (!node) continue;
      const meta = getTaskMeta(node);
      const files = meta.files;
      const steps = meta.implementationSteps;
      const gateStates: QualityGateState[] = meta.gateStates;
      const executionPhase: ExecutionPhase | '' = meta.executionPhase ?? '';
      const activeFiles = meta.activeFiles;
      const executionEvents: ExecutionEvent[] = meta.executionEvents;
      const latestEvent =
        executionEvents.length > 0
          ? (executionEvents[executionEvents.length - 1]?.message ?? '')
          : '';
      const goal = (meta.goal ?? meta.description ?? '').trim();

      const lineType = classifySubwayLine(node.label, files);
      const offset = LINE_OFFSETS[lineType];
      const stationX = stageX + STAGE_W / 2 + offset;

      const baseTask = {
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
        lineType,
        x: taskX,
        y: currentY,
        h: 0,
        stationX,
        stationY: 0,
      };

      baseTask.h = calculateTaskHeight(baseTask);
      baseTask.stationY = currentY + baseTask.h / 2;

      tasks.push(baseTask);
      currentY += baseTask.h + TASK_GAP;
    }

    const flowEndY =
      tasks.length > 0
        ? tasks[tasks.length - 1].y + tasks[tasks.length - 1].h + FLOW_RAIL_BOTTOM_GAP
        : flowStartY + 110;

    return {
      stage,
      x: stageX,
      naturalHeight: Math.max(STAGE_MIN_H, flowEndY - PAD_Y + STAGE_PAD_Y),
      tasks,
      flowStartY,
      flowEndY,
    };
  });

  const stages: MetroStageLayout[] = stageDrafts.map(
    ({ stage, x, naturalHeight, tasks, flowStartY, flowEndY }, index) => ({
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
      hubX: x + STAGE_W / 2,
      hubY: PAD_Y + 58,
      stage,
    }),
  );

  const taskMap = new Map<string, MetroTask>();
  for (const stage of stages) {
    for (const task of stage.tasks) {
      taskMap.set(task.id, task);
    }
  }

  // 构建地铁轨道连线
  const metroLinks: MetroLink[] = [];
  for (const stage of stages) {
    const relations = getTaskRelations(flow, stage.stage);
    for (const relation of relations) {
      const fromTask = taskMap.get(relation.fromTaskId);
      const toTask = taskMap.get(relation.toTaskId);
      if (!fromTask || !toTask) continue;

      metroLinks.push({
        from: { x: fromTask.stationX, y: fromTask.stationY },
        to: { x: toTask.stationX, y: toTask.stationY },
        lineType: toTask.lineType,
        isActive: toTask.status === 'active' || fromTask.status === 'active',
      });
    }

    // 将换乘中心 (Hub) 与 stage 的首个节点连接
    if (stage.tasks.length > 0) {
      const firstTask = stage.tasks[0];
      metroLinks.push({
        from: { x: stage.hubX, y: stage.hubY + 12 },
        to: { x: firstTask.stationX, y: firstTask.stationY },
        lineType: firstTask.lineType,
        isActive: firstTask.status === 'active',
      });
    }
  }

  // 阶段间横向主干线连接
  const stageMap = new Map(stages.map((stage) => [stage.id, stage]));
  const stageLinks: StageLink[] = [];
  for (const relation of getPrimaryStageRelations(flow)) {
    const fromStage = stageMap.get(relation.fromStageId);
    const toStage = stageMap.get(relation.toStageId);
    if (!fromStage || !toStage) continue;
    stageLinks.push({
      from: { x: fromStage.hubX, y: fromStage.hubY },
      to: { x: toStage.hubX, y: toStage.hubY },
    });
  }

  return { stages, metroLinks, stageLinks };
}

function getBounds(stages: MetroStageLayout[]) {
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

// 渲染经典地铁制图规范 (Transit Map Design) 八向走轨路线 (Octolinear Route Layout): 仅允许 90度(垂直) 与 45度(倾斜) 的走线
function getMetroPath(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0) {
    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  }

  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  const direction = dx > 0 ? 1 : -1;
  const r = 16; // 轨道转角圆滑过渡半径

  // 在纵向布局中：从起点垂直下行 -> 45度斜跨过渡到新 X 轨道 -> 垂直下行到终点
  // 45度过渡在 Y 轴上消耗的距离恰好为 absDx。总垂直距离必须大于 absDx + 2 * r 才能进行完美 45度 转弯。
  if (absDy > absDx + 2 * r) {
    const yTransitionStart = from.y + (absDy - absDx) / 2;
    const yTransitionEnd = yTransitionStart + absDx;

    // 圆滑转折控制点计算
    const p1_y = yTransitionStart - r;
    const p2_x = from.x + r * direction;
    const p2_y = yTransitionStart + r;

    const p3_x = to.x - r * direction;
    const p3_y = yTransitionEnd - r;
    const p4_y = yTransitionEnd + r;

    return `M ${from.x} ${from.y} ` +
           `L ${from.x} ${p1_y} ` +
           `Q ${from.x} ${yTransitionStart} ${p2_x} ${p2_y} ` +
           `L ${p3_x} ${p3_y} ` +
           `Q ${to.x} ${yTransitionEnd} ${to.x} ${p4_y} ` +
           `L ${to.x} ${to.y}`;
  } else {
    // 垂直距离极其有限时，平滑退化为三次贝塞尔曲线过渡以避免轨道严重畸变
    const controlOffset = Math.min(absDy * 0.5, 60);
    return `M ${from.x} ${from.y} C ${from.x} ${from.y + controlOffset}, ${to.x} ${to.y - controlOffset}, ${to.x} ${to.y}`;
  }
}


function stageStatus(tasks: MetroTask[]): NodeStatus {
  if (tasks.some((task) => task.status === 'active')) return 'active';
  if (
    tasks.length > 0 &&
    tasks.every((task) => task.status === 'done' || task.status === 'accepted')
  ) {
    return 'done';
  }
  if (tasks.some((task) => task.status === 'rejected')) return 'rejected';
  return 'pending';
}

// 辅助子组件复用与增强
function FileBadge({ file }: { file: FileInfo }) {
  const shortPath = file.path.length > 20 ? `…${file.path.slice(-18)}` : file.path;
  const badgeColors: Record<string, string> = {
    create: 'bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] text-[var(--primary)] border-[color-mix(in_srgb,var(--primary)_30%,transparent)]',
    modify: 'bg-[color-mix(in_srgb,var(--amber)_15%,transparent)] text-[var(--amber)] border-[color-mix(in_srgb,var(--amber)_30%,transparent)]',
    test: 'bg-[color-mix(in_srgb,var(--success)_15%,transparent)] text-[var(--success)] border-[color-mix(in_srgb,var(--success)_30%,transparent)]',
    delete: 'bg-[var(--execution-chip-muted-bg)] text-[var(--muted-foreground)] border-transparent',
  };
  const colorClass = badgeColors[file.type] ?? 'bg-[var(--border)]/20 text-[var(--muted-foreground)] border-transparent';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-[1px] text-[8.5px] font-mono leading-tight ${colorClass}`}
      title={file.path}
    >
      <span className="font-extrabold uppercase opacity-80">{file.type}</span>
      <span className="opacity-90">{shortPath}</span>
    </span>
  );
}

function RatingStars({ rating, size = 11 }: { rating: number; size?: number }) {
  if (rating === 0) return null;
  return (
    <span className="inline-flex items-center gap-[1px]">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          fill={star <= rating ? 'var(--execution-status-active)' : 'none'}
          stroke={
            star <= rating ? 'var(--execution-status-active)' : 'var(--execution-card-stroke-muted)'
          }
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}

function GateIndicator({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'var(--execution-card-stroke-muted)',
    running: 'var(--execution-status-active)',
    passed: 'var(--execution-status-accepted)',
    failed: '#ef4444',
    skipped: 'var(--muted-foreground)',
  };
  const color = colors[status] ?? 'var(--execution-card-stroke-muted)';
  return (
    <span
      className={`inline-block h-1.5 w-1.5 rounded-full ${status === 'running' ? 'animate-pulse' : ''}`}
      style={{ backgroundColor: color }}
    />
  );
}

function GateDots({ gateStates }: { gateStates: Array<{ type: string; status: string }> }) {
  if (gateStates.length === 0) return null;
  const gateLabels: Record<string, string> = { 'spec-review': 'SPEC', 'code-quality': 'QA' };
  return (
    <div className="flex items-center gap-2">
      {gateStates.map((gate) => (
        <div key={gate.type} className="flex items-center gap-1">
          <GateIndicator status={gate.status} />
          <span className="text-[8px] font-bold uppercase text-[var(--muted-foreground)] opacity-70">
            {gateLabels[gate.type] ?? gate.type}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function SubwayCanvas({ nodes }: { nodes: CanvasNode[] }) {
  const { t } = useTranslation();
  const { state, updateUI } = useWorkbench();
  const flow = getExecutionFlowFromMetadata(state.canvas.metadata);
  const parallelRuns = getParallelRuns(state.canvas.metadata);
  const canvasMeta = getCanvasExecutionMeta(state.canvas.metadata);
  const executionOrigin = canvasMeta.executionOrigin;
  const completionChecks = getCompletionChecks(state.canvas.metadata);
  const allCompletionChecksPassed =
    completionChecks.length > 0 && completionChecks.every((item) => item.status === 'passed');

  const feedbackRatings = state.feedback
    .filter((entry): entry is typeof entry & { rating: number } => entry.rating != null)
    .map((entry) => ({ nodeId: entry.nodeId, rating: entry.rating }));

  const layout = flow ? buildMetroLayout(flow, nodes, feedbackRatings) : null;
  const layoutSig = layout ? layout.stages.map((s) => `${s.id}:${s.tasks.length}`).join('|') : '';
  const containerRef = useRef<HTMLDivElement>(null);

  const [transform, setTransform] = useState({ x: 0, y: 0, k: 0.8 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [focusedLineType, setFocusedLineType] = useState<SubwayLineType | null>(null);

  const selectedId = state.ui.selectedNodeId;

  // 画布自适应大小调整
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
        Math.max(
          MIN_ZOOM,
          Math.min(availableWidth / bounds.width, availableHeight / bounds.height),
        ),
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

  // 依赖监听：初次或节点列变化时自适应
  useEffect(() => {
    fitToView(0.7);
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
        const anchorX = event.clientX - rect.left;
        const anchorY = event.clientY - rect.top;
        setTransform((prev) => {
          const clampedK = Math.min(Math.max(prev.k * factor, MIN_ZOOM), MAX_ZOOM);
          const dx = (anchorX - prev.x) / prev.k;
          const dy = (anchorY - prev.y) / prev.k;
          return { x: anchorX - dx * clampedK, y: anchorY - dy * clampedK, k: clampedK };
        });
      } else {
        setTransform((prev) => ({ ...prev, x: prev.x - event.deltaX, y: prev.y - event.deltaY }));
      }
    };
    element.addEventListener('wheel', handleWheelRaw, { passive: false });
    return () => element.removeEventListener('wheel', handleWheelRaw);
  }, []);

  if (!flow || !layout) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-[13px] text-[var(--muted-foreground)]">
        {t('editor.executionFlowMissing')}
      </div>
    );
  }

  const handleMouseDown = (event: React.MouseEvent) => {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest('[data-interactive]')) return;
    setIsDragging(true);
    setDragStart({ x: event.clientX - transform.x, y: event.clientY - transform.y });
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    if (!isDragging) return;
    setTransform((prev) => ({
      ...prev,
      x: event.clientX - dragStart.x,
      y: event.clientY - dragStart.y,
    }));
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleBgClick = (event: React.MouseEvent) => {
    if ((event.target as HTMLElement).closest('[data-interactive]')) return;
    updateUI({ selectedNodeId: null, rightSidebarOpen: false });
    setFocusedLineType(null);
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
      style={{
        backgroundPosition: `${transform.x}px ${transform.y}px`,
        backgroundSize: `${24 * transform.k}px ${24 * transform.k}px`,
      }}
    >
      {/* 嵌入动效 Style 块，完全自包含，零全局副作用 */}
      <style>{`
        @keyframes metro-pulse {
          0% { transform: scale(0.9); opacity: 0.35; }
          50% { transform: scale(1.3); opacity: 0.8; }
          100% { transform: scale(0.9); opacity: 0.35; }
        }
        @keyframes train-flow {
          from { stroke-dashoffset: 120; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes ripple-spread {
          0% { r: 10px; opacity: 0.65; }
          50% { opacity: 0.35; }
          100% { r: 26px; opacity: 0; }
        }
        .animate-metro-pulse {
          transform-origin: center;
          animation: metro-pulse 2s ease-in-out infinite;
        }
        .train-particle {
          stroke-dasharray: 24, 96; /* 延长车身拉大渐变对比度 */
          animation: train-flow 2s linear infinite;
        }
        .animate-ripple-1 {
          animation: ripple-spread 2.4s cubic-bezier(0.1, 0.8, 0.3, 1) infinite;
          transform-origin: center;
        }
        .animate-ripple-2 {
          animation: ripple-spread 2.4s cubic-bezier(0.1, 0.8, 0.3, 1) infinite;
          animation-delay: 0.8s;
          transform-origin: center;
        }
        .animate-ripple-3 {
          animation: ripple-spread 2.4s cubic-bezier(0.1, 0.8, 0.3, 1) infinite;
          animation-delay: 1.6s;
          transform-origin: center;
        }
      `}</style>

      <svg width="100%" height="100%" style={{ display: 'block', overflow: 'hidden' }}>
        <defs>
          {/* 主轨与支轨发光与偏置立体阴影滤镜，浅色模式下提供极佳的悬浮三维纵深感 */}
          <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.14" />
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          {/* 地铁路线指示箭头 */}
          <marker
            id="metro-arrow"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="4"
            markerHeight="4"
            orient="auto"
          >
            <path d="M 0 1 L 8 5 L 0 9 z" fill="var(--execution-stage-outline)" opacity={0.6} />
          </marker>

          {/* 4条线路专属的高速渐变激光列车流光渐变器 */}
          <linearGradient id="train-grad-logic" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={1} />
            <stop offset="25%" stopColor="#ffffff" stopOpacity={0.9} />
            <stop offset="70%" stopColor="#ff9f43" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#ff9f43" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="train-grad-dev" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={1} />
            <stop offset="25%" stopColor="#ffffff" stopOpacity={0.9} />
            <stop offset="70%" stopColor="#228be6" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#228be6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="train-grad-qa" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={1} />
            <stop offset="25%" stopColor="#ffffff" stopOpacity={0.9} />
            <stop offset="70%" stopColor="#40c057" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#40c057" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="train-grad-ops" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={1} />
            <stop offset="25%" stopColor="#ffffff" stopOpacity={0.9} />
            <stop offset="70%" stopColor="#ae3ec9" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#ae3ec9" stopOpacity={0} />
          </linearGradient>
        </defs>

        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
          
          {/* 1. 阶段连线：横向地铁主干快线 (Main Trunk Line) */}
          {layout.stageLinks.map((link, idx) => (
            <g key={`stage-trunk-${idx}`} opacity={focusedLineType !== null ? 0.25 : 1} style={{ transition: 'opacity 0.3s ease' }}>
              {/* 底层发光偏置阴影线 */}
              <line
                x1={link.from.x}
                y1={link.from.y}
                x2={link.to.x}
                y2={link.to.y}
                stroke="var(--primary)"
                strokeWidth={7}
                opacity={0.25}
                filter="url(#glow)"
              />
              {/* 实体银灰色干轨 */}
              <line
                x1={link.from.x}
                y1={link.from.y}
                x2={link.to.x}
                y2={link.to.y}
                stroke="var(--execution-stage-outline)"
                strokeWidth={3}
                opacity={0.88}
                markerEnd="url(#metro-arrow)"
              />
              {/* 地铁轨道枕木 (Sleepers) 极精细工艺纹理 */}
              <line
                x1={link.from.x}
                y1={link.from.y}
                x2={link.to.x}
                y2={link.to.y}
                stroke="var(--execution-stage-outline)"
                strokeWidth={9}
                strokeDasharray="1.5, 6.5"
                opacity={0.4}
              />
              <line
                x1={link.from.x}
                y1={link.from.y}
                x2={link.to.x}
                y2={link.to.y}
                stroke="var(--bg-canvas)"
                strokeWidth={1}
                strokeDasharray="4, 4"
                opacity={0.5}
              />
            </g>
          ))}

          {/* 2. 地铁分支线路 (Metro Subway Lines) */}
          {layout.metroLinks.map((link, idx) => {
            const lineCfg = LINE_CONFIG[link.lineType];
            const pathStr = getMetroPath(link.from, link.to);
            // 过滤淡化：非聚焦路线将变得极淡
            const isMuted = focusedLineType !== null && link.lineType !== focusedLineType;

            return (
              <g key={`metro-line-${idx}`} opacity={isMuted ? 0.06 : 1} style={{ transition: 'opacity 0.3s ease' }}>
                {/* 发光底轨 */}
                <path
                  d={pathStr}
                  fill="none"
                  stroke={lineCfg.color}
                  strokeWidth={6.5}
                  opacity={0.25}
                  filter="url(#glow)"
                />
                {/* 铁轨主路径 */}
                <path
                  d={pathStr}
                  fill="none"
                  stroke={lineCfg.color}
                  strokeWidth={3.5}
                  strokeLinecap="round"
                  opacity={0.9}
                />
                {/* 光速渐变列车 (仅在 active 且非 muted 时激发) */}
                {link.isActive && !isMuted && (
                  <path
                    d={pathStr}
                    fill="none"
                    stroke={`url(#train-grad-${link.lineType})`}
                    strokeWidth={4.5}
                    strokeLinecap="round"
                    className="train-particle"
                    opacity={0.95}
                    filter="url(#glow)"
                  />
                )}
              </g>
            );
          })}

          {/* 3. 渲染各个 Stage 区段（换乘区） */}
          {layout.stages.map((stage) => {
            const status = stageStatus(stage.tasks);
            const isStageActive = status === 'active';

            return (
              <g key={stage.id}>
                {/* 区域背景边界（极其微弱的虚线边界） */}
                <rect
                  x={stage.x + 8}
                  y={stage.y}
                  width={stage.width - 16}
                  height={stage.height}
                  rx={20}
                  fill="color-mix(in srgb, var(--execution-panel-bg) 3%, transparent)"
                  stroke="var(--execution-stage-outline)"
                  strokeWidth={1}
                  strokeDasharray="4, 12"
                  opacity={0.3}
                />

                {/* 阶段名称标签 - 采用精致半透明磨砂轨道遮罩 (Track Masking Badge)，物理避让与底衬完美协同 */}
                <foreignObject
                  x={stage.x + 10}
                  y={stage.y + 6}
                  width={stage.width - 20}
                  height={44}
                >
                  <div className="flex flex-col items-center text-center bg-[var(--bg-canvas)]/85 px-4 py-1.5 rounded-2xl border border-[var(--border)]/30 shadow-[0_4px_12px_-4px_rgba(0,0,0,0.15)] backdrop-blur-md">
                    <span className="text-[9px] font-extrabold tracking-[0.25em] uppercase text-[var(--muted-foreground)] opacity-70 leading-none">
                      ZONE {stage.index + 1}
                    </span>
                    <span className="text-[11px] font-black tracking-wide text-[var(--text-main)] mt-[2px] leading-tight">
                      {stage.name}
                    </span>
                  </div>
                </foreignObject>

                {/* 换乘枢纽站 (Transfer Hub) 渲染 */}
                <g>
                  {/* 外圈呼吸 */}
                  {isStageActive && (
                    <circle
                      cx={stage.hubX}
                      cy={stage.hubY}
                      r={18}
                      fill="none"
                      stroke="var(--primary)"
                      strokeWidth={1.5}
                      className="animate-metro-pulse"
                      opacity={0.4}
                    />
                  )}
                  {/* 枢纽环形体 */}
                  <circle
                    cx={stage.hubX}
                    cy={stage.hubY}
                    r={12}
                    fill="var(--bg-canvas)"
                    stroke={isStageActive ? 'var(--primary)' : 'var(--execution-stage-outline)'}
                    strokeWidth={4.5}
                    style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))' }}
                  />
                  <circle
                    cx={stage.hubX}
                    cy={stage.hubY}
                    r={5}
                    fill={isStageActive ? 'var(--primary)' : 'var(--bg-canvas)'}
                  />
                </g>

                {/* 4. 任务站点 (Stations) 渲染 */}
                {stage.tasks.map((task, taskIdx) => {
                  const lineCfg = LINE_CONFIG[task.lineType];
                  const isSelected = selectedId === task.id;
                  const isHovered = hoveredTaskId === task.id;
                  const isTaskActive = task.status === 'active';
                  const isTaskDone = task.status === 'done' || task.status === 'accepted';
                  const isTaskFailed = task.status === 'rejected';

                  // 站牌与文字标志交替分布避让，解决纵向密集节点的文字重叠遮挡问题
                  const isEvenTask = taskIdx % 2 === 0;
                  const textOnRight = isEvenTask;
                  const textAlignClass = textOnRight ? 'text-left' : 'text-right';

                  // 站牌偏置定位：站点左偏则牌向右展，反之亦然
                  const cardOffsetLeft = LINE_OFFSETS[task.lineType] < 0;
                  const popoverX = cardOffsetLeft ? task.stationX + 22 : task.stationX - 318;
                  const popoverY = task.stationY - 50;

                  const isMuted = focusedLineType !== null && task.lineType !== focusedLineType;

                  return (
                    <g
                      key={task.id}
                      data-interactive
                      onClick={(e) => {
                        if (isMuted) return;
                        e.stopPropagation();
                        updateUI({ selectedNodeId: task.id, rightSidebarOpen: true });
                      }}
                      onMouseEnter={() => !isMuted && setHoveredTaskId(task.id)}
                      onMouseLeave={() => setHoveredTaskId(null)}
                      className={`cursor-pointer group ${isMuted ? 'pointer-events-none' : ''}`}
                      opacity={isMuted ? 0.15 : 1}
                      style={{ transition: 'opacity 0.3s ease', pointerEvents: isMuted ? 'none' : 'auto' }}
                    >
                      {/* 三重同心雷达脉冲扩散波纹 (Radar Ripple) */}
                      {isTaskActive && !isMuted && (
                        <g>
                          <circle cx={task.stationX} cy={task.stationY} r={10} fill={lineCfg.color} className="animate-ripple-1" opacity={0} />
                          <circle cx={task.stationX} cy={task.stationY} r={10} fill={lineCfg.color} className="animate-ripple-2" opacity={0} />
                          <circle cx={task.stationX} cy={task.stationY} r={10} fill={lineCfg.color} className="animate-ripple-3" opacity={0} />
                        </g>
                      )}

                      {/* 站点核心节点造型 */}
                      {isTaskDone ? (
                        // 已通过：绿彩实心圆带勾
                        <g>
                          <circle
                            cx={task.stationX}
                            cy={task.stationY}
                            r={11}
                            fill={LINE_CONFIG.qa.color}
                            stroke="var(--bg-canvas)"
                            strokeWidth={2}
                            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))' }}
                          />
                          <path
                            d="M -3.5 -0.5 L -1 2 L 3.5 -2.5"
                            transform={`translate(${task.stationX}, ${task.stationY})`}
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </g>
                      ) : isTaskFailed ? (
                        // 失败：红色彩圆带叉
                        <g>
                          <circle
                            cx={task.stationX}
                            cy={task.stationY}
                            r={11}
                            fill="#ef4444"
                            stroke="var(--bg-canvas)"
                            strokeWidth={2}
                            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))' }}
                          />
                          <path
                            d="M -2.5 -2.5 L 2.5 2.5 M 2.5 -2.5 L -2.5 2.5"
                            transform={`translate(${task.stationX}, ${task.stationY})`}
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth={2.2}
                            strokeLinecap="round"
                          />
                        </g>
                      ) : isTaskActive ? (
                        // 活跃中：双色同心雷达
                        <g>
                          <circle
                            cx={task.stationX}
                            cy={task.stationY}
                            r={11}
                            fill="var(--bg-canvas)"
                            stroke={lineCfg.color}
                            strokeWidth={3.5}
                            style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))' }}
                          />
                          <circle cx={task.stationX} cy={task.stationY} r={5} fill={lineCfg.color} />
                        </g>
                      ) : (
                        // 未激活：空心铁轨站点
                        <g>
                          <circle
                            cx={task.stationX}
                            cy={task.stationY}
                            r={9}
                            fill="var(--bg-canvas)"
                            stroke="var(--execution-stage-outline)"
                            strokeWidth={2}
                          />
                          <circle
                            cx={task.stationX}
                            cy={task.stationY}
                            r={3}
                            fill="var(--execution-card-stroke-muted)"
                          />
                        </g>
                      )}

                      {/* 静态微型双语胶囊地铁站牌 (Station Board Capsule) */}
                      {!isHovered && !isSelected && (
                        <foreignObject
                          x={textOnRight ? task.stationX + 16 : task.stationX - 164}
                          y={task.stationY - 17}
                          width={148}
                          height={34}
                          style={{ pointerEvents: 'none', transition: 'opacity 0.3s ease' }}
                        >
                          <div
                            className={`flex items-center gap-1.5 py-1 px-2 rounded-full border border-[var(--execution-chip-border)]/15 bg-[var(--execution-panel-bg)]/88 backdrop-blur shadow-sm select-none transition-all duration-200 ${
                              textOnRight ? 'flex-row' : 'flex-row-reverse'
                            }`}
                          >
                            {/* 微型线路圆点徽标 (Line Micro Circular Badge) */}
                            <span
                              className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[8px] font-black text-white leading-none scale-90"
                              style={{ backgroundColor: lineCfg.color }}
                            >
                              {task.lineType === 'logic' ? 'L1' : task.lineType === 'dev' ? 'L2' : task.lineType === 'qa' ? 'L3' : 'L4'}
                            </span>
                            <div className={`flex flex-col min-w-0 flex-1 ${textAlignClass}`}>
                              {/* 核心中文站名 */}
                              <div className="text-[9px] font-black tracking-wide truncate text-[var(--text-main)] leading-tight">
                                {task.label}
                              </div>
                              {/* 硬核汉语拼音微缩副标题 */}
                              <div className="text-[5.5px] font-mono font-bold tracking-widest text-[var(--muted-foreground)] opacity-60 truncate leading-none uppercase mt-[1px]">
                                {getStationSublabel(task.label)}
                              </div>
                            </div>
                          </div>
                        </foreignObject>
                      )}

                      {/* 悬浮磨砂玻璃站牌卡片 (Hover Train Sign) */}
                      {(isHovered || isSelected) && !isMuted && (
                        <foreignObject
                          x={popoverX}
                          y={popoverY}
                          width={296}
                          height={task.h + 20}
                          className="transition-all duration-200"
                        >
                          <div
                            className={`rounded-2xl border p-4 backdrop-blur-md shadow-2xl transition-all duration-200 select-none ${
                              isSelected
                                ? 'bg-[var(--bg-main)]/92 border-[var(--primary)] shadow-[var(--primary)]/10'
                                : 'bg-[var(--bg-main)]/84 border-[var(--execution-stage-outline)]'
                            }`}
                            style={{
                              boxShadow: isSelected
                                ? '0 12px 32px -4px rgba(0, 0, 0, 0.4), 0 0 16px 2px color-mix(in srgb, var(--primary) 12%, transparent)'
                                : '0 12px 24px -4px rgba(0, 0, 0, 0.5)',
                            }}
                          >
                            <div className="flex flex-col gap-2">
                              {/* 线路指示小牌 */}
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className="px-2 py-[2px] rounded text-[8px] font-extrabold uppercase tracking-widest text-white leading-none"
                                  style={{ backgroundColor: lineCfg.color }}
                                >
                                  {t(lineCfg.lineNameKey as any)} - {LINE_CONFIG[task.lineType].label.split(' ')[0]}
                                </span>
                                <span className="text-[10px] font-bold tabular-nums text-[var(--muted-foreground)]">
                                  {Math.round(task.progress * 100)}%
                                </span>
                              </div>

                              {/* 任务名 */}
                              <div className="flex items-start gap-1.5 mt-0.5">
                                <span
                                  className="text-xs font-black text-[var(--text-main)] leading-snug line-clamp-1"
                                  style={{ fontFamily: 'var(--font-display), sans-serif' }}
                                >
                                  {task.label}
                                </span>
                              </div>

                              {/* 目标简述 */}
                              {task.goal && (
                                <div className="text-[10px] leading-relaxed text-[var(--muted-foreground)] opacity-90 line-clamp-2">
                                  {task.goal}
                                </div>
                              )}

                              {/* 执行活动与当前活跃文件 */}
                              {(task.executionPhase || task.activeFiles.length > 0) && (
                                <div className="mt-1 border-t border-[var(--execution-stage-outline)]/40 pt-1.5 space-y-1">
                                  {task.executionPhase && task.executionPhase !== 'idle' && (
                                    <span className="inline-flex rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] border border-[color-mix(in_srgb,var(--primary)_25%,transparent)] px-1.5 py-[2px] text-[7.5px] font-extrabold tracking-wider text-[var(--primary)] uppercase leading-none">
                                      {t(`editor.executionPhase${task.executionPhase.charAt(0).toUpperCase() + task.executionPhase.slice(1)}` as any)}
                                    </span>
                                  )}
                                  {task.activeFiles.length > 0 && (
                                    <code className="block truncate font-mono text-[8px] text-[var(--primary)] font-bold">
                                      {task.activeFiles[0]}
                                    </code>
                                  )}
                                </div>
                              )}

                              {/* 变更文件 */}
                              {task.files.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1 border-t border-[var(--execution-stage-outline)]/40 pt-1.5">
                                  {task.files.slice(0, 3).map((file) => (
                                    <FileBadge key={file.path} file={file} />
                                  ))}
                                  {task.files.length > 3 && (
                                    <span className="text-[8px] text-[var(--muted-foreground)] font-black pl-0.5 opacity-60 self-center">
                                      +{task.files.length - 3} FILES
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* 质量门禁与反馈 */}
                              {(task.gateStates.length > 0 || task.rating > 0) && (
                                <div className="flex items-center justify-between gap-3 mt-1 border-t border-[var(--execution-stage-outline)]/40 pt-1.5">
                                  <GateDots gateStates={task.gateStates} />
                                  <RatingStars rating={task.rating} />
                                </div>
                              )}
                            </div>
                          </div>
                        </foreignObject>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </g>
      </svg>

      {/* 平行运行状态面板 */}
      {parallelRuns.length > 0 && (
        <div className="absolute right-4 top-4 z-30 flex flex-wrap gap-1.5">
          {parallelRuns.map((run) => (
            <div
              key={run.id}
              className="rounded-full border border-[var(--execution-stage-outline)] bg-[var(--bg-main)]/90 px-3 py-1 text-[10px] leading-none inline-flex items-center gap-1.5 font-bold shadow-md"
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor:
                    run.status === 'passed'
                      ? 'var(--success)'
                      : run.status === 'running'
                        ? 'var(--amber)'
                        : 'var(--red)',
                }}
              />
              <span>{run.label}</span>
              <span className="opacity-50 uppercase text-[8px]">{run.status}</span>
            </div>
          ))}
        </div>
      )}

      {/* 缩放/平移视口控制中心 */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2">
        <div className="rounded-full border border-[var(--execution-stage-outline)] bg-[var(--bg-main)]/88 px-3 py-1.5 text-[10px] font-black text-[var(--text-main)] shadow-sm backdrop-blur">
          {Math.round(transform.k * 100)}%
        </div>
        <div className="flex items-center gap-0.5 rounded-full border border-[var(--execution-stage-outline)] bg-[var(--bg-main)]/88 p-1 shadow-sm backdrop-blur">
          <button
            type="button"
            onClick={() => stepZoom('out')}
            title={t('canvas.zoomOut')}
            aria-label={t('canvas.zoomOut')}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-main)] opacity-70 transition hover:bg-[var(--border)]/40 hover:opacity-100"
          >
            <Minus size={13} />
          </button>
          <button
            type="button"
            onClick={() => stepZoom('in')}
            title={t('canvas.zoomIn')}
            aria-label={t('canvas.zoomIn')}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-main)] opacity-70 transition hover:bg-[var(--border)]/40 hover:opacity-100"
          >
            <Plus size={13} />
          </button>
          <button
            type="button"
            onClick={() => fitToView(0.7)}
            title={t('canvas.fitView')}
            aria-label={t('canvas.fitView')}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-main)] opacity-70 transition hover:bg-[var(--border)]/40 hover:opacity-100"
          >
            <Crosshair size={13} />
          </button>
        </div>
      </div>

      {/* 运行来源指示牌 */}
      {executionOrigin && (
        <div className="absolute left-4 top-4 rounded-full border border-[var(--border)] bg-[var(--bg-main)]/90 px-3.5 py-1.5 text-[10px] font-bold shadow-sm shadow-[var(--shadow-node)] backdrop-blur">
          {t('feedback.executionOrigin')}:{' '}
          <span className="text-[var(--primary)] uppercase">
            {executionOrigin.mode === 'subagent'
              ? t('editor.executionModeSubagent')
              : t('editor.executionModeInline')}
          </span>
        </div>
      )}

      {/* 任务完成度全局门禁牌 */}
      {completionChecks.length > 0 && (
        <div className="absolute left-4 top-14 rounded-full border border-[var(--border)] bg-[var(--bg-main)]/90 px-3.5 py-1.5 text-[10px] font-bold shadow-sm shadow-[var(--shadow-node)] backdrop-blur">
          {t('editor.completionChecks')}:{' '}
          <span className={allCompletionChecksPassed ? 'text-[var(--success)]' : 'text-[var(--amber)]'}>
            {allCompletionChecksPassed ? 'READY FOR SERVICE' : 'BLOCKED IN STATION'}
          </span>
        </div>
      )}

      {/* 横向极简地铁胶囊过滤器 & 图例栏 (Horizontal Legend Filter Bar) - 置于 底部居中 完美避开左下角设置按钮 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-main)]/90 px-3.5 py-1.5 shadow-sm shadow-[var(--shadow-node)] backdrop-blur-md select-none transition-all duration-200">
        <div className="flex items-center gap-1.5 border-r border-[var(--border)]/40 pr-2.5 opacity-60">
          <Route size={12} className="text-[var(--text-main)]" />
          <span className="text-[9px] font-black tracking-widest text-[var(--text-main)] uppercase">
            {t('canvas.lineFilter')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {(Object.keys(LINE_CONFIG) as SubwayLineType[]).map((key) => {
            const line = LINE_CONFIG[key];
            const isFocused = focusedLineType === key;
            const isAnyFocused = focusedLineType !== null;
            const isDimmed = isAnyFocused && !isFocused;
            return (
              <button
                key={key}
                type="button"
                data-interactive
                onClick={() => setFocusedLineType(isFocused ? null : key)}
                className={`flex items-center gap-1 py-[3px] px-2.5 rounded-full text-[9px] font-black border transition-all duration-200 hover:scale-105 active:scale-95 ${
                  isFocused
                    ? 'bg-[var(--bg-main)] shadow-sm'
                    : 'bg-transparent border-transparent text-[var(--text-main)]/65 hover:text-[var(--text-main)]'
                }`}
                style={{
                  borderColor: isFocused ? line.color : 'transparent',
                  color: isFocused ? line.color : 'inherit',
                  opacity: isDimmed ? 0.35 : 1,
                }}
                title={t(line.lineNameKey as any)}
              >
                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isFocused ? 'animate-pulse' : ''}`} style={{ backgroundColor: line.color }} />
                <span>{t(line.shortNameKey as any)}</span>
              </button>
            );
          })}
        </div>

        {/* 极简快捷重置按钮 */}
        {focusedLineType !== null && (
          <button
            type="button"
            data-interactive
            onClick={() => setFocusedLineType(null)}
            className="flex items-center gap-1 py-[3px] px-2.5 rounded-full border border-[var(--primary)]/30 bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[8.5px] font-black text-[var(--primary)] uppercase transition-all duration-200 hover:scale-105 active:scale-95 ml-1"
          >
            <Filter size={8} />
            <span>{t('canvas.resetFilter')}</span>
          </button>
        )}
      </div>
    </div>
  );
}
