import { Beaker, ChevronRight, Code, FileText } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CanvasNode, ImplementationStep, PlanHeader, WorkbenchState } from 'schemas';
import type { FeedbackParams } from '../../context/WorkbenchContext.tsx';
import { useWorkbench } from '../../context/WorkbenchContext.tsx';
import CommandInput from '../shared/CommandInput.tsx';

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
  const { state, selectNode, addFeedback } = useWorkbench();
  const { nodes } = state.canvas;
  const planHeader = getPlanHeader(state);
  const selectedId = state.ui.selectedNodeId;
  const selectedNode = selectedId ? (nodes.find((n) => n.id === selectedId) ?? null) : null;

  // group by phase
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

  if (nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-[var(--text-main)] opacity-50">
        {t('editor.emptyTasks')}
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* ── LEFT: Card list ── */}
      <div className="flex w-56 shrink-0 flex-col overflow-y-auto border-r border-[var(--border)] bg-[var(--bg-main)]">
        {planHeader && (
          <div className="border-b border-[var(--border)] p-3">
            <h2 className="text-xs font-bold leading-snug text-[var(--text-main)]">
              {planHeader.goal}
            </h2>
          </div>
        )}

        {phaseOrder.map((name) => {
          const items = phaseMap.get(name) ?? [];
          if (items.length === 0) return null;
          return (
            <div key={name} className="px-2 pt-3 first:pt-3">
              <h3 className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-main)] opacity-40">
                {name}
              </h3>
              <div className="space-y-1">
                {items.map((node) => {
                  const meta = getTaskMeta(node);
                  const goal = (meta.goal as string) || '';
                  const isSelected = node.id === selectedId;
                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => selectNode(node.id)}
                      className={`w-full rounded-lg border px-3 py-2.5 text-left transition-all ${
                        isSelected
                          ? 'border-[var(--primary)]/40 bg-[var(--primary)]/8 shadow-sm'
                          : 'border-transparent hover:border-[var(--border)] hover:bg-[var(--border)]/10'
                      }`}
                    >
                      <span
                        className={`block text-xs font-medium leading-snug ${
                          isSelected ? 'text-[var(--primary)]' : 'text-[var(--text-main)]'
                        }`}
                      >
                        {node.label}
                      </span>
                      {goal && (
                        <span className="mt-0.5 line-clamp-2 block text-[10px] leading-relaxed text-[var(--text-main)] opacity-50">
                          {goal}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {noPhase.length > 0 && (
          <div className="px-2 pt-3">
            <h3 className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-main)] opacity-40">
              Other
            </h3>
            <div className="space-y-1">
              {noPhase.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => selectNode(node.id)}
                  className={`w-full rounded-lg border px-3 py-2.5 text-left transition-all ${
                    node.id === selectedId
                      ? 'border-[var(--primary)]/40 bg-[var(--primary)]/8 shadow-sm'
                      : 'border-transparent hover:border-[var(--border)] hover:bg-[var(--border)]/10'
                  }`}
                >
                  <span className="block text-xs font-medium text-[var(--text-main)]">
                    {node.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── CENTER: Content page ── */}
      <div className="flex flex-1 flex-col overflow-hidden bg-[var(--bg-canvas)]">
        {selectedNode ? (
          <TaskDetail
            node={selectedNode}
            onFeedback={(params) => addFeedback(params)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--text-main)] opacity-40">
            {t('editor.selectTask')}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Task Detail (right/center panel) ───

function TaskDetail({
  node,
  onFeedback,
}: {
  node: CanvasNode;
  onFeedback: (params: FeedbackParams) => Promise<void>;
}) {
  const { t } = useTranslation();
  const meta = getTaskMeta(node);
  const goal = (meta.goal as string) || (meta.description as string) || undefined;
  const files = meta.files as
    | Array<{ path: string; type: string; description?: string }>
    | undefined;
  const riskLevel = meta.riskLevel as string | undefined;
  const estimatedMinutes = meta.estimatedMinutes as number | undefined;
  const assignee = meta.assignee as string | undefined;
  const steps = meta.implementationSteps as ImplementationStep[] | undefined;
  const verifications = meta.verificationSteps as ImplementationStep[] | undefined;
  const phase = meta.phase as string | undefined;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-10 py-8">
        {/* Hero */}
        <div className="mx-auto max-w-2xl">
          {/* Phase tag */}
          {phase && (
            <span className="mb-3 inline-block rounded-full border border-[var(--border)] bg-[var(--border)]/10 px-3 py-1 text-[10px] font-medium text-[var(--text-main)] opacity-50">
              {phase}
            </span>
          )}

          {/* Title */}
          <h1 className="mb-2 text-xl font-bold leading-snug text-[var(--text-main)]">
            {node.label}
          </h1>

          {/* Badges */}
          <div className="mb-5 flex flex-wrap gap-2">
            {estimatedMinutes && (
              <span className="rounded-full bg-[var(--border)]/20 px-2.5 py-1 text-[10px] font-medium text-[var(--text-main)] opacity-60">
                ~{estimatedMinutes} min
              </span>
            )}
            {riskLevel && (
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                  riskLevel === 'high'
                    ? 'bg-destructive/10 text-destructive'
                    : riskLevel === 'medium'
                      ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                      : 'bg-[var(--primary)]/10 text-[var(--primary)]'
                }`}
              >
                {riskLevel} risk
              </span>
            )}
            {assignee && (
              <span className="rounded-full bg-[var(--border)]/20 px-2.5 py-1 text-[10px] font-medium text-[var(--text-main)] opacity-60">
                {assignee}
              </span>
            )}
          </div>

          {/* Goal */}
          {goal && (
            <p className="mb-7 text-sm leading-relaxed text-[var(--text-main)] opacity-80">
              {goal}
            </p>
          )}

          {/* Sections */}
          {steps && steps.length > 0 && (
            <section className="mb-6">
              <SectionHeader icon={<Code size={14} />} title={t('editor.codeSteps')} count={steps.length} />
              <div className="mt-3 space-y-3">
                {steps.map((step, i) => (
                  <StepBlock key={i} step={step} index={i} />
                ))}
              </div>
            </section>
          )}

          {verifications && verifications.length > 0 && (
            <section className="mb-6">
              <SectionHeader icon={<Beaker size={14} />} title={t('editor.tests')} count={verifications.length} />
              <div className="mt-3 space-y-3">
                {verifications.map((step, i) => (
                  <StepBlock key={i} step={step} index={i} />
                ))}
              </div>
            </section>
          )}

          {files && files.length > 0 && (
            <section className="mb-6">
              <SectionHeader icon={<FileText size={14} />} title={t('editor.files')} count={files.length} />
              <div className="mt-3 space-y-1">
                {files.map((f) => (
                  <div
                    key={f.path}
                    className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-main)] px-3 py-2 text-xs"
                  >
                    <span
                      className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                        FILE_TYPE_STYLES[f.type] ??
                        'border-[var(--border)] text-[var(--text-main)] opacity-50'
                      }`}
                    >
                      {f.type}
                    </span>
                    <code className="flex-1 font-mono text-[11px] text-[var(--text-main)]">
                      {f.path}
                    </code>
                    {f.description && (
                      <span className="max-w-[200px] truncate text-[10px] text-[var(--text-main)] opacity-50">
                        {f.description}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Feedback */}
      <div className="border-t border-[var(--border)] bg-[var(--bg-main)] px-10 py-3">
        <CommandInput
          onSubmit={async (text) => {
            await onFeedback({ nodeId: node.id, text, section: 'general' });
          }}
        />
      </div>
    </div>
  );
}

// ─── Section Header ───

function SectionHeader({ icon, title, count }: { icon: React.ReactNode; title: string; count: number }) {
  return (
    <div className="flex items-center gap-2 text-xs text-[var(--text-main)] opacity-60">
      {icon}
      <span className="font-semibold">{title}</span>
      <span className="opacity-40">({count})</span>
    </div>
  );
}

// ─── Step Block ───

function StepBlock({ step, index }: { step: ImplementationStep; index: number }) {
  const [showCode, setShowCode] = useState(false);
  const hasDetails = step.code || step.command || step.expectedOutput;

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-main)]">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[10px] font-bold text-white">
          {index + 1}
        </span>
        <span className="flex-1 text-xs leading-relaxed text-[var(--text-main)]">
          {step.description}
        </span>
        {hasDetails && (
          <button
            type="button"
            onClick={() => setShowCode(!showCode)}
            className="shrink-0 text-[10px] text-[var(--text-main)] opacity-40 transition-colors hover:opacity-80"
          >
            {showCode ? 'Hide details' : 'Show details'}
          </button>
        )}
      </div>

      {showCode && (
        <div className="border-t border-[var(--border)] px-4 py-3">
          {step.code && (
            <pre className="mb-3 overflow-x-auto rounded-md bg-[var(--border)]/20 p-4 text-[11px] font-mono leading-relaxed text-[var(--text-main)]">
              <code>{step.code}</code>
            </pre>
          )}
          {step.command && (
            <div className="mb-2 flex items-center gap-2 text-xs">
              <span className="font-mono text-[var(--text-main)] opacity-30">$</span>
              <code className="font-mono text-[var(--text-main)]">{step.command}</code>
            </div>
          )}
          {step.expectedOutput && (
            <div className="border-dashed border-t border-[var(--border)] pt-2">
              <span className="flex items-center gap-1 text-[10px] font-medium text-[var(--primary)] opacity-60">
                <ChevronRight size={10} /> Expected
              </span>
              <pre className="mt-1 whitespace-pre-wrap text-[10px] font-mono text-[var(--primary)] opacity-40">
                {step.expectedOutput}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
