import type { CanvasNode, NodeStatus } from '@supermech/schema';
import {
  CheckCircle2,
  Circle,
  Crosshair,
  Hash,
  type LucideIcon,
  Minus,
  PlayCircle,
  Plus,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorkbench } from '../../context/WorkbenchContext.tsx';

const NODE_W = 200;
const NODE_H = 112;
const H_GAP = 32;
const V_GAP = 176;
const PAD = 40;
const VIEWPORT_PAD_X = 56;
const VIEWPORT_PAD_Y = 44;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.5;

interface LayoutNode {
  id: string;
  label: string;
  status: NodeStatus;
  description: string;
  progress: number;
  tags: string[];
  x: number;
  y: number;
}

const STATUS_CONFIG: Record<
  NodeStatus,
  { bg: string; border: string; text: string; subtext: string; icon: LucideIcon }
> = {
  pending: {
    bg: 'color-mix(in srgb, var(--border) 25%, var(--bg-canvas))',
    border: 'var(--border)',
    text: 'var(--text-main)',
    subtext: 'var(--muted-foreground)',
    icon: Circle,
  },
  active: {
    bg: 'color-mix(in srgb, var(--amber) 25%, var(--bg-canvas))',
    border: 'var(--amber)',
    text: 'var(--text-main)',
    subtext: 'var(--muted-foreground)',
    icon: PlayCircle,
  },
  accepted: {
    bg: 'color-mix(in srgb, var(--success) 25%, var(--bg-canvas))',
    border: 'var(--success)',
    text: 'var(--success)',
    subtext: 'var(--success)',
    icon: CheckCircle2,
  },
  rejected: {
    bg: 'color-mix(in srgb, var(--border) 20%, var(--bg-canvas))',
    border: 'var(--border)',
    text: 'var(--muted-foreground)',
    subtext: 'var(--muted-foreground)',
    icon: XCircle,
  },
  done: {
    bg: 'color-mix(in srgb, var(--primary) 25%, var(--bg-canvas))',
    border: 'var(--primary)',
    text: 'var(--primary)',
    subtext: 'var(--primary)',
    icon: CheckCircle2,
  },
};

function buildLayout(nodes: CanvasNode[]): {
  nodes: LayoutNode[];
  edges: { from: string; to: string }[];
} {
  if (nodes.length === 0) return { nodes: [], edges: [] };

  const map = new Map<string, CanvasNode>();
  for (const n of nodes) map.set(n.id, n);

  const roots = nodes.filter((n) => !n.parentId);
  if (roots.length === 0) return { nodes: [], edges: [] };

  function subtreeWidth(id: string): number {
    const n = map.get(id);
    if (!n) return 0;
    if (n.children.length === 0) return NODE_W;
    return n.children.reduce((s, c) => s + subtreeWidth(c), 0) + (n.children.length - 1) * H_GAP;
  }

  const layoutNodes: LayoutNode[] = [];
  const edges: { from: string; to: string }[] = [];

  function layout(id: string, x: number, y: number): void {
    const n = map.get(id);
    if (!n) return;
    layoutNodes.push({
      id,
      label: n.label,
      status: n.status,
      description:
        typeof n.metadata === 'object' && n.metadata !== null
          ? String((n.metadata as Record<string, unknown>).description ?? '')
          : '',
      progress: n.progress ?? 0,
      tags:
        typeof n.metadata === 'object' && n.metadata !== null && Array.isArray(n.metadata.tags)
          ? (n.metadata.tags as string[])
          : [],
      x,
      y,
    });

    if (n.children.length > 0) {
      const widths = n.children.map((c) => subtreeWidth(c));
      const totalW = widths.reduce((s, w) => s + w, 0) + (n.children.length - 1) * H_GAP;
      let cx = x - totalW / 2 + widths[0] / 2;

      for (let i = 0; i < n.children.length; i++) {
        const cid = n.children[i];
        edges.push({ from: id, to: cid });
        layout(cid, cx, y + V_GAP);
        cx += widths[i] / 2 + H_GAP + (widths[i + 1] ?? 0) / 2;
      }
    }
  }

  const widths = roots.map((r) => subtreeWidth(r.id));
  let cx = PAD + widths[0] / 2;

  for (let i = 0; i < roots.length; i++) {
    layout(roots[i].id, cx, PAD);
    cx += widths[i] / 2 + H_GAP + (widths[i + 1] ?? 0) / 2;
  }

  return { nodes: layoutNodes, edges };
}

