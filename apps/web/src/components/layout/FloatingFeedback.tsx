import { Crosshair, Send, Sparkles, Target } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorkbench } from '../../context/WorkbenchContext.tsx';
import { TaskDetail } from '../visuals/DetailPanel.tsx';

export default function FloatingFeedback() {
  const { t } = useTranslation();
  const { state, addFeedback, updateUI } = useWorkbench();
  const [text, setText] = useState('');
  const isBrainstorming = state.meta.activeSkill === 'brainstorming';
  const isWritingPlans = state.meta.activeSkill === 'writing-plans';
  const isExecutingPlans = state.meta.activeSkill === 'executing-plans';
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

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!text.trim()) return;
    await addFeedback({
      nodeId: state.ui.selectedNodeId ?? '__global__',
      text: text.trim(),
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

  if (!isInspectorOpen) {
    return null;
  }

  if (isBrainstorming) {
    const statusTone = selectedNode ? statusToneMap[selectedNode.status] : null;

    return (
      <aside className="relative flex h-full min-h-0 flex-col border-l border-[var(--border)] bg-[var(--bg-main)]">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {selectedNode ? (
            <div className="space-y-5">
              <section
                className="rounded-2xl border p-4"
                style={
                  statusTone
                    ? {
                        background: statusTone.bg,
                        borderColor: statusTone.border,
                      }
                    : undefined
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {selectedNodeTags[0] && (
                        <span className="rounded-full bg-[var(--bg-main)]/75 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-main)] opacity-60">
                          {selectedNodeTags[0]}
                        </span>
                      )}
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap"
                        style={
                          statusTone
                            ? {
                                background: statusTone.chipBg,
                                color: statusTone.chipText,
                              }
                            : undefined
                        }
                      >
                        {t(statusKeyMap[selectedNode.status] ?? 'feedback.statusPending')}
                      </span>
                    </div>
                    <div className="mt-2 text-[15px] font-semibold leading-6 text-[var(--text-main)]">
                      {selectedNode.label}
                    </div>
                    <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-main)] opacity-35">
                      {t('feedback.nodeContext')}
                    </div>
                    <div className="mt-2 text-[13px] leading-6 text-[var(--text-main)] opacity-70">
                      {selectedNodeDescription || t('feedback.noDescription')}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border)]/70 pt-4">
                  <button
                    type="button"
                    onClick={() => locateNode(selectedNode.id)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-main)]/80 px-3 py-1.5 text-[12px] font-medium text-[var(--text-main)] opacity-82 transition hover:opacity-100"
                  >
                    <Crosshair className="h-3.5 w-3.5" />
                    <span>{t('feedback.locate')}</span>
                  </button>
                </div>

                <div className="mt-4 border-t border-[var(--border)]/70 pt-4">
                  <div className="mb-2 text-[12px] font-medium text-[var(--text-main)] opacity-55">
                    {t('feedback.tags')}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedNodeTags.length > 0 ? (
                      selectedNodeTags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-[var(--bg-main)]/78 px-2.5 py-1 text-[11px] text-[var(--text-main)] opacity-72"
                        >
                          #{tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-[12px] text-[var(--text-main)] opacity-45">
                        {t('feedback.noTags')}
                      </span>
                    )}
                  </div>
                </div>

                {childNodes.length > 0 && (
                  <div className="mt-4 border-t border-[var(--border)]/70 pt-4">
                    <div className="mb-2 text-[12px] font-medium text-[var(--text-main)] opacity-55">
                      {t('feedback.relatedChildren')}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {childNodes.slice(0, 4).map((node) => (
                        <button
                          key={node.id}
                          type="button"
                          onClick={() => updateUI({ selectedNodeId: node.id })}
                          className="rounded-full bg-[var(--bg-main)]/78 px-2.5 py-1 text-[11px] text-[var(--text-main)] opacity-72 transition hover:opacity-100"
                        >
                          {node.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <section>
                <div className="mb-2 text-[12px] font-medium text-[var(--text-main)] opacity-55">
                  {t('feedback.history')}
                </div>
                <div className="space-y-2">
                  {nodeFeedback.length > 0 ? (
                    nodeFeedback.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-2xl border border-[var(--border)] bg-[var(--bg-canvas)]/45 px-3 py-2.5"
                      >
                        <div className="text-[13px] leading-6 text-[var(--text-main)] opacity-78">
                          {entry.text}
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-[11px] text-[var(--text-main)] opacity-40">
                          <span>{new Date(entry.createdAt).toLocaleString()}</span>
                          {!('processedAt' in entry) && (
                            <span className="rounded-full bg-[var(--accent)]/12 px-2 py-0.5 text-[var(--accent)] opacity-100">
                              {t('feedback.pendingBadge')}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[var(--border)] px-3 py-4 text-[12px] text-[var(--text-main)] opacity-45">
                      {t('feedback.noHistory')}
                    </div>
                  )}
                </div>
              </section>
            </div>
          ) : (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-canvas)]/35 px-6 text-center">
              <Target className="h-5 w-5 text-[var(--text-main)] opacity-35" />
              <div className="mt-3 text-[14px] font-medium text-[var(--text-main)]">
                {t('feedback.emptyTitle')}
              </div>
              <div className="mt-2 max-w-[220px] text-[12px] leading-6 text-[var(--text-main)] opacity-45">
                {t('feedback.emptyHint')}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-[var(--border)] bg-[var(--bg-main)] px-4 py-4">
          <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-[var(--text-main)] opacity-55">
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
                className="rounded-full border border-[var(--border)] bg-[var(--bg-main)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-main)] opacity-68 transition hover:bg-[var(--bg-canvas)] hover:opacity-100"
              >
                {action}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-canvas)]/35 p-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                selectedNode
                  ? t('feedback.nodePlaceholder', { name: selectedNode.label })
                  : t('feedback.placeholder')
              }
              className="min-h-24 flex-1 resize-none bg-transparent px-2 py-2 text-[14px] text-[var(--text-main)] outline-none placeholder:opacity-30"
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!text.trim()}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-[var(--primary)] px-3 text-[12px] font-medium text-white shadow-sm transition hover:opacity-92 active:scale-95 disabled:pointer-events-none disabled:grayscale"
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
      <aside className="relative flex h-full min-h-0 flex-col border-l border-[var(--border)] bg-[var(--bg-main)]">
        <div className="min-h-0 flex-1 overflow-y-auto">
          {selectedNode ? (
            <TaskDetail
              node={selectedNode}
              onFeedback={(params) => addFeedback(params)}
              showRating={isExecutingPlans}
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
          <div className="border-t border-[var(--border)] bg-[var(--bg-main)] px-4 py-4">
            <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-[var(--text-main)] opacity-55">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{t('feedback.target', { name: selectedNode.label })}</span>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => fillQuickAction(action)}
                  className="rounded-full border border-[var(--border)] bg-[var(--bg-main)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-main)] opacity-68 transition hover:bg-[var(--bg-canvas)] hover:opacity-100"
                >
                  {action}
                </button>
              ))}
            </div>
            <div className="flex items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-canvas)]/35 p-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('feedback.nodePlaceholder', { name: selectedNode.label })}
                className="min-h-24 flex-1 resize-none bg-transparent px-2 py-2 text-[14px] text-[var(--text-main)] outline-none placeholder:opacity-30"
              />
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!text.trim()}
                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-[var(--primary)] px-3 text-[12px] font-medium text-white shadow-sm transition hover:opacity-92 active:scale-95 disabled:pointer-events-none disabled:grayscale"
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
