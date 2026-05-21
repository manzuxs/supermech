import { getBrainstormPlanningReadiness, getExecutionOrigin } from '@supermech/schema';
import { Crosshair, Link2, MessageSquare, Send, Sparkles, Tag, Target } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorkbench } from '../../context/WorkbenchContext.tsx';
import { getCommand } from '../../lib/commands.ts';
import { TaskDetail } from '../visuals/DetailPanel.tsx';

function SectionHeader({
  icon,
  title,
  count,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
}) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--execution-panel-heading)]">
      {icon}
      <span>{title}</span>
      {count !== undefined && <span className="opacity-50">({count})</span>}
    </div>
  );
}

export default function FloatingFeedback() {
  const { t } = useTranslation();
  const {
    state,
    addFeedback,
    updateUI,
    requestReplan,
    updateNode,
    markFeedbackProcessed,
    switchSkill,
  } = useWorkbench();
  const [text, setText] = useState('');
  const isBrainstorming = state.canvas.skillType === 'brainstorming';
  const isWritingPlans = state.canvas.skillType === 'writing-plans';
  const isExecutingPlans = state.canvas.skillType === 'executing-plans';
  const isInspectorOpen = state.ui.rightSidebarOpen;

  const selectedNode = state.ui.selectedNodeId
    ? (state.canvas.nodes.find((n) => n.id === state.ui.selectedNodeId) ?? null)
    : null;
  const selectedNodeMetadata =
    selectedNode && typeof selectedNode.metadata === 'object' && selectedNode.metadata !== null
      ? (selectedNode.metadata as Record<string, unknown>)
      : null;
  const selectedNodeDescription = selectedNodeMetadata
    ? String(selectedNodeMetadata.description ?? '')
    : '';
  const selectedNodeTags =
    selectedNodeMetadata && Array.isArray(selectedNodeMetadata.tags)
      ? (selectedNodeMetadata.tags as string[])
      : [];
  const childNodes = selectedNode
    ? state.canvas.nodes.filter((node) => node.parentId === selectedNode.id)
    : [];
  const { approvedNodeCount, canEnterWritingPlans } = getBrainstormPlanningReadiness(
    state.canvas.nodes,
  );

  const nodeFeedback = state.feedback
    .filter((entry) =>
      selectedNode ? entry.nodeId === selectedNode.id : entry.nodeId === '__global__',
    )
    .slice()
    .reverse();
  const quickActions = [
    t('feedback.quickRefine'),
    t('feedback.quickExpand'),
    t('feedback.quickRegenerate'),
  ];
  const statusKeyMap: Record<string, string> = {
    pending: 'feedback.statusPending',
    active: 'feedback.statusActive',
    accepted: 'feedback.statusAccepted',
    rejected: 'feedback.statusRejected',
    done: 'feedback.statusDone',
  };
  const statusToneMap: Record<
    string,
    { bg: string; border: string; chipBg: string; chipText: string }
  > = {
    pending: {
      bg: 'color-mix(in srgb, var(--bg-canvas) 88%, var(--bg-main))',
      border: 'color-mix(in srgb, var(--border) 82%, transparent)',
      chipBg: 'color-mix(in srgb, var(--border) 36%, var(--bg-main))',
      chipText: 'var(--text-main)',
    },
    active: {
      bg: 'color-mix(in srgb, var(--amber) 25%, var(--bg-canvas))',
      border: 'color-mix(in srgb, var(--amber) 26%, var(--border))',
      chipBg: 'color-mix(in srgb, var(--amber) 18%, var(--bg-canvas))',
      chipText: 'var(--text-main)',
    },
    accepted: {
      bg: 'color-mix(in srgb, var(--success) 25%, var(--bg-canvas))',
      border: 'color-mix(in srgb, var(--success) 26%, var(--border))',
      chipBg: 'color-mix(in srgb, var(--success) 18%, var(--bg-canvas))',
      chipText: 'var(--success)',
    },
    rejected: {
      bg: 'color-mix(in srgb, var(--border) 28%, var(--bg-canvas))',
      border: 'color-mix(in srgb, var(--border) 72%, transparent)',
      chipBg: 'color-mix(in srgb, var(--border) 42%, var(--bg-canvas))',
      chipText: 'var(--muted-foreground)',
    },
    done: {
      bg: 'color-mix(in srgb, var(--primary) 25%, var(--bg-canvas))',
      border: 'color-mix(in srgb, var(--primary) 24%, var(--border))',
      chipBg: 'color-mix(in srgb, var(--primary) 16%, var(--bg-canvas))',
      chipText: 'var(--primary)',
    },
  };

  function parseSlashCommand(input: string) {
    const normalized = input.trim().slice(1).trim();
    if (!normalized) return null;
    const [commandName] = normalized.split(/\s+/, 1);
    return getCommand(commandName);
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    if (trimmed.startsWith('/')) {
      const command = parseSlashCommand(trimmed);
      if (command) {
        await command.run();
        setText('');
        return;
      }
    }

    await addFeedback({
      nodeId: state.ui.selectedNodeId ?? '__global__',
      text: trimmed,
      section: 'general',
    });
    setText('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSubmit();
    }
  }

  function fillQuickAction(value: string) {
    setText(value);
  }

  function locateNode(nodeId: string) {
    window.dispatchEvent(new CustomEvent('workbench:focus-node', { detail: { nodeId } }));
  }

  async function setBrainstormStatus(status: 'accepted' | 'rejected') {
    if (!selectedNode) return;
    await updateNode(selectedNode.id, { status });
  }

  async function enterWritingPlans() {
    if (!canEnterWritingPlans) return;
    await switchSkill('writing-plans');
  }

  if (!isInspectorOpen) {
    return null;
  }

  if (isBrainstorming) {
    const statusTone = selectedNode ? statusToneMap[selectedNode.status] : null;

    return (
      <aside
        className="relative flex h-full min-h-0 flex-col border-l border-[var(--execution-panel-divider)] bg-[var(--execution-panel-bg)]"
        style={{ boxShadow: 'var(--execution-panel-shadow)' }}
      >
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {selectedNode ? (
            <div className="mx-auto">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--execution-panel-heading)]">
                {t('feedback.nodeContext')}
              </div>
              <h1
                className="mb-3 text-[18px] font-bold leading-tight text-[var(--text-main)]"
                style={{ fontFamily: 'var(--font-display), sans-serif' }}
              >
                {selectedNode.label}
              </h1>

              <div className="mb-5 flex flex-wrap gap-1.5">
                <span
                  className="rounded-full px-2 py-1 text-[9px] font-bold uppercase"
                  style={
                    statusTone
                      ? { background: statusTone.chipBg, color: statusTone.chipText }
                      : {
                          background: 'var(--execution-chip-muted-bg)',
                          color: 'var(--execution-chip-muted-fg)',
                        }
                  }
                >
                  {t(statusKeyMap[selectedNode.status] ?? 'feedback.statusPending')}
                </span>
                {selectedNodeTags[0] && (
                  <span className="rounded-full bg-[var(--execution-panel-accent-bg)] px-2 py-1 text-[9px] font-bold uppercase text-[var(--text-main)]">
                    {selectedNodeTags[0]}
                  </span>
                )}
              </div>

              {selectedNodeDescription && (
                <p className="mb-6 text-[13px] leading-7 text-[var(--text-main)] opacity-78">
                  {selectedNodeDescription}
                </p>
              )}

              <div className="mb-6 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => locateNode(selectedNode.id)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-main)]/80 px-3 py-1.5 text-[12px] font-medium text-[var(--text-main)] opacity-82 transition hover:opacity-100"
                >
                  <Crosshair className="h-3.5 w-3.5" />
                  <span>{t('feedback.locate')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBrainstormStatus('accepted')}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--success)]/12 px-3 py-1.5 text-[12px] font-medium text-[var(--success)] transition hover:bg-[var(--success)]/18"
                >
                  <span>{t('feedback.acceptAction', { defaultValue: 'Accept' })}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBrainstormStatus('rejected')}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--muted-foreground)]/12 px-3 py-1.5 text-[12px] font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--muted-foreground)]/18"
                >
                  <span>{t('feedback.rejectAction', { defaultValue: 'Reject' })}</span>
                </button>
              </div>

              <div className="mt-4 border-t border-[var(--execution-panel-divider)] pt-4" />

              <div className="mb-6 rounded-[22px] border border-[var(--execution-panel-divider)] bg-[var(--execution-panel-accent-bg)] p-3">
                <div className="text-[12px] font-medium text-[var(--text-main)]">
                  {t('feedback.planTransitionTitle', {
                    defaultValue: 'Ready to turn ideas into a plan?',
                  })}
                </div>
                <div className="mt-1 text-[12px] leading-5 text-[var(--text-main)] opacity-55">
                  {canEnterWritingPlans
                    ? t('feedback.planTransitionHint', {
                        defaultValue:
                          'The approved design is ready. Move into writing-plans to formalize it into an implementation plan.',
                      })
                    : approvedNodeCount === 0
                      ? t('feedback.planTransitionBlockedHint', {
                          defaultValue:
                            'Approve at least one idea before moving into writing-plans.',
                        })
                      : t('feedback.planTransitionResolveHint', {
                          defaultValue:
                            'Resolve all active or pending brainstorming nodes before moving into writing-plans.',
                        })}
                </div>
                <button
                  type="button"
                  onClick={enterWritingPlans}
                  disabled={!canEnterWritingPlans}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--primary)] px-3 py-1.5 text-[12px] font-medium text-white shadow-sm transition hover:opacity-92 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100"
                >
                  <span>
                    {t('feedback.enterWritingPlans', {
                      defaultValue: 'Enter Writing Plans',
                    })}
                  </span>
                </button>
              </div>

              <section className="mb-6">
                <SectionHeader
                  icon={<Tag size={12} />}
                  title={t('feedback.tags')}
                  count={selectedNodeTags.length}
                />
                <div className="mt-3 rounded-[22px] border border-[var(--execution-panel-divider)] bg-[var(--execution-panel-section-bg)] p-3">
                  <div className="flex flex-wrap gap-2">
                    {selectedNodeTags.length > 0 ? (
                      selectedNodeTags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-[var(--execution-chip-border)]/12 bg-[var(--execution-chip-muted-bg)] px-2.5 py-1 text-[11px] font-bold text-[var(--execution-chip-muted-fg)]"
                        >
                          #{tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-[12px] text-[var(--muted-foreground)]">
                        {t('feedback.noTags')}
                      </span>
                    )}
                  </div>
                </div>
              </section>

              {childNodes.length > 0 && (
                <section className="mb-6">
                  <SectionHeader
                    icon={<Link2 size={12} />}
                    title={t('feedback.relatedChildren')}
                    count={childNodes.length}
                  />
                  <div className="mt-3 rounded-[22px] border border-[var(--execution-panel-divider)] bg-[var(--execution-panel-section-bg)] p-3">
                    <div className="flex flex-wrap gap-2">
                      {childNodes.slice(0, 4).map((node) => (
                        <button
                          key={node.id}
                          type="button"
                          onClick={() => updateUI({ selectedNodeId: node.id })}
                          className="rounded-full border border-[var(--execution-chip-border)]/12 bg-[var(--execution-panel-accent-bg)] px-2.5 py-1 text-[11px] font-bold text-[var(--text-main)] transition hover:opacity-80"
                        >
                          {node.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              <section className="mb-6">
                <SectionHeader
                  icon={<MessageSquare size={12} />}
                  title={t('feedback.history')}
                  count={nodeFeedback.length}
                />
                <div className="mt-3 space-y-2">
                  {nodeFeedback.length > 0 ? (
                    nodeFeedback.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-[22px] border border-[var(--execution-panel-divider)] bg-[var(--execution-panel-section-bg)] p-3"
                      >
                        <div className="text-[13px] leading-6 text-[var(--text-main)] opacity-78">
                          {entry.text}
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-[11px] text-[var(--text-main)] opacity-40">
                          <span>{new Date(entry.createdAt).toLocaleString()}</span>
                          {!entry.processedAt && (
                            <span className="rounded-full bg-[var(--accent)]/12 px-2 py-0.5 text-[var(--accent)] opacity-100">
                              {t('feedback.pendingBadge')}
                            </span>
                          )}
                          {entry.processedAt && (
                            <span className="rounded-full bg-[var(--success)]/12 px-2 py-0.5 text-[var(--success)] opacity-100">
                              {t('feedback.processedBadge', { defaultValue: 'Processed' })}
                            </span>
                          )}
                          {!entry.processedAt && (
                            <button
                              type="button"
                              onClick={() => markFeedbackProcessed(entry.id)}
                              className="rounded-full border border-[var(--execution-chip-border)]/20 bg-[var(--execution-panel-action-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--execution-panel-action-fg)] opacity-80 transition hover:opacity-100"
                            >
                              {t('feedback.markProcessed', { defaultValue: 'Mark Processed' })}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[22px] border border-[var(--execution-panel-divider)] bg-[var(--execution-panel-section-bg)] p-3">
                      <span className="text-[12px] text-[var(--muted-foreground)]">
                        {t('feedback.noHistory')}
                      </span>
                    </div>
                  )}
                </div>
              </section>
            </div>
          ) : (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center px-6 text-center">
              <Target className="mb-3 h-5 w-5 text-[var(--text-main)] opacity-35" />
              <div className="text-[14px] font-medium text-[var(--text-main)]">
                {t('feedback.emptyTitle')}
              </div>
              <div className="mt-2 max-w-[220px] text-[12px] leading-6 text-[var(--text-main)] opacity-45">
                {t('feedback.emptyHint')}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-[var(--execution-panel-divider)] bg-[var(--execution-panel-bg)] px-4 py-4">
          <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-[var(--execution-panel-heading)]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>
              {selectedNode
                ? t('feedback.target', { name: selectedNode.label })
                : t('feedback.globalTarget')}
            </span>
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => fillQuickAction(action)}
                className="rounded-full border border-[var(--execution-chip-border)]/18 bg-[var(--execution-panel-subtle-bg)] px-3 py-1 text-[11px] font-medium text-[var(--text-main)] opacity-78 transition hover:border-[var(--execution-chip-border)]/40 hover:bg-[var(--execution-panel-accent-bg)] hover:opacity-100"
              >
                {action}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2 rounded-[28px] border border-[var(--execution-panel-divider)] bg-[var(--execution-panel-section-bg)] p-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-label={t('editor.feedbackInputLabel')}
              name="feedbackMessage"
              autoComplete="off"
              onKeyDown={handleKeyDown}
              placeholder={
                selectedNode
                  ? t('feedback.nodePlaceholder', { name: selectedNode.label })
                  : t('feedback.placeholder', {
                      defaultValue: 'Leave feedback or try /execute',
                    })
              }
              className="min-h-24 flex-1 resize-none bg-transparent px-2 py-2 text-[14px] text-[var(--text-main)] outline-none placeholder:opacity-30 focus-visible:outline-2 focus-visible:outline-[var(--execution-panel-action-bg)] focus-visible:outline-offset-2"
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!text.trim()}
              aria-label={t('feedback.submit')}
              className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-[var(--execution-panel-action-bg)] px-4 text-[12px] font-medium text-[var(--execution-panel-action-fg)] shadow-sm transition hover:opacity-92 active:scale-95 disabled:pointer-events-none disabled:grayscale"
              title={t('feedback.submit')}
            >
              <Send className="h-4 w-4" />
              <span>{t('feedback.submit')}</span>
            </button>
          </div>
        </div>
      </aside>
    );
  }

  if (isWritingPlans || isExecutingPlans) {
    return (
      <aside
        className="relative flex h-full min-h-0 flex-col border-l border-[var(--execution-panel-divider)] bg-[var(--execution-panel-bg)]"
        style={{ boxShadow: 'var(--execution-panel-shadow)' }}
      >
        {isExecutingPlans && state.meta.worktreePath && (
          <div className="shrink-0 border-b border-[var(--execution-panel-divider)] px-4 py-1.5 text-[10px] text-[var(--text-main)] opacity-45 font-mono truncate">
            {state.meta.worktreePath}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {isWritingPlans && (
            <div className="mx-4 mt-4 rounded-[22px] border border-[var(--execution-panel-divider)] bg-[var(--execution-panel-accent-bg)] p-3">
              <div className="text-[12px] font-medium text-[var(--text-main)]">
                {t('feedback.executeTransitionTitle', {
                  defaultValue: 'Plan complete. Choose an execution mode.',
                })}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => switchSkill('executing-plans', 'inline')}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary)] px-3 py-1.5 text-[12px] font-medium text-white shadow-sm transition hover:opacity-92 active:scale-95"
                >
                  {t('feedback.executeTransitionInline', { defaultValue: 'Inline Execution' })}
                </button>
                <button
                  type="button"
                  onClick={() => switchSkill('executing-plans', 'subagent')}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--execution-chip-border)]/20 bg-[var(--execution-panel-action-bg)] px-3 py-1.5 text-[12px] font-medium text-[var(--execution-panel-action-fg)] shadow-sm transition hover:opacity-92 active:scale-95"
                >
                  {t('feedback.executeTransitionSubagent', {
                    defaultValue: 'Subagent-Driven',
                  })}
                </button>
              </div>
            </div>
          )}
          {isExecutingPlans &&
            (() => {
              const executionOrigin = getExecutionOrigin(state.canvas.metadata);
              if (!executionOrigin) return null;
              return (
                <div className="mx-4 mt-4 rounded-[22px] border border-[var(--execution-panel-divider)] bg-[var(--execution-panel-accent-bg)] p-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--execution-panel-heading)]">
                    {t('feedback.executionOrigin', { defaultValue: 'Execution Origin' })}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-[var(--text-main)]">
                      {executionOrigin.mode === 'subagent'
                        ? t('feedback.executionModeSubagent', { defaultValue: 'Subagent-Driven' })
                        : t('feedback.executionModeInline', { defaultValue: 'Inline Execution' })}
                    </span>
                    <span className="text-[10px] text-[var(--muted-foreground)]">
                      {executionOrigin.sourcePlanSessionId}
                    </span>
                  </div>
                </div>
              );
            })()}
          {selectedNode ? (
            <TaskDetail
              node={selectedNode}
              onFeedback={(params) => addFeedback(params)}
              showRating={isExecutingPlans}
              showGateConfig={isWritingPlans}
              onReplan={requestReplan}
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <div>
                <div className="text-[14px] font-medium text-[var(--text-main)]">
                  {t('feedback.emptyTitle')}
                </div>
                <p className="mt-2 text-[12px] leading-6 text-[var(--text-main)] opacity-45">
                  {t('feedback.emptyHint')}
                </p>
              </div>
            </div>
          )}
        </div>

        {selectedNode && (
          <div className="border-t border-[var(--execution-panel-divider)] bg-[var(--execution-panel-bg)] px-4 py-4">
            <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-[var(--execution-panel-heading)]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{t('feedback.target', { name: selectedNode.label })}</span>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => fillQuickAction(action)}
                  className="rounded-full border border-[var(--execution-chip-border)]/18 bg-[var(--execution-panel-subtle-bg)] px-3 py-1 text-[11px] font-medium text-[var(--text-main)] opacity-78 transition hover:border-[var(--execution-chip-border)]/40 hover:bg-[var(--execution-panel-accent-bg)] hover:opacity-100"
                >
                  {action}
                </button>
              ))}
            </div>
            <div className="flex items-end gap-2 rounded-[28px] border border-[var(--execution-panel-divider)] bg-[var(--execution-panel-section-bg)] p-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                aria-label={t('editor.feedbackInputLabel')}
                name="feedbackMessage"
                autoComplete="off"
                onKeyDown={handleKeyDown}
                placeholder={t('feedback.nodePlaceholder', {
                  name: selectedNode.label,
                  defaultValue: `Leave feedback for ${selectedNode.label} or try /execute`,
                })}
                className="min-h-24 flex-1 resize-none bg-transparent px-2 py-2 text-[14px] text-[var(--text-main)] outline-none placeholder:opacity-30 focus-visible:outline-2 focus-visible:outline-[var(--execution-panel-action-bg)] focus-visible:outline-offset-2"
              />
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!text.trim()}
                aria-label={t('feedback.submit')}
                className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-[var(--execution-panel-action-bg)] px-4 text-[12px] font-medium text-[var(--execution-panel-action-fg)] shadow-sm transition hover:opacity-92 active:scale-95 disabled:pointer-events-none disabled:grayscale"
                title={t('feedback.submit')}
              >
                <Send className="h-4 w-4" />
                <span>{t('feedback.submit')}</span>
              </button>
            </div>
          </div>
        )}
      </aside>
    );
  }

  return null;
}
