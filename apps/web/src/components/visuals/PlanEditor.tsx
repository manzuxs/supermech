import { Beaker, ChevronDown, ChevronLeft, ChevronRight, Code, Target } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CanvasNode, ImplementationStep, PlanHeader, WorkbenchState } from 'schemas';
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
  const expandedId = state.ui.selectedNodeId;
  const [slideIndex, setSlideIndex] = useState(0);

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

  // Build slide list: each phase = one slide
  const slides: { name: string; description?: string; items: CanvasNode[] }[] = phaseOrder.map(
    (name) => {
      const phaseDef = planHeader?.phases?.find((p) => p.name === name);
      return { name, description: phaseDef?.description, items: phaseMap.get(name) ?? [] };
    },
  );
  if (noPhase.length > 0) {
    slides.push({ name: 'Other', items: noPhase });
  }

  const totalSlides = slides.length;
  const currentSlide = slides[slideIndex] ?? null;

  // Reset slide index if out of bounds
  useEffect(() => {
    if (slideIndex >= totalSlides && totalSlides > 0) {
      setSlideIndex(totalSlides - 1);
    }
  }, [slideIndex, totalSlides]);

  const goPrev = useCallback(() => {
    setSlideIndex((i) => Math.max(0, i - 1));
    if (expandedId) selectNode(null);
  }, [expandedId, selectNode]);

  const goNext = useCallback(() => {
    setSlideIndex((i) => Math.min(totalSlides - 1, i + 1));
    if (expandedId) selectNode(null);
  }, [totalSlides, expandedId, selectNode]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goPrev, goNext]);

  // empty state
  if (nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-[var(--text-main)] opacity-50">
        {t('editor.emptyTasks')}
      </div>
    );
  }

  const expandedNode = expandedId ? (nodes.find((n) => n.id === expandedId) ?? null) : null;

  return (
    <div className="flex h-full flex-col bg-[var(--bg-canvas)]">
      {/* ── Top: PlanHeader info ── */}
      {planHeader && (
        <div className="border-b border-[var(--border)] bg-[var(--bg-main)] px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-sm font-bold text-[var(--text-main)]">
                {planHeader.goal}
              </h1>
              <p className="mt-0.5 line-clamp-1 text-xs text-[var(--text-main)] opacity-50">
                {planHeader.architecture}
              </p>
            </div>
            <div className="ml-4 flex shrink-0 flex-wrap gap-1.5">
              {planHeader.techStack.map((tech) => (
                <span
                  key={tech}
                  className="rounded-full border border-[var(--border)] bg-[var(--border)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--text-main)] opacity-50"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Slide area (fills available space) ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Phase nav bar */}
        {currentSlide && (
          <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-main)] px-6 py-2">
            <button
              type="button"
              onClick={goPrev}
              disabled={slideIndex === 0}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-[var(--text-main)] opacity-50 transition-colors hover:opacity-100 disabled:pointer-events-none disabled:opacity-20"
            >
              <ChevronLeft size={14} /> {t('editor.prev') ?? 'Prev'}
            </button>

            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-[var(--text-main)]">
                {slideIndex + 1}
                <span className="opacity-30"> / {totalSlides}</span>
              </span>
              <span className="text-xs text-[var(--text-main)] opacity-60">
                {currentSlide.name}
              </span>
              {currentSlide.description && (
                <span className="hidden text-xs text-[var(--text-main)] opacity-30 sm:inline">
                  — {currentSlide.description}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={goNext}
              disabled={slideIndex >= totalSlides - 1}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-[var(--text-main)] opacity-50 transition-colors hover:opacity-100 disabled:pointer-events-none disabled:opacity-20"
            >
              {t('editor.next') ?? 'Next'} <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* Slide content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {currentSlide && (
            <div className="mx-auto max-w-3xl space-y-3">
              {currentSlide.items.map((node) => {
                const isExpanded = node.id === expandedId;
                return (
                  <TaskCard
                    key={node.id}
                    node={node}
                    isExpanded={isExpanded}
                    onToggle={() => selectNode(isExpanded ? null : node.id)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom: CommandInput ── */}
      <div className="border-t border-[var(--border)] bg-[var(--bg-main)] px-6 py-3">
        <CommandInput
          onSubmit={async (text) => {
            await addFeedback({
              nodeId: expandedNode?.id ?? '__global__',
              text,
              section: expandedNode ? 'general' : undefined,
            });
          }}
          placeholder={
            expandedNode
              ? (t('editor.feedbackPlaceholder') ?? 'Feedback or /command...')
              : (t('editor.feedbackPlaceholder') ??
                'Select a task to leave feedback, or type /execute...')
          }
        />
      </div>
    </div>
  );
}

// ─── Task Card ───

function TaskCard({
  node,
  isExpanded,
  onToggle,
}: {
  node: CanvasNode;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const meta = getTaskMeta(node);
  const goal = (meta.goal as string) || (meta.description as string) || undefined;
  const files = meta.files as
    | Array<{ path: string; type: string; description?: string }>
    | undefined;
  const riskLevel = meta.riskLevel as string | undefined;
  const estimatedMinutes = meta.estimatedMinutes as number | undefined;
  const steps = meta.implementationSteps as ImplementationStep[] | undefined;
  const verifications = meta.verificationSteps as ImplementationStep[] | undefined;

  return (
    <div
      className={`overflow-hidden rounded-lg border transition-all ${
        isExpanded
          ? 'border-[var(--primary)]/40 shadow-sm'
          : 'border-[var(--border)] hover:border-[var(--primary)]/20'
      }`}
    >
      {/* Clickable header */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 bg-[var(--bg-main)] px-5 py-3 text-left transition-colors hover:bg-[var(--border)]/10"
      >
        <span className={`mt-1 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
          <ChevronRight size={14} className="text-[var(--text-main)] opacity-30" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--text-main)]">{node.label}</span>
            {estimatedMinutes && (
              <span className="shrink-0 text-[10px] text-[var(--text-main)] opacity-40">
                ~{estimatedMinutes}min
              </span>
            )}
            {riskLevel && (
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-medium ${
                  riskLevel === 'high'
                    ? 'bg-destructive/10 text-destructive'
                    : riskLevel === 'medium'
                      ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                      : 'bg-[var(--primary)]/10 text-[var(--primary)]'
                }`}
              >
                {riskLevel}
              </span>
            )}
          </div>
          {goal && (
            <p className="mt-0.5 line-clamp-1 text-xs text-[var(--text-main)] opacity-60">{goal}</p>
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-[var(--border)] bg-[var(--bg-canvas)] px-5 py-4">
          {/* Full goal */}
          {goal && <p className="mb-4 text-sm leading-relaxed text-[var(--text-main)]">{goal}</p>}

          {/* Implementation steps */}
          {steps && steps.length > 0 && (
            <CollapsibleSection
              icon={<Code size={12} />}
              title={t('editor.codeSteps') ?? 'Implementation Steps'}
              count={steps.length}
              defaultOpen={false}
            >
              <div className="space-y-3">
                {steps.map((step, i) => (
                  <StepBlock key={i} step={step} index={i} />
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Verification steps */}
          {verifications && verifications.length > 0 && (
            <CollapsibleSection
              icon={<Beaker size={12} />}
              title={t('editor.tests') ?? 'Verification'}
              count={verifications.length}
              defaultOpen={false}
            >
              <div className="space-y-3">
                {verifications.map((step, i) => (
                  <StepBlock key={i} step={step} index={i} />
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Files */}
          {files && files.length > 0 && (
            <CollapsibleSection
              icon={<Target size={12} />}
              title={t('editor.files') ?? 'Files'}
              count={files.length}
              defaultOpen={false}
            >
              <div className="space-y-1">
                {files.map((f) => (
                  <div
                    key={f.path}
                    className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-main)] px-3 py-1.5 text-xs"
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
                      <span className="max-w-[180px] truncate text-[10px] text-[var(--text-main)] opacity-50">
                        {f.description}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Collapsible Section ───

function CollapsibleSection({
  icon,
  title,
  count,
  defaultOpen,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-3 last:mb-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-[var(--text-main)] transition-colors hover:bg-[var(--border)]/20"
      >
        <span className="flex items-center gap-1.5 text-[var(--text-main)] opacity-60">
          {icon}
          <span className="font-semibold">{title}</span>
          <span className="opacity-40">({count})</span>
        </span>
        <span className="ml-auto text-[var(--text-main)] opacity-30">
          <ChevronDown size={12} className={`transition-transform ${open ? '' : '-rotate-90'}`} />
        </span>
      </button>
      {open && <div className="mt-2 pl-2">{children}</div>}
    </div>
  );
}

// ─── Step Block ───

function StepBlock({ step, index }: { step: ImplementationStep; index: number }) {
  const [showCode, setShowCode] = useState(false);
  const hasDetails = step.code || step.command || step.expectedOutput;

  return (
    <div className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--bg-main)]">
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[9px] font-bold text-white">
          {index + 1}
        </span>
        <span className="flex-1 text-xs text-[var(--text-main)]">{step.description}</span>
        {hasDetails && (
          <button
            type="button"
            onClick={() => setShowCode(!showCode)}
            className="shrink-0 text-[10px] text-[var(--text-main)] opacity-40 hover:opacity-80"
          >
            {showCode ? 'Hide' : 'Show'} details
          </button>
        )}
      </div>

      {showCode && (
        <div className="border-t border-[var(--border)] px-3 py-2">
          {step.code && (
            <pre className="mb-2 overflow-x-auto rounded bg-[var(--border)]/20 p-3 text-[11px] font-mono leading-relaxed text-[var(--text-main)]">
              <code>{step.code}</code>
            </pre>
          )}
          {step.command && (
            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono text-[var(--text-main)] opacity-30">$</span>
              <code className="font-mono text-[var(--text-main)]">{step.command}</code>
            </div>
          )}
          {step.expectedOutput && (
            <div className="mt-2 border-dashed border-t border-[var(--border)] pt-2">
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
