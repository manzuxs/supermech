import { Beaker, ChevronRight, Code, FileText, Star } from 'lucide-react';
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
}

export function TaskDetail({ node, onFeedback, showRating }: TaskDetailProps) {
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

      {showRating && (
        <RatingSection nodeId={node.id} onFeedback={onFeedback} />
      )}
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
