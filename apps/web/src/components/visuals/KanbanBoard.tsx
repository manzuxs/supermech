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
    <div className="grid h-full grid-cols-3 gap-3 p-3">
      {COLUMNS.map(({ key, label }) => {
        const items = grouped[key];
        const count = items.length;

        return (
          <div
            key={key}
            className="flex flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-main)]"
          >
            {/* Column header */}
            <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2.5">
              <span className="text-[13px] font-semibold text-[var(--text-main)]">{label}</span>
              <span className="rounded-full bg-[var(--border)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-main)] opacity-60">
                {count}
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto p-2">
              <div className="flex flex-col gap-2">
                {items.map((node: CanvasNode) => {
                  const isSelected = node.id === selectedId;
                  const deps = depMap.get(node.id);
                  const isDone = node.status === 'done' || node.status === 'accepted';
                  const isProcessing = node.status === 'active';

                  return (
                    <div
                      key={node.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => updateUI({ selectedNodeId: node.id })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') updateUI({ selectedNodeId: node.id });
                      }}
                      className={`group relative flex flex-col gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-canvas)] p-3 transition-all ${
                        isSelected ? 'ring-2 ring-[var(--primary)]' : ''
                      } ${isProcessing ? 'processing-node' : ''}`}
                    >
                      {/* Title + status indicator */}
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`text-[13px] font-medium leading-snug ${
                            isDone
                              ? 'text-[var(--text-main)] opacity-40 line-through'
                              : 'text-[var(--text-main)]'
                          }`}
                        >
                          {node.label}
                        </span>
                        {isDone ? (
                          <span className="shrink-0 text-sm text-green-500">✓</span>
                        ) : (
                          <span
                            className="mt-1 h-2 w-2 shrink-0 rounded-full"
                            style={{ background: STATUS_BORDERS[node.status] ?? 'var(--border)' }}
                          />
                        )}
                      </div>

                      {/* Dependencies */}
                      {deps && deps.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {deps.map((dep) => (
                            <span
                              key={dep}
                              className="whitespace-nowrap rounded bg-[var(--accent)] bg-opacity-10 px-1.5 py-0.5 text-[10px] text-[var(--accent)]"
                            >
                              ⏳ {dep.length > 20 ? `${dep.slice(0, 18)}…` : dep}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Progress bar */}
                      <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--border)]">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isDone ? 'bg-green-500' : 'bg-[var(--primary)]'
                          }`}
                          style={{ width: `${Math.round(node.progress * 100)}%` }}
                        />
                      </div>

                      {/* Progress label */}
                      <div className="text-right text-[10px] text-[var(--text-main)] opacity-40">
                        {Math.round(node.progress * 100)}%
                      </div>
                    </div>
                  );
                })}

                {items.length === 0 && (
                  <div className="py-6 text-center text-xs italic text-[var(--text-main)] opacity-40">
                    Empty
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
