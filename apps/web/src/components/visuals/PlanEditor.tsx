import { Beaker, ChevronDown, ChevronRight, Code, Hourglass, Target } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CanvasNode, ImplementationStep, PlanHeader, WorkbenchState } from 'schemas';
import { useWorkbench } from '../../context/WorkbenchContext.tsx';
import CommandInput from '../shared/CommandInput.tsx';

type TabKey = 'goal' | 'code' | 'test';

const FILE_TYPE_STYLES: Record<string, string> = {
  create: 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20',
  modify: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  test: 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20',
  delete:
    'bg-[var(--muted-foreground)]/10 text-[var(--muted-foreground)] border-[var(--muted-foreground)]/20',
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
          </div>
        )}

        {/* Phase groups */}
        <div className="flex-1 space-y-1 p-2">
          {phaseOrder.map((name) => {
            const items = phaseMap.get(name) ?? [];
            const phaseDef = planHeader?.phases?.find((p) => p.name === name);
            return (
              <PhaseGroup
                key={name}
                name={name}
                description={phaseDef?.description}
                items={items}
                selectedId={selectedId}
                depMap={depMap}
                onSelect={(id) => selectNode(id)}
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
              selectedId={selectedId}
              depMap={depMap}
              onSelect={(id) => selectNode(id)}
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

              {/* Section feedback + commands */}
              <CommandInput
                onSubmit={async (text) => {
                  await addFeedback({ nodeId: selectedNode.id, text, section: activeTab });
                }}
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
  selectedId,
  depMap,
  onSelect,
  onStartEdit,
  editingId,
  editValue,
  onEditChange,
  onCommitEdit,
}: {
  name: string;
  description?: string;
  items: CanvasNode[];
  selectedId: string | null;
  depMap: Map<string, string[]>;
  onSelect: (id: string) => void;
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
          {items.length}
        </span>
      </button>

      {open && (
        <div className="ml-4 space-y-1">
          {items.map((node) => {
            const isSelected = node.id === selectedId;
            const isEditing = node.id === editingId;
            const deps = depMap.get(node.id);

            const rowClass = `flex w-full items-center gap-2 rounded-md px-4 py-2 text-left text-xs transition-colors ${
              isSelected
                ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                : 'text-[var(--text-main)] opacity-70 hover:bg-[var(--border)]/20 hover:opacity-100'
            }`;

            return (
              <div
                key={node.id}
                className={rowClass}
                onClick={() => onSelect(node.id)}
                role="button"
                tabIndex={-1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSelect(node.id);
                }}
              >
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
                    className="flex-1 truncate"
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

  return (
    <div className="space-y-4">
      {/* Goal text */}
      <p className="text-sm leading-relaxed text-[var(--text-main)]">{displayGoal}</p>

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
