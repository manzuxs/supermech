import type { CanvasNode, NodeStatus } from 'schemas';
import { useWorkbench } from '../../context/WorkbenchContext.tsx';

const NODE_W = 160;
const NODE_H = 44;
const H_GAP = 24;
const V_GAP = 80;
const PAD = 40;

interface LayoutNode {
  id: string;
  label: string;
  status: NodeStatus;
  x: number;
  y: number;
}

const STATUS_COLORS: Record<NodeStatus, { bg: string; border: string; text: string }> = {
  pending: { bg: '#262626', border: '#404040', text: '#a3a3a3' },
  active: { bg: '#451a03', border: '#f59e0b', text: '#fbbf24' },
  accepted: { bg: '#052e16', border: '#22c55e', text: '#86efac' },
  rejected: { bg: '#1a1a1a', border: '#525252', text: '#737373' },
  done: { bg: '#172554', border: '#3b82f6', text: '#93c5fd' },
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
    layoutNodes.push({ id, label: n.label, status: n.status, x, y });

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
  const y2 = to.y - NODE_H / 2;
  const cy = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`;
}

interface MindMapProps {
  nodes: CanvasNode[];
}

export default function MindMap({ nodes }: MindMapProps) {
  const { state, updateUI } = useWorkbench();
  const { nodes: layoutNodes, edges } = buildLayout(nodes);

  if (layoutNodes.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'var(--color-text-secondary)',
          fontSize: 13,
        }}
      >
        No ideas yet — the agent will populate the map during brainstorming.
      </div>
    );
  }

  const svgW = Math.max(...layoutNodes.map((n) => n.x)) + NODE_W / 2 + PAD;
  const svgH = Math.max(...layoutNodes.map((n) => n.y)) + NODE_H / 2 + PAD;
  const selectedId = state.ui.selectedNodeId;

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
      <svg width={svgW} height={svgH} style={{ display: 'block' }} role="img" aria-label="Mind map">
        {/* Edges */}
        {edges.map((e) => {
          const from = layoutNodes.find((n) => n.id === e.from);
          const to = layoutNodes.find((n) => n.id === e.to);
          if (!from || !to) return null;
          return (
            <path
              key={`${e.from}-${e.to}`}
              d={edgePath(from, to)}
              fill="none"
              stroke="#404040"
              strokeWidth={2}
            />
          );
        })}

        {/* Nodes */}
        {layoutNodes.map((n) => {
          const colors = STATUS_COLORS[n.status];
          const isSelected = n.id === selectedId;
          const isRejected = n.status === 'rejected';
          const isActive = n.status === 'active';

          return (
            <g
              key={n.id}
              onClick={() => updateUI({ selectedNodeId: n.id })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') updateUI({ selectedNodeId: n.id });
              }}
              role="button"
              tabIndex={0}
              style={{ cursor: 'pointer' }}
            >
              {/* Selection ring */}
              {isSelected && (
                <rect
                  x={n.x - NODE_W / 2 - 3}
                  y={n.y - NODE_H / 2 - 3}
                  width={NODE_W + 6}
                  height={NODE_H + 6}
                  rx={10}
                  ry={10}
                  fill="none"
                  stroke="var(--color-brand)"
                  strokeWidth={2}
                />
              )}
              {/* Node body */}
              <rect
                x={n.x - NODE_W / 2}
                y={n.y - NODE_H / 2}
                width={NODE_W}
                height={NODE_H}
                rx={8}
                ry={8}
                fill={colors.bg}
                stroke={isActive ? '#f59e0b' : colors.border}
                strokeWidth={isActive ? 2 : 1}
                className={isActive ? 'mindmap-node--active' : undefined}
              />
              {/* Label */}
              <text
                x={n.x}
                y={n.y + 1}
                textAnchor="middle"
                dominantBaseline="central"
                fill={colors.text}
                fontSize={13}
                textDecoration={isRejected ? 'line-through' : 'none'}
                style={{ userSelect: 'none' }}
              >
                {n.label.length > 18 ? `${n.label.slice(0, 16)}…` : n.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
