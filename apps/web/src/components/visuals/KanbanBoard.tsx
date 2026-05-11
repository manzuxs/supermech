import type { CanvasEdge, CanvasNode } from 'schemas';
import { useWorkbench } from '../../context/WorkbenchContext.tsx';

const COLUMNS = [
  { key: 'pending' as const, label: 'To Do' },
  { key: 'active' as const, label: 'In Progress' },
  { key: 'done' as const, label: 'Done' },
];

const STATUS_BORDERS: Record<string, string> = {
  pending: '#404040',
  active: '#f59e0b',
  done: '#22c55e',
  accepted: '#22c55e',
};

interface KanbanBoardProps {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

export default function KanbanBoard({ nodes, edges }: KanbanBoardProps) {
  const { state, updateUI } = useWorkbench();
  const selectedId = state.ui.selectedNodeId;

  const allDone = nodes.filter((n) => n.status === 'done' || n.status === 'accepted');
  const grouped: Record<string, CanvasNode[]> = {
    pending: nodes.filter((n) => n.status === 'pending'),
    active: nodes.filter((n) => n.status === 'active'),
    done: allDone,
  };

  // Build dependency map: taskId → [dependency labels]
  const depMap = new Map<string, string[]>();
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  for (const edge of edges) {
    const depLabel = nodeMap.get(edge.from)?.label ?? edge.from;
    const existing = depMap.get(edge.to) ?? [];
    existing.push(depLabel);
    depMap.set(edge.to, existing);
  }

  if (nodes.length === 0) {
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
        No tasks yet — the agent will populate the plan during planning.
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 12,
        height: '100%',
        padding: 12,
      }}
    >
      {COLUMNS.map(({ key, label }) => {
        const items = grouped[key];
        const count = items.length;

        return (
          <div
            key={key}
            style={{
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--color-surface)',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              overflow: 'hidden',
            }}
          >
            {/* Column header */}
            <div
              style={{
                padding: '10px 12px',
                borderBottom: '1px solid var(--color-border)',
                fontWeight: 600,
                fontSize: 13,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>{label}</span>
              <span
                style={{
                  background: 'var(--color-border)',
                  borderRadius: 10,
                  padding: '1px 8px',
                  fontSize: 11,
                  fontWeight: 500,
                  color: 'var(--color-text-secondary)',
                }}
              >
                {count}
              </span>
            </div>

            {/* Cards */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: 8,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {items.map((node: CanvasNode) => {
                const isSelected = node.id === selectedId;
                const deps = depMap.get(node.id);
                const borderColor = STATUS_BORDERS[node.status] ?? '#404040';

                return (
                  <div
                    key={node.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => updateUI({ selectedNodeId: node.id })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') updateUI({ selectedNodeId: node.id });
                    }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 6,
                      border: `1px solid ${isSelected ? 'var(--color-brand)' : borderColor}`,
                      borderLeft: `3px solid ${isSelected ? 'var(--color-brand)' : borderColor}`,
                      background: isSelected
                        ? 'color-mix(in srgb, var(--color-brand) 8%, var(--color-surface))'
                        : 'var(--color-bg)',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s',
                    }}
                  >
                    {/* Title + status indicator */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          lineHeight: 1.3,
                          textDecoration:
                            node.status === 'done' || node.status === 'accepted'
                              ? 'line-through'
                              : 'none',
                          color:
                            node.status === 'done' || node.status === 'accepted'
                              ? 'var(--color-text-secondary)'
                              : 'var(--color-text)',
                        }}
                      >
                        {node.label}
                      </span>
                      {node.status === 'done' || node.status === 'accepted' ? (
                        <span style={{ fontSize: 14, flexShrink: 0, color: '#22c55e' }}>✓</span>
                      ) : (
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: borderColor,
                            flexShrink: 0,
                            marginTop: 4,
                          }}
                        />
                      )}
                    </div>

                    {/* Dependencies */}
                    {deps && deps.length > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 4,
                          marginTop: 6,
                        }}
                      >
                        {deps.map((dep) => (
                          <span
                            key={dep}
                            style={{
                              fontSize: 10,
                              padding: '1px 6px',
                              borderRadius: 4,
                              background:
                                'color-mix(in srgb, var(--color-accent) 15%, transparent)',
                              color: 'var(--color-accent)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            ⏳ {dep.length > 20 ? `${dep.slice(0, 18)}…` : dep}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Progress bar */}
                    <div
                      style={{
                        marginTop: 8,
                        height: 4,
                        borderRadius: 2,
                        background: 'var(--color-border)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.round(node.progress * 100)}%`,
                          height: '100%',
                          borderRadius: 2,
                          background:
                            node.status === 'done' || node.status === 'accepted'
                              ? '#22c55e'
                              : 'var(--color-brand)',
                          transition: 'width 0.3s',
                        }}
                      />
                    </div>

                    {/* Progress label */}
                    <div
                      style={{
                        fontSize: 10,
                        color: 'var(--color-text-secondary)',
                        marginTop: 3,
                        textAlign: 'right',
                      }}
                    >
                      {Math.round(node.progress * 100)}%
                    </div>
                  </div>
                );
              })}

              {items.length === 0 && (
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--color-text-secondary)',
                    textAlign: 'center',
                    padding: 24,
                    fontStyle: 'italic',
                  }}
                >
                  Empty
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
