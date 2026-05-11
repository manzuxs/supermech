import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorkbench } from '../../context/WorkbenchContext.tsx';

export default function RightSidebar() {
  const { t } = useTranslation();
  const { state, addFeedback } = useWorkbench();
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
              <strong className="opacity-60">Progress:</strong>{' '}
              {Math.round(selectedNode.progress * 100)}%
            </div>
            {(selectedNode.metadata?.description as string) && (
              <div>
                <strong className="opacity-60">Description:</strong>
                <p className="mt-0.5 text-xs leading-relaxed opacity-80">
                  {selectedNode.metadata.description as string}
                </p>
              </div>
            )}
            {Array.isArray(selectedNode.metadata?.tags) &&
              (selectedNode.metadata.tags as string[]).length > 0 && (
                <div>
                  <strong className="opacity-60">Tags:</strong>{' '}
                  <span className="text-xs opacity-80">
                    {(selectedNode.metadata.tags as string[]).join(', ')}
                  </span>
                </div>
              )}
          </div>
        ) : (
          <div className="text-[13px] text-[var(--text-main)] opacity-50">
            {t('canvas.noSelection')}
          </div>
        )}
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
