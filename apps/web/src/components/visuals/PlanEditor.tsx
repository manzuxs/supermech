import { Beaker, Check, ChevronDown, ChevronRight, Code, Hourglass, Target } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  CanvasNode,
  ImplementationStep,
  NodeStatus,
  PlanHeader,
  WorkbenchState,
} from 'schemas';
import { useWorkbench } from '../../context/WorkbenchContext.tsx';

type TabKey = 'goal' | 'code' | 'test';

const STATUS_DOT: Record<string, string> = {
  pending: 'bg-muted-foreground/40',
  active: 'bg-[var(--accent)]',
  done: 'bg-[var(--primary)]',
  accepted: 'bg-[var(--success)]',
  rejected: 'bg-[var(--muted-foreground)]',
};

const FILE_TYPE_STYLES: Record<string, string> = {
  create: 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20',
  modify: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  test: 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20',
  delete: 'bg-[var(--muted-foreground)]/10 text-[var(--muted-foreground)] border-[var(--muted-foreground)]/20',
};

function getPlanHeader(state: WorkbenchState): PlanHeader | null {
  const meta = state.canvas?.metadata;
  if (!meta) return null;
  return ((meta as Record<string, unknown>).planHeader as PlanHeader) ?? null;
}

function getTaskMeta(node: CanvasNode): Record<string, unknown> {
  return node.metadata ?? {};
}

// ─── Main Component ───

