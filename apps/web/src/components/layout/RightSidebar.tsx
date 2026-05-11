import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { NodeStatus } from 'schemas';
import { useWorkbench } from '../../context/WorkbenchContext.tsx';

const QUICK_ACTION_STATUS: Record<string, NodeStatus> = {
  approve: 'accepted',
  reject: 'rejected',
  revise: 'active',
  expand: 'active',
};

export default function RightSidebar() {
  const { t } = useTranslation();
  const { state, addFeedback, updateNode } = useWorkbench();
  const [text, setText] = useState('');

  const selectedNode = state.ui.selectedNodeId
    ? (state.canvas.nodes.find((n) => n.id === state.ui.selectedNodeId) ?? null)
    : null;

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!text.trim()) return;
    await addFeedback(state.ui.selectedNodeId ?? '__global__', text.trim());
    setText('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSubmit();
    }
  }

  async function handleQuickAction(action: string) {
    const nodeId = state.ui.selectedNodeId ?? '__global__';
    await addFeedback(nodeId, '', action);
    if (selectedNode && QUICK_ACTION_STATUS[action]) {
      await updateNode(selectedNode.id, { status: QUICK_ACTION_STATUS[action] });
    }
  }

  return (
    <aside className="flex w-80 flex-col gap-4 overflow-y-auto border-l border-[var(--border)] bg-[var(--bg-main)] p-3">
      {/* Selected Node Info */}
      <div>
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-main)] opacity-50">
          {t('sidebar.properties')}
        </h3>
        {selectedNode ? (
          <div className="flex flex-col gap-1 text-[13px] text-[var(--text-main)]">
            <div>
              <strong className="opacity-60">ID:</strong> {selectedNode.id}
            </div>
            <div>
              <strong className="opacity-60">Label:</strong> {selectedNode.label}
            </div>
            <div>
              <strong className="opacity-60">Status:</strong> {selectedNode.status}
            </div>
            <div>
              <strong className="opacity-60">Progress:</strong> {Math.round(selectedNode.progress * 100)}%
            </div>
          </div>
        ) : (
          <div className="text-[13px] text-[var(--text-main)] opacity-50">
            {t('canvas.noSelection')}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-main)] opacity-50">
          {t('sidebar.quickActions')}
        </h3>
        <div className="flex flex-col gap-1">
          {['approve', 'reject', 'revise', 'expand'].map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => handleQuickAction(action)}
              className="rounded-md border border-[var(--border)] bg-transparent px-2.5 py-1.5 text-left text-xs capitalize text-[var(--text-main)] transition-colors hover:bg-[var(--border)]"
            >
              {t(`actions.${action}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback Input */}
      <form onSubmit={handleSubmit} className="mt-auto">
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-main)] opacity-50">
          {t('sidebar.feedback')}
        </h3>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('feedback.placeholder')}
          rows={3}
          className="w-full resize-none rounded-md border border-[var(--border)] bg-[var(--bg-main)] px-2 py-1.5 text-xs text-[var(--text-main)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
        />
        <button
          type="submit"
          className="mt-1.5 w-full rounded-md bg-[var(--primary)] py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
        >
          {t('feedback.submit')}
        </button>
      </form>
    </aside>
  );
}
