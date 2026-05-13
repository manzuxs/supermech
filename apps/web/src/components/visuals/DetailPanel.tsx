import { Beaker, ChevronRight, Code, FileText } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CanvasNode, ImplementationStep } from 'schemas';
import type { FeedbackParams } from '../../context/WorkbenchContext.tsx';
import CommandInput from '../shared/CommandInput.tsx';

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
}

export function TaskDetail({ node, onFeedback }: TaskDetailProps) {
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
        <div className="mx-auto max-w-2xl">
          {phase && (
            <span className="mb-3 inline-block rounded-full border border-[var(--border)] bg-[var(--border)]/10 px-3 py-1 text-[10px] font-medium text-[var(--text-main)] opacity-50">
              {phase}
            </span>
          )}

          <h1 className="mb-2 text-xl font-bold leading-snug text-[var(--text-main)]">
            {node.label}
          </h1>

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

          {goal && (
            <p className="mb-7 text-sm leading-relaxed text-[var(--text-main)] opacity-80">
              {goal}
            </p>
          )}

          {steps && steps.length > 0 && (
            <section className="mb-6">
              <SectionHeader
                icon={<Code size={14} />}
                title={t('editor.codeSteps')}
                count={steps.length}
              />
              <div className="mt-3 space-y-3">
                {steps.map((step, i) => (
                  <StepBlock key={i} step={step} index={i} />
                ))}
              </div>
            </section>
          )}

          {verifications && verifications.length > 0 && (
            <section className="mb-6">
              <SectionHeader
                icon={<Beaker size={14} />}
                title={t('editor.tests')}
                count={verifications.length}
              />
              <div className="mt-3 space-y-3">
                {verifications.map((step, i) => (
                  <StepBlock key={i} step={step} index={i} />
                ))}
              </div>
            </section>
          )}

          {files && files.length > 0 && (
            <section className="mb-6">
              <SectionHeader
                icon={<FileText size={14} />}
                title={t('editor.files')}
                count={files.length}
              />
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
    <div className="flex items-center gap-2 text-xs text-[var(--text-main)] opacity-60">
      {icon}
      <span className="font-semibold">{title}</span>
      <span className="opacity-40">({count})</span>
    </div>
  );
}

// ─── Step Block ───

function StepBlock({ step, index }: { step: ImplementationStep; index: number }) {
  const { t } = useTranslation();
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
            {showCode ? t('editor.hideDetails') : t('editor.showDetails')}
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