export default function PlanEditor() {
  const { t } = useTranslation();
  const { state, selectNode, addFeedback, updateNode } = useWorkbench();
  const { nodes, edges } = state.canvas;
  const planHeader = getPlanHeader(state);
  const selectedId = state.ui.selectedNodeId;
  const selectedNode = selectedId ? (nodes.find((n) => n.id === selectedId) ?? null) : null;
  const [activeTab, setActiveTab] = useState<TabKey>('goal');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // helper: cycle status for writing-plans review
  const REVIEW_CYCLE: NodeStatus[] = ['pending', 'accepted', 'rejected'];
  function cycleStatus(node: CanvasNode) {
    const idx = REVIEW_CYCLE.indexOf(node.status);
    const next = idx >= 0 ? REVIEW_CYCLE[(idx + 1) % REVIEW_CYCLE.length] : 'pending';
    updateNode(node.id, { status: next });
  }

  function startEdit(node: CanvasNode) {
    setEditingId(node.id);
    setEditValue(node.label);
  }

  function commitEdit(id: string) {
    if (editValue.trim()) {
      updateNode(id, { label: editValue.trim() });
    }
    setEditingId(null);
  }

  // empty state
  if (nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-[var(--text-main)] opacity-50">
        {t('editor.emptyTasks')}
      </div>
    );
  }

  // group by phase, preserving order from PlanHeader + encountered order
  const phaseMap = new Map<string, CanvasNode[]>();
  const phaseOrder: string[] = [];
  if (planHeader?.phases) {
    for (const p of planHeader.phases) {
      phaseOrder.push(p.name);
      phaseMap.set(p.name, []);
    }
  }
  const noPhase: CanvasNode[] = [];
  for (const n of nodes) {
    const phase = (getTaskMeta(n).phase as string) || '';
    if (phase && phaseMap.has(phase)) {
      phaseMap.get(phase)?.push(n);
    } else if (phase) {
      phaseMap.set(phase, [n]);
      if (!phaseOrder.includes(phase)) phaseOrder.push(phase);
    } else {
      noPhase.push(n);
    }
  }

  // dependency map
  const depMap = new Map<string, string[]>();
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  for (const edge of edges) {
    const depLabel = nodeMap.get(edge.from)?.label ?? edge.from;
    const existing = depMap.get(edge.to) ?? [];
    existing.push(depLabel);
    depMap.set(edge.to, existing);
  }

  const totalCount = nodes.length;
  const doneCount = nodes.filter((n) => n.status === 'done' || n.status === 'accepted').length;

  return (
    <div className="flex h-full">
      {/* ── LEFT: Phase tree ── */}
      <div className="flex w-72 shrink-0 flex-col overflow-y-auto border-r border-[var(--border)] bg-[var(--bg-main)]">
        {/* Plan overview */}
        {planHeader && (
          <div className="border-b border-[var(--border)] p-4">
            <h2 className="mb-1 text-sm font-bold leading-snug text-[var(--text-main)]">
              {planHeader.goal}
            </h2>
            <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-[var(--text-main)] opacity-50">
              {planHeader.architecture}
            </p>
            <div className="mb-3 flex flex-wrap gap-2">
              {planHeader.techStack.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-[var(--border)] bg-[var(--border)]/10 px-2 py-1 text-[10px] font-medium text-[var(--text-main)] opacity-60"
                >
                  {t}
                </span>
              ))}
            </div>
            {/* Progress */}
            <div className="flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
                <div
                  className="h-full rounded-full bg-[var(--primary)] transition-all duration-500"
                  style={{
                    width: `${totalCount ? Math.round((doneCount / totalCount) * 100) : 0}%`,
                  }}
                />
              </div>
              <span className="whitespace-nowrap text-[11px] text-[var(--text-main)] opacity-40">
                {doneCount}/{totalCount}
              </span>
            </div>
          </div>
        )}

        {/* Phase groups */}
        <div className="flex-1 space-y-1 p-2">
          {phaseOrder.map((name) => {
            const items = phaseMap.get(name) ?? [];
            const pd = items.filter((n) => n.status === 'done' || n.status === 'accepted').length;
            const phaseDef = planHeader?.phases?.find((p) => p.name === name);
            return (
              <PhaseGroup
                key={name}
                name={name}
                description={phaseDef?.description}
                items={items}
                doneCount={pd}
                selectedId={selectedId}
                depMap={depMap}
                onSelect={(id) => selectNode(id)}
                onStatusCycle={cycleStatus}
                onStartEdit={startEdit}
                editingId={editingId}
                editValue={editValue}
                onEditChange={setEditValue}
                onCommitEdit={commitEdit}
              />
            );
          })}
          {noPhase.length > 0 && (
            <PhaseGroup
              name="Other"
              items={noPhase}
              doneCount={
                noPhase.filter((n) => n.status === 'done' || n.status === 'accepted').length
              }
              selectedId={selectedId}
              depMap={depMap}
              onSelect={(id) => selectNode(id)}
              onStatusCycle={cycleStatus}
              onStartEdit={startEdit}
              editingId={editingId}
              editValue={editValue}
              onEditChange={setEditValue}
              onCommitEdit={commitEdit}
            />
          )}
        </div>
      </div>

      {/* ── RIGHT: Detail panel ── */}
      <div className="flex flex-1 flex-col overflow-hidden bg-[var(--bg-canvas)]">
        {selectedNode ? (
          <>
            {/* Tab bar */}
            <div className="flex border-b border-[var(--border)] bg-[var(--bg-main)]">
              {(['goal', 'code', 'test'] as TabKey[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                    activeTab === tab
                      ? 'border-b-2 border-[var(--primary)] text-[var(--primary)]'
                      : 'text-[var(--text-main)] opacity-40 hover:opacity-70'
                  }`}
                >
                  {tab === 'goal' ? (
                    <>
                      <Target size={14} /> {t('editor.goal')}
                    </>
                  ) : tab === 'code' ? (
                    <>
                      <Code size={14} /> {t('editor.codeSteps')}
                    </>
                  ) : (
                    <>
                      <Beaker size={14} /> {t('editor.tests')}
                    </>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-5">
              {activeTab === 'goal' && <GoalTab node={selectedNode} />}
              {activeTab === 'code' && (
                <StepsTab
                  steps={
                    (getTaskMeta(selectedNode).implementationSteps as ImplementationStep[]) ?? null
                  }
                  emptyMessage={t('editor.noSteps')}
                />
              )}
              {activeTab === 'test' && (
                <StepsTab
                  steps={
                    (getTaskMeta(selectedNode).verificationSteps as ImplementationStep[]) ?? null
                  }
                  emptyMessage={t('editor.noTests')}
                />
              )}

              {/* Section feedback */}
              <SectionFeedback
                onFeedback={(text) =>
                  addFeedback({ nodeId: selectedNode.id, text, section: activeTab })
                }
              />
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--text-main)] opacity-40">
            {t('editor.selectTask')}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Phase Group (collapsible) ───

function PhaseGroup({
  name,
  description,
  items,
  doneCount,
  selectedId,
  depMap,
  onSelect,
  onStatusCycle,
  onStartEdit,
  editingId,
  editValue,
  onEditChange,
  onCommitEdit,
}: {
  name: string;
  description?: string;
  items: CanvasNode[];
  doneCount: number;
  selectedId: string | null;
  depMap: Map<string, string[]>;
  onSelect: (id: string) => void;
  onStatusCycle: (node: CanvasNode) => void;
  onStartEdit: (node: CanvasNode) => void;
  editingId: string | null;
  editValue: string;
  onEditChange: (value: string) => void;
  onCommitEdit: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-md px-4 py-2 text-left transition-colors hover:bg-[var(--border)]/30"
      >
        <span className="text-xs text-[var(--text-main)] opacity-30">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span className="flex-1 text-xs font-semibold text-[var(--text-main)]">{name}</span>
        {description && (
          <span className="max-w-[80px] truncate text-[10px] text-[var(--text-main)] opacity-30">
            {description}
          </span>
        )}
        <span className="rounded-full bg-[var(--border)] px-2 py-1 text-[10px] font-medium text-[var(--text-main)] opacity-40">
          {doneCount}/{items.length}
        </span>
      </button>

      {open && (
        <div className="ml-4 space-y-1">
          {items.map((node) => {
            const isSelected = node.id === selectedId;
            const isEditing = node.id === editingId;
            const deps = depMap.get(node.id);
            const isDone = node.status === 'done' || node.status === 'accepted';

            const rowClass = `flex w-full items-center gap-2 rounded-md px-4 py-2 text-left text-xs transition-colors ${
              isSelected
                ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                : 'text-[var(--text-main)] opacity-70 hover:bg-[var(--border)]/20 hover:opacity-100'
            }`;

            return (
              <div key={node.id} className={rowClass}>
                {/* Clickable status dot */}
                <span
                  role="button"
                  tabIndex={0}
                  title="Click to cycle status: pending → accepted → rejected"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusCycle(node);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.stopPropagation();
                      onStatusCycle(node);
                    }
                  }}
                  className={`h-2.5 w-2.5 shrink-0 cursor-pointer rounded-full hover:ring-2 hover:ring-[var(--primary)]/50 ${STATUS_DOT[node.status] ?? 'bg-muted-foreground/40'}`}
                />

                {/* Editable label */}
                {isEditing ? (
                  <input
                    ref={(el) => {
                      if (el && !el.matches(':focus')) el.focus();
                    }}
                    value={editValue}
                    onChange={(e) => onEditChange(e.target.value)}
                    onBlur={() => onCommitEdit(node.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onCommitEdit(node.id);
                      if (e.key === 'Escape') onCommitEdit(node.id);
                      e.stopPropagation();
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 rounded border border-[var(--primary)] bg-[var(--bg-main)] px-1.5 py-0.5 text-xs text-[var(--text-main)] outline-none"
                  />
                ) : (
                  <span
                    className={`flex-1 truncate ${isDone ? 'opacity-40 line-through' : ''}`}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      onSelect(node.id);
                      onStartEdit(node);
                    }}
                  >
                    {node.label}
                  </span>
                )}

                {deps && deps.length > 0 && (
                  <span className="flex items-center gap-1 shrink-0 text-[9px] text-[var(--text-main)] opacity-30">
                    <Hourglass size={10} />
                    {deps.length}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Goal Tab ───

function GoalTab({ node }: { node: CanvasNode }) {
  const { t } = useTranslation();
  const { updateNode } = useWorkbench();
  const meta = getTaskMeta(node);
  const goal = meta.goal as string | undefined;
  const oldDescription = meta.description as string | undefined;
  const files = meta.files as
    | Array<{ path: string; type: string; description?: string }>
    | undefined;
  const riskLevel = meta.riskLevel as string | undefined;
  const estimatedMinutes = meta.estimatedMinutes as number | undefined;
  const assignee = meta.assignee as string | undefined;

  const displayGoal = goal || oldDescription || 'No description provided.';

  function handleStatusChange(status: NodeStatus) {
    updateNode(node.id, { status });
  }

  function handleProgressClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.round((x / rect.width) * 100) / 100;
    updateNode(node.id, { progress: Math.min(1, Math.max(0, pct)) });
  }

  return (
    <div className="space-y-4">
      {/* Goal text */}
      <p className="text-sm leading-relaxed text-[var(--text-main)]">{displayGoal}</p>

      {/* Status + Progress controls */}
      <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--bg-main)] p-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-main)] opacity-40">
            {t('editor.status')}
          </span>
          <div className="flex items-center gap-1.5">
            {(['pending', 'accepted', 'rejected'] as NodeStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleStatusChange(s)}
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold transition-all ${
                  node.status === s
                    ? s === 'accepted'
                      ? 'border-[var(--success)]/40 bg-[var(--success)]/15 text-[var(--success)]'
                      : s === 'rejected'
                        ? 'border-[var(--muted-foreground)]/40 bg-[var(--muted-foreground)]/15 text-[var(--muted-foreground)]'
                        : 'border-[var(--border)] bg-[var(--border)]/20 text-[var(--text-main)]'
                    : 'border-transparent text-[var(--text-main)] opacity-30 hover:opacity-60'
                }`}
              >
                {s === 'pending' ? 'Pending' : s === 'accepted' ? 'Approved' : 'Rejected'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-main)] opacity-40">
            {t('editor.progress')}
          </span>
          <div
            role="button"
            tabIndex={0}
            onClick={handleProgressClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                const pct = e.key === ' ' ? 1 : node.progress >= 1 ? 0 : node.progress + 0.25;
                updateNode(node.id, { progress: Math.min(1, pct) });
              }
            }}
            className="h-2 flex-1 cursor-pointer overflow-hidden rounded-full bg-[var(--border)] hover:ring-1 hover:ring-[var(--primary)]/30"
          >
            <div
              className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
              style={{ width: `${Math.round(node.progress * 100)}%` }}
            />
          </div>
          <span className="text-[11px] font-medium text-[var(--text-main)] opacity-60">
            {Math.round(node.progress * 100)}%
          </span>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        {riskLevel && (
          <span
            className={`rounded-full border px-2 py-1 text-[10px] font-medium ${
              riskLevel === 'high'
                ? 'border-destructive/30 bg-destructive/10 text-destructive'
                : riskLevel === 'medium'
                  ? 'border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]'
                  : 'border-[var(--primary)]/30 bg-[var(--primary)]/10 text-[var(--primary)]'
            }`}
          >
            {riskLevel} {t('editor.risk')}
          </span>
        )}
        {estimatedMinutes && (
          <span className="rounded-full border border-[var(--border)] bg-[var(--border)]/10 px-2 py-1 text-[10px] font-medium text-[var(--text-main)] opacity-60">
            ~{estimatedMinutes}min
          </span>
        )}
        {assignee && (
          <span className="rounded-full border border-[var(--border)] bg-[var(--border)]/10 px-2 py-1 text-[10px] font-medium text-[var(--text-main)] opacity-60">
            {assignee}
          </span>
        )}
        {goal && oldDescription && (
          <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[10px] font-medium text-blue-400">
            {t('editor.legacyNote')}
          </span>
        )}
      </div>

      {/* Files */}
      {files && files.length > 0 && (
        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-main)] opacity-40">
            {t('editor.files')}
          </span>
          <div className="space-y-1">
            {files.map((f) => (
              <div
                key={f.path}
                className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-main)] px-4 py-2 text-xs"
              >
                <span
                  className={`shrink-0 rounded border px-2 py-1 text-[9px] font-semibold uppercase ${
                    FILE_TYPE_STYLES[f.type] ??
                    'border-[var(--border)] text-[var(--text-main)] opacity-50'
                  }`}
                >
                  {f.type}
                </span>
                <code className="flex-1 font-mono text-[12px] text-[var(--text-main)]">
                  {f.path}
                </code>
                {f.description && (
                  <span className="max-w-[200px] truncate text-[11px] text-[var(--text-main)] opacity-50">
                    {f.description}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Steps Tab (used for both Code Steps and Tests) ───

function StepsTab({
  steps,
  emptyMessage,
}: {
  steps: ImplementationStep[] | null;
  emptyMessage: string;
}) {
  const { t } = useTranslation();
  if (!steps || steps.length === 0) {
    return (
      <div className="py-8 text-center text-xs italic text-[var(--text-main)] opacity-40">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {steps.map((step, i) => (
        <div
          key={step.description}
          className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-main)]"
        >
          {/* Step header */}
          <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--border)]/10 px-4 py-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[10px] font-bold text-white">
              {i + 1}
            </span>
            <span className="text-xs font-medium text-[var(--text-main)]">{step.description}</span>
          </div>

          {/* Code block */}
          {step.code && (
            <div className="border-b border-[var(--border)]">
              {step.language && (
                <div className="px-4 pt-2 text-[10px] font-mono uppercase tracking-wider text-[var(--text-main)] opacity-30">
                  {step.language}
                </div>
              )}
              <pre className="overflow-x-auto p-4 text-[12px] font-mono leading-relaxed text-[var(--text-main)]">
                <code>{step.code}</code>
              </pre>
            </div>
          )}

          {/* Command */}
          {step.command && (
            <div className="flex items-center gap-2 px-4 py-2">
              <span className="text-[10px] font-mono text-[var(--text-main)] opacity-30">$</span>
              <code className="flex-1 text-[12px] font-mono text-[var(--text-main)]">
                {step.command}
              </code>
            </div>
          )}

          {/* Expected output */}
          {step.expectedOutput && (
            <div className="border-dashed border-t border-[var(--border)] px-4 py-2">
              <span className="flex items-center gap-1 text-[10px] font-medium text-[var(--primary)] opacity-60">
                <ChevronRight size={10} /> {t('editor.expected')}
              </span>
              <pre className="mt-1 whitespace-pre-wrap text-[11px] font-mono text-[var(--primary)] opacity-40">
                {step.expectedOutput}
              </pre>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Section Feedback (inline per-tab) ───

function SectionFeedback({ onFeedback }: { onFeedback: (text: string) => void }) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    if (!text.trim()) return;
    await onFeedback(text.trim());
    setText('');
    setSent(true);
    setTimeout(() => setSent(false), 2000);
  }

  return (
    <div className="mt-6 border-t border-[var(--border)] pt-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-main)] opacity-40">
          {t('editor.feedbackTitle')}
        </span>
        {sent && (
          <span className="flex items-center gap-1 text-[10px] text-[var(--primary)]">
            <Check size={10} /> {t('editor.sent')}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSubmit();
          }}
          placeholder={t('editor.feedbackPlaceholder')}
          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-main)] px-4 py-2 text-xs text-[var(--text-main)] outline-none transition-colors placeholder:opacity-30 focus:border-[var(--primary)]"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="rounded-lg bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-30"
        >
          {t('editor.send')}
        </button>
      </div>
    </div>
  );
}
