import { Beaker, CheckCircle2, ChevronRight, Circle, Code, FileText, Loader2, Minus, Shield, Star, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CanvasNode, ImplementationStep } from 'schemas';
import type { FeedbackParams } from '../../context/WorkbenchContext.tsx';
import { useWorkbench } from '../../context/WorkbenchContext.tsx';

export const FILE_TYPE_STYLES: Record<string, string> = {
  create: 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20',
  modify: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  test: 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20',
  delete:
    'bg-[var(--muted-foreground)]/10 text-[var(--muted-foreground)] border-[var(--muted-foreground)]/20',
};

export function getTaskMeta(node: CanvasNode): Record<string, unknown> {
  return node.metadata ?? {};
}

// ─── Task Detail ───

interface TaskDetailProps {
  node: CanvasNode;
  onFeedback: (params: FeedbackParams) => Promise<void>;
  showRating?: boolean;
  showGateConfig?: boolean;
  onReplan?: (nodeId: string) => Promise<void>;
}

export function TaskDetail({ node, onFeedback, showRating, showGateConfig, onReplan }: TaskDetailProps) {
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
  const qualityGates = meta.qualityGates as
    | Array<{ type: string; label: string; enabled: boolean; required: boolean }>
    | undefined;
  const gateStates = meta.gateStates as
    | Array<{ type: string; status: string; result?: string }>
    | undefined;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto">
          {phase && (
            <div className="mb-1 uppercase tracking-widest text-[10px] font-bold text-[var(--text-main)] opacity-40">
              {phase}
            </div>
          )}

          <h1 className="mb-3 text-[15px] font-bold leading-tight text-[var(--text-main)]">
            {node.label}
          </h1>

          <div className="mb-5 flex flex-wrap gap-1.5">
            {estimatedMinutes && (
              <span className="rounded bg-[var(--border)]/30 px-1.5 py-0.5 text-[9px] font-bold text-[var(--text-main)] opacity-60">
                ~{estimatedMinutes} MIN
              </span>
            )}
            {riskLevel && (
              <span
                className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                  riskLevel === 'high'
                    ? 'bg-destructive/10 text-destructive'
                    : riskLevel === 'medium'
                      ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                      : 'bg-[var(--primary)]/10 text-[var(--primary)]'
                }`}
              >
                {riskLevel} RISK
              </span>
            )}
            {assignee && (
              <span className="rounded bg-[var(--border)]/30 px-1.5 py-0.5 text-[9px] font-bold text-[var(--text-main)] opacity-60">
                {assignee.toUpperCase()}
              </span>
            )}
          </div>

          {goal && (
            <p className="mb-6 text-[13px] leading-relaxed text-[var(--text-main)] opacity-70">
              {goal}
            </p>
          )}

          {showGateConfig && qualityGates && (
            <GateConfigSection nodeId={node.id} gates={qualityGates} />
          )}

          {showRating && gateStates && gateStates.length > 0 && (
            <GateResultSection gateStates={gateStates} />
          )}

          {steps && steps.length > 0 && (
            <section className="mb-6">
              <SectionHeader
                icon={<Code size={12} />}
                title={t('editor.codeSteps')}
                count={steps.length}
              />
              <div className="mt-3 space-y-2">
                {steps.map((step, i) => (
                  <StepBlock key={i} step={step} index={i} />
                ))}
              </div>
            </section>
          )}

          {verifications && verifications.length > 0 && (
            <section className="mb-6">
              <SectionHeader
                icon={<Beaker size={12} />}
                title={t('editor.tests')}
                count={verifications.length}
              />
              <div className="mt-3 space-y-2">
                {verifications.map((step, i) => (
                  <StepBlock key={i} step={step} index={i} />
                ))}
              </div>
            </section>
          )}

          {files && files.length > 0 && (
            <section className="mb-6">
              <SectionHeader
                icon={<FileText size={12} />}
                title={t('editor.files')}
                count={files.length}
              />
              <div className="mt-3 space-y-1.5">
                {files.map((f) => (
                  <div
                    key={f.path}
                    className="group flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-canvas)] px-2.5 py-2 transition-colors hover:border-[var(--primary)]/30"
                  >
                    <span
                      className={`shrink-0 rounded-[4px] border px-1 py-0.5 text-[8px] font-bold uppercase ${
                        FILE_TYPE_STYLES[f.type] ??
                        'border-[var(--border)] text-[var(--text-main)] opacity-50'
                      }`}
                    >
                      {f.type}
                    </span>
                    <code className="flex-1 truncate font-mono text-[10.5px] text-[var(--text-main)] opacity-90">
                      {f.path}
                    </code>
                    {f.description && (
                      <span className="max-w-[120px] truncate text-[9px] text-[var(--text-main)] opacity-40">
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

      {showRating && <RatingSection nodeId={node.id} onFeedback={onFeedback} />}
      {showRating && onReplan && <ReplanButton nodeId={node.id} onReplan={onReplan} />}
    </div>
  );
}

// ─── Rating Section ───

function RatingSection({
  nodeId,
  onFeedback,
}: {
  nodeId: string;
  onFeedback: (params: FeedbackParams) => Promise<void>;
}) {
  const { t } = useTranslation();
  const { state } = useWorkbench();
  const ratings = state.feedback
    .filter((f) => f.nodeId === nodeId && f.rating != null)
    .map((f) => f.rating!)
    .sort((a, b) => b - a);
  const currentRating = ratings[0] ?? 0;

  async function setRating(rating: number) {
    await onFeedback({ nodeId, text: '', rating });
  }

  return (
    <div className="border-t border-[var(--border)] px-6 py-4">
      <div className="uppercase tracking-widest text-[10px] font-bold text-[var(--text-main)] opacity-40 mb-3">
        {t('feedback.rating') || 'Quality'}
      </div>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            aria-label={`${t('feedback.rating')} ${star}`}
            className="transition hover:scale-110 active:scale-95"
            title={`${star} star${star > 1 ? 's' : ''}`}
          >
            <Star
              size={18}
              fill={star <= currentRating ? 'var(--accent)' : 'none'}
              stroke={star <= currentRating ? 'var(--accent)' : 'var(--border)'}
              className="transition-colors"
            />
          </button>
        ))}
        {currentRating > 0 && (
          <span className="ml-2 text-[11px] text-[var(--text-main)] opacity-50">
            {currentRating}/5
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Section Header ───

function SectionHeader({
  icon,
  title,
  count,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2 uppercase tracking-widest text-[10px] font-bold text-[var(--text-main)] opacity-40">
      {icon}
      <span>{title}</span>
      <span className="opacity-50">({count})</span>
    </div>
  );
}

// ─── Step Block ───

function StepBlock({ step, index }: { step: ImplementationStep; index: number }) {
  const { t } = useTranslation();
  const [showCode, setShowCode] = useState(false);
  const hasDetails = step.code || step.command || step.expectedOutput;

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-canvas)] transition-colors hover:border-[var(--primary)]/30">
      <div className="flex items-start gap-3 px-3 py-2.5">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[9px] font-bold text-white mt-0.5">
          {index + 1}
        </span>
        <div className="flex-1 flex flex-col gap-1">
          <span className="text-[12px] leading-relaxed text-[var(--text-main)] opacity-90">
            {step.description}
          </span>
          {hasDetails && (
            <button
              type="button"
              onClick={() => setShowCode(!showCode)}
              className="w-fit text-[9px] font-bold uppercase tracking-wider text-[var(--primary)] opacity-60 transition-opacity hover:opacity-100"
            >
              {showCode ? t('editor.hideDetails') : t('editor.showDetails')}
            </button>
          )}
        </div>
      </div>

      {showCode && (
        <div className="border-t border-[var(--border)] bg-[var(--bg-main)] px-3 py-3">
          {step.code && (
            <pre className="mb-3 overflow-x-auto rounded-md bg-[var(--border)]/10 p-3 text-[10px] font-mono leading-relaxed text-[var(--text-main)] opacity-80">
              <code>{step.code}</code>
            </pre>
          )}
          {step.command && (
            <div className="mb-2 flex items-center gap-2 px-2 py-1 rounded bg-[var(--border)]/10 font-mono text-[10px]">
              <span className="text-[var(--text-main)] opacity-30">$</span>
              <code className="text-[var(--text-main)]">{step.command}</code>
            </div>
          )}
          {step.expectedOutput && (
            <div className="mt-2 border-t border-[var(--border)] border-dashed pt-2 px-1">
              <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[var(--primary)] opacity-60">
                <ChevronRight size={10} /> {t('editor.expected')}
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

// ─── Gate Config Section ───

interface GateItem {
  type: string;
  label: string;
  enabled: boolean;
  required: boolean;
}

function GateConfigSection({ nodeId, gates }: { nodeId: string; gates: GateItem[] }) {
  const { updateNode, state } = useWorkbench();

  async function toggleGate(index: number, field: 'enabled' | 'required') {
    const updated = state.canvas.nodes.find((n) => n.id === nodeId);
    if (!updated) return;
    const meta = updated.metadata ?? {};
    const current = (meta.qualityGates as GateItem[]) ?? [];
    const next = current.map((g, i) => (i === index ? { ...g, [field]: !g[field] } : g));
    await updateNode(nodeId, {
      metadata: { ...meta, qualityGates: next } as Record<string, unknown>,
    });
  }

  return (
    <section className="mb-6">
      <SectionHeader
        icon={<Shield size={12} />}
        title="Quality Gates"
        count={gates.filter((g) => g.enabled).length}
      />
      <div className="mt-3 space-y-2">
        {gates.map((gate, i) => (
          <div
            key={gate.type}
            className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-canvas)] px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleGate(i, 'enabled')}
                aria-label={gate.label}
                className={`h-4 w-8 rounded-full transition-colors ${gate.enabled ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`}
              >
                <span
                  className={`block h-3 w-3 rounded-full bg-white transition-transform ${gate.enabled ? 'translate-x-4' : 'translate-x-0.5'}`}
                />
              </button>
              <span className="text-[12px] font-medium text-[var(--text-main)]">{gate.label}</span>
            </div>
            {gate.enabled && (
              <label className="flex cursor-pointer items-center gap-1 text-[10px] text-[var(--muted-foreground)]">
                <input
                  type="checkbox"
                  checked={gate.required}
                  onChange={() => toggleGate(i, 'required')}
                  className="accent-[var(--primary)]"
                />
                required
              </label>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Gate Result Section ───

const GATE_STATUS_ICONS: Record<string, LucideIcon> = {
  passed: CheckCircle2,
  failed: XCircle,
  running: Loader2,
  pending: Circle,
  skipped: Minus,
};

const GATE_STATUS_COLORS: Record<string, string> = {
  passed: '#27a644',
  failed: '#ef4444',
  running: '#d97706',
  pending: 'var(--muted-foreground)',
  skipped: 'var(--muted-foreground)',
};

function GateResultSection({
  gateStates,
}: {
  gateStates: Array<{ type: string; status: string; result?: string }>;
}) {
  return (
    <section className="mb-6">
      <SectionHeader icon={<Shield size={12} />} title="Gate Results" count={gateStates.length} />
      <div className="mt-3 space-y-2">
        {gateStates.map((gs) => {
          const Icon = GATE_STATUS_ICONS[gs.status] ?? Circle;
          const color = GATE_STATUS_COLORS[gs.status] ?? 'var(--muted-foreground)';
          return (
            <div key={gs.type} className="rounded-lg border border-[var(--border)] bg-[var(--bg-canvas)] p-3">
              <div className="flex items-center gap-2">
                <Icon
                  size={14}
                  style={{ color }}
                  className={gs.status === 'running' ? 'animate-spin' : ''}
                />
                <span className="text-[12px] font-bold text-[var(--text-main)]">
                  {gs.type === 'spec-review' ? 'Spec Review' : 'Code Quality'}
                </span>
                <span className="text-[10px] font-bold uppercase" style={{ color }}>
                  {gs.status}
                </span>
              </div>
              {gs.result && (
                <pre className="mt-2 whitespace-pre-wrap rounded bg-[var(--bg-main)] p-2 font-mono text-[10px] text-[var(--muted-foreground)]">
                  {gs.result}
                </pre>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Replan Button ───

function ReplanButton({
  nodeId,
  onReplan,
}: {
  nodeId: string;
  onReplan: (id: string) => Promise<void>;
}) {
  const { state } = useWorkbench();
  const ratings = state.feedback
    .filter((f) => f.nodeId === nodeId && f.rating != null)
    .map((f) => f.rating!);
  const lowestRating = ratings.length > 0 ? Math.min(...ratings) : 5;

  if (lowestRating > 2) return null;

  return (
    <div className="border-t border-[var(--border)] px-6 py-4">
      <button
        type="button"
        onClick={() => onReplan(nodeId)}
        className="w-full rounded-lg border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-3 py-2 text-[12px] font-bold text-[var(--destructive)] transition-colors hover:bg-[var(--destructive)]/20"
      >
        ↻ Re-plan & Re-execute
      </button>
    </div>
  );
}
