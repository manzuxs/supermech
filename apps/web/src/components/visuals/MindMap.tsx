import type { CanvasNode, NodeStatus } from 'schemas';
import { useWorkbench } from '../../context/WorkbenchContext.tsx';

const NODE_W = 200;
const NODE_H = 68;
const H_GAP = 24;
const V_GAP = 140;
const PAD = 40;

interface LayoutNode {
  id: string;
  label: string;
  status: NodeStatus;
  description: string;
  x: number;
  y: number;
}

const STATUS_COLORS: Record<NodeStatus, { bg: string; border: string; text: string; subtext: string }> = {
  pending: { 
    bg: 'var(--bg-canvas)', 
    border: 'var(--border)', 
    text: 'var(--text-main)',
    subtext: 'var(--muted-foreground)'
  },
  active: {
    bg: 'color-mix(in srgb, var(--accent) 5%, var(--bg-canvas))',
    border: 'var(--accent)',
    text: 'var(--text-main)',
    subtext: 'var(--muted-foreground)'
  },
  accepted: {
    bg: 'color-mix(in srgb, #22c55e 8%, var(--bg-canvas))',
    border: '#22c55e',
    text: '#166534',
    subtext: '#16a34a'
  },
  rejected: { 
    bg: 'var(--bg-canvas)', 
    border: 'var(--border)', 
    text: 'var(--muted-foreground)',
    subtext: 'var(--muted-foreground)'
  },
  done: {
    bg: 'color-mix(in srgb, var(--primary) 8%, var(--bg-canvas))',
    border: 'var(--primary)',
    text: 'var(--primary)',
    subtext: 'var(--primary)'
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
  // Inset by 2px so arrow tip sits slightly inside the card edge
  const y2 = to.y - NODE_H / 2 + 2;
  const cy1 = y1 + (y2 - y1) * 0.5;
  const cy2 = y1 + (y2 - y1) * 0.5;
  return `M ${x1} ${y1} C ${x1} ${cy1}, ${x2} ${cy2}, ${x2} ${y2}`;
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
    <div style={{ width: '100%', height: '100%', overflow: 'auto' }} className="canvas-dot-grid">
      <svg width={svgW} height={svgH} style={{ display: 'block' }} role="img" aria-label="Mind map">
        <defs>
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
              stroke="#94a3b8"
              strokeWidth={1.5}
              markerEnd="url(#arrowhead)"
              className="opacity-70"
            />
          );
        })}

        {/* Nodes */}
        {layoutNodes.map((n) => {
          const colors = STATUS_COLORS[n.status];
          const isSelected = n.id === selectedId;
          const isRejected = n.status === 'rejected';
          const isActive = n.status === 'active';
          const fbCount = state.feedback.filter(
            (f) => f.nodeId === n.id && !('processedAt' in f),
          ).length;
          const tooltip = n.description || n.label;

          return (
            <g
              key={n.id}
              onClick={() => updateUI({ selectedNodeId: n.id })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') updateUI({ selectedNodeId: n.id });
              }}
              role="button"
              tabIndex={0}
              className="group cursor-pointer outline-none transition-transform duration-200 active:scale-95"
            >
              <title>{tooltip}</title>
              
              {/* Card Shadow/Glow (Selection) */}
              {isSelected && (
                <rect
                  x={n.x - NODE_W / 2 - 4}
                  y={n.y - NODE_H / 2 - 4}
                  width={NODE_W + 8}
                  height={NODE_H + 8}
                  rx={14}
                  ry={14}
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
                fill={colors.bg}
                stroke={isSelected ? 'var(--primary)' : isActive ? 'var(--accent)' : colors.border}
                strokeWidth={isSelected || isActive ? 2 : 1}
                className={isActive ? 'processing-node' : 'transition-colors duration-200 group-hover:stroke-primary/40'}
                filter="drop-shadow(0 1px 2px rgb(0 0 0 / 0.03))"
              />

              {/* Content via foreignObject for robust truncation */}
              <foreignObject
                x={n.x - NODE_W / 2 + 12}
                y={n.y - NODE_H / 2 + 12}
                width={NODE_W - 24}
                height={NODE_H - 24}
                style={{ pointerEvents: 'none' }}
              >
                <div 
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'center',
                    gap: '2px'
                  }}
                >
                  <div 
                    style={{ 
                      color: colors.text, 
                      fontSize: '13px', 
                      fontWeight: 600, 
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis',
                      lineHeight: '1.2'
                    }}
                    className={isRejected ? 'opacity-40 line-through' : 'opacity-100'}
                  >
                    {n.label}
                  </div>
                  {n.description && (
                    <div 
                      style={{ 
                        color: colors.subtext, 
                        fontSize: '11px', 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        opacity: 0.7,
                        lineHeight: '1.2'
                      }}
                    >
                      {n.description}
                    </div>
                  )}
                </div>
              </foreignObject>

              {/* Unprocessed feedback dot */}
              {fbCount > 0 && (
                <circle
                  cx={n.x + NODE_W / 2 - 8}
                  cy={n.y - NODE_H / 2 + 8}
                  r={5}
                  fill="#f97316"
                  stroke="white"
                  strokeWidth={2}
                />
              )}

              {/* Status Indicator Bar (Left) */}
              <rect
                x={n.x - NODE_W / 2}
                y={n.y - NODE_H / 2 + 16}
                width={3}
                height={NODE_H - 32}
                rx={1.5}
                fill={isSelected ? 'var(--primary)' : colors.border}
                className={isRejected ? 'opacity-20' : 'opacity-100'}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
