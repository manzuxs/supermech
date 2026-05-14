import { Beaker, CheckCircle2, ChevronRight, Circle, Code, FileText, Loader2, Minus, Shield, Star, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CanvasNode, ImplementationStep } from 'schemas';
import type { FeedbackParams } from '../../context/WorkbenchContext.tsx';
import { useWorkbench } from '../../context/WorkbenchContext.tsx';

export const FILE_TYPE_STYLES: Record<string, string> = {
  create:
    'bg-[var(--execution-panel-accent-bg)] text-[var(--text-main)] border-[var(--execution-chip-border)]/20',
  modify:
    'bg-[color-mix(in_srgb,var(--execution-phase-3)_78%,transparent)] text-[var(--text-main)] border-transparent',
  test:
    'bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[var(--success)] border-transparent',
  delete:
    'bg-[var(--muted-foreground)]/10 text-[var(--muted-foreground)] border-[var(--muted-foreground)]/20',
};

export function getTaskMeta(node: CanvasNode): Record<string, unknown> {
  return node.metadata ?? {};
}

interface GateItem {
  type: string;
  label: string;
  enabled: boolean;
  required: boolean;
}

interface ExecutionEventItem {
  kind: string;
  message: string;
  timestamp: string;
  status?: string;
  files?: string[];
}

const QUALITY_GATE_CATALOG: GateItem[] = [
  { type: 'spec-review', label: 'Spec Compliance Review', enabled: false, required: false },
  { type: 'code-quality', label: 'Code Quality Review', enabled: false, required: false },
];

function buildQualityGates(
  riskLevel: string | undefined,
  qualityGates: GateItem[] | undefined,
): GateItem[] {
  const gateMap = new Map((qualityGates ?? []).map((gate) => [gate.type, gate]));

  return QUALITY_GATE_CATALOG.map((gate) => {
    const preset =
      riskLevel === 'high'
        ? { enabled: true, required: true }
        : riskLevel === 'medium' && gate.type === 'spec-review'
          ? { enabled: true, required: true }
          : { enabled: false, required: false };
    return {
      ...gate,
      ...preset,
      ...(gateMap.get(gate.type) ?? {}),
    };
  });
}