function edgePath(from: LayoutNode, to: LayoutNode): string {
  const x1 = from.x;
  const y1 = from.y + NODE_H / 2;
  const x2 = to.x;
  const y2 = to.y - NODE_H / 2 + 2;
  const cy1 = y1 + (y2 - y1) * 0.5;
  const cy2 = y1 + (y2 - y1) * 0.5;
  return `M ${x1} ${y1} C ${x1} ${cy1}, ${x2} ${cy2}, ${x2} ${y2}`;
}

function getLayoutBounds(layoutNodes: LayoutNode[]) {
  const minX = Math.min(...layoutNodes.map((n) => n.x)) - NODE_W / 2;
  const maxX = Math.max(...layoutNodes.map((n) => n.x)) + NODE_W / 2;
  const minY = Math.min(...layoutNodes.map((n) => n.y)) - NODE_H / 2;
  const maxY = Math.max(...layoutNodes.map((n) => n.y)) + NODE_H / 2;

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

interface MindMapProps {
  nodes: CanvasNode[];
}

export default function MindMap({ nodes }: MindMapProps) {
  const { t } = useTranslation();
  const { state, updateUI } = useWorkbench();
  const { nodes: layoutNodes, edges } = buildLayout(nodes);
  const layoutSignature = layoutNodes.map((n) => `${n.id}:${n.x}:${n.y}`).join('|');
  const containerRef = useRef<HTMLDivElement>(null);

  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

  const fitToView = useCallback(() => {
    const el = containerRef.current;
    if (!el || layoutNodes.length === 0) return;

    const rect = el.getBoundingClientRect();
    const bounds = getLayoutBounds(layoutNodes);
    const availableWidth = Math.max(rect.width - VIEWPORT_PAD_X * 2, 1);
    const availableHeight = Math.max(rect.height - VIEWPORT_PAD_Y * 2, 1);
    const nextK = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, Math.min(availableWidth / bounds.width, availableHeight / bounds.height)),
    );

    setTransform({
      x: (rect.width - bounds.width * nextK) / 2 - bounds.minX * nextK,
      y: (rect.height - bounds.height * nextK) / 2 - bounds.minY * nextK,
      k: nextK,
    });
  }, [layoutNodes]);

  const scaleAtPoint = useCallback((anchorX: number, anchorY: number, nextK: number) => {
    setTransform((prev) => {
      const clampedK = Math.min(Math.max(nextK, MIN_ZOOM), MAX_ZOOM);
      const dx = (anchorX - prev.x) / prev.k;
      const dy = (anchorY - prev.y) / prev.k;

      return {
        x: anchorX - dx * clampedK,
        y: anchorY - dy * clampedK,
        k: clampedK,
      };
    });
  }, []);

  function stepZoom(direction: 'in' | 'out') {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const factor = direction === 'in' ? 1.15 : 1 / 1.15;
    scaleAtPoint(rect.width / 2, rect.height / 2, transform.k * factor);
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: We only want to fitToView when layout signature changes, not on every fitToView function reference change.
  useEffect(() => {
    fitToView();
  }, [layoutSignature]);

  useEffect(() => {
    function handleFocusNode(event: Event) {
      const customEvent = event as CustomEvent<{ nodeId?: string }>;
      const nodeId = customEvent.detail?.nodeId;
      if (!nodeId) return;

      const targetNode = layoutNodes.find((node) => node.id === nodeId);
      const el = containerRef.current;
      if (!targetNode || !el) return;

      const rect = el.getBoundingClientRect();
      setTransform((prev) => ({
        ...prev,
        x: rect.width / 2 - targetNode.x * prev.k,
        y: rect.height / 2 - targetNode.y * prev.k,
      }));
    }

    window.addEventListener('workbench:focus-node', handleFocusNode as EventListener);
    return () => {
      window.removeEventListener('workbench:focus-node', handleFocusNode as EventListener);
    };
  }, [layoutNodes]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheelRaw = (e: WheelEvent) => {
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        const delta = -e.deltaY;
        const factor = 1.1 ** (delta / 100);
        const rect = el.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        scaleAtPoint(mouseX, mouseY, transform.k * factor);
      } else {
        setTransform((prev) => ({
          ...prev,
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    };

    el.addEventListener('wheel', handleWheelRaw, { passive: false });
    return () => el.removeEventListener('wheel', handleWheelRaw);
  }, [scaleAtPoint, transform.k]);

  if (layoutNodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-[var(--muted-foreground)] opacity-50">
        {t('canvas.brainstormEmpty')}
      </div>
    );
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    if ((e.target as HTMLElement).closest('g[role="button"]')) return;

    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setTransform((prev) => ({
      ...prev,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const clearSelection = () => {
    updateUI({ selectedNodeId: null, rightSidebarOpen: false });
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('g[role="button"]')) return;
    clearSelection();
  };

  const handleBackgroundKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    clearSelection();
  };

  const selectedId = state.ui.selectedNodeId;
  const selectedNode = nodes.find((node) => node.id === selectedId) ?? null;
  const focusIds = new Set<string>();

  if (selectedNode) {
    focusIds.add(selectedNode.id);

    let currentParentId = selectedNode.parentId;
    while (currentParentId) {
      focusIds.add(currentParentId);
      currentParentId = nodes.find((node) => node.id === currentParentId)?.parentId ?? null;
    }

    for (const childId of selectedNode.children) {
      focusIds.add(childId);
    }
  }

  return (
    <div
      ref={containerRef}
      className={`canvas-dot-grid relative h-full w-full overflow-hidden select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleBackgroundClick}
      onKeyDown={handleBackgroundKeyDown}
      role="button"
      aria-label={t('canvas.clearSelection', { defaultValue: 'Clear selection' })}
      tabIndex={0}
      style={{
        backgroundPosition: `${transform.x}px ${transform.y}px`,
        backgroundSize: `${24 * transform.k}px ${24 * transform.k}px`,
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,var(--bg-main)_0%,transparent_44%)] opacity-28" />
      <svg width="100%" height="100%" style={{ display: 'block' }} role="img" aria-label="Mind map">
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <marker
            id="arrowhead"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
          </marker>
        </defs>

        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
          {/* Edges */}
          {edges.map((e) => {
            const from = layoutNodes.find((n) => n.id === e.from);
            const to = layoutNodes.find((n) => n.id === e.to);
            if (!from || !to) return null;
            const isFocused = !selectedId || (focusIds.has(e.from) && focusIds.has(e.to));
            const path = edgePath(from, to);
            return (
              <g key={`${e.from}-${e.to}`}>
                {/* Glow layer */}
                <path
                  d={path}
                  fill="none"
                  stroke={isFocused ? 'var(--primary)' : '#94a3b8'}
                  strokeWidth={isFocused ? 3 : 2}
                  className={isFocused ? 'opacity-10' : 'opacity-0'}
                  style={{ filter: 'blur(3px)' }}
                />
                <path
                  d={path}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  markerEnd="url(#arrowhead)"
                  className={isFocused ? 'opacity-80' : 'opacity-40'}
                />
              </g>
            );
          })}

          {/* Nodes */}
          {layoutNodes.map((n) => {
            const config = STATUS_CONFIG[n.status];
            const isSelected = n.id === selectedId;
            const isRejected = n.status === 'rejected';
            const isActive = n.status === 'active';
            const fbCount = state.feedback.filter(
              (f) => f.nodeId === n.id && !f.processedAt,
            ).length;
            const tooltip = n.description || n.label;
            const StatusIcon = config.icon;
            const isFocusNode = !selectedId || focusIds.has(n.id);
            const contentOpacity = isSelected ? 1 : isFocusNode ? 0.94 : 0.62;
            const cardOpacity = isSelected ? 1 : isFocusNode ? 0.98 : 0.58;
            const isFocused = focusedNodeId === n.id && !isSelected;

            return (
              <g
                key={n.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  updateUI({ selectedNodeId: n.id, rightSidebarOpen: true });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    updateUI({ selectedNodeId: n.id, rightSidebarOpen: true });
                  }
                }}
                onFocus={() => setFocusedNodeId(n.id)}
                onBlur={() => setFocusedNodeId((current) => (current === n.id ? null : current))}
                aria-label={n.label}
                role="button"
                tabIndex={0}
                className="group cursor-pointer outline-none"
                style={{ opacity: cardOpacity }}
              >
                <title>{tooltip}</title>
                {isFocused && (
                  <rect
                    x={n.x - NODE_W / 2 - 4}
                    y={n.y - NODE_H / 2 - 4}
                    width={NODE_W + 8}
                    height={NODE_H + 8}
                    rx={16}
                    ry={16}
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    opacity={0.65}
                  />
                )}

                {/* Card Shadow/Glow (Selection) */}
                {isSelected && (
                  <rect
                    x={n.x - NODE_W / 2 - 4}
                    y={n.y - NODE_H / 2 - 4}
                    width={NODE_W + 8}
                    height={NODE_H + 8}
                    rx={16}
                    ry={16}
                    fill="color-mix(in srgb, var(--primary) 12%, transparent)"
                  />
                )}

                {/* Node body */}
                <rect
                  x={n.x - NODE_W / 2}
                  y={n.y - NODE_H / 2}
                  width={NODE_W}
                  height={NODE_H}
                  rx={12}
                  ry={12}
                  fill={isSelected ? 'var(--surface-2)' : 'var(--surface-1)'}
                  stroke={
                    isSelected ? 'var(--primary)' : isActive ? 'var(--amber)' : 'var(--border)'
                  }
                  strokeWidth={isSelected || isActive ? 2 : 1.5}
                  className={
                    isActive
                      ? 'processing-node'
                      : 'transition-all duration-200 group-hover:stroke-primary/60 group-hover:fill-[var(--surface-2)]'
                  }
                  style={{
                    filter: 'var(--shadow-filter)',
                  }}
                />

                <foreignObject
                  x={n.x - NODE_W / 2}
                  y={n.y - NODE_H / 2}
                  width={NODE_W}
                  height={NODE_H}
                  style={{ pointerEvents: 'none' }}
                >
                  <div className="relative flex h-full w-full flex-col p-3">
                    <div className="mb-2 flex min-w-0 items-start gap-2">
                      <StatusIcon
                        size={14}
                        strokeWidth={2.5}
                        className="mt-0.5 shrink-0"
                        style={{ color: isSelected ? 'var(--primary)' : config.border }}
                      />
                      <div
                        style={{
                          color: config.text,
                          fontSize: '13px',
                          fontWeight: 800,
                          lineHeight: '1.5',
                        }}
                        className={`min-w-0 truncate ${isRejected ? 'line-through' : ''}`}
                      >
                        {n.label}
                      </div>
                    </div>

                    <div
                      className="mb-auto text-[11px] leading-relaxed line-clamp-2"
                      style={{
                        color: config.text,
                        opacity: contentOpacity * 0.75,
                        fontWeight: 500,
                      }}
                    >
                      {n.description}
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex min-h-3 flex-wrap gap-1">
                        {(isSelected ? n.tags.slice(0, 2) : n.tags.slice(0, 1)).map((tag) => (
                          <div
                            key={tag}
                            className="flex items-center gap-0.5 rounded-full bg-[var(--border)]/10 px-1.5 py-0.5 text-[8px] font-bold text-[var(--text-main)]"
                            style={{ opacity: isSelected ? 0.74 : 0.58 }}
                          >
                            <Hash size={8} />
                            <span>{tag}</span>
                          </div>
                        ))}
                      </div>
                      {n.progress > 0 && (
                        <div
                          className="shrink-0 text-[10px] font-semibold tabular-nums"
                          style={{ color: config.subtext, opacity: isSelected ? 0.82 : 0.56 }}
                        >
                          {Math.round(n.progress * 100)}%
                        </div>
                      )}
                    </div>
                  </div>
                </foreignObject>

                {/* Unprocessed feedback dot */}
                {fbCount > 0 && (
                  <circle
                    cx={n.x + NODE_W / 2 - 4}
                    cy={n.y - NODE_H / 2 + 4}
                    r={5}
                    fill="var(--accent)"
                    stroke="white"
                    strokeWidth={2}
                  />
                )}
              </g>
            );
          })}
        </g>
      </svg>
      <div className="absolute bottom-4 right-4 flex items-center gap-2">
        <div className="rounded-full border border-[var(--border)] bg-[var(--bg-main)]/88 px-3 py-1 text-[11px] font-medium text-[var(--text-main)] shadow-sm backdrop-blur">
          {Math.round(transform.k * 100)}%
        </div>
        <div className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-main)]/88 p-1 shadow-sm backdrop-blur">
          <CanvasControlButton
            label={t('canvas.zoomOut')}
            onClick={() => stepZoom('out')}
            icon={<Minus size={14} />}
          />
          <CanvasControlButton
            label={t('canvas.zoomIn')}
            onClick={() => stepZoom('in')}
            icon={<Plus size={14} />}
          />
          <CanvasControlButton
            label={t('canvas.fitView')}
            onClick={fitToView}
            icon={<Crosshair size={14} />}
          />
        </div>
      </div>
    </div>
  );
}

function CanvasControlButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-main)] opacity-70 transition hover:bg-[var(--border)]/50 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-2"
    >
      {icon}
    </button>
  );
}
