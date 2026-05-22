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
  Orbit,
  Filter,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorkbench } from '../../context/WorkbenchContext.tsx';
import { getTaskMeta } from './DetailPanel.tsx';

// 拼音辅助转换器，为天体星卡赋予微缩副标题
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
      if (/[a-zA-Z0-9]/.test(char)) {
        pinyin += char;
      }
    }
  }

  pinyin = pinyin.trim();
  if (pinyin.length > 0) {
    return pinyin.toUpperCase();
  }
  return label.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

// 基础布局与天体物理半径常量
const STAGE_W = 368;
const STAGE_MIN_H = 420; // 扩大星轨区域高度以适应轨道半径，防止重叠
const STAGE_GAP = 96;
const PAD_X = 84;
const PAD_Y = 112;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.5;
const VIEWPORT_PAD_X = 72;
const VIEWPORT_PAD_Y = 64;

// 4个层级的引力公转轨道与色彩系统
type SubwayLineType = 'logic' | 'dev' | 'qa' | 'ops';

const ORBIT_CONFIG: Record<SubwayLineType, { color: string; label: string; lineNameKey: string; shortNameKey: string; radius: number }> = {
  logic: {
    color: '#ff9f43', // 活力橙
    label: 'Logic & Schema Ring',
    lineNameKey: 'canvas.orangeLine',
    shortNameKey: 'canvas.orangeLineShort',
    radius: 46,
  },
  dev: {
    color: '#228be6', // 科技蓝
    label: 'Feature & Dev Ring',
    lineNameKey: 'canvas.blueLine',
    shortNameKey: 'canvas.blueLineShort',
    radius: 74,
  },
  qa: {
    color: '#40c057', // 安全绿
    label: 'Testing & Quality Ring',
    lineNameKey: 'canvas.greenLine',
    shortNameKey: 'canvas.greenLineShort',
    radius: 102,
  },
  ops: {
    color: '#ae3ec9', // 运维紫
    label: 'Ops & Delivery Ring',
    lineNameKey: 'canvas.purpleLine',
    shortNameKey: 'canvas.purpleLineShort',
    radius: 130,
  },
};

interface FileInfo extends PlanStepFile {}

interface OrreryTask {
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
  stationX: number; // 计算后的天体极坐标X
  stationY: number; // 计算后的天体极坐标Y
  angle: number; // 极坐标角度
  radius: number; // 极坐标半径
  h: number; // 弹窗卡片预测H
}

interface OrreryStageLayout {
  id: string;
  name: string;
  description?: string;
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  tasks: OrreryTask[];
  hubX: number; // 恒星中心X
  hubY: number; // 恒星中心Y
  stage: ExecutionFlowStage;
}

interface OrreryLink {
  from: { x: number; y: number };
  to: { x: number; y: number };
  lineType: SubwayLineType;
  isActive: boolean;
}

interface StageLink {
  from: { x: number; y: number };
  to: { x: number; y: number };
}

// 自动分配轨道类型
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