function formatExecutionPhase(
  phase: string | undefined,
  t: (key: string) => string,
): string | null {
  switch (phase) {
    case 'implementing':
      return t('editor.executionPhaseImplementing');
    case 'editing-files':
      return t('editor.executionPhaseEditingFiles');
    case 'running-tests':
      return t('editor.executionPhaseRunningTests');
    case 'reviewing':
      return t('editor.executionPhaseReviewing');
    case 'fixing':
      return t('editor.executionPhaseFixing');
    default:
      return null;
  }
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
  const qualityGates = buildQualityGates(riskLevel, meta.qualityGates as
    | Array<{ type: string; label: string; enabled: boolean; required: boolean }>
    | undefined);
  const gateStates = meta.gateStates as
    | Array<{ type: string; status: string; result?: string }>
    | undefined;
  const executionPhase = meta.executionPhase as string | undefined;
  const activeFiles = (meta.activeFiles as string[] | undefined) ?? [];
  const executionEvents = (meta.executionEvents as ExecutionEventItem[] | undefined) ?? [];
  const phaseLabel = formatExecutionPhase(executionPhase, t);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto">
          {phase && (
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--execution-panel-heading)]">
              {phase}
            </div>
          )}

          <h1
            className="mb-3 text-[18px] font-bold leading-tight text-[var(--text-main)]"
            style={{ fontFamily: 'var(--font-display), sans-serif' }}
          >
            {node.label}
          </h1>

          <div className="mb-5 flex flex-wrap gap-1.5">
            {estimatedMinutes && (
              <span className="rounded-full border border-[var(--execution-chip-border)]/12 bg-[var(--execution-chip-muted-bg)] px-2 py-1 text-[9px] font-bold text-[var(--execution-chip-muted-fg)]">
                ~{estimatedMinutes} MIN
              </span>
            )}
            {riskLevel && (
              <span
                className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${
                  riskLevel === 'high'
                    ? 'bg-destructive/10 text-destructive'
                    : riskLevel === 'medium'
                      ? 'bg-[var(--execution-panel-accent-bg)] text-[var(--text-main)]'
                      : 'bg-[var(--execution-chip-muted-bg)] text-[var(--execution-chip-muted-fg)]'
                }`}
              >
                {riskLevel} RISK
              </span>
            )}
            {assignee && (
              <span className="rounded-full border border-[var(--execution-chip-border)]/12 bg-[var(--execution-chip-muted-bg)] px-2 py-1 text-[9px] font-bold text-[var(--execution-chip-muted-fg)]">
                {assignee.toUpperCase()}
              </span>
            )}
          </div>

          {goal && (
            <p className="mb-6 text-[13px] leading-7 text-[var(--text-main)] opacity-78">
              {goal}
            </p>
          )}

          {showGateConfig && (
            <GateConfigSection nodeId={node.id} gates={qualityGates} />
          )}

          {showRating && (phaseLabel || activeFiles.length > 0 || executionEvents.length > 0) && (
            <ExecutionProgressSection
              executionPhase={phaseLabel}
              activeFiles={activeFiles}
              executionEvents={executionEvents}
            />
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
                    className="group flex items-center gap-2 rounded-2xl border border-[var(--execution-panel-divider)] bg-[var(--execution-panel-subtle-bg)] px-2.5 py-2 transition-colors hover:border-[var(--execution-chip-border)]/22"
                  >
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[8px] font-bold uppercase ${
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
    <div className="border-t border-[var(--execution-panel-divider)] px-6 py-4">
      <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--execution-panel-heading)]">
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
              fill={star <= currentRating ? 'var(--execution-status-active)' : 'none'}
              stroke={
                star <= currentRating
                  ? 'var(--execution-status-active)'
                  : 'var(--execution-card-stroke-muted)'
              }
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
    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--execution-panel-heading)]">
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
    <div className="overflow-hidden rounded-[22px] border border-[var(--execution-panel-divider)] bg-[var(--execution-panel-section-bg)] transition-colors hover:border-[var(--execution-chip-border)]/20">
      <div className="flex items-start gap-3 px-3 py-2.5">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--execution-panel-action-bg)] text-[9px] font-bold text-[var(--execution-panel-action-fg)]">
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
              className="w-fit text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--text-main)] opacity-60 transition-opacity hover:opacity-100"
            >
              {showCode ? t('editor.hideDetails') : t('editor.showDetails')}
            </button>
          )}
        </div>
      </div>

      {showCode && (
        <div className="border-t border-[var(--execution-panel-divider)] bg-[var(--execution-panel-code-bg)] px-3 py-3">
          {step.code && (
            <pre className="mb-3 overflow-x-auto rounded-2xl bg-[var(--bg-main)]/72 p-3 text-[10px] font-mono leading-relaxed text-[var(--text-main)] opacity-80">
              <code>{step.code}</code>
            </pre>
          )}
          {step.command && (
            <div className="mb-2 flex items-center gap-2 rounded-full bg-[var(--bg-main)]/72 px-2 py-1 font-mono text-[10px]">
              <span className="text-[var(--text-main)] opacity-30">$</span>
              <code className="text-[var(--text-main)]">{step.command}</code>
            </div>
          )}
          {step.expectedOutput && (
            <div className="mt-2 border-t border-[var(--execution-panel-divider)] border-dashed px-1 pt-2">
              <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--text-main)] opacity-60">
                <ChevronRight size={10} /> {t('editor.expected')}
              </span>
              <pre className="mt-1 whitespace-pre-wrap text-[10px] font-mono text-[var(--text-main)] opacity-45">
                {step.expectedOutput}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GateConfigSection({ nodeId, gates }: { nodeId: string; gates: GateItem[] }) {
  const { t } = useTranslation();
  const { updateNode, state } = useWorkbench();

  async function toggleGate(index: number, field: 'enabled' | 'required') {
    const updated = state.canvas.nodes.find((n) => n.id === nodeId);
    if (!updated) return;
    const meta = updated.metadata ?? {};
    const next = gates.map((g, i) => (i === index ? { ...g, [field]: !g[field] } : g));
    await updateNode(nodeId, {
      metadata: { ...meta, qualityGates: next } as Record<string, unknown>,
    });
  }

  return (
    <section className="mb-6">
      <SectionHeader
        icon={<Shield size={12} />}
        title={t('editor.qualityGates')}
        count={gates.filter((g) => g.enabled).length}
      />
      <div className="mt-3 space-y-2">
        {gates.map((gate, i) => (
          <div
            key={gate.type}
            className="flex items-center justify-between rounded-[22px] border border-[var(--execution-panel-divider)] bg-[var(--execution-panel-section-bg)] px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--execution-chip-muted-bg)] text-[9px] font-bold text-[var(--text-main)] opacity-70">
                {i + 1}
              </span>
              <button
                type="button"
                onClick={() => toggleGate(i, 'enabled')}
                aria-label={gate.label}
                className={`h-4 w-8 rounded-full transition-colors ${gate.enabled ? 'bg-[var(--execution-panel-action-bg)]' : 'bg-[var(--border)]'}`}
              >
                <span
                  className={`block h-3 w-3 rounded-full bg-white transition-transform ${gate.enabled ? 'translate-x-4' : 'translate-x-0.5'}`}
                />
              </button>
              <span className="text-[12px] font-medium text-[var(--text-main)]">
                {gate.type === 'spec-review' ? t('editor.specReview') : t('editor.codeQuality')}
              </span>
            </div>
            {gate.enabled && (
              <label className="flex cursor-pointer items-center gap-1 text-[10px] text-[var(--muted-foreground)]">
                <input
                  type="checkbox"
                  checked={gate.required}
                  onChange={() => toggleGate(i, 'required')}
                  className="accent-[var(--primary)]"
                />
                {t('editor.required')}
              </label>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function ExecutionProgressSection({
  executionPhase,
  activeFiles,
  executionEvents,
}: {
  executionPhase: string | null;
  activeFiles: string[];
  executionEvents: ExecutionEventItem[];
}) {
  const { t } = useTranslation();
  const recentEvents = executionEvents.slice(-3).reverse();

  return (
    <section className="mb-6">
      <SectionHeader
        icon={<Loader2 size={12} />}
        title={t('editor.executionProgress')}
        count={recentEvents.length}
      />
      <div className="mt-3 space-y-2">
        {executionPhase && (
          <div className="rounded-[22px] border border-[var(--execution-panel-divider)] bg-[var(--execution-panel-accent-bg)] px-3 py-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--execution-panel-heading)]">
              {t('editor.currentPhase')}
            </div>
            <div className="mt-1 text-[12px] font-semibold text-[var(--text-main)]">
              {executionPhase}
            </div>
          </div>
        )}

        {activeFiles.length > 0 && (
          <div className="rounded-[22px] border border-[var(--execution-panel-divider)] bg-[var(--execution-panel-section-bg)] p-3">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--execution-panel-heading)]">
              {t('editor.activeFiles')}
            </div>
            <div className="space-y-1.5">
              {activeFiles.slice(0, 3).map((file) => (
                <code
                  key={file}
                  className="block truncate rounded-full bg-[var(--bg-main)] px-2 py-1 text-[10px] text-[var(--text-main)]"
                >
                  {file}
                </code>
              ))}
            </div>
          </div>
        )}

        {recentEvents.length > 0 && (
          <div className="rounded-[22px] border border-[var(--execution-panel-divider)] bg-[var(--execution-panel-section-bg)] p-3">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--execution-panel-heading)]">
              {t('editor.recentEvents')}
            </div>
            <div className="space-y-2">
              {recentEvents.map((event, index) => (
                <div key={`${event.timestamp}-${index}`} className="rounded-[18px] bg-[var(--bg-main)] px-2 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase text-[var(--muted-foreground)]">
                      {event.kind}
                    </span>
                    <span className="text-[9px] text-[var(--muted-foreground)] opacity-70">
                      {event.timestamp}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] leading-relaxed text-[var(--text-main)]">
                    {event.message}
                  </div>
                  {event.files && event.files.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {event.files.slice(0, 2).map((file) => (
                        <code
                          key={file}
                          className="rounded-full bg-[var(--border)]/15 px-1.5 py-0.5 text-[9px] text-[var(--text-main)]"
                        >
                          {file}
                        </code>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
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
  passed: 'var(--execution-status-accepted)',
  failed: '#ef4444',
  running: 'var(--execution-status-active)',
  pending: 'var(--muted-foreground)',
  skipped: 'var(--muted-foreground)',
};

function GateResultSection({
  gateStates,
}: {
  gateStates: Array<{ type: string; status: string; result?: string }>;
}) {
  const { t } = useTranslation();
  return (
    <section className="mb-6">
      <SectionHeader
        icon={<Shield size={12} />}
        title={t('editor.gateResults')}
        count={gateStates.length}
      />
      <div className="mt-3 space-y-2">
        {gateStates.map((gs) => {
          const Icon = GATE_STATUS_ICONS[gs.status] ?? Circle;
          const color = GATE_STATUS_COLORS[gs.status] ?? 'var(--muted-foreground)';
          return (
            <div
              key={gs.type}
              className="rounded-[22px] border border-[var(--execution-panel-divider)] bg-[var(--execution-panel-section-bg)] p-3"
            >
              <div className="flex items-center gap-2">
                <Icon
                  size={14}
                  style={{ color }}
                  className={gs.status === 'running' ? 'animate-spin' : ''}
                />
                <span className="text-[12px] font-bold text-[var(--text-main)]">
                  {gs.type === 'spec-review' ? t('editor.specReview') : t('editor.codeQuality')}
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
  const { t } = useTranslation();
  const { state } = useWorkbench();
  const ratings = state.feedback
    .filter((f) => f.nodeId === nodeId && f.rating != null)
    .map((f) => f.rating!);
  const lowestRating = ratings.length > 0 ? Math.min(...ratings) : 5;

  if (lowestRating > 2) return null;

  return (
    <div className="border-t border-[var(--execution-panel-divider)] px-6 py-4">
      <button
        type="button"
        onClick={() => onReplan(nodeId)}
        className="w-full rounded-full border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-4 py-2.5 text-[12px] font-bold text-[var(--destructive)] transition-colors hover:bg-[var(--destructive)]/20"
      >
        ↻ {t('editor.replanAction')}
      </button>
    </div>
  );
}
