import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Send, Minus, X, Target } from 'lucide-react';
import { useWorkbench } from '../../context/WorkbenchContext.tsx';

export default function FloatingFeedback() {
  const { t } = useTranslation();
  const { state, addFeedback, updateUI } = useWorkbench();
  const [text, setText] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  const selectedNode = state.ui.selectedNodeId
    ? (state.canvas.nodes.find((n) => n.id === state.ui.selectedNodeId) ?? null)
    : null;

  const hasUnprocessedFeedback = state.feedback.some((f) => !('processedAt' in f));

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

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-8 right-8 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-main)] shadow-2xl transition-all hover:scale-110 active:scale-95"
        aria-label={t('feedback.maximize')}
      >
        <MessageSquare className="h-6 w-6 text-[var(--text-main)]" />
        {hasUnprocessedFeedback && (
          <span className="absolute right-0 top-0 h-3 w-3 rounded-full bg-red-500 border-2 border-[var(--bg-main)]" />
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-8 left-1/2 z-50 w-full max-w-xl -translate-x-1/2 px-4">
      <div className="flex flex-col gap-2">
        {/* Targeting Indicator */}
        {selectedNode && (
          <div className="flex items-center justify-between self-center rounded-full border border-[var(--border)] bg-[var(--bg-main)]/80 px-3 py-1.5 shadow-lg backdrop-blur-xl">
            <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--text-main)]">
              <Target className="h-3.5 w-3.5 opacity-60" />
              <span>{t('feedback.target', { name: selectedNode.label })}</span>
            </div>
            <button
              onClick={() => updateUI({ selectedNodeId: null })}
              className="ml-2 rounded-full p-0.5 hover:bg-[var(--border)]/20"
              title={t('feedback.clear')}
            >
              <X className="h-3.5 w-3.5 opacity-40" />
            </button>
          </div>
        )}

        {/* Input Area */}
        <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-main)]/80 p-2 shadow-2xl backdrop-blur-xl">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('feedback.placeholder')}
            className="flex-1 bg-transparent px-3 py-2 text-[14px] text-[var(--text-main)] outline-none placeholder:opacity-30"
            autoFocus
          />
          <div className="flex items-center gap-1 border-l border-[var(--border)] pl-1">
            <button
              onClick={() => setIsExpanded(false)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-main)] opacity-40 hover:bg-[var(--border)]/20 hover:opacity-100"
              title={t('feedback.minimize')}
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              onClick={handleSubmit}
              disabled={!text.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)] text-white shadow-lg transition-all hover:opacity-90 active:scale-95 disabled:pointer-events-none disabled:grayscale"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