function calculateTaskHeight(task: Pick<OrreryTask, 'label' | 'goal' | 'files' | 'stepCount' | 'gateStates' | 'executionPhase' | 'activeFiles' | 'latestEvent' | 'rating'>): number {
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

// 核心星轨引力场计算模型
function buildOrreryLayout(
  flow: ExecutionFlow,
  nodes: CanvasNode[],
  feedback: { nodeId: string; rating: number }[],
): {
  stages: OrreryStageLayout[];
  quantumLinks: OrreryLink[];
  interstellarTrunks: StageLink[];
} {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const ratingMap = new Map<string, number>();
  for (const fb of feedback) {
    ratingMap.set(fb.nodeId, Math.max(ratingMap.get(fb.nodeId) ?? 0, fb.rating));
  }

  const stageDrafts = flow.stages.map((stage, index) => {
    const stageX = PAD_X + index * (STAGE_W + STAGE_GAP);
    const hubX = stageX + STAGE_W / 2;
    const hubY = PAD_Y + 220; // 处于轨道中心点的恒星位置，下移52px以预留上方ORB-IV轨道卡片的安全净空

    // 按轨道划分任务以分配角度
    const lineTasksMap: Record<SubwayLineType, Array<{ node: CanvasNode; rating: number }>> = {
      logic: [],
      dev: [],
      qa: [],
      ops: [],
    };

    for (const taskId of stage.taskIds) {
      const node = nodeMap.get(taskId);
      if (!node) continue;
      const meta = getTaskMeta(node);
      const files = meta.files;
      const lineType = classifySubwayLine(node.label, files);
      lineTasksMap[lineType].push({ node, rating: ratingMap.get(node.id) ?? 0 });
    }

    const tasks: OrreryTask[] = [];

    // 对每条星轨计算天体极坐标
    for (const key of Object.keys(ORBIT_CONFIG) as SubwayLineType[]) {
      const group = lineTasksMap[key];
      const count = group.length;
      const radius = ORBIT_CONFIG[key].radius;

      group.forEach((item, idx) => {
        const node = item.node;
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

        // 极坐标防重叠角度分配：以 -PI/2 (正上方12点) 为中心偏置分布
        let angle = -Math.PI / 2;
        if (count > 1) {
          const spread = 0.55; // 轨道节点扇形扩展角度
          angle = -Math.PI / 2 + (idx - (count - 1) / 2) * spread;
        }

        const stationX = hubX + Math.cos(angle) * radius;
        const stationY = hubY + Math.sin(angle) * radius;

        const baseTask = {
          id: node.id,
          label: node.label,
          status: node.status,
          goal,
          progress: node.progress,
          files,
          stepCount: steps.length,
          rating: item.rating,
          gateStates,
          executionPhase,
          activeFiles,
          latestEvent,
          lineType: key,
          stationX,
          stationY,
          angle,
          radius,
          h: 0,
        };

        baseTask.h = calculateTaskHeight(baseTask);
        tasks.push(baseTask);
      });
    }

    return {
      stage,
      x: stageX,
      naturalHeight: STAGE_MIN_H,
      tasks,
      hubX,
      hubY,
    };
  });

  const stages: OrreryStageLayout[] = stageDrafts.map(
    ({ stage, x, naturalHeight, tasks, hubX, hubY }, index) => ({
      id: stage.id,
      name: stage.name,
      description: stage.description,
      index,
      x,
      y: PAD_Y,
      width: STAGE_W,
      height: naturalHeight,
      tasks,
      hubX,
      hubY,
      stage,
    }),
  );

  const taskMap = new Map<string, OrreryTask>();
  for (const stage of stages) {
    for (const task of stage.tasks) {
      taskMap.set(task.id, task);
    }
  }

  // 构建星际引力跃迁轨道 (Interstellar Gravity Trails)
  const quantumLinks: OrreryLink[] = [];
  for (const stage of stages) {
    const relations = getTaskRelations(flow, stage.stage);
    for (const relation of relations) {
      const fromTask = taskMap.get(relation.fromTaskId);
      const toTask = taskMap.get(relation.toTaskId);
      if (!fromTask || !toTask) continue;

      quantumLinks.push({
        from: { x: fromTask.stationX, y: fromTask.stationY },
        to: { x: toTask.stationX, y: toTask.stationY },
        lineType: toTask.lineType,
        isActive: toTask.status === 'active' || fromTask.status === 'active',
      });
    }

    // 从恒星向内圈第一个激活任务提供能量索
    if (stage.tasks.length > 0) {
      const firstTask = stage.tasks[0];
      quantumLinks.push({
        from: { x: stage.hubX, y: stage.hubY },
        to: { x: firstTask.stationX, y: firstTask.stationY },
        lineType: firstTask.lineType,
        isActive: firstTask.status === 'active',
      });
    }
  }

  // 星系间水平星际主干跃迁通道 (Interstellar Trunks)
  const stageMap = new Map(stages.map((stage) => [stage.id, stage]));
  const interstellarTrunks: StageLink[] = [];
  for (const relation of getPrimaryStageRelations(flow)) {
    const fromStage = stageMap.get(relation.fromStageId);
    const toStage = stageMap.get(relation.toStageId);
    if (!fromStage || !toStage) continue;
    interstellarTrunks.push({
      from: { x: fromStage.hubX, y: fromStage.hubY },
      to: { x: toStage.hubX, y: toStage.hubY },
    });
  }

  return { stages, quantumLinks, interstellarTrunks };
}

function getBounds(stages: OrreryStageLayout[]) {
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

// 渲染半透明弯曲的星际跃迁流光轨道
function getQuantumPath(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) return '';
  // 带有轻微宇宙曲率的二次贝塞尔能量束
  const controlX = (from.x + to.x) / 2 - dy * 0.15;
  const controlY = (from.y + to.y) / 2 + dx * 0.15;
  return `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`;
}

function stageStatus(tasks: OrreryTask[]): NodeStatus {
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

export default function OrreryCanvas({ nodes }: { nodes: CanvasNode[] }) {
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

  const layout = flow ? buildOrreryLayout(flow, nodes, feedbackRatings) : null;
  const layoutSig = layout ? layout.stages.map((s) => `${s.id}:${s.tasks.length}`).join('|') : '';
  const containerRef = useRef<HTMLDivElement>(null);

  const [transform, setTransform] = useState({ x: 0, y: 0, k: 0.8 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [focusedLineType, setFocusedLineType] = useState<SubwayLineType | null>(null);

  const selectedId = state.ui.selectedNodeId;

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
      {/* 嵌入天体星轨与引力脉冲特效 Style 块 */}
      <style>{`
        @keyframes sun-corona {
          0% { transform: rotate(0deg) scale(0.96); opacity: 0.7; }
          50% { transform: rotate(180deg) scale(1.05); opacity: 0.9; }
          100% { transform: rotate(360deg) scale(0.96); opacity: 0.7; }
        }
        @keyframes orbital-tracer-anim {
          from { stroke-dashoffset: 800; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes quantum-pulse {
          0% { stroke-dashoffset: 40; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes gravity-wave {
          0% { r: 8px; opacity: 0.7; }
          50% { opacity: 0.35; }
          100% { r: 24px; opacity: 0; }
        }
        .animate-sun-corona {
          transform-origin: 0px 0px;
          animation: sun-corona 16s linear infinite;
        }
        .orbital-tracer {
          stroke-dasharray: 12, 180;
          animation: orbital-tracer-anim 6s linear infinite;
          transform-origin: center;
        }
        .quantum-pulse-line {
          stroke-dasharray: 4, 12;
          animation: quantum-pulse 1.6s linear infinite;
        }
        .animate-gravity-1 {
          animation: gravity-wave 2.2s cubic-bezier(0.1, 0.8, 0.3, 1) infinite;
          transform-origin: center;
        }
        .animate-gravity-2 {
          animation: gravity-wave 2.2s cubic-bezier(0.1, 0.8, 0.3, 1) infinite;
          animation-delay: 0.7s;
          transform-origin: center;
        }
        .animate-gravity-3 {
          animation: gravity-wave 2.2s cubic-bezier(0.1, 0.8, 0.3, 1) infinite;
          animation-delay: 1.4s;
          transform-origin: center;
        }
      `}</style>

      <svg width="100%" height="100%" style={{ display: 'block', overflow: 'hidden' }}>
        <defs>
          {/* 星系引力发光与偏置立体阴影滤镜 */}
          <filter id="orrery-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="2" stdDeviation="3.5" flood-color="#000000" flood-opacity="0.25" />
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="sun-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* 恒星璀璨径向渐变 */}
          <radialGradient id="sun-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="25%" stopColor="#ffb347" />
            <stop offset="70%" stopColor="#ff4500" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#ff4500" stopOpacity={0} />
          </radialGradient>
        </defs>

        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
          
          {/* 1. 星系间引力流光连接 (Interstellar Gravity Trails) */}
          {layout.interstellarTrunks.map((link, idx) => (
            <g key={`stage-trunk-${idx}`} opacity={focusedLineType !== null ? 0.15 : 1} style={{ transition: 'opacity 0.3s ease' }}>
              {/* 极其微弱轻盈的引力主线 */}
              <line
                x1={link.from.x}
                y1={link.from.y}
                x2={link.to.x}
                y2={link.to.y}
                stroke="var(--border)"
                strokeWidth={1}
                strokeDasharray="4, 8"
                opacity={0.3}
              />
              <line
                x1={link.from.x}
                y1={link.from.y}
                x2={link.to.x}
                y2={link.to.y}
                stroke="var(--primary)"
                strokeWidth={1.5}
                className="quantum-pulse-line"
                opacity={0.45}
              />
            </g>
          ))}

          {/* 2. 跨天体星际引力跃迁连线 (Interstellar Beams) */}
          {layout.quantumLinks.map((link, idx) => {
            const lineCfg = ORBIT_CONFIG[link.lineType];
            const pathStr = getQuantumPath(link.from, link.to);
            if (!pathStr) return null;
            const isMuted = focusedLineType !== null && link.lineType !== focusedLineType;

            return (
              <g key={`quantum-beam-${idx}`} opacity={isMuted ? 0.04 : 1} style={{ transition: 'opacity 0.3s ease' }}>
                <path
                  d={pathStr}
                  fill="none"
                  stroke={lineCfg.color}
                  strokeWidth={4.5}
                  opacity={0.22}
                  filter="url(#orrery-glow)"
                />
                <path
                  d={pathStr}
                  fill="none"
                  stroke={lineCfg.color}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  opacity={0.75}
                />
                {/* 活跃轨道上有量子光标飞梭 */}
                {link.isActive && !isMuted && (
                  <path
                    d={pathStr}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    className="quantum-pulse-line"
                    opacity={0.8}
                  />
                )}
              </g>
            );
          })}

          {/* 3. 渲染各个 Stage (星系区) */}
          {layout.stages.map((stage) => {
            const status = stageStatus(stage.tasks);
            const isStageActive = status === 'active';

            return (
              <g key={stage.id}>
                {/* 区域背景边界（极其微弱的引力场圆圈） */}
                <circle
                  cx={stage.hubX}
                  cy={stage.hubY}
                  r={150}
                  fill="color-mix(in srgb, var(--execution-panel-bg) 2%, transparent)"
                  stroke="var(--execution-stage-outline)"
                  strokeWidth={1}
                  strokeDasharray="3, 15"
                  opacity={0.22}
                />

                {/* 4条圆心同心星轨环背景渲染 */}
                {(Object.keys(ORBIT_CONFIG) as SubwayLineType[]).map((key) => {
                  const orbit = ORBIT_CONFIG[key];
                  const isMuted = focusedLineType !== null && key !== focusedLineType;
                  const isOrbitActive = stage.tasks.some((t) => t.lineType === key && t.status === 'active');
                  return (
                    <g key={`${stage.id}-orbit-${key}`} opacity={isMuted ? 0.08 : 1} style={{ transition: 'opacity 0.3s ease' }}>
                      <circle
                        cx={stage.hubX}
                        cy={stage.hubY}
                        r={orbit.radius}
                        fill="none"
                        stroke={orbit.color}
                        strokeWidth={1}
                        strokeDasharray="4, 12"
                        opacity={0.25}
                      />
                      {/* 公转流光飞船动效 (Active 时激活) */}
                      {isOrbitActive && !isMuted && (
                        <circle
                          cx={stage.hubX}
                          cy={stage.hubY}
                          r={orbit.radius}
                          fill="none"
                          stroke={orbit.color}
                          strokeWidth={2}
                          className="orbital-tracer"
                          filter="url(#orrery-glow)"
                          opacity={0.9}
                        />
                      )}
                    </g>
                  );
                })}

                {/* 阶段名称标签 - 采用下置式精致半透明磨砂引力底座 (Gravity Plinth Badge) */}
                <foreignObject
                  x={stage.x + 10}
                  y={stage.hubY + 154}
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

                {/* 恒星能量核心 (Solar Hub Center) */}
                <g>
                  {/* 外圈多重日冕发光，包裹在 translate 的 g 内以修正 CSS transform-origin 浏览器 Bug */}
                  <g transform={`translate(${stage.hubX}, ${stage.hubY})`}>
                    <circle
                      cx={0}
                      cy={0}
                      r={22}
                      fill="url(#sun-gradient)"
                      className="animate-sun-corona"
                      filter="url(#sun-glow)"
                      opacity={isStageActive ? 0.8 : 0.45}
                    />
                  </g>
                  {/* 实心恒星微粒 */}
                  <circle
                    cx={stage.hubX}
                    cy={stage.hubY}
                    r={10}
                    fill="var(--bg-canvas)"
                    stroke={isStageActive ? '#ffb347' : 'var(--execution-stage-outline)'}
                    strokeWidth={3}
                    style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.35))' }}
                  />
                  <circle
                    cx={stage.hubX}
                    cy={stage.hubY}
                    r={4}
                    fill={isStageActive ? '#ff4500' : 'var(--execution-stage-outline)'}
                  />
                </g>

                {/* 4. 轨道天体节点 (Planetary Nodes) */}
                {stage.tasks.map((task) => {
                  const lineCfg = ORBIT_CONFIG[task.lineType];
                  const isSelected = selectedId === task.id;
                  const isHovered = hoveredTaskId === task.id;
                  const isTaskActive = task.status === 'active';
                  const isTaskDone = task.status === 'done' || task.status === 'accepted';
                  const isTaskFailed = task.status === 'rejected';

                  // 天体排版避让：根据所属极坐标象限自适应站牌展开方向
                  const textOnRight = Math.cos(task.angle) >= 0;
                  const textAlignClass = textOnRight ? 'text-left' : 'text-right';

                  const cardOffsetLeft = Math.cos(task.angle) < 0;
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
                      {/* 天体引力波脉冲波纹 (Gravity Waves) */}
                      {isTaskActive && !isMuted && (
                        <g>
                          <circle cx={task.stationX} cy={task.stationY} r={8} fill={lineCfg.color} className="animate-gravity-1" opacity={0} />
                          <circle cx={task.stationX} cy={task.stationY} r={8} fill={lineCfg.color} className="animate-gravity-2" opacity={0} />
                          <circle cx={task.stationX} cy={task.stationY} r={8} fill={lineCfg.color} className="animate-gravity-3" opacity={0} />
                        </g>
                      )}

                      {/* 天体节点形态 */}
                      {isTaskDone ? (
                        // 已通过：带倾斜星环的四角星芒金核行星
                        <g>
                          <ellipse
                            cx={task.stationX}
                            cy={task.stationY}
                            rx={14}
                            ry={4}
                            fill="none"
                            stroke="#ffb347"
                            strokeWidth={1}
                            transform={`rotate(-15, ${task.stationX}, ${task.stationY})`}
                            opacity={0.6}
                          />
                          <circle
                            cx={task.stationX}
                            cy={task.stationY}
                            r={8}
                            fill="#ffb347"
                            stroke="var(--bg-canvas)"
                            strokeWidth={2}
                            style={{ filter: 'drop-shadow(0 2px 5px rgba(255,179,71,0.5))' }}
                          />
                          <path
                            d="M 0 -5 L 1.2 -1.2 L 5 0 L 1.2 1.2 L 0 5 L -1.2 1.2 L -5 0 L -1.2 -1.2 Z"
                            transform={`translate(${task.stationX}, ${task.stationY})`}
                            fill="#ffffff"
                          />
                        </g>
                      ) : isTaskFailed ? (
                        // 失败：带倾斜星环的塌缩红核行星
                        <g>
                          <ellipse
                            cx={task.stationX}
                            cy={task.stationY}
                            rx={14}
                            ry={4}
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth={1}
                            transform={`rotate(-15, ${task.stationX}, ${task.stationY})`}
                            opacity={0.6}
                          />
                          <circle
                            cx={task.stationX}
                            cy={task.stationY}
                            r={8}
                            fill="#ef4444"
                            stroke="var(--bg-canvas)"
                            strokeWidth={2}
                            style={{ filter: 'drop-shadow(0 2px 6px rgba(239,68,68,0.5))' }}
                          />
                          <path
                            d="M -2.5 -2.5 L 2.5 2.5 M 2.5 -2.5 L -2.5 2.5"
                            transform={`translate(${task.stationX}, ${task.stationY})`}
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth={1.8}
                            strokeLinecap="round"
                          />
                        </g>
                      ) : isTaskActive ? (
                        // 活跃中：带行星环的高频脉冲双色同心行星
                        <g>
                          <ellipse
                            cx={task.stationX}
                            cy={task.stationY}
                            rx={14}
                            ry={4}
                            fill="none"
                            stroke={lineCfg.color}
                            strokeWidth={1.2}
                            transform={`rotate(-15, ${task.stationX}, ${task.stationY})`}
                            opacity={0.7}
                          />
                          <circle
                            cx={task.stationX}
                            cy={task.stationY}
                            r={8}
                            fill="var(--bg-canvas)"
                            stroke={lineCfg.color}
                            strokeWidth={3}
                            style={{ filter: 'drop-shadow(0 2px 6px color-mix(in srgb, var(--primary) 30%, transparent))' }}
                          />
                          <circle cx={task.stationX} cy={task.stationY} r={3.5} fill={lineCfg.color} className="animate-pulse" />
                        </g>
                      ) : (
                        // 未激活：带行星环的静谧微缩气态行星
                        <g>
                          <ellipse
                            cx={task.stationX}
                            cy={task.stationY}
                            rx={12}
                            ry={3.5}
                            fill="none"
                            stroke="var(--execution-stage-outline)"
                            strokeWidth={1}
                            transform={`rotate(-15, ${task.stationX}, ${task.stationY})`}
                            opacity={0.45}
                          />
                          <circle
                            cx={task.stationX}
                            cy={task.stationY}
                            r={6.5}
                            fill="var(--bg-canvas)"
                            stroke="var(--execution-stage-outline)"
                            strokeWidth={1.8}
                          />
                          <circle
                            cx={task.stationX}
                            cy={task.stationY}
                            r={2}
                            fill="var(--execution-card-stroke-muted)"
                          />
                        </g>
                      )}

                      {/* 静态悬浮双语迷你天体标签 (Bilingual Mini Orbit Board) */}
                      {!isHovered && !isSelected && (
                        <foreignObject
                          x={textOnRight ? task.stationX + 15 : task.stationX - 163}
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
                            <span
                              className="flex shrink-0 items-center justify-center rounded px-1 py-[2px] text-[6px] font-black text-white leading-none scale-90"
                              style={{ backgroundColor: lineCfg.color }}
                            >
                              {task.lineType === 'logic' ? 'ORB-I' : task.lineType === 'dev' ? 'ORB-II' : task.lineType === 'qa' ? 'ORB-III' : 'ORB-IV'}
                            </span>
                            <div className={`flex flex-col min-w-0 flex-1 ${textAlignClass}`}>
                              <div className="text-[9px] font-black tracking-wide truncate text-[var(--text-main)] leading-tight">
                                {task.label}
                              </div>
                              <div className="text-[5.5px] font-mono font-bold tracking-widest text-[var(--muted-foreground)] opacity-60 truncate leading-none uppercase mt-[1px]">
                                {getStationSublabel(task.label)}
                              </div>
                            </div>
                          </div>
                        </foreignObject>
                      )}

                      {/* 悬浮磨砂玻璃天体引力卡片 (Hover Planet Sign Card) */}
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
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className="px-2 py-[2px] rounded text-[8px] font-extrabold uppercase tracking-widest text-white leading-none"
                                  style={{ backgroundColor: lineCfg.color }}
                                >
                                  {t(lineCfg.lineNameKey as any)} - {ORBIT_CONFIG[task.lineType].label.split(' ')[0]}
                                </span>
                                <span className="text-[10px] font-bold tabular-nums text-[var(--muted-foreground)]">
                                  {Math.round(task.progress * 100)}%
                                </span>
                              </div>

                              <div className="flex items-start gap-1.5 mt-0.5">
                                <span
                                  className="text-xs font-black text-[var(--text-main)] leading-snug line-clamp-1"
                                  style={{ fontFamily: 'var(--font-display), sans-serif' }}
                                >
                                  {task.label}
                                </span>
                              </div>

                              {task.goal && (
                                <div className="text-[10px] leading-relaxed text-[var(--muted-foreground)] opacity-90 line-clamp-2">
                                  {task.goal}
                                </div>
                              )}

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

      {/* 并行运行状态看板 */}
      {parallelRuns.length > 0 && (
        <div className="absolute right-4 top-4 z-30 flex flex-wrap gap-1.5">
          {parallelRuns.map((run) => (
            <div
              key={run.id}
              className="rounded-full border border-[var(--border)] bg-[var(--bg-main)]/90 px-3 py-1 text-[10px] leading-none inline-flex items-center gap-1.5 font-bold shadow-md"
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

      {/* 视口缩放控制中心 */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2">
        <div className="rounded-full border border-[var(--border)] bg-[var(--bg-main)]/88 px-3 py-1.5 text-[10px] font-black text-[var(--text-main)] shadow-sm backdrop-blur">
          {Math.round(transform.k * 100)}%
        </div>
        <div className="flex items-center gap-0.5 rounded-full border border-[var(--border)] bg-[var(--bg-main)]/88 p-1 shadow-sm backdrop-blur">
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

      {/* 横向极简天体星轨过滤器 & 图例栏 (Horizontal Legend Orbit Bar) - 置于 底部居中 完美避开左下角设置 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-main)]/90 px-3.5 py-1.5 shadow-sm shadow-[var(--shadow-node)] backdrop-blur-md select-none transition-all duration-200">
        <div className="flex items-center gap-1.5 border-r border-[var(--border)]/40 pr-2.5 opacity-60">
          <Orbit size={12} className="text-[var(--text-main)]" />
          <span className="text-[9px] font-black tracking-widest text-[var(--text-main)] uppercase">
            {t('canvas.lineFilter')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {(Object.keys(ORBIT_CONFIG) as SubwayLineType[]).map((key) => {
            const line = ORBIT_CONFIG[key];
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

        {/* 极简快捷清除过滤按钮 */}
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
